import { ServiceComposition, Resource } from '../types';
import { calculateServiceUnitCost } from './calculations';
import { formatCurrency, formatNumber } from './utils';
import { ReportConfig } from './reportTemplate';

export function getCompositionReportConfig(
  service: ServiceComposition,
  resources: Resource[],
  allServices: ServiceComposition[],
  logo?: string,
  bdi: number = 0
): ReportConfig {
  const directCost = calculateServiceUnitCost(service, resources, allServices);
  const costWithBDI = directCost * (1 + bdi / 100);

  const tableRows = service.items.map(item => {
    const res = resources.find(r => r.id === item.resourceId) || allServices.find(s => s.id === item.resourceId);
    const isEquip = res && 'type' in res && res.type === 'equipment';

    if (isEquip) {
      const prodPrice = (res as Resource).productivePrice || (res as Resource).basePrice;
      const unprodPrice = (res as Resource).unproductivePrice || (res as Resource).basePrice;
      const prodTotal = (item.productiveConsumption || 0) * prodPrice;
      const unprodTotal = (item.unproductiveConsumption || 0) * unprodPrice;
      return [
        res?.code || '',
        res?.name || 'Insumo não encontrado',
        'Equipamento',
        res?.unit || '',
        `Prod: ${item.productiveConsumption || 0} | Impr: ${item.unproductiveConsumption || 0}`,
        `Prod: ${formatCurrency(prodPrice)} | Impr: ${formatCurrency(unprodPrice)}`,
        formatCurrency(prodTotal + unprodTotal)
      ];
    } else {
      const isResource = res && 'type' in res;
      let typeLabel = 'Serv. Auxiliar';
      if (isResource) {
        if (res.type === 'labor') typeLabel = 'Mão de Obra';
        else if (res.type === 'material') typeLabel = 'Material';
      }

      const unitCost = (res as any)?.basePrice || calculateServiceUnitCost(res as any, resources, allServices);
      const totalCost = item.consumption * unitCost;
      return [
        res?.code || '',
        res?.name || 'Insumo não encontrado',
        typeLabel,
        res?.unit || '',
        item.consumption.toString(),
        formatCurrency(unitCost),
        formatCurrency(totalCost)
      ];
    }
  });

  return {
    filename: `Composicao_${service.code}`,
    header: {
      docTitle: "Composição Analítica de Serviço",
      statusBadge: {
        text: "ATIVO",
        variant: "active"
      }
    },
    sections: [
      {
        title: "Identificação da Composição",
        type: "grid",
        fields: [
          { label: "Código", value: service.code, highlightColor: "blue" },
          { label: "Unidade", value: service.unit },
          { label: "Produção da Equipe", value: service.production?.toString() || "1" },
          { label: "Fator FIT", value: service.fit?.toString() || "1" },
          { label: "Descrição", value: service.name, fullWidth: true }
        ]
      },
      {
        title: "Custos do Serviço",
        type: "grid",
        fields: [
          { label: "Custo Direto Unitário (Sem BDI)", value: formatCurrency(directCost) },
          { label: `Preço Unitário (Com BDI ${bdi}%)`, value: formatCurrency(costWithBDI), highlightColor: "green" }
        ]
      },
      {
        title: "Composição de Insumos e Serviços Auxiliares",
        type: "table",
        headers: ["CÓDIGO", "DESCRIÇÃO", "TIPO", "UNID", "CONSUMO", "PREÇO UNIT (R$)", "CUSTO TOTAL (R$)"],
        rows: tableRows.length > 0 ? tableRows : [["-", "Sem insumos cadastrados", "-", "-", "-", "-", "-"]]
      }
    ]
  };
}
