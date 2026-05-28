import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  Treemap,
  ComposedChart,
  Line,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Landmark, ArrowLeft, Users, HardHat, TrendingUp } from "lucide-react";

const CustomTreemapContent = (props: any) => {
  const {
    root,
    depth,
    x,
    y,
    width,
    height,
    index,
    payload,
    name,
    onClick,
    onMouseEnter,
    onMouseLeave,
    activeFilter,
  } = props;

  if (width < 30 || height < 30) return null;

  // The custom content sometimes receives a single color property or we can define a palette
  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
    "#6366f1",
    "#14b8a6",
    "#64748b",
    "#d946ef",
    "#1e293b",
    "#0369a1",
    "#be123c",
    "#4d7c0f",
    "#a21caf",
    "#1d4ed8",
    "#0f766e",
    "#c2410c",
  ];
  // Stable color based on name sum to prevent flickering
  const nameHash = name
    ? name
        .split("")
        .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    : index;
  const color = COLORS[nameHash % COLORS.length];

  const [isHovered, setIsHovered] = useState(false);

  const isSelected = activeFilter === name;
  const isDimmed = activeFilter && !isSelected;

  return (
    <g
      onClick={() => {
        if (onClick) onClick(name);
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (onMouseEnter) onMouseEnter(props, e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (onMouseLeave) onMouseLeave(props, e);
      }}
      className="cursor-pointer transition-all duration-300 ease-out"
      style={{
        transform:
          isHovered || isSelected
            ? `translate(-2px, -2px)`
            : "translate(0px, 0px)",
        opacity: isDimmed ? 0.3 : 1,
      }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: isHovered || isSelected ? "#fff" : "#ffffff80",
          strokeWidth: isHovered || isSelected ? 3 : 1,
          filter:
            isHovered || isSelected
              ? "drop-shadow(4px 4px 4px rgba(0,0,0,0.4))"
              : "drop-shadow(1px 1px 2px rgba(0,0,0,0.15))",
          transition: "all 0.3s ease",
        }}
        className="opacity-95 transition-opacity"
      />
      {width > 60 && height > 40 && (
        <foreignObject
          x={x + 4}
          y={y + 4}
          width={width - 8}
          height={height - 8}
          className="pointer-events-none"
        >
          <div
            style={{
              color: "#fff",
              fontFamily: "Arial",
              fontWeight: "normal",
              fontSize: "13px",
              lineHeight: "1.2",
              wordWrap: "break-word",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <span
              style={{
                display: "-webkit-box",
                WebkitLineClamp: height > 70 ? 4 : 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {name}
            </span>
            {height > 60 && (
              <span style={{ fontSize: "12px", opacity: 0.9 }}>
                {props.treeMapType === "value"
                  ? `R$ ${(props.size || 0).toLocaleString()}`
                  : `${props.size || 0} ${props.treeMapSuffix || "unid."}`}
              </span>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

const AportePieChart = ({
  activeCategorias,
  selectedTypeFilter,
  setSelectedTypeFilter,
  COLORS,
  hoveredCategory,
  setHoveredCategory,
}: any) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={activeCategorias}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={120}
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
          label={({
            cx,
            cy,
            midAngle,
            innerRadius,
            outerRadius,
            percent,
            name,
          }) => {
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
            if (percent < 0.03) return null; // Hide labels for very small slices
            return (
              <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-xs font-bold pointer-events-none"
              >
                {`${(percent * 100).toFixed(1)}%`}
              </text>
            );
          }}
          onMouseEnter={(e: any) => {
            const name = e?.name || e?.payload?.name;
            if (name) setHoveredCategory(name);
          }}
          onMouseLeave={() => setHoveredCategory(null)}
          onClick={(e: any) => {
            const name = e?.name || e?.payload?.name || e?.activeLabel;
            if (name) {
              if (selectedTypeFilter === name) setSelectedTypeFilter(null);
              else setSelectedTypeFilter(name);
            }
          }}
          className="cursor-pointer"
          isAnimationActive={false}
        >
          {activeCategorias.map((entry: any, index: number) => {
            const isHovered =
              hoveredCategory === entry.name ||
              selectedTypeFilter === entry.name;
            return (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                opacity={
                  selectedTypeFilter && selectedTypeFilter !== entry.name
                    ? 0.3
                    : 1
                }
                stroke={isHovered ? "#fff" : "none"}
                strokeWidth={isHovered ? 3 : 0}
              />
            );
          })}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            `R$ ${value.toLocaleString()}`,
            name,
          ]}
          labelFormatter={() => ""}
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

const AporteFinanceiroTab = ({
  aportes = [],
  measurements = [],
  contracts = [],
  quotations = [],
  currentUser,
  selectedContractId,
  setActiveView,
  stats,
}: any) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedAporteCategorias, setSelectedAporteCategorias] = useState<Record<string, boolean>>({});
  const [itemsSortConfig, setItemsSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [categorySort, setCategorySort] = useState<{
    key: "name" | "value";
    direction: "asc" | "desc";
  }>({ key: "value", direction: "desc" });

  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | null>(null);

  const COLORS = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#84cc16",
    "#10b981",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#d946ef",
    "#f43f5e",
    "#64748b",
  ];

  const toggleCategoria = (cat: string) => {
    setSelectedAporteCategorias((prev) => ({
      ...prev,
      [cat]: prev[cat] === false ? true : false,
    }));
  };

  const handleCategorySort = (key: "name" | "value") => {
    setCategorySort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const allAporteItems = useMemo(() => {
    let items: any[] = [];
    const ptMonthsAbbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    aportes
      .filter((a: any) => {
        const matchCompany =
          !currentUser?.companyId || a.companyId === currentUser.companyId;
        const matchContract =
          selectedContractId === "all" ||
          a.contractId === selectedContractId ||
          !a.contractId;
        return matchCompany && matchContract;
      })
      .forEach((a: any) => {
        (a.items || []).forEach((i: any) => {
          let parsedMonth = null;
          
          // Prioritize competence month (mes_competencia or mesCompetencia)
          const comp = i.mes_competencia || i.mesCompetencia;
          if (comp && comp.length >= 4) {
            if (comp.includes("-")) {
              const parts = comp.split("-");
              if (parts[0].length === 4) {
                const y = parseInt(parts[0], 10);
                const mon = parseInt(parts[1], 10);
                if (!isNaN(y) && !isNaN(mon)) {
                  parsedMonth = { year: y, month: mon };
                }
              } else {
                const y = parseInt(parts[parts.length - 1], 10);
                const mon = parseInt(parts[0], 10);
                if (!isNaN(y) && !isNaN(mon)) {
                  parsedMonth = { year: y < 100 ? y + 2000 : y, month: mon };
                }
              }
            } else if (comp.includes("/")) {
              const parts = comp.split("/");
              if (parts[0].length === 4) {
                const y = parseInt(parts[0], 10);
                const mon = parseInt(parts[1], 10);
                if (!isNaN(y) && !isNaN(mon)) {
                  parsedMonth = { year: y, month: mon };
                }
              } else {
                const y = parseInt(parts[parts.length - 1], 10);
                const mon = parseInt(parts[0], 10);
                if (!isNaN(y) && !isNaN(mon)) {
                  parsedMonth = { year: y < 100 ? y + 2000 : y, month: mon };
                }
              }
            }
          }

          // Fallback: Due date or Aporte date
          if (!parsedMonth) {
            const dateToUse = i.data_vencimento || i.dataVencimento || a.data;
            if (dateToUse && dateToUse.length >= 7) {
              if (dateToUse.includes("-")) {
                const parts = dateToUse.split("-");
                const y = parseInt(parts[0], 10);
                const mon = parseInt(parts[1], 10);
                if (!isNaN(y) && !isNaN(mon)) {
                  parsedMonth = { year: y, month: mon };
                }
              } else if (dateToUse.includes("/")) {
                const parts = dateToUse.split("/");
                if (parts.length >= 2) {
                  let mon = parseInt(parts[parts.length - 2], 10);
                  let y = parseInt(parts[parts.length - 1], 10);
                  if (y < 100) y += 2000;
                  if (!isNaN(y) && !isNaN(mon)) {
                    parsedMonth = { year: y, month: mon };
                  }
                }
              }
            }
          }

          let monthKey = null;
          let monthLabel = null;
          if (parsedMonth) {
            monthLabel = `${ptMonthsAbbr[parsedMonth.month - 1]}/${parsedMonth.year.toString().slice(-2)}`;
            monthKey = `${parsedMonth.year}-${parsedMonth.month.toString().padStart(2, "0")}`;
          }

          items.push({
            ...i,
            monthKey,
            monthLabel,
            aporteNumero: a.numero,
            aporteData: a.data,
          });
        });
      });
    return items;
  }, [aportes, currentUser, selectedContractId]);

  // Derived: Filter items purely by active month selection (if any) to calculate reactive card totals & categories
  const aporteItemsForView = useMemo(() => {
    if (!selectedMonthFilter) return allAporteItems;
    return allAporteItems.filter((i) => i.monthKey === selectedMonthFilter);
  }, [allAporteItems, selectedMonthFilter]);

  const totalAportadoSelected = useMemo(() => {
    return aporteItemsForView.reduce((acc, i) => acc + (i.valor || 0), 0);
  }, [aporteItemsForView]);

  const aporteCategorias = useMemo(() => {
    const map: Record<string, number> = {};
    aporteItemsForView.forEach((i) => {
      const cat = i.categoria || "Sem Categoria";
      map[cat] = (map[cat] || 0) + (i.valor || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [aporteItemsForView]);

  const sortedAporteCategorias = useMemo(() => {
    const list = [...aporteCategorias];
    list.sort((a, b) => {
      if (categorySort.key === "name") {
        const valA = a.name || "";
        const valB = b.name || "";
        return categorySort.direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        const valA = a.value || 0;
        const valB = b.value || 0;
        return categorySort.direction === "asc" ? valA - valB : valB - valA;
      }
    });
    return list;
  }, [aporteCategorias, categorySort]);

  const activeCategorias = useMemo(() => {
    return aporteCategorias.filter(
      (c: any) => selectedAporteCategorias[c.name] !== false,
    );
  }, [aporteCategorias, selectedAporteCategorias]);

  const filteredAporteItems = useMemo(() => {
    let items = aporteItemsForView.filter((i) => {
      const cat = i.categoria || "Sem Categoria";
      if (selectedAporteCategorias[cat] === false) return false;
      if (selectedTypeFilter && selectedTypeFilter !== cat) return false;
      return true;
    });

    if (itemsSortConfig !== null) {
      items.sort((a, b) => {
        let valA = a[itemsSortConfig.key] || "";
        let valB = b[itemsSortConfig.key] || "";
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return itemsSortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return itemsSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [aporteItemsForView, selectedAporteCategorias, selectedTypeFilter, itemsSortConfig]);

  const handleItemsSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      itemsSortConfig &&
      itemsSortConfig.key === key &&
      itemsSortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setItemsSortConfig({ key, direction });
  };

  const renderItemsSortIndicator = (key: string) => {
    if (!itemsSortConfig || itemsSortConfig.key !== key) {
      return <span className="text-slate-300 ml-1 text-xs">↕</span>;
    }
    return itemsSortConfig.direction === "asc" ? (
      <span className="text-red-500 ml-1 text-xs">▲</span>
    ) : (
      <span className="text-red-500 ml-1 text-xs">▼</span>
    );
  };

  // Monthly logic combining Receita and Gasto
  const monthlyChartData = useMemo(() => {
    const monthlyMap: Record<string, { monthLabel: string; monthKey: string; sortKey: number; receita: number; gasto: number }> = {};
    const ptMonthsAbbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const filteredM = selectedContractId === "all"
      ? measurements
      : measurements?.filter((m: any) => m.contractId === selectedContractId);

    (filteredM || []).forEach((m: any) => {
      let mTotal = 0;
      const contract = (contracts || []).find((c: any) => c.id === m.contractId);
      const quotation = (quotations || []).find((q: any) => q.id === contract?.quotationId);
      const priceMap = new Map<string, number>();
      
      const addPrices = (srvs: any[]) => {
        for (const srv of srvs || []) {
          if (srv.price) priceMap.set(srv.serviceId || srv.code, srv.price);
        }
      };
      
      addPrices(quotation?.services || []);
      (quotation?.groups || []).forEach((g: any) => addPrices(g.services || []));
      addPrices(contract?.services || []);
      (contract?.groups || []).forEach((g: any) => addPrices(g.services || []));

      (m.items || []).forEach((it: any) => {
        mTotal += (it.quantity || 0) * (priceMap.get(it.serviceId) || 0);
      });

      let parsedMonth = null;
      if (m.date && m.date.length >= 7) {
        const parts = m.date.split("-");
        const y = parseInt(parts[0], 10);
        const mon = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(mon)) {
          parsedMonth = { year: y, month: mon };
        }
      }
      if (!parsedMonth && m.period) {
        const match = m.period.match(/(\d{2})\/(\d{4})/);
        if (match) {
          parsedMonth = { year: parseInt(match[2], 10), month: parseInt(match[1], 10) };
        }
      }

      if (parsedMonth) {
        const label = `${ptMonthsAbbr[parsedMonth.month - 1]}/${parsedMonth.year.toString().slice(-2)}`;
        const key = `${parsedMonth.year}-${parsedMonth.month.toString().padStart(2, "0")}`;
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            monthLabel: label,
            monthKey: key,
            sortKey: parsedMonth.year * 12 + parsedMonth.month,
            receita: 0,
            gasto: 0,
          };
        }
        monthlyMap[key].receita += mTotal;
      }
    });

    (allAporteItems || []).forEach((i: any) => {
      const cat = i.categoria || "Sem Categoria";
      if (selectedAporteCategorias[cat] === false) return;

      if (i.monthKey && i.monthLabel) {
        const key = i.monthKey;
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            monthLabel: i.monthLabel,
            monthKey: key,
            sortKey: parseInt(key.split("-")[0], 10) * 12 + parseInt(key.split("-")[1], 10),
            receita: 0,
            gasto: 0,
          };
        }
        monthlyMap[key].gasto += i.valor || 0;
      }
    });

    const lst = Object.values(monthlyMap);
    return lst.sort((a, b) => a.sortKey - b.sortKey);
  }, [selectedContractId, measurements, contracts, quotations, allAporteItems, selectedAporteCategorias]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveView("overview");
            }}
            className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors pointer-events-auto"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Gestão Global - Dashboard de Aportes
          </h1>
        </div>
      </div>

      {selectedMonthFilter && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Mês selecionado no gráfico: <strong>{
              monthlyChartData.find(m => m.monthKey === selectedMonthFilter)?.monthLabel || selectedMonthFilter
            }</strong></span>
          </div>
          <button
            onClick={() => setSelectedMonthFilter(null)}
            className="text-xs uppercase tracking-wider font-bold bg-white text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-md transition-all focus:outline-none shadow-sm"
          >
            Limpar Filtro
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar Panes */}
        <div className="col-span-1 space-y-6">
          <Card className="shadow-lg border-t-4 border-red-500 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-slate-500 font-semibold tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" /> Total Aportado {selectedMonthFilter && "no Mês"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-red-600 tracking-tight">
                R$ {totalAportadoSelected.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-slate-100">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-xs uppercase text-slate-500 font-semibold tracking-wider flex items-center gap-2">
                Filtro por Categorias
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {/* Select All Checkbox */}
                <div className="flex items-center justify-between p-2 pb-3 mb-1 border-b border-slate-100 hover:bg-slate-50/80 rounded transition-colors">
                  <label
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      const isAllSelected = (aporteCategorias || []).every(
                        (c: any) => selectedAporteCategorias[c.name] !== false,
                      );
                      const nextVal = !isAllSelected;
                      const updated: Record<string, boolean> = {};
                      (aporteCategorias || []).forEach((c: any) => {
                        updated[c.name] = nextVal;
                      });
                      setSelectedAporteCategorias(updated);
                    }}
                  >
                    <input
                      type="checkbox"
                      className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                      checked={(aporteCategorias || []).length > 0 && (aporteCategorias || []).every(
                        (c: any) => selectedAporteCategorias[c.name] !== false,
                      )}
                      readOnly
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      Selecionar todas
                    </span>
                  </label>
                </div>

                {/* Interactive Sorted Headers */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-2 border-b border-slate-100 select-none">
                  <button
                    onClick={() => handleCategorySort("name")}
                    className="hover:text-slate-600 flex items-center gap-1 min-w-0 flex-1 justify-start font-bold focus:outline-none"
                  >
                    Categoria {categorySort.key === "name" ? (categorySort.direction === "asc" ? "▲" : "▼") : "↕"}
                  </button>
                  <button
                    onClick={() => handleCategorySort("value")}
                    className="hover:text-slate-600 flex items-center gap-1 flex-shrink-0 justify-end ml-2 font-bold focus:outline-none"
                  >
                    Valor {categorySort.key === "value" ? (categorySort.direction === "asc" ? "▲" : "▼") : "↕"}
                  </button>
                </div>

                <div className="max-h-[350px] overflow-y-auto pr-1 space-y-1">
                  {sortedAporteCategorias.map((cat, idx) => {
                    const isChecked = selectedAporteCategorias[cat.name] !== false;
                    const isSelectedInChart = selectedTypeFilter === cat.name;
                    const isHoveredInChart = hoveredCategory === cat.name;

                    // Match bullet color with cell index in the Pie chart
                    const activeIndex = activeCategorias.findIndex(
                      (c: any) => c.name === cat.name,
                    );
                    const bulletColor =
                      activeIndex !== -1
                        ? COLORS[activeIndex % COLORS.length]
                        : "#cbd5e1"; // slate-300 for inactive

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isSelectedInChart || isHoveredInChart
                            ? "bg-red-50 ring-1 ring-red-200"
                            : "hover:bg-slate-50"
                        }`}
                        onMouseEnter={() => setHoveredCategory(cat.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoria(cat.name);
                        }}
                      >
                        <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer flex-shrink-0"
                            checked={isChecked}
                            onChange={() => {}} // handled by click
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: bulletColor }}
                          />
                          <span
                            className="text-xs font-medium text-slate-700 truncate"
                            title={cat.name}
                          >
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 flex-shrink-0 ml-2">
                          R$ {(cat.value || 0).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {selectedTypeFilter && (
                  <button
                    onClick={() => setSelectedTypeFilter(null)}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold mt-2 w-full text-left transition-colors"
                  >
                    Limpar seleção do gráfico
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Area */}
        <div className="col-span-1 lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="shadow-lg border border-slate-100 flex flex-col h-[480px]">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold text-slate-800">
                  Composição de Aportes por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[350px] w-full relative pt-2">
                {activeCategorias.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Nenhuma categoria selecionada
                  </div>
                ) : (
                  <AportePieChart
                    activeCategorias={activeCategorias}
                    selectedTypeFilter={selectedTypeFilter}
                    setSelectedTypeFilter={setSelectedTypeFilter}
                    COLORS={COLORS}
                    hoveredCategory={hoveredCategory}
                    setHoveredCategory={setHoveredCategory}
                  />
                )}
              </CardContent>
            </Card>

            {useMemo(() => {
              return (
                <Card className="shadow-lg border border-slate-100 flex flex-col h-[480px]">
                  <CardHeader className="pb-1 mt-1">
                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center justify-between">
                      <span>Evolução Mensal (Receita vs. Gastos)</span>
                      {selectedMonthFilter && (
                        <button
                          onClick={() => setSelectedMonthFilter(null)}
                          className="text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors focus:outline-none"
                        >
                          Limpar Zoom
                        </button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[350px] w-full pt-2">
                    {monthlyChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        Sem dados de evolução histórica
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart 
                          data={monthlyChartData} 
                          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                          onClick={(state: any) => {
                            if (state) {
                              let key = null;
                              // 1. Try tooltip index
                              if (state.activeTooltipIndex !== undefined && state.activeTooltipIndex >= 0) {
                                const item = monthlyChartData[state.activeTooltipIndex];
                                if (item) key = item.monthKey;
                              }
                              // 2. Try active payload
                              if (!key && state.activePayload && state.activePayload.length > 0) {
                                key = state.activePayload[0].payload?.monthKey;
                              }
                              // 3. Try matching state.activeLabel
                              if (!key && state.activeLabel) {
                                const match = monthlyChartData.find((m: any) => m.monthLabel === state.activeLabel);
                                if (match) key = match.monthKey;
                              }
                              
                              if (key) {
                                setSelectedMonthFilter((prev) => 
                                  prev === key ? null : key
                                );
                              }
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="monthLabel" 
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8" 
                            style={{ fontSize: "11px", fontWeight: 500 }}
                          />
                          <YAxis 
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            style={{ fontSize: "10px", fontWeight: 500 }}
                            tickFormatter={(v) => `R$ ${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                          />
                          <Tooltip 
                            formatter={(value: number, name: string) => [
                              `R$ ${value.toLocaleString()}`, 
                              name === "receita" ? "Receita" : "Gastos"
                            ]}
                            contentStyle={{ 
                              borderRadius: "12px", 
                              border: "none", 
                              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                              fontSize: "11px",
                            }}
                          />
                          <Bar 
                            dataKey="receita" 
                            name="receita" 
                            radius={[4, 4, 0, 0]} 
                            maxBarSize={40} 
                            isAnimationActive={false}
                          >
                            {monthlyChartData.map((entry: any, index: number) => {
                              const isSelected = selectedMonthFilter === entry.monthKey;
                              const hasSelection = selectedMonthFilter !== null;
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={isSelected ? "#059669" : (hasSelection ? "#d1fae5" : "#10b981")}
                                  style={{ cursor: "pointer" }}
                                  onClick={(e: any) => {
                                    if (e && e.stopPropagation) {
                                      e.stopPropagation();
                                    }
                                    setSelectedMonthFilter((prev) => 
                                      prev === entry.monthKey ? null : entry.monthKey
                                    );
                                  }}
                                />
                              );
                            })}
                          </Bar>
                          <Line 
                            type="monotone" 
                            dataKey="gasto" 
                            name="gasto" 
                            stroke="#ef4444" 
                            strokeWidth={3} 
                            dot={{ r: 4, stroke: "#ef4444", strokeWidth: 2, fill: "#fff" }}
                            activeDot={{ r: 6 }}
                            isAnimationActive={false}
                            onClick={(data: any) => {
                              if (data && data.payload && data.payload.monthKey) {
                                setSelectedMonthFilter((prev) => 
                                  prev === data.payload.monthKey ? null : data.payload.monthKey
                                );
                              }
                            }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            }, [monthlyChartData, selectedMonthFilter])}
          </div>

          {useMemo(() => {
            return (
              <Card className="shadow-lg min-h-[300px] border border-slate-100">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    Detalhamento dos Itens ({filteredAporteItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                        <TableRow>
                          <TableHead
                            onClick={() => handleItemsSort("aporteNumero")}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            Aporte {renderItemsSortIndicator("aporteNumero")}
                          </TableHead>
                          <TableHead
                            onClick={() => handleItemsSort("aporteData")}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            Data {renderItemsSortIndicator("aporteData")}
                          </TableHead>
                          <TableHead
                            onClick={() => handleItemsSort("categoria")}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            Categoria {renderItemsSortIndicator("categoria")}
                          </TableHead>
                          <TableHead
                            onClick={() => handleItemsSort("fornecedor")}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            Fornecedor {renderItemsSortIndicator("fornecedor")}
                          </TableHead>
                          <TableHead
                            onClick={() => handleItemsSort("descricao")}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            Descrição {renderItemsSortIndicator("descricao")}
                          </TableHead>
                          <TableHead
                            onClick={() => handleItemsSort("valor")}
                            className="text-right cursor-pointer hover:bg-slate-50"
                          >
                            Valor {renderItemsSortIndicator("valor")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAporteItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-slate-500 py-6 text-sm"
                            >
                              Nenhum item encontrado para os filtros atuais.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAporteItems.map((item: any, idx: number) => (
                            <TableRow key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <TableCell className="font-semibold text-xs text-slate-800 whitespace-nowrap">
                                {item.aporteNumero}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs text-slate-600">
                                {item.aporteData
                                  ? new Date(item.aporteData).toLocaleDateString(
                                      "pt-BR",
                                      { timeZone: "UTC" },
                                    )
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 break-words whitespace-normal max-w-[150px]">{item.categoria || "-"}</TableCell>
                              <TableCell className="text-xs text-slate-600 break-words whitespace-normal max-w-[180px]">{item.fornecedor || "-"}</TableCell>
                              <TableCell
                                className="text-xs text-slate-600 break-words whitespace-normal max-w-[300px]"
                                title={item.descricao}
                              >
                                {item.descricao || "-"}
                              </TableCell>
                              <TableCell className="text-right text-red-600 font-bold whitespace-nowrap text-xs">
                                R$ {(item.valor || 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          }, [filteredAporteItems, itemsSortConfig])}
        </div>
      </div>
    </div>
  );
};

export const ManagementView = ({
  contracts,
  measurements,
  quotations,
  controllerEquipments,
  controllerTeams,
  manpowerRecords,
  employees,
  selectedContractId: propSelectedContractId,
  onUpdateContractId,
  aportes = [],
  currentUser,
}: any) => {
  type DetailViewType =
    | "overview"
    | "RC"
    | "Equipamentos"
    | "RH"
    | "Receita"
    | "Aporte Financeiro";
  const [activeView, setActiveView] = useState<DetailViewType>("overview");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(
    null,
  );
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(
    null,
  );
  const [rhTreemapMetric, setRhTreemapMetric] = useState<"count" | "value">(
    "count",
  );
  const [eqTreemapMetric, setEqTreemapMetric] = useState<"count" | "value">(
    "count",
  );
  const [localSelectedContractId, setLocalSelectedContractId] =
    useState<string>("all");
  const selectedContractId = propSelectedContractId || localSelectedContractId;
  const setSelectedContractId =
    onUpdateContractId || setLocalSelectedContractId;

  const stats = useMemo(() => {
    const filteredMeasurements =
      selectedContractId === "all"
        ? measurements
        : measurements?.filter((m: any) => m.contractId === selectedContractId);

    const equipments = (controllerEquipments || []).filter(
      (e: any) => !e.situation || e.situation === "Ativo",
    );
    const rh = (employees || []).filter(
      (e: any) => e.status === "active" || e.status === "Ativo" || !e.status,
    );

    const equipmentCost = equipments.reduce(
      (acc: number, e: any) => acc + (e.monthlyPrice || e.contractedPrice || 0),
      0,
    );
    const rhCost = rh.reduce((acc: number, e: any) => acc + (e.salary || 0), 0);

    let revenue = 0;
    const revenueDetails: any[] = [];

    (filteredMeasurements || []).forEach((m: any) => {
      let mTotal = 0;
      const contract = (contracts || []).find(
        (c: any) => c.id === m.contractId,
      );
      const quotation = (quotations || []).find(
        (q: any) => q.id === contract?.quotationId,
      );

      const priceMap = new Map<string, number>();

      const addPrices = (items: any[]) => {
        for (const item of items || []) {
          if (item.price) priceMap.set(item.serviceId || item.code, item.price);
        }
      };

      addPrices(quotation?.services || []);
      (quotation?.groups || []).forEach((g: any) =>
        addPrices(g.services || []),
      );
      addPrices(contract?.services || []);
      (contract?.groups || []).forEach((g: any) => addPrices(g.services || []));

      (m.items || []).forEach((item: any) => {
        mTotal += (item.quantity || 0) * (priceMap.get(item.serviceId) || 0);
      });

      revenue += mTotal;
      revenueDetails.push({
        name: `${contract?.contractNumber || "Sem Contrato"} - ${m.period}`,
        value: mTotal,
      });
    });

    const aportesCompany = aportes.filter((a: any) => {
      const matchCompany =
        !currentUser?.companyId || a.companyId === currentUser.companyId;
      const matchContract =
        selectedContractId === "all" ||
        a.contractId === selectedContractId ||
        !a.contractId;
      return matchCompany && matchContract;
    });

    let totalAportes = 0;
    const aporteDetails: any[] = [];
    const aporteCategoriasMap: Record<string, number> = {};

    aportesCompany.forEach((a: any) => {
      let aporteTotal = 0;
      (a.items || []).forEach((i: any) => {
        const cat = i.categoria || "Sem Categoria";
        aporteTotal += i.valor || 0;
        aporteCategoriasMap[cat] =
          (aporteCategoriasMap[cat] || 0) + (i.valor || 0);
      });
      totalAportes += aporteTotal;
      aporteDetails.push({
        name: `Aporte ${a.numero}`,
        value: aporteTotal,
        meta: a,
      });
    });

    const aporteCategorias = Object.entries(aporteCategoriasMap).map(
      ([name, value]) => ({ name, value }),
    );

    const aporte = totalAportes; // Using the real accumulated aportes instead of Math.max(0, (equipmentCost + rhCost) - revenue);

    return {
      equipmentCost,
      rhCost,
      revenue,
      aporte,
      aporteCategorias,
      details: {
        Equipamentos: equipments.map((e: any) => ({
          name: e.name,
          value: e.monthlyPrice || e.contractedPrice || 0,
          meta: e,
        })),
        RH: rh.map((e: any) => ({ name: e.name, value: e.salary, meta: e })),
        Receita: revenueDetails,
        "Aporte Financeiro": aporteDetails,
      },
    };
  }, [
    controllerEquipments,
    employees,
    measurements,
    contracts,
    quotations,
    selectedContractId,
    aportes,
    currentUser,
  ]);

  const data = [
    { name: "Equipamentos", value: stats.equipmentCost, color: "#3b82f6" },
    { name: "RH", value: stats.rhCost, color: "#10b981" },
    { name: "Receita", value: stats.revenue, color: "#f59e0b" },
    { name: "Aporte Financeiro", value: stats.aporte, color: "#ef4444" },
  ];

  const handleChartClick = (name: string) => {
    setActiveView(name as DetailViewType);
  };

  if (activeView === "RH") {
    const rhData = stats.details["RH"] || [];
    const roleStatsMap = new Map<string, { count: number; value: number }>();
    rhData.forEach((item: any) => {
      const role = item.meta?.role || "Não Informado";
      const current = roleStatsMap.get(role) || { count: 0, value: 0 };
      current.count += 1;
      current.value += item.value || 0;
      roleStatsMap.set(role, current);
    });
    const rolesTreemapData = Array.from(roleStatsMap.entries())
      .map(([name, stats]) => ({
        name,
        size:
          rhTreemapMetric === "count" ? stats.count : Math.round(stats.value),
        count: stats.count,
        value: stats.value,
      }))
      .filter((x) => x.size > 0)
      .sort((a, b) =>
        b.size === a.size ? a.name.localeCompare(b.name) : b.size - a.size,
      );

    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView("overview")}
            className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold">
            Gestão Global - Detalhamento RH
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-t-4 border-emerald-500">
            <CardHeader>
              <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4" /> Total de Colaboradores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {rhData.length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-t-4 border-emerald-500">
            <CardHeader>
              <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Custo Total (Salários)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                R$ {stats.rhCost.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between items-start">
              <div className="space-y-2">
                <CardTitle>Colaboradores por Função</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRhTreemapMetric("count")}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${rhTreemapMetric === "count" ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    Quantidade
                  </button>
                  <button
                    onClick={() => setRhTreemapMetric("value")}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${rhTreemapMetric === "value" ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    Valor
                  </button>
                </div>
              </div>
              {selectedRoleFilter && (
                <button
                  onClick={() => setSelectedRoleFilter(null)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Limpar Filtro
                </button>
              )}
            </CardHeader>
            <CardContent className="h-[600px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={rolesTreemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  isAnimationActive={false}
                  content={
                    <CustomTreemapContent
                      treeMapType={rhTreemapMetric}
                      treeMapSuffix="func."
                      activeFilter={selectedRoleFilter}
                      onClick={(name: string) =>
                        setSelectedRoleFilter(
                          name === selectedRoleFilter ? null : name,
                        )
                      }
                    />
                  }
                >
                  <Tooltip
                    wrapperStyle={{ fontFamily: "Arial", fontSize: 12 }}
                    formatter={(value: any) =>
                      rhTreemapMetric === "value"
                        ? `R$ ${(value || 0).toLocaleString()}`
                        : `${value || 0} func.`
                    }
                  />
                </Treemap>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle>
                {selectedRoleFilter
                  ? `Colaboradores (${selectedRoleFilter})`
                  : "Lista de Colaboradores"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rhData
                    .filter(
                      (item: any) =>
                        !selectedRoleFilter ||
                        (item.meta?.role || "Não Informado") ===
                          selectedRoleFilter,
                    )
                    .map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell>{item.meta?.role || "-"}</TableCell>
                        <TableCell className="text-right">
                          R$ {(item.value || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeView === "Equipamentos") {
    const eqData = stats.details["Equipamentos"] || [];

    const typeStatsMap = new Map<string, { count: number; value: number }>();
    eqData.forEach((item: any) => {
      const t = item.meta?.category || item.meta?.type || "Não Informado";
      const current = typeStatsMap.get(t) || { count: 0, value: 0 };
      current.count += 1;
      current.value += item.value || 0;
      typeStatsMap.set(t, current);
    });
    const typeTreemapData = Array.from(typeStatsMap.entries())
      .map(([name, stats]) => ({
        name,
        size:
          eqTreemapMetric === "count" ? stats.count : Math.round(stats.value),
        count: stats.count,
        value: stats.value,
      }))
      .filter((x) => x.size > 0)
      .sort((a, b) =>
        b.size === a.size ? a.name.localeCompare(b.name) : b.size - a.size,
      );

    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView("overview")}
            className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold">
            Gestão Global - Detalhamento Equipamentos
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-t-4 border-blue-500">
            <CardHeader>
              <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                <HardHat className="w-4 h-4" /> Total de Equipamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {eqData.length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-t-4 border-blue-500">
            <CardHeader>
              <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Custo Total (Mensal)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                R$ {stats.equipmentCost.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between items-start">
              <div className="space-y-2">
                <CardTitle>Equipamentos por Categoria</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEqTreemapMetric("count")}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${eqTreemapMetric === "count" ? "bg-blue-100 text-blue-800 font-bold" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    Quantidade
                  </button>
                  <button
                    onClick={() => setEqTreemapMetric("value")}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${eqTreemapMetric === "value" ? "bg-blue-100 text-blue-800 font-bold" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    Valor Mensal
                  </button>
                </div>
              </div>
              {selectedTypeFilter && (
                <button
                  onClick={() => setSelectedTypeFilter(null)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Limpar Filtro
                </button>
              )}
            </CardHeader>
            <CardContent className="h-[600px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={typeTreemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  isAnimationActive={false}
                  content={
                    <CustomTreemapContent
                      treeMapType={eqTreemapMetric}
                      treeMapSuffix="equip."
                      activeFilter={selectedTypeFilter}
                      onClick={(name: string) =>
                        setSelectedTypeFilter(
                          name === selectedTypeFilter ? null : name,
                        )
                      }
                    />
                  }
                >
                  <Tooltip
                    wrapperStyle={{ fontFamily: "Arial", fontSize: 12 }}
                    formatter={(value: any) =>
                      eqTreemapMetric === "value"
                        ? `R$ ${(value || 0).toLocaleString()}`
                        : `${value || 0} equip.`
                    }
                  />
                </Treemap>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle>
                {selectedTypeFilter
                  ? `Equipamentos (${selectedTypeFilter})`
                  : "Lista de Equipamentos"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Custo Mensal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eqData
                    .filter(
                      (item: any) =>
                        !selectedTypeFilter ||
                        (item.meta?.category ||
                          item.meta?.type ||
                          "Não Informado") === selectedTypeFilter,
                    )
                    .map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell>
                          {item.meta?.category || item.meta?.type || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {(item.value || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeView === "Receita") {
    const revData = stats.details["Receita"] || [];

    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView("overview")}
            className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold">
            Gestão Global - Detalhamento de Receita
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-t-4 border-amber-500">
            <CardHeader>
              <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                <Landmark className="w-4 h-4" /> Receita Total Apurada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                R$ {stats.revenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle>Histórico de Medições</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato e Período</TableHead>
                    <TableHead className="text-right">Valor Medido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revData.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-bold">
                        R$ {(item.value || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeView === "Aporte Financeiro") {
    return (
      <AporteFinanceiroTab
        aportes={aportes}
        measurements={measurements}
        contracts={contracts}
        quotations={quotations}
        currentUser={currentUser}
        selectedContractId={selectedContractId}
        setActiveView={setActiveView}
        stats={stats}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão Global</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {data.map((item) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer"
            onClick={() => handleChartClick(item.name)}
          >
            <Card
              className="shadow-lg hover:shadow-xl transition-shadow border-t-4"
              style={{ borderTopColor: item.color }}
            >
              <CardHeader>
                <CardTitle className="text-base uppercase text-slate-500">
                  {item.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="text-3xl font-bold"
                  style={{ color: item.color }}
                >
                  R$ {(item.value ?? 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg border-t-4 border-slate-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800">
              Visão Geral (Composto)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                onClick={(e) =>
                  e && handleChartClick(String(e.activeLabel || ""))
                }
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontFamily: "Arial", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontFamily: "Arial", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  formatter={(value: number) =>
                    `R$ ${(value ?? 0).toLocaleString()}`
                  }
                  wrapperStyle={{ fontFamily: "Arial", fontSize: 12 }}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  isAnimationActive={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-t-4 border-slate-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800">
              Distribuição (Pizza)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  fill="#8884d8"
                  isAnimationActive={false}
                  onClick={(e) => handleChartClick(e.name)}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${(value ?? 0).toLocaleString()}`
                  }
                  wrapperStyle={{ fontFamily: "Arial", fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontFamily: "Arial", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
