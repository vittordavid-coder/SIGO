import { Resource, ServiceComposition, Quotation, BDIConfig } from '../types';

export function calculateBDI(config: BDIConfig): number {
  const { ac, s, r, g, df, l, i } = config;
  
  // Formula: BDI = (((1 + AC + S + R + G) * (1 + DF) * (1 + L)) / (1 - I)) - 1
  // AC, S, R, G, DF, L, I are decimals (e.g., 0.05 for 5%)
  
  const numerator = (1 + ac/100 + s/100 + r/100 + g/100) * (1 + df/100) * (1 + l/100);
  const denominator = 1 - i/100;
  
  if (denominator <= 0) return 0;
  
  return (numerator / denominator - 1) * 100;
}

export function calculateServiceUnitCost(
  service: ServiceComposition | Omit<ServiceComposition, 'id'>,
  resources: Resource[],
  allServices: ServiceComposition[],
  bdi?: number
): number {
  let laborHorario = 0;
  let materials = 0;
  let equipment = 0;
  let auxiliary = 0;

  service.items.forEach(item => {
    const resource = resources.find(r => r.id === item.resourceId);
    if (resource) {
      const cost = item.consumption * resource.basePrice;
      if (resource.type === 'labor') {
        laborHorario += cost;
      } else if (resource.type === 'material') {
        materials += cost;
      } else if (resource.type === 'equipment') {
        equipment += cost;
      }
    } else {
      const subService = allServices.find(s => s.id === item.resourceId);
      if (subService) {
        const subCost = calculateServiceUnitCost(subService, resources, allServices);
        auxiliary += item.consumption * subCost;
      }
    }
  });

  const laborUnit = service.production > 0 ? laborHorario / service.production : 0;
  const equipmentUnit = service.production > 0 ? equipment / service.production : 0;
  const fitValue = laborUnit * (service.fit || 0);
  
  const directCost = laborUnit + fitValue + materials + equipmentUnit + auxiliary;
  
  if (bdi !== undefined && bdi > 0) {
    return directCost * (1 + bdi / 100);
  }
  
  return directCost;
}

export function calculateABCCurve(
  quotation: Quotation,
  services: ServiceComposition[],
  resources: Resource[],
  type: 'services' | 'resources',
  abcConfig: { limitA: number; limitB: number } = { limitA: 80, limitB: 15 }
) {
  const activeItems = [
    ...(quotation.services || []),
    ...(quotation.groups?.flatMap(g => g.services || []) || [])
  ];

  const calculateABC = (items: {id: string, code: string, name: string, unit: string, quantity: number, unitCost: number, type?: string}[]) => {
    const data = items.map(item => ({
      ...item,
      totalCost: item.quantity * item.unitCost
    })).filter(item => item.totalCost > 0);

    data.sort((a, b) => b.totalCost - a.totalCost);

    const totalBudget = data.reduce((acc, item) => acc + item.totalCost, 0);
    let cumulative = 0;

    return data.map(item => {
      const percentage = (item.totalCost / totalBudget) * 100;
      cumulative += percentage;
      let category: 'A' | 'B' | 'C' = 'C';
      if (cumulative <= abcConfig.limitA + 0.001) category = 'A';
      else if (cumulative <= (abcConfig.limitA + abcConfig.limitB) + 0.001) category = 'B';
      
      return {
        ...item,
        percentage,
        cumulativePercentage: cumulative,
        category
      };
    });
  };

  if (type === 'services') {
    const items = activeItems.map(bi => {
      const s = services.find(serv => serv.id === bi.serviceId);
      if (!s) return null;
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        unit: s.unit,
        quantity: bi.quantity,
        unitCost: calculateServiceUnitCost(s, resources, services)
      };
    }).filter(Boolean) as any[];

    const data = calculateABC(items);
    const summary = {
      a: { count: data.filter(d => d.category === 'A').length, percentage: data.filter(d => d.category === 'A').reduce((acc, d) => acc + d.percentage, 0) },
      b: { count: data.filter(d => d.category === 'B').length, percentage: data.filter(d => d.category === 'B').reduce((acc, d) => acc + d.percentage, 0) },
      c: { count: data.filter(d => d.category === 'C').length, percentage: data.filter(d => d.category === 'C').reduce((acc, d) => acc + d.percentage, 0) }
    };
    return { data, summary };
  } else {
    const resourceTotals: Record<string, {quantity: number, totalCost: number}> = {};

    const explode = (comp: ServiceComposition, multiplier: number) => {
      const production = comp.production || 1;
      const fit = comp.fit || 0;

      (comp.items || []).forEach(item => {
        const res = resources.find(r => r.id === item.resourceId);
        if (res) {
          if (!resourceTotals[res.id]) {
            resourceTotals[res.id] = { quantity: 0, totalCost: 0 };
          }
          
          let effectiveConsumption = item.consumption;
          if (res.type === 'labor') {
            effectiveConsumption = (item.consumption / production) * (1 + fit);
          } else if (res.type === 'equipment') {
            effectiveConsumption = item.consumption / production;
          }

          resourceTotals[res.id].quantity += effectiveConsumption * multiplier;
          resourceTotals[res.id].totalCost += effectiveConsumption * multiplier * res.basePrice;
        } else {
          const subService = services.find(s => s.id === item.resourceId);
          if (subService) {
            explode(subService, item.consumption * multiplier);
          }
        }
      });
    };

    activeItems.forEach(bi => {
      const s = services.find(serv => serv.id === bi.serviceId);
      if (s) explode(s, bi.quantity);
    });

    const items = Object.entries(resourceTotals).map(([id, totals]) => {
      const r = resources.find(res => res.id === id);
      if (!r) return null;
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        unit: r.unit,
        quantity: totals.quantity,
        unitCost: r.basePrice,
        type: r.type
      };
    }).filter(Boolean) as any[];

    const data = calculateABC(items);
    const summary = {
      a: { count: data.filter(d => d.category === 'A').length, percentage: data.filter(d => d.category === 'A').reduce((acc, d) => acc + d.percentage, 0) },
      b: { count: data.filter(d => d.category === 'B').length, percentage: data.filter(d => d.category === 'B').reduce((acc, d) => acc + d.percentage, 0) },
      c: { count: data.filter(d => d.category === 'C').length, percentage: data.filter(d => d.category === 'C').reduce((acc, d) => acc + d.percentage, 0) }
    };
    return { data, summary };
  }
}
export function calculateMonthlyResourceABC(
  schedule: any,
  quotation: Quotation,
  services: ServiceComposition[],
  resources: Resource[]
) {
  if (!schedule || !schedule.startDate) return [];

  // Get global ABC classification once for all months
  const globalABC = calculateABCCurve(quotation, services, resources, 'resources');
  const globalABCMap = new Map(globalABC.data.map(item => [item.id, item.category]));

  const activeItems = [
    ...(quotation.services || []),
    ...(quotation.groups?.flatMap(g => g.services || []) || [])
  ];

  const start = new Date(schedule.startDate + 'T12:00:00');
  const monthMap = new Map<number, string>();
  const monthsSet = new Set<string>();

  for (let i = 0; i < schedule.duration; i++) {
    let current = new Date(start);
    if (schedule.timeUnit === 'days') {
      current.setDate(start.getDate() + i);
    } else if (schedule.timeUnit === 'weeks') {
      current.setDate(start.getDate() + (i * 7));
    } else if (schedule.timeUnit === 'months') {
      current.setMonth(start.getMonth() + i);
    }
    
    const monthStr = current.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
    monthMap.set(i, monthStr);
    monthsSet.add(monthStr);
  }

  const months = Array.from(monthsSet);
  months.sort((a, b) => {
    const [mA, yA] = a.split('/');
    const [mB, yB] = b.split('/');
    if (yA !== yB) return parseInt(yA) - parseInt(yB);
    return parseInt(mA) - parseInt(mB);
  });

  // month -> groupName -> resourceId -> { quantity, cost, usedIn: Set<string> }
  const monthlyData: Record<string, Record<string, Record<string, { quantity: number, cost: number, usedIn: Set<string> }>>> = {};

  const explode = (comp: ServiceComposition, multiplier: number, monthStr: string, rootServiceCode: string, groupName: string) => {
    const production = comp.production || 1;
    const fit = comp.fit || 0;

    (comp.items || []).forEach(item => {
      const res = resources.find(r => r.id === item.resourceId);
      if (res) {
        if (!monthlyData[monthStr]) monthlyData[monthStr] = {};
        if (!monthlyData[monthStr][groupName]) monthlyData[monthStr][groupName] = {};
        if (!monthlyData[monthStr][groupName][res.id]) {
          monthlyData[monthStr][groupName][res.id] = { quantity: 0, cost: 0, usedIn: new Set() };
        }
        
        let effectiveConsumption = item.consumption;
        if (res.type === 'labor') {
          effectiveConsumption = (item.consumption / production) * (1 + fit);
        } else if (res.type === 'equipment') {
          effectiveConsumption = item.consumption / production;
        }

        monthlyData[monthStr][groupName][res.id].quantity += effectiveConsumption * multiplier;
        monthlyData[monthStr][groupName][res.id].cost += effectiveConsumption * multiplier * res.basePrice;
        monthlyData[monthStr][groupName][res.id].usedIn.add(rootServiceCode);
      } else {
        const subService = services.find(s => s.id === item.resourceId);
        if (subService) {
          explode(subService, item.consumption * multiplier, monthStr, rootServiceCode, groupName);
        }
      }
    });
  };

  (schedule.services || []).forEach((ss: any) => {
    const s = services.find(serv => serv.id === ss.serviceId);
    if (!s) return;

    const activeItem = activeItems.find(ai => ai.serviceId === ss.serviceId);
    const totalQuantity = activeItem ? activeItem.quantity : 0;

    // Find which group this service belongs to
    let groupName = 'Geral';
    const group = quotation.groups?.find(g => g.services?.some(gs => gs.serviceId === ss.serviceId));
    if (group) groupName = group.name;

    (ss.distribution || []).forEach((d: any) => {
      const monthStr = monthMap.get(d.periodIndex);
      if (!monthStr) return;

      let periodQuantity = 0;
      if (schedule.distributionType === 'percentage') {
        periodQuantity = (d.value / 100) * totalQuantity;
      } else {
        periodQuantity = d.value;
      }

      if (periodQuantity > 0) {
        explode(s, periodQuantity, monthStr, s.code, groupName);
      }
    });
  });

  const result = months.map(month => {
    const monthGroups = monthlyData[month] || {};
    let totalMonthCost = 0;
    
    const groups = Object.entries(monthGroups).map(([groupName, monthResources]) => {
      let groupCost = 0;
      let items = Object.entries(monthResources).map(([resId, data]) => {
        const r = resources.find(res => res.id === resId);
        groupCost += data.cost;
        return {
          id: resId,
          code: r?.code || '',
          name: r?.name || '',
          unit: r?.unit || '',
          quantity: data.quantity,
          totalCost: data.cost,
          usedIn: Array.from(data.usedIn).join(', '),
          percentage: 0,
          category: ''
        };
      });

      items.sort((a, b) => b.totalCost - a.totalCost);
      totalMonthCost += groupCost;

      return {
        groupName,
        groupCost,
        items
      };
    });

    // Flatten for ABC calculation across the whole month if needed, 
    // but the user wants them separated by group in the report.
    // We'll keep the groups structure.
    
    // Calculate ABC per group or per month? 
    // Usually ABC is per month. Let's calculate it per month for the summary, 
    // but keep items grouped.
    
    const allItems = groups.flatMap(g => g.items).sort((a, b) => b.totalCost - a.totalCost);
    const abcMap = new Map();
    allItems.forEach(item => {
      const percentage = totalMonthCost > 0 ? (item.totalCost / totalMonthCost) * 100 : 0;
      // Use the global category for this resource
      const category = globalABCMap.get(item.id) || 'C';
      abcMap.set(item.id, { percentage, category });
    });

    const groupsWithABC = groups.map(g => ({
      ...g,
      items: g.items.map(item => ({
        ...item,
        ...abcMap.get(item.id)
      }))
    }));

    const summary = {
      totalCost: totalMonthCost,
      a: { count: allItems.filter((_, i) => {
        let acc = 0;
        for(let j=0; j<=i; j++) acc += (allItems[j].totalCost / totalMonthCost) * 100;
        return acc <= 80;
      }).length, percentage: 0 }, // Simplified for now, will fix below
      b: { count: 0, percentage: 0 },
      c: { count: 0, percentage: 0 }
    };
    
    // Recalculate summary correctly
    summary.a.count = allItems.filter(item => abcMap.get(item.id).category === 'A').length;
    summary.a.percentage = allItems.filter(item => abcMap.get(item.id).category === 'A').reduce((acc, item) => acc + abcMap.get(item.id).percentage, 0);
    summary.b.count = allItems.filter(item => abcMap.get(item.id).category === 'B').length;
    summary.b.percentage = allItems.filter(item => abcMap.get(item.id).category === 'B').reduce((acc, item) => acc + abcMap.get(item.id).percentage, 0);
    summary.c.count = allItems.filter(item => abcMap.get(item.id).category === 'C').length;
    summary.c.percentage = allItems.filter(item => abcMap.get(item.id).category === 'C').reduce((acc, item) => acc + abcMap.get(item.id).percentage, 0);

    return {
      month,
      groups: groupsWithABC,
      summary
    };
  });

  return result.filter(m => m.groups.some(g => g.items.length > 0));
}
export function calculateProductionAndCostSummary(
  schedule: any,
  quotation: Quotation,
  services: ServiceComposition[],
  resources: Resource[],
  bdi: number = 0
) {
  if (!schedule || !schedule.startDate) return [];

  const activeItems = [
    ...(quotation.services || []),
    ...(quotation.groups?.flatMap(g => g.services || []) || [])
  ];

  const start = new Date(schedule.startDate + 'T12:00:00');
  const monthMap = new Map<number, string>();
  const monthsSet = new Set<string>();

  for (let i = 0; i < schedule.duration; i++) {
    let current = new Date(start);
    if (schedule.timeUnit === 'days') {
      current.setDate(start.getDate() + i);
    } else if (schedule.timeUnit === 'weeks') {
      current.setDate(start.getDate() + (i * 7));
    } else if (schedule.timeUnit === 'months') {
      current.setMonth(start.getMonth() + i);
    }
    
    const monthStr = current.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
    monthMap.set(i, monthStr);
    monthsSet.add(monthStr);
  }

  const months = Array.from(monthsSet);
  months.sort((a, b) => {
    const [mA, yA] = a.split('/');
    const [mB, yB] = b.split('/');
    if (yA !== yB) return parseInt(yA) - parseInt(yB);
    return parseInt(mA) - parseInt(mB);
  });

  const monthlyProduction: Record<string, number> = {};
  const monthlyCost: Record<string, number> = {};

  const getCost = (comp: ServiceComposition, multiplier: number): number => {
    let total = 0;
    const production = comp.production || 1;
    const fit = comp.fit || 0;

    (comp.items || []).forEach(item => {
      const res = resources.find(r => r.id === item.resourceId);
      if (res) {
        let effectiveConsumption = item.consumption;
        if (res.type === 'labor') {
          effectiveConsumption = (item.consumption / production) * (1 + fit);
        } else if (res.type === 'equipment') {
          effectiveConsumption = item.consumption / production;
        }
        total += effectiveConsumption * multiplier * res.basePrice;
      } else {
        const subService = services.find(s => s.id === item.resourceId);
        if (subService) {
          total += getCost(subService, item.consumption * multiplier);
        }
      }
    });
    return total;
  };

  (schedule.services || []).forEach((ss: any) => {
    const s = services.find(serv => serv.id === ss.serviceId);
    if (!s) return;

    const activeItem = activeItems.find(ai => ai.serviceId === ss.serviceId);
    const totalQuantity = activeItem ? activeItem.quantity : 0;
    const unitPrice = calculateServiceUnitCost(s, resources, services, bdi);

    (ss.distribution || []).forEach((d: any) => {
      const monthStr = monthMap.get(d.periodIndex);
      if (!monthStr) return;

      let periodQuantity = 0;
      if (schedule.distributionType === 'percentage') {
        periodQuantity = (d.value / 100) * totalQuantity;
      } else {
        periodQuantity = d.value;
      }

      if (periodQuantity > 0) {
        if (!monthlyProduction[monthStr]) monthlyProduction[monthStr] = 0;
        if (!monthlyCost[monthStr]) monthlyCost[monthStr] = 0;

        monthlyProduction[monthStr] += periodQuantity * unitPrice;
        monthlyCost[monthStr] += getCost(s, periodQuantity);
      }
    });
  });

  return months.map(month => ({
    month,
    production: monthlyProduction[month] || 0,
    cost: monthlyCost[month] || 0,
    margin: (monthlyProduction[month] || 0) - (monthlyCost[month] || 0)
  })).filter(m => m.production > 0 || m.cost > 0);
}

export function calculateResourceSchedule(
  schedule: any,
  quotation: Quotation,
  services: ServiceComposition[],
  resources: Resource[]
) {
  if (!schedule || !schedule.startDate) return { months: [], data: [] };

  const activeItems = [
    ...(quotation.services || []),
    ...(quotation.groups?.flatMap(g => g.services || []) || [])
  ];

  // Map periods to months
  const start = new Date(schedule.startDate + 'T12:00:00');
  const monthMap = new Map<number, string>(); // periodIndex -> month string (e.g., "01/2026")
  const monthsSet = new Set<string>();

  for (let i = 0; i < schedule.duration; i++) {
    let current = new Date(start);
    if (schedule.timeUnit === 'days') {
      current.setDate(start.getDate() + i);
    } else if (schedule.timeUnit === 'weeks') {
      current.setDate(start.getDate() + (i * 7));
    } else if (schedule.timeUnit === 'months') {
      current.setMonth(start.getMonth() + i);
    }
    
    const monthStr = current.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
    monthMap.set(i, monthStr);
    monthsSet.add(monthStr);
  }

  const months = Array.from(monthsSet);
  // Sort months chronologically
  months.sort((a, b) => {
    const [mA, yA] = a.split('/');
    const [mB, yB] = b.split('/');
    if (yA !== yB) return parseInt(yA) - parseInt(yB);
    return parseInt(mA) - parseInt(mB);
  });

  // Calculate resource quantities per month
  const resourceTotals: Record<string, Record<string, { quantity: number, cost: number }>> = {}; // resourceId -> month -> totals

  const explode = (comp: ServiceComposition, multiplier: number, monthStr: string) => {
    const production = comp.production || 1;
    const fit = comp.fit || 0;

    comp.items.forEach(item => {
      const res = resources.find(r => r.id === item.resourceId);
      if (res) {
        if (!resourceTotals[res.id]) {
          resourceTotals[res.id] = {};
        }
        if (!resourceTotals[res.id][monthStr]) {
          resourceTotals[res.id][monthStr] = { quantity: 0, cost: 0 };
        }
        
        let effectiveConsumption = item.consumption;
        if (res.type === 'labor') {
          effectiveConsumption = (item.consumption / production) * (1 + fit);
        } else if (res.type === 'equipment') {
          effectiveConsumption = item.consumption / production;
        }

        resourceTotals[res.id][monthStr].quantity += effectiveConsumption * multiplier;
        resourceTotals[res.id][monthStr].cost += effectiveConsumption * multiplier * res.basePrice;
      } else {
        const subService = services.find(s => s.id === item.resourceId);
        if (subService) {
          explode(subService, item.consumption * multiplier, monthStr);
        }
      }
    });
  };

  (schedule.services || []).forEach((ss: any) => {
    const s = services.find(serv => serv.id === ss.serviceId);
    if (!s) return;

    const activeItem = activeItems.find(ai => ai.serviceId === ss.serviceId);
    const totalQuantity = activeItem ? activeItem.quantity : 0;

    (ss.distribution || []).forEach((d: any) => {
      const monthStr = monthMap.get(d.periodIndex);
      if (!monthStr) return;

      let periodQuantity = 0;
      if (schedule.distributionType === 'percentage') {
        periodQuantity = (d.value / 100) * totalQuantity;
      } else {
        periodQuantity = d.value;
      }

      if (periodQuantity > 0) {
        explode(s, periodQuantity, monthStr);
      }
    });
  });

  const result = Object.entries(resourceTotals).map(([id, monthData]) => {
    const r = resources.find(res => res.id === id);
    if (!r) return null;
    
    let totalQuantity = 0;
    let totalCost = 0;
    const distribution: Record<string, { quantity: number, cost: number }> = {};
    
    months.forEach(m => {
      const data = monthData[m] || { quantity: 0, cost: 0 };
      distribution[m] = data;
      totalQuantity += data.quantity;
      totalCost += data.cost;
    });

    return {
      id: r.id,
      code: r.code,
      name: r.name,
      unit: r.unit,
      type: r.type,
      basePrice: r.basePrice,
      totalQuantity,
      totalCost,
      distribution
    };
  }).filter(Boolean) as any[];

  // Sort by total cost descending
  result.sort((a, b) => b.totalCost - a.totalCost);

  return { months, data: result };
}

export function calculateQuotationTotal(
  quotation: Quotation,
  services: ServiceComposition[],
  resources: Resource[]
): number {
  const mainTotal = quotation.services.reduce((acc, qs) => {
    const service = services.find(s => s.id === qs.serviceId);
    if (!service) return acc;
    return acc + (calculateServiceUnitCost(service, resources, services) * qs.quantity);
  }, 0);

  const groupsTotal = quotation.groups?.reduce((acc, group) => {
    return acc + group.services.reduce((gAcc, item) => {
      const s = services.find(serv => serv.id === item.serviceId);
      if (!s) return gAcc;
      return gAcc + (calculateServiceUnitCost(s, resources, services) * item.quantity);
    }, 0);
  }, 0) || 0;

  return mainTotal + groupsTotal;
}


