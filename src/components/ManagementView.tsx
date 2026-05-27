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
}: any) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={activeCategorias}
          cx="50%"
          cy="50%"
          innerRadius={110}
          outerRadius={160}
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
                strokeWidth={isHovered ? 4 : 0}
                style={{
                  filter: isHovered
                    ? `drop-shadow(0px 0px 8px ${COLORS[index % COLORS.length]})`
                    : "none",
                  transition: "all 0.3s ease",
                }}
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
        <Legend wrapperStyle={{ paddingTop: "20px" }} />
      </PieChart>
    </ResponsiveContainer>
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
  const [selectedAporteCategorias, setSelectedAporteCategorias] = useState<
    Record<string, boolean>
  >({});
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

  const activeCategorias = useMemo(() => {
    return stats.aporteCategorias.filter(
      (c: any) => selectedAporteCategorias[c.name] !== false,
    );
  }, [stats.aporteCategorias, selectedAporteCategorias]);

  const allAporteItems = useMemo(() => {
    let items: any[] = [];
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
          items.push({
            ...i,
            aporteNumero: a.numero,
            aporteData: a.data,
          });
        });
      });
    return items;
  }, [aportes, currentUser, selectedContractId]);

  const [itemsSortConfig, setItemsSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const renderItemsSortIndicator = (key: string) => {
    if (!itemsSortConfig || itemsSortConfig.key !== key) {
      return <span className="text-slate-300 ml-1 text-xs">↕</span>;
    }
    return itemsSortConfig.direction === "asc" ? (
      <span className="text-red-600 ml-1 text-xs">▲</span>
    ) : (
      <span className="text-red-600 ml-1 text-xs">▼</span>
    );
  };

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

  const filteredAporteItems = useMemo(() => {
    let items = allAporteItems.filter((i) => {
      const cat = i.categoria || "Sem Categoria";
      if (selectedAporteCategorias[cat] === false) return false;
      if (selectedTypeFilter && selectedTypeFilter !== cat) return false;
      return true;
    });

    if (itemsSortConfig !== null) {
      items.sort((a, b) => {
        let valA = a[itemsSortConfig.key] || "";
        let valB = b[itemsSortConfig.key] || "";
        if (valA < valB) return itemsSortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return itemsSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [
    allAporteItems,
    selectedAporteCategorias,
    selectedTypeFilter,
    itemsSortConfig,
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
    const aporteData = stats.details["Aporte Financeiro"] || [];

    // For the pie chart
    // (activeCategorias uses stats.aporteCategorias)

    // For the table, we want to show items or aportes
    // Let's gather all items to allow detailed filtering

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

    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveView("overview");
              setSelectedTypeFilter(null);
            }}
            className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold">
            Gestão Global - Dashboard de Aportes
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Panes */}
          <div className="col-span-1 space-y-6">
            <Card className="shadow-lg border-t-4 border-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase text-slate-500 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Total Aportado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  R$ {stats.aporte.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase text-slate-500 flex items-center gap-2">
                  Filtro por Categorias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.aporteCategorias.map((cat, idx) => {
                    const isChecked =
                      selectedAporteCategorias[cat.name] !== false;
                    const isSelectedInChart = selectedTypeFilter === cat.name;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${isSelectedInChart ? "bg-red-50 ring-1 ring-red-200" : "hover:bg-slate-50"}`}
                      >
                        <label
                          className="flex items-center gap-2 cursor-pointer flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategoria(cat.name);
                          }}
                        >
                          <input
                            type="checkbox"
                            className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                            checked={isChecked}
                            onChange={() => {}} // handled by div
                          />
                          <span
                            className="text-sm font-medium text-slate-700 truncate"
                            title={cat.name}
                          >
                            {cat.name}
                          </span>
                        </label>
                        <span className="text-xs font-bold text-slate-500">
                          R$ {(cat.value || 0).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                  {selectedTypeFilter && (
                    <button
                      onClick={() => setSelectedTypeFilter(null)}
                      className="text-xs text-red-600 hover:underline mt-2 w-full text-left"
                    >
                      Limpar seleção do gráfico
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Area */}
          <div className="col-span-1 md:col-span-3 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Composição de Aportes por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[450px] w-full">
                  {activeCategorias.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      Nenhuma categoria selecionada
                    </div>
                  ) : (
                    <AportePieChart
                      activeCategorias={activeCategorias}
                      selectedTypeFilter={selectedTypeFilter}
                      setSelectedTypeFilter={setSelectedTypeFilter}
                      COLORS={COLORS}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg min-h-[300px]">
              <CardHeader>
                <CardTitle>
                  Detalhamento dos Itens ({filteredAporteItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                            className="text-center text-slate-500 py-6"
                          >
                            Nenhum item encontrado para os filtros atuais.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAporteItems.map((item: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-slate-50">
                            <TableCell className="font-medium whitespace-nowrap">
                              {item.aporteNumero}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {item.aporteData
                                ? new Date(item.aporteData).toLocaleDateString(
                                    "pt-BR",
                                    { timeZone: "UTC" },
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell>{item.categoria || "-"}</TableCell>
                            <TableCell>{item.fornecedor || "-"}</TableCell>
                            <TableCell
                              className="max-w-[200px] truncate"
                              title={item.descricao}
                            >
                              {item.descricao || "-"}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-bold whitespace-nowrap">
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
          </div>
        </div>
      </div>
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
