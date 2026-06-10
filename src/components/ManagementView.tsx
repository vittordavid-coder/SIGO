import React, { useMemo, useState, useEffect } from "react";
import { getSupabaseConfig, createSupabaseClient } from "../lib/supabaseClient";
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
import {
  Landmark,
  ArrowLeft,
  Users,
  HardHat,
  TrendingUp,
  AlertCircle,
  ListTodo,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Plus,
  Trash2,
} from "lucide-react";

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
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(
    null,
  );
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedAporteCategorias, setSelectedAporteCategorias] = useState<
    Record<string, boolean>
  >({});
  const [itemsSortConfig, setItemsSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [categorySort, setCategorySort] = useState<{
    key: "name" | "value";
    direction: "asc" | "desc";
  }>({ key: "value", direction: "desc" });

  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | null>(
    null,
  );

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
    const ptMonthsAbbr = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

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
  }, [
    aporteItemsForView,
    selectedAporteCategorias,
    selectedTypeFilter,
    itemsSortConfig,
  ]);

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
    const monthlyMap: Record<
      string,
      {
        monthLabel: string;
        monthKey: string;
        sortKey: number;
        receita: number;
        gasto: number;
      }
    > = {};
    const ptMonthsAbbr = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    const filteredM =
      selectedContractId === "all"
        ? measurements
        : measurements?.filter((m: any) => m.contractId === selectedContractId);

    (filteredM || []).forEach((m: any) => {
      let mTotal = 0;
      const contract = (contracts || []).find(
        (c: any) => c.id === m.contractId,
      );
      const quotation = (quotations || []).find(
        (q: any) => q.id === contract?.quotationId,
      );
      const priceMap = new Map<string, number>();

      const addPrices = (srvs: any[]) => {
        for (const srv of srvs || []) {
          if (srv.price) priceMap.set(srv.serviceId || srv.code, srv.price);
        }
      };

      addPrices(quotation?.services || []);
      (quotation?.groups || []).forEach((g: any) =>
        addPrices(g.services || []),
      );
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
          parsedMonth = {
            year: parseInt(match[2], 10),
            month: parseInt(match[1], 10),
          };
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
            sortKey:
              parseInt(key.split("-")[0], 10) * 12 +
              parseInt(key.split("-")[1], 10),
            receita: 0,
            gasto: 0,
          };
        }
        monthlyMap[key].gasto += i.valor || 0;
      }
    });

    const lst = Object.values(monthlyMap);
    return lst.sort((a, b) => a.sortKey - b.sortKey);
  }, [
    selectedContractId,
    measurements,
    contracts,
    quotations,
    allAporteItems,
    selectedAporteCategorias,
  ]);

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
            <span>
              Mês selecionado no gráfico:{" "}
              <strong>
                {monthlyChartData.find(
                  (m) => m.monthKey === selectedMonthFilter,
                )?.monthLabel || selectedMonthFilter}
              </strong>
            </span>
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
                <TrendingUp className="w-4 h-4 text-red-500" /> Total Aportado{" "}
                {selectedMonthFilter && "no Mês"}
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
                      checked={
                        (aporteCategorias || []).length > 0 &&
                        (aporteCategorias || []).every(
                          (c: any) =>
                            selectedAporteCategorias[c.name] !== false,
                        )
                      }
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
                    Categoria{" "}
                    {categorySort.key === "name"
                      ? categorySort.direction === "asc"
                        ? "▲"
                        : "▼"
                      : "↕"}
                  </button>
                  <button
                    onClick={() => handleCategorySort("value")}
                    className="hover:text-slate-600 flex items-center gap-1 flex-shrink-0 justify-end ml-2 font-bold focus:outline-none"
                  >
                    Valor{" "}
                    {categorySort.key === "value"
                      ? categorySort.direction === "asc"
                        ? "▲"
                        : "▼"
                      : "↕"}
                  </button>
                </div>

                <div className="max-h-[350px] overflow-y-auto pr-1 space-y-1">
                  {sortedAporteCategorias.map((cat, idx) => {
                    const isChecked =
                      selectedAporteCategorias[cat.name] !== false;
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
                              if (
                                state.activeTooltipIndex !== undefined &&
                                state.activeTooltipIndex >= 0
                              ) {
                                const item =
                                  monthlyChartData[state.activeTooltipIndex];
                                if (item) key = item.monthKey;
                              }
                              // 2. Try active payload
                              if (
                                !key &&
                                state.activePayload &&
                                state.activePayload.length > 0
                              ) {
                                key = state.activePayload[0].payload?.monthKey;
                              }
                              // 3. Try matching state.activeLabel
                              if (!key && state.activeLabel) {
                                const match = monthlyChartData.find(
                                  (m: any) =>
                                    m.monthLabel === state.activeLabel,
                                );
                                if (match) key = match.monthKey;
                              }

                              if (key) {
                                setSelectedMonthFilter((prev) =>
                                  prev === key ? null : key,
                                );
                              }
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                          />
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
                            tickFormatter={(v) =>
                              `R$ ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                            }
                          />
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              `R$ ${value.toLocaleString()}`,
                              name === "receita" ? "Receita" : "Gastos",
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
                            {monthlyChartData.map(
                              (entry: any, index: number) => {
                                const isSelected =
                                  selectedMonthFilter === entry.monthKey;
                                const hasSelection =
                                  selectedMonthFilter !== null;
                                return (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      isSelected
                                        ? "#059669"
                                        : hasSelection
                                          ? "#d1fae5"
                                          : "#10b981"
                                    }
                                    style={{ cursor: "pointer" }}
                                    onClick={(e: any) => {
                                      if (e && e.stopPropagation) {
                                        e.stopPropagation();
                                      }
                                      setSelectedMonthFilter((prev) =>
                                        prev === entry.monthKey
                                          ? null
                                          : entry.monthKey,
                                      );
                                    }}
                                  />
                                );
                              },
                            )}
                          </Bar>
                          <Line
                            type="monotone"
                            dataKey="gasto"
                            name="gasto"
                            stroke="#ef4444"
                            strokeWidth={3}
                            dot={{
                              r: 4,
                              stroke: "#ef4444",
                              strokeWidth: 2,
                              fill: "#fff",
                            }}
                            activeDot={{ r: 6 }}
                            isAnimationActive={false}
                            onClick={(data: any) => {
                              if (
                                data &&
                                data.payload &&
                                data.payload.monthKey
                              ) {
                                setSelectedMonthFilter((prev) =>
                                  prev === data.payload.monthKey
                                    ? null
                                    : data.payload.monthKey,
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
                            <TableRow
                              key={idx}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <TableCell className="font-semibold text-xs text-slate-800 whitespace-nowrap">
                                {item.aporteNumero}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs text-slate-600">
                                {item.aporteData
                                  ? new Date(
                                      item.aporteData,
                                    ).toLocaleDateString("pt-BR", {
                                      timeZone: "UTC",
                                    })
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 break-words whitespace-normal max-w-[150px]">
                                {item.categoria || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 break-words whitespace-normal max-w-[180px]">
                                {item.fornecedor || "-"}
                              </TableCell>
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
  teamAssignments = [],
  manpowerRecords,
  employees,
  selectedContractId: propSelectedContractId,
  onUpdateContractId,
  aportes = [],
  currentUser,
  technicalSchedules = [],
  services = [],
  resources: propResources = [],
  fuelLogs: propFuelLogs = [],
  equipmentMaintenance: propEquipmentMaintenance = [],
  purchaseOrders: propPurchaseOrders = [],
}: any) => {
  const [localSelectedContractId, setLocalSelectedContractId] =
    useState<string>("all");
  const selectedContractId = propSelectedContractId || localSelectedContractId;
  const setSelectedContractId =
    onUpdateContractId || setLocalSelectedContractId;

  const companyId = currentUser?.companyId || 'default';

  type DetailViewType =
    | "overview"
    | "RH"
    | "Equipamentos"
    | "Receita"
    | "Aporte Financeiro"
    | "CurvaS";

  const [activeView, setActiveView] = useState<DetailViewType>("overview");

  // Safe helper to calculate unit cost of a service composition
  const calculateServiceUnitCost = (
    service: any,
    resources: any[],
    allServices: any[],
    bdi?: number
  ): number => {
    let laborHorario = 0;
    let materials = 0;
    let equipment = 0;
    let auxiliary = 0;

    (service.items || []).forEach((item: any) => {
      const resource = resources.find((r: any) => r.id === item.resourceId);
      if (resource) {
        const cost = (item.consumption || 0) * (resource.basePrice || 0);
        if (resource.type === 'labor') {
          laborHorario += cost;
        } else if (resource.type === 'material') {
          materials += cost;
        } else if (resource.type === 'equipment') {
          equipment += cost;
        }
      } else {
        const subService = allServices.find((s: any) => s.id === item.resourceId);
        if (subService) {
          const subCost = calculateServiceUnitCost(subService, resources, allServices);
          auxiliary += (item.consumption || 0) * subCost;
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
  };

  const localFuelLogs = useMemo(() => {
    if (propFuelLogs && propFuelLogs.length > 0) return propFuelLogs;
    try {
      const saved = localStorage.getItem(`${companyId}_sigo_fuel_logs`) || localStorage.getItem('sigo_fuel_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, [propFuelLogs, companyId]);

  const localMaint = useMemo(() => {
    if (propEquipmentMaintenance && propEquipmentMaintenance.length > 0) return propEquipmentMaintenance;
    try {
      const saved = localStorage.getItem(`${companyId}_sigo_equipment_maintenance`) || localStorage.getItem('sigo_equipment_maintenance');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, [propEquipmentMaintenance, companyId]);

  const localOrders = useMemo(() => {
    if (propPurchaseOrders && propPurchaseOrders.length > 0) return propPurchaseOrders;
    try {
      const saved = localStorage.getItem(`${companyId}_sigo_purchase_orders`) || localStorage.getItem('sigo_purchase_orders');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, [propPurchaseOrders, companyId]);

  const localResources = useMemo(() => {
    if (propResources && propResources.length > 0) return propResources;
    try {
      const saved = localStorage.getItem(`${companyId}_sconet_resources`) || localStorage.getItem('sconet_resources');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, [propResources, companyId]);

  const [activeCustomDetail, setActiveCustomDetail] = useState<any | null>(null);

  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardType, setNewCardType] = useState<'Material' | 'Equipamentos' | 'Serviços'>('Material');
  const [newCardMaterial, setNewCardMaterial] = useState('');
  const [newCardEqType, setNewCardEqType] = useState<'alugado' | 'proprio' | 'ambos'>('ambos');

  const uniqueMaterials = useMemo(() => {
    const mats = new Set<string>();
    
    // 1. From local purchase orders
    localOrders.forEach((o: any) => {
      (o.items || []).forEach((item: any) => {
        if (item.description) {
          mats.add(item.description.trim());
        }
      });
    });

    // 2. From all resources of type material in catalog (which represent Cotações insumos)
    localResources.forEach((r: any) => {
      if (r.type === 'material' && r.name) {
        mats.add(r.name.trim());
      }
    });

    // 3. Specifically from active company quotations and their composition items
    (quotations || []).forEach((q: any) => {
      const activeServices = [
        ...(q.services || []),
        ...(q.groups?.flatMap((g: any) => g.services || []) || [])
      ];
      activeServices.forEach((bi: any) => {
        const comp = services.find((s: any) => s.id === bi.serviceId);
        if (comp) {
          (comp.items || []).forEach((item: any) => {
            const res = localResources.find((r: any) => r.id === item.resourceId);
            if (res && res.type === 'material' && res.name) {
              mats.add(res.name.trim());
            }
          });
        }
      });
    });

    return Array.from(mats).sort();
  }, [localOrders, localResources, quotations, services]);

  const isAlugado = (eq: any) => {
    const o = (eq.origin || '').toLowerCase();
    return o.includes('alugad') || o.includes('rent') || o.includes('leas') || eq.ownerName || eq.ownerCnpj;
  };
  const isProprio = (eq: any) => {
    const o = (eq.origin || '').toLowerCase();
    return o.includes('própri') || o.includes('propri') || o.includes('own');
  };

  const materialTimeline = useMemo(() => {
    if (!activeCustomDetail || activeCustomDetail.type !== 'Material') return [];
    const matName = activeCustomDetail.materialName;
    const monthlyDataMap = new Map<string, { monthKey: string, monthLabel: string, qty: number, totalVal: number, sortKey: number }>();
    
    const ptMonthsAbbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    localOrders.forEach((order: any) => {
      (order.items || []).forEach((item: any) => {
        if ((item.description || '').trim().toLowerCase() === (matName || '').trim().toLowerCase()) {
          const dateStr = order.orderDate || order.deliveryDate;
          if (dateStr) {
            const dt = new Date(dateStr + 'T12:00:00');
            if (!isNaN(dt.getTime())) {
              const yr = dt.getFullYear();
              const mon = dt.getMonth(); // 0-indexed
              const monthKey = `${yr}-${(mon + 1).toString().padStart(2, '0')}`;
              const label = `${ptMonthsAbbr[mon]}/${yr.toString().slice(-2)}`;
              const existing = monthlyDataMap.get(monthKey);
              const qty = Number(item.quantity) || 0;
              const val = qty * (Number(item.price) || 0);
              
              if (existing) {
                existing.qty += qty;
                existing.totalVal += val;
              } else {
                monthlyDataMap.set(monthKey, {
                  monthKey,
                  monthLabel: label,
                  qty,
                  totalVal: val,
                  sortKey: yr * 12 + mon
                });
              }
            }
          }
        }
      });
    });

    const sortedPoints = Array.from(monthlyDataMap.values()).sort((a, b) => a.sortKey - b.sortKey);
    
    let cumulativeQty = 0;
    return sortedPoints.map(p => {
      cumulativeQty += p.qty;
      return {
        ...p,
        cumulativeQty
      };
    });
  }, [activeCustomDetail, localOrders]);

  const selectedEqsList = useMemo(() => {
    if (!activeCustomDetail || activeCustomDetail.type !== 'Equipamentos') return [];
    const eqType = activeCustomDetail.equipmentType || 'ambos';
    
    const selected = controllerEquipments.filter((eq: any) => {
      if (eqType === 'alugado') return isAlugado(eq);
      if (eqType === 'proprio') return isProprio(eq);
      return true;
    });

    return selected.map((eq: any) => {
      const baseCost = Number(eq.monthlyPrice || eq.contractedPrice || 0);
      const maintCost = localMaint
        .filter((m: any) => m.equipmentId === eq.id)
        .reduce((sSum: number, m: any) => sSum + ((m.items || []).reduce((s: number, i: any) => s + (Number(i.value) * Number(i.quantity) || 0), 0) || m.totalCost || 0), 0);
      const fuelCost = localFuelLogs
        .filter((log: any) => log.equipmentId === eq.id && log.type === 'saida')
        .reduce((fSum: number, log: any) => fSum + (log.cost || (Number(log.quantity) * Number(log.unitPrice) || 0)), 0);
      const totalCost = baseCost + maintCost + fuelCost;

      return {
        ...eq,
        baseCost,
        maintCost,
        fuelCost,
        totalCost
      };
    });
  }, [activeCustomDetail, controllerEquipments, localMaint, localFuelLogs]);

  const top10Equipments = useMemo(() => {
    return [...selectedEqsList].sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);
  }, [selectedEqsList]);

  const classifiedServices = useMemo(() => {
    const aggregatedMapList = new Map<string, { serviceId: string, quantity: number, priceSum: number, count: number }>();
    contracts.forEach((c: any) => {
      if (selectedContractId !== 'all' && c.id !== selectedContractId) return;
      const processService = (item: any) => {
        if (!item.serviceId) return;
        const existing = aggregatedMapList.get(item.serviceId);
        if (existing) {
          existing.quantity += Number(item.quantity) || 0;
          existing.priceSum += Number(item.price) || 0;
          existing.count += 1;
        } else {
          aggregatedMapList.set(item.serviceId, {
            serviceId: item.serviceId,
            quantity: Number(item.quantity) || 0,
            priceSum: Number(item.price) || 0,
            count: 1
          });
        }
      };
      (c.services || []).forEach(processService);
      (c.groups || []).forEach((g: any) => (g.services || []).forEach(processService));
    });

    const list = Array.from(aggregatedMapList.values()).map(item => {
      const composition = services.find((s: any) => s.id === item.serviceId);
      if (!composition) return null;

      const avgPrice = item.count > 0 ? (item.priceSum / item.count) : 0;
      const unitCost = calculateServiceUnitCost(composition, localResources, services);

      const totalRev = item.quantity * avgPrice;
      const totalCost = item.quantity * unitCost;
      const rentabilidade = totalRev - totalCost;
      const margin = totalRev > 0 ? (rentabilidade / totalRev) * 100 : 0;

      return {
        serviceId: item.serviceId,
        code: composition.code || 'N/A',
        name: composition.name,
        unit: composition.unit || 'unid.',
        quantity: item.quantity,
        avgPrice,
        unitCost,
        totalRev,
        totalCost,
        rentabilidade,
        margin
      };
    }).filter((i): i is NonNullable<typeof i> => i !== null && i.rentabilidade > 0);

    list.sort((a, b) => b.rentabilidade - a.rentabilidade);
    
    const totalRent = list.reduce((acc, s) => acc + s.rentabilidade, 0);
    let accAmount = 0;
    const mapped = list.map(s => {
      accAmount += s.rentabilidade;
      const accumPct = totalRent > 0 ? (accAmount / totalRent) * 100 : 0;
      return {
        ...s,
        percentage: totalRent > 0 ? (s.rentabilidade / totalRent) * 100 : 0,
        accumPct,
        category: accumPct <= 80 ? 'A' : accumPct <= 95 ? 'B' : 'C'
      };
    });

    const classA = mapped.filter(s => s.category === 'A' || s.accumPct <= 80);
    if (classA.length === 0 && mapped.length > 0) {
      classA.push(mapped[0]);
    }
    return classA;
  }, [contracts, selectedContractId, services, localResources]);

  const handleAddCard = () => {
    const cardId = Date.now().toString();
    const card: any = {
      id: cardId,
      type: newCardType,
      materialName: newCardType === 'Material' ? newCardMaterial : undefined,
      equipmentType: newCardType === 'Equipamentos' ? newCardEqType : undefined
    };
    const updated = [...customCards, card];
    saveCustomCards(updated);
    setIsAddCardOpen(false);
  };

  const handleDeleteCard = (id: string) => {
    const updated = customCards.filter((c: any) => c.id !== id);
    saveCustomCards(updated);
  };

  const getMaterialCardProps = (matName: string) => {
    const matchingItems = localOrders.flatMap((order: any) =>
      (order.items || []).filter((item: any) =>
        (item.description || '').trim().toLowerCase() === (matName || '').trim().toLowerCase()
      )
    );
    const totalQty = matchingItems.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
    const totalVal = matchingItems.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.price) || 0), 0);
    const unit = matchingItems[0]?.unit || 'unid.';
    return {
      title: `Material: ${matName}`,
      valueStr: `R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      secondaryStr: `${totalQty.toLocaleString()} ${unit}`,
      color: '#3b82f6'
    };
  };

  const getEquipmentCardProps = (eqType: 'alugado' | 'proprio' | 'ambos') => {
    const selected = controllerEquipments.filter((eq: any) => {
      if (eqType === 'alugado') return isAlugado(eq);
      if (eqType === 'proprio') return isProprio(eq);
      return true;
    });

    const totalCostVal = selected.reduce((sum: number, eq: any) => {
      const baseCost = Number(eq.monthlyPrice || eq.contractedPrice || 0);
      const maintCost = localMaint
        .filter((m: any) => m.equipmentId === eq.id)
        .reduce((sSum: number, m: any) => sSum + (m.items || []).reduce((s: number, i: any) => s + (Number(i.value) * Number(i.quantity) || 0), 0) || m.totalCost || 0, 0);
      const fuelCost = localFuelLogs
        .filter((log: any) => log.equipmentId === eq.id && log.type === 'saida')
        .reduce((fSum: number, log: any) => fSum + (log.cost || (Number(log.quantity) * Number(log.unitPrice) || 0)), 0);
      return sum + baseCost + maintCost + fuelCost;
    }, 0);

    const label = eqType === 'alugado' ? 'Alugados' : eqType === 'proprio' ? 'Próprios' : 'Ambos';
    return {
      title: `Custos: Equipamentos (${label})`,
      valueStr: `R$ ${totalCostVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      secondaryStr: `${selected.length} equipamentos`,
      color: '#ef4444'
    };
  };

  const getServicesCardProps = () => {
    const totalRentVal = classifiedServices.reduce((acc: number, s: any) => acc + s.rentabilidade, 0);

    return {
      title: 'Serviços Classe A',
      valueStr: `R$ ${totalRentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      secondaryStr: `${classifiedServices.length} serviços mais rentáveis`,
      color: '#10b981'
    };
  };

  const renderCustomDetail = (detail: any) => {
    if (detail.type === 'Material') {
      const matName = detail.materialName;
      const matchingItemsMap = localOrders.flatMap((order: any) =>
        (order.items || []).filter((item: any) => 
          (item.description || '').trim().toLowerCase() === (matName || '').trim().toLowerCase()
        ).map((item: any) => ({
          ...item,
          orderDate: order.orderDate,
          orderNumber: order.orderNumber,
          supplierName: order.supplierName,
        }))
      );

      const totalQty = matchingItemsMap.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
      const totalVal = matchingItemsMap.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price) || 0), 0);
      const avgPrice = totalQty > 0 ? totalVal / totalQty : 0;
      const unit = matchingItemsMap[0]?.unit || 'unid.';

      return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveCustomDetail(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 bg-white cursor-pointer pointer-events-auto"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
              <div>
                <span className="text-xs text-blue-600 font-bold uppercase tracking-wider block">Detalhes do Material</span>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{matName}</h1>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Qtd. Total Adquirida</span>
                <div className="text-2xl font-black text-blue-600 mt-1">{totalQty.toLocaleString()} {unit}</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide font-black">Preço Unitário Médio</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">R$ {avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide font-black">Custo Total Acumulado</span>
                <div className="text-2xl font-black text-slate-900 mt-1">R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow flex flex-col justify-center">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">No. de Pedidos de Compra</span>
                <div className="text-2xl font-black text-purple-600 mt-1">{matchingItemsMap.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white shadow">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Evolução Mensal de Compras e Quantidade Acumulada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                {materialTimeline.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 italic">Sem dados de movimentação para este material.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={materialTimeline} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                      <YAxis yAxisId="qty" stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        formatter={(val: any, name: any) => [
                          Number(val).toLocaleString(),
                          name === 'qty' ? 'Qtd no Mês' : name === 'cumulativeQty' ? 'Qtd Acumulada' : name
                        ]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar yAxisId="qty" dataKey="qty" fill="#3b82f6" name="Qtd no Mês" radius={[4, 4, 0, 0]} barSize={40} />
                      <Line yAxisId="qty" type="monotone" dataKey="cumulativeQty" stroke="#f59e0b" name="Qtd Acumulada" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Pedidos de Compra Referentes ao Material</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold uppercase text-slate-600">Pedido</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600">Fornecedor</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-center">Data</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Qtd Adquirida</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Preço Unitário</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Total Pedido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchingItemsMap.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400 italic">Nenhum pedido de compra encontrado.</TableCell>
                      </TableRow>
                    ) : (
                      matchingItemsMap.map((item, idx) => {
                        const mTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                        return (
                          <TableRow key={idx} className="hover:bg-slate-50/50">
                            <TableCell className="font-mono text-xs font-bold text-blue-600">#{item.orderNumber}</TableCell>
                            <TableCell className="font-semibold text-slate-700">{item.supplierName || 'Sem Fornecedor'}</TableCell>
                            <TableCell className="text-center font-mono text-xs text-slate-500">
                              {item.orderDate ? new Date(item.orderDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-600">{Number(item.quantity).toLocaleString()} {item.unit || 'unid.'}</TableCell>
                            <TableCell className="text-right font-mono text-emerald-600">R$ {Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-900">R$ {mTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (detail.type === 'Equipamentos') {
      const eqType = detail.equipmentType || 'ambos';
      const typeLabel = eqType === 'proprio' ? 'Próprios' : eqType === 'alugado' ? 'Alugados' : 'Ambos';

      const baseTotal = top10Equipments.reduce((acc, eq) => acc + eq.baseCost, 0);
      const maintTotal = top10Equipments.reduce((acc, eq) => acc + eq.maintCost, 0);
      const fuelTotal = top10Equipments.reduce((acc, eq) => acc + eq.fuelCost, 0);
      const grandTotal = top10Equipments.reduce((acc, eq) => acc + eq.totalCost, 0);

      return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveCustomDetail(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 bg-white cursor-pointer pointer-events-auto"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
              <div>
                <span className="text-xs text-rose-500 font-bold uppercase tracking-wider block">Detalhes de Custos</span>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Equipamentos ({typeLabel})</h1>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Preço Base/Mensal</span>
                <div className="text-2xl font-black text-blue-600 mt-1">R$ {baseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide font-black">Custos de Manutenção</span>
                <div className="text-2xl font-black text-rose-500 mt-1">R$ {maintTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide font-black font-bold">Custos de Abastecimento</span>
                <div className="text-2xl font-black text-amber-500 mt-1">R$ {fuelTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide font-black font-bold">Custo Global Total</span>
                <div className="text-2xl font-black text-slate-900 mt-1">R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white shadow">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Top 10 Equipamentos com Maior Custo Integrado</CardTitle>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Mostra o preço base mensal somado a custos de manutenção e abastecimento</p>
            </CardHeader>
            <CardContent>
              <div className="h-96 w-full">
                {top10Equipments.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 italic font-bold uppercase">Nenhum equipamento correspondente para exibir.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={top10Equipments} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        formatter={(val: any) => [`R$ ${Number(val).toLocaleString()}`]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="baseCost" stackId="a" fill="#3b82f6" name="Preço Mensal/Contratado" />
                      <Bar dataKey="maintCost" stackId="a" fill="#ef4444" name="Itens de Manutenção" />
                      <Bar dataKey="fuelCost" stackId="a" fill="#f59e0b" name="Custos de Abastecimento" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Tabela Geral de Custos de Equipamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold uppercase text-slate-600">Equipamento</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-center">Placa</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-center">Origem</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Preço Base/Mensal</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Com Manutenção</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Com Abastecimento</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Total Acumulado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEqsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400 italic">Nenhum equipamento encontrado.</TableCell>
                      </TableRow>
                    ) : (
                      selectedEqsList.map((eq: any, idx: number) => (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-700">{eq.name}</TableCell>
                          <TableCell className="text-center font-mono text-xs text-slate-600 uppercase font-bold">{eq.plate || 'N/A'}</TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold select-none ${isAlugado(eq) ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                              {isAlugado(eq) ? 'Alugado' : 'Próprio'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-slate-600">R$ {eq.baseCost.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-medium text-rose-500">R$ {eq.maintCost.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-medium text-amber-500">R$ {eq.fuelCost.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-900">R$ {eq.totalCost.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (detail.type === 'Serviços') {
      const topServices = classifiedServices.slice(0, 10);
      const revTotal = classifiedServices.reduce((acc, s) => acc + s.totalRev, 0);
      const costTotal = classifiedServices.reduce((acc, s) => acc + s.totalCost, 0);
      const rentTotal = classifiedServices.reduce((acc, s) => acc + s.rentabilidade, 0);
      const avgMargin = revTotal > 0 ? (rentTotal / revTotal) * 100 : 0;

      return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveCustomDetail(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 bg-white cursor-pointer pointer-events-auto"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
              <div>
                <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider block">Detalhes de Rentabilidade</span>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Serviços de Classe A (Curva ABC)</h1>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Receita Global (Venda)</span>
                <div className="text-2xl font-black text-blue-600 mt-1">R$ {revTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide font-black">Custo Composição Estimado</span>
                <div className="text-2xl font-black text-amber-600 mt-1">R$ {costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide font-black">Ganhos Rentáveis Líquidos</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">R$ {rentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="pt-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Margem de Lucro Média</span>
                <div className="text-2xl font-black text-purple-600 mt-1">{avgMargin.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white shadow">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Lucro Líquido vs Receita - Top 10 Serviços Classe A</CardTitle>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider font-black">Visualização comparativa de lucratividade do serviço com base na composição de custo</p>
            </CardHeader>
            <CardContent>
              <div className="h-96 w-full">
                {topServices.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 italic">Não foram encontrados serviços de Classe A com rentabilidade positiva.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={topServices} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="code" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        formatter={(val: any, name: any) => [`R$ ${Number(val).toLocaleString()}`, name === 'totalRev' ? 'Receita Venda' : name === 'totalCost' ? 'Custo Composição' : name === 'rentabilidade' ? 'Lucro Líquido' : name]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="totalRev" fill="#3b82f6" name="Receita Venda" barSize={35} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rentabilidade" fill="#10b981" name="Lucro Líquido" barSize={35} radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Detalhamento dos Serviços Importantes de Classe A</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold uppercase text-slate-600">Código</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600">Serviço</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-center">Unid.</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Qtd Planilha</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Preço Unit. Venda</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Custo Composição</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Lucro Acumulado</TableHead>
                      <TableHead className="font-bold uppercase text-slate-600 text-right">Margem (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classifiedServices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-400 italic">Nenhum serviço de Classe A encontrado.</TableCell>
                      </TableRow>
                    ) : (
                      classifiedServices.map((s, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono text-xs font-bold text-emerald-600">{s.code}</TableCell>
                          <TableCell className="font-semibold text-slate-700 max-w-[280px] truncate">{s.name}</TableCell>
                          <TableCell className="text-center text-xs text-slate-500 font-bold uppercase">{s.unit}</TableCell>
                          <TableCell className="text-right font-mono font-medium text-slate-600">{Number(s.quantity).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-medium text-blue-600">R$ {s.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-mono font-medium text-amber-600">R$ {s.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600">R$ {s.rentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-indigo-600">{s.margin.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return null;
  };
  const [sCurveContractId, setSCurveContractId] = useState<string>("all");
  const [clickedMonthIndex, setClickedMonthIndex] = useState<number | null>(
    null,
  );

  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string | null>(
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
  const [rhZoom, setRhZoom] = useState(1);
  const [eqZoom, setEqZoom] = useState(1);

  const [rhSortCol, setRhSortCol] = useState<string>("name");
  const [rhSortDir, setRhSortDir] = useState<"asc" | "desc">("asc");

  const [eqSortCol, setEqSortCol] = useState<string>("name");
  const [eqSortDir, setEqSortDir] = useState<"asc" | "desc">("asc");

  const [revSortCol, setRevSortCol] = useState<string>("name");
  const [revSortDir, setRevSortDir] = useState<"asc" | "desc">("asc");

  const [curvaSSortCol, setCurvaSSortCol] = useState<string>("name");
  const [curvaSSortDir, setCurvaSSortDir] = useState<"asc" | "desc">("asc");

  const contractId = selectedContractId || 'all';

  const [customCards, setCustomCards] = useState<any[]>([]);

  // Load custom cards
  useEffect(() => {
    let isMounted = true;
    const loadCards = async () => {
      const storageKey = `sigo_management_custom_cards_${companyId}_${contractId}`;
      let loadedCards: any[] = [];
      
      // Try to load from Supabase
      const config = getSupabaseConfig();
      if (config.enabled && currentUser?.companyId) {
        const supabase = createSupabaseClient(config.url, config.key);
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('management_custom_cards')
              .select('*')
              .eq('company_id', companyId)
              .eq('contract_id', contractId)
              .order('display_order', { ascending: true });

            if (!error && data) {
              loadedCards = data.map((row: any) => ({
                id: row.id,
                type: row.type,
                materialName: row.material_name || undefined,
                equipmentType: row.equipment_type || undefined,
              }));
            } else if (error) {
              console.error('Error fetching custom cards from Supabase:', error);
            }
          } catch (e) {
            console.error('Failed to query Supabase for custom cards:', e);
          }
        }
      }

      // If no cards were loaded from Supabase (or not enabled/failed), fallback to local storage
      if (loadedCards.length === 0) {
        try {
          // Check for contract-specific key first
          let saved = localStorage.getItem(storageKey);
          if (!saved) {
            // Check legacy global key for backward compatibility
            saved = localStorage.getItem('sigo_management_custom_cards');
          }
          loadedCards = saved ? JSON.parse(saved) : [];
        } catch {
          loadedCards = [];
        }
      }

      if (isMounted) {
        setCustomCards(loadedCards);
      }
    };

    loadCards();
    return () => {
      isMounted = false;
    };
  }, [companyId, contractId, currentUser]);

  const saveCustomCards = async (newCards: any[]) => {
    setCustomCards(newCards);
    const storageKey = `sigo_management_custom_cards_${companyId}_${contractId}`;
    
    // 1. Save to LocalStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(newCards));
    } catch (err) {
      console.error('Error saving custom cards to LocalStorage', err);
    }

    // 2. Save to Supabase (if enabled)
    const config = getSupabaseConfig();
    if (config.enabled && currentUser?.companyId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          // First, delete existing custom cards for this contract/company
          await supabase
            .from('management_custom_cards')
            .delete()
            .eq('company_id', companyId)
            .eq('contract_id', contractId);

          if (newCards.length > 0) {
            const rowsToInsert = newCards.map((card, index) => ({
              id: card.id,
              company_id: companyId,
              contract_id: contractId,
              type: card.type,
              material_name: card.materialName || null,
              equipment_type: card.equipmentType || null,
              display_order: index,
            }));

            const { error } = await supabase
              .from('management_custom_cards')
              .insert(rowsToInsert);

            if (error) {
              console.error('Error inserting novel custom card configuration to Supabase:', error);
            }
          }
        } catch (e) {
          console.error('Failed to sync custom cards with Supabase:', e);
        }
      }
    }
  };

  // Active contract for the comparative S-curve:
  // if global filter is a specific contract, use it. Otherwise, use local state
  const activeSCurveContractId = useMemo(() => {
    if (selectedContractId && selectedContractId !== "all") {
      return selectedContractId;
    }
    if (sCurveContractId === "all") {
      // Find the first contract that actually has a technical schedule
      const firstWithSchedule = contracts?.find((c: any) =>
        technicalSchedules?.some((s: any) => s.contractId === c.id),
      );
      return firstWithSchedule?.id || contracts?.[0]?.id || "";
    }
    return sCurveContractId;
  }, [selectedContractId, sCurveContractId, contracts, technicalSchedules]);

  const activeSCurveSchedule = useMemo(() => {
    return technicalSchedules?.find(
      (s: any) => s.contractId === activeSCurveContractId,
    );
  }, [technicalSchedules, activeSCurveContractId]);

  // Compute physical groups for the active SCurve contract
  const activeSCurveGroups = useMemo(() => {
    const actContract = contracts?.find(
      (c: any) => c.id === activeSCurveContractId,
    );
    if (!actContract) return [];

    const groups = [...(actContract.groups || [])];
    const directServices = (actContract.services || []).filter(
      (item: any) => item && item.serviceId,
    );

    if (directServices.length > 0) {
      groups.push({
        id: "standalone",
        name: "Serviços Gerais",
        services: directServices,
      });
    }

    return groups.filter((g) => g.services.length > 0);
  }, [contracts, activeSCurveContractId]);

  const sCurveTimelineData = useMemo(() => {
    if (
      !activeSCurveSchedule ||
      !activeSCurveSchedule.services ||
      activeSCurveSchedule.services.length === 0
    ) {
      return [];
    }
    const duration = activeSCurveSchedule.duration || 6;
    const dataList: any[] = [];

    for (let i = 0; i < duration; i++) {
      const monthNum = i + 1;
      const periodName = `Mês ${monthNum.toString().padStart(2, "0")}`;

      let globalTotalValSum = 0;
      let globalCumulativePlanVal = 0;
      let globalCumulativeActVal = 0;

      let globalTotalQtySum = 0;
      let globalCumulativePlanQty = 0;
      let globalCumulativeActQty = 0;

      const groupsList = activeSCurveGroups.map((group: any) => {
        let groupTotalVal = 0;
        let groupPlannedVal = 0;
        let groupActualVal = 0;

        let groupTotalQty = 0;
        let groupPlannedQty = 0;
        let groupActualQty = 0;

        group.services.forEach((gSvc: any) => {
          const sSched = activeSCurveSchedule.services.find(
            (s: any) => s.serviceId === gSvc.serviceId,
          );
          if (!sSched) return;

          sSched.distribution?.forEach((dist: any) => {
            groupTotalVal += dist.plannedValue || 0;
            groupTotalQty += dist.plannedQty || 0;

            if (dist.periodIndex <= i) {
              groupPlannedVal += dist.plannedValue || 0;
              groupActualVal += dist.actualValue || 0;
              groupPlannedQty += dist.plannedQty || 0;
              groupActualQty += dist.actualQty || 0;
            }
          });
        });

        // Add to global totals for weighting
        globalTotalValSum += groupTotalVal;
        globalCumulativePlanVal += groupPlannedVal;
        globalCumulativeActVal += groupActualVal;

        globalTotalQtySum += groupTotalQty;
        globalCumulativePlanQty += groupPlannedQty;
        globalCumulativeActQty += groupActualQty;

        let plannedPercent = 0;
        let actualPercent = 0;

        if (groupTotalVal > 0) {
          plannedPercent = Math.min(
            100,
            Math.round((groupPlannedVal / groupTotalVal) * 100),
          );
          actualPercent = Math.min(
            100,
            Math.round((groupActualVal / groupTotalVal) * 100),
          );
        } else if (groupTotalQty > 0) {
          plannedPercent = Math.min(
            100,
            Math.round((groupPlannedQty / groupTotalQty) * 100),
          );
          actualPercent = Math.min(
            100,
            Math.round((groupActualQty / groupTotalQty) * 100),
          );
        }

        return {
          groupId: group.id,
          name: group.name,
          planned: plannedPercent,
          actual: actualPercent,
          plannedVal: groupPlannedVal,
          actualVal: groupActualVal,
          totalVal: groupTotalVal,
        };
      });

      let overallPlanned = 0;
      let overallActual = 0;

      if (globalTotalValSum > 0) {
        overallPlanned = Math.min(
          100,
          Math.round((globalCumulativePlanVal / globalTotalValSum) * 100),
        );
        overallActual = Math.min(
          100,
          Math.round((globalCumulativeActVal / globalTotalValSum) * 100),
        );
      } else if (globalTotalQtySum > 0) {
        overallPlanned = Math.min(
          100,
          Math.round((globalCumulativePlanQty / globalTotalQtySum) * 100),
        );
        overallActual = Math.min(
          100,
          Math.round((globalCumulativeActQty / globalTotalQtySum) * 100),
        );
      } else if (groupsList.length > 0) {
        const sumPlan = groupsList.reduce(
          (sum: number, g: any) => sum + g.planned,
          0,
        );
        const sumAct = groupsList.reduce(
          (sum: number, g: any) => sum + g.actual,
          0,
        );
        overallPlanned = Math.min(100, Math.round(sumPlan / groupsList.length));
        overallActual = Math.min(100, Math.round(sumAct / groupsList.length));
      }

      dataList.push({
        name: periodName,
        periodName,
        periodIndex: i,
        "Planejado Acumulado (%)": overallPlanned,
        "Realizado Acumulado (%)": overallActual,
        planned: overallPlanned,
        actual: overallActual,
        groupsList,
      });
    }

    return dataList;
  }, [activeSCurveSchedule, activeSCurveGroups]);

  const stats = useMemo(() => {
    const filteredMeasurements =
      selectedContractId === "all"
        ? measurements
        : measurements?.filter((m: any) => m.contractId === selectedContractId);

    const equipments = (controllerEquipments || []).filter(
      (e: any) => (!e.situation || e.situation === "Ativo" || e.situation === "active") && !e.exitDate
    );
    const rh = (employees || []).filter(
      (e: any) => (!e.status || e.status === "active" || e.status === "Ativo") && !e.dismissalDate && !e.exitDate
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

  // Get current month to lookup team assignments
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (activeView === "RH") {
    const rhData = stats.details["RH"] || [];
    const teamStatsMap = new Map<string, { count: number; value: number }>();

    rhData.forEach((item: any) => {
      let team = "Sem Equipe";
      if (item.meta) {
        // Find if they are assigned to a team this month
        const assign = teamAssignments.find(
          (a: any) =>
            a.memberId === item.meta.id &&
            a.type === "manpower" &&
            a.month === currentMonth,
        );
        if (assign) {
          const matchTeam = (controllerTeams || []).find(
            (t: any) => t.id === assign.teamId,
          );
          if (matchTeam) team = matchTeam.name;
        } else if (item.meta.team) {
          // Fallback to name mapped natively
          team = item.meta.team;
        }
      }
      
      item.resolvedTeam = team;

      const current = teamStatsMap.get(team) || { count: 0, value: 0 };
      current.count += 1;
      current.value += item.value || 0;
      teamStatsMap.set(team, current);
    });

    const teamBubbleData = Array.from(teamStatsMap.entries())
      .map(([name, stats]) => {
        const teamObj = (controllerTeams || []).find((t) => t.name === name);
        return {
          name,
          color: teamObj?.color,
          size:
            rhTreemapMetric === "count" ? stats.count : Math.round(stats.value),
          count: stats.count,
          value: stats.value,
        };
      })
      .filter((x) => x.size > 0)
      .sort((a, b) =>
        b.size === a.size ? a.name.localeCompare(b.name) : b.size - a.size,
      );

    // Dynamic Circle Packing algorithm in 2D space:
    const width = 800;
    const height = 480;
    const center = { x: width / 2, y: height / 2 };

    // Allocate radii proportional to sizes - scaled up for better legibility
    const totalSize =
      teamBubbleData.reduce((acc, curr) => acc + curr.size, 0) || 1;
    const targetArea = width * height * 0.45; // target 45% area filled for larger bubbles

    const packedBubbles = teamBubbleData.map((item, idx) => {
      const fraction = item.size / totalSize;
      const area = targetArea * fraction;
      // enforce min and max bounds for larger representation
      const r = Math.max(50, Math.min(130, Math.sqrt(area / Math.PI) * 1.3));
      return {
        ...item,
        r,
        x: center.x,
        y: center.y,
        colorIndex: idx,
      };
    });

    // Spiral/force packing layout simulation
    if (packedBubbles.length > 0) {
      packedBubbles[0].x = center.x;
      packedBubbles[0].y = center.y;
    }

    for (let i = 1; i < packedBubbles.length; i++) {
      const curr = packedBubbles[i];
      let placed = false;
      let angle = 0;
      let distance = packedBubbles[0].r + curr.r;

      while (!placed && distance < 3000) {
        for (let step = 0; step < 16; step++) {
          const theta = angle + (step * Math.PI) / 8;
          const testX = center.x + distance * Math.cos(theta);
          const testY = center.y + distance * Math.sin(theta);

          let overlap = false;
          for (let j = 0; j < i; j++) {
            const prev = packedBubbles[j];
            const dist = Math.hypot(testX - prev.x, testY - prev.y);
            if (dist < prev.r + curr.r - 2) {
              overlap = true;
              break;
            }
          }

          if (!overlap) {
            curr.x = testX;
            curr.y = testY;
            placed = true;
            break;
          }
        }
        distance += 6;
        angle += 0.35;
      }
    }

    let rhViewBox = "0 0 800 480";
    if (packedBubbles.length > 0) {
      const minX = Math.min(...packedBubbles.map(b => b.x - b.r));
      const maxX = Math.max(...packedBubbles.map(b => b.x + b.r));
      const minY = Math.min(...packedBubbles.map(b => b.y - b.r));
      const maxY = Math.max(...packedBubbles.map(b => b.y + b.r));
      const bWidth = Math.max(800, maxX - minX);
      const bHeight = Math.max(480, maxY - minY);
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      const padX = bWidth * 0.05 + 10;
      const padY = bHeight * 0.05 + 10;
      rhViewBox = `${centerX - bWidth/2 - padX} ${centerY - bHeight/2 - padY} ${bWidth + padX * 2} ${bHeight + padY * 2}`;
    }

    // High contrast, highly vibrant colors for super readability
    const colorGradients = [
      { from: "#3b82f6", to: "#1d4ed8", text: "#ffffff" }, // Sapphire Blue
      { from: "#10b981", to: "#047857", text: "#ffffff" }, // Emerald Green
      { from: "#8b5cf6", to: "#6d28d9", text: "#ffffff" }, // Royal Violet
      { from: "#f59e0b", to: "#b45309", text: "#ffffff" }, // Rich Amber
      { from: "#ec4899", to: "#be185d", text: "#ffffff" }, // Vibrant Magenta
      { from: "#06b6d4", to: "#0e7490", text: "#ffffff" }, // Cool Teal/Cyan
      { from: "#f97316", to: "#c2410c", text: "#ffffff" }, // Dark Orange
    ];

    // Compute sorted collaborator table data
    const sortedRhData = (rhData: any[]) => {
      let filtered = rhData.filter(
        (item: any) =>
          !selectedTeamFilter ||
          (item.resolvedTeam || "Sem Equipe") === selectedTeamFilter,
      );

      return [...filtered].sort((a: any, b: any) => {
        let valA = "";
        let valB = "";
        if (rhSortCol === "name") {
          valA = a.name || "";
          valB = b.name || "";
        } else if (rhSortCol === "team") {
          valA = a.resolvedTeam || "Sem Equipe";
          valB = b.resolvedTeam || "Sem Equipe";
        } else if (rhSortCol === "role") {
          valA = a.meta?.role || "";
          valB = b.meta?.role || "";
        } else if (rhSortCol === "salary") {
          const numA = a.value || 0;
          const numB = b.value || 0;
          return rhSortDir === "asc" ? numA - numB : numB - numA;
        }

        const cmp = valA.localeCompare(valB, "pt", { sensitivity: "base" });
        return rhSortDir === "asc" ? cmp : -cmp;
      });
    };

    const finalSortedRhList = sortedRhData(rhData);

    const handleSortRH = (col: string) => {
      if (rhSortCol === col) {
        setRhSortDir(rhSortDir === "asc" ? "desc" : "asc");
      } else {
        setRhSortCol(col);
        setRhSortDir("asc");
      }
    };

    const renderSortIconRH = (col: string) => {
      if (rhSortCol !== col)
        return <span className="text-slate-300 ml-1">↕</span>;
      return rhSortDir === "asc" ? (
        <span className="text-slate-800 font-bold ml-1">↑</span>
      ) : (
        <span className="text-slate-800 font-bold ml-1">↓</span>
      );
    };

    // Calculate column chart data for selected team roles
    let roleChartData: any[] = [];
    if (selectedTeamFilter) {
      const teamEmployees = rhData.filter(
        (item: any) => (item.resolvedTeam || "Sem Equipe") === selectedTeamFilter,
      );
      const roleMap = new Map<string, { count: number; value: number }>();
      teamEmployees.forEach((emp: any) => {
        const role = emp.meta?.role || "Não Informado";
        const cur = roleMap.get(role) || { count: 0, value: 0 };
        cur.count += 1;
        cur.value += emp.value || 0;
        roleMap.set(role, cur);
      });
      roleChartData = Array.from(roleMap.entries())
        .map(([name, rStats]) => ({
          name,
          count: rStats.count,
          value: Math.round(rStats.value),
          displayValue:
            rhTreemapMetric === "count"
              ? rStats.count
              : Math.round(rStats.value),
        }))
        .sort((a, b) => b.displayValue - a.displayValue);
    }

    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveView("overview");
              setSelectedTeamFilter(null);
            }}
            className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold">
            Gestão Global - Detalhamento das Equipes de RH
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
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Gráfico de Bolhas de Impacto</CardTitle>
                <p className="text-sm text-gray-500">
                  Tamanho proporcional à escala escolhida (Toque em uma bolha
                  para ver os detalhes da equipe abaixo)
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setRhTreemapMetric("count")}
                    className={`text-xs px-3 py-1.5 rounded-md transition-all font-bold ${rhTreemapMetric === "count" ? "bg-emerald-600 text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    Quantidade de Colaboradores
                  </button>
                  <button
                    onClick={() => setRhTreemapMetric("value")}
                    className={`text-xs px-3 py-1.5 rounded-md transition-all font-bold ${rhTreemapMetric === "value" ? "bg-emerald-600 text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    Valor Salarial Acumulado
                  </button>
                </div>
              </div>
              {selectedTeamFilter && (
                <button
                  onClick={() => setSelectedTeamFilter(null)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:underline transition-all shadow-sm flex items-center gap-1"
                >
                  Ver Todas as Equipes
                </button>
              )}
            </CardHeader>
            <CardContent className="flex justify-center items-center py-6 bg-white rounded-b-xl border-t border-slate-50">
              <div className="relative w-full max-w-full overflow-hidden aspect-[800/480] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center p-2 group">
                <div className="absolute top-4 right-4 flex flex-col gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setRhZoom((z) => Math.min(3, z + 0.2))} className="bg-white w-8 h-8 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 font-bold flex items-center justify-center text-lg leading-none transition-colors">+</button>
                  <button onClick={() => setRhZoom((z) => Math.max(0.4, z - 0.2))} className="bg-white w-8 h-8 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 font-bold flex items-center justify-center text-lg leading-none transition-colors">-</button>
                  <button onClick={() => setRhZoom(1)} className="bg-white w-8 h-8 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-500 font-bold text-xs uppercase transition-colors">1x</button>
                </div>
                {packedBubbles.length === 0 ? (
                  <div className="text-slate-400 italic text-sm font-medium">
                    Nenhuma equipe ou dados encontrados.
                  </div>
                ) : (
                  <svg
                    viewBox={rhViewBox}
                    className="w-full h-full select-none"
                    style={{ transform: `scale(${rhZoom})`, transformOrigin: 'center', transition: 'transform 0.3s ease' }}
                  >
                    <style>{`
                      .bubble-text-contour {
                        paint-order: stroke;
                        stroke: rgba(15, 23, 42, 0.9);
                        stroke-width: 4px;
                        stroke-linejoin: round;
                      }
                      .bubble-container {
                        transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                        transform-origin: 0 0;
                      }
                      .bubble-container:hover {
                        transform: scale(1.15); /* bolha inflando */
                      }
                      .bubble-group {
                        transition: filter 0.4s ease;
                      }
                    `}</style>
                    <defs>
                      {packedBubbles.map((item, bIdx) => {
                        if (item.color) {
                          const safeColor = item.color.replace("#", "");
                          return (
                            <radialGradient
                              id={`bubbleGrad-custom-${bIdx}-${safeColor}`}
                              key={`custom-${bIdx}`}
                              cx="30%"
                              cy="30%"
                              r="70%"
                            >
                              <stop
                                offset="0%"
                                stopColor={item.color}
                                stopOpacity={0.85}
                              />
                              <stop
                                offset="100%"
                                stopColor={item.color}
                                stopOpacity={0.98}
                              />
                            </radialGradient>
                          );
                        }
                        return null;
                      })}
                      {colorGradients.map((grad, gIdx) => (
                        <radialGradient
                          id={`bubbleGrad-${gIdx}`}
                          key={gIdx}
                          cx="30%"
                          cy="30%"
                          r="70%"
                        >
                          <stop
                            offset="0%"
                            stopColor={grad.from}
                            stopOpacity={0.98}
                          />
                          <stop
                            offset="100%"
                            stopColor={grad.to}
                            stopOpacity={0.95}
                          />
                        </radialGradient>
                      ))}
                      <radialGradient
                        id="bubbleGrad-neutral"
                        cx="30%"
                        cy="30%"
                        r="70%"
                      >
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#475569" />
                      </radialGradient>
                    </defs>

                    {packedBubbles.map((item, idx) => {
                      const isSelected = selectedTeamFilter === item.name;
                      const hasActiveFilter = selectedTeamFilter !== null;
                      const isNeutral = item.name === "Sem Equipe";
                      const safeColor = item.color
                        ? item.color.replace("#", "")
                        : "";
                      const gradId = item.color
                        ? `custom-${idx}-${safeColor}`
                        : isNeutral
                          ? "neutral"
                          : idx % colorGradients.length;
                      const sizeLabel =
                        rhTreemapMetric === "value"
                          ? `R$ ${(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `${item.count} colab.`;

                      return (
                        <g
                          key={idx}
                          transform={`translate(${item.x}, ${item.y})`}
                          onClick={() =>
                            setSelectedTeamFilter(isSelected ? null : item.name)
                          }
                          className="cursor-pointer bubble-group transition-all duration-300"
                        >
                          <g className="bubble-container">
                            <circle
                              r={item.r}
                              fill={`url(#bubbleGrad-${gradId})`}
                              className="transition-all duration-500 origin-center"
                              style={{
                                filter: isSelected
                                  ? "drop-shadow(0 16px 24px rgba(0,0,0,0.22))"
                                  : hasActiveFilter
                                    ? "opacity(0.35) drop-shadow(0 4px 6px rgba(0,0,0,0.02))"
                                    : "drop-shadow(0 10px 16px rgba(0,0,0,0.12))",
                              }}
                            />
                            {/* Super high contrast outlined text */}
                            <text
                              textAnchor="middle"
                              y={-5}
                              fill="#ffffff"
                              className="font-extrabold uppercase tracking-wider pointer-events-none select-none bubble-text-contour"
                              style={{
                                fontSize: Math.max(
                                  12,
                                  Math.min(22, item.r / 4),
                                ),
                              }}
                            >
                              {item.name.length > item.r / 3.8
                                ? `${item.name.slice(0, Math.floor(item.r / 3.8))}...`
                                : item.name}
                            </text>
                            <text
                              textAnchor="middle"
                              y={14}
                              fill="#ffffff"
                              className="font-black font-mono tracking-wider pointer-events-none select-none bubble-text-contour text-teal-300"
                              style={{
                                fontSize: Math.max(
                                  10,
                                  Math.min(15, item.r / 6),
                                ),
                              }}
                            >
                              {sizeLabel}
                            </text>
                            {item.r > 65 && (
                              <text
                                textAnchor="middle"
                                y={31}
                                fill="#ffffff"
                                className="font-extrabold opacity-95 pointer-events-none select-none bubble-text-contour text-slate-100"
                                style={{
                                  fontSize: Math.max(
                                    9,
                                    Math.min(13, item.r / 7.5),
                                  ),
                                }}
                              >
                                {rhTreemapMetric === "value"
                                  ? `${item.count} colab.`
                                  : `R$ ${(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </text>
                            )}
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AnimatePresence for transitions */}
          <AnimatePresence mode="wait">
            {selectedTeamFilter && (
              <motion.div
                key={selectedTeamFilter}
                initial={{ opacity: 0, height: 0, y: 15 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <Card className="shadow-lg border-t-4 border-blue-600 bg-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-md font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping inline-block" />
                        Funções dos Colaboradores da Equipe:{" "}
                        <span className="text-blue-600 font-extrabold">
                          {selectedTeamFilter}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        Cargos ativos quantificados por colaboradores ou valores
                        de custo salarial
                      </p>
                    </div>
                    <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 gap-0.5">
                      <button
                        onClick={() => setRhTreemapMetric("count")}
                        className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1.5 rounded-md transition-all ${rhTreemapMetric === "count" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-950"}`}
                      >
                        Quantidade
                      </button>
                      <button
                        onClick={() => setRhTreemapMetric("value")}
                        className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1.5 rounded-md transition-all ${rhTreemapMetric === "value" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-950"}`}
                      >
                        Valores
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roleChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(241, 245, 249, 0.5)" }}
                          contentStyle={{
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: any) =>
                            rhTreemapMetric === "value"
                              ? [
                                  `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                  "Custo Total",
                                ]
                              : [`${value} colab.`, "Colaboradores"]
                          }
                        />
                        <Bar
                          dataKey="displayValue"
                          fill="#2563eb"
                          radius={[6, 6, 0, 0]}
                        >
                          {roleChartData.map((entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={
                                colorGradients[idx % colorGradients.length].from
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle>
                {selectedTeamFilter
                  ? `Colaboradores da Equipe: ${selectedTeamFilter}`
                  : "Todos os Colaboradores por Equipe"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-slate-50 font-bold"
                      onClick={() => handleSortRH("name")}
                    >
                      Nome {renderSortIconRH("name")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-slate-50 font-bold"
                      onClick={() => handleSortRH("team")}
                    >
                      Equipe {renderSortIconRH("team")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-slate-50 font-bold"
                      onClick={() => handleSortRH("role")}
                    >
                      Função {renderSortIconRH("role")}
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none hover:bg-slate-50 font-bold"
                      onClick={() => handleSortRH("salary")}
                    >
                      Salário {renderSortIconRH("salary")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finalSortedRhList.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-slate-400 italic"
                      >
                        Nenhum colaborador encontrado para o filtro ativo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    finalSortedRhList.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-slate-900">
                          {item.name}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold uppercase ${item.resolvedTeam && item.resolvedTeam !== "Sem Equipe" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}
                          >
                            {item.resolvedTeam || "Sem Equipe"}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-slate-600">
                          {item.meta?.role || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-800">
                          R$ {(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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

    const teamEqStatsMap = new Map<string, { count: number; value: number }>();
    eqData.forEach((item: any) => {
      let team = "Sem Equipe";
      if (item.meta) {
        // Find if they are assigned to a team this month
        const assign = teamAssignments.find(
          (a: any) =>
            a.memberId === item.meta.id &&
            a.type === "equipment" &&
            a.month === currentMonth,
        );
        if (assign) {
          const matchTeam = (controllerTeams || []).find(
            (t: any) => t.id === assign.teamId,
          );
          if (matchTeam) team = matchTeam.name;
        } else if (item.meta.team) {
          // Fallback to name mapped natively
          team = item.meta.team;
        }
      }
      
      item.resolvedTeam = team;

      const current = teamEqStatsMap.get(team) || { count: 0, value: 0 };
      current.count += 1;
      current.value += item.value || 0;
      teamEqStatsMap.set(team, current);
    });
    const eqBubbleData = Array.from(teamEqStatsMap.entries())
      .map(([name, stats]) => {
        const teamObj = (controllerTeams || []).find((t: any) => t.name === name);
        return {
          name,
          color: teamObj?.color,
          size:
            eqTreemapMetric === "count" ? stats.count : Math.round(stats.value),
          count: stats.count,
          value: stats.value,
        };
      })
      .filter((x) => x.size > 0)
      .sort((a, b) =>
        b.size === a.size ? a.name.localeCompare(b.name) : b.size - a.size,
      );

    // Calculate column chart data for selected equipment categories
    let typeChartData: any[] = [];
    if (selectedTypeFilter) { // holding the Team Name!
      const filteredEqs = eqData.filter(
        (item: any) =>
          (item.resolvedTeam || "Sem Equipe") === selectedTypeFilter,
      );
      const subTypeMap = new Map<string, { count: number; value: number }>();
      filteredEqs.forEach((emp: any) => {
        const sub = emp.meta?.category || emp.meta?.type || "Não Informado";
        const cur = subTypeMap.get(sub) || { count: 0, value: 0 };
        cur.count += 1;
        cur.value += emp.value || 0;
        subTypeMap.set(sub, cur);
      });
      typeChartData = Array.from(subTypeMap.entries())
        .map(([name, rStats]) => ({
          name: name.length > 20 ? name.slice(0, 20) + "..." : name,
          count: rStats.count,
          value: Math.round(rStats.value),
          displayValue:
            eqTreemapMetric === "count"
              ? rStats.count
              : Math.round(rStats.value),
        }))
        .sort((a, b) => b.displayValue - a.displayValue);
    }

    // Dynamic Circle Packing algorithm in 2D space:
    const width = 800;
    const height = 480;
    const center = { x: width / 2, y: height / 2 };
    const totalEqSize = eqBubbleData.reduce((acc, curr) => acc + curr.size, 0) || 1;
    const targetEqArea = width * height * 0.45; // target 45% area filled

    const packedEqBubbles = eqBubbleData.map((item, idx) => {
      const fraction = item.size / totalEqSize;
      const area = targetEqArea * fraction;
      const r = Math.max(50, Math.min(130, Math.sqrt(area / Math.PI) * 1.3));
      return {
        ...item,
        r,
        x: center.x,
        y: center.y,
        colorIndex: idx,
      };
    });

    if (packedEqBubbles.length > 0) {
      packedEqBubbles[0].x = center.x;
      packedEqBubbles[0].y = center.y;
    }

    for (let i = 1; i < packedEqBubbles.length; i++) {
      const curr = packedEqBubbles[i];
      let placed = false;
      let angle = 0;
      let distance = packedEqBubbles[0].r + curr.r;

      while (!placed && distance < 3000) {
        for (let step = 0; step < 16; step++) {
          const theta = angle + (step * Math.PI) / 8;
          const testX = center.x + distance * Math.cos(theta);
          const testY = center.y + distance * Math.sin(theta);

          let overlap = false;
          for (let j = 0; j < i; j++) {
            const prev = packedEqBubbles[j];
            const dist = Math.hypot(testX - prev.x, testY - prev.y);
            if (dist < prev.r + curr.r - 2) {
              overlap = true;
              break;
            }
          }

          if (!overlap) {
            curr.x = testX;
            curr.y = testY;
            placed = true;
            break;
          }
        }
        angle += 0.4;
        distance += 12;
      }
    }

    let eqViewBox = "0 0 800 480";
    if (packedEqBubbles.length > 0) {
      const minX = Math.min(...packedEqBubbles.map((b: any) => b.x - b.r));
      const maxX = Math.max(...packedEqBubbles.map((b: any) => b.x + b.r));
      const minY = Math.min(...packedEqBubbles.map((b: any) => b.y - b.r));
      const maxY = Math.max(...packedEqBubbles.map((b: any) => b.y + b.r));
      const bWidth = Math.max(800, maxX - minX);
      const bHeight = Math.max(480, maxY - minY);
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      const padX = bWidth * 0.05 + 10;
      const padY = bHeight * 0.05 + 10;
      eqViewBox = `${centerX - bWidth/2 - padX} ${centerY - bHeight/2 - padY} ${bWidth + padX * 2} ${bHeight + padY * 2}`;
    }

    // Colors
    const eqColorGradients = [
      { from: "#4338ca", to: "#312e81" },
      { from: "#0284c7", to: "#0c4a6e" },
      { from: "#059669", to: "#064e3b" },
      { from: "#d97706", to: "#78350f" },
      { from: "#dc2626", to: "#7f1d1d" },
      { from: "#7c3aed", to: "#4c1d95" },
      { from: "#db2777", to: "#831843" },
      { from: "#0891b2", to: "#164e63" },
      { from: "#ea580c", to: "#7c2d12" },
      { from: "#4f46e5", to: "#312e81" },
      { from: "#65a30d", to: "#3f6212" },
      { from: "#14b8a6", to: "#134e4a" },
    ];

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
                <CardTitle>Equipamentos por Equipe</CardTitle>
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
            <CardContent className="flex justify-center items-center py-6 bg-white rounded-b-xl border-t border-slate-50">
              <div className="relative w-full max-w-full overflow-hidden aspect-[800/480] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center p-2 group">
                <div className="absolute top-4 right-4 flex flex-col gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEqZoom((z) => Math.min(3, z + 0.2))} className="bg-white w-8 h-8 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 font-bold flex items-center justify-center text-lg leading-none transition-colors">+</button>
                  <button onClick={() => setEqZoom((z) => Math.max(0.4, z - 0.2))} className="bg-white w-8 h-8 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 font-bold flex items-center justify-center text-lg leading-none transition-colors">-</button>
                  <button onClick={() => setEqZoom(1)} className="bg-white w-8 h-8 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-500 font-bold text-xs uppercase transition-colors">1x</button>
                </div>
                {packedEqBubbles.length === 0 ? (
                  <div className="text-slate-400 italic text-sm font-medium">
                    Nenhuma categoria encontrada.
                  </div>
                ) : (
                  <svg
                    viewBox={eqViewBox}
                    className="w-full h-full select-none"
                    style={{ transform: `scale(${eqZoom})`, transformOrigin: 'center', transition: 'transform 0.3s ease' }}
                  >
                    <style>{`
                      .bubble-text-contour {
                        paint-order: stroke;
                        stroke: rgba(15, 23, 42, 0.9);
                        stroke-width: 4px;
                        stroke-linejoin: round;
                      }
                      .bubble-container {
                        transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                        transform-origin: 0 0;
                      }
                      .bubble-container:hover {
                        transform: scale(1.15); /* bolha inflando */
                      }
                      .bubble-group {
                        transition: filter 0.4s ease;
                      }
                    `}</style>
                    <defs>
                      {packedEqBubbles.map((item, bIdx) => {
                        if (item.color) {
                          const safeColor = item.color.replace("#", "");
                          return (
                            <radialGradient
                              id={`eqBubbleGrad-custom-${bIdx}-${safeColor}`}
                              key={`custom-${bIdx}`}
                              cx="30%"
                              cy="30%"
                              r="70%"
                            >
                              <stop
                                offset="0%"
                                stopColor={item.color}
                                stopOpacity={0.85}
                              />
                              <stop
                                offset="100%"
                                stopColor={item.color}
                                stopOpacity={0.98}
                              />
                            </radialGradient>
                          );
                        }
                        return null;
                      })}
                      {eqColorGradients.map((grad, gIdx) => (
                        <radialGradient
                          id={`eqBubbleGrad-${gIdx}`}
                          key={gIdx}
                          cx="30%"
                          cy="30%"
                          r="70%"
                        >
                          <stop offset="0%" stopColor={grad.from} stopOpacity={0.98} />
                          <stop offset="100%" stopColor={grad.to} stopOpacity={0.95} />
                        </radialGradient>
                      ))}
                      <radialGradient id="eqBubbleGrad-neutral" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#475569" />
                      </radialGradient>
                    </defs>

                    {packedEqBubbles.map((item, idx) => {
                      const isSelected = selectedTypeFilter === item.name;
                      const hasActiveFilter = selectedTypeFilter !== null;
                      const isNeutral = item.name === "Sem Equipe";
                      const safeColor = item.color ? item.color.replace("#", "") : "";
                      const gradId = item.color ? `custom-${idx}-${safeColor}` : (isNeutral ? "neutral" : idx % eqColorGradients.length);
                      const sizeLabel =
                        eqTreemapMetric === "value"
                          ? `R$ ${(item.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `${item.count} equip.`;

                      return (
                        <g
                          key={idx}
                          transform={`translate(${item.x}, ${item.y})`}
                          onClick={() =>
                            setSelectedTypeFilter(isSelected ? null : item.name)
                          }
                          className="cursor-pointer bubble-group transition-all duration-300"
                        >
                          <g className="bubble-container">
                            <circle
                              r={item.r}
                              fill={`url(#eqBubbleGrad-${gradId})`}
                              className="transition-all duration-500 origin-center"
                              style={{
                                filter: isSelected
                                  ? "drop-shadow(0 16px 24px rgba(0,0,0,0.22))"
                                  : hasActiveFilter
                                  ? "opacity(0.35) drop-shadow(0 4px 6px rgba(0,0,0,0.02))"
                                  : "drop-shadow(0 10px 16px rgba(0,0,0,0.12))",
                              }}
                            />
                            <text
                              textAnchor="middle"
                              y={-5}
                              fill="#ffffff"
                              className="font-extrabold uppercase tracking-wider pointer-events-none select-none bubble-text-contour"
                              style={{
                                fontSize: Math.max(12, Math.min(22, item.r / 4)),
                              }}
                            >
                              {item.name.length > item.r / 3.8
                                ? `${item.name.slice(0, Math.floor(item.r / 3.8))}...`
                                : item.name}
                            </text>
                            <text
                              textAnchor="middle"
                              y={14}
                              fill="#ffffff"
                              className="font-black font-mono tracking-wider pointer-events-none select-none bubble-text-contour text-blue-300"
                              style={{
                                fontSize: Math.max(10, Math.min(15, item.r / 6)),
                              }}
                            >
                              {sizeLabel}
                            </text>
                            {item.r > 65 && (
                              <text
                                textAnchor="middle"
                                y={31}
                                fill="#ffffff"
                                className="font-extrabold opacity-95 pointer-events-none select-none bubble-text-contour text-slate-100"
                                style={{
                                  fontSize: Math.max(9, Math.min(13, item.r / 7.5)),
                                }}
                              >
                                {eqTreemapMetric === "value"
                                  ? `${item.count} equip.`
                                  : `R$ ${(item.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </text>
                            )}
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AnimatePresence for transitions */}
          <AnimatePresence mode="wait">
            {selectedTypeFilter && (
              <motion.div
                key={selectedTypeFilter}
                initial={{ opacity: 0, height: 0, y: 15 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <Card className="shadow-lg border-t-4 border-blue-600 bg-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-md font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping inline-block" />
                        Tipos de Equipamentos da Equipe:{" "}
                        <span className="text-blue-600 font-extrabold">
                          {selectedTypeFilter}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        Equipamentos quantificados por contagem ou valores de
                        custo mensal
                      </p>
                    </div>
                    <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 gap-0.5">
                      <button
                        onClick={() => setEqTreemapMetric("count")}
                        className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1.5 rounded-md transition-all ${eqTreemapMetric === "count" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-950"}`}
                      >
                        Quantidade
                      </button>
                      <button
                        onClick={() => setEqTreemapMetric("value")}
                        className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1.5 rounded-md transition-all ${eqTreemapMetric === "value" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-950"}`}
                      >
                        Valores
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={typeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(241, 245, 249, 0.5)" }}
                          contentStyle={{
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: any, name: any, props: any) => {
                            const val =
                              eqTreemapMetric === "count"
                                ? `${props.payload.count} equip.`
                                : `R$ ${(props.payload.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            return [val, props.payload.name];
                          }}
                        />
                        <Bar
                          dataKey="displayValue"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={40}
                          isAnimationActive={true}
                        >
                          {typeChartData.map((entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={
                                eqColorGradients[idx % eqColorGradients.length].from
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle>
                {selectedTypeFilter
                  ? `Equipamentos da Equipe: ${selectedTypeFilter}`
                  : "Todos os Equipamentos"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[600px]">
              {(() => {
                const handleSortEq = (col: string) => {
                  if (eqSortCol === col) {
                    setEqSortDir(eqSortDir === "asc" ? "desc" : "asc");
                  } else {
                    setEqSortCol(col);
                    setEqSortDir("asc");
                  }
                };

                const renderSortIconEq = (col: string) => {
                  if (eqSortCol !== col)
                    return <span className="text-slate-300 ml-1">↕</span>;
                  return eqSortDir === "asc" ? (
                    <span className="text-slate-850 font-bold ml-1">↑</span>
                  ) : (
                    <span className="text-slate-850 font-bold ml-1">↓</span>
                  );
                };

                const filtered = eqData.filter(
                  (item: any) =>
                    !selectedTypeFilter ||
                    (item.resolvedTeam || "Sem Equipe") === selectedTypeFilter,
                );

                const sortedList = [...filtered].sort((a: any, b: any) => {
                  let valA = "";
                  let valB = "";
                  if (eqSortCol === "name") {
                    valA = a.name || "";
                    valB = b.name || "";
                  } else if (eqSortCol === "type") {
                    valA = a.meta?.category || a.meta?.type || "Não Informado";
                    valB = b.meta?.category || b.meta?.type || "Não Informado";
                  } else if (eqSortCol === "value") {
                    const numA = a.value || 0;
                    const numB = b.value || 0;
                    return eqSortDir === "asc" ? numA - numB : numB - numA;
                  }
                  return (
                    valA.localeCompare(valB, "pt", { sensitivity: "base" }) *
                    (eqSortDir === "asc" ? 1 : -1)
                  );
                });

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-slate-50 font-bold"
                          onClick={() => handleSortEq("name")}
                        >
                          Nome {renderSortIconEq("name")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-slate-50 font-bold"
                          onClick={() => handleSortEq("type")}
                        >
                          Tipo {renderSortIconEq("type")}
                        </TableHead>
                        <TableHead className="font-bold">
                          Equipe
                        </TableHead>
                        <TableHead
                          className="text-right cursor-pointer select-none hover:bg-slate-50 font-bold"
                          onClick={() => handleSortEq("value")}
                        >
                          Custo Mensal {renderSortIconEq("value")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedList.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-8 text-slate-400 italic font-medium"
                          >
                            Nenhum equipamento encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedList.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold text-slate-900">
                              {item.name}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {item.meta?.category || item.meta?.type || "-"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold uppercase ${item.resolvedTeam && item.resolvedTeam !== "Sem Equipe" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}
                              >
                                {item.resolvedTeam || "Sem Equipe"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-800">
                              R$ {(item.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                );
              })()}
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
              {(() => {
                const handleSortRev = (col: string) => {
                  if (revSortCol === col) {
                    setRevSortDir(revSortDir === "asc" ? "desc" : "asc");
                  } else {
                    setRevSortCol(col);
                    setRevSortDir("asc");
                  }
                };

                const renderSortIconRev = (col: string) => {
                  if (revSortCol !== col)
                    return <span className="text-slate-300 ml-1">↕</span>;
                  return revSortDir === "asc" ? (
                    <span className="text-slate-850 font-bold ml-1">↑</span>
                  ) : (
                    <span className="text-slate-850 font-bold ml-1">↓</span>
                  );
                };

                const sortedList = [...revData].sort((a: any, b: any) => {
                  if (revSortCol === "name") {
                    const valA = a.name || "";
                    const valB = b.name || "";
                    return (
                      valA.localeCompare(valB, "pt", { sensitivity: "base" }) *
                      (revSortDir === "asc" ? 1 : -1)
                    );
                  } else {
                    const numA = a.value || 0;
                    const numB = b.value || 0;
                    return revSortDir === "asc" ? numA - numB : numB - numA;
                  }
                });

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-slate-50 font-bold"
                          onClick={() => handleSortRev("name")}
                        >
                          Contrato e Período {renderSortIconRev("name")}
                        </TableHead>
                        <TableHead
                          className="text-right cursor-pointer select-none hover:bg-slate-50 font-bold"
                          onClick={() => handleSortRev("value")}
                        >
                          Valor Medido {renderSortIconRev("value")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedList.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center py-8 text-slate-400 italic font-medium"
                          >
                            Nenhuma medição encontrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedList.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold text-slate-900">
                              {item.name}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-bold">
                              R$ {(item.value || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                );
              })()}
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

  if (activeView === "CurvaS") {
    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView("overview")}
            className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-2 py-0.5 rounded">
              Detalhamento Técnico
            </span>
            <h1 className="text-2xl font-black text-slate-800">
              Gestão Global - Avanço Físico (Curva-S)
            </h1>
          </div>
        </div>

        <Card className="shadow-lg border-t-4 border-blue-600">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 space-y-2 md:space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Avanço Físico do Cronograma por Grupo de Serviços
              </CardTitle>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-black">
                Gráfico acumulado comparando metas físico-financeiras x avanço
                real executado dos grupos
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Legend indicators */}
              <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-1 bg-slate-300 rounded-sm inline-block" />
                  <span>Planejado</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-3 h-1 bg-blue-500 rounded-sm inline-block" />
                  <span>Realizado</span>
                </div>
              </div>

              {/* Contract Selector inside S-curve Card if global selection is 'all' */}
              {selectedContractId === "all" ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Filtrar Contrato S-Curve:
                  </span>
                  <Select
                    value={activeSCurveContractId}
                    onValueChange={setSCurveContractId}
                  >
                    <SelectTrigger className="w-[200px] h-9">
                      <SelectValue placeholder="Selecione um contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.contractNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider font-mono">
                  Contrato:{" "}
                  {contracts?.find((c: any) => c.id === activeSCurveContractId)
                    ?.contractNumber || activeSCurveContractId}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {sCurveTimelineData.length === 0 ? (
              <div className="py-24 text-center bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-lg">
                    Nenhum Cronograma Técnico Ativo
                  </h4>
                  <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Não foi encontrado um cronograma técnico estruturado para o
                    contrato selecionado. Adicione metas na aba "Cronograma" na
                    Sala Técnica para gerar a Curva-S correspondente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Graphic container */}
                <div className="h-[380px] w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={sCurveTimelineData}
                      onClick={(state) => {
                        if (state && state.activeTooltipIndex !== undefined) {
                          setClickedMonthIndex(Number(state.activeTooltipIndex));
                        }
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#64748b",
                          fontSize: 11,
                          fontWeight: "bold",
                        }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                        tick={{
                          fill: "#64748b",
                          fontSize: 11,
                          fontWeight: "bold",
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(226, 232, 240, 0.4)" }}
                        formatter={(v: number, name: string) => [`${v}%`, name]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Planejado Acumulado (%)"
                        stroke="#94a3b8"
                        strokeWidth={2.5}
                        strokeDasharray="5 4"
                        dot={{
                          r: 4,
                          stroke: "#94a3b8",
                          strokeWidth: 2,
                          fill: "#fff",
                        }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Realizado Acumulado (%)"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{
                          r: 5,
                          stroke: "#2563eb",
                          strokeWidth: 2.5,
                          fill: "#fff",
                        }}
                        activeDot={{ r: 8 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>

                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm border border-slate-100 rounded-lg px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none select-none">
                    💡 Clique nos meses do gráfico para detalhar progresso de
                    serviços ou grupos correspondentes
                  </div>
                </div>

                {/* Detalhes do mês selecionado por GRUPO */}
                {(() => {
                  const activeMonthData =
                    clickedMonthIndex !== null
                      ? sCurveTimelineData[clickedMonthIndex]
                      : sCurveTimelineData[sCurveTimelineData.length - 1]; // defaults to last period

                  if (!activeMonthData) return null;

                  const deviation =
                    activeMonthData.actual - activeMonthData.planned;
                  const statusBadge = (() => {
                    if (deviation >= 2) {
                      return {
                        label: "Avançado",
                        class: "bg-green-100 text-green-700 border-green-200",
                        icon: CheckCircle2,
                      };
                    } else if (deviation < -4) {
                      return {
                        label: "Atrasado",
                        class: "bg-red-100 text-red-700 border-red-200",
                        icon: ShieldAlert,
                      };
                    } else {
                      return {
                        label: "No Cronograma",
                        class: "bg-blue-100 text-blue-700 border-blue-200",
                        icon: Clock,
                      };
                    }
                  })();

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-50 pb-3 gap-4">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-base uppercase tracking-tight flex items-center gap-1.5">
                            <ListTodo className="w-5 h-5 text-blue-500" />
                            Progresso Físico dos Grupos de Serviços no{" "}
                            {activeMonthData.periodName}
                          </h4>
                          <p className="text-xs text-slate-400">
                            Acompanhamento do cronograma acumulado comparando
                            metas de grupos planejadas x progresso executado
                            real
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 uppercase ${statusBadge.class}`}
                          >
                            <statusBadge.icon className="w-3.5 h-3.5" />
                            {statusBadge.label} (
                            {deviation >= 0
                              ? `+${deviation}%`
                              : `${deviation}%`}
                            )
                          </span>

                          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1 text-center font-mono text-xs">
                            <span className="text-[9px] text-slate-400 font-bold block uppercase">
                              Meta Global
                            </span>
                            <span className="font-bold text-slate-700">
                              {activeMonthData.planned}%
                            </span>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1 text-center font-mono text-xs">
                            <span className="text-[9px] text-blue-400 font-bold block uppercase">
                              Realizado
                            </span>
                            <span className="font-bold text-blue-600">
                              {activeMonthData.actual}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        {(() => {
                          const handleSortCurvaS = (col: string) => {
                            if (curvaSSortCol === col) {
                              setCurvaSSortDir(
                                curvaSSortDir === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setCurvaSSortCol(col);
                              setRevSortDir("asc"); // clean fallback
                              setCurvaSSortDir("asc");
                            }
                          };

                          const renderSortIconCurvaS = (col: string) => {
                            if (curvaSSortCol !== col)
                              return (
                                <span className="text-slate-300 ml-1">↕</span>
                              );
                            return curvaSSortDir === "asc" ? (
                              <span className="text-slate-800 font-bold ml-1">
                                ↑
                              </span>
                            ) : (
                              <span className="text-slate-800 font-bold ml-1">
                                ↓
                              </span>
                            );
                          };

                          const sortedGroups = [
                            ...(activeMonthData.groupsList || []),
                          ].sort((a: any, b: any) => {
                            if (curvaSSortCol === "name") {
                              const valA = a.name || "";
                              const valB = b.name || "";
                              return (
                                valA.localeCompare(valB, "pt", {
                                  sensitivity: "base",
                                }) * (curvaSSortDir === "asc" ? 1 : -1)
                              );
                            } else if (curvaSSortCol === "planned") {
                              const numA = a.planned || 0;
                              const numB = b.planned || 0;
                              return curvaSSortDir === "asc"
                                ? numA - numB
                                : numB - numA;
                            } else if (curvaSSortCol === "actual") {
                              const numA = a.actual || 0;
                              const numB = b.actual || 0;
                              return curvaSSortDir === "asc"
                                ? numA - numB
                                : numB - numA;
                            } else if (curvaSSortCol === "diff") {
                              const diffA = (a.actual || 0) - (a.planned || 0);
                              const diffB = (b.actual || 0) - (b.planned || 0);
                              return curvaSSortDir === "asc"
                                ? diffA - diffB
                                : diffB - diffA;
                            }
                            return 0;
                          });

                          return (
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50 border-none hover:bg-slate-50">
                                  <TableHead
                                    className="font-bold text-slate-600 uppercase cursor-pointer select-none hover:bg-slate-100"
                                    onClick={() => handleSortCurvaS("name")}
                                  >
                                    GRUPO DE SERVIÇO{" "}
                                    {renderSortIconCurvaS("name")}
                                  </TableHead>
                                  <TableHead
                                    className="font-bold text-slate-600 text-right uppercase cursor-pointer select-none hover:bg-slate-100"
                                    onClick={() => handleSortCurvaS("planned")}
                                  >
                                    META ACUMULADA{" "}
                                    {renderSortIconCurvaS("planned")}
                                  </TableHead>
                                  <TableHead
                                    className="font-bold text-slate-600 text-right uppercase cursor-pointer select-none hover:bg-slate-100"
                                    onClick={() => handleSortCurvaS("actual")}
                                  >
                                    REALIZADO ACUMULADO{" "}
                                    {renderSortIconCurvaS("actual")}
                                  </TableHead>
                                  <TableHead
                                    className="font-bold text-slate-600 text-right w-56 uppercase cursor-pointer select-none hover:bg-slate-100"
                                    onClick={() => handleSortCurvaS("diff")}
                                  >
                                    AVALIAÇÃO DE AVANÇO{" "}
                                    {renderSortIconCurvaS("diff")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortedGroups.length === 0 ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={4}
                                      className="text-center py-8 text-slate-400 italic font-medium"
                                    >
                                      Nenhum grupo de serviço encontrado.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  sortedGroups.map((item: any) => {
                                    const diff = item.actual - item.planned;
                                    const isAhead = diff >= 0;
                                    return (
                                      <TableRow
                                        key={item.groupId}
                                        className="border-slate-50 hover:bg-slate-50/50"
                                      >
                                        <TableCell className="font-bold text-slate-700 text-xs uppercase max-w-[325px] truncate">
                                          {item.name}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-slate-600 font-bold">
                                          {item.planned}%
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-blue-600 font-bold">
                                          {item.actual}%
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="space-y-1">
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                                              <div
                                                className="absolute left-0 top-0 h-full bg-slate-300 rounded-full"
                                                style={{
                                                  width: `${item.planned}%`,
                                                }}
                                              />
                                              <div
                                                className="absolute left-0 top-0 h-full bg-blue-500 rounded-full shadow-inner"
                                                style={{
                                                  width: `${item.actual}%`,
                                                }}
                                              />
                                            </div>
                                            <span
                                              className={`text-[10px] font-mono font-bold uppercase leading-none block ${isAhead ? "text-green-600" : "text-red-500"}`}
                                            >
                                              {diff >= 0
                                                ? `Adiantado (+${diff}%)`
                                                : `Atrasado (${diff}%)`}
                                            </span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}
                              </TableBody>
                            </Table>
                          );
                        })()}
                      </div>
                    </motion.div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeCustomDetail) {
    return renderCustomDetail(activeCustomDetail);
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão Global</h1>
        <button
          onClick={() => {
            setNewCardMaterial('');
            setNewCardType('Material');
            setIsAddCardOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Card
        </button>
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

        {customCards.map((card: any) => {
          let title = '';
          let valueStr = '';
          let secondaryStr = '';
          let color = '#3b82f6';

          if (card.type === 'Material') {
            const props = getMaterialCardProps(card.materialName || '');
            title = props.title;
            valueStr = props.valueStr;
            secondaryStr = props.secondaryStr;
            color = props.color;
          } else if (card.type === 'Equipamentos') {
            const props = getEquipmentCardProps(card.equipmentType || 'ambos');
            title = props.title;
            valueStr = props.valueStr;
            secondaryStr = props.secondaryStr;
            color = props.color;
          } else if (card.type === 'Serviços') {
            const props = getServicesCardProps();
            title = props.title;
            valueStr = props.valueStr;
            secondaryStr = props.secondaryStr;
            color = props.color;
          }

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="relative group cursor-pointer"
              onClick={() => setActiveCustomDetail(card)}
            >
              <Card
                className="shadow-lg hover:shadow-xl transition-shadow border-t-4 bg-white"
                style={{ borderTopColor: color }}
              >
                <CardHeader className="flex flex-row justify-between items-start pb-2">
                  <CardTitle className="text-xs uppercase text-slate-400 font-bold tracking-wider max-w-[80%] line-clamp-2">
                    {title}
                  </CardTitle>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCard(card.id);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer pointer-events-auto"
                    title="Excluir Painel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-2xl font-black tracking-tight font-black"
                    style={{ color: color }}
                  >
                    {valueStr}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">
                    {secondaryStr}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Adicionar Painel Personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="card-type" className="font-bold text-slate-700">Qual informação deseja adicionar?</Label>
              <Select value={newCardType} onValueChange={(val: any) => setNewCardType(val)}>
                <SelectTrigger id="card-type" className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Material">Material (Compras e Evolução)</SelectItem>
                  <SelectItem value="Equipamentos">Equipamentos (Custos de Repasse)</SelectItem>
                  <SelectItem value="Serviços">Serviços (Classe A Rentabilidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newCardType === 'Material' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="material-select" className="font-bold text-slate-700">Material de Interesse</Label>
                  <div className="relative">
                    <input
                      type="text"
                      id="material-select"
                      placeholder="Digite para filtrar materiais..."
                      value={newCardMaterial}
                      autoComplete="off"
                      onChange={(e) => setNewCardMaterial(e.target.value)}
                      className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {newCardMaterial && (
                      <div className="absolute z-50 left-0 right-0 max-h-40 overflow-y-auto bg-white border border-slate-200 shadow-lg rounded-md mt-1">
                        {uniqueMaterials
                          .filter(m => m.toLowerCase().includes(newCardMaterial.toLowerCase()))
                          .slice(0, 10)
                          .map((m, idx) => (
                            <div
                              key={idx}
                              onClick={() => setNewCardMaterial(m)}
                              className="p-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 font-medium"
                            >
                              {m}
                            </div>
                          ))
                        }
                        {uniqueMaterials.filter(m => m.toLowerCase().includes(newCardMaterial.toLowerCase())).length === 0 && (
                          <div className="p-2 text-xs text-slate-400 italic">Nenhum material correspondente.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {newCardType === 'Equipamentos' && (
              <div className="space-y-2">
                <Label htmlFor="eq-type-select" className="font-bold text-slate-700">Origem dos Equipamentos</Label>
                <Select value={newCardEqType} onValueChange={(val: any) => setNewCardEqType(val)}>
                  <SelectTrigger id="eq-type-select" className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="alugado">Alugados</SelectItem>
                    <SelectItem value="proprio">Próprios</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {newCardType === 'Serviços' && (
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-xs leading-relaxed text-emerald-800 font-medium">
                Este card exibirá de forma consolidada os itens **Classe A** mais rentáveis de sua curva ABC de Serviços.
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={() => setIsAddCardOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors pointer-events-auto cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddCard}
              disabled={newCardType === 'Material' && !newCardMaterial}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold shadow-sm transition-colors cursor-pointer pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PREVIEW DA CURVA-S COMPARATIVA */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="cursor-pointer"
        onClick={() => setActiveView("CurvaS")}
      >
        <Card className="shadow-lg border-t-4 border-blue-600 hover:shadow-xl transition-shadow bg-white">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 space-y-2 md:space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Curva-S Comparativa (Evolução Física do Contrato)
              </CardTitle>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-black">
                Acompanhamento físico de metas x executado real por grupo de
                serviços — Clique para detalhamento completo ↗
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sCurveTimelineData.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 border border-slate-100 rounded-xl space-y-2 animate-pulse">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Nenhum Cronograma Técnico Ativo
                </h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Adicione metas físicas e financeiras na Sala Técnica para
                  gerar a Curva-S.
                </p>
              </div>
            ) : (
              (() => {
                const lastPeriod =
                  sCurveTimelineData[sCurveTimelineData.length - 1];
                const deviation = lastPeriod.actual - lastPeriod.planned;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="col-span-1 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-400 font-black tracking-wider block">
                        Último Período Acumulado
                      </span>
                      <div className="text-3xl font-extrabold text-blue-600 font-mono">
                        {lastPeriod.actual}%{" "}
                        <span className="text-xs font-bold text-slate-400 font-sans uppercase">
                          Realizado
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-600">
                        Desvio:{" "}
                        <span
                          className={
                            deviation >= 0 ? "text-green-600" : "text-red-500"
                          }
                        >
                          {deviation >= 0 ? `+${deviation}%` : `${deviation}%`}
                        </span>{" "}
                        (Meta: {lastPeriod.planned}%)
                      </div>
                    </div>

                    <div className="col-span-2 h-[100px] w-full bg-slate-50/20 rounded-xl border border-dashed border-slate-200 flex items-center justify-center p-2 relative overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={sCurveTimelineData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                          />
                          <XAxis dataKey="name" hide />
                          <YAxis hide />
                          <Line
                            type="monotone"
                            dataKey="Planejado Acumulado (%)"
                            stroke="#94a3b8"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="Realizado Acumulado (%)"
                            stroke="#2563eb"
                            strokeWidth={2.5}
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent pointer-events-none" />
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </motion.div>

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
