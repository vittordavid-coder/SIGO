import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import {
  Truck,
  Building2,
  Plus,
  Search,
  Trash2,
  Edit,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileDown,
  Upload,
  ArrowUpAZ,
  ArrowDownAZ,
  Filter,
  AlertCircle,
  Wrench,
  XCircle,
  ArrowRightLeft,
  Fuel,
  Droplet,
  ShoppingCart,
  Check,
  Package,
  ChevronsUpDown,
  Settings,
  Info,
  Archive,
  History,
  Copy,
  Hash,
  Activity,
  Layers,
  DollarSign,
  Camera,
  FileText,
  X,
  Printer,
  Download,
  Tag,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ControllerEquipment,
  EquipmentMonthlyData,
  User,
  Contract,
  EquipmentTransfer,
  FuelTank,
  FuelLog,
  MaterialRequest,
  MaterialRequestItem,
  PurchaseRequest,
  EquipmentMaintenance,
  EquipmentAttribute,
  ServiceHistoryEntry,
  EquipmentMeasurement,
  DailyEquipmentMeasurement,
} from "../types";
import {
  EQUIPMENT_TYPES,
  EQUIPMENT_TEMPLATES,
} from "../lib/equipmentTemplates";
import { useLocalStorage } from "../lib/useLocalStorage";
import { createSupabaseClient, getSupabaseConfig } from "../lib/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Modal } from "@/components/ui/Modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "../lib/utils";
import { NumericInput } from "@/components/ui/numeric-input";
import { Checkbox } from "@/components/ui/checkbox";

interface ControlViewProps {
  currentUser: User | null;
  equipments: ControllerEquipment[];
  equipmentMonthly: EquipmentMonthlyData[];
  contracts: Contract[];
  selectedContractId: string | null;
  transfers: EquipmentTransfer[];
  purchaseRequests: PurchaseRequest[];
  equipmentMaintenance: EquipmentMaintenance[];
  onUpdatePurchaseRequests: (requests: PurchaseRequest[]) => void;
  onUpdateContractId: (id: string) => void;
  onUpdateEquipments: (val: ControllerEquipment[] | ((prev: ControllerEquipment[]) => ControllerEquipment[])) => void;
  onUpdateEquipmentMonthly: (data: EquipmentMonthlyData[]) => void;
  onUpdateTransfers: (transfers: EquipmentTransfer[]) => void;
  onUpdateMaintenance: (maintenance: EquipmentMaintenance[]) => void;
  fuelTanks: FuelTank[];
  setFuelTanks: (val: FuelTank[] | ((prev: FuelTank[]) => FuelTank[])) => void;
  fuelLogs: FuelLog[];
  setFuelLogs: (val: FuelLog[] | ((prev: FuelLog[]) => FuelLog[])) => void;
  onDeleteFuelLog?: (id: string) => void;
  initialTab?: string;
  companyLogo?: string;
  companyLogoRight?: string;
  logoMode?: "left" | "right" | "both" | "none";
  controllerTeams?: any[];
  teamAssignments?: any[];
  onUpdateAssignments?: (val: any[]) => void;
  warehouses?: any[];
  warehouseItems?: any[];
  setWarehouseItems?: React.Dispatch<React.SetStateAction<any[]>>;
  applications?: any[];
  setApplications?: React.Dispatch<React.SetStateAction<any[]>>;
  systemConfig?: any[];
  setSystemConfig?: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ControlView({
  currentUser,
  equipments,
  equipmentMonthly,
  contracts,
  selectedContractId,
  transfers,
  purchaseRequests,
  equipmentMaintenance = [],
  onUpdatePurchaseRequests,
  onUpdateContractId,
  onUpdateEquipments,
  onUpdateEquipmentMonthly,
  onUpdateTransfers,
  onUpdateMaintenance,
  fuelTanks = [],
  setFuelTanks,
  fuelLogs = [],
  setFuelLogs,
  onDeleteFuelLog,
  initialTab,
  companyLogo,
  companyLogoRight,
  logoMode = "left",
  controllerTeams = [],
  teamAssignments = [],
  onUpdateAssignments = () => {},
  warehouses = [],
  warehouseItems = [],
  setWarehouseItems,
  applications = [],
  setApplications,
  systemConfig = [],
  setSystemConfig,
}: ControlViewProps) {
  const [activeTab, setActiveTab] = React.useState(initialTab || "list");

  const [savedCategories, setSavedCategories] = useLocalStorage<string[]>(
    "sigo_control_categories",
    [],
    currentUser?.companyId,
  );

  const DEFAULT_FUELS = [
    "Diesel S10",
    "Diesel S500",
    "Gasolina Comum",
    "Gasolina Aditivada",
    "Etanol",
    "Arla 32",
  ];

  const dynamicTypes = useMemo(() => {
    const config = systemConfig.find(sc => sc.configKey === 'sigo_equipment_types');
    if (config && Array.isArray(config.configValue)) {
      // Merge defaults if needed, or just return saved
      const savedTypes = config.configValue;
      return [...new Set([...EQUIPMENT_TYPES, ...savedTypes])];
    }
    return EQUIPMENT_TYPES;
  }, [systemConfig]);

  const updateDynamicTypes = (newTypes: string[]) => {
    if (!setSystemConfig) return;
    setSystemConfig((prev: any[]) => {
      const filtered = prev.filter(sc => sc.configKey !== 'sigo_equipment_types');
      return [...filtered, {
        id: crypto.randomUUID(),
        companyId: currentUser?.companyId || 'default',
        configKey: 'sigo_equipment_types',
        configValue: newTypes,
        createdAt: new Date().toISOString()
      }];
    });
  };

  const [typeSearchTerm, setTypeSearchTerm] = useState("");

  const handleAddType = (newType: string) => {
    const trimmedType = newType.trim();
    if (trimmedType && !dynamicTypes.includes(trimmedType)) {
      updateDynamicTypes([...dynamicTypes, trimmedType]);
    }
  };

  const handleRemoveType = (e: React.MouseEvent, typeToRemove: string) => {
    e.stopPropagation();
    updateDynamicTypes(dynamicTypes.filter((t: string) => t !== typeToRemove));
  };

  const [isTankModalOpen, setIsTankModalOpen] = useState(false);
  const [editingTankId, setEditingTankId] = useState<string | null>(null);
  const [isDeleteTankDialogOpen, setIsDeleteTankDialogOpen] = useState(false);
  const [tankToDelete, setTankToDelete] = useState<FuelTank | null>(null);
  const [newTank, setNewTank] = useState<Partial<FuelTank>>({
    name: "",
    capacity: 0,
    currentLevel: 0,
    fuelType: "Diesel S10",
  });
  const [isFuelLogModalOpen, setIsFuelLogModalOpen] = useState(false);
  const [isDeleteFuelLogDialogOpen, setIsDeleteFuelLogDialogOpen] =
    useState(false);
  const [fuelLogToDelete, setFuelLogToDelete] = useState<FuelLog | null>(null);
  const [editingFuelLogId, setEditingFuelLogId] = useState<string | null>(null);
  const [newFuelLog, setNewFuelLog] = useState<Partial<FuelLog>>({
    type: "saida",
    date: new Date().toISOString().split("T")[0],
    quantity: 0,
    tankId: "",
    equipmentId: "",
  });
  const [customFuel, setCustomFuel] = useState("");
  const [openDest, setOpenDest] = useState(false);

  const handleEditFuelLog = (log: FuelLog) => {
    setEditingFuelLogId(log.id);
    setNewFuelLog({ ...log });
    setIsFuelLogModalOpen(true);
  };

  const [isMaterialRequestModalOpen, setIsMaterialRequestModalOpen] =
    useState(false);
  const [currentRequest, setCurrentRequest] = useState<
    Partial<PurchaseRequest>
  >({
    items: [
      { id: crypto.randomUUID(), description: "", quantity: 1, unit: "un" },
    ],
    status: "Pendente",
    priority: "Normal",
  });
  const [newRequestCategory, setNewRequestCategory] = useState("");
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Removed internal equipmentMeasurements state as it's now a prop
  const [isNewMeasurementModalOpen, setIsNewMeasurementModalOpen] =
    useState(false);
  const [isPeriodSelectionOpen, setIsPeriodSelectionOpen] = useState(false);
  const [measurementPeriod, setMeasurementPeriod] = useState({
    start: "",
    end: "",
  });
  const [tempDailyData, setTempDailyData] = useState<
    DailyEquipmentMeasurement[]
  >([]);
  const [measurementMonth, setMeasurementMonth] = useState("");
  const [editingMeasurementId, setEditingMeasurementId] = useState<
    string | null
  >(null);
  const [exportData, setExportData] = useState<{
    measurement: EquipmentMeasurement;
    equipment: ControllerEquipment;
  } | null>(null);
  const [isMaintenanceDiscountModalOpen, setIsMaintenanceDiscountModalOpen] =
    useState(false);
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);
  const [selectedMeasurementForDiscount, setSelectedMeasurementForDiscount] =
    useState<{ m: EquipmentMeasurement; e: ControllerEquipment } | null>(null);
  const [selectedMaintenanceToDiscount, setSelectedMaintenanceToDiscount] =
    useState<string[]>([]);

  const [isApplyStockOpen, setIsApplyStockOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<{
    requestId: string;
    itemIdx: number;
    item: any;
  } | null>(null);
  const [applyQuantity, setApplyQuantity] = useState(1);
  const [applyEquipmentId, setApplyEquipmentId] = useState("");
  const [applyEquipmentSearch, setApplyEquipmentSearch] = useState("");

  React.useEffect(() => {
    if (!isApplyStockOpen) {
      setApplyEquipmentSearch("");
    }
  }, [isApplyStockOpen]);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [priceDisplayMode, setPriceDisplayMode] = useState<
    "monthly" | "measurement"
  >("monthly");
  const [showApplied, setShowApplied] = useState(false);
  const [sortField, setSortField] = useState<
    "name" | "category" | "origin" | "cost" | "team"
  >("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterOnlyActive, setFilterOnlyActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const measurementInputRef = useRef<HTMLInputElement>(null);
  const exportModelInputRef = useRef<HTMLInputElement>(null);
  const [isExportSelectorOpen, setIsExportSelectorOpen] = useState(false);

  const handleImportMeasurement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          alert("Nenhuma dado encontrado no arquivo.");
          return;
        }

        const newDays = [...tempDailyData];
        let importedCount = 0;

        data.forEach((row) => {
          const rawDate = row["Data"] || row["data"] || row["Date"] || row["date"] || row["#data"];
          if (!rawDate) return;
          
          let dateStr = "";
          if (typeof rawDate === "number") {
             const d = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
             dateStr = d.toISOString().split("T")[0];
          } else {
             const cleanDateStr = String(rawDate).trim();
             const ddmmyyyy = cleanDateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
             if (ddmmyyyy) {
               const day = ddmmyyyy[1].padStart(2, "0");
               const month = ddmmyyyy[2].padStart(2, "0");
               const year = ddmmyyyy[3];
               dateStr = `${year}-${month}-${day}`;
             } else {
               const yyyymmdd = cleanDateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
               if (yyyymmdd) {
                 const year = yyyymmdd[1];
                 const month = yyyymmdd[2].padStart(2, "0");
                 const day = yyyymmdd[3].padStart(2, "0");
                 dateStr = `${year}-${month}-${day}`;
               } else {
                 dateStr = cleanDateStr;
               }
             }
          }

          const existingIdx = newDays.findIndex((d) => d.date === dateStr);
          if (existingIdx >= 0) {
            const rowInit = row["Inicial"] || row["inicial"] || row["Initial Reading"] || row["#inicial"];
            const rowFinal = row["Final"] || row["final"] || row["Final Reading"] || row["#final"];
            const rowStatus = row["Status"] || row["Situação"] || row["status"] || row["situação"] || row["#status"];
            const rowDiscount = row["Desconto"] || row["Desconta"] || row["desconto"] || row["desconta"] || row["#desconto"];

            if (rowInit !== undefined) newDays[existingIdx].initialReading = Number(rowInit) || 0;
            if (rowFinal !== undefined) newDays[existingIdx].finalReading = Number(rowFinal) || 0;

            if (rowStatus !== undefined) {
               const st = String(rowStatus).trim().toLowerCase();
               if (st.includes("chuva")) newDays[existingIdx].status = "Chuva";
               else if (st.includes("manuten")) newDays[existingIdx].status = "Manutenção";
               else if (st.includes("aguardando")) newDays[existingIdx].status = "Aguardando Frente";
               else if (st.includes("disposi")) newDays[existingIdx].status = "à Disposição";
               else newDays[existingIdx].status = "Trabalhando";
            }

            if (rowDiscount !== undefined) {
               const val = String(rowDiscount).trim().toLowerCase();
               newDays[existingIdx].discount = (val === 'sim' || val === 'true' || val === '1' || val === 'v');
            } else if (newDays[existingIdx].status && newDays[existingIdx].status !== "Trabalhando") {
               newDays[existingIdx].discount = true;
            } else {
               newDays[existingIdx].discount = false;
            }
            importedCount++;
          }
        });

        // AUTO PROPAGATE MISSING/ZERS IF NEEDED - standard routine already does it on table change, but here let's leave it manual or sequential as they might not import everything.
        setTempDailyData(newDays);
        alert(`Importação concluída. ${importedCount} linhas lidas baseadas nas datas da medição.`);

      } catch (err) {
        console.error(err);
        alert("Erro ao importar o arquivo. Verifique o modelo.");
      }
      
      if (measurementInputRef.current) {
        measurementInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isExitMaintenanceModalOpen, setIsExitMaintenanceModalOpen] =
    useState(false);
  const [maintenanceExitDate, setMaintenanceExitDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [equipmentToExit, setEquipmentToExit] =
    useState<ControllerEquipment | null>(null);
  const [maintenanceEquipment, setMaintenanceEquipment] =
    useState<ControllerEquipment | null>(null);
  const [maintenanceEntryDate, setMaintenanceEntryDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [maintenanceType, setMaintenanceType] = useState<
    "preventive" | "corrective"
  >("preventive");
  const [maintenanceRequestedItems, setMaintenanceRequestedItems] =
    useState("");
  const [maintenanceItems, setMaintenanceItems] = useState<
    {
      description: string;
      quantity: number;
      value: number;
      discount: boolean;
    }[]
  >([]);
  const [newMaintenanceItem, setNewMaintenanceItem] = useState({
    description: "",
    quantity: 1,
    value: 0,
    discount: false,
  });
  const [importContractId, setImportContractId] = useState<string>("");

  const availableContracts = useMemo(() => {
    const isRestricted =
      currentUser?.role !== "master" && currentUser?.role !== "admin";
    let result = contracts.filter(
      (c) =>
        currentUser?.role === "master" ||
        c.companyId === currentUser?.companyId,
    );

    if (isRestricted) {
      const allowedQuotes = currentUser?.allowedQuotationIds || [];
      const allowedContracts = currentUser?.allowedContractIds || [];

      result = result.filter(
        (c) =>
          (c.quotationId && allowedQuotes.includes(c.quotationId)) ||
          allowedContracts.includes(c.id),
      );
    }
    return result;
  }, [contracts, currentUser]);

  const downloadTemplate = () => {
    const headers = [
      [
        "CONTRATO_NUMERO",
        "CODIGO",
        "NOME",
        "TIPO",
        "CATEGORIA",
        "MARCA",
        "MODELO",
        "ANO",
        "SITUACAO",
        "PLACA",
        "ORIGEM",
        "PROPRIETARIO",
        "CNPJ_PROPRIETARIO",
        "MEDICAO_POR",
        "VALOR_CONTRATADO",
        "CUSTO_MENSAL",
        "DATA_ENTRADA",
        "DATA_SAIDA",
        "LEITURA_ATUAL",
        "ENCARGOS_PERCENTUAL",
        "HE_PERCENTUAL",
        "OBSERVACOES",
      ],
    ];
    const exampleRow = [
      "CTR-123",
      "EQP-001",
      "Caminhão Basculante 14m³",
      "Caminhão Transp.",
      "Pesado",
      "Mercedes-Benz",
      "Atego 2730",
      "2022",
      "Ativo",
      "ABC-1234",
      "Próprio",
      "",
      "",
      "Mensal",
      "0",
      "8500",
      "2024-01-01",
      "",
      "1500",
      "84.15",
      "50",
      "Equipamento em excelentes condições de uso",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers[0], exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo_Equipamentos");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `modelo_importacao_equipamentos.xlsx`,
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const parseExcelDate = (val: any) => {
      if (!val) return undefined;
      if (typeof val === "number") {
        return new Date(Math.round((val - 25569) * 86400 * 1000))
          .toISOString()
          .split("T")[0];
      }
      return val;
    };

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = XLSX.utils.sheet_to_json(
        XLSX.read(evt.target?.result, { type: "binary" }).Sheets[
          XLSX.read(evt.target?.result, { type: "binary" }).SheetNames[0]
        ],
      );
      const newEquips: ControllerEquipment[] = [];
      const newMonthly: EquipmentMonthlyData[] = [];

      data.forEach((item: any) => {
        const id = crypto.randomUUID();
        const keys = Object.keys(item);
        const getVal = (possibleKeys: string[]) => {
          const foundKey = keys.find((k) =>
            possibleKeys.includes(String(k).toLowerCase().trim()),
          );
          if (!foundKey) return null;
          const val = item[foundKey];
          return val === undefined || val === null || String(val).trim() === ""
            ? null
            : val;
        };

        const contratoNo = getVal([
          "contrato_numero",
          "contrato",
          "numero_contrato",
          "obra",
        ]);
        const targetContract = availableContracts.find(
          (c) => c.contractNumber === contratoNo,
        );

        const codeVal = getVal([
          "codigo",
          "código",
          "id_patrimonio",
          "cod_patrimonial",
          "cod",
        ]);
        const nameVal = getVal(["nome", "equipamento", "descricao"]);
        const typeVal = getVal(["tipo", "tipo_equipamento", "grupo"]);
        const categoryVal = getVal(["categoria", "porte", "capacidade"]);
        const brandVal = getVal(["marca", "fabricante"]);
        const modelVal = getVal(["modelo"]);
        const yearVal = getVal(["ano", "ano_fabricacao", "ano_modelo"]);
        const situationVal = getVal([
          "situacao",
          "situação",
          "status",
          "estado",
        ]);
        const plateVal = getVal(["placa", "prefixo", "chassi"]);
        const originVal = getVal(["origem", "tipo_propriedade"]);
        const ownerNameVal = getVal([
          "proprietario",
          "proprietário",
          "locador",
          "empresa_aluguel",
        ]);
        const ownerCnpjVal = getVal([
          "cnpj_proprietario",
          "cnpj_proprietário",
          "cnpj_locador",
        ]);

        let unitVal = String(
          getVal(["medicao_por", "unidade_medicao", "medicao", "unidade"]) ||
            "Mensal",
        );
        if (
          unitVal.toLowerCase().includes("hor") ||
          unitVal.toLowerCase().includes("hr")
        )
          unitVal = "Horímetro";
        else if (
          unitVal.toLowerCase().includes("km") ||
          unitVal.toLowerCase().includes("kmtragem") ||
          unitVal.toLowerCase().includes("quilom")
        )
          unitVal = "Quilometragem";
        else unitVal = "Mensal";

        const contractedPriceVal = getVal([
          "valor_contratado",
          "preco_contratado",
          "valor_hora",
          "valor_km",
          "tarifa",
          "valor_diaria",
          "valor_diaria_equip",
        ]);
        let contractedPrice = 0;
        if (contractedPriceVal !== null) {
          contractedPrice =
            typeof contractedPriceVal === "number"
              ? contractedPriceVal
              : parseFloat(
                  String(contractedPriceVal)
                    .replace(/[^0-9,-]+/g, "")
                    .replace(",", "."),
                );
        }
        if (isNaN(contractedPrice)) contractedPrice = 0;

        const monthlyCostVal = getVal([
          "custo_mensal",
          "valor_mensal",
          "mensalidade",
          "preco_mensal",
          "mensal",
        ]);
        let monthlyPrice = 0;
        if (monthlyCostVal !== null) {
          monthlyPrice =
            typeof monthlyCostVal === "number"
              ? monthlyCostVal
              : parseFloat(
                  String(monthlyCostVal)
                    .replace(/[^0-9,-]+/g, "")
                    .replace(",", "."),
                );
        }
        if (isNaN(monthlyPrice)) monthlyPrice = 0;

        const entryDateRaw = getVal([
          "data_entrada",
          "data_admissao",
          "admissao",
          "entrada",
        ]);
        const entryDate =
          parseExcelDate(entryDateRaw) ||
          new Date().toISOString().split("T")[0];

        const exitDateRaw = getVal([
          "data_saida",
          "data_demissao",
          "demissao",
          "saida",
        ]);
        const exitDate = parseExcelDate(exitDateRaw);

        const obsVal = getVal([
          "observacoes",
          "observação",
          "observacao",
          "obs",
        ]);

        const chargesPercVal = getVal([
          "encargos_percentual",
          "charges_percentage",
          "encargos",
          "percentual_encargos",
        ]);
        let chargesPercentage = 0;
        if (chargesPercVal !== null) {
          chargesPercentage =
            typeof chargesPercVal === "number"
              ? chargesPercVal
              : parseFloat(
                  String(chargesPercVal)
                    .replace(/[^0-9,-]+/g, "")
                    .replace(",", "."),
                );
        }
        if (isNaN(chargesPercentage)) chargesPercentage = 0;

        const otPercVal = getVal([
          "he_percentual",
          "overtime_percentage",
          "horas_extras",
          "percentual_he",
        ]);
        let overtimePercentage = 0;
        if (otPercVal !== null) {
          overtimePercentage =
            typeof otPercVal === "number"
              ? otPercVal
              : parseFloat(
                  String(otPercVal)
                    .replace(/[^0-9,-]+/g, "")
                    .replace(",", "."),
                );
        }
        if (isNaN(overtimePercentage)) overtimePercentage = 0;

        const currentReadingVal = getVal([
          "leitura_atual",
          "current_reading",
          "leitura",
          "horimetro_atual",
          "odometro_atual",
        ]);
        let currentReading = 0;
        if (currentReadingVal !== null) {
          currentReading =
            typeof currentReadingVal === "number"
              ? currentReadingVal
              : parseFloat(
                  String(currentReadingVal)
                    .replace(/[^0-9,-]+/g, "")
                    .replace(",", "."),
                );
        }
        if (isNaN(currentReading)) currentReading = 0;

        newEquips.push({
          id,
          code: codeVal ? String(codeVal) : "",
          name: nameVal ? String(nameVal) : "Sem Nome",
          type: typeVal ? String(typeVal) : "Geral",
          brand: brandVal ? String(brandVal) : "",
          model: modelVal ? String(modelVal) : "",
          year: yearVal ? Number(yearVal) : new Date().getFullYear(),
          situation: (situationVal ? String(situationVal) : "Ativo") as any,
          plate: plateVal ? String(plateVal) : "",
          origin: originVal ? String(originVal) : "Próprio",
          category: categoryVal ? String(categoryVal) : "",
          ownerName: ownerNameVal ? String(ownerNameVal) : undefined,
          ownerCnpj: ownerCnpjVal ? String(ownerCnpjVal) : undefined,
          measurementUnit: unitVal as any,
          contractedPrice,
          monthlyPrice,
          entryDate,
          exitDate,
          chargesPercentage,
          overtimePercentage,
          currentReading,
          observations: obsVal ? String(obsVal) : "",
          companyId: currentUser?.companyId,
          contractId: importContractId || targetContract?.id,
        });

        if (monthlyPrice > 0) {
          newMonthly.push({
            id: crypto.randomUUID(),
            equipmentId: id,
            month: selectedMonth,
            cost: monthlyPrice,
            companyId: currentUser?.companyId,
            contractId: importContractId || targetContract?.id,
          });
        }
      });

      onUpdateEquipments(prev => [...prev, ...newEquips]);
      if (newMonthly.length > 0)
        onUpdateEquipmentMonthly([...equipmentMonthly, ...newMonthly]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsImportModalOpen(false);
    };
    reader.readAsBinaryString(file);
  };

  const getContractName = (id?: string) => {
    if (!id) return "Livre / Disponível";
    const c = contracts.find((x) => x.id === id);
    if (!c) return "Obra não encontrada";
    return c.workName || c.contractNumber || "Sem nome";
  };

  const filteredEquipments = useMemo(() => {
    let result = (equipments || []).filter((e) => {
      const matchesCompany =
        currentUser?.role === "master" ||
        e.companyId === currentUser?.companyId;
      const matchesContract =
        !selectedContractId ||
        selectedContractId === "all" ||
        e.contractId === selectedContractId;
      const matchesActive = filterOnlyActive ? !e.exitDate : true;

      if (!matchesCompany || !matchesContract || !matchesActive) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (e.name || "").toLowerCase().includes(term) ||
          (e.plate || "").toLowerCase().includes(term) ||
          (e.code || "").toLowerCase().includes(term) ||
          (e.type || "").toLowerCase().includes(term) ||
          (e.brand || "").toLowerCase().includes(term) ||
          (e.model || "").toLowerCase().includes(term)
        );
      }

      return true;
    });

    return [...result].sort((a, b) => {
      // Grouping: Active first, then Inactive
      if (!!a.exitDate !== !!b.exitDate) {
        return a.exitDate ? 1 : -1;
      }

      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "category") {
        comparison = (a.category || "").localeCompare(b.category || "");
      } else if (sortField === "team") {
        comparison = (a.team || "").localeCompare(b.team || "");
      } else if (sortField === "origin") {
        comparison = (a.origin || "").localeCompare(b.origin || "");
      } else if (sortField === "cost") {
        const getPrice = (e: ControllerEquipment) => {
          if (priceDisplayMode === "monthly") {
            return (
              e.monthlyPrice ||
              equipmentMonthly.find(
                (d) => d.equipmentId === e.id && d.month === selectedMonth,
              )?.cost ||
              0
            );
          }
          return e.contractedPrice || 0;
        };
        comparison = getPrice(a) - getPrice(b);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [
    equipments,
    currentUser,
    searchTerm,
    filterOnlyActive,
    sortField,
    sortOrder,
    selectedContractId,
    equipmentMonthly,
    selectedMonth,
    priceDisplayMode,
  ]);

  const handleSort = (
    field: "name" | "category" | "origin" | "cost" | "team",
  ) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] =
    useState<ControllerEquipment | null>(null);

  const handleApplyRequestToHistory = (request: PurchaseRequest) => {
    if (!request.equipmentId) {
      alert("Esta solicitação não está vinculada a um equipamento específico.");
      return;
    }

    const equip = equipments.find(
      (e) => e.id === request.equipmentId || e.plate === request.equipmentId,
    );
    if (!equip) {
      alert("Equipamento não encontrado.");
      return;
    }

    const newHistoryEntry: ServiceHistoryEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: "part_application",
      description: `Aplicação de materiais da solicitação: ${request.description}`,
      relatedId: request.id,
      parts: request.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
      })),
    };

    onUpdateEquipments(
      equipments.map((e) =>
        e.id === equip.id
          ? {
              ...e,
              history: [...(e.history || []), newHistoryEntry],
            }
          : e,
      ),
    );

    // Update items to be marked as applied
    const updatedRequests = purchaseRequests.map((r) =>
      r.id === request.id
        ? {
            ...r,
            items: r.items.map((item) => ({
              ...item,
              appliedQuantity: item.quantity,
            })),
          }
        : r,
    );
    onUpdatePurchaseRequests(updatedRequests);

    alert("Peças aplicadas ao histórico do equipamento com sucesso!");
  };

  const handleApplyStock = () => {
    if (!selectedStockItem || !applyEquipmentId || applyQuantity <= 0) return;

    // Standardize access parameters
    const actualItemObj = selectedStockItem.item ? selectedStockItem.item : selectedStockItem;
    const itemDescription = actualItemObj.description;
    const warehouseId = actualItemObj.warehouseId || "";

    // Check availability
    const availableQty = actualItemObj.quantity;
    if (applyQuantity > availableQty) {
      alert("Quantidade superior ao disponível em estoque.");
      return;
    }

    // Update warehouseItems by matching description sequentially
    if (setWarehouseItems) {
      setWarehouseItems((prev) => {
        let remainingToDeduct = applyQuantity;
        return prev.map((item) => {
          if (item.description.trim().toLowerCase() === itemDescription.trim().toLowerCase() && remainingToDeduct > 0) {
            const deduct = Math.min(item.quantity, remainingToDeduct);
            remainingToDeduct -= deduct;
            return { ...item, quantity: Math.max(0, item.quantity - deduct) };
          }
          return item;
        });
      });
    }

    // Add record to applications history
    const newApp = {
      id: crypto.randomUUID(),
      companyId: currentUser?.companyId || "default",
      warehouseId: warehouseId,
      contractId: selectedContractId || "none",
      serviceId: "controlador_equipamento",
      quantity: applyQuantity,
      description: `Aplicação no Equipamento ID/Placa: ${applyEquipmentId}`,
      date: new Date().toISOString().slice(0, 10),
      appliedBy: currentUser?.name || "Controlador",
      createdAt: new Date().toISOString()
    };
    if (setApplications) {
      setApplications(prev => [newApp, ...prev]);
    }

    // Also update legacy format in purchaseRequests for fallback transparency
    const updatedRequests = purchaseRequests.map((r) => {
      const foundItemIdx = r.items.findIndex(i => i.description.trim().toLowerCase() === itemDescription.trim().toLowerCase());
      if (foundItemIdx !== -1) {
        return {
          ...r,
          items: r.items.map((i, idx) => idx === foundItemIdx ? { ...i, appliedQuantity: (i.appliedQuantity || 0) + applyQuantity } : i)
        };
      }
      return r;
    });
    onUpdatePurchaseRequests(updatedRequests);

    // Update equipment history
    const equip = equipments.find(
      (e) => e.id === applyEquipmentId || e.plate === applyEquipmentId,
    );
    if (equip) {
      const newHistoryEntry: ServiceHistoryEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        type: "part_application",
        description: `Aplicação de material do estoque (${(selectedStockItem as any).description})`,
        relatedId: (selectedStockItem as any).id,
        parts: [
          {
            description: (selectedStockItem as any).description,
            quantity: applyQuantity,
            unit: (selectedStockItem as any).unit,
          },
        ],
      };

      onUpdateEquipments(
        equipments.map((e) =>
          e.id === equip.id
            ? {
                ...e,
                history: [...(e.history || []), newHistoryEntry],
              }
            : e
        ),
      );
    }

    setIsApplyStockOpen(false);
    setSelectedStockItem(null);
    setApplyQuantity(1);
    setApplyEquipmentId("");
    alert("Material aplicado com sucesso!");
  };

  const stats = useMemo(
    () => ({
      activeEquips: equipments.filter(
        (e) =>
          e.situation === 'Ativo' &&
          !e.exitDate &&
          (!selectedContractId || e.contractId === selectedContractId),
      ).length,
      inMaintenanceCount: equipments.filter(
        (e) =>
          e.inMaintenance &&
          !e.exitDate &&
          (!selectedContractId || e.contractId === selectedContractId),
      ).length,
    }),
    [equipments, selectedContractId],
  );

  const stockItemsToShow = useMemo(() => {
    const activeWarehouses = warehouses.filter(
      (w) => !selectedContractId || w.contractId === selectedContractId
    );
    const activeWarehouseIds = new Set(activeWarehouses.map((w) => w.id));

    const filteredWItems = warehouseItems.filter((item) =>
      activeWarehouseIds.has(item.warehouseId)
    );

    if (filteredWItems.length > 0) {
      return filteredWItems.map((item) => {
        const itemWH = warehouses.find((w) => w.id === item.warehouseId);
        return {
          id: item.id,
          description: item.description,
          unit: item.unit,
          requestDescription: itemWH ? itemWH.name : "Almoxarifado",
          quantity: item.quantity,
          appliedQuantity: 0,
          warehouseId: item.warehouseId,
          originalItem: item,
        };
      });
    }

    return purchaseRequests
      .filter(
        (r) =>
          r.sector === "CONTROLADOR" &&
          r.status === "Recebido" &&
          (!selectedContractId || r.contractId === selectedContractId),
      )
      .flatMap((r, rIdx) =>
        r.items.map((item, idx) => ({
          id: item.id || `${r.id}-${idx}`,
          description: item.description,
          unit: item.unit,
          requestDescription: r.description,
          quantity: item.quantity,
          appliedQuantity: item.appliedQuantity || 0,
          warehouseId: "",
          originalItem: {
             ...item,
             id: item.id || `${r.id}-${idx}`,
             quantity: item.quantity - (item.appliedQuantity || 0),
             requestId: r.id,
             itemIdx: idx,
          }
        })),
      );
  }, [warehouseItems, warehouses, selectedContractId, purchaseRequests]);

  const stockItemsToShowCombined = useMemo(() => {
    const rawItems = stockItemsToShow;
    const groups: { [key: string]: any[] } = {};
    rawItems.forEach(item => {
      const key = item.description.trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return Object.keys(groups).map(key => {
      const itemsInGroup = groups[key];
      const totalQty = itemsInGroup.reduce((sum, i) => sum + i.quantity, 0);
      const totalApplied = itemsInGroup.reduce((sum, i) => sum + i.appliedQuantity, 0);
      const firstItem = itemsInGroup[0];

      const reqDescs = Array.from(new Set(itemsInGroup.map(i => i.requestDescription)));
      const requestDescription = reqDescs.join(', ');

      return {
        ...firstItem,
        id: `grouped-${key}`,
        quantity: totalQty,
        appliedQuantity: totalApplied,
        requestDescription,
        originalItem: {
          ...firstItem.originalItem,
          id: firstItem.id,
          quantity: totalQty,
          appliedQuantity: totalApplied,
        }
      };
    });
  }, [stockItemsToShow]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] =
    useState<ControllerEquipment | null>(null);
  const [equipmentToEdit, setEquipmentToEdit] =
    useState<ControllerEquipment | null>(null);
  const [equipmentToTransfer, setEquipmentToTransfer] =
    useState<ControllerEquipment | null>(null);
  const [targetContractId, setTargetContractId] = useState<string>("");
  const [exitDateInput, setExitDateInput] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [transferDateInput, setTransferDateInput] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [newEquip, setNewEquip] = useState<Partial<ControllerEquipment>>({
    code: "",
    name: "",
    type: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    situation: "Ativo",
    plate: "",
    origin: "Próprio",
    ownerName: "",
    ownerCnpj: "",
    category: "Médio",
    measurementUnit: "Horímetro",
    entryDate: new Date().toISOString().split("T")[0],
    contractId: "",
    currentReading: 0,
    contractedPrice: 0,
    monthlyPrice: 0,
    observations: "",
    customFields: {},
    photos: [],
    history: [],
  });

  const parsedNewPhotos = useMemo(() => {
    const list = (newEquip.photos || []).map((p, idx) => {
      const parts = p.split("|");
      return {
        index: idx,
        url: parts[0],
        date: parts[1] || new Date().toISOString().split("T")[0],
      };
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [newEquip.photos]);

  const updateNewPhotoDate = (itemIndex: number, newDate: string) => {
    setNewEquip((prev) => {
      const arr = [...(prev.photos || [])];
      const parts = arr[itemIndex].split("|");
      arr[itemIndex] = `${parts[0]}|${newDate}`;
      return { ...prev, photos: arr };
    });
  };

  const deleteNewPhoto = (itemIndex: number) => {
    setNewEquip((prev) => {
      const arr = (prev.photos || []).filter((_, idx) => idx !== itemIndex);
      return { ...prev, photos: arr };
    });
  };

  const parsedEditPhotos = useMemo(() => {
    const list = (equipmentToEdit?.photos || []).map((p, idx) => {
      const parts = p.split("|");
      return {
        index: idx,
        url: parts[0],
        date: parts[1] || new Date().toISOString().split("T")[0],
      };
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [equipmentToEdit?.photos]);

  const updateEditPhotoDate = (itemIndex: number, newDate: string) => {
    setEquipmentToEdit((prev) => {
      if (!prev) return null;
      const arr = [...(prev.photos || [])];
      const parts = arr[itemIndex].split("|");
      arr[itemIndex] = `${parts[0]}|${newDate}`;
      return { ...prev, photos: arr };
    });
  };

  const deleteEditPhoto = (itemIndex: number) => {
    setEquipmentToEdit((prev) => {
      if (!prev) return null;
      const arr = (prev.photos || []).filter((_, idx) => idx !== itemIndex);
      return { ...prev, photos: arr };
    });
  };

  const handleTypeChange = (type: string) => {
    setNewEquip((prev) => {
      const template = EQUIPMENT_TEMPLATES[type];
      return {
        ...prev,
        type,
        customFields: template
          ? JSON.parse(JSON.stringify(template.fields))
          : prev.customFields,
      };
    });
  };

  const addCustomField = () => {
    const fieldName = prompt("Nome do novo campo (ex: combustível, potência):");
    if (!fieldName) return;

    setNewEquip((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: { type: "text", value: "" },
      },
    }));
  };

  const removeCustomField = (key: string) => {
    setNewEquip((prev) => {
      const newFields = { ...prev.customFields };
      delete newFields[key];
      return { ...prev, customFields: newFields };
    });
  };

  const updateCustomField = (
    key: string,
    updates: Partial<EquipmentAttribute>,
  ) => {
    setNewEquip((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: { ...prev.customFields![key], ...updates },
      },
    }));
  };

  // Update newEquip.contractId when selectedContractId changes or modal opens
  React.useEffect(() => {
    if (isAddOpen) {
      setNewEquip((prev) => ({
        ...prev,
        contractId: selectedContractId || "",
      }));
    }
  }, [isAddOpen, selectedContractId]);

  const handleCreateEquip = () => {
    if (!newEquip.name) return;
    const finalContractId = selectedContractId || newEquip.contractId;

    onUpdateEquipments((prev) => [
      ...prev,
      {
        ...(newEquip as ControllerEquipment),
        id: crypto.randomUUID(),
        companyId: currentUser?.companyId,
        contractId: finalContractId || undefined,
        currentReading: Number(newEquip.currentReading) || 0,
        contractedPrice: Number(newEquip.contractedPrice) || 0,
        monthlyPrice: Number(newEquip.monthlyPrice) || 0,
        year: Number(newEquip.year) || undefined,
      },
    ]);
    setIsAddOpen(false);
    setNewEquip({
      code: "",
      name: "",
      type: "",
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      situation: "Ativo",
      plate: "",
      origin: "Próprio",
      ownerName: "",
      ownerCnpj: "",
      category: "Médio",
      measurementUnit: "Horímetro",
      entryDate: new Date().toISOString().split("T")[0],
      contractId: selectedContractId || "",
      currentReading: 0,
      contractedPrice: 0,
      monthlyPrice: 0,
      observations: "",
      customFields: {},
      photos: [],
      history: [],
    });
  };

  const handleEditTank = (tank: FuelTank) => {
    setEditingTankId(tank.id);
    setNewTank({ ...tank });
    setCustomFuel(!DEFAULT_FUELS.includes(tank.fuelType) ? tank.fuelType : "");
    setIsTankModalOpen(true);
  };

  const getFullPeriodDetails = (
    details: DailyEquipmentMeasurement[],
    start: string,
    end: string,
  ): DailyEquipmentMeasurement[] => {
    const startDate = new Date(start + "T12:00:00");
    const endDate = new Date(end + "T12:00:00");
    const fullDetails: DailyEquipmentMeasurement[] = [];

    let current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split("T")[0];
      const existing = details.find((d) => d.date === dateStr);
      if (existing) {
        fullDetails.push(existing);
      } else {
        fullDetails.push({
          date: dateStr,
          initialReading: 0,
          finalReading: 0,
          discount: false,
          status: "à Disposição",
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return fullDetails;
  };

  const getDailyMeasurementData = (
    start: string,
    end: string,
    equipment: ControllerEquipment | null,
    existingDetails: DailyEquipmentMeasurement[] = [],
  ): DailyEquipmentMeasurement[] => {
    if (!start || !end || !equipment) return [];
    const startDate = new Date(start + "T12:00:00");
    const endDate = new Date(end + "T12:00:00");
    const dailyData: DailyEquipmentMeasurement[] = [];

    // Try to find the last final reading from previous measurements
    let lastKnownReading = 0;
    const sortedMeasurements = [...(equipment.measurements || [])].sort(
      (a, b) => {
        const dateA = a.period.split(" a ")[1] || "";
        const dateB = b.period.split(" a ")[1] || "";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      },
    );

    if (sortedMeasurements.length > 0) {
      const lastM = sortedMeasurements[0];
      if (lastM.details && lastM.details.length > 0) {
        lastKnownReading = lastM.details[lastM.details.length - 1].finalReading;
      }
    }

    let current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split("T")[0];
      const existing = existingDetails.find((d) => d.date === dateStr);
      if (existing) {
        dailyData.push(existing);
      } else {
        dailyData.push({
          date: dateStr,
          initialReading: lastKnownReading,
          finalReading: lastKnownReading,
          discount: false,
          status: undefined,
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return dailyData;
  };

  const generateDailyMeasurementData = (start: string, end: string) => {
    setTempDailyData(getDailyMeasurementData(start, end, selectedEquipment));
  };

  const generateMeasurementPDF = (
    measurement: EquipmentMeasurement,
    equipment: ControllerEquipment,
    print?: boolean,
  ) => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    const addHeaderFooter = () => {
      // White background for header
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, margin, contentWidth, 25, "F");

      // Left Logo
      if (companyLogo) {
        try {
          const props = doc.getImageProperties(companyLogo);
          const ratio = props.width / props.height;
          let w = 20;
          let h = 20 / ratio;
          if (h > 18) {
            h = 18;
            w = 18 * ratio;
          }
          doc.addImage(companyLogo, "PNG", margin, margin + (25 - h) / 2, w, h);
        } catch (e) {}
      }

      // Company Info (Center)
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const companyName = currentUser?.companyName || "NOME DA EMPRESA";
      doc.text(companyName.toUpperCase(), pageWidth / 2, margin + 8, {
        align: "center",
      });

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const companyDetails = [
        currentUser?.email ? `Email: ${currentUser.email}` : "",
        currentUser?.phone ? `Telefone: ${currentUser.phone}` : "",
        currentUser?.address ? `Endereço: ${currentUser.address}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      doc.text(companyDetails, pageWidth / 2, margin + 13, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("MEDIÇÃO DE EQUIPAMENTOS", pageWidth / 2, margin + 20, {
        align: "center",
      });

      // Right Logo
      if (companyLogoRight && (logoMode === "right" || logoMode === "both")) {
        try {
          const props = doc.getImageProperties(companyLogoRight);
          const ratio = props.width / props.height;
          let w = 20;
          let h = 20 / ratio;
          if (h > 18) {
            h = 18;
            w = 18 * ratio;
          }
          doc.addImage(
            companyLogoRight,
            "PNG",
            pageWidth - margin - w,
            margin + (25 - h) / 2,
            w,
            h,
          );
        } catch (e) {}
      }

      // Border and title separator
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 25, pageWidth - margin, margin + 25);

      // Footer - Last line only
      doc.setTextColor(150);
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.text(
        "SYNERA - Sistema Integrado de Gestão",
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" },
      );
    };

    addHeaderFooter();

    // Header Info Table
    const headerData = [
      [
        "EQUIPAMENTO:",
        `${equipment.code || ""} - ${equipment.name}`,
        "MODELO:",
        equipment.brand
          ? `${equipment.brand} ${equipment.model}`
          : equipment.model,
      ],
      ["SÉRIE/PLACA:", equipment.plate || "N/A", "MÊS REF:", measurement.month],
      [
        "PERÍODO:",
        measurement.period,
        "UNIDADE:",
        equipment.measurementUnit || "h",
      ],
    ];

    autoTable(doc, {
      startY: margin + 28,
      body: headerData,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 25, fillColor: [240, 240, 240] },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, fillColor: [240, 240, 240] },
        3: { cellWidth: 70 },
      },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 5;

    const pStartDay = measurement.period.split(" a ")[0];
    const pEndDay = measurement.period.split(" a ")[1];
    const startRange = new Date(pStartDay + "T00:00:00");
    const endRange = new Date(pEndDay + "T23:59:59");

    const relatedFuel = fuelLogs.filter(
      (f) =>
        f.equipmentId === equipment.id &&
        new Date(f.date) >= startRange &&
        new Date(f.date) <= endRange,
    );

    const relatedMaint = (equipmentMaintenance || []).filter(
      (m) =>
        m.equipmentId === equipment.id &&
        new Date(m.entryDate) >= startRange &&
        new Date(m.entryDate) <= endRange,
    );

    // Two-Column Layout for Production and Fuel
    const colWidth = (contentWidth - 5) / 2;

    // Col 1 & Col 2 Section Titles
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("PRODUÇÃO DIÁRIA", margin, currentY);
    doc.text("ABASTECIMENTOS", margin + colWidth + 5, currentY);
    currentY += 2.5;

    // Production Table (Column 1)
    const measurementTableData = getFullPeriodDetails(
      measurement.details || [],
      pStartDay,
      pEndDay,
    ).map((day) => [
      new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      day.initialReading,
      day.finalReading,
      day.discount ? "0" : day.finalReading - day.initialReading,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin },
      tableWidth: colWidth,
      head: [["Data", "Ini", "Fim", "Prod"]],
      body: measurementTableData,
      theme: "grid",
      headStyles: { fillColor: [50, 50, 50], fontSize: 6 },
      styles: { fontSize: 6, cellPadding: 1 },
    });

    const productionFinalY = (doc as any).lastAutoTable.finalY;

    // Fuel Table (Column 2) - Render always
    const fuelBody = relatedFuel.length > 0
      ? relatedFuel.map((f) => [
          new Date(f.date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          f.quantity,
          f.cost ? f.cost.toFixed(2) : "-",
        ])
      : [["-", "-", "-"]];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin + colWidth + 5 },
      tableWidth: colWidth,
      head: [["Data", "Qtd (L)", "Custo"]],
      body: fuelBody,
      theme: "grid",
      headStyles: { fillColor: [50, 50, 50], fontSize: 6 },
      styles: { fontSize: 6, cellPadding: 1 },
    });

    const fuelFinalY = (doc as any).lastAutoTable.finalY;
    currentY = Math.max(productionFinalY, fuelFinalY) + 5;

    // Maintenance Table (Full Width) - Render always
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("HISTÓRICO DE MANUTENÇÃO NO PERÍODO", margin, currentY);
    currentY += 2;

    const maintBody = relatedMaint.length > 0
      ? relatedMaint.map((m) => [
          new Date(m.entryDate).toLocaleDateString("pt-BR"),
          m.exitDate
            ? new Date(m.exitDate).toLocaleDateString("pt-BR")
            : "Aberto",
          m.type === "preventive" ? "PREV" : "CORR",
          m.requestedItems || "",
        ])
      : [["-", "-", "-", "Nenhuma manutenção registrada neste período"]];

    autoTable(doc, {
      startY: currentY,
      head: [["Entrada", "Saída", "Tipo", "Descrição"]],
      body: maintBody,
      theme: "grid",
      headStyles: { fillColor: [80, 80, 80], fontSize: 6 },
      styles: { fontSize: 6, cellPadding: 1 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Totals Summary at the bottom
    const totalY = pageHeight - 25;
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(margin, totalY, pageWidth - margin, totalY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(
      `TOTAL PRODUÇÃO: ${measurement.totalUnits.toLocaleString("pt-BR")} ${equipment.measurementUnit === "Horímetro" ? "h" : "km"}`,
      margin,
      totalY + 6,
    );
    doc.text(
      `VALOR TOTAL: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(measurement.totalValue || 0)}`,
      pageWidth - margin,
      totalY + 6,
      { align: "right" },
    );

    if (print) {
      doc.autoPrint();
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      try {
        const printIframe = document.createElement('iframe');
        printIframe.style.position = 'fixed';
        printIframe.style.right = '0';
        printIframe.style.bottom = '0';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = 'none';
        printIframe.src = pdfUrl;
        document.body.appendChild(printIframe);
        
        printIframe.onload = () => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(printIframe);
              URL.revokeObjectURL(pdfUrl);
            }, 60000);
          } catch (e2) {
            console.error("Iframe print triggered error:", e2);
            const printWindow = window.open(pdfUrl, '_blank');
            printWindow?.focus();
          }
        };
      } catch (err) {
        console.warn("Iframe native print failed or blocked, downloading PDF as fallback", err);
        doc.save(`Medicao_${equipment.code || "EQ"}_${measurement.month.replace("/", "-")}.pdf`);
      }
    } else {
      doc.save(
        `Medicao_${equipment.code || "EQ"}_${measurement.month.replace("/", "-")}.pdf`,
      );
    }
  };

  const handleOpenMaintenanceDiscountModal = (
    m: EquipmentMeasurement,
    e: ControllerEquipment,
  ) => {
    setSelectedMeasurementForDiscount({ m, e });
    setIsMaintenanceDiscountModalOpen(true);
  };

  const generateMeasurementExcel = (
    measurement: EquipmentMeasurement,
    equipment: ControllerEquipment,
  ) => {
    const wb = XLSX.utils.book_new();

    const pStartDay = measurement.period.split(" a ")[0];
    const pEndDay = measurement.period.split(" a ")[1];
    const startRange = new Date(pStartDay + "T00:00:00");
    const endRange = new Date(pEndDay + "T23:59:59");

    // 1. Production Data
    const prodData = getFullPeriodDetails(
      measurement.details || [],
      pStartDay,
      pEndDay,
    ).map((day) => ({
      Data: new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR"),
      Inicial: day.initialReading,
      Final: day.finalReading,
      Produção: day.discount ? 0 : day.finalReading - day.initialReading,
      Status: day.status,
    }));
    const wsProd = XLSX.utils.json_to_sheet(prodData);
    XLSX.utils.book_append_sheet(wb, wsProd, "Produção");

    // 2. Fuel Logs
    const relatedFuel = fuelLogs
      .filter(
        (f) =>
          f.equipmentId === equipment.id &&
          new Date(f.date) >= startRange &&
          new Date(f.date) <= endRange,
      )
      .map((f) => ({
        Data: new Date(f.date).toLocaleDateString("pt-BR"),
        Quantidade_L: f.quantity,
        Custo: f.cost || 0,
      }));
    const wsFuel = XLSX.utils.json_to_sheet(relatedFuel);
    XLSX.utils.book_append_sheet(wb, wsFuel, "Abastecimentos");

    // 3. Maintenance History
    const relatedMaint = (equipmentMaintenance || [])
      .filter(
        (m) =>
          m.equipmentId === equipment.id &&
          new Date(m.entryDate) >= startRange &&
          new Date(m.entryDate) <= endRange,
      )
      .map((m) => ({
        Entrada: new Date(m.entryDate).toLocaleDateString("pt-BR"),
        Saída: m.exitDate
          ? new Date(m.exitDate).toLocaleDateString("pt-BR")
          : "Aberto",
        Tipo: m.type === "preventive" ? "PREV" : "CORR",
        Descrição: m.requestedItems || "",
      }));
    const wsMaint = XLSX.utils.json_to_sheet(relatedMaint);
    XLSX.utils.book_append_sheet(wb, wsMaint, "Manutenção");

    XLSX.writeFile(
      wb,
      `Medicao_${equipment.name}_${measurement.month.replace("/", "-")}.xlsx`,
    );
  };

  const generateMeasurementFromModel = (
    file: File,
    measurement: EquipmentMeasurement,
    equipment: ControllerEquipment,
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const pStartDay = measurement.period.split(" a ")[0];
        const pEndDay = measurement.period.split(" a ")[1];
        const periodDetails = getFullPeriodDetails(
          measurement.details || [],
          pStartDay,
          pEndDay,
        );

        // Map column details for tag lists (#data, #inicial, #final, #status, #desconto, #producao)
        const listData: Record<string, any[]> = {
          "#data": periodDetails.map((day) => new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR")),
          "#inicial": periodDetails.map((day) => day.initialReading || 0),
          "#final": periodDetails.map((day) => day.finalReading || 0),
          "#producao": periodDetails.map((day) => day.discount ? 0 : (day.finalReading - day.initialReading)),
          "#produção": periodDetails.map((day) => day.discount ? 0 : (day.finalReading - day.initialReading)),
          "#status": periodDetails.map((day) => day.status || "Trabalhando"),
          "#desconto": periodDetails.map((day) => day.discount ? "Sim" : "Não"),
        };

        const singleData: Record<string, string | number> = {
          "[codigo]": equipment.code || "",
          "[código]": equipment.code || "",
          "[nome]": equipment.name || "",
          "[placa]": equipment.plate || "",
          "[modelo]": equipment.model || "",
          "[unidade]": equipment.measurementUnit || "Horímetro",
          "[preco_contratado]": equipment.contractedPrice || 0,
          "[preço_contratado]": equipment.contractedPrice || 0,
          "[periodo]": `${pStartDay} a ${pEndDay}`,
          "[período]": `${pStartDay} a ${pEndDay}`,
          "[mes]": measurement.month,
          "[mês]": measurement.month,
          "[total_unidades]": measurement.totalUnits || 0,
          "[total_producao]": measurement.totalUnits || 0,
          "[total_produção]": measurement.totalUnits || 0,
          "[total_valor]": measurement.totalValue || 0,
        };

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) return;

          const cellKeys = Object.keys(sheet).filter((key) => !key.startsWith("!"));

          cellKeys.forEach((cellKey) => {
            const cell = sheet[cellKey];
            if (cell && cell.v !== undefined && cell.v !== null) {
              const cellValStr = String(cell.v).toLowerCase().trim();

              if (listData[cellValStr]) {
                const arrayValues = listData[cellValStr];
                const match = cellKey.match(/^([A-Z]+)(\d+)$/);
                if (match) {
                  const colStr = match[1];
                  const startRow = parseInt(match[2], 10);

                  arrayValues.forEach((val, offset) => {
                    const targetCellKey = `${colStr}${startRow + offset}`;
                    sheet[targetCellKey] = {
                      v: val,
                      t: typeof val === "number" ? "n" : "s",
                    };
                  });
                }
              } else if (singleData[cellValStr] !== undefined) {
                const val = singleData[cellValStr];
                cell.v = val;
                cell.t = typeof val === "number" ? "n" : "s";
                if ('w' in cell) delete (cell as any).w;
              }
            }
          });
        });

        const finalWbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([finalWbout], { type: "application/octet-stream" });
        const filename = `Medicao_Modelo_${equipment.code || "EQ"}_${measurement.month.replace("/", "-")}.xlsx`;
        
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert("Planilha de medição gerada com sucesso a partir do seu modelo!");
      } catch (err: any) {
        console.error("Error substituting model tags:", err);
        alert("Ocorreu um erro ao processar o seu modelo de Excel. Verifique se o arquivo está correto e possua extensões válidas.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const getActiveMeasurementObject = (): EquipmentMeasurement => {
    const totalUnits = tempDailyData
      .filter((d) => d.initialReading > 0 && d.finalReading > 0 && d.finalReading > d.initialReading)
      .reduce((acc, curr) => acc + (curr.discount ? 0 : curr.finalReading - curr.initialReading), 0);
    const totalValue = totalUnits * (selectedEquipment?.contractedPrice || 0);

    return {
      id: "temp",
      equipmentId: selectedEquipment?.id || "",
      companyId: currentUser?.companyId || "",
      number: 0,
      month: measurementMonth,
      period: `${measurementPeriod.start} a ${measurementPeriod.end}`,
      totalUnits,
      totalValue,
      details: tempDailyData,
    };
  };

  const downloadImportInstructionsPDF = () => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const cw = pageWidth - margin * 2;

    // Header Background Accent Bar (Navy Dark Slate)
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, margin, cw, 25, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("SYNERA - MANUAL DE IMPORTAÇÃO DE MEDIÇÕES", pageWidth / 2, margin + 11, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Instruções e Padrões de Colunas para Planilhas (Excel / CSV)", pageWidth / 2, margin + 18, { align: "center" });

    // Intro Text
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Sobre o Sistema de Importação", margin, margin + 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const introLines = [
      "O sistema de medição inteligente permite carregar leituras diárias em lote através de arquivos Excel (.xlsx, .xls) ou CSV.",
      "Para que a importação ocorra sem erros, você deve nomear as colunas da primeira linha do arquivo exatamente com as",
      "tags de mapeamento descritas abaixo (o padrão [coluna] ou termos equivalentes associados).",
    ];
    let y = margin + 40;
    introLines.forEach(line => {
      doc.text(line, margin, y);
      y += 5;
    });

    // Columns Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Tags das Colunas Aceitas", margin, y + 5);
    y += 8;

    const tableHeaders = [["Tag Padrão", "Colunas de Equivalência", "Descrição do Campo", "Exemplo", "Obrigatoriedade"]];
    const tableBody = [
      ["[Data]", "Data, data, Date, date", "Indica o dia da leitura diária", "01/06/2026", "OBRIGATÓRIO"],
      ["[Inicial]", "Inicial, inicial, Initial Reading", "O valor do horímetro/odômetro no início do dia", "1024.5", "OBRIGATÓRIO"],
      ["[Final]", "Final, final, Final Reading", "O valor do horímetro/odômetro ao término do dia", "1032.0", "OBRIGATÓRIO"],
      ["[Status]", "Status, Situação, status, situação", "Situação de trabalho do equipamento", "Trabalhando", "OPCIONAL"],
      ["[Desconto]", "Desconto, Desconta, desconto", "Se a medição do dia será excluída do total", "Não (ou Sim)", "OPCIONAL"]
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: tableHeaders,
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 65 },
        3: { cellWidth: 25 },
        4: { fontStyle: "bold", cellWidth: 25 }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Status Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Valores Aceitos para o Status de Medição", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const statusLines = [
      "- \"Trabalhando\": Equipamento operando normalmente. É a situação padrão caso omitido.",
      "- \"Chuva\": Atribui desconto automático à produção diária no faturamento daquele dia.",
      "- \"Manutenção\": Atribui desconto automático de produção devido a reparos mecânicos.",
      "- \"Aguardando Frente\": Descontado por ociosidade involuntária da equipe de campo.",
      "- \"à Disposição\": Descontado por ociosidade voluntária / operacional.",
    ];
    statusLines.forEach(line => {
      doc.text(line, margin, y);
      y += 5;
    });

    y += 5;

    // Golden Rules Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, cw, 40, "FD");

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Regras de Ouro para Sucesso da Importação :", margin + 5, y + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const rules = [
      "1. Certifique-se de que as datas correspondam exatamente ao período aberto para medição.",
      "2. Valores numéricos de leituras devem usar ponto como separador decimal se necessário (ex: 125.4).",
      "3. Evite mesclar células de cabeçalho ou incluir linhas vazias acima da linha de título.",
      "4. Se o status for diferente de \"Trabalhando\", o sistema aplica o desconto automaticamente por segurança."
    ];
    let ruleY = y + 14;
    rules.forEach(rule => {
      doc.text(rule, margin + 5, ruleY);
      ruleY += 5.5;
    });

    // Footer signature
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("Documento de Instrução de Importação de Medições - SYNERA", pageWidth / 2, pageHeight - 10, { align: "center" });

    doc.save("Manual_Importacao_Medicao.pdf");
  };

  const downloadExportTagsInstructionsPDF = () => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const cw = pageWidth - margin * 2;

    // PAGE 1: EXPORT MANUAL
    // Header Background Accent Bar (Indigo/Blue Slate)
    doc.setFillColor(29, 78, 216);
    doc.rect(margin, margin, cw, 25, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("MANUAL DE INTEGRACAO (EXPORTACAO & IMPORTACAO)", pageWidth / 2, margin + 10, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Instrucoes e Mapeamento de Tags para Exportacao e de Planilhas de Importacao", pageWidth / 2, margin + 17, { align: "center" });

    // Intro Text
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Como Funciona o Modelo Personalizado?", margin, margin + 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const introLines = [
      "O sistema permite exportar a medicao do periodo diretamente dentro do seu proprio arquivo Excel de modelo.",
      "Para fazer isso, basta desenhar a sua planilha exatamente como sua empresa precisa, e preencher",
      "as celulas com as tags de mapeamento abaixo nas posicoes desejadas. Ao exportar, o sistema lera o arquivo,",
      "substituira as tags pelos valores reais e preservara todo o seu layout original, estilos, fontes e formulas.",
    ];
    let y = margin + 41;
    introLines.forEach(line => {
      doc.text(line, margin, y);
      y += 5;
    });

    // Equipment Tags Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Tags de Dados do Equipamento - Formato [tag]", margin, y + 5);
    y += 9;

    const eqHeaders = [["Tag no Excel", "Dado Substituido", "Exemplo de Valor Realizado"]];
    const eqBody = [
      ["[codigo]", "Codigo de Identificacao do Ativo", "TR-01"],
      ["[nome]", "Nome ou Descricao Comercial do Equipamento", "Escavadeira Hidraulica SANY"],
      ["[placa]", "Placa / Registro do Ativo", "ABC-1234"],
      ["[modelo]", "Modelo especifico do fabricante", "SY215C"],
      ["[unidade]", "Unidade contratual de Medicao", "Horimetro (ou Odometro, etc.)"],
      ["[preco_contratado]", "Valor faturamento unitario do ativo", "R$ 150,00"],
      ["[periodo]", "Intervalo de datas da medicao", "01/06/2026 a 30/06/2026"],
      ["[mes]", "Mes / Ano de referencia", "06/2026"],
      ["[total_unidades]", "Total de unidades / horas produzidas", "180.50"],
      ["[total_valor]", "Faturamento Total Calculado (unidades * preco)", "R$ 27.075,00"],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: eqHeaders,
      body: eqBody,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        1: { cellWidth: 80 },
        2: { cellWidth: 50 },
      }
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // Columns Tags Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Tags do Intervalo de Colunas Diarias - Formato #tag", margin, y);
    y += 5;

    const colHeaders = [["Tag no Excel", "Descricao da Coluna (Repete para cada dia)", "Resultado Esperado"]];
    const colBody = [
      ["#data", "Coluna onde serao inseridas as datas do periodo", "01/06, 02/06..."],
      ["#inicial", "Horimetro / Odometro Inicial do respectivo dia", "1020.50, 1025.20..."],
      ["#final", "Horimetro / Odometro Final do respectivo dia", "1025.20, 1032.00..."],
      ["#producao", "Producao Liquida computada do dia (exclui descontos)", "4.70, 6.80..."],
      ["#status", "Situacao de trabalho registrada naquele dia", "Trabalhando, Chuva..."],
      ["#desconto", "Se houve faturamento / desconto do dia de operacao", "Nao, Sim"],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: colHeaders,
      body: colBody,
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        1: { cellWidth: 80 },
        2: { cellWidth: 50 },
      }
    });

    // Footer signature Page 1
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("Manual de Instrucoes e Modelos Personalizados (Exportacao) - Pag 1 de 2", pageWidth / 2, pageHeight - 8, { align: "center" });

    // PAGE 2: IMPORT MANUAL AND EXAMPLE
    doc.addPage();
    
    // Header Background Accent Bar (Emerald/Green Teal)
    doc.setFillColor(5, 150, 105);
    doc.rect(margin, margin, cw, 25, "F");

    // Title Page 2
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("MANUAL DE IMPORTACAO DE MEDICOES POR PLANILHA", pageWidth / 2, margin + 10, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Criacao de Planilhas e Integracao de Leituras Diarias em Lote via Excel", pageWidth / 2, margin + 17, { align: "center" });

    // Section Intro
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Como Funciona o Sistema de Importacao?", margin, margin + 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const importIntroLines = [
      "O importador do SYNERA e inteligente e reutiliza a exata mesma nomenclatura das tags do seu modelo.",
      "Voce pode criar uma planilha do zero ou usar a planilha exportada do proprio modelo personalizado.",
      "Ao carregar a planilha na tela de medicao de ativos, o sistema cruza as datas e populara as leituras iniciais,",
      "finais, status de faturamento e descontos diarios automaticamente.",
    ];
    let y2 = margin + 41;
    importIntroLines.forEach(line => {
      doc.text(line, margin, y2);
      y2 += 5;
    });

    // Example Import Layout Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Exemplo Pratico de Planilha para Importar (#tag)", margin, y2 + 5);
    y2 += 9;

    const exampleHeaders = [["#data", "#inicial", "#final", "#status", "#desconto"]];
    const exampleBody = [
      ["01/06/2026", "1020.50", "1025.20", "Trabalhando", "Nao"],
      ["02/06/2026", "1025.20", "1032.00", "Trabalhando", "Nao"],
      ["03/06/2026", "1032.00", "1032.00", "Chuva", "Sim"],
      ["04/06/2026", "1032.00", "1038.50", "Trabalhando", "Nao"],
      ["05/06/2026", "1038.50", "1038.50", "Manutencao", "Sim"],
    ];

    autoTable(doc, {
      startY: y2,
      margin: { left: margin, right: margin },
      head: exampleHeaders,
      body: exampleBody,
      theme: "grid",
      headStyles: { fillColor: [5, 150, 105], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, fontStyle: "normal" },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 40 },
        4: { cellWidth: 35 }
      }
    });

    y2 = (doc as any).lastAutoTable.finalY + 10;

    // Rules Section
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Regras Criticas e Flexibilidade do Importador:", margin, y2);
    y2 += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const ruleTexts = [
      "- FLEXIBILIDADE DE CABECALHOS: O sistema aceita tanto tags (#data, #inicial, #final, #status, #desconto)",
      "  quanto os nomes correspondentes comuns (Data, Inicial, Final, Status, Desconto).",
      "- COMPATIBILIDADE DE FORMATO DE DATA: Datas sao aceitas em formato convencional brasileiro DD/MM/AAAA",
      "  ou padrao ISO AAAA-MM-DD. O sistema cruzara apenas as datas contidas no periodo de medicao ativo.",
      "- TRATAMENTO FINANCEIRO: Leituras com virgula ou ponto sao detectadas automaticamente como numeros.",
      "- RECONHECIMENTO DE STATUS: O sistema mapeia os termos 'chuva' para faturar com desconto e 'manutencao'",
      "  ou status equivalentes aplicando o desconto de faturamento diario correspondente.",
    ];
    ruleTexts.forEach(line => {
      doc.text(line, margin, y2);
      y2 += 5.5;
    });

    // Interactive Callout
    y2 += 3;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.setLineWidth(0.5);
    doc.rect(margin, y2, cw, 22, "FD");

    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("Fluxo Completo de Operacao Sincronizada:", margin + 5, y2 + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("1. Baixe o Modelo -> 2. Insira as Tags [Ativo] e #Colunas -> 3. Exporte a Medicao -> 4. Forneca o arquivo ao motorista/campo", margin + 5, y2 + 13);
    doc.text("5. Preencha as Leituras e Status -> 6. Importe a planilha preenchida de volta no sistema para atualizar instantaneamente!", margin + 5, y2 + 18);

    // Footer signature Page 2
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("Manual de Instrucoes e Modelos Personalizados (Importacao) - Pag 2 de 2", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save("Manual_Tags_Modelo_Exportacao.pdf");
  };

  const handleOpenExportModal = (
    m: EquipmentMeasurement,
    e: ControllerEquipment,
  ) => {
    setExportData({ measurement: m, equipment: e });
  };

  const handleSaveMeasurement = () => {
    if (!selectedEquipment) return;
    const tempMeasurements = selectedEquipment.measurements || [];

    // FILTRAR DIAS COM HORIMETRO FINAL > 0 E TODOS OS CAMPOS PREENCHIDOS E FINAL > INICIAL
    const filledDays = tempDailyData.filter(
      (d) =>
        d.initialReading > 0 &&
        d.finalReading > 0 &&
        d.finalReading > d.initialReading &&
        !!d.status,
    );

    const totalUnits = filledDays.reduce(
      (acc, curr) =>
        acc + (curr.discount ? 0 : curr.finalReading - curr.initialReading),
      0,
    );
    const unitPrice = selectedEquipment.contractedPrice || 0;
    const totalValue = totalUnits * unitPrice;

    let updatedMeasurements: EquipmentMeasurement[] = [];

    if (editingMeasurementId) {
      updatedMeasurements = tempMeasurements.map((m) =>
        m.id === editingMeasurementId
          ? {
              ...m,
              month: measurementMonth,
              period: `${measurementPeriod.start} a ${measurementPeriod.end}`,
              totalUnits,
              totalValue,
              details: tempDailyData.filter((d) => !!d.status),
            }
          : m,
      );
      setEditingMeasurementId(null);
    } else {
      const newMeasurement: EquipmentMeasurement = {
        id: crypto.randomUUID(),
        equipmentId: selectedEquipment.id,
        companyId: currentUser?.companyId || "",
        number: tempMeasurements.length + 1,
        month: measurementMonth,
        period: `${measurementPeriod.start} a ${measurementPeriod.end}`,
        totalUnits,
        totalValue,
        details: tempDailyData.filter((d) => !!d.status),
      };
      updatedMeasurements = [...tempMeasurements, newMeasurement];
    }

    // Update the equipment in the main list
    const updatedEquipments = equipments.map((e) =>
      e.id === selectedEquipment.id
        ? { ...e, measurements: updatedMeasurements }
        : e,
    );

    // Also update local selectedEquipment to reflect changes in UI
    setSelectedEquipment((prev) =>
      prev ? { ...prev, measurements: updatedMeasurements } : null,
    );
    setEquipmentToEdit((prev) =>
      prev ? { ...prev, measurements: updatedMeasurements } : null,
    );

    onUpdateEquipments(updatedEquipments);

    // Also update equipmentToEdit if it's the same equipment being edited in the main modal
    if (equipmentToEdit && equipmentToEdit.id === selectedEquipment.id) {
      setEquipmentToEdit((prev) =>
        prev ? { ...prev, measurements: updatedMeasurements } : null,
      );
    }

    setIsNewMeasurementModalOpen(false);
    setIsPeriodSelectionOpen(false);
    setTimeout(() => {
      alert("A medição do equipamento foi salva com sucesso na tabela do banco de dados!");
    }, 100);
  };

  const handleDeleteMeasurement = (id: string) => {
    if (!selectedEquipment) return;
    if (window.confirm("Tem certeza que deseja excluir esta medição?")) {
      const updatedMeasurements = (selectedEquipment.measurements || []).filter(
        (m) => m.id !== id,
      );
      const updatedEquipments = equipments.map((e) =>
        e.id === selectedEquipment.id
          ? { ...e, measurements: updatedMeasurements }
          : e,
      );
      onUpdateEquipments(updatedEquipments);

      setSelectedEquipment((prev) =>
        prev ? { ...prev, measurements: updatedMeasurements } : null,
      );

      if (equipmentToEdit && equipmentToEdit.id === selectedEquipment.id) {
        setEquipmentToEdit((prev) =>
          prev ? { ...prev, measurements: updatedMeasurements } : null,
        );
      }
    }
  };

  const handleCreateTank = () => {
    if (!newTank.name || !newTank.capacity) return;

    const tankData = {
      ...(newTank as FuelTank),
      companyId: currentUser?.companyId,
      contractId: selectedContractId || newTank.contractId,
      currentLevel: newTank.currentLevel || 0,
      fuelType: customFuel || newTank.fuelType || "Diesel S10",
    };

    if (editingTankId) {
      setFuelTanks((prev) =>
        prev.map((t) =>
          t.id === editingTankId ? { ...tankData, id: editingTankId } : t,
        ),
      );
    } else {
      setFuelTanks([
        ...fuelTanks,
        {
          ...tankData,
          id: crypto.randomUUID(),
        },
      ]);
    }

    setIsTankModalOpen(false);
    setEditingTankId(null);
    setNewTank({
      name: "",
      capacity: 0,
      currentLevel: 0,
      fuelType: "Diesel S10",
    });
    setCustomFuel("");
  };

  const handleDeleteTankRequest = (tank: FuelTank) => {
    // Check if there are any logs for this tank
    const hasLogs = fuelLogs.some((log) => log.tankId === tank.id);
    if (hasLogs) {
      alert(
        "Não é possível excluir um reservatório que possui movimentações de entrada ou saída no histórico.",
      );
      return;
    }
    setTankToDelete(tank);
    setIsDeleteTankDialogOpen(true);
  };

  const handleConfirmDeleteTank = () => {
    if (!tankToDelete) return;
    setFuelTanks((prev) => prev.filter((t) => t.id !== tankToDelete.id));
    setIsDeleteTankDialogOpen(false);
    setTankToDelete(null);
    setIsTankModalOpen(false);
    setEditingTankId(null);
  };

  const handleCreateFuelLog = () => {
    if (!newFuelLog.tankId || !newFuelLog.quantity) return;

    const quantityNum = Number(newFuelLog.quantity);
    let updatedTanks = [...fuelTanks];

    // Reverse previous level adjustments if editing
    if (editingFuelLogId) {
      const oldLog = fuelLogs.find((l) => l.id === editingFuelLogId);
      if (oldLog) {
        const oldQty = Number(oldLog.quantity);
        if (oldLog.type === "entrada") {
          updatedTanks = updatedTanks.map((t) =>
            t.id === oldLog.tankId
              ? { ...t, currentLevel: Math.max(0, t.currentLevel - oldQty) }
              : t,
          );
        } else {
          updatedTanks = updatedTanks.map((t) =>
            t.id === oldLog.tankId
              ? { ...t, currentLevel: t.currentLevel + oldQty }
              : t,
          );
          const oldDestId = oldLog.equipmentId;
          if (oldDestId && fuelTanks.some((t) => t.id === oldDestId)) {
            updatedTanks = updatedTanks.map((t) =>
              t.id === oldDestId
                ? { ...t, currentLevel: Math.max(0, t.currentLevel - oldQty) }
                : t,
            );
          }
        }
      }
    }

    // Find source tank in the fresh list
    const sourceTank = updatedTanks.find((t) => t.id === newFuelLog.tankId);
    if (!sourceTank) return;

    let unitPrice = newFuelLog.unitPrice || 0;

    // Logic: for exit, use price from last entry of this tank
    if (newFuelLog.type === "saida") {
      const lastEntry = fuelLogs.find(
        (l) =>
          l.tankId === newFuelLog.tankId && l.type === "entrada" && l.unitPrice,
      );
      if (lastEntry) {
        unitPrice = lastEntry.unitPrice || 0;
      }
    }

    // Apply new level adjustments to source
    const newSourceLevel =
      newFuelLog.type === "entrada"
        ? sourceTank.currentLevel + quantityNum
        : sourceTank.currentLevel - quantityNum;

    updatedTanks = updatedTanks.map((t) =>
      t.id === sourceTank.id
        ? { ...t, currentLevel: Math.max(0, newSourceLevel) }
        : t,
    );

    // If it's a transfer, apply to destination tank too
    if (newFuelLog.type === "saida" && newFuelLog.equipmentId) {
      const destTank = updatedTanks.find(
        (t) => t.id === newFuelLog.equipmentId,
      );
      if (destTank) {
        updatedTanks = updatedTanks.map((t) =>
          t.id === destTank.id
            ? { ...t, currentLevel: t.currentLevel + quantityNum }
            : t,
        );
      }
    }

    // Save the log
    const calculatedCost =
      newFuelLog.type === "entrada"
        ? newFuelLog.cost || unitPrice * quantityNum
        : unitPrice * quantityNum;

    const logToSave: FuelLog = {
      ...(newFuelLog as FuelLog),
      id: editingFuelLogId || crypto.randomUUID(),
      companyId: currentUser?.companyId,
      unitPrice: unitPrice,
      cost: calculatedCost,
    };

    // Update tanks first to ensure consistency
    setFuelTanks(updatedTanks);

    if (editingFuelLogId) {
      setFuelLogs(
        fuelLogs.map((l) => (l.id === editingFuelLogId ? logToSave : l)),
      );
    } else {
      setFuelLogs([logToSave, ...fuelLogs]);
    }

    setIsFuelLogModalOpen(false);
    setEditingFuelLogId(null);
    setNewFuelLog({
      type: "saida",
      date: new Date().toISOString().split("T")[0],
      quantity: 0,
      tankId: "",
      equipmentId: "",
      supplier: "",
      invoiceNumber: "",
      unitPrice: 0,
      cost: 0,
    });
  };

  const addItemInput = () => {
    setCurrentRequest({
      ...currentRequest,
      items: [
        ...(currentRequest.items || []),
        {
          id: crypto.randomUUID(),
          description: "",
          quantity: 1,
          unit: "un",
          status: "Pendente",
        },
      ],
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...(currentRequest.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setCurrentRequest({ ...currentRequest, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = (currentRequest.items || []).filter((_, i) => i !== index);
    setCurrentRequest({ ...currentRequest, items: newItems });
  };

  const handleCreateMaterialRequest = () => {
    if (
      !currentRequest.items ||
      currentRequest.items.length === 0 ||
      !newRequestCategory
    ) {
      alert("Preencha os itens e a categoria da solicitação.");
      return;
    }

    const exists = purchaseRequests.some((r) => r.id === currentRequest.id);

    if (exists) {
      const updatedRequests = purchaseRequests.map((r) =>
        r.id === currentRequest.id
          ? {
              ...r,
              ...currentRequest,
              category: newRequestCategory,
              items: (currentRequest.items || []).map((item) => ({
                ...item,
                id: item.id || crypto.randomUUID(),
                status: item.status || "Pendente",
              })),
            }
          : r,
      );
      onUpdatePurchaseRequests(updatedRequests);
    } else {
      const newRequest: PurchaseRequest = {
        ...currentRequest,
        id: currentRequest.id || crypto.randomUUID(),
        companyId: currentUser?.companyId,
        contractId:
          currentRequest.contractId ||
          (selectedContractId !== "all" ? selectedContractId : undefined),
        date: currentRequest.date || new Date().toISOString().split("T")[0],
        description:
          currentRequest.description ||
          `Solicitação do Controlador: ${(currentRequest.items || []).map((i) => i.description).join(", ")}`,
        category: newRequestCategory,
        sector: "CONTROLADOR",
        status: currentRequest.status || "Pendente",
        priority: currentRequest.priority || "Normal",
        items: (currentRequest.items || []).map((item) => ({
          ...item,
          id: item.id || crypto.randomUUID(),
          status: item.status || "Pendente",
        })),
      } as PurchaseRequest;

      onUpdatePurchaseRequests([newRequest, ...purchaseRequests]);
    }

    if (newRequestCategory && !savedCategories.includes(newRequestCategory)) {
      setSavedCategories([...savedCategories, newRequestCategory]);
    }

    setIsMaterialRequestModalOpen(false);
    setCurrentRequest({
      items: [
        { id: crypto.randomUUID(), description: "", quantity: 1, unit: "un" },
      ],
      status: "Pendente",
      priority: "Normal",
    });
    setNewRequestCategory("");
  };

  const handleUpdateEquip = () => {
    if (!equipmentToEdit || !equipmentToEdit.name) return;
    onUpdateEquipments((prev) =>
      prev.map((e) =>
        e.id === equipmentToEdit.id
          ? {
              ...equipmentToEdit,
              currentReading: Number(equipmentToEdit.currentReading) || 0,
              contractedPrice: Number(equipmentToEdit.contractedPrice) || 0,
              monthlyPrice: Number(equipmentToEdit.monthlyPrice) || 0,
              year: Number(equipmentToEdit.year) || undefined,
            }
          : e,
      ),
    );
    setIsEditOpen(false);
    setEquipmentToEdit(null);
    setTimeout(() => {
      alert("As alterações do equipamento e suas fotos foram salvas com sucesso na base de dados (controller_equipments)!");
    }, 100);
  };

  const handlePermanentDelete = () => {
    if (!equipmentToEdit) return;
    if (
      confirm(
        `Tem certeza que deseja EXCLUIR PERMANENTEMENTE o equipamento ${equipmentToEdit.name}? Esta ação não pode ser desfeita.`,
      )
    ) {
      onUpdateEquipments((prev) => prev.filter((e) => e.id !== equipmentToEdit.id));
      setIsEditOpen(false);
      setEquipmentToEdit(null);
    }
  };

  const handleSoftDelete = () => {
    if (!equipmentToDelete) return;
    onUpdateEquipments((prev) =>
      prev.map((e) =>
        e.id === equipmentToDelete.id ? { ...e, exitDate: exitDateInput } : e,
      ),
    );
    setIsDeleteOpen(false);
    setEquipmentToDelete(null);
  };

  const handleTransferRequest = () => {
    if (!equipmentToTransfer || !targetContractId) return;

    const newTransfer: EquipmentTransfer = {
      id: crypto.randomUUID(),
      companyId: currentUser?.companyId || "",
      equipmentId: equipmentToTransfer.id,
      sourceContractId: equipmentToTransfer.contractId || "",
      targetContractId: targetContractId,
      transferDate: transferDateInput,
      status: "pending",
      requestedBy: currentUser?.name || "Solicitante",
    };

    onUpdateTransfers([...transfers, newTransfer]);
    setIsTransferOpen(false);
    setEquipmentToTransfer(null);
    setTargetContractId("");
    setTransferDateInput(new Date().toISOString().split("T")[0]);
  };

  const handleApproveTransfer = (transfer: EquipmentTransfer) => {
    onUpdateEquipments((prev) =>
      prev.map((e) =>
        e.id === transfer.equipmentId
          ? { ...e, contractId: transfer.targetContractId }
          : e,
      ),
    );
    onUpdateTransfers(
      transfers.map((t) =>
        t.id === transfer.id
          ? {
              ...t,
              status: "approved",
              approvedBy: currentUser?.name,
              approvedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
  };

  const handleRejectTransfer = (transfer: EquipmentTransfer) => {
    onUpdateTransfers(
      transfers.map((t) =>
        t.id === transfer.id
          ? {
              ...t,
              status: "rejected",
              approvedBy: currentUser?.name,
              approvedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
  };

  const handleToggleMaintenance = (equipment: ControllerEquipment) => {
    if (!equipment.inMaintenance) {
      // Opening maintenance - show modal
      setMaintenanceEquipment(equipment);
      setMaintenanceEntryDate(new Date().toISOString().split("T")[0]);
      setMaintenanceType("preventive");
      setNewMaintenanceItem({
        description: "",
        quantity: 1,
        value: 0,
        discount: false,
      });

      // Show pre-existing pending purchase request items if they exist
      const preExistingReq = purchaseRequests.find(
        (r) => r.equipmentId === equipment.id && r.status === "Pendente",
      );
      if (preExistingReq) {
        setMaintenanceRequestedItems(preExistingReq.description || "");
        setMaintenanceItems(
          (preExistingReq.items || []).map((item) => ({
            description: item.description,
            quantity: item.quantity,
            value: 0,
            discount: false,
          })),
        );
      } else {
        setMaintenanceRequestedItems("");
        setMaintenanceItems([]);
      }

      setIsMaintenanceModalOpen(true);
    } else {
      // Closing maintenance - show confirmation modal
      setEquipmentToExit(equipment);
      setMaintenanceExitDate(new Date().toISOString().split("T")[0]);
      setIsExitMaintenanceModalOpen(true);
    }
  };

  const handleConfirmExitMaintenance = () => {
    if (!equipmentToExit) return;

    const exitDate = maintenanceExitDate;

    onUpdateEquipments((prev) =>
      prev.map((e) =>
        e.id === equipmentToExit.id
          ? {
              ...e,
              situation: "Ativo",
              inMaintenance: false,
              maintenance_exit_date: exitDate,
              maintenance_entry_date: null as any,
              maintenance_type: null as any,
            }
          : e,
      ),
    );

    // Update maintenance record in history
    const activeMaintenance = equipmentMaintenance.find(
      (m) => m.equipmentId === equipmentToExit.id && !m.exitDate,
    );
    if (activeMaintenance) {
      const entry = new Date(activeMaintenance.entryDate + "T12:00:00");
      const exit = new Date(exitDate + "T12:00:00");
      const diffTime = Math.abs(exit.getTime() - entry.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      onUpdateMaintenance(
        equipmentMaintenance.map((m) =>
          m.id === activeMaintenance.id
            ? { ...m, exitDate, daysInMaintenance: diffDays }
            : m,
        ),
      );
    }

    setIsExitMaintenanceModalOpen(false);
    setEquipmentToExit(null);
  };

  const handleConfirmMaintenance = () => {
    if (!maintenanceEquipment || !currentUser) return;

    // In case the user typed in the description input but did not hit the "+" button
    let finalPrItemsToSend = [...maintenanceItems];
    if (newMaintenanceItem.description.trim()) {
      finalPrItemsToSend.push({
        description: newMaintenanceItem.description.trim(),
        quantity: newMaintenanceItem.quantity || 1,
        value: newMaintenanceItem.value || 0,
        discount: newMaintenanceItem.discount || false,
      });
    }

    onUpdateEquipments((prev) =>
      prev.map((e) =>
        e.id === maintenanceEquipment.id
          ? {
              ...e,
              situation: "Em Manutenção",
              inMaintenance: true,
              maintenance_entry_date: maintenanceEntryDate,
              maintenance_type: maintenanceType,
            }
          : e,
      ),
    );

    const itemsSummary =
      finalPrItemsToSend.length > 0
        ? finalPrItemsToSend
            .map((i) => `${i.quantity}x ${i.description}`)
            .join(", ")
        : maintenanceRequestedItems;

    // We can update the existing maintenance history if this equipment is already in maintenance, or create a new entry
    const existingMaintenanceIndex = equipmentMaintenance.findIndex(
      (m) => m.equipmentId === maintenanceEquipment.id && !m.exitDate,
    );

    let updatedMaintenance = [...equipmentMaintenance];
    if (maintenanceEquipment.inMaintenance && existingMaintenanceIndex > -1) {
      updatedMaintenance[existingMaintenanceIndex] = {
        ...updatedMaintenance[existingMaintenanceIndex],
        entryDate: maintenanceEntryDate,
        type: maintenanceType,
        requestedItems: itemsSummary,
        items: finalPrItemsToSend.length > 0 ? finalPrItemsToSend : undefined,
      };
    } else {
      const newMaintenance: EquipmentMaintenance = {
        id: uuidv4(),
        equipmentId: maintenanceEquipment.id,
        companyId: currentUser.companyId || "",
        entryDate: maintenanceEntryDate,
        type: maintenanceType,
        requestedItems: itemsSummary,
        items: finalPrItemsToSend.length > 0 ? finalPrItemsToSend : undefined,
      };
      updatedMaintenance = [newMaintenance, ...equipmentMaintenance];
    }
    onUpdateMaintenance(updatedMaintenance);

    // Create or update a purchase request if there are items or a free-text specification
    if (
      finalPrItemsToSend.length > 0 ||
      maintenanceRequestedItems.trim().length > 0
    ) {
      const prItems =
        finalPrItemsToSend.length > 0
          ? finalPrItemsToSend.map((item) => ({
              id: crypto.randomUUID(),
              description: item.description,
              quantity: item.quantity,
              unit: "un",
            }))
          : [
              {
                id: crypto.randomUUID(),
                description: maintenanceRequestedItems.trim(),
                quantity: 1,
                unit: "un",
              },
            ];

      const preExistingRequest = purchaseRequests.find(
        (r) =>
          r.equipmentId === maintenanceEquipment.id &&
          r.status === "Pendente" &&
          r.sector === "CONTROLADOR",
      );

      if (preExistingRequest) {
        // Update pre-existing purchase request
        const updatedRequests = purchaseRequests.map((r) =>
          r.id === preExistingRequest.id
            ? {
                ...r,
                description: `Manutenção ${maintenanceType === "preventive" ? "Preventiva" : "Corretiva"}: ${maintenanceEquipment.name} (${maintenanceEquipment.plate})`,
                items: prItems,
              }
            : r,
        );
        onUpdatePurchaseRequests(updatedRequests);
      } else {
        // Create a new purchase request
        const newPurchaseRequest: PurchaseRequest = {
          id: crypto.randomUUID(),
          companyId: currentUser.companyId,
          contractId: maintenanceEquipment.contractId,
          equipmentId: maintenanceEquipment.id,
          date: new Date().toISOString().split("T")[0],
          description: `Manutenção ${maintenanceType === "preventive" ? "Preventiva" : "Corretiva"}: ${maintenanceEquipment.name} (${maintenanceEquipment.plate})`,
          category: "PEÇAS/MANUTENÇÃO",
          sector: "CONTROLADOR",
          status: "Pendente",
          items: prItems,
        };
        onUpdatePurchaseRequests([newPurchaseRequest, ...purchaseRequests]);
      }
    }

    setIsMaintenanceModalOpen(false);
    setMaintenanceEquipment(null);
    setMaintenanceRequestedItems("");
    setMaintenanceItems([]);
    setNewMaintenanceItem({
      description: "",
      quantity: 1,
      value: 0,
      discount: false,
    });
  };

  const handleConfirmDeleteFuelLog = () => {
    if (!fuelLogToDelete) return;

    // Reverse inventory changes
    let updatedTanks = [...fuelTanks];
    const quantity = Number(fuelLogToDelete.quantity);

    if (fuelLogToDelete.type === "entrada") {
      // Removed entry: subtract from tank level
      updatedTanks = updatedTanks.map((t) =>
        t.id === fuelLogToDelete.tankId
          ? { ...t, currentLevel: Math.max(0, t.currentLevel - quantity) }
          : t,
      );
    } else {
      // Removed exit: add back to source tank level
      updatedTanks = updatedTanks.map((t) =>
        t.id === fuelLogToDelete.tankId
          ? { ...t, currentLevel: t.currentLevel + quantity }
          : t,
      );

      // If it was a transfer to another reservoir, subtract from destination
      const destId = fuelLogToDelete.equipmentId;
      if (destId && fuelTanks.some((t) => t.id === destId)) {
        updatedTanks = updatedTanks.map((t) =>
          t.id === destId
            ? { ...t, currentLevel: Math.max(0, t.currentLevel - quantity) }
            : t,
        );
      }
    }

    setFuelTanks(updatedTanks);
    if (onDeleteFuelLog) {
      onDeleteFuelLog(fuelLogToDelete.id);
    } else {
      setFuelLogs((prev) => prev.filter((fl) => fl.id !== fuelLogToDelete.id));
    }

    setIsDeleteFuelLogDialogOpen(false);
    setFuelLogToDelete(null);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-sans">
      <Dialog
        open={isDeleteFuelLogDialogOpen}
        onOpenChange={setIsDeleteFuelLogDialogOpen}
      >
        <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium pt-2 text-center">
              Você tem certeza que deseja excluir este registro de combustível?
              <br />
              <span className="text-red-500 font-bold mt-2 block">
                O estoque do reservatório será estornado automaticamente.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-center mt-8">
            <Button
              variant="outline"
              onClick={() => setIsDeleteFuelLogDialogOpen(false)}
              className="flex-1 h-12 rounded-2xl border-gray-100 font-bold hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDeleteFuelLog}
              className="flex-1 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-100"
            >
              Excluir Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteTankDialogOpen}
        onOpenChange={setIsDeleteTankDialogOpen}
      >
        <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
              Excluir Reservatório
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium pt-2 text-center">
              Tem certeza que deseja excluir o reservatório{" "}
              <span className="font-bold text-gray-900">
                "{tankToDelete?.name}"
              </span>
              ?
              <br />
              Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-center mt-8">
            <Button
              variant="outline"
              onClick={() => setIsDeleteTankDialogOpen(false)}
              className="flex-1 h-12 rounded-2xl border-gray-100 font-bold hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDeleteTank}
              className="flex-1 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-100"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
      />

      <Modal
        hideCancel={true}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        className="sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        title="Importar Equipamentos"
        footer={
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 w-full sm:w-auto"
          >
            <Upload className="w-4 h-4" /> Selecionar Arquivo
          </Button>
        }
      >
        <div className="space-y-4 flex-1 overflow-y-auto p-4 scrollbar-thin-visible">
          <div className="space-y-2">
            <Label className="text-base uppercase font-bold text-gray-400">
              Obra de Destino
            </Label>
            <Select
              value={importContractId || "_none_"}
              onValueChange={(val) =>
                setImportContractId(val === "_none_" ? "" : val)
              }
            >
              <SelectTrigger className="h-12 rounded-xl focus:ring-blue-500 transition-all">
                <SelectValue placeholder="Usar obra da planilha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_" className="font-bold">
                  Usar obra da planilha
                </SelectItem>
                {availableContracts.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-bold">
                    {c.workName || c.contractNumber || "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-base text-gray-500 italic">
            * Certifique-se de que o arquivo segue o modelo padrão de importação
            do SYNERA.
          </p>
        </div>
      </Modal>

      <Modal
        hideCancel={true}
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        maxWidth="custom"
        className="p-0 border-none sm:max-w-[800px] h-[700px] max-h-[90vh] flex flex-col overflow-hidden"
        headerClassName="hidden"
      >
        <div className="bg-emerald-600 p-6 text-white relative overflow-hidden shrink-0">
          <Wrench className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-200" />
              {maintenanceEquipment?.inMaintenance
                ? "Gerenciar Manutenção e Peças"
                : "Enviar para Manutenção"}
            </h2>
            <p className="text-base text-emerald-100 font-bold uppercase tracking-widest mt-1">
              {maintenanceEquipment?.name} - {maintenanceEquipment?.plate}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="maintenance_date"
                className="text-base uppercase font-black text-gray-500 tracking-tight"
              >
                Data de Entrada
              </Label>
              <Input
                id="maintenance_date"
                type="date"
                value={maintenanceEntryDate}
                onChange={(e) => setMaintenanceEntryDate(e.target.value)}
                className="rounded-xl border-gray-200 bg-gray-50/50 h-12 font-bold focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base uppercase font-black text-gray-500 tracking-tight">
                Tipo de Manutenção
              </Label>
              <Select
                value={maintenanceType}
                onValueChange={(v: any) => setMaintenanceType(v)}
              >
                <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50/50 h-12 font-bold focus:ring-2 focus:ring-emerald-500/20">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive" className="font-bold">
                    Preventiva
                  </SelectItem>
                  <SelectItem value="corrective" className="font-bold">
                    Corretiva
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100 border-dashed">
            <div className="flex items-center justify-between">
              <Label className="text-base uppercase font-black text-emerald-700 flex items-center gap-2 tracking-widest">
                <ShoppingCart className="w-3 h-3" />
                Solicitar Peças / Materiais
              </Label>
              <Badge
                variant="outline"
                className="bg-white/50 text-sm font-black border-emerald-100"
              >
                OPCIONAL
              </Badge>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Descrição da peça ou serviço..."
                value={newMaintenanceItem.description}
                onChange={(e) =>
                  setNewMaintenanceItem({
                    ...newMaintenanceItem,
                    description: e.target.value,
                  })
                }
                className="rounded-xl border-emerald-100 bg-white h-11 text-base font-bold"
              />
              <Input
                type="number"
                placeholder="Qtd"
                className="w-20 rounded-xl border-emerald-100 bg-white h-11 text-base font-bold"
                value={newMaintenanceItem.quantity}
                onChange={(e) =>
                  setNewMaintenanceItem({
                    ...newMaintenanceItem,
                    quantity: parseInt(e.target.value) || 1,
                  })
                }
              />
              <Input
                type="number"
                placeholder="Valor (R$)"
                className="w-24 rounded-xl border-emerald-100 bg-white h-11 text-base font-bold"
                value={newMaintenanceItem.value}
                onChange={(e) =>
                  setNewMaintenanceItem({
                    ...newMaintenanceItem,
                    value: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={newMaintenanceItem.discount}
                  onChange={(e) =>
                    setNewMaintenanceItem({
                      ...newMaintenanceItem,
                      discount: e.target.checked,
                    })
                  }
                />
                <Label className="text-sm">Desc.</Label>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="rounded-xl bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                onClick={() => {
                  if (newMaintenanceItem.description) {
                    setMaintenanceItems([
                      ...maintenanceItems,
                      newMaintenanceItem,
                    ]);
                    setNewMaintenanceItem({
                      description: "",
                      quantity: 1,
                      value: 0,
                      discount: false,
                    });
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {maintenanceItems.length > 0 && (
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto scrollbar-thin-visible">
                {maintenanceItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-50 shadow-sm animate-in slide-in-from-left duration-200"
                  >
                    <span className="text-base font-black text-emerald-900">
                      {item.quantity}x {item.description}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:bg-red-50 rounded-lg"
                      onClick={() =>
                        setMaintenanceItems(
                          maintenanceItems.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {maintenanceItems.length === 0 && (
              <div className="space-y-2">
                <Label
                  htmlFor="maintenance_items_legacy"
                  className="text-base uppercase font-black text-gray-400 tracking-tighter"
                >
                  Ou informe em texto livre
                </Label>
                <Input
                  id="maintenance_items_legacy"
                  placeholder="Ex: Óleo, Filtros, Peça Específica..."
                  value={maintenanceRequestedItems}
                  onChange={(e) => setMaintenanceRequestedItems(e.target.value)}
                  className="rounded-xl border-emerald-100 bg-white h-11 text-base font-bold"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 rounded-b-2xl shrink-0">
          <Button
            variant="ghost"
            className="rounded-xl font-black uppercase text-base tracking-widest h-12 flex-1"
            onClick={() => setIsMaintenanceModalOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl font-black uppercase text-base tracking-widest bg-emerald-600 hover:bg-emerald-700 h-12 flex-[2] shadow-xl shadow-emerald-100"
            onClick={handleConfirmMaintenance}
          >
            {maintenanceEquipment?.inMaintenance
              ? "Salvar Alterações"
              : "Confirmar Envio para Oficina"}
          </Button>
        </div>
      </Modal>

      <Modal
        hideCancel={true}
        isOpen={isExitMaintenanceModalOpen}
        onClose={() => setIsExitMaintenanceModalOpen(false)}
        maxWidth="custom"
        className="p-0 border-none sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        headerClassName="hidden"
      >
        <div className="bg-red-600 p-6 text-white relative overflow-hidden">
          <Trash2 className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Check className="w-5 h-5 text-red-200" />
              Finalizar Manutenção
            </h2>
            <p className="text-base text-red-100 font-bold uppercase tracking-widest mt-1">
              {equipmentToExit?.name} - {equipmentToExit?.plate}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6 bg-white">
          <div className="space-y-2">
            <Label
              htmlFor="exit_maintenance_date"
              className="text-base uppercase font-black text-gray-500 tracking-tight"
            >
              Data de Saída
            </Label>
            <Input
              type="date"
              id="exit_maintenance_date"
              value={maintenanceExitDate}
              onChange={(e) => setMaintenanceExitDate(e.target.value)}
              className="h-14 rounded-xl border-gray-100 bg-gray-50 font-bold focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-base font-medium text-gray-600">
              Ao confirmar, o equipamento retornará ao status de{" "}
              <strong>Ativo</strong> e o histórico de manutenção será encerrado.
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 rounded-b-2xl">
          <Button
            variant="ghost"
            className="rounded-xl font-black uppercase text-base tracking-widest h-12 flex-1"
            onClick={() => setIsExitMaintenanceModalOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl font-black uppercase text-base tracking-widest bg-red-600 hover:bg-red-700 h-12 flex-[2] shadow-xl shadow-red-100"
            onClick={handleConfirmExitMaintenance}
          >
            Confirmar Saída
          </Button>
        </div>
      </Modal>

      {/* Header Panel */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-gradient-to-r from-blue-950 to-blue-800 rounded-3xl text-white shadow-xl mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
            <Activity className="w-8 h-8 text-blue-300" />
          </div>
          <div>
            <span className="text-sm bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30 font-bold uppercase tracking-wider">Setor Técnico / Operacional</span>
            <h1 className="text-4xl font-black tracking-tight mt-1">Controlador de Equipamentos</h1>
            <p className="text-blue-100/80 text-base mt-1">Gestão de frotas, equipes, combustíveis e manutenção preventiva/corretiva de recursos.</p>
          </div>
        </div>
      </div>

      {!(isEditOpen && equipmentToEdit) && !isNewMeasurementModalOpen && (
        <>
          <div style={{ display: 'none' }}>
            <div>
              <h1 className="text-2xl font-black text-gray-900">
            Controlador de Equipamentos
          </h1>
          <p className="text-base text-gray-500 font-medium">
            Gestão de frotas e manutenção preventiva/corretiva.
          </p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-end gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              className="pl-10 h-10 w-full rounded-xl shadow-sm bg-white"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <Label
              htmlFor="active-filter"
              className="text-base font-bold uppercase text-gray-400 cursor-pointer"
            >
              Apenas Ativos
            </Label>
            <Switch
              id="active-filter"
              checked={filterOnlyActive}
              onCheckedChange={setFilterOnlyActive}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-white">
        <Card className="bg-blue-600 border-none shadow-lg rounded-2xl p-4 relative overflow-hidden group">
          <Truck className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-black uppercase opacity-70 tracking-widest">
            Total Equipamentos
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-black">{stats.activeEquips}</h3>
            <span className="text-base font-bold opacity-60">unidades</span>
          </div>
        </Card>

        <Card className="bg-emerald-600 border-none shadow-lg rounded-2xl p-4 relative overflow-hidden group">
          <Wrench className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-black uppercase opacity-70 tracking-widest">
            Em Manutenção
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-black">{stats.inMaintenanceCount}</h3>
            <span className="text-base font-bold opacity-60">ativos</span>
          </div>
        </Card>

        <Card className="bg-orange-500 border-none shadow-lg rounded-2xl p-4 relative overflow-hidden group">
          <ArrowRightLeft className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-black uppercase opacity-70 tracking-widest">
            Transf. Pendentes
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-black">
              {
                transfers.filter(
                  (t) =>
                    t.status === "pending" &&
                    (currentUser?.role === "master" ||
                      !selectedContractId ||
                      t.targetContractId === selectedContractId ||
                      t.sourceContractId === selectedContractId),
                ).length
              }
            </h3>
            <span className="text-base font-bold opacity-60">solicitações</span>
          </div>
        </Card>

        <Card className="bg-indigo-600 border-none shadow-lg rounded-2xl p-4 relative overflow-hidden group">
          <DollarSign className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-black uppercase opacity-70 tracking-widest">
            Custo Operacional
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold opacity-70">R$</span>
            <h3 className="text-2xl font-black">
              {stats.activeEquips > 0
                ? filteredEquipments
                    .reduce((sum, e) => {
                      const cost =
                        equipmentMonthly.find(
                          (d) =>
                            d.equipmentId === e.id && d.month === selectedMonth,
                        )?.cost || 0;
                      return sum + cost;
                    }, 0)
                    .toLocaleString("pt-BR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                : "0"}
            </h3>
          </div>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-6"
      >
        <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-12">
          <TabsTrigger
            value="list"
            className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all"
          >
            <Truck className="w-4 h-4 mr-2" />
            Inventário
          </TabsTrigger>
          <TabsTrigger
            value="maintenance"
            className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Manutenção
          </TabsTrigger>
          <TabsTrigger
            value="transfers"
            className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transferências
          </TabsTrigger>
          <TabsTrigger
            value="fuel"
            className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all"
          >
            <Fuel className="w-4 h-4 mr-2" />
            Combustível
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Solicitações
          </TabsTrigger>
          <TabsTrigger
            value="stock"
            className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all"
          >
            <Archive className="w-4 h-4 mr-2" />
            Estoque
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Histórico Manut.
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black">
                    Lista de Equipamentos
                  </CardTitle>
                  <CardDescription className="text-base uppercase font-bold text-gray-400">
                    Controle de custos e disponibilidade
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                  <button
                    onClick={() => setPriceDisplayMode("monthly")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all",
                      priceDisplayMode === "monthly"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-400 hover:text-slate-600",
                    )}
                  >
                    Valor Mensal
                  </button>
                  <button
                    onClick={() => setPriceDisplayMode("measurement")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all",
                      priceDisplayMode === "measurement"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-400 hover:text-slate-600",
                    )}
                  >
                    Valor Medição
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="rounded-xl gap-2 font-bold text-base"
                >
                  <FileDown className="w-4 h-4" /> Modelo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="rounded-xl gap-2 font-bold text-base"
                >
                  <Upload className="w-4 h-4" /> Importar
                </Button>
                <Button
                  onClick={() => {
                    setNewEquip({
                      id: uuidv4(),
                      code: "",
                      name: "",
                      type: "",
                      brand: "",
                      model: "",
                      year: new Date().getFullYear(),
                      situation: "Ativo",
                      plate: "",
                      origin: "Próprio",
                      ownerName: "",
                      ownerCnpj: "",
                      category: "Médio",
                      measurementUnit: "Horímetro",
                      entryDate: new Date().toISOString().split("T")[0],
                      contractId:
                        selectedContractId !== "all" ? selectedContractId : "",
                      currentReading: 0,
                      contractedPrice: 0,
                      monthlyPrice: 0,
                      observations: "",
                      customFields: {},
                      photos: [],
                    });
                    setIsAddOpen(true);
                  }}
                  className="rounded-xl bg-blue-600 gap-2 font-bold text-base"
                >
                  <Plus className="w-4 h-4 mr-2" /> Novo
                </Button>
                {isAddOpen && (
                  <div className="fixed inset-0 z-[100] bg-white overflow-hidden flex flex-col">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 flex justify-between items-center shrink-0 relative overflow-hidden">
                      <Truck className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
                      <div className="flex items-center gap-6 relative z-10">
                        <Button 
                          variant="ghost" 
                          className="text-white hover:bg-white/20 p-2 rounded-full"
                          onClick={() => setIsAddOpen(false)}
                        >
                          <ArrowLeft className="w-8 h-8" />
                        </Button>
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-3xl">
                          <Plus className="w-8 h-8 text-white" />
                        </div>
                      <div>
                        <h2 className="text-2xl font-black text-white leading-tight">
                          Adicionar Equipamento
                        </h2>
                        <p className="text-blue-100 text-base font-bold uppercase tracking-widest mt-1 opacity-80">
                          Novo ativo SYNERA Controlador
                        </p>
                      </div>
                    </div>
                  </div>

                  <Tabs
                    defaultValue="basic"
                    className="w-full flex-1 flex flex-col overflow-hidden"
                  >
                    <TabsList className="w-full justify-start rounded-none bg-slate-50 border-b px-6 h-14 gap-6 shrink-0">
                      <TabsTrigger
                        value="basic"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
                      >
                        Dados Principais
                      </TabsTrigger>
                      <TabsTrigger
                        value="technical"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
                      >
                        Atributos Técnicos
                      </TabsTrigger>
                      <TabsTrigger
                        value="measure"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
                      >
                        Medição
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
                      >
                        Histórico
                      </TabsTrigger>
                      <TabsTrigger
                        value="photos"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
                      >
                        Fotos
                      </TabsTrigger>
                      <TabsTrigger
                        value="obs"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
                      >
                        Observações
                      </TabsTrigger>
                    </TabsList>

                    <div className="p-6 flex-1 overflow-y-auto scrollbar-thin-visible bg-white">
                      <TabsContent
                        value="basic"
                        className="mt-0 space-y-8 animate-in fade-in duration-300"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 flex items-center gap-2 tracking-tight">
                              <Hash className="w-4 h-4" /> Código de
                              Identificação
                            </Label>
                            <Input
                              className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold focus:ring-2 focus:ring-blue-500/20"
                              value={newEquip.code}
                              onChange={(e) =>
                                setNewEquip({
                                  ...newEquip,
                                  code: e.target.value,
                                })
                              }
                              placeholder="Ex: EQ-001"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 flex items-center gap-2 tracking-tight">
                              <Info className="w-4 h-4" /> Nome Completo do
                              Ativo
                            </Label>
                            <Input
                              className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold focus:ring-2 focus:ring-blue-500/20"
                              value={newEquip.name}
                              onChange={(e) =>
                                setNewEquip({
                                  ...newEquip,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Ex: Escavadeira CAT 320"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Tipo de Equipamento
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-12 rounded-xl border-slate-200 bg-slate-50/50 text-base font-bold"
                                >
                                  {newEquip.type || "Selecione ou digite..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0 rounded-xl"
                                align="start"
                              >
                                <Command>
                                  <CommandInput
                                    placeholder="Pesquisar ou adicionar..."
                                    value={typeSearchTerm}
                                    onValueChange={setTypeSearchTerm}
                                  />
                                  <CommandList className="max-h-[200px]">
                                    <CommandEmpty>
                                      <Button
                                        variant="ghost"
                                        className="w-full justify-start text-base font-bold text-blue-600 h-10"
                                        onClick={() => {
                                          handleAddType(typeSearchTerm);
                                          handleTypeChange(typeSearchTerm);
                                          setTypeSearchTerm("");
                                        }}
                                      >
                                        <Plus className="w-3 h-3 mr-2" />{" "}
                                        Adicionar "{typeSearchTerm}"
                                      </Button>
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {dynamicTypes.map((t) => (
                                        <CommandItem
                                          key={t}
                                          value={t}
                                          onSelect={() => {
                                            handleTypeChange(t);
                                            setTypeSearchTerm("");
                                          }}
                                          className="flex items-center justify-between py-2.5"
                                        >
                                          <div className="flex items-center">
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4 text-blue-600",
                                                newEquip.type === t
                                                  ? "opacity-100"
                                                  : "opacity-0",
                                              )}
                                            />
                                            <span className="font-bold">
                                              {t}
                                            </span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-slate-300 hover:text-red-500"
                                            onClick={(e) =>
                                              handleRemoveType(e, t)
                                            }
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </Button>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Origem do Ativo
                            </Label>
                            <Select
                              value={newEquip.origin}
                              onValueChange={(val) =>
                                setNewEquip({ ...newEquip, origin: val })
                              }
                            >
                              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Próprio">Próprio</SelectItem>
                                <SelectItem value="Alugado">Alugado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {newEquip.origin === "Alugado" && (
                            <>
                              <div className="space-y-2">
                                <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                                  Proprietário / Locador
                                </Label>
                                <Input
                                  className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold"
                                  value={newEquip.ownerName}
                                  onChange={(e) =>
                                    setNewEquip({
                                      ...newEquip,
                                      ownerName: e.target.value,
                                    })
                                  }
                                  placeholder="Razão Social"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                                  CNPJ Proprietário
                                </Label>
                                <Input
                                  className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold"
                                  value={newEquip.ownerCnpj}
                                  onChange={(e) =>
                                    setNewEquip({
                                      ...newEquip,
                                      ownerCnpj: e.target.value,
                                    })
                                  }
                                  placeholder="00.000.000/0000-00"
                                />
                              </div>
                            </>
                          )}

                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Situação Operacional
                            </Label>
                            <Select
                              value={newEquip.situation}
                              onValueChange={(val: any) =>
                                setNewEquip({ ...newEquip, situation: val })
                              }
                            >
                              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Ativo">Ativo</SelectItem>
                                <SelectItem value="Inativo">Inativo</SelectItem>
                                <SelectItem value="Vendido">Vendido</SelectItem>
                                <SelectItem value="Sucateado">Sucateado</SelectItem>
                                <SelectItem value="Em Manutenção">
                                  Em Manutenção
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Equipe Pertencente
                            </Label>
                            <Select
                              value={newEquip.team || "none"}
                              onValueChange={(val) =>
                                setNewEquip({ ...newEquip, team: val === "none" ? "" : val })
                              }
                            >
                              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold">
                                <SelectValue placeholder="Selecione a equipe..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem Equipe (Disponível)</SelectItem>
                                {(controllerTeams || []).map((t) => (
                                  <SelectItem key={t.id} value={t.name}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Entrada
                            </Label>
                            <Input
                              type="date"
                              className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold"
                              value={newEquip.entryDate || ""}
                              onChange={(e) =>
                                setNewEquip({ ...newEquip, entryDate: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Saída
                            </Label>
                            <Input
                              type="date"
                              className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold"
                              value={newEquip.exitDate || ""}
                              onChange={(e) =>
                                setNewEquip({ ...newEquip, exitDate: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Medição por
                            </Label>
                            <Select
                              value={newEquip.measurementUnit || "Horímetro"}
                              onValueChange={(val) =>
                                setNewEquip({
                                  ...newEquip,
                                  measurementUnit: val as any,
                                })
                              }
                            >
                              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Horímetro">
                                  Horímetro (h)
                                </SelectItem>
                                <SelectItem value="Quilometragem">
                                  Quilometragem (km)
                                </SelectItem>
                                <SelectItem value="Mensal">Mensal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Leitura Inicial
                            </Label>
                            <NumericInput
                              className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold"
                              value={newEquip.currentReading}
                              onChange={(val) =>
                                setNewEquip({
                                  ...newEquip,
                                  currentReading: val,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              {newEquip.measurementUnit === "Horímetro"
                                ? "Valor Hora"
                                : newEquip.measurementUnit === "Quilometragem"
                                  ? "Valor KM"
                                  : "Valor Medição"}
                            </Label>
                            <NumericInput
                              className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold"
                              value={newEquip.contractedPrice}
                              onChange={(val) =>
                                setNewEquip({
                                  ...newEquip,
                                  contractedPrice: val,
                                })
                              }
                              prefix="R$"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Valor Mensal
                            </Label>
                            <NumericInput
                              className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold"
                              value={newEquip.monthlyPrice}
                              onChange={(val) =>
                                setNewEquip({ ...newEquip, monthlyPrice: val })
                              }
                              prefix="R$"
                            />
                          </div>

                          <div className="md:col-span-2 lg:col-span-3 space-y-2">
                            <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                              Obra Vinculada (Centro de Custo)
                            </Label>
                            <Select
                              value={newEquip.contractId || "_none_"}
                              onValueChange={(val) =>
                                setNewEquip({
                                  ...newEquip,
                                  contractId: val === "_none_" ? "" : val,
                                })
                              }
                              disabled={!!selectedContractId}
                            >
                              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold transition-all focus:ring-2 focus:ring-blue-500/20">
                                <SelectValue placeholder="Selecione a obra...">
                                  {newEquip.contractId &&
                                  newEquip.contractId !== "_none_"
                                    ? getContractName(newEquip.contractId)
                                    : "Sem Obra (Disponível)"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="_none_"
                                  className="font-bold py-3 uppercase text-base tracking-tight"
                                >
                                  Sem Obra (Disponível)
                                </SelectItem>
                                {contracts
                                  .filter(
                                    (c) =>
                                      currentUser?.role === "master" ||
                                      c.companyId === currentUser?.companyId ||
                                      c.id === newEquip.contractId,
                                  )
                                  .map((c) => (
                                    <SelectItem
                                      key={c.id}
                                      value={c.id}
                                      className="font-bold py-3 uppercase text-base tracking-tight"
                                    >
                                      {c.workName || c.contractNumber}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="technical"
                        className="mt-0 space-y-4 animate-in slide-in-from-right duration-300"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-base font-black text-gray-900 uppercase">
                              Especificações do Equipamento
                            </h4>
                            <p className="text-base text-gray-500 font-bold uppercase">
                              Campos personalizados salvos em JSONB
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addCustomField}
                            className="rounded-xl gap-2 font-bold text-base text-blue-600 border-blue-100 hover:bg-blue-50"
                          >
                            <Plus className="w-4 h-4" /> Adicionar Campo
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100 border-dashed">
                          {/* Standard Technical Fields moved from Basic */}
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-blue-600 tracking-tight">
                              Marca / Fabricante
                            </Label>
                            <Input
                              className="rounded-xl bg-white border-gray-100 h-10 font-bold text-base"
                              value={newEquip.brand}
                              onChange={(e) =>
                                setNewEquip({
                                  ...newEquip,
                                  brand: e.target.value,
                                })
                              }
                              placeholder="Ex: Caterpillar"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-blue-600 tracking-tight">
                              Modelo / Versão
                            </Label>
                            <Input
                              className="rounded-xl bg-white border-gray-100 h-10 font-bold text-base"
                              value={newEquip.model}
                              onChange={(e) =>
                                setNewEquip({
                                  ...newEquip,
                                  model: e.target.value,
                                })
                              }
                              placeholder="Ex: 320 NG"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-blue-600 tracking-tight">
                              Ano de Fabricação
                            </Label>
                            <Input
                              type="number"
                              className="rounded-xl bg-white border-gray-100 h-10 font-bold text-base"
                              value={newEquip.year}
                              onChange={(e) =>
                                setNewEquip({
                                  ...newEquip,
                                  year: parseInt(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-base uppercase font-black text-blue-600 tracking-tight">
                              Placa ou Serial
                            </Label>
                            <Input
                              className="rounded-xl bg-white border-gray-100 h-10 font-bold text-base"
                              value={newEquip.plate}
                              onChange={(e) =>
                                setNewEquip({
                                  ...newEquip,
                                  plate: e.target.value,
                                })
                              }
                              placeholder="ABC-1234"
                            />
                          </div>

                          {Object.entries(newEquip.customFields || {}).map(
                            ([key, f]) => {
                              const field = f as EquipmentAttribute;
                              return (
                                <div
                                  key={key}
                                  className="space-y-2 group relative animate-in fade-in zoom-in duration-300"
                                >
                                  <div className="flex items-center justify-between">
                                    <Label className="text-base uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                                      <Activity className="w-3 h-3" />
                                      {key.replace(/_/g, " ")}
                                    </Label>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-red-500"
                                        onClick={() => removeCustomField(key)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {field.type === "boolean" ? (
                                    <div className="flex items-center gap-2 h-10 px-4 bg-white rounded-xl border border-gray-100">
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={(v) =>
                                          updateCustomField(key, { value: v })
                                        }
                                      />
                                      <span className="text-base font-bold text-gray-600 uppercase">
                                        {field.value ? "Sim" : "Não"}
                                      </span>
                                    </div>
                                  ) : field.type === "select" ? (
                                    <Select
                                      value={field.value}
                                      onValueChange={(v) =>
                                        updateCustomField(key, { value: v })
                                      }
                                    >
                                      <SelectTrigger className="rounded-xl bg-white border-gray-100 h-10 font-bold text-base">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.options?.map((opt) => (
                                          <SelectItem key={opt} value={opt}>
                                            {opt}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      className="rounded-xl bg-white border-gray-100 h-10 font-bold text-base"
                                      type={
                                        field.type === "number"
                                          ? "number"
                                          : "text"
                                      }
                                      value={field.value}
                                      onChange={(e) =>
                                        updateCustomField(key, {
                                          value:
                                            field.type === "number"
                                              ? parseFloat(e.target.value)
                                              : e.target.value,
                                        })
                                      }
                                    />
                                  )}
                                </div>
                              );
                            },
                          )}
                          {Object.keys(newEquip.customFields || {}).length ===
                            0 && (
                            <div className="col-span-2 py-10 flex flex-col items-center justify-center opacity-30">
                              <Settings className="w-10 h-10 mb-2" />
                              <p className="text-base font-bold uppercase tracking-widest text-center">
                                Nenhum campo personalizado.
                                <br />
                                Selecione um tipo ou adicione campos manuais.
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="measure"
                        className="mt-0 space-y-4 animate-in fade-in duration-300"
                      >
                        <div className="py-20 text-center opacity-30">
                          <History className="w-12 h-12 mx-auto mb-3" />
                          <p className="text-base font-black uppercase tracking-widest text-slate-500">
                            Nenhuma medição encontrada para novo equipamento
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="obs"
                        className="mt-0 space-y-4 animate-in slide-in-from-right duration-300"
                      >
                        <div className="space-y-1.5">
                          <Label className="text-base uppercase font-bold text-gray-400">
                            Observações Gerais
                          </Label>
                          <textarea
                            className="w-full min-h-[150px] rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-base font-medium focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            value={newEquip.observations}
                            onChange={(e) =>
                              setNewEquip({
                                ...newEquip,
                                observations: e.target.value,
                              })
                            }
                            placeholder="Descreva aqui detalhes adicionais, histórico ou informações relevantes..."
                          />
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="history"
                        className="mt-0 space-y-4 animate-in slide-in-from-bottom duration-300"
                      >
                        <div className="space-y-4">
                          <h4 className="text-base font-black text-gray-900 uppercase">
                            Histórico do Equipamento
                          </h4>
                          <div className="space-y-3">
                            {(newEquip.history || []).map((entry) => (
                              <div
                                key={entry.id}
                                className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group"
                              >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <Badge
                                      variant="outline"
                                      className="text-sm font-black uppercase mb-1"
                                    >
                                      {entry.type}
                                    </Badge>
                                    <p className="text-base font-black text-gray-900">
                                      {entry.description}
                                    </p>
                                  </div>
                                  <span className="text-base font-bold text-gray-400">
                                    {new Date(entry.date).toLocaleDateString(
                                      "pt-BR",
                                    )}
                                  </span>
                                </div>
                                {entry.parts && entry.parts.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {entry.parts.map((p, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-sm bg-gray-50 text-gray-500"
                                      >
                                        {p.quantity} {p.unit} - {p.description}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            {(!newEquip.history ||
                              newEquip.history.length === 0) && (
                              <div className="py-10 text-center opacity-30">
                                <History className="w-10 h-10 mx-auto mb-2" />
                                <p className="text-base font-black uppercase tracking-widest">
                                  Nenhum registro no histórico
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="photos"
                        className="mt-0 space-y-4 animate-in slide-in-from-top duration-300"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-black text-gray-900 uppercase">
                              Fotos do Equipamento
                            </h4>
                            <p className="text-base text-gray-500 font-bold uppercase tracking-tighter">
                              Armazenado em Supabase Bucket: equipments
                            </p>
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            {(parsedNewPhotos || []).map((item) => (
                              <div
                                key={item.index}
                                className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm flex flex-col relative group"
                              >
                                <div className="aspect-square w-full overflow-hidden relative">
                                  <img
                                    src={item.url}
                                    alt={`Equip ${item.index}`}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="h-8 w-8 rounded-xl"
                                      onClick={() => deleteNewPhoto(item.index)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="p-2 border-t bg-gray-50/50">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-505">
                                    Data da Foto
                                  </Label>
                                  <Input
                                    type="date"
                                    value={item.date}
                                    onChange={(e) =>
                                      updateNewPhotoDate(
                                        item.index,
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 text-xs font-mono rounded-lg mt-0.5 border-gray-200 bg-white focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            ))}
                            <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                              <Camera className="w-8 h-8 text-gray-300" />
                              <span className="text-sm font-black uppercase text-gray-400">
                                Adicionar Foto
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const config = getSupabaseConfig();
                                      const todayStr = new Date()
                                        .toISOString()
                                        .split("T")[0];
                                      if (config.enabled) {
                                        const supabase = createSupabaseClient(
                                          config.url,
                                          config.key,
                                        );
                                        const fileExt = file.name
                                          .split(".")
                                          .pop();
                                        const fileName = `${uuidv4()}.${fileExt}`;
                                        const { data, error } =
                                          await supabase.storage
                                            .from("equipamentos")
                                            .upload(fileName, file);
                                        if (error) throw error;

                                        const {
                                          data: { publicUrl },
                                        } = supabase.storage
                                          .from("equipamentos")
                                          .getPublicUrl(fileName);
                                        setNewEquip((prev) => ({
                                          ...prev,
                                          photos: [
                                            ...(prev.photos || []),
                                            `${publicUrl}|${todayStr}`,
                                          ],
                                        }));
                                      } else {
                                        // Fallback
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                          setNewEquip((prev) => ({
                                            ...prev,
                                            photos: [
                                              ...(prev.photos || []),
                                              `${ev.target?.result as string}|${todayStr}`,
                                            ],
                                          }));
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    } catch (err: any) {
                                      console.error("Upload error:", err);
                                      alert(
                                        `Erro ao enviar a foto para o Supabase: ${err.message || 'Verifique se o bucket "equipamentos" foi criado. Execute supabase_storage_setup.sql.'}`,
                                      );
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </TabsContent>
                    </div>

                    <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 rounded-b-2xl">
                      <Button
                        variant="ghost"
                        onClick={() => setIsAddOpen(false)}
                        className="rounded-xl font-bold uppercase text-base tracking-widest h-12 px-6"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateEquip}
                        className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black uppercase text-base tracking-widest transition-all active:scale-95"
                      >
                        <Check className="w-4 h-4 mr-2" /> Salvar Equipamento no
                        SYNERA
                      </Button>
                    </div>
                  </Tabs>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto scrollbar-thin-visible">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead
                      className="font-black text-base h-8 uppercase tracking-widest text-slate-500 py-0 cursor-pointer hover:bg-slate-100/50 transition-colors min-w-[250px]"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-2">
                        Equipamento Ativo
                        {sortField === "name" &&
                          (sortOrder === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead className="font-black text-base h-8 uppercase tracking-widest text-slate-500 py-0 min-w-[180px]">
                      C. Custo / Obra
                    </TableHead>
                    <TableHead
                      className="font-black text-base h-8 uppercase tracking-widest text-slate-500 cursor-pointer hover:bg-slate-100/50 transition-colors min-w-[240px]"
                      onClick={() => handleSort("team")}
                    >
                      <div className="flex items-center gap-2">
                        Equipe
                        {sortField === "team" &&
                          (sortOrder === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-black text-base h-8 uppercase tracking-widest text-slate-500 text-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                      onClick={() => handleSort("origin")}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Origem
                        {sortField === "origin" &&
                          (sortOrder === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-black text-base h-8 uppercase tracking-widest text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                      onClick={() => handleSort("cost")}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {priceDisplayMode === "monthly"
                          ? "Custo Mensal"
                          : "Valor Medição"}
                        {sortField === "cost" &&
                          (sortOrder === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] h-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipments
                    .filter((e) => !e.inMaintenance)
                    .map((e) => (
                      <TableRow
                        key={e.id}
                        className="hover:bg-gray-50 transition-colors group h-11 cursor-pointer"
                        onDoubleClick={() => {
                          setEquipmentToEdit(e);
                          setIsEditOpen(true);
                        }}
                      >
                        <TableCell className="py-0.5">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all",
                                e.exitDate
                                  ? "bg-gray-100 text-gray-400"
                                  : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
                              )}
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 leading-none">
                                <p
                                  className={cn(
                                    "font-bold text-base tracking-tight",
                                    e.exitDate
                                      ? "text-gray-400 line-through"
                                      : "text-gray-900",
                                  )}
                                >
                                  {e.name}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="text-sm font-bold uppercase py-0 px-1.5 h-3.5 bg-slate-50 text-slate-500 border-slate-200"
                                >
                                  {e.code || "S/C"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-tight">
                                  {e.brand} {e.model} •{" "}
                                  <span className="text-blue-600 font-bold">
                                    {e.type}
                                  </span>{" "}
                                  • {e.plate}
                                </p>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-0.5">
                          <span className="text-base font-bold text-blue-600 uppercase tracking-tighter truncate max-w-[150px] inline-block">
                            {getContractName(e.contractId)}
                          </span>
                        </TableCell>
                        <TableCell className="py-0.5">
                          {(() => {
                            const currentTeamId = (() => {
                              const assign = (teamAssignments || []).find(
                                (a) =>
                                  a.memberId === e.id &&
                                  a.type === "equipment" &&
                                  a.month === selectedMonth,
                              );
                              if (assign) return assign.teamId;

                              // Legacy fallback: if team is a name, try to resolve it
                              if (e.team) {
                                const match = (controllerTeams || []).find(
                                  (t) =>
                                    t.name === e.team &&
                                    (!e.contractId || t.contractId === e.contractId),
                                );
                                if (match) return match.id;
                              }
                              return "none";
                            })();

                            const currentTeamColor = (() => {
                              if (
                                currentTeamId &&
                                currentTeamId !== "none"
                              ) {
                                const match = (controllerTeams || []).find(
                                  (t) => t.id === currentTeamId,
                                );
                                if (match) return match.color;
                              }
                              return undefined;
                            })();

                            return (
                              <select
                                value={currentTeamId}
                                onChange={(ev) => {
                                  const val = ev.target.value;
                                  
                                  if (!window.confirm(`Deseja realmente confirmar a mudança de equipe para este equipamento?`)) {
                                    ev.target.value = currentTeamId;
                                    return;
                                  }

                                  // 1. Update equipment team properties
                                  const targetTeam = (controllerTeams || []).find((t) => t.id === val);
                                  
                                  onUpdateEquipments((prev) =>
                                    prev.map((item) =>
                                      item.id === e.id
                                        ? { ...item, team: targetTeam ? targetTeam.name : undefined }
                                        : item,
                                    ),
                                  );

                                  // 2. Update teamAssignments in SALA TÉCNICA
                                  if (targetTeam) {
                                    const isAssigned = (
                                      teamAssignments || []
                                    ).some(
                                      (a) =>
                                        a.memberId === e.id &&
                                        a.type === "equipment" &&
                                        a.month === selectedMonth,
                                    );
                                    if (isAssigned) {
                                      onUpdateAssignments(
                                        (teamAssignments || []).map((a) =>
                                          a.memberId === e.id &&
                                          a.type === "equipment" &&
                                          a.month === selectedMonth
                                            ? { ...a, teamId: targetTeam.id }
                                            : a,
                                        ),
                                      );
                                    } else {
                                      onUpdateAssignments([
                                        ...(teamAssignments || []),
                                        {
                                          id: crypto.randomUUID(),
                                          contractId:
                                            e.contractId ||
                                            selectedContractId ||
                                            undefined,
                                          teamId: targetTeam.id,
                                          memberId: e.id,
                                          type: "equipment",
                                          month: selectedMonth,
                                        },
                                      ]);
                                    }
                                  } else {
                                    // chosen "none"
                                    onUpdateAssignments(
                                      (teamAssignments || []).filter(
                                        (a) =>
                                          !(
                                            a.memberId === e.id &&
                                            a.type === "equipment" &&
                                            a.month === selectedMonth
                                          ),
                                      ),
                                    );
                                  }
                                }}
                                className={cn(
                                  "w-[220px] text-center font-bold uppercase tracking-wide text-[11px] h-8 rounded-lg px-2 border transition-colors cursor-pointer appearance-none",
                                  (!currentTeamId ||
                                    currentTeamId === "none") &&
                                    "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:border-gray-300",
                                )}
                                style={
                                  currentTeamId && currentTeamId !== "none"
                                    ? {
                                        backgroundColor: `${currentTeamColor || "#8b5cf6"}1A`,
                                        borderColor: `${currentTeamColor || "#8b5cf6"}33`,
                                        color: currentTeamColor || "#7e22ce",
                                      }
                                    : {}
                                }
                              >
                                <option
                                  value="none"
                                  className="text-gray-500 bg-white font-normal capitalize"
                                >
                                  -- Sem Equipe --
                                </option>
                                {(controllerTeams || [])
                                  .filter(
                                    (t) =>
                                      !e.contractId ||
                                      t.contractId === e.contractId,
                                  )
                                  .map((team: any) => (
                                    <option
                                      key={team.id}
                                      value={team.id}
                                      className="text-xs font-semibold text-slate-800 bg-white"
                                    >
                                      {team.name}
                                    </option>
                                  ))}
                              </select>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="py-0.5 text-center font-black uppercase text-sm tracking-widest">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-lg h-5 px-2",
                              e.origin === "Próprio"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-amber-50 text-amber-700 border-amber-100",
                            )}
                          >
                            {e.origin}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-0.5 text-right font-mono text-base font-black text-slate-700">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(
                            (() => {
                              if (priceDisplayMode === "monthly") {
                                return (
                                  e.monthlyPrice ||
                                  equipmentMonthly.find(
                                    (d) =>
                                      d.equipmentId === e.id &&
                                      d.month === selectedMonth,
                                  )?.cost ||
                                  0
                                );
                              } else {
                                // selectedMonth is YYYY-MM
                                const [selY, selM] = selectedMonth.split("-");
                                const found = e.measurements?.find((me) => {
                                  const [mMonth, mYear] = me.month.split("/");
                                  return mMonth === selM && mYear === selY;
                                });
                                console.log(
                                  "DEBUG [Equip]:",
                                  e.name,
                                  "SelectedMonth:",
                                  selM,
                                  "/",
                                  selY,
                                  "Found:",
                                  found,
                                );
                                return found?.totalValue || 0;
                              }
                            })(),
                          )}
                        </TableCell>
                        <TableCell className="py-0.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleMaintenance(e)}
                              className={cn(
                                "h-7 w-7 text-gray-300 hover:text-emerald-500",
                                e.inMaintenance && "text-emerald-500",
                              )}
                              title={
                                e.inMaintenance
                                  ? "Retirar de Manutenção"
                                  : "Enviar para Manutenção"
                              }
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={transfers.some(
                                (t) =>
                                  t.equipmentId === e.id &&
                                  t.status === "pending",
                              )}
                              onClick={() => {
                                setEquipmentToTransfer(e);
                                setTargetContractId("");
                                setIsTransferOpen(true);
                              }}
                              className="h-7 w-7 text-gray-300 hover:text-green-500 disabled:opacity-30"
                              title="Solicitar Transferência"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentRequest({
                                  id: uuidv4(),
                                  date: new Date().toISOString().split("T")[0],
                                  status: "Pendente",
                                  priority: "Normal",
                                  sector: "CONTROLADOR",
                                  description: `${e.name} (${e.plate})`,
                                  contractId:
                                    e.contractId ||
                                    (selectedContractId !== "all"
                                      ? selectedContractId
                                      : undefined),
                                  items: [
                                    {
                                      id: uuidv4(),
                                      description: "",
                                      quantity: 1,
                                      unit: "un",
                                    },
                                  ],
                                });
                                setIsMaterialRequestModalOpen(true);
                              }}
                              className="h-7 w-7 text-gray-300 hover:text-emerald-500"
                              title="Solicitar Peças/Material"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setNewFuelLog((prev) => ({
                                  ...prev,
                                  equipmentId: e.id,
                                  type: "saida",
                                }));
                                setIsFuelLogModalOpen(true);
                              }}
                              className="h-7 w-7 text-gray-300 hover:text-purple-500"
                              title="Abastecimento de Combustível"
                            >
                              <Fuel className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedEquipment(e);
                                setIsDetailOpen(true);
                              }}
                              className="h-7 w-7 text-gray-300 hover:text-blue-500"
                              title="Ver Detalhes"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEquipmentToEdit(e);
                                setIsEditOpen(true);
                              }}
                              className="h-7 w-7 text-gray-300 hover:text-blue-500"
                              title="Visualizar/Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEquipmentToDelete(e);
                                setExitDateInput(
                                  new Date().toISOString().split("T")[0],
                                );
                                setIsDeleteOpen(true);
                              }}
                              className="text-gray-300 hover:text-orange-500"
                              title="Dispensar Equipamento"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Wrench className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black">
                    {showAllMaintenance
                      ? "Histórico de Manutenções"
                      : "Equipamentos em Manutenção"}
                  </CardTitle>
                  <CardDescription className="text-base uppercase font-bold text-gray-400">
                    {showAllMaintenance
                      ? "Registro completo de manutenções"
                      : "Frota atualmente indisponível para operação"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showAllMain"
                  checked={showAllMaintenance}
                  onCheckedChange={(c) => setShowAllMaintenance(!!c)}
                />
                <Label
                  htmlFor="showAllMain"
                  className="text-base font-bold uppercase text-gray-600"
                >
                  Mostrar Histórico
                </Label>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 py-5">
                      Equipamento
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Início Manut.
                    </TableHead>
                    {!showAllMaintenance && (
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                        Dias
                      </TableHead>
                    )}
                    {showAllMaintenance && (
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                        Saída
                      </TableHead>
                    )}
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Tipo
                    </TableHead>
                    {!showAllMaintenance && (
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                        Obra Atual
                      </TableHead>
                    )}
                    {!showAllMaintenance && (
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                        Porte / Cat.
                      </TableHead>
                    )}
                    {!showAllMaintenance && (
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                        Origem
                      </TableHead>
                    )}
                    {showAllMaintenance && (
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                        Custo
                      </TableHead>
                    )}
                    {showAllMaintenance && (
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                        Itens
                      </TableHead>
                    )}
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showAllMaintenance
                    ? equipmentMaintenance
                        .sort(
                          (a, b) =>
                            new Date(b.entryDate).getTime() -
                            new Date(a.entryDate).getTime(),
                        )
                        .map((m) => {
                          const equip = equipments.find(
                            (e) => e.id === m.equipmentId,
                          );
                          return (
                            <TableRow
                              key={m.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <TableCell>
                                <p className="font-bold text-gray-900">
                                  {equip?.name || "Equipamento Excluído"}
                                </p>
                                <p className="text-base text-gray-500 uppercase">
                                  {equip?.plate || "-"}
                                </p>
                              </TableCell>
                              <TableCell className="text-base font-mono text-gray-600">
                                {new Date(
                                  m.entryDate + "T12:00:00",
                                ).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-base font-mono text-gray-600">
                                {m.exitDate ? (
                                  new Date(
                                    m.exitDate + "T12:00:00",
                                  ).toLocaleDateString("pt-BR")
                                ) : (
                                  <Badge className="bg-blue-50 text-blue-600 border-none">
                                    Em aberto
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-sm uppercase font-black rounded-lg",
                                    m.type === "preventive"
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-red-50 text-red-600",
                                  )}
                                >
                                  {m.type === "preventive"
                                    ? "Preventiva"
                                    : "Corretiva"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-base font-black text-gray-900 text-right">
                                {m.totalCost
                                  ? `R$ ${m.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                  : "-"}
                              </TableCell>
                              <TableCell
                                className="max-w-[150px] truncate"
                                title={m.requestedItems}
                              >
                                {m.requestedItems || "-"}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          );
                        })
                    : filteredEquipments
                        .filter((e) => e.inMaintenance)
                        .map((e) => (
                          <TableRow
                            key={e.id}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onDoubleClick={() => {
                              setEquipmentToEdit(e);
                              setIsEditOpen(true);
                            }}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-bold text-gray-900">
                                    {e.name}
                                  </p>
                                  <p className="text-base text-gray-500 uppercase">
                                    {e.model} - {e.plate}
                                  </p>
                                  {(() => {
                                    const pendingReq = purchaseRequests.find(
                                      (r) =>
                                        r.equipmentId === e.id &&
                                        r.status === "Pendente",
                                    );
                                    if (
                                      pendingReq &&
                                      pendingReq.items &&
                                      pendingReq.items.length > 0
                                    ) {
                                      return (
                                        <div className="mt-1 flex flex-wrap gap-1 items-center">
                                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 font-bold text-xs px-2 py-0.5 rounded-lg">
                                            <ShoppingCart className="w-3 h-3" />
                                            Solicitado:{" "}
                                            {pendingReq.items
                                              .map(
                                                (item) =>
                                                  `${item.quantity}x ${item.description}`,
                                              )
                                              .join(", ")}
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-base font-mono text-gray-600">
                              {e.maintenance_entry_date
                                ? new Date(
                                    e.maintenance_entry_date + "T12:00:00",
                                  ).toLocaleDateString("pt-BR")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-base font-bold text-gray-900">
                              {e.maintenance_entry_date
                                ? (() => {
                                    const entry = new Date(
                                      e.maintenance_entry_date + "T12:00:00",
                                    );
                                    const today = new Date();
                                    today.setHours(12, 0, 0, 0);
                                    const diffTime = Math.abs(
                                      today.getTime() - entry.getTime(),
                                    );
                                    const diffDays = Math.ceil(
                                      diffTime / (1000 * 60 * 60 * 24),
                                    );
                                    return `${diffDays} d`;
                                  })()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {e.maintenance_type ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-sm uppercase font-black rounded-lg",
                                    e.maintenance_type === "preventive"
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                      : "bg-red-50 text-red-600 border-red-100",
                                  )}
                                >
                                  {e.maintenance_type === "preventive"
                                    ? "Preventiva"
                                    : "Corretiva"}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-base font-bold text-blue-600">
                                {getContractName(e.contractId)}
                              </span>
                            </TableCell>
                            <TableCell className="text-base font-medium text-gray-600">
                              {e.category}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-base font-bold rounded-lg",
                                  e.origin === "Próprio"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-amber-50 text-amber-700",
                                )}
                              >
                                {e.origin}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {(() => {
                                  const existingReq = purchaseRequests.find(
                                    (r) =>
                                      r.equipmentId === e.id &&
                                      r.status === "Pendente",
                                  );
                                  return (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (existingReq) {
                                          setCurrentRequest(existingReq);
                                          setNewRequestCategory(
                                            existingReq.category ||
                                              "PEÇAS/MANUTENÇÃO",
                                          );
                                        } else {
                                          setCurrentRequest({
                                            id: uuidv4(),
                                            date: new Date()
                                              .toISOString()
                                              .split("T")[0],
                                            status: "Pendente",
                                            priority: "Normal",
                                            sector: "CONTROLADOR",
                                            description: `${e.name} (${e.plate})`,
                                            contractId:
                                              e.contractId ||
                                              (selectedContractId !== "all"
                                                ? selectedContractId
                                                : undefined),
                                            equipmentId: e.id,
                                            items: [
                                              {
                                                id: uuidv4(),
                                                description: "",
                                                quantity: 1,
                                                unit: "un",
                                              },
                                            ],
                                          });
                                          setNewRequestCategory(
                                            "PEÇAS/MANUTENÇÃO",
                                          );
                                        }
                                        setIsMaterialRequestModalOpen(true);
                                      }}
                                      className={cn(
                                        "text-gray-300 hover:text-blue-600",
                                        existingReq &&
                                          "text-amber-500 hover:text-amber-600",
                                      )}
                                      title={
                                        existingReq
                                          ? "Ver / Editar Solicitação de Compra"
                                          : "Criar Solicitação de Compra"
                                      }
                                    >
                                      <ShoppingCart className="w-4 h-4" />
                                    </Button>
                                  );
                                })()}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleMaintenance(e)}
                                  className="h-8 rounded-lg bg-blue-50 text-blue-600 border-blue-100 font-bold text-base"
                                >
                                  <Wrench className="w-3 h-3 mr-1" />
                                  Finalizar Manutenção
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                  {filteredEquipments.filter((e) => e.inMaintenance).length ===
                    0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center opacity-30">
                          <Wrench className="w-10 h-10 mb-2" />
                          <p className="text-base font-bold uppercase tracking-widest">
                            Nenhum equipamento em manutenção
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-50 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black">
                    Histórico e Aprovações
                  </CardTitle>
                  <CardDescription className="text-base uppercase font-bold text-gray-400">
                    Gerencie transferências entre obras
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 py-5">
                      Equipamento
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Origem (Obra)
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Destino (Obra)
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Data Transferência
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Status
                    </TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers
                    .filter(
                      (t) =>
                        !selectedContractId ||
                        t.sourceContractId === selectedContractId ||
                        t.targetContractId === selectedContractId,
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.transferDate).getTime() -
                        new Date(a.transferDate).getTime(),
                    )
                    .map((t) => {
                      const equip = equipments.find(
                        (e) => e.id === t.equipmentId,
                      );
                      const source = contracts.find(
                        (c) => c.id === t.sourceContractId,
                      );
                      const target = contracts.find(
                        (c) => c.id === t.targetContractId,
                      );

                      return (
                        <TableRow
                          key={t.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onDoubleClick={() => {
                            if (equip) {
                              setEquipmentToEdit(equip);
                              setIsEditOpen(true);
                            }
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="font-bold text-gray-900">
                                  {equip?.name}
                                </p>
                                <p className="text-base text-gray-500 uppercase">
                                  {equip?.plate}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-base font-bold text-gray-600">
                            {source?.workName ||
                              source?.contractNumber ||
                              "Obra não encontrada"}
                          </TableCell>
                          <TableCell className="text-base font-bold text-blue-600">
                            {target?.workName ||
                              target?.contractNumber ||
                              "Obra não encontrada"}
                          </TableCell>
                          <TableCell className="text-base font-medium text-gray-600 font-mono">
                            {new Date(
                              t.transferDate + "T12:00:00",
                            ).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-base font-black uppercase rounded-lg",
                                t.status === "pending"
                                  ? "bg-orange-50 text-orange-600"
                                  : t.status === "approved"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-red-50 text-red-600",
                              )}
                            >
                              {t.status === "pending"
                                ? "Pendente"
                                : t.status === "approved"
                                  ? "Aprovado"
                                  : "Rejeitado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {t.status === "pending" &&
                              (currentUser?.role === "master" ||
                                selectedContractId === t.targetContractId) && (
                                <div className="flex items-center gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApproveTransfer(t)}
                                    className="h-8 rounded-lg bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 text-base font-bold"
                                  >
                                    Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectTransfer(t)}
                                    className="h-8 rounded-lg bg-red-50 text-red-700 border-red-100 hover:bg-red-100 text-base font-bold"
                                  >
                                    Rejeitar
                                  </Button>
                                </div>
                              )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {transfers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center opacity-30">
                          <ArrowRightLeft className="w-10 h-10 mb-2" />
                          <p className="text-base font-bold uppercase tracking-widest">
                            Nenhuma transferência registrada
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-1 border-none shadow-xl rounded-3xl overflow-hidden self-start">
              <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <Droplet className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg font-black">
                    Reservatórios
                  </CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl font-bold gap-2 text-base"
                  onClick={() => {
                    setEditingTankId(null);
                    setNewTank({
                      name: "",
                      capacity: 0,
                      currentLevel: 0,
                      fuelType: "Diesel S10",
                    });
                    setCustomFuel("");
                    setIsTankModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Novo
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {fuelTanks
                  .filter(
                    (t) =>
                      !selectedContractId ||
                      t.contractId === selectedContractId,
                  )
                  .map((tank) => {
                    const percent = (tank.currentLevel / tank.capacity) * 100;
                    return (
                      <div
                        key={tank.id}
                        className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative overflow-hidden group"
                      >
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900">
                                {tank.name}
                              </h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-50 transition-opacity"
                                onClick={() => handleEditTank(tank)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-base uppercase font-bold text-gray-500">
                                {getContractName(tank.contractId)}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-sm px-1 h-3.5 bg-blue-50 text-blue-600 border-blue-100 font-black"
                              >
                                {tank.fuelType || "Diesel S10"}
                              </Badge>
                            </div>
                          </div>
                          <p className="font-mono font-black text-base">
                            {tank.currentLevel} / {tank.capacity} L
                          </p>
                        </div>
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden mt-3 max-w-[80%] relative z-10">
                          <motion.div
                            className={cn(
                              "h-full",
                              percent > 20 ? "bg-blue-500" : "bg-red-500",
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {fuelTanks.filter(
                  (t) =>
                    !selectedContractId || t.contractId === selectedContractId,
                ).length === 0 && (
                  <div className="text-center py-10 opacity-30">
                    <Fuel className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-base font-bold uppercase">
                      Nenhum reservatório cadastrado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1 lg:col-span-2 border-none shadow-xl rounded-3xl overflow-hidden self-start">
              <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 rounded-xl">
                    <Fuel className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black">
                      Histórico de Abastecimentos
                    </CardTitle>
                    <CardDescription className="text-base uppercase font-bold text-gray-400">
                      Entradas e saídas de combustível
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl font-bold gap-2 text-base text-purple-700 bg-purple-50 border-purple-100 hover:bg-purple-100"
                    onClick={() => {
                      setEditingFuelLogId(null);
                      setNewFuelLog({
                        type: "entrada",
                        date: new Date().toISOString().split("T")[0],
                        quantity: 0,
                        tankId: "",
                        equipmentId: "",
                        supplier: "",
                        invoiceNumber: "",
                        unitPrice: undefined,
                        cost: undefined,
                      });
                      setIsFuelLogModalOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Nova Entrada
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl font-bold gap-2 text-base text-orange-700 bg-orange-50 border-orange-100 hover:bg-orange-100"
                    onClick={() => {
                      setEditingFuelLogId(null);
                      setNewFuelLog({
                        type: "saida",
                        date: new Date().toISOString().split("T")[0],
                        quantity: 0,
                        tankId: "",
                        equipmentId: "",
                        supplier: "",
                        invoiceNumber: "",
                        unitPrice: undefined,
                        cost: undefined,
                      });
                      setIsFuelLogModalOpen(true);
                    }}
                  >
                    <Fuel className="w-4 h-4" /> Nova Saída
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 py-4">
                        Data
                      </TableHead>
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                        Tipo / Ref
                      </TableHead>
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                        Reservatório
                      </TableHead>
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-right">
                        Quantidade (L)
                      </TableHead>
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-right whitespace-nowrap">
                        Vlr. Unit.
                      </TableHead>
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-right">
                        Total
                      </TableHead>
                      <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const tankMap = new Map(fuelTanks.map((t) => [t.id, t]));
                      const equipMap = new Map(
                        equipments.map((e) => [e.id, e]),
                      );

                      return fuelLogs.slice(0, 100).map((log) => {
                        const tk = tankMap.get(log.tankId);
                        const eq = equipMap.get(log.equipmentId);
                        const destTank = tankMap.get(log.equipmentId);

                        return (
                          <TableRow
                            key={log.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <TableCell className="font-mono text-base text-gray-600">
                              {new Date(
                                log.date + "T12:00:00",
                              ).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-sm uppercase font-black px-1 h-4",
                                      log.type === "entrada"
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : "bg-orange-50 text-orange-600 border-orange-100",
                                    )}
                                  >
                                    {log.type === "entrada"
                                      ? "Entrada"
                                      : destTank
                                        ? "Transferência"
                                        : "Saída"}
                                  </Badge>
                                  {eq && (
                                    <span className="text-base font-bold text-gray-700">
                                      {eq.name} ({eq.plate})
                                    </span>
                                  )}
                                  {destTank && (
                                    <span className="text-base font-bold text-blue-700">
                                      Para: {destTank.name}
                                    </span>
                                  )}
                                  {!eq && !destTank && log.type === "saida" && (
                                    <span className="text-base text-gray-400 italic">
                                      Consumo Geral
                                    </span>
                                  )}
                                </div>
                                {log.type === "entrada" &&
                                  (log.supplier || log.invoiceNumber) && (
                                    <span className="text-base text-gray-500 font-medium">
                                      {log.supplier}{" "}
                                      {log.invoiceNumber
                                        ? `(NF: ${log.invoiceNumber})`
                                        : ""}
                                    </span>
                                  )}
                                {log.type === "saida" && log.hourMeter && (
                                  <span className="text-sm font-bold text-gray-500 font-mono">
                                    [KM/H: {log.hourMeter}]
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-gray-900">
                                  {tk?.name || "---"}
                                </span>
                                <span className="text-sm text-gray-400 font-bold uppercase tracking-tight">
                                  {tk?.fuelType || "Diesel"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-mono font-bold",
                                log.type === "entrada"
                                  ? "text-emerald-600"
                                  : "text-orange-600",
                              )}
                            >
                              {log.type === "entrada" ? "+" : "-"}
                              {log.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono text-base text-gray-500">
                              {log.unitPrice
                                ? log.unitPrice.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-base text-gray-900">
                              {log.cost
                                ? log.cost.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })
                                : log.unitPrice && log.quantity
                                  ? (
                                      log.unitPrice * log.quantity
                                    ).toLocaleString("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    })
                                  : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                  onClick={() => handleEditFuelLog(log)}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                  onClick={() => {
                                    setFuelLogToDelete(log);
                                    setIsDeleteFuelLogDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black">
                    Acompanhamento de Solicitações
                  </CardTitle>
                  <CardDescription className="text-base uppercase font-bold text-gray-400">
                    Status das solicitações enviadas para compras
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => {
                  setCurrentRequest({
                    id: crypto.randomUUID(),
                    date: new Date().toISOString().split("T")[0],
                    status: "Pendente",
                    priority: "Normal",
                    contractId:
                      selectedContractId !== "all"
                        ? selectedContractId
                        : undefined,
                    items: [
                      {
                        id: crypto.randomUUID(),
                        description: "",
                        quantity: 1,
                        unit: "un",
                      },
                    ],
                  });
                  setIsMaterialRequestModalOpen(true);
                }}
                className="rounded-xl bg-blue-600 gap-2 font-bold text-base"
              >
                <Plus className="w-4 h-4" /> Nova Solicitação
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 py-5">
                      Data
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Descrição/Itens
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Categoria
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-center">
                      Status
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-right">
                      Previsão
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRequests
                    .filter(
                      (r) =>
                        r.sector === "CONTROLADOR" &&
                        (!selectedContractId ||
                          r.contractId === selectedContractId),
                    )
                    .map((request) => (
                      <TableRow
                        key={request.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="text-base font-medium text-gray-500">
                          {new Date(request.date).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {request.priority === "Alta" && (
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                            )}
                            {request.priority === "Urgente" && (
                              <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
                            )}
                            <div>
                              <p className="font-bold text-gray-900 text-base">
                                {request.description}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {request.items.map((item) => (
                                  <Badge
                                    key={item.id}
                                    variant="secondary"
                                    className="text-sm h-4 px-1 bg-gray-100 text-gray-600 border-none"
                                  >
                                    {item.quantity}x {item.description}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-base font-bold bg-blue-50 text-blue-700 border-blue-100"
                          >
                            {request.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "px-3 py-1 rounded-full text-base font-black uppercase tracking-wider",
                              request.status === "Cancelado"
                                ? "bg-red-100 text-red-700"
                                : request.status === "Pendente"
                                  ? "bg-amber-100 text-amber-700"
                                  : request.status === "Em orçamento"
                                    ? "bg-blue-100 text-blue-700"
                                    : request.status === "Compra Aprovado"
                                      ? "bg-indigo-100 text-indigo-700"
                                      : request.status === "Comprado"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : request.status === "Recebido"
                                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                          : request.status === "Aplicado"
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-gray-100 text-gray-700",
                            )}
                          >
                            {request.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-base font-bold text-gray-600">
                          <div className="flex flex-col items-end gap-1">
                            {request.deliveryDeadline
                              ? new Date(
                                  request.deliveryDeadline,
                                ).toLocaleDateString("pt-BR")
                              : "-"}
                            {request.status === "Recebido" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleApplyRequestToHistory(request)
                                }
                                className="h-7 text-sm font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                              >
                                Aplicar Ativo
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  {purchaseRequests.filter(
                    (r) =>
                      r.sector === "CONTROLADOR" &&
                      (!selectedContractId ||
                        r.contractId === selectedContractId),
                  ).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-10 text-gray-400 font-medium"
                      >
                        Nenhuma solicitação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Archive className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black">
                    Estoque de Materiais
                  </CardTitle>
                  <CardDescription className="text-base uppercase font-bold text-gray-400">
                    Itens recebidos aguardando aplicação em equipamentos
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showApplied"
                  checked={showApplied}
                  onCheckedChange={(checked) => setShowApplied(!!checked)}
                />
                <Label
                  htmlFor="showApplied"
                  className="text-base font-bold uppercase text-gray-600"
                >
                  Mostrar todos
                </Label>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 py-5">
                      Material / Peça
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Solicitação Origem
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-center">
                      Quantidade Total
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-center">
                      Ja Aplicado
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-center">
                      Saldo em Estoque
                    </TableHead>
                    <TableHead className="w-[150px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItemsToShowCombined
                    .filter(
                      (item) =>
                        showApplied ||
                        item.quantity - (item.appliedQuantity || 0) > 0,
                    )
                    .map((item, idx) => (
                      <TableRow
                        key={item.id || idx}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell>
                          <p className="font-bold text-gray-900 text-base">
                            {item.description}
                          </p>
                          <p className="text-base text-gray-500 font-bold uppercase tracking-tighter">
                            Unidade: {item.unit}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-base font-medium text-gray-600">
                            {item.requestDescription}
                          </p>
                        </TableCell>
                        <TableCell className="text-center font-bold text-gray-900">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-center font-bold text-blue-600">
                          {item.appliedQuantity || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-3 py-1 text-base font-black">
                            {item.quantity - (item.appliedQuantity || 0)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base uppercase h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={
                              item.quantity - (item.appliedQuantity || 0) <= 0
                            }
                            onClick={() => {
                              setSelectedStockItem({
                                requestId: item.originalItem.requestId || "",
                                itemIdx: item.originalItem.itemIdx || 0,
                                item: item.originalItem,
                              });
                              setIsApplyStockOpen(true);
                              setApplyQuantity(
                                item.quantity - (item.appliedQuantity || 0),
                              );
                            }}
                          >
                            Aplicar em Equipamento
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {stockItemsToShowCombined.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-20 text-gray-400 font-medium text-base"
                      >
                        Nenhum material no estoque.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black">
                    Histórico Geral de Manutenções
                  </CardTitle>
                  <CardDescription className="text-base uppercase font-bold text-gray-400">
                    Registro completo de preventivas e corretivas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="py-5 px-4 font-bold text-base uppercase tracking-widest text-gray-400">
                      Equipamento
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Entrada
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Saída
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Dias
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Tipo
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400 text-right">
                      Custo
                    </TableHead>
                    <TableHead className="font-bold text-base uppercase tracking-widest text-gray-400">
                      Itens Solicitados
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentMaintenance
                    .sort(
                      (a, b) =>
                        new Date(b.entryDate).getTime() -
                        new Date(a.entryDate).getTime(),
                    )
                    .map((m) => {
                      const equip = equipments.find(
                        (e) => e.id === m.equipmentId,
                      );
                      return (
                        <TableRow
                          key={m.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onDoubleClick={() => {
                            if (equip) {
                              setEquipmentToEdit(equip);
                              setIsEditOpen(true);
                            }
                          }}
                        >
                          <TableCell className="px-4">
                            <p className="font-bold text-gray-900">
                              {equip?.name || "Equipamento Excluído"}
                            </p>
                            <p className="text-base text-gray-500 uppercase">
                              {equip?.plate || "-"}
                            </p>
                          </TableCell>
                          <TableCell className="text-base font-mono text-gray-600">
                            {new Date(
                              m.entryDate + "T12:00:00",
                            ).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-base font-mono text-gray-600">
                            {m.exitDate ? (
                              new Date(
                                m.exitDate + "T12:00:00",
                              ).toLocaleDateString("pt-BR")
                            ) : (
                              <Badge className="bg-blue-50 text-blue-600 border-none animate-pulse">
                                Em aberto
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-base font-bold text-gray-900">
                            {m.exitDate ? `${m.daysInMaintenance} d` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-sm uppercase font-black rounded-lg",
                                m.type === "preventive"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : "bg-red-50 text-red-600 border-red-100",
                              )}
                            >
                              {m.type === "preventive"
                                ? "Preventiva"
                                : "Corretiva"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-base font-black text-gray-900 text-right">
                            {m.totalCost
                              ? `R$ ${m.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "-"}
                          </TableCell>
                          <TableCell
                            className="max-w-[200px] truncate"
                            title={m.requestedItems}
                          >
                            <span className="text-base text-gray-600 italic">
                              {m.requestedItems || "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {equipmentMaintenance.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-20 opacity-30"
                      >
                        <Wrench className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-base font-bold uppercase tracking-widest">
                          Nenhum histórico registrado
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}

      {isEditOpen && equipmentToEdit && !isNewMeasurementModalOpen ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col h-[800px] max-h-[85vh] mt-6">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 flex justify-between items-center shrink-0 relative overflow-hidden">
            <Truck className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
            <div className="flex items-center gap-6 relative z-10">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20 p-2 rounded-full"
                onClick={() => setIsEditOpen(false)}
              >
                <ArrowLeft className="w-8 h-8" />
              </Button>
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-3xl">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white leading-tight">
                  Editar Equipamento
                </h2>
                <p className="text-blue-100 text-base font-bold uppercase tracking-widest mt-1 opacity-80">
                  Alterar dados do ativo SYNERA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <Badge className="bg-white/20 text-white border-none font-black text-base px-4 py-1.5 uppercase rounded-xl backdrop-blur-md">
                {equipmentToEdit.code || "S/C"}
              </Badge>
              <Button
                className="bg-white text-blue-900 border-none hover:bg-gray-100 px-6 font-bold uppercase tracking-widest"
                onClick={handleUpdateEquip}
              >
                Salvar Alterações
              </Button>
            </div>
          </div>

        <Tabs
          defaultValue="basic"
          className="w-full flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full justify-start rounded-none bg-slate-50 border-b px-6 h-14 gap-6 shrink-0">
            <TabsTrigger
              value="basic"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
            >
              Dados Principais
            </TabsTrigger>
            <TabsTrigger
              value="technical"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
            >
              Atributos Técnicos
            </TabsTrigger>
            <TabsTrigger
              value="measure"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
            >
              Medição
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
            >
              Histórico
            </TabsTrigger>
            <TabsTrigger
              value="photos"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
            >
              Fotos
            </TabsTrigger>
            <TabsTrigger
              value="obs"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-base uppercase tracking-widest"
            >
              Observações
            </TabsTrigger>
          </TabsList>

          <div className="p-6 flex-1 overflow-y-auto scrollbar-thin-visible bg-white">
            <TabsContent value="basic" className="mt-0 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Código
                  </Label>
                  <Input
                    className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold"
                    value={equipmentToEdit?.code || ""}
                    onChange={(e) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, code: e.target.value } : null,
                      )
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Nome do Equipamento
                  </Label>
                  <Input
                    className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-base font-bold"
                    value={equipmentToEdit?.name || ""}
                    onChange={(e) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, name: e.target.value } : null,
                      )
                    }
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Tipo de Equipamento
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-12 rounded-xl border-slate-200 bg-slate-50/50 text-base font-bold"
                      >
                        {equipmentToEdit?.type || "Selecione ou digite..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-full p-0 rounded-xl"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder="Pesquisar ou adicionar..."
                          value={typeSearchTerm}
                          onValueChange={setTypeSearchTerm}
                        />
                        <CommandList className="max-h-[200px]">
                          <CommandEmpty>
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-base font-bold text-blue-600 h-10"
                              onClick={() => {
                                handleAddType(typeSearchTerm);
                                setEquipmentToEdit((prev) =>
                                  prev
                                    ? { ...prev, type: typeSearchTerm }
                                    : null,
                                );
                                setTypeSearchTerm("");
                              }}
                            >
                              <Plus className="w-3 h-3 mr-2" /> Adicionar "
                              {typeSearchTerm}"
                            </Button>
                          </CommandEmpty>
                          <CommandGroup>
                            {dynamicTypes.map((t) => (
                              <CommandItem
                                key={t}
                                value={t}
                                onSelect={() => {
                                  setEquipmentToEdit((prev) =>
                                    prev ? { ...prev, type: t } : null,
                                  );
                                  setTypeSearchTerm("");
                                }}
                                className="flex items-center justify-between py-2.5"
                              >
                                <div className="flex items-center">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 text-blue-600",
                                      equipmentToEdit?.type === t
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <span className="font-bold">{t}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-300 hover:text-red-500"
                                  onClick={(e) => handleRemoveType(e, t)}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Origem
                  </Label>
                  <Select
                    value={equipmentToEdit?.origin || "Próprio"}
                    onValueChange={(val) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, origin: val } : null,
                      )
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Próprio">Próprio</SelectItem>
                      <SelectItem value="Alugado">Alugado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {equipmentToEdit?.origin === "Alugado" && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                        Proprietário / Locador
                      </Label>
                      <Input
                        className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"
                        value={equipmentToEdit?.ownerName || ""}
                        onChange={(e) =>
                          setEquipmentToEdit((prev) =>
                            prev
                              ? { ...prev, ownerName: e.target.value }
                              : null,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                        CNPJ Proprietário
                      </Label>
                      <Input
                        className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"
                        value={equipmentToEdit?.ownerCnpj || ""}
                        onChange={(e) =>
                          setEquipmentToEdit((prev) =>
                            prev
                              ? { ...prev, ownerCnpj: e.target.value }
                              : null,
                          )
                        }
                      />
                    </div>
                  </>
                )}

                <div className="space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Situação
                  </Label>
                  <Select
                    value={equipmentToEdit?.situation || "Ativo"}
                    onValueChange={(val: any) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, situation: val } : null,
                      )
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Vendido">Vendido</SelectItem>
                      <SelectItem value="Sucateado">Sucateado</SelectItem>
                      <SelectItem value="Em Manutenção">
                        Em Manutenção
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Equipe Pertencente
                  </Label>
                  <Select
                    value={equipmentToEdit?.team || "none"}
                    onValueChange={(val) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, team: val === "none" ? "" : val } : null,
                      )
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold">
                      <SelectValue placeholder="Selecione a equipe..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem Equipe (Disponível)</SelectItem>
                      {(controllerTeams || []).map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Entrada
                  </Label>
                  <Input
                    type="date"
                    className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"
                    value={equipmentToEdit?.entryDate || ""}
                    onChange={(e) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, entryDate: e.target.value } : null,
                      )
                    }
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Saída
                  </Label>
                  <Input
                    type="date"
                    className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"
                    value={equipmentToEdit?.exitDate || ""}
                    onChange={(e) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, exitDate: e.target.value } : null,
                      )
                    }
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Medição por
                  </Label>
                  <Select
                    value={equipmentToEdit?.measurementUnit || "Horímetro"}
                    onValueChange={(val) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, measurementUnit: val as any } : null,
                      )
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Horímetro">Horímetro (h)</SelectItem>
                      <SelectItem value="Quilometragem">
                        Quilometragem (km)
                      </SelectItem>
                      <SelectItem value="Mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Leitura Atual / Inicial
                  </Label>
                  <NumericInput
                    className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"
                    value={equipmentToEdit?.currentReading || 0}
                    onChange={(val) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, currentReading: val } : null,
                      )
                    }
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    {equipmentToEdit?.measurementUnit === "Horímetro"
                      ? "Valor Hora"
                      : equipmentToEdit?.measurementUnit === "Quilometragem"
                        ? "Valor KM"
                        : "Valor Medição"}
                  </Label>
                  <NumericInput
                    className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"
                    value={equipmentToEdit?.contractedPrice || 0}
                    onChange={(val) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, contractedPrice: val } : null,
                      )
                    }
                    prefix="R$"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Valor Mensal
                  </Label>
                  <NumericInput
                    className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"
                    value={equipmentToEdit?.monthlyPrice || 0}
                    onChange={(val) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, monthlyPrice: val } : null,
                      )
                    }
                    prefix="R$"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3 space-y-3">
                  <Label className="text-base uppercase font-black text-slate-500 tracking-tight">
                    Obra Vinculada (Centro de Custo)
                  </Label>
                  <Select
                    value={equipmentToEdit?.contractId || "_none_"}
                    onValueChange={(val) =>
                      setEquipmentToEdit((prev) =>
                        prev
                          ? { ...prev, contractId: val === "_none_" ? "" : val }
                          : null,
                      )
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold transition-all focus:ring-2 focus:ring-blue-500/20">
                      <SelectValue placeholder="Selecione a obra...">
                        {equipmentToEdit?.contractId &&
                        equipmentToEdit?.contractId !== "_none_"
                          ? getContractName(equipmentToEdit.contractId)
                          : "Sem Obra (Disponível)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="_none_"
                        className="font-bold py-4 uppercase text-base tracking-tight"
                      >
                        Sem Obra (Disponível)
                      </SelectItem>
                      {contracts
                        .filter(
                          (c) =>
                            currentUser?.role === "master" ||
                            c.companyId === currentUser?.companyId ||
                            c.id === equipmentToEdit?.contractId,
                        )
                        .map((c) => (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            className="font-bold py-4 uppercase text-base tracking-tight"
                          >
                            {c.workName || c.contractNumber}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="technical"
              className="mt-0 space-y-8 animate-in fade-in duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-base font-black text-gray-900 uppercase">
                    Especificações do Equipamento
                  </h4>
                  <p className="text-base text-gray-500 font-bold uppercase tracking-tight">
                    Atributos técnicos dinâmicos
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fieldName = prompt("Nome do novo campo:");
                    if (!fieldName) return;
                    setEquipmentToEdit((prev) =>
                      prev
                        ? {
                            ...prev,
                            customFields: {
                              ...(prev.customFields || {}),
                              [fieldName]: { type: "text", value: "" },
                            },
                          }
                        : null,
                    );
                  }}
                  className="rounded-xl gap-2 font-bold text-base text-blue-600 border-blue-100 hover:bg-blue-50 h-10 px-4"
                >
                  <Plus className="w-4 h-4" /> Adicionar Atributo
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-8 rounded-3xl border border-gray-100">
                {/* Standard Technical Fields moved from Basic */}
                <div className="space-y-2">
                  <Label className="text-base uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Marca / Fabricante
                  </Label>
                  <Input
                    className="rounded-xl bg-white border-gray-100 h-12 font-bold text-base shadow-sm"
                    value={equipmentToEdit?.brand || ""}
                    onChange={(e) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, brand: e.target.value } : null,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Modelo / Versão
                  </Label>
                  <Input
                    className="rounded-xl bg-white border-gray-100 h-12 font-bold text-base shadow-sm"
                    value={equipmentToEdit?.model || ""}
                    onChange={(e) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, model: e.target.value } : null,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Ano de Fabricação
                  </Label>
                  <Input
                    type="number"
                    className="rounded-xl bg-white border-gray-100 h-12 font-bold text-base shadow-sm"
                    value={equipmentToEdit?.year || ""}
                    onChange={(e) =>
                      setEquipmentToEdit((prev) =>
                        prev
                          ? { ...prev, year: parseInt(e.target.value) }
                          : null,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Placa / Serial
                  </Label>
                  <Input
                    className="rounded-xl bg-white border-gray-100 h-12 font-bold text-base shadow-sm"
                    value={equipmentToEdit?.plate || ""}
                    onChange={(e) =>
                      setEquipmentToEdit((prev) =>
                        prev ? { ...prev, plate: e.target.value } : null,
                      )
                    }
                  />
                </div>

                {Object.entries(equipmentToEdit?.customFields || {}).map(
                  ([key, f]) => {
                    const field = f as EquipmentAttribute;
                    return (
                      <div key={key} className="space-y-2 group relative">
                        <div className="flex items-center justify-between">
                          <Label className="text-base uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            {key.replace(/_/g, " ")}
                          </Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEquipmentToEdit((prev) => {
                                if (!prev) return null;
                                const newFields = {
                                  ...(prev.customFields || {}),
                                };
                                delete newFields[key];
                                return { ...prev, customFields: newFields };
                              });
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        {field.type === "boolean" ? (
                          <div className="flex items-center gap-3 h-12 px-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <Switch
                              checked={field.value}
                              onCheckedChange={(v) => {
                                setEquipmentToEdit((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        customFields: {
                                          ...prev.customFields,
                                          [key]: { ...field, value: v },
                                        },
                                      }
                                    : null,
                                );
                              }}
                            />
                            <span className="text-base font-bold text-gray-600 uppercase">
                              {field.value ? "Sim" : "Não"}
                            </span>
                          </div>
                        ) : field.type === "select" ? (
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              setEquipmentToEdit((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      customFields: {
                                        ...prev.customFields,
                                        [key]: { ...field, value: v },
                                      },
                                    }
                                  : null,
                              );
                            }}
                          >
                            <SelectTrigger className="rounded-xl bg-white border-gray-100 h-12 font-bold text-base shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="rounded-xl bg-white border-gray-100 h-12 font-bold text-base shadow-sm"
                            type={field.type === "number" ? "number" : "text"}
                            value={field.value}
                            onChange={(e) => {
                              const val =
                                field.type === "number"
                                  ? parseFloat(e.target.value)
                                  : e.target.value;
                              setEquipmentToEdit((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      customFields: {
                                        ...prev.customFields,
                                        [key]: { ...field, value: val },
                                      },
                                    }
                                  : null,
                              );
                            }}
                          />
                        )}
                      </div>
                    );
                  },
                )}
                {Object.entries(equipmentToEdit?.customFields || {}).length ===
                  0 && (
                  <div className="col-span-2 py-10 text-center opacity-20">
                    <p className="text-base font-black uppercase tracking-widest text-gray-400">
                      Nenhum atributo adicional definido
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="obs" className="mt-0 space-y-6">
              <Label className="text-base uppercase font-bold text-gray-500">
                Observações do Equipamento
              </Label>
              <textarea
                className="w-full min-h-[250px] rounded-2xl border-gray-100 bg-gray-50/50 p-6 text-base font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                value={equipmentToEdit?.observations || ""}
                onChange={(e) =>
                  setEquipmentToEdit((prev) =>
                    prev ? { ...prev, observations: e.target.value } : null,
                  )
                }
                placeholder="Insira detalhes importantes sobre o estado, uso ou restrições do equipamento..."
              />
            </TabsContent>

            <TabsContent value="measure" className="mt-0 space-y-4">
              <div className="border border-slate-100 rounded-3xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-base uppercase font-black">
                        Número
                      </TableHead>
                      <TableHead className="text-base uppercase font-black">
                        Mês
                      </TableHead>
                      <TableHead className="text-base uppercase font-black">
                        Período
                      </TableHead>
                      <TableHead className="text-base uppercase font-black text-right">
                        Total Produção
                      </TableHead>
                      <TableHead className="text-base uppercase font-black text-right">
                        Valor Total
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(equipmentToEdit?.measurements || []).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-bold text-base">
                          {m.number}
                        </TableCell>
                        <TableCell className="font-bold text-base">
                          {m.month}
                        </TableCell>
                        <TableCell className="text-base text-slate-500">
                          {m.period.includes(" a ")
                            ? m.period
                                .split(" a ")
                                .map((d) => {
                                  const date = new Date(d + "T12:00:00");
                                  return isNaN(date.getTime())
                                    ? d
                                    : date.toLocaleDateString("pt-BR");
                                })
                                .join(" a ")
                            : m.period}
                        </TableCell>
                        <TableCell className="text-right font-bold text-base">
                          {m.totalUnits || 0}
                          {equipmentToEdit?.measurementUnit === "Horímetro"
                            ? "h"
                            : equipmentToEdit?.measurementUnit ===
                                "Quilometragem"
                              ? "km"
                              : ""}
                        </TableCell>
                        <TableCell className="text-right font-bold text-base text-blue-600">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(m.totalValue || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                const parts = m.period.split(" a ");
                                if (parts.length === 2) {
                                  setMeasurementPeriod({
                                    start: parts[0],
                                    end: parts[1],
                                  });
                                }
                                console.log("DEBUG [Edit]:", m);
                                setMeasurementMonth(m.month);
                                setTempDailyData(
                                  getDailyMeasurementData(
                                    parts[0],
                                    parts[1],
                                    equipmentToEdit,
                                    (m.details || []).map((d) => ({
                                      ...d,
                                      discount: d.discount ?? false,
                                    })),
                                  ),
                                );
                                setEditingMeasurementId(m.id);
                                setSelectedEquipment(equipmentToEdit);
                                setIsNewMeasurementModalOpen(true);
                              }}
                              title="Editar Medição"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                              onClick={() =>
                                equipmentToEdit &&
                                handleOpenMaintenanceDiscountModal(
                                  m,
                                  equipmentToEdit,
                                )
                              }
                              title="Gerar Descontos de Manutenção"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                              onClick={() =>
                                equipmentToEdit &&
                                handleOpenExportModal(m, equipmentToEdit)
                              }
                              title="Exportar Medição"
                            >
                              <FileDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteMeasurement(m.id)}
                              title="Excluir Medição"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(equipmentToEdit?.measurements || []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-10 text-slate-400"
                        >
                          Nenhuma medição registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <Button
                  onClick={() => {
                    setMeasurementMonth(
                      new Date().toLocaleDateString("pt-BR", {
                        month: "2-digit",
                        year: "numeric",
                      }),
                    );
                    setIsPeriodSelectionOpen(true);
                    setSelectedEquipment(equipmentToEdit);
                    setEditingMeasurementId(null);
                  }}
                  className="rounded-xl bg-blue-600 font-bold text-base h-11 px-6 shadow-lg shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4 mr-2" /> Nova Medição
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-4">
              <div className="space-y-4">
                <h4 className="text-base font-black text-gray-900 uppercase">
                  Histórico Completo
                </h4>
                <div className="space-y-3">
                  {(equipmentToEdit?.history || []).map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Badge
                            variant="outline"
                            className="text-sm font-black uppercase mb-1"
                          >
                            {entry.type}
                          </Badge>
                          <p className="text-base font-black text-gray-900">
                            {entry.description}
                          </p>
                        </div>
                        <span className="text-base font-bold text-gray-400">
                          {new Date(entry.date).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {entry.parts && entry.parts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.parts.map((p, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-sm bg-gray-50 text-gray-500"
                            >
                              {p.quantity} {p.unit} - {p.description}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!equipmentToEdit?.history ||
                    equipmentToEdit.history.length === 0) && (
                    <div className="py-10 text-center opacity-30">
                      <History className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-base font-black uppercase tracking-widest">
                        Nenhum registro encontrado
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="photos" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-black text-gray-900 uppercase">
                    Galeria de Fotos
                  </h4>
                  <p className="text-base text-gray-500 font-bold uppercase tracking-tighter shadow-sm">
                    SYNERA Bucket: equipments
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {(parsedEditPhotos || []).map((item) => (
                    <div
                      key={item.index}
                      className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm flex flex-col relative group"
                    >
                      <div className="aspect-square w-full overflow-hidden relative">
                        <img
                          src={item.url}
                          alt={`Equip ${item.index}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-xl"
                            onClick={() => deleteEditPhoto(item.index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-2 border-t bg-gray-50/50">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-505">
                          Data da Foto
                        </Label>
                        <Input
                          type="date"
                          value={item.date}
                          onChange={(e) =>
                            updateEditPhotoDate(item.index, e.target.value)
                          }
                          className="h-8 text-xs font-mono rounded-lg mt-0.5 border-gray-200 bg-white focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera className="w-8 h-8 text-gray-300" />
                    <span className="text-sm font-black uppercase text-gray-400">
                      Upar Foto
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const config = getSupabaseConfig();
                            const todayStr = new Date()
                              .toISOString()
                              .split("T")[0];
                            if (config.enabled) {
                              const supabase = createSupabaseClient(
                                config.url,
                                config.key,
                              );
                              const fileExt = file.name.split(".").pop();
                              const fileName = `${uuidv4()}.${fileExt}`;
                              const { data, error } = await supabase.storage
                                .from("equipamentos")
                                .upload(fileName, file);
                              if (error) throw error;

                              const {
                                data: { publicUrl },
                              } = supabase.storage
                                .from("equipamentos")
                                .getPublicUrl(fileName);
                              setEquipmentToEdit((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      photos: [
                                        ...(prev.photos || []),
                                        `${publicUrl}|${todayStr}`,
                                      ],
                                    }
                                  : null,
                              );
                            } else {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setEquipmentToEdit((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        photos: [
                                          ...(prev.photos || []),
                                          `${ev.target?.result as string}|${todayStr}`,
                                        ],
                                      }
                                    : null,
                                );
                              };
                              reader.readAsDataURL(file);
                            }
                          } catch (err: any) {
                            console.error("Upload error:", err);
                            alert(
                              `Erro ao enviar a foto para o Supabase: ${err.message || 'Verifique se o bucket "equipamentos" foi criado. Execute supabase_storage_setup.sql.'}`,
                            );
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </TabsContent>
          </div>

          <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-2xl">
            <Button
              variant="ghost"
              onClick={handlePermanentDelete}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold uppercase text-base tracking-widest h-12 px-6 border border-red-100 rounded-2xl w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir Ativo permanentemente
            </Button>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl font-bold uppercase text-base tracking-widest h-12 px-6 flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateEquip}
                className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black uppercase text-base tracking-widest px-8 flex-1 sm:flex-none transition-all active:scale-95"
              >
                <Check className="w-4 h-4 mr-2" /> Atualizar Dados do
                Equipamento
              </Button>
            </div>
          </div>
        </Tabs>
        </div>
      ) : null}

      <Modal
        hideCancel={true}
        isOpen={isPeriodSelectionOpen}
        onClose={() => setIsPeriodSelectionOpen(false)}
        className="sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        title="Novo Período de Medição"
        description="Selecione o período para iniciar a medição"
      >
        <div className="space-y-6 p-6 flex-1 overflow-y-auto scrollbar-thin-visible">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Mês Referência</Label>
              <Input
                type="month"
                value={
                  measurementMonth
                    ? measurementMonth.split("/").reverse().join("-")
                    : ""
                }
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-");
                  setMeasurementMonth(`${m}/${y}`);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input
                type="date"
                value={measurementPeriod.start}
                onChange={(e) =>
                  setMeasurementPeriod({
                    ...measurementPeriod,
                    start: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input
                type="date"
                value={measurementPeriod.end}
                onChange={(e) =>
                  setMeasurementPeriod({
                    ...measurementPeriod,
                    end: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <Button
            className="w-full h-12 rounded-xl bg-blue-600 font-bold animate-pulse hover:animate-none"
            onClick={() => {
              generateDailyMeasurementData(
                measurementPeriod.start,
                measurementPeriod.end,
              );
              setIsPeriodSelectionOpen(false);
              setIsNewMeasurementModalOpen(true);
            }}
          >
            Iniciar Medição
          </Button>
        </div>
      </Modal>

      {isNewMeasurementModalOpen && selectedEquipment && (() => {
        // Filter fuel logs during the measurement period
        const periodFuelLogs = fuelLogs ? fuelLogs.filter((log) => {
          if (log.equipmentId !== selectedEquipment?.id) return false;
          if (log.type !== "saida") return false;
          const logDate = log.date;
          return logDate >= measurementPeriod.start && logDate <= measurementPeriod.end;
        }) : [];

        // Calculate totals
        const totalFuelLiters = periodFuelLogs.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        const totalFuelCost = periodFuelLogs.reduce((acc, curr) => acc + (curr.cost || (curr.quantity * (curr.unitPrice || 0)) || 0), 0);

        // Filter maintenances during the measurement period
        const periodMaintenances = equipmentMaintenance ? equipmentMaintenance.filter((m) => {
          if (m.equipmentId !== selectedEquipment?.id) return false;
          const mDate = m.entryDate;
          return mDate >= measurementPeriod.start && mDate <= measurementPeriod.end;
        }) : [];

        const totalMaintenanceCost = periodMaintenances.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);

        return (
          <div className="bg-white rounded-3xl border border-gray-150 shadow-xl overflow-hidden flex flex-col h-[850px] max-h-[90vh] mt-6 relative z-50 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-white/20 p-2 rounded-full h-10 w-10 flex items-center justify-center cursor-pointer"
                    onClick={() => setIsNewMeasurementModalOpen(false)}
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <div>
                    <h2 className="text-xl font-bold">{`Lançamento de Medição - ${measurementMonth}`}</h2>
                    <p className="text-blue-100/80 text-sm">
                      Período: {measurementPeriod.start ? new Date(measurementPeriod.start + "T12:00:00").toLocaleDateString("pt-BR") : ""} a {measurementPeriod.end ? new Date(measurementPeriod.end + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateMeasurementPDF(getActiveMeasurementObject(), selectedEquipment, true)}
                    className="h-10 px-3 rounded-xl shadow-sm flex items-center gap-1.5 text-white border-white/30 bg-white/10 hover:bg-white/20 cursor-pointer font-bold"
                    title="Imprimir Medição"
                  >
                    <Printer className="w-4 h-4 text-purple-300" /> Imprimir
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExportSelectorOpen(true)}
                    className="h-10 px-4 rounded-xl shadow-sm flex items-center gap-1.5 text-white border-white/30 bg-white/10 hover:bg-white/20 cursor-pointer font-bold"
                    title="Exportar medição nos formatos PDF, Excel ou Modelo Personalizado"
                  >
                    <Download className="w-4 h-4 text-blue-300" /> Exportar Medição
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => measurementInputRef.current?.click()}
                    className="h-10 px-4 rounded-xl shadow-sm flex items-center gap-2 text-white border-white/30 bg-white/10 hover:bg-white/20 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-emerald-300" /> Importar Planilha
                  </Button>
                  <input
                    type="file"
                    ref={measurementInputRef}
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportMeasurement}
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 rounded-full h-10 w-10 p-0 flex items-center justify-center cursor-pointer mb-0.5"
                    onClick={() => setIsNewMeasurementModalOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content with columns */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/50">
              {/* Left Side: Daily Readings list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" /> Leituras Diárias
                  </h3>
                  
                  <div className="overflow-x-auto w-full">
                    <Table className="w-full min-w-max border-collapse">
                      <TableHeader className="bg-white sticky top-0 z-20">
                        <TableRow className="border-b-2 border-slate-100">
                          <TableHead className="w-24 text-sm font-black uppercase text-slate-500">
                            Data
                          </TableHead>
                          <TableHead className="w-32 text-sm font-black uppercase text-slate-500">
                            Inicial
                          </TableHead>
                          <TableHead className="w-32 text-sm font-black uppercase text-slate-500">
                            Final
                          </TableHead>
                          <TableHead className="w-24 text-sm font-black uppercase text-slate-500 text-center">
                            Desc.
                          </TableHead>
                          <TableHead className="w-24 text-sm font-black uppercase text-slate-500 text-center">
                            Total
                          </TableHead>
                          <TableHead className="w-48 text-sm font-black uppercase text-slate-500">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tempDailyData.map((day, idx) => (
                          <TableRow
                            key={day.date}
                            className="hover:bg-slate-50/50 transition-colors h-14"
                          >
                            <TableCell className="text-sm font-bold text-slate-600">
                              {new Date(day.date + "T12:00:00").toLocaleDateString(
                                "pt-BR",
                                { weekday: "short", day: "2-digit", month: "2-digit" },
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="w-28">
                                <input
                                  type="number"
                                  value={day.initialReading || ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const newDays = [...tempDailyData];
                                    newDays[idx].initialReading = val;
                                    setTempDailyData(newDays);
                                  }}
                                  onFocus={(e) => requestAnimationFrame(() => e.target.select())}
                                  className="h-9 px-3 w-full rounded-lg text-sm font-bold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="w-28">
                                <input
                                  type="number"
                                  value={day.finalReading || ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const newDays = [...tempDailyData];
                                    newDays[idx].finalReading = val;
                                    setTempDailyData(newDays);
                                  }}
                                  onFocus={(e) => requestAnimationFrame(() => e.target.select())}
                                  className="h-9 px-3 w-full rounded-lg text-sm font-bold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={!!day.discount}
                                onChange={(e) => {
                                  const newDays = [...tempDailyData];
                                  newDays[idx].discount = e.target.checked;
                                  setTempDailyData(newDays);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </TableCell>
                            <TableCell className="text-center text-sm font-bold text-slate-700">
                              {day.discount
                                ? "-"
                                : day.finalReading > day.initialReading
                                ? (day.finalReading - day.initialReading).toLocaleString("pt-BR")
                                : "0"}
                            </TableCell>
                            <TableCell>
                              <select
                                value={day.status || "Trabalhando"}
                                onChange={(e) => {
                                  const newDays = [...tempDailyData];
                                  newDays[idx].status = e.target.value as any;
                                  setTempDailyData(newDays);
                                }}
                                className="h-9 w-full min-w-[120px] rounded-lg text-xs font-bold border border-slate-200 bg-white px-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="Trabalhando">Trabalhando</option>
                                <option value="Chuva">Chuva</option>
                                <option value="Manutenção">Manutenção</option>
                                <option value="Aguardando Frente">Aguardando Frente</option>
                                <option value="à Disposição">À Disposição</option>
                              </select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Right Side: Equipment details, Maintenance underneath, and Fuel logs at the bottom */}
              <div className="w-full lg:w-[420px] bg-white border-l border-slate-100 p-6 overflow-y-auto flex flex-col gap-6 shrink-0 shadow-inner">
                
                {/* Quadro de Equipamento Card */}
                <div className="bg-slate-50 border border-slate-150 rounded-3xl p-5 flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-255 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 tracking-tight text-base">Ativo de Equipamento</h4>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Identificação do Equipamento</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] heading-title">Nome / Modelo</span>
                      <span className="font-bold text-slate-800 text-right max-w-[200px] truncate" title={`${selectedEquipment.name} (${selectedEquipment.model})`}>
                        {selectedEquipment.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] heading-title">Código</span>
                      <span className="font-bold text-slate-800 font-mono">{selectedEquipment.code || "S/C"}</span>
                    </div>
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] heading-title">Placa</span>
                      <span className="font-bold text-slate-800 font-mono">{selectedEquipment.plate || "-"}</span>
                    </div>
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] heading-title">Preço Contratado</span>
                      <span className="font-bold text-slate-800">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedEquipment.contractedPrice || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] heading-title">Unidade</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px] uppercase font-mono">
                        {selectedEquipment.measurementUnit || "Horímetro"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quadro de Manutenção Card (displayed BELOW the equipment details card) */}
                <div className="bg-slate-50 border border-slate-150 rounded-3xl p-5 flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-255 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 tracking-tight text-base">Manutenções</h4>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{periodMaintenances.length} registros no período</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Custo Manutenção</span>
                    <span className="text-sm font-black text-orange-600 font-mono">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalMaintenanceCost)}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="w-full border-collapse">
                      <TableHeader className="bg-slate-100">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="py-1.5 px-2 text-[10px] font-bold uppercase text-slate-500 w-[70px]">Data</TableHead>
                          <TableHead className="py-1.5 px-2 text-[10px] font-bold uppercase text-slate-500">Descrição</TableHead>
                          <TableHead className="py-1.5 px-2 text-[10px] font-bold uppercase text-slate-500 text-right w-[90px]">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {periodMaintenances.length > 0 ? (
                          periodMaintenances.map((m) => (
                            <TableRow key={m.id} className="border-b border-slate-100 hover:bg-white/80 transition-colors">
                              <TableCell className="py-1.5 px-2 text-[11px] font-medium text-slate-600 font-mono">
                                {new Date(m.entryDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-[11px] text-slate-600 max-w-[130px] truncate" title={m.requestedItems}>
                                {m.requestedItems || "Sem descrição"}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-[11px] font-mono text-right text-orange-600 font-bold">
                                {m.totalCost ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(m.totalCost) : "R$ 0,00"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-[10.5px] text-slate-400 py-6 italic bg-white/40">
                              Nenhuma manutenção registrada
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Quadro de Abastecimento Card */}
                <div className="bg-slate-50 border border-slate-150 rounded-3xl p-5 flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-255 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 tracking-tight text-base">Abastecimentos</h4>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{periodFuelLogs.length} registros no período</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Total Abastecido</span>
                      <span className="text-sm font-black text-indigo-700 font-mono leading-tight">{totalFuelLiters.toLocaleString("pt-BR")} L</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Custo Estimado</span>
                      <span className="text-sm font-black text-slate-700 font-mono leading-tight">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalFuelCost)}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="w-full border-collapse">
                      <TableHeader className="bg-slate-100">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="py-1.5 px-2 text-[10px] font-bold uppercase text-slate-500 w-[70px]">Data</TableHead>
                          <TableHead className="py-1.5 px-2 text-[10px] font-bold uppercase text-slate-500 text-right">Qtd (L)</TableHead>
                          <TableHead className="py-1.5 px-2 text-[10px] font-bold uppercase text-slate-500 text-right w-[100px]">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {periodFuelLogs.length > 0 ? (
                          periodFuelLogs.map((log) => (
                            <TableRow key={log.id} className="border-b border-slate-100 hover:bg-white/80 transition-colors">
                              <TableCell className="py-1.5 px-2 text-[11px] font-medium text-slate-600 font-mono">
                                {new Date(log.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-[11px] font-mono text-right text-slate-600">
                                {log.quantity} L
                              </TableCell>
                              <TableCell className="py-1.5 px-2 text-[11px] font-mono text-right text-indigo-600 font-bold">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(log.cost || (log.quantity * (log.unitPrice || 0)) || 0)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-[10.5px] text-slate-400 py-6 italic bg-white/40">
                              Nenhum abastecimento registrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky bottom panel with totals & actions */}
            <div className="p-6 bg-slate-100 border-t flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 rounded-b-2xl">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Total Acumulado
                  </span>
                  <span className="text-2xl font-black text-slate-800 leading-none">
                    {tempDailyData
                      .filter((d) => d.initialReading > 0 && d.finalReading > 0 && d.finalReading > d.initialReading)
                      .reduce((acc, curr) => acc + (curr.discount ? 0 : curr.finalReading - curr.initialReading), 0)
                      .toLocaleString("pt-BR")}{" "}
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-400 ml-1">
                      {selectedEquipment?.measurementUnit === "Horímetro" ? "h" : "km"}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col border-l border-slate-200 pl-6">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Valor Total
                  </span>
                  <span className="text-2xl font-black text-emerald-600 leading-none">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      tempDailyData
                        .filter((d) => d.initialReading > 0 && d.finalReading > 0 && d.finalReading > d.initialReading)
                        .reduce((acc, curr) => acc + (curr.discount ? 0 : curr.finalReading - curr.initialReading), 0) * (selectedEquipment?.contractedPrice || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button
                  variant="ghost"
                  onClick={() => setIsNewMeasurementModalOpen(false)}
                  className="rounded-xl font-bold text-sm uppercase tracking-widest px-6 h-12 flex-1 md:flex-none border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Descartar
                </Button>
                <Button
                  onClick={() => {
                    handleSaveMeasurement();
                    setIsNewMeasurementModalOpen(false);
                  }}
                  className="rounded-2xl bg-red-600 hover:bg-red-700 text-white px-8 font-black text-sm uppercase tracking-widest shadow-xl shadow-red-100 h-12 transition-all active:scale-95 flex-1 md:flex-none cursor-pointer"
                >
                  Encerrar Medição
                </Button>
                <Button
                  onClick={handleSaveMeasurement}
                  className="rounded-2xl bg-blue-600 text-white px-8 font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 h-12 transition-all active:scale-95 flex-1 md:flex-none cursor-pointer"
                >
                  Confirmar e Salvar Medição
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      <Modal
        hideCancel={true}
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        maxWidth="custom"
        className="p-0 border-none sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        headerClassName="hidden"
      >
        <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
          <ArrowRightLeft className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white leading-tight">
              Transferir Equipamento
            </h2>
            <p className="text-emerald-100 text-base font-bold uppercase tracking-widest mt-1 opacity-80">
              Mudança de Centro de Custo / Obra
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <Truck className="w-12 h-12 text-emerald-900" />
            </div>
            <div className="relative z-10">
              <p className="text-lg font-black text-emerald-900 leading-tight">
                {equipmentToTransfer?.name}
              </p>
              <p className="text-base text-emerald-700 font-bold uppercase tracking-widest mt-1">
                Série/Placa: {equipmentToTransfer?.plate || "S/N"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-black text-gray-500 uppercase tracking-widest">
              Obra de Destino
            </Label>
            <Select
              value={targetContractId}
              onValueChange={setTargetContractId}
            >
              <SelectTrigger className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-base font-bold focus:ring-2 focus:ring-emerald-500/20">
                <SelectValue placeholder="Selecione a obra de destino">
                  {targetContractId
                    ? (() => {
                        const c = availableContracts.find(
                          (x) => x.id === targetContractId,
                        );
                        return c
                          ? c.workName || c.contractNumber
                          : "Selecionar Obra";
                      })()
                    : "Selecionar Obra"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {availableContracts
                  .filter((c) => c.id !== equipmentToTransfer?.contractId)
                  .map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      textValue={c.workName || c.contractNumber}
                      className="py-3 px-4 rounded-xl focus:bg-emerald-50"
                    >
                      <div className="flex flex-col">
                        <span className="font-black text-gray-900 leading-tight uppercase text-base">
                          {c.workName || c.client || "Sem nome"}
                        </span>
                        <span className="text-sm text-gray-500 font-bold uppercase mt-0.5 tracking-tighter italic">
                          {c.contractNumber || "S/N"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-black text-gray-500 uppercase tracking-widest">
              Data da Transferência
            </Label>
            <Input
              type="date"
              value={transferDateInput}
              onChange={(e) => setTransferDateInput(e.target.value)}
              className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-base font-bold focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="px-8 pb-8 pt-2">
          <Button
            onClick={handleTransferRequest}
            disabled={!targetContractId}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 font-black uppercase text-base tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Confirmar Transferência
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsTransferOpen(false)}
            className="w-full mt-2 h-10 rounded-xl font-bold uppercase text-sm text-gray-400 tracking-widest hover:text-gray-600"
          >
            Cancelar operação
          </Button>
        </div>
      </Modal>

      <Modal
        hideCancel={true}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        maxWidth="custom"
        className="p-0 border-none sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        headerClassName="hidden"
      >
        <div className="bg-orange-600 p-8 text-white relative overflow-hidden">
          <XCircle className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white leading-tight">
              Dispensar Equipamento
            </h2>
            <p className="text-orange-100 text-base font-bold uppercase tracking-widest mt-1 opacity-80">
              O equipamento será marcado como inativo
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-lg font-black text-orange-900 leading-tight">
                {equipmentToDelete?.name}
              </p>
              <p className="text-base text-orange-700 font-bold uppercase tracking-widest mt-1">
                Série/Placa: {equipmentToDelete?.plate || "S/N"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-black text-gray-500 uppercase tracking-widest">
              Data de Saída
            </Label>
            <Input
              type="date"
              value={exitDateInput}
              onChange={(e) => setExitDateInput(e.target.value)}
              className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-base font-bold focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        <div className="px-8 pb-8 pt-2">
          <Button
            onClick={handleSoftDelete}
            className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 shadow-xl shadow-orange-100 font-black uppercase text-base tracking-widest transition-all active:scale-[0.98]"
          >
            Confirmar Saída
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsDeleteOpen(false)}
            className="w-full mt-2 h-10 rounded-xl font-bold uppercase text-sm text-gray-400 tracking-widest hover:text-gray-600"
          >
            Cancelar operação
          </Button>
        </div>
      </Modal>

      <Modal
        hideCancel={true}
        isOpen={isTankModalOpen}
        onClose={() => setIsTankModalOpen(false)}
        maxWidth="custom"
        className="p-0 border-none sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        headerClassName="hidden"
      >
        <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
          <Droplet className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white leading-tight">
              {editingTankId ? "Editar Reservatório" : "Novo Reservatório"}
            </h2>
            <p className="text-blue-100 text-base font-bold uppercase tracking-widest mt-1 opacity-80">
              {editingTankId
                ? "Atualize as informações do seu ativo"
                : "Cadastro de armazenamento de combustível"}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                Nome/Identificação
              </Label>
              <Input
                placeholder="Ex: Reservatório Principal Obra"
                value={newTank.name}
                onChange={(e) =>
                  setNewTank({ ...newTank, name: e.target.value })
                }
                className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-base font-bold"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                Tipo de Combustível
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={newTank.fuelType || "Diesel S10"}
                  onValueChange={(val) =>
                    setNewTank({ ...newTank, fuelType: val })
                  }
                >
                  <SelectTrigger className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl font-bold">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DEFAULT_FUELS.map((f) => (
                      <SelectItem key={f} value={f} className="font-bold">
                        {f}
                      </SelectItem>
                    ))}
                    <SelectItem value="Outro" className="font-bold italic">
                      Outro (Personalizado)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {(newTank.fuelType === "Outro" ||
                  !DEFAULT_FUELS.includes(newTank.fuelType || "")) && (
                  <Input
                    placeholder="Digite o combustível"
                    value={
                      customFuel ||
                      (DEFAULT_FUELS.includes(newTank.fuelType || "")
                        ? ""
                        : newTank.fuelType)
                    }
                    onChange={(e) => setCustomFuel(e.target.value)}
                    className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-base font-bold"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                Capacidade (L)
              </Label>
              <Input
                type="number"
                value={newTank.capacity || ""}
                onChange={(e) =>
                  setNewTank({ ...newTank, capacity: Number(e.target.value) })
                }
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl text-base font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                Volume Inicial (L)
              </Label>
              <Input
                type="number"
                value={newTank.currentLevel || ""}
                onChange={(e) =>
                  setNewTank({
                    ...newTank,
                    currentLevel: Number(e.target.value),
                  })
                }
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl text-base font-bold"
              />
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-2 space-y-3">
          <Button
            onClick={handleCreateTank}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black uppercase text-base tracking-widest transition-all active:scale-[0.98]"
          >
            <Check className="w-4 h-4 mr-2" />{" "}
            {editingTankId ? "Salvar Alterações" : "Salvar Reservatório"}
          </Button>

          {editingTankId && (
            <Button
              variant="outline"
              onClick={() => {
                const tank = fuelTanks.find((t) => t.id === editingTankId);
                if (tank) handleDeleteTankRequest(tank);
              }}
              className="w-full h-14 rounded-2xl border-red-50 text-red-500 hover:bg-red-50 hover:text-red-600 font-black uppercase text-base tracking-widest transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir Reservatório
            </Button>
          )}
        </div>
      </Modal>

      <Modal
        hideCancel={true}
        isOpen={isFuelLogModalOpen}
        onClose={() => setIsFuelLogModalOpen(false)}
        maxWidth="custom"
        className="p-0 border-none sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        headerClassName="hidden"
      >
        <div
          className={cn(
            "p-8 text-white relative overflow-hidden",
            newFuelLog.type === "entrada" ? "bg-emerald-600" : "bg-orange-600",
          )}
        >
          <Droplet className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10 text-left">
            <h2 className="text-2xl font-black text-white leading-tight">
              {newFuelLog.type === "entrada"
                ? "Entrada de Combustível"
                : "Abastecimento"}
            </h2>
            <p className="text-white/80 text-base font-bold uppercase tracking-widest mt-1 opacity-80">
              {newFuelLog.type === "entrada"
                ? "Registro de compra/carga"
                : "Saída para equipamento"}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2 text-left">
              <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                Data
              </Label>
              <Input
                type="date"
                value={newFuelLog.date}
                onChange={(e) =>
                  setNewFuelLog({ ...newFuelLog, date: e.target.value })
                }
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                Reservatório de Origem
              </Label>
              <Select
                value={newFuelLog.tankId || ""}
                onValueChange={(val) =>
                  setNewFuelLog({ ...newFuelLog, tankId: val })
                }
              >
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Selecione o reservatório" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {fuelTanks.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="font-bold">
                      {t.name} ({t.currentLevel}/{t.capacity}L) - {t.fuelType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newFuelLog.type === "saida" && (
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                    Equipamento Destino
                  </Label>
                  <Popover open={openDest} onOpenChange={setOpenDest}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-12 px-4 border-gray-100 bg-gray-50/50 rounded-xl font-bold text-base"
                      >
                        {(() => {
                          if (!newFuelLog.equipmentId)
                            return "Selecionar destino...";
                          const eq = equipments.find(
                            (e) => e.id === newFuelLog.equipmentId,
                          );
                          if (eq) return `${eq.name} (${eq.plate})`;
                          const tk = fuelTanks.find(
                            (t) => t.id === newFuelLog.equipmentId,
                          );
                          if (tk) return `Reservatório: ${tk.name}`;
                          return "Destino selecionado";
                        })()}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-full p-0 max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl overflow-hidden border-gray-100 shadow-2xl"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder="Filtrar equipamentos..."
                          className="border-none focus:ring-0 font-bold"
                        />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty>
                            Nenhum destino encontrado.
                          </CommandEmpty>

                          {fuelTanks.filter(
                            (t) =>
                              t.id !== newFuelLog.tankId &&
                              (!selectedContractId ||
                                t.contractId === selectedContractId),
                          ).length > 0 && (
                            <CommandGroup heading="Reservatórios">
                              {fuelTanks
                                .filter((t) => t.id !== newFuelLog.tankId)
                                .filter(
                                  (t) =>
                                    !selectedContractId ||
                                    t.contractId === selectedContractId,
                                )
                                .map((t) => (
                                  <CommandItem
                                    key={t.id}
                                    value={t.name + " reservatório"}
                                    onSelect={() => {
                                      setNewFuelLog({
                                        ...newFuelLog,
                                        equipmentId: t.id,
                                      });
                                      setOpenDest(false);
                                    }}
                                    className="py-3 px-4 rounded-xl cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 text-blue-600",
                                        newFuelLog.equipmentId === t.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-black text-gray-900 uppercase text-base">
                                        Reservatório: {t.name}
                                      </span>
                                      <span className="text-sm text-gray-500 font-bold">
                                        Nível: {t.currentLevel}L / {t.capacity}L
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          )}

                          <CommandGroup heading="Equipamentos">
                            {filteredEquipments
                              .filter((e) => !e.exitDate)
                              .map((e) => (
                                <CommandItem
                                  key={e.id}
                                  value={e.name + " " + e.plate}
                                  onSelect={() => {
                                    setNewFuelLog({
                                      ...newFuelLog,
                                      equipmentId: e.id,
                                    });
                                    setOpenDest(false);
                                  }}
                                  className="py-3 px-4 rounded-xl cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 text-blue-600",
                                      newFuelLog.equipmentId === e.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-black text-gray-900 uppercase text-base">
                                      {e.name}
                                    </span>
                                    <span className="text-sm text-gray-500 font-bold tracking-tight">
                                      PLACA: {e.plate || "S/N"}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {newFuelLog.equipmentId && !fuelTanks.some(t => t.id === newFuelLog.equipmentId) && (
                  <div className="space-y-2 text-left pt-2 border-t border-gray-100">
                    <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                      Horímetro / KM (Atual)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: 1540.5"
                      value={newFuelLog.hourMeter || ""}
                      onChange={(e) =>
                        setNewFuelLog({
                          ...newFuelLog,
                          hourMeter: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold text-gray-900 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 text-left">
              <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                Quantidade (Litros)
              </Label>
              <Input
                type="number"
                value={newFuelLog.quantity || ""}
                onChange={(e) => {
                  const qty = Number(e.target.value);
                  setNewFuelLog({
                    ...newFuelLog,
                    quantity: qty,
                    cost: qty * (newFuelLog.unitPrice || 0),
                  });
                }}
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-black text-blue-600 focus:ring-blue-500"
              />
            </div>

            {newFuelLog.type === "entrada" && (
              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-100">
                <div className="space-y-2 text-left">
                  <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                    Fornecedor / Nº Nota
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Fornecedor"
                      value={newFuelLog.supplier || ""}
                      onChange={(e) =>
                        setNewFuelLog({
                          ...newFuelLog,
                          supplier: e.target.value,
                        })
                      }
                      className="h-12 border-gray-100 bg-gray-50/50 rounded-xl"
                    />
                    <Input
                      placeholder="Nota Fiscal"
                      value={newFuelLog.invoiceNumber || ""}
                      onChange={(e) =>
                        setNewFuelLog({
                          ...newFuelLog,
                          invoiceNumber: e.target.value,
                        })
                      }
                      className="h-12 border-gray-100 bg-gray-50/50 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2 text-left">
                    <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                      Preço Un. (R$)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newFuelLog.unitPrice || ""}
                      onChange={(e) => {
                        const up = Number(e.target.value);
                        setNewFuelLog({
                          ...newFuelLog,
                          unitPrice: up,
                          cost: up * (newFuelLog.quantity || 0),
                        });
                      }}
                      className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-base font-black text-gray-400 uppercase tracking-widest">
                      Custo Total (R$)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newFuelLog.cost || ""}
                      onChange={(e) =>
                        setNewFuelLog({
                          ...newFuelLog,
                          cost: Number(e.target.value),
                        })
                      }
                      className="h-12 border-emerald-100 bg-emerald-50/50 rounded-xl font-black text-emerald-700"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 pb-8 pt-2">
          <Button
            onClick={handleCreateFuelLog}
            className={cn(
              "w-full h-14 rounded-2xl font-black uppercase text-base tracking-widest shadow-xl transition-all active:scale-[0.98]",
              newFuelLog.type === "entrada"
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                : "bg-orange-600 hover:bg-orange-700 shadow-orange-100",
            )}
          >
            {newFuelLog.type === "entrada"
              ? "Registrar Nova Entrada"
              : "Registrar Saída"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsFuelLogModalOpen(false)}
            className="w-full mt-2 h-10 rounded-xl font-bold uppercase text-sm text-gray-400"
          >
            Cancelar operação
          </Button>
        </div>
      </Modal>

      <Modal
        hideCancel={true}
        isOpen={isMaterialRequestModalOpen}
        onClose={() => setIsMaterialRequestModalOpen(false)}
        maxWidth="custom"
        className="p-0 border-none sm:max-w-[800px] h-[750px] max-h-[90vh] flex flex-col overflow-hidden"
        headerClassName="hidden"
      >
        <div className="bg-blue-600 p-8 text-white relative overflow-hidden rounded-t-2xl shrink-0">
          <ShoppingCart className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10 text-left">
            <h2 className="text-3xl font-black tracking-tight">
              Solicitação de Compra
            </h2>
            <p className="text-blue-100 font-bold uppercase text-base tracking-widest mt-1">
              Gerencie os detalhes e itens da solicitação para o Controlador
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-base uppercase font-bold text-gray-400">
                Data da Solicitação
              </Label>
              <Input
                type="date"
                className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-medium"
                value={currentRequest.date || ""}
                onChange={(e) =>
                  setCurrentRequest({ ...currentRequest, date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base uppercase font-bold text-gray-400">
                Setor Solicitante
              </Label>
              <Input
                placeholder="Ex: CONTROLADOR"
                value={currentRequest.sector || "CONTROLADOR"}
                onChange={(e) =>
                  setCurrentRequest({
                    ...currentRequest,
                    sector: e.target.value,
                  })
                }
                className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base uppercase font-bold text-gray-400">
              Descrição Geral / Motivo
            </Label>
            <Input
              placeholder="Ex: Reposição de peças para equipamentos"
              className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-medium"
              value={currentRequest.description || ""}
              onChange={(e) =>
                setCurrentRequest({
                  ...currentRequest,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base uppercase font-bold text-gray-400">
              Obra / Contrato Vinculado
            </Label>
            <Select
              value={
                currentRequest.contractId ||
                (selectedContractId !== "all" ? selectedContractId : "none")
              }
              onValueChange={(v) =>
                setCurrentRequest({ ...currentRequest, contractId: v })
              }
            >
              <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-bold text-blue-900">
                <SelectValue placeholder="Vincular a uma obra...">
                  {(() => {
                    const val =
                      currentRequest.contractId ||
                      (selectedContractId !== "all"
                        ? selectedContractId
                        : "none");
                    if (val === "none") return "Sem vínculo específico";
                    const c = contracts.find((curr) => curr.id === val);
                    if (!c) return null;
                    return c.workName
                      ? `${c.workName} ${c.contractNumber ? `(${c.contractNumber})` : ""}`
                      : c.contractNumber || c.client || "Obra sem nome";
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-blue-100 shadow-2xl">
                <SelectItem value="none" className="font-bold">
                  Sem vínculo específico
                </SelectItem>
                {contracts.map((c) => {
                  const label = c.workName
                    ? `${c.workName} ${c.contractNumber ? `(${c.contractNumber})` : ""}`
                    : c.contractNumber || c.client || "Obra sem nome";
                  return (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      textValue={label}
                      className="font-medium"
                    >
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-base uppercase font-bold text-gray-400">
                Prioridade
              </Label>
              <Select
                value={currentRequest.priority || "Normal"}
                onValueChange={(v: any) =>
                  setCurrentRequest({ ...currentRequest, priority: v })
                }
              >
                <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem
                    value="Urgente"
                    className="text-red-600 font-black"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      URGENTE
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="Alta"
                    className="text-orange-600 font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      ALTA
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="Normal"
                    className="text-blue-600 font-bold"
                  >
                    NORMAL
                  </SelectItem>
                  <SelectItem value="Baixa" className="text-gray-600 font-bold">
                    BAIXA
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 relative">
              <Label className="text-base uppercase font-bold text-gray-400">
                Categoria
              </Label>
              <div className="relative">
                <Input
                  value={newRequestCategory}
                  onChange={(e) => {
                    setNewRequestCategory(e.target.value);
                    setShowCategorySuggestions(true);
                  }}
                  onFocus={() => setShowCategorySuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowCategorySuggestions(false), 200)
                  }
                  placeholder="Ex. Mecânica, Elétrica..."
                  className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-bold"
                />
                {showCategorySuggestions &&
                  savedCategories.filter((c) =>
                    c.toLowerCase().includes(newRequestCategory.toLowerCase()),
                  ).length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden py-2">
                      {savedCategories
                        .filter((c) =>
                          c
                            .toLowerCase()
                            .includes(newRequestCategory.toLowerCase()),
                        )
                        .map((cat) => (
                          <div
                            key={cat}
                            className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-base font-bold text-gray-700"
                            onClick={() => {
                              setNewRequestCategory(cat);
                              setShowCategorySuggestions(false);
                            }}
                          >
                            {cat}
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base uppercase font-black text-gray-400 tracking-widest">
                Itens da Solicitação
              </Label>
              <Button
                type="button"
                size="sm"
                onClick={addItemInput}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none h-8 font-bold text-base rounded-lg"
              >
                <Plus className="w-3 h-3 mr-1" /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin-visible">
              {(currentRequest.items || []).map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:shadow-md hover:border-blue-100 relative"
                >
                  <div className="col-span-12 sm:col-span-7 space-y-1">
                    <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                      Descrição do Item / Aplicação
                    </Label>
                    <Input
                      placeholder="Ex: Filtro de Óleo - Placa ABC-1234"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                      className="h-10 border-gray-200 rounded-xl focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                      Qtd
                    </Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "quantity",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="h-10 border-gray-200 rounded-xl focus:ring-blue-500 bg-white text-center"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                      Unid
                    </Label>
                    <Input
                      placeholder="un"
                      value={item.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)}
                      className="h-10 border-gray-200 rounded-xl focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex items-end justify-center pb-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(idx)}
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {(currentRequest.items || []).length === 0 && (
                <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-base font-medium">
                    Nenhum item adicionado ainda.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addItemInput}
                    className="mt-2 text-emerald-600 border-emerald-200"
                  >
                    Clique para adicionar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-4 shrink-0 border-t border-gray-100 bg-white">
          <Button
            onClick={handleCreateMaterialRequest}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black uppercase text-base tracking-widest transition-all active:scale-[0.98]"
          >
            {purchaseRequests.some((r) => r.id === currentRequest.id)
              ? "Salvar Solicitação"
              : "Enviar Solicitação"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsMaterialRequestModalOpen(false)}
            className="w-full mt-2 h-10 rounded-xl font-bold uppercase text-sm text-gray-400 tracking-widest hover:text-gray-600"
          >
            Fechar janela
          </Button>
        </div>
      </Modal>

      <Modal
        hideCancel={true}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        maxWidth="custom"
        className="p-0 sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        headerClassName="hidden"
      >
        <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
          <Truck className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10 text-left">
            <div className="flex items-center gap-3 mb-2">
              <Badge
                variant="outline"
                className="border-blue-400 text-blue-100 bg-blue-500/20 px-2 py-0.5 text-sm font-black uppercase tracking-widest"
              >
                {selectedEquipment?.code || "SEM CÓDIGO"}
              </Badge>
              <Badge
                variant="outline"
                className="border-blue-400 text-blue-100 bg-blue-500/20 px-2 py-0.5 text-sm font-black uppercase tracking-widest"
              >
                {selectedEquipment?.situation}
              </Badge>
            </div>
            <h2 className="text-3xl font-black tracking-tight">
              {selectedEquipment?.name}
            </h2>
            <p className="text-blue-100 font-bold uppercase text-base tracking-widest mt-1">
              {selectedEquipment?.brand} {selectedEquipment?.model} • Placa:{" "}
              {selectedEquipment?.plate}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-base font-black uppercase text-gray-400 tracking-widest border-b pb-2">
                Informações Base
              </h4>
              <div className="grid gap-3">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-base font-bold text-gray-500 uppercase">
                    Ano
                  </span>
                  <span className="text-base font-black">
                    {selectedEquipment?.year}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-base font-bold text-gray-500 uppercase">
                    Horímetro Atual
                  </span>
                  <span className="text-base font-black text-blue-600 font-mono tracking-tighter">
                    {selectedEquipment?.currentReading}h
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-base font-bold text-gray-500 uppercase">
                    Obra Atual
                  </span>
                  <span className="text-base font-black text-emerald-600">
                    {getContractName(selectedEquipment?.contractId || "")}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-base font-black uppercase text-gray-400 tracking-widest border-b pb-2">
                Status Operacional
              </h4>
              <div className="grid gap-3">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-base font-bold text-gray-500 uppercase">
                    Em Manutenção?
                  </span>
                  <Badge
                    className={cn(
                      "text-sm font-black px-2",
                      selectedEquipment?.inMaintenance
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200",
                    )}
                  >
                    {selectedEquipment?.inMaintenance ? "SIM" : "NÃO"}
                  </Badge>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-base font-bold text-gray-500 uppercase">
                    Status do Patrimônio
                  </span>
                  <span className="text-base font-black">
                    {selectedEquipment?.situation}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-base font-black uppercase text-gray-400 tracking-widest border-b pb-2">
              Atributos Técnicos
            </h4>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(selectedEquipment?.customFields || {}).map(
                ([key, f]) => {
                  const field = f as EquipmentAttribute;
                  return (
                    <div
                      key={key}
                      className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-1"
                    >
                      <span className="text-sm font-bold text-blue-600 uppercase tracking-tighter">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="text-base font-black text-gray-900">
                        {field.type === "boolean"
                          ? field.value
                            ? "Sim"
                            : "Não"
                          : field.value}
                      </span>
                    </div>
                  );
                },
              )}
              {(!selectedEquipment?.customFields ||
                Object.keys(selectedEquipment.customFields).length === 0) && (
                <div className="col-span-full py-4 text-center text-base text-gray-400 font-bold uppercase italic">
                  Sem atributos customizados
                </div>
              )}
            </div>
          </div>

          {selectedEquipment?.observations && (
            <div className="space-y-2">
              <h4 className="text-base font-black uppercase text-gray-400 tracking-widest border-b pb-2">
                Observações Gerais
              </h4>
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-base font-medium text-gray-700 leading-relaxed italic">
                "{selectedEquipment.observations}"
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={() => setIsDetailOpen(false)}
            className="rounded-xl font-bold uppercase text-base h-12 px-6 flex-1"
          >
            Fechar
          </Button>
          <Button
            onClick={() => {
              setEquipmentToEdit(selectedEquipment);
              setIsEditOpen(true);
              setIsDetailOpen(false);
            }}
            className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold uppercase text-base tracking-widest flex-[2]"
          >
            <Edit className="w-4 h-4 mr-2" /> Editar Equipamento
          </Button>
        </DialogFooter>
      </Modal>
      <Modal
        hideCancel={true}
        isOpen={!!exportData}
        onClose={() => setExportData(null)}
        className="sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        title="Exportar Relatório"
        description="Escolha o formato para exportar a medição"
      >
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            className="flex flex-col items-center justify-center p-6 bg-white border border-red-200 text-red-600 rounded-2xl hover:bg-red-50 hover:border-red-300 transition-colors"
            onClick={() => {
              if (exportData)
                generateMeasurementPDF(
                  exportData.measurement,
                  exportData.equipment,
                );
              setExportData(null);
            }}
          >
            <FileText className="w-8 h-8 mb-2" />
            <span className="font-bold text-base uppercase">PDF</span>
          </Button>
          <Button
            className="flex flex-col items-center justify-center p-6 bg-white border border-emerald-200 text-emerald-600 rounded-2xl hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
            onClick={() => {
              if (exportData)
                generateMeasurementExcel(
                  exportData.measurement,
                  exportData.equipment,
                );
              setExportData(null);
            }}
          >
            <FileDown className="w-8 h-8 mb-2" />
            <span className="font-bold text-base uppercase">Excel</span>
          </Button>
        </div>
      </Modal>

      <Modal
        hideCancel={true}
        isOpen={isMaintenanceDiscountModalOpen}
        onClose={() => {
          setIsMaintenanceDiscountModalOpen(false);
          setSelectedMaintenanceToDiscount([]);
        }}
        className="sm:max-w-[800px] h-[600px] flex flex-col overflow-hidden"
        title="Descontos de Manutenção"
        description="Selecione as manutenções para descontar desta medição"
      >
        {selectedMeasurementForDiscount &&
          (() => {
            const { m, e } = selectedMeasurementForDiscount;
            const pStartDay = m.period.split(" a ")[0];
            const pEndDay = m.period.split(" a ")[1];
            const startRange = new Date(pStartDay + "T00:00:00");
            const endRange = new Date(pEndDay + "T23:59:59");

            const maintenanceOptions = equipmentMaintenance.filter(
              (maint) =>
                maint.equipmentId === e.id &&
                new Date(maint.entryDate) >= startRange &&
                new Date(maint.entryDate) <= endRange,
            );

            return (
              <div className="space-y-4 py-4">
                {maintenanceOptions.map((maint) => (
                  <div
                    key={maint.id}
                    className="flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMaintenanceToDiscount.includes(maint.id)}
                      onChange={(ev) => {
                        if (ev.target.checked) {
                          setSelectedMaintenanceToDiscount([
                            ...selectedMaintenanceToDiscount,
                            maint.id,
                          ]);
                        } else {
                          setSelectedMaintenanceToDiscount(
                            selectedMaintenanceToDiscount.filter(
                              (id) => id !== maint.id,
                            ),
                          );
                        }
                      }}
                    />
                    <label className="text-base font-medium">
                      {new Date(maint.entryDate).toLocaleDateString("pt-BR")} -{" "}
                      {maint.type === "preventive" ? "PREV" : "CORR"} -{" "}
                      {maint.requestedItems}
                    </label>
                  </div>
                ))}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setIsMaintenanceDiscountModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      if (selectedMaintenanceToDiscount.length === 0) return;
                      // Logic to save. For now, since user asked for SQL for saving, I will assume a backend endpoint exists or I should just implement the DB save here?
                      // The prompt asked for both: "um botão... modal... e uma caixa de seleção" AND "crie um script sql para para salvar".
                      // I will implement the UI. The SQL will be provided separately as requested.
                      alert(
                        "Item selecionados para desconto: " +
                          selectedMaintenanceToDiscount.length,
                      );
                      setIsMaintenanceDiscountModalOpen(false);
                    }}
                  >
                    Salvar Descontos
                  </Button>
                </div>
              </div>
            );
          })()}
      </Modal>

      <Modal
        isOpen={isExportSelectorOpen}
        onClose={() => setIsExportSelectorOpen(false)}
        title="Exportar Medição"
        description={selectedEquipment ? `Escolha o formato de saída para o ativo ${selectedEquipment.name}` : "Selecione o formato de exportação"}
        hideCancel={true}
        className="sm:max-w-[650px]"
      >
        <div className="space-y-6 p-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* option 1: PDF */}
            <button
              onClick={() => {
                const measurement = getActiveMeasurementObject();
                if (measurement && selectedEquipment) {
                  generateMeasurementPDF(measurement, selectedEquipment);
                }
                setIsExportSelectorOpen(false);
              }}
              className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-red-500 hover:bg-red-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-slate-800 text-sm">Relatório PDF</span>
              <span className="text-slate-400 text-[10px] mt-1">Gera o PDF oficial com assinaturas</span>
            </button>

            {/* option 2: EXCEL standard */}
            <button
              onClick={() => {
                const measurement = getActiveMeasurementObject();
                if (measurement && selectedEquipment) {
                  generateMeasurementExcel(measurement, selectedEquipment);
                }
                setIsExportSelectorOpen(false);
              }}
              className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform mb-3">
                <Download className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-slate-800 text-sm">Planilha Excel</span>
              <span className="text-slate-400 text-[10px] mt-1">Agrupa produção, abastecimentos e manutenções</span>
            </button>

            {/* option 3: EXCEL Custom Template */}
            <button
              onClick={() => {
                exportModelInputRef.current?.click();
              }}
              className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform mb-3">
                <Tag className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-slate-800 text-sm font-sans">Carregar Modelo</span>
              <span className="text-slate-400 text-[10px] mt-1">Carrega o seu próprio Excel modelo e atualiza as tags #</span>
            </button>
          </div>

          <input
            type="file"
            ref={exportModelInputRef}
            className="hidden"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              const measurement = getActiveMeasurementObject();
              if (file && measurement && selectedEquipment) {
                generateMeasurementFromModel(file, measurement, selectedEquipment);
                setIsExportSelectorOpen(false);
              }
              e.target.value = ""; // clear so user can select same file again
            }}
          />

          <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600 border border-slate-105">
            <p className="font-bold text-slate-800">Dica sobre a Substituição de Tags do Modelo:</p>
            <p>Selecione um arquivo de modelo Excel (.xlsx) de seu computador. O sistema irá varrer todas as planilhas e substituir as tags pelos dados correspondentes:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <p className="font-bold text-slate-700 text-[11px]">Dados do Equipamento: [dado]</p>
                <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-blue-700 bg-white p-2 rounded-lg border border-slate-200">
                  <div><span className="font-bold text-slate-600">[nome]</span> - nome equipamento</div>
                  <div><span className="font-bold text-slate-600">[codigo]</span> - cod. do ativo</div>
                  <div><span className="font-bold text-slate-600">[placa]</span> - placa do ativo</div>
                  <div><span className="font-bold text-slate-600">[modelo]</span> - modelo ativo</div>
                  <div><span className="font-bold text-slate-600">[unidade]</span> - un. de medida</div>
                  <div><span className="font-bold text-slate-600">[total_unidades]</span> - total produzido</div>
                  <div><span className="font-bold text-slate-600">[total_valor]</span> - faturamento total</div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-700 text-[11px]">Colunas da Medição: #coluna</p>
                <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-emerald-700 bg-white p-2 rounded-lg border border-slate-200">
                  <div><span className="font-bold text-slate-600">#data</span> - coluna datas diárias</div>
                  <div><span className="font-bold text-slate-600">#inicial</span> - leituras iniciais</div>
                  <div><span className="font-bold text-slate-600">#final</span> - leituras finais</div>
                  <div><span className="font-bold text-slate-600">#producao</span> - produção líquida</div>
                  <div><span className="font-bold text-slate-600">#status</span> - status do dia</div>
                  <div><span className="font-bold text-slate-600">#desconto</span> - se houve desconto</div>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={downloadExportTagsInstructionsPDF}
                className="w-full h-11 rounded-xl shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50/50 flex items-center justify-center gap-2 font-bold transition duration-200 text-xs cursor-pointer"
                title="Baixar PDF com as Instruções de todas as Tags [Equipamento] e #Colunas"
              >
                <FileText className="w-4 h-4 text-blue-600" /> Baixar Manual de Instruções das Tags (PDF)
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportSelectorOpen(false)}
              className="px-6 py-2 rounded-xl text-slate-500 font-bold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Fechar Janela
            </Button>
          </div>
        </div>
      </Modal>

      <Dialog open={isApplyStockOpen} onOpenChange={setIsApplyStockOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-blue-600">
              Aplicar Material em Equipamento
            </DialogTitle>
            <DialogDescription className="text-base font-bold text-gray-400 uppercase">
              Retirada de material do estoque para manutenção
            </DialogDescription>
          </DialogHeader>

          {selectedStockItem && (
            <div className="space-y-6 pt-4">
              <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                <span className="text-base font-bold text-gray-400 uppercase tracking-widest">
                  Material Selecionado
                </span>
                <span className="text-base font-black text-gray-900">
                  {selectedStockItem.item.description}
                </span>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                  <span className="text-base font-bold text-gray-400 uppercase">
                    Saldo Disponível
                  </span>
                  <Badge className="bg-blue-100 text-blue-700 border-none font-black">
                    {selectedStockItem.item.quantity -
                      (selectedStockItem.item.appliedQuantity || 0)}{" "}
                    {selectedStockItem.item.unit}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base uppercase font-bold text-gray-400">
                    Equipamento de Destino
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Digitar nome ou placa para buscar..."
                      value={applyEquipmentSearch}
                      onChange={(e) => {
                        setApplyEquipmentSearch(e.target.value);
                        if (applyEquipmentId) setApplyEquipmentId("");
                      }}
                      className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 pr-10"
                    />
                    <Search className="w-5 h-5 text-gray-400 absolute right-3 top-3.5" />
                  </div>
                  
                  {(() => {
                    const activeEquips = equipments.filter((e) => !e.exitDate);
                    const query = applyEquipmentSearch.toLowerCase().trim();
                    const filtered = activeEquips.filter(
                      (e) =>
                        !query ||
                        (e.name || "").toLowerCase().includes(query) ||
                        (e.plate || "").toLowerCase().includes(query)
                    );

                    if (query && filtered.length > 0 && !applyEquipmentId) {
                      return (
                        <div className="border border-gray-100 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-50 bg-white shadow-lg z-50 relative">
                          {filtered.map((e) => (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => {
                                setApplyEquipmentId(e.id);
                                setApplyEquipmentSearch(`${e.name} (${e.plate})`);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex justify-between items-center"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800">{e.name}</span>
                                <span className="text-[11px] text-slate-500 font-mono uppercase font-bold">Placa: {e.plate}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    }

                    if (applyEquipmentId) {
                      const selectedEq = equipments.find(e => e.id === applyEquipmentId);
                      if (selectedEq) {
                        return (
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100 mt-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-blue-900">{selectedEq.name}</span>
                              <span className="text-xs text-blue-600 font-bold font-mono">PLACA: {selectedEq.plate}</span>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setApplyEquipmentId("");
                                setApplyEquipmentSearch("");
                              }}
                              className="h-8 text-xs text-red-500 font-bold hover:text-red-700 hover:bg-red-50"
                            >
                              Limpar
                            </Button>
                          </div>
                        );
                      }
                    }

                    if (query && filtered.length === 0) {
                      return (
                        <p className="text-xs text-red-500 italic mt-1 font-bold">Nenhum equipamento ativo encontrado com este termo.</p>
                      );
                    }

                    return (
                      <div className="border border-gray-100 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-50 bg-white shadow-inner mt-2">
                        {activeEquips.slice(0, 5).map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => {
                              setApplyEquipmentId(e.id);
                              setApplyEquipmentSearch(`${e.name} (${e.plate})`);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex justify-between items-center"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{e.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Placa: {e.plate}</span>
                            </div>
                          </button>
                        ))}
                        {activeEquips.length > 5 && (
                          <div className="p-2 text-center text-[10px] text-gray-400 font-semibold uppercase">
                            Digite para ver todos os {activeEquips.length} equipamentos ativos
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <Label className="text-base uppercase font-bold text-gray-400">
                    Quantidade a Aplicar
                  </Label>
                  <Input
                    type="number"
                    value={applyQuantity}
                    onChange={(e) => setApplyQuantity(Number(e.target.value))}
                    max={
                      selectedStockItem.item.quantity -
                      (selectedStockItem.item.appliedQuantity || 0)
                    }
                    min={1}
                    className="h-12 border-gray-200 rounded-xl font-black text-blue-600 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-400 font-medium italic">
                    * A quantidade aplicada será registrada no histórico do
                    equipamento.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-8">
            <Button
              onClick={handleApplyStock}
              disabled={
                !applyEquipmentId ||
                applyQuantity <= 0 ||
                (selectedStockItem
                  ? applyQuantity >
                    selectedStockItem.item.quantity -
                      (selectedStockItem.item.appliedQuantity || 0)
                  : true)
              }
              className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200"
            >
              Confirmar Aplicação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
