import React, { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { cn, applyCPFMask, applyPhoneMask, applyCEPMask } from "../lib/utils";
import {
  Users,
  Calendar,
  FileText,
  Download,
  Search,
  Building2,
  Home,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  ChevronUp,
  FileDown,
  AlertCircle,
  DollarSign,
  FileCode,
  Sun,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  User as UserIcon,
  MapPin,
  Smartphone,
  Mail,
  CreditCard,
  Briefcase,
  Contact,
  HardHat,
  Baby,
  Heart,
  Plus,
  Trash2,
  UserPlus,
  UserX,
  LogOut,
  FileSpreadsheet,
  Edit,
  Check,
  ArrowRight,
  Upload,
  Printer,
  X,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Employee,
  TimeRecord,
  User,
  Dependent,
  ControllerManpower,
  ManpowerMonthlyData,
  Contract,
  ControllerTeam,
  TeamAssignment,
  Alojamento,
} from "../types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getSupabaseConfig, createSupabaseClient } from "../lib/supabaseClient";

import { v4 as generateUUID } from "uuid";

const EMPLOYEE_DB_COLUMNS = [
  "id",
  "company_id",
  "name",
  "role",
  "status",
  "admission_date",
  "dismissal_date",
  "salary",
  "payment_type",
  "cpf",
  "rg_number",
  "rg_agency",
  "rg_issuer",
  "rg_state",
  "birth_date",
  "birth_place",
  "birth_state",
  "work_booklet_number",
  "work_booklet_series",
  "pis",
  "phone",
  "mobile",
  "email",
  "voter_id_number",
  "voter_zone",
  "voter_section",
  "father_name",
  "mother_name",
  "spouse_name",
  "dependents",
  "address_logradouro",
  "address_number",
  "address_complement",
  "address_neighborhood",
  "address_city",
  "address_zip_code",
  "address_state",
  "contract_id",
  "alojamento_id",
  "commuter_benefits",
  "commuter_value1",
  "commuter_city1",
  "commuter_value2",
  "commuter_city2",
  "team",
  "charges_percentage",
  "overtime_percentage",
  "created_at",
  "updated_at",
];

const mapToSnake = (obj: any) => {
  if (!obj) return obj;
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`,
    );
    if (EMPLOYEE_DB_COLUMNS.includes(snakeKey)) {
      result[snakeKey] = obj[key] === undefined ? null : obj[key];
    }
  }
  return result;
};

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { RHDocuments } from "./RHDocuments";

interface RHViewProps {
  currentUser: User;
  employees: Employee[];
  alojamentos?: Alojamento[];
  onUpdateAlojamentos?: (alojamentos: Alojamento[]) => void;
  timeRecords: TimeRecord[];
  contracts: Contract[];
  selectedContractId: string | null;
  onUpdateContractId: (id: string) => void;
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateRecords: (records: TimeRecord[]) => void;
  initialTab?: string;
  controllerTeams?: ControllerTeam[];
  teamAssignments?: TeamAssignment[];
  onUpdateAssignments?: (assignments: TeamAssignment[]) => void;
  onUpdateTeams?: (teams: ControllerTeam[]) => void;
}

export default function RHView({
  currentUser,
  employees,
  alojamentos = [],
  onUpdateAlojamentos,
  timeRecords,
  contracts,
  selectedContractId,
  onUpdateContractId,
  onUpdateEmployees,
  onUpdateRecords,
  initialTab,
  controllerTeams = [],
  teamAssignments = [],
  onUpdateAssignments,
  onUpdateTeams,
}: RHViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab || "employees");
  const [rhParams, setRhParams] = useState(() => {
    const defaultParams = {
      workEntryTime: "08:00",
      workExitTime: "17:00",
      lunchStart: "12:00",
      lunchEnd: "13:00",
      dailyHours: 8,
      weeklyHours: 44,
      workSchedule: "5x2",
      delayTolerance: 5,
      extraHoursTolerance: 10,
      overtimeRate50: 50,
      overtimeRate100: 100,
      nightShiftStart: "22:00",
      nightShiftEnd: "05:00",
      nightShiftAllowance: 20,
      timeBankEnabled: true,
      timeBankMaxPositive: 40,
      timeBankMaxNegative: -20,
      timeBankValidityMonths: 6,
      autoCompensate: true,
      periodStartDay: 21,
      periodEndDay: 20,
      extraCosts: [
        { id: "1", name: "FGTS", percentage: 8 },
        { id: "2", name: "INSS Patronal", percentage: 20 },
        { id: "3", name: "Férias + 1/3 Proporcional", percentage: 11.11 },
        { id: "4", name: "13º Salário Proporcional", percentage: 8.33 }
      ]
    };
    const saved = localStorage.getItem("rh_parameters_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultParams, ...parsed };
      } catch (e) {
        console.error("Error parsing RH parameters:", e);
      }
    }
    return defaultParams;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showLoadedSalary, setShowLoadedSalary] = useState(false);
  const [newCostName, setNewCostName] = useState("");
  const [newCostPercentage, setNewCostPercentage] = useState("");
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostName, setEditingCostName] = useState("");
  const [editingCostPercentage, setEditingCostPercentage] = useState("");

  // States for Lodgings (Alojamentos)
  const [showAddAlojamento, setShowAddAlojamento] = useState(false);
  const [alF_name, setAlF_name] = useState("");
  const [alF_address, setAlF_address] = useState("");
  const [alF_city, setAlF_city] = useState("");
  const [alF_rooms, setAlF_rooms] = useState("1");
  const [alF_maxCap, setAlF_maxCap] = useState("10");

  const [viewingAlojamentoId, setViewingAlojamentoId] = useState<string | null>(null);
  const [addingToAlojamentoId, setAddingToAlojamentoId] = useState<string | null>(null);
  const [searchAlTerm, setSearchAlTerm] = useState("");

  // Sync activeTab if initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load RH Parameters from Supabase if enabled
  useEffect(() => {
    const fetchParamsFromDB = async () => {
      const configObj = getSupabaseConfig();
      if (configObj.enabled) {
        const supabase = createSupabaseClient(configObj.url, configObj.key);
        if (supabase) {
          try {
            const compId = currentUser?.companyId || "default";
            const { data, error } = await supabase
              .from("system_config")
              .select("config_value")
              .eq("company_id", compId)
              .eq("config_key", "rh_parameters_config")
              .maybeSingle();

            if (data && data.config_value) {
              setRhParams((prev: any) => ({
                ...prev,
                ...data.config_value,
              }));
            }
          } catch (e) {
            console.error("Error loading RH parameters from DB:", e);
          }
        }
      }
    };
    fetchParamsFromDB();
  }, [currentUser?.companyId]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  ); // YYYY-MM

  const [colabSelectedMonth, setColabSelectedMonth] = useState("");
  const [colabClosingRecordsMap, setColabClosingRecordsMap] = useState<Record<string, any>>({});

  // States and logic for Fechamento de Jornada
  const [closingRecordsMap, setClosingRecordsMap] = useState<Record<string, any>>({});
  const [isSavingClosings, setIsSavingClosings] = useState(false);
  const [isLoadingClosings, setIsLoadingClosings] = useState(false);

  useEffect(() => {
    if (!colabSelectedMonth) {
      setColabClosingRecordsMap({});
      return;
    }
    const fetchColabClosings = async () => {
      const compId = currentUser?.companyId || "default";
      const key = `rh_fechamento_jornada_${compId}_${colabSelectedMonth}`;
      
      let initialMap: Record<string, any> = {};
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          initialMap = JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing saved colab closings:", e);
        }
      }

      // Check if Supabase is active
      const configObj = getSupabaseConfig();
      if (configObj.enabled) {
        const supabase = createSupabaseClient(configObj.url, configObj.key);
        if (supabase) {
          try {
            const { data } = await supabase
              .from("period_closing_records")
              .select("*")
              .eq("company_id", compId)
              .eq("closing_month", colabSelectedMonth);

            if (data && data.length > 0) {
              const dbMap: Record<string, any> = {};
              data.forEach((row: any) => {
                dbMap[row.employee_id] = {
                  workedDays: row.worked_days,
                  absences: row.absences,
                  medicalCertificates: row.medical_certificates,
                  vacationDays: row.vacation_days,
                  leaveDays: row.leave_days,
                  overtime50: parseFloat(row.overtime_50) || 0,
                  overtime100: parseFloat(row.overtime_100) || 0,
                  nightShift: parseFloat(row.night_shift) || 0,
                  notes: row.notes || "",
                };
              });
              setColabClosingRecordsMap({ ...initialMap, ...dbMap });
              return;
            }
          } catch (e) {
            console.error("Error fetching colab closings from db:", e);
          }
        }
      }
      setColabClosingRecordsMap(initialMap);
    };

    fetchColabClosings();
  }, [colabSelectedMonth, employees, currentUser?.companyId]);

  const calculateEmployeeRemuneration = (emp: Employee, monthRecord?: any) => {
    const baseSalary = emp.salary || 0;
    
    if (!colabSelectedMonth || !monthRecord) {
      return {
        baseSalary,
        hourlyValue: baseSalary / 220,
        overtime50Value: 0,
        overtime100Value: 0,
        absencesDiscount: 0,
        nightShiftValue: 0,
        finalSalary: baseSalary,
        overtime50Qty: 0,
        overtime100Qty: 0,
        absencesDays: 0,
        workedDays: 22,
        nightShiftQty: 0,
      };
    }

    const hourlyValue = baseSalary / 220;
    const overtime50Qty = parseFloat(monthRecord.overtime50) || 0;
    const overtime100Qty = parseFloat(monthRecord.overtime100) || 0;
    const absencesDays = parseInt(monthRecord.absences, 10) || 0;
    const nightShiftQty = parseFloat(monthRecord.nightShift) || 0;
    const workedDays = parseInt(monthRecord.workedDays, 10) || 0;

    const rate50 = rhParams.overtimeRate50 ?? 50;
    const rate100 = rhParams.overtimeRate100 ?? 100;
    const nightRate = rhParams.nightShiftAllowance ?? 20;

    // Hora Extra = Valor Hora × (1 + percentual/100) × Quantidade
    const overtime50Value = hourlyValue * (1 + rate50 / 100) * overtime50Qty;

    // Hora Extra = Valor Hora × (1 + percentual/100) × Quantidade
    const overtime100Value = hourlyValue * (1 + rate100 / 100) * overtime100Qty;

    // Faltas = Salário ÷ 30 × Dias Faltados
    const absencesDiscount = (baseSalary / 30) * absencesDays;

    // Adicional Noturno = Valor Hora × (percentual/100) × Quantidade
    const nightShiftValue = hourlyValue * (nightRate / 100) * nightShiftQty;

    let finalSalary = baseSalary + overtime50Value + overtime100Value - absencesDiscount + nightShiftValue;
    if (finalSalary < 0) finalSalary = 0;

    return {
      baseSalary,
      hourlyValue,
      overtime50Value,
      overtime100Value,
      absencesDiscount,
      nightShiftValue,
      finalSalary,
      overtime50Qty,
      overtime100Qty,
      absencesDays,
      workedDays,
      nightShiftQty,
    };
  };

  useEffect(() => {
    const fetchClosings = async () => {
      setIsLoadingClosings(true);
      const compId = currentUser?.companyId || "default";
      const key = `rh_fechamento_jornada_${compId}_${selectedMonth}`;
      
      // Try local storage first
      const localData = localStorage.getItem(key);
      let initialMap: Record<string, any> = {};
      if (localData) {
        try {
          initialMap = JSON.parse(localData);
        } catch (e) {
          console.error("Error parsing local closing data:", e);
        }
      }

      // Check if Supabase is active
      const configObj = getSupabaseConfig();
      if (configObj.enabled) {
        const supabase = createSupabaseClient(configObj.url, configObj.key);
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from("period_closing_records")
              .select("*")
              .eq("company_id", compId)
              .eq("closing_month", selectedMonth);

            if (data && data.length > 0) {
              const dbMap: Record<string, any> = {};
              data.forEach((row: any) => {
                dbMap[row.employee_id] = {
                  workedDays: row.worked_days,
                  absences: row.absences,
                  medicalCertificates: row.medical_certificates,
                  vacationDays: row.vacation_days,
                  leaveDays: row.leave_days,
                  overtime50: parseFloat(row.overtime_50) || 0,
                  overtime100: parseFloat(row.overtime_100) || 0,
                  nightShift: parseFloat(row.night_shift) || 0,
                  notes: row.notes || "",
                };
              });
              setClosingRecordsMap(dbMap);
              setIsLoadingClosings(false);
              return;
            }
          } catch (e) {
            console.error("Error fetching closings from database:", e);
          }
        }
      }

      // If no Database data, use local storage/default placeholders
      const mergedMap: Record<string, any> = {};
      employees.filter(e => e.status === "active").forEach(emp => {
        if (initialMap[emp.id]) {
          mergedMap[emp.id] = initialMap[emp.id];
        } else {
          mergedMap[emp.id] = {
            workedDays: 22,
            absences: 0,
            medicalCertificates: 0,
            vacationDays: 0,
            leaveDays: 0,
            overtime50: 0,
            overtime100: 0,
            nightShift: 0,
            notes: "",
          };
        }
      });
      setClosingRecordsMap(mergedMap);
      setIsLoadingClosings(false);
    };

    fetchClosings();
  }, [selectedMonth, currentUser?.companyId, employees]);

  // Auto-save closingRecordsMap to localStorage on change to prevent losing typed data
  useEffect(() => {
    if (Object.keys(closingRecordsMap).length > 0) {
      const compId = currentUser?.companyId || "default";
      const key = `rh_fechamento_jornada_${compId}_${selectedMonth}`;
      localStorage.setItem(key, JSON.stringify(closingRecordsMap));
    }
  }, [closingRecordsMap, selectedMonth, currentUser?.companyId]);

  const handleSaveClosings = async () => {
    setIsSavingClosings(true);
    const compId = currentUser?.companyId || "default";
    const key = `rh_fechamento_jornada_${compId}_${selectedMonth}`;
    
    // Save to local storage
    localStorage.setItem(key, JSON.stringify(closingRecordsMap));

    // Prepare records for database
    const configObj = getSupabaseConfig();
    let dbSuccess = false;
    let dbErrDetail = "";

    if (configObj.enabled) {
      const supabase = createSupabaseClient(configObj.url, configObj.key);
      if (supabase) {
        try {
          const upsertPromises = Object.entries(closingRecordsMap).map(([empId, val]) => {
            const emp = employees.find(e => e.id === empId);
            const employeeName = emp?.name || "Colaborador";
            const employeeRole = emp?.role || "Função";
            const id = `${compId}_${selectedMonth}_${empId}`;
            
            return supabase
              .from("period_closing_records")
              .upsert({
                id,
                company_id: compId,
                closing_month: selectedMonth,
                employee_id: empId,
                employee_name: employeeName,
                employee_role: employeeRole,
                worked_days: parseInt(val.workedDays, 10) || 0,
                absences: parseInt(val.absences, 10) || 0,
                medical_certificates: parseInt(val.medicalCertificates, 10) || 0,
                vacation_days: parseInt(val.vacationDays, 10) || 0,
                leave_days: parseInt(val.leaveDays, 10) || 0,
                overtime_50: parseFloat(val.overtime50) || 0,
                overtime_100: parseFloat(val.overtime100) || 0,
                night_shift: parseFloat(val.nightShift) || 0,
                notes: val.notes || "",
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "company_id,closing_month,employee_id"
              });
          });

          const results = await Promise.all(upsertPromises);
          const errors = results.filter(r => r.error);
          if (errors.length > 0) {
            console.error("Errors saving to DB:", errors);
            dbErrDetail = errors.map(e => e.error?.message).join(", ");
          } else {
            dbSuccess = true;
          }
        } catch (e: any) {
          console.error("Exception saving to DB:", e);
          dbErrDetail = e.message;
        }
      }
    }

    setIsSavingClosings(false);
    if (!configObj.enabled) {
      alert(`✅ SUCESSO! O Fechamento de Jornada do mês ${selectedMonth} foi salvo com sucesso no banco de dados de desenvolvimento local.`);
    } else if (dbSuccess) {
      alert(`✅ SUCESSO! O Fechamento de Jornada do mês ${selectedMonth} foi salvo e persistido com sucesso no banco de dados para todos os colaboradores.`);
    } else {
      alert(`⚠️ AVISO: O fechamento foi salvo no banco local, mas ocorreu uma falha ao sincronizar com o banco de dados principal.\nDetalhe: ${dbErrDetail}`);
    }
  };


  const getEmployeeTeamId = (emp: Employee) => {
    const currentMonth = selectedMonth || new Date().toISOString().slice(0, 7);
    const assign = (teamAssignments || []).find(
      (a) =>
        a.memberId === emp.id &&
        a.type === "manpower" &&
        a.month === currentMonth,
    );
    if (assign) {
      return assign.teamId;
    }
    if (emp.team) {
      const match = (controllerTeams || []).find(
        (t) =>
          t.name === emp.team &&
          (!emp.contractId || t.contractId === emp.contractId),
      );
      if (match) return match.id;
    }
    return undefined;
  };

  const getEmployeeTeamName = (emp: Employee) => {
    const teamId = getEmployeeTeamId(emp);
    if (teamId) {
      const team = (controllerTeams || []).find((t) => t.id === teamId);
      if (team) return team.name;
    }
    return emp.team;
  };
  const getEmployeeTeamColor = (emp: Employee) => {
    const teamId = getEmployeeTeamId(emp);
    if (teamId) {
      const team = (controllerTeams || []).find((t) => t.id === teamId);
      if (team) return team.color;
    }
    return undefined;
  };
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [showCPF, setShowCPF] = useState<Record<string, boolean>>({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );
  const [sortField, setSortField] = useState<
    "name" | "cpf" | "role" | "admissionDate" | "salary" | "registrationNumber"
  >("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const [fechamentoSortField, setFechamentoSortField] = useState<string>("name");
  const [fechamentoSortOrder, setFechamentoSortOrder] = useState<"asc" | "desc">("asc");


  const totalExtraCostsPercentage = useMemo(() => {
    const list = rhParams.extraCosts || [];
    return list.reduce((sum, item) => sum + (item.percentage || 0), 0);
  }, [rhParams.extraCosts]);

  const handleImportFechamento = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsFechamentoImporting(true);
    const reader = new FileReader();

    reader.onerror = () => {
      setIsFechamentoImporting(false);
      alert("❌ Erro ao ler o arquivo físico.");
    };

    reader.onload = async (evt) => {
      try {
        console.log("[Fechamento Import] File loaded, starting processing...");
        const buildData = evt.target?.result;
        if (!buildData)
          throw new Error("Falha ao ler o byte-stream do arquivo.");

        const XLSX = await import("xlsx");
        const wb = XLSX.read(buildData, { type: "array" });
        console.log("[Fechamento Import] Workbook read successful, Sheets:", wb.SheetNames);

        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Fetch row array instead of objects to properly parse headers with spaces or tags
        const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        if (!jsonData || jsonData.length < 2) {
          alert("❌ Arquivo vazio ou formato incompatível. É necessário ao menos 1 linha de cabeçalho e 1 de dados.");
          setIsFechamentoImporting(false);
          return;
        }

        const headers = jsonData[0].map(h => (h ? String(h).toLowerCase().trim() : ""));
        
        // Match columns by exact tag or loose name
        const findColIndex = (possibleTags: string[]) => {
          return headers.findIndex(h => possibleTags.some(tag => h.includes(tag)));
        };

        const colNome = findColIndex(["#nome", "nome", "colaborador"]);
        const colCpf = findColIndex(["#cpf", "cpf"]);
        const colMatricula = findColIndex(["#matricula", "#matrícula", "matricula", "matrícula", "registro"]);
        const colWorkedDays = findColIndex(["#dias_trabalhados", "dias trabalhados"]);
        const colAbsences = findColIndex(["#faltas", "faltas"]);
        const colMedCert = findColIndex(["#atestados", "atestados", "atestado"]);
        const colVacation = findColIndex(["#ferias", "férias"]);
        const colLeave = findColIndex(["#afastamentos", "afastamentos", "afastamento"]);
        const colOvertime50 = findColIndex(["#hora_extra_50", "he 50%", "extra 50"]);
        const colOvertime100 = findColIndex(["#hora_extra_100", "he 100%", "extra 100"]);
        const colNightShift = findColIndex(["#adicional_noturno", "noturno"]);
        const colNotes = findColIndex(["#observacoes", "#observações", "obs"]);

        if (colNome === -1 && colCpf === -1 && colMatricula === -1) {
          alert("❌ Não foi encontrada uma coluna de identificação (#nome, #cpf ou #matricula).");
          setIsFechamentoImporting(false);
          return;
        }

        const newClosingRecords = { ...closingRecordsMap };
        let matchCount = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const nomeVal = colNome !== -1 ? String(row[colNome] || "").trim() : "";
          const cpfVal = colCpf !== -1 ? String(row[colCpf] || "").replace(/[^0-9]/g, "") : "";
          const matriculaVal = colMatricula !== -1 ? String(row[colMatricula] || "").trim() : "";

          // Find employee
          const emp = employees.find(e => 
            (matriculaVal && e.registrationNumber && e.registrationNumber.trim().toLowerCase() === matriculaVal.toLowerCase()) ||
            (cpfVal && e.cpf && e.cpf.replace(/[^0-9]/g, "") === cpfVal) || 
            (nomeVal && e.name && e.name.toLowerCase() === nomeVal.toLowerCase())
          );

          if (emp) {
            const currentRec = newClosingRecords[emp.id] || {
              workedDays: 22,
              absences: 0,
              medicalCertificates: 0,
              vacationDays: 0,
              leaveDays: 0,
              overtime50: 0,
              overtime100: 0,
              nightShift: 0,
              notes: "",
            };

            const parseFloatSafe = (val: any, fallback: number) => {
              if (val === null || val === undefined || val === "") return fallback;
              const parsed = parseFloat(String(val).replace(",", "."));
              return isNaN(parsed) ? fallback : parsed;
            };

            const parseIntSafe = (val: any, fallback: number) => {
              if (val === null || val === undefined || val === "") return fallback;
              const parsed = parseInt(String(val), 10);
              return isNaN(parsed) ? fallback : parsed;
            };

            if (colWorkedDays !== -1) currentRec.workedDays = parseIntSafe(row[colWorkedDays], currentRec.workedDays);
            if (colAbsences !== -1) currentRec.absences = parseIntSafe(row[colAbsences], currentRec.absences);
            if (colMedCert !== -1) currentRec.medicalCertificates = parseIntSafe(row[colMedCert], currentRec.medicalCertificates);
            if (colVacation !== -1) currentRec.vacationDays = parseIntSafe(row[colVacation], currentRec.vacationDays);
            if (colLeave !== -1) currentRec.leaveDays = parseIntSafe(row[colLeave], currentRec.leaveDays);
            if (colOvertime50 !== -1) currentRec.overtime50 = parseFloatSafe(row[colOvertime50], currentRec.overtime50);
            if (colOvertime100 !== -1) currentRec.overtime100 = parseFloatSafe(row[colOvertime100], currentRec.overtime100);
            if (colNightShift !== -1) currentRec.nightShift = parseFloatSafe(row[colNightShift], currentRec.nightShift);
            if (colNotes !== -1) currentRec.notes = String(row[colNotes] || "");

            newClosingRecords[emp.id] = currentRec;
            matchCount++;
          }
        }

        setClosingRecordsMap(newClosingRecords);
        alert(`✅ Importação concluída! ${matchCount} registros atualizados.`);
      } catch (err: any) {
        console.error("[Fechamento Import] Error:", err);
        alert("❌ Erro ao importar: " + err.message);
      } finally {
        setIsFechamentoImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input
    event.target.value = "";
  };

  const [isExportSelectorOpen, setIsExportSelectorOpen] = useState(false);
  const [isFechamentoExportSelectorOpen, setIsFechamentoExportSelectorOpen] = useState(false);
  const [isFechamentoImporting, setIsFechamentoImporting] = useState(false);
  const [isPrintColumnsModalOpen, setIsPrintColumnsModalOpen] = useState(false);
  const [printColumns, setPrintColumns] = useState({
    name: true,
    cpf: true,
    registrationNumber: true,
    role: true,
    status: true,
    admissionDate: true,
    salary: false,
    mobile: false,
    email: false,
    team: false,
    pis: false,
  });

  const toggleCPF = (id: string) => {
    setShowCPF((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return cpf;
    return `***.${clean.substring(3, 6)}.***-**`;
  };

  const formatDateForDisplay = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    // Handle YYYY-MM-DD reliably without timezone shifts
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    // Safe parse with noon to avoid UTC shifts
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
  };

  const exportEmployeeToPDF = (e: Employee) => {
    const doc = new jsPDF("p", "mm", "a4");
    const title = `FICHA DE ADMISSÃO - ${e.name.toUpperCase()}`;

    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("SYNERA - GESTÃO DE RECURSOS HUMANOS", 105, 15, {
      align: "center",
    });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema Integrado de Gestão Operacional", 105, 22, {
      align: "center",
    });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 105, 32, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    const tableData = [
      ["NOME COMPLETO", e.name || "-"],
      ["CPF / PIS", `${e.cpf || "-"} / ${e.pis || "-"}`],
      ["DATA NASCIMENTO", formatDateForDisplay(e.birthDate)],
      ["NATURALIDADE", `${e.birthPlace || "-"} - ${e.birthState || "-"}`],
      [
        "RG / EMISSÃO / ÓRGÃO / UF",
        `${e.rgNumber || "-"} / ${formatDateForDisplay(e.rgAgency)} / ${e.rgIssuer || "-"} / ${e.rgState || "-"}`,
      ],
      [
        "CTPS / SÉRIE",
        `${e.workBookletNumber || "-"} / ${e.workBookletSeries || "-"}`,
      ],
      [
        "TÍTULO ELEITOR",
        `${e.voterIdNumber || "-"} (Zona: ${e.voterZone || "-"} - Seç: ${e.voterSection || "-"})`,
      ],
      ["CARGO / FUNÇÃO", e.role || "-"],
      ["DATA ADMISSÃO", formatDateForDisplay(e.admissionDate)],
      [
        "SALÁRIO BASE",
        `R$ ${e.salary?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}`,
      ],
      [
        "TIPO CONTRATO",
        e.paymentType === "month"
          ? "Mensalista"
          : e.paymentType === "hour"
            ? "Horista"
            : "Diarista",
      ],
      ["FILIAÇÃO", `PAI: ${e.fatherName || "-"} | MÃE: ${e.motherName || "-"}`],
      ["CÔNJUGE", e.spouseName || "NÃO INFORMADO"],
      [
        "ENDEREÇO",
        `${e.addressLogradouro || "-"}, ${e.addressNumber || "-"} - ${e.addressComplement || "-"}`,
      ],
      [
        "BAIRRO / CIDADE / UF",
        `${e.addressNeighborhood || "-"} - ${e.addressCity || "-"}/${e.addressState || "-"}`,
      ],
      [
        "CEP / CONTATO",
        `${e.addressZipCode || "-"} | ${e.mobile || "-"} / ${e.phone || "-"}`,
      ],
      [
        "VALE TRANSPORTE",
        e.commuterBenefits
          ? `SIM (R$ ${e.commuterValue1 + e.commuterValue2})`
          : "NÃO",
      ],
    ];

    autoTable(doc, {
      startY: 45,
      head: [["CATEGORIA", "DETALHES"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [245, 247, 250], cellWidth: 60 },
      },
    });

    if (e.dependents && e.dependents.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text(
        "DEPENDENTES / FILHOS",
        14,
        (doc as any).lastAutoTable.finalY + 10,
      );
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [["NOME COMPLETO DO DEPENDENTE", "CPF", "DATA DE NASCIMENTO"]],
        body: e.dependents.map((d) => [
          d.name,
          d.cpf || "-",
          formatDateForDisplay(d.birthDate),
        ]),
        theme: "striped",
        headStyles: { fillColor: [71, 85, 105] },
        styles: { fontSize: 8 },
      });
    }

    const finalY = (doc as any).lastAutoTable.finalY;
    const footerY = finalY + 35 > 270 ? 270 : finalY + 35;

    doc.line(20, footerY, 90, footerY);
    doc.line(120, footerY, 190, footerY);
    doc.setFontSize(8);
    doc.text("ASSINATURA DO COLABORADOR", 55, footerY + 5, { align: "center" });
    doc.text("ASSINATURA DO RESPONSÁVEL RH", 155, footerY + 5, {
      align: "center",
    });

    doc.save(`Ficha_Admissao_${e.name.replace(/\s+/g, "_")}.pdf`);
  };

  const exportFechamentoToPDF = () => {
    const doc = new jsPDF("landscape");
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(234, 88, 12); // orange-600
    doc.text("SYNERA - GESTÃO DE RECURSOS HUMANOS", 14, 15);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`RELATÓRIO DE FECHAMENTO DE JORNADA`, 14, 21);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      `Mês de Referência: ${selectedMonth} - Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      14,
      27
    );

    const tableHeaders = [
      [
        "Colaborador",
        "Matrícula",
        "Função",
        "Dias Trab.",
        "Faltas",
        "Atestado",
        "Férias",
        "HE 50%",
        "HE 100%",
        "Salário Base",
        "Líquido"
      ]
    ];

    const tableRows = sortedFechamentoEmployees.map((emp) => {
      const monthRecord = closingRecordsMap[emp.id] || {
        workedDays: 22,
        absences: 0,
        medicalCertificates: 0,
        vacationDays: 0,
        leaveDays: 0,
        overtime50: 0,
        overtime100: 0,
      };

      const remun = calculateEmployeeRemuneration(emp, monthRecord);

      return [
        emp.name || "-",
        emp.registrationNumber || "-",
        emp.role || "-",
        String(monthRecord.workedDays),
        String(monthRecord.absences),
        String(monthRecord.medicalCertificates),
        String(monthRecord.vacationDays),
        `${remun.overtime50Qty}h (${remun.overtime50Value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`,
        `${remun.overtime100Qty}h (${remun.overtime100Value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`,
        remun.baseSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        remun.finalSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      ];
    });

    autoTable(doc, {
      startY: 32,
      head: tableHeaders,
      body: tableRows,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [234, 88, 12], // orange-600
        textColor: 255,
        fontStyle: "bold",
      }
    });

    doc.save(
      `Fechamento_Jornada_${selectedMonth}_Gerado_${new Date().toISOString().split("T")[0]}.pdf`
    );
  };

  const exportFechamentoToExcel = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Fechamento de Jornada");

    // Title
    const titleRow = worksheet.addRow(["SYNERA - GESTÃO DE RECURSOS HUMANOS"]);
    titleRow.font = { name: "Helvetica", bold: true, size: 14, color: { argb: "FFEA580C" } };
    
    const subtitleRow = worksheet.addRow(["RELATÓRIO DE FECHAMENTO DE JORNADA"]);
    subtitleRow.font = { name: "Helvetica", bold: true, size: 11, color: { argb: "FF1E293B" } };
    
    const infoRow = worksheet.addRow([`Mês de Referência: ${selectedMonth} - Gerado em ${new Date().toLocaleDateString("pt-BR")}`]);
    infoRow.font = { name: "Helvetica", size: 10, color: { argb: "FF64748B" } };
    
    worksheet.addRow([]); // empty row

    const headers = [
        "Colaborador",
        "Matrícula",
        "Função",
        "Dias Trab.",
        "Faltas",
        "Atestado",
        "Férias",
        "HE 50%",
        "HE 100%",
        "Salário Base",
        "Líquido"
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEA580C" }
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const activeEmployees = sortedFechamentoEmployees;

    activeEmployees.forEach((emp, index) => {
      const monthRecord = closingRecordsMap[emp.id] || {
        workedDays: 22,
        absences: 0,
        medicalCertificates: 0,
        vacationDays: 0,
        leaveDays: 0,
        overtime50: 0,
        overtime100: 0,
      };

      const remun = calculateEmployeeRemuneration(emp, monthRecord);

      const row = worksheet.addRow([
        emp.name || "-",
        emp.registrationNumber || "-",
        emp.role || "-",
        monthRecord.workedDays,
        monthRecord.absences,
        monthRecord.medicalCertificates,
        monthRecord.vacationDays,
        `${remun.overtime50Qty}h (${remun.overtime50Value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`,
        `${remun.overtime100Qty}h (${remun.overtime100Value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`,
        remun.baseSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        remun.finalSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      ]);
      
      const isEven = index % 2 === 0;
      row.eachCell((cell) => {
          if (!isEven) {
              cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFF3F4F6" }
              };
          }
      });
    });

    worksheet.columns.forEach(column => {
        column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Fechamento_Jornada_${selectedMonth}_Gerado_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportIndividualSlipToPDF = (emp: Employee, month: string) => {
    const doc = new jsPDF("p", "mm", "a4");
    const compId = currentUser?.companyId || "default";
    const key = `rh_fechamento_jornada_${compId}_${month}`;
    const localData = localStorage.getItem(key);
    let monthRecord: any = undefined;
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        monthRecord = parsed[emp.id];
      } catch (e) {
        console.error(e);
      }
    }
    
    const calc = calculateEmployeeRemuneration(emp, monthRecord);

    // Frame Border
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.rect(5, 5, 200, 287);

    // Logo & Header block
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(5, 5, 200, 25, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RECIBO DE PAGAMENTO DE SALÁRIO (HOLERITE)", 105, 15, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Mês de Referência: ${month.split("-")[1]}/${month.split("-")[0]} - SYNERA RH`, 105, 22, { align: "center" });

    // Employee & Company info box
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DADOS DO EMPREGADOR", 10, 38);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Empresa ID: ${currentUser.companyId || "Synera Enterprise LLC"}`, 10, 44);
    doc.text(`Setor / Equipe: ${emp.team || "Geral"}`, 10, 49);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DADOS DO COLABORADOR", 110, 38);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Nome: ${emp.name}`, 110, 44);
    doc.text(`CPF: ${emp.cpf}`, 110, 49);
    doc.text(`Cargo: ${emp.role}`, 110, 54);
    doc.text(`Data Admissão: ${formatDateForDisplay(emp.admissionDate)}`, 110, 59);

    // Line separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(10, 65, 200, 65);

    // Demonstrative
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DEMONSTRATIVO DE VALORES", 10, 73);

    const slipHeaders = [["Cód.", "Descrição", "Referência", "Proventos", "Descontos"]];
    const baseHourVal = calc.baseSalary / 220;
    
    const slipRows = [
      ["001", "SALÁRIO BASE CONTRATUAL", "30 Dias", calc.baseSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), "-"],
    ];

    if (calc.overtime50Qty > 0) {
      slipRows.push([
        "150", 
        "HORA EXTRA 50%", 
        `${calc.overtime50Qty}h`, 
        calc.overtime50Value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 
        "-"
      ]);
    }
    if (calc.overtime100Qty > 0) {
      slipRows.push([
        "151", 
        "HORA EXTRA 100%", 
        `${calc.overtime100Qty}h`, 
        calc.overtime100Value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 
        "-"
      ]);
    }
    if (calc.nightShiftQty > 0) {
      slipRows.push([
        "160", 
        "ADICIONAL NOTURNO 20%", 
        `${calc.nightShiftQty}h`, 
        calc.nightShiftValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 
        "-"
      ]);
    }
    if (calc.absencesDays > 0) {
      slipRows.push([
        "400", 
        "FALTAS INTEGRALMENTE DESCONTADAS", 
        `${calc.absencesDays} Dia(s)`, 
        "-", 
        calc.absencesDiscount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      ]);
    }

    const totalEarnings = calc.baseSalary + calc.overtime50Value + calc.overtime100Value + calc.nightShiftValue;
    const totalDeductions = calc.absencesDiscount;
    const netPayable = calc.finalSalary;

    autoTable(doc, {
      startY: 78,
      head: slipHeaders,
      body: slipRows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: 30,
        fontStyle: "bold",
      },
    });

    // Totals section below table
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, finalY, 190, 30);

    doc.setFont("helvetica", "normal");
    doc.text("Valor Hora:", 15, finalY + 10);
    doc.setFont("helvetica", "bold");
    doc.text(baseHourVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 45, finalY + 10);

    doc.setFont("helvetica", "normal");
    doc.text("Total Proventos:", 110, finalY + 10);
    doc.setFont("helvetica", "bold");
    doc.text(totalEarnings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 150, finalY + 10);

    doc.setFont("helvetica", "normal");
    doc.text("Total Descontos:", 110, finalY + 18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(totalDeductions.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 150, finalY + 18);
    doc.setTextColor(30, 41, 59);

    // Net Payable section
    doc.setFillColor(248, 250, 252);
    doc.rect(10, finalY + 35, 190, 15, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("VALOR LÍQUIDO A RECEBER:", 15, finalY + 44);
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(netPayable.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 150, finalY + 44);
    doc.setTextColor(30, 41, 59);

    // Signatures
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE DOCUMENTO.", 10, finalY + 65);
    
    doc.line(10, finalY + 95, 95, finalY + 95);
    doc.text("DATA", 10, finalY + 100);

    doc.line(110, finalY + 95, 190, finalY + 95);
    doc.text("ASSINATURA DO COLABORADOR", 110, finalY + 100);

    doc.save(`Holerite_${emp.name.replace(/\s+/g, "_")}_${month}.pdf`);
  };

  const exportEmployeeToExcel = (e: Employee) => {
    const mainData = [
      ["SYNERA - GESTÃO DE RECURSOS HUMANOS"],
      ["FICHA DE ADMISSÃO DIGITAL"],
      ["Gerado em:", new Date().toLocaleString("pt-BR")],
      [""],
      ["Identificação Pessoal", ""],
      ["Nome Completo", e.name],
      ["CPF", e.cpf],
      ["Data de Nascimento", formatDateForDisplay(e.birthDate)],
      ["Naturalidade", e.birthPlace],
      ["UF Naturalidade", e.birthState],
      ["Nome do Pai", e.fatherName],
      ["Nome da Mãe", e.motherName],
      ["Nome do Cônjuge", e.spouseName || "NÃO POSSUI"],
      [""],
      ["Documentação", ""],
      ["RG", e.rgNumber],
      ["Data de Emissão", formatDateForDisplay(e.rgAgency)],
      ["Orgão Emissor", e.rgIssuer],
      ["RG UF", e.rgState],
      ["CTPS Nº", e.workBookletNumber],
      ["CTPS Série", e.workBookletSeries],
      ["PIS", e.pis],
      ["Título Eleitor", e.voterIdNumber],
      ["Título Zona", e.voterZone],
      ["Título Seção", e.voterSection],
      [""],
      ["Endereço e Contato", ""],
      ["Rua/Logradouro", e.addressLogradouro],
      ["Número", e.addressNumber],
      ["Complemento", e.addressComplement],
      ["Bairro", e.addressNeighborhood],
      ["Cidade", e.addressCity],
      ["UF Estado", e.addressState],
      ["CEP", e.addressZipCode],
      ["E-mail", e.email],
      ["Celular/WhatsApp", e.mobile],
      ["Telefone Fixo", e.phone],
      [""],
      ["Dados Contratuais", ""],
      ["Cargo/Função", e.role],
      ["Data Admissão", formatDateForDisplay(e.admissionDate)],
      ["Status", e.status === "active" ? "Ativo" : "Desativado"],
      ["Data Demissão", formatDateForDisplay(e.dismissalDate)],
      ["Salário Base", e.salary],
      [
        "Tipo de Recebimento",
        e.paymentType === "month"
          ? "Mensalista"
          : e.paymentType === "hour"
            ? "Horista"
            : "Diarista",
      ],
      ["Vale Transporte", e.commuterBenefits ? "SIM" : "NÃO"],
      ["Tarifa Trajeto 1", e.commuterValue1],
      ["Tarifa Trajeto 2", e.commuterValue2],
    ];

    if (e.dependents && e.dependents.length > 0) {
      mainData.push([""]);
      mainData.push(["DEPENDENTES"]);
      e.dependents.forEach((d, i) => {
        mainData.push([
          `Dependente ${i + 1}`,
          d.name,
          `CPF: ${d.cpf || ""}`,
          `Nascimento: ${d.birthDate ? new Date(d.birthDate).toLocaleDateString("pt-BR") : ""}`,
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(mainData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados do Colaborador");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `Ficha_Admissao_${e.name.replace(/\s+/g, "_")}.xlsx`,
    );
  };

  const handleDownloadTemplate = (withData = false) => {
    try {
      const data = [
        [
          "#Contrato",
          "#Nome Completo",
          "#CPF",
          "#Matrícula",
          "#Função",
          "#Equipe",
          "#Tipo de Pagamento",
          "#Salário Bruto",
          "#Data de Admissão",
          "#Nº de Cadastro/Vínculo/RG",
          "#Órgão Emissor do RG",
          "#UF do RG",
          "#Data de Nascimento",
          "#Local de Nascimento",
          "#UF de Nascimento",
          "#Nº da CTPS",
          "#Série da CTPS",
          "#PIS",
          "#Telefone",
          "#Celular",
          "#Email",
          "#Status",
          "#Data de Demissão",
          "#Nº Título de Eleitor",
          "#Zona Eleitoral",
          "#Seção Eleitoral",
          "#Nome do Pai",
          "#Nome da Mãe",
          "#Nome do Cônjuge",
          "#Logradouro",
          "#Número",
          "#Complemento",
          "#Bairro",
          "#Cidade",
          "#CEP",
          "#UF",
          "#VT - Necessita",
          "#VT - Valor 1",
          "#VT - Cidade 1",
          "#VT - Valor 2",
          "#VT - Cidade 2",
          "#Encargos Percentual",
          "#Horas Extras Percentual",
        ],
      ];

      if (withData) {
        const activeEmployees = filteredEmployees.filter(e => e.status !== "dismissed");
        activeEmployees.forEach(e => {
          const contract = contracts.find(c => c.id === e.contractId);
          data.push([
            contract?.contractNumber || "",
            e.name || "",
            e.cpf || "",
            e.registrationNumber || "",
            e.role || "",
            getEmployeeTeamName(e) || "",
            e.paymentType === "hour" ? "Horista" : e.paymentType === "day" ? "Diarista" : "Mensalista",
            e.salary || 0,
            e.admissionDate || "",
            e.rgNumber || "",
            e.rgAgency || "",
            e.rgState || "",
            e.birthDate || "",
            e.birthPlace || "",
            e.birthState || "",
            e.workBookletNumber || "",
            e.workBookletSeries || "",
            e.pis || "",
            e.phone || "",
            e.mobile || "",
            e.email || "",
            e.status === "dismissed" ? "Demitido" : "Ativo",
            e.dismissalDate || "",
            e.voterIdNumber || "",
            e.voterZone || "",
            e.voterSection || "",
            e.fatherName || "",
            e.motherName || "",
            e.spouseName || "",
            e.addressLogradouro || "",
            e.addressNumber || "",
            e.addressComplement || "",
            e.addressNeighborhood || "",
            e.addressCity || "",
            e.addressZipCode || "",
            e.addressState || "",
            e.commuterBenefits ? "Sim" : "Não",
            e.commuterValue1 || 0,
            e.commuterCity1 || "",
            e.commuterValue2 || 0,
            e.commuterCity2 || "",
            e.chargesPercentage || 0,
            e.overtimePercentage || 0,
          ] as any);
        });
      } else {
        data.push([
          "CTR-123",
          "João da Silva",
          "123.456.789-00",
          "M123",
          "Pedreiro",
          "Equipe A",
          "Mensalista",
          2500,
          "2023-01-15",
          "12345678",
          "SSP",
          "SP",
          "1990-01-01",
          "São Paulo",
          "SP",
          "1234567",
          "12345",
          "12345678901",
          "(11) 98765-4321",
          "(11) 98765-4321",
          "joao@email.com",
          "Ativo",
          "",
          "123456789012",
          "123",
          "456",
          "José da Silva",
          "Maria da Silva",
          "Ana da Silva",
          "Rua das Flores",
          "123",
          "Apto 1",
          "Centro",
          "São Paulo",
          "01000-000",
          "SP",
          "Não",
          0,
          "",
          0,
          "",
          84.15,
          50,
        ] as any);
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo_Colaboradores");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blobData = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blobData, withData ? `Atualizacao_Colaboradores.xlsx` : `Modelo_Importacao_Colaboradores.xlsx`);
    } catch (error) {
      console.error("Failed to generate template:", error);
      alert("Erro ao gerar modelo de importação/atualização.");
    }
  };

  const parseDateFromExcel = (value: any): string | undefined => {
    if (typeof value === "number") {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return date.toISOString().split("T")[0];
    } else if (value) {
      const parts = String(value).split("/");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      } else if (String(value).includes("-")) {
        return String(value).split("T")[0];
      }
    }
    return undefined;
  };

  const [isImporting, setIsImporting] = useState(false);

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onerror = () => {
      setIsImporting(false);
      alert("❌ Erro ao ler o arquivo físico.");
    };

    reader.onload = async (evt) => {
      try {
        console.log("[RH Import] File loaded, starting processing...");
        const buildData = evt.target?.result;
        if (!buildData)
          throw new Error("Falha ao ler o byte-stream do arquivo.");

        const wb = XLSX.read(buildData, { type: "array" });
        console.log(
          "[RH Import] Workbook read successful, Sheets:",
          wb.SheetNames,
        );

        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: null });
        console.log("[RH Import] jsonData found:", jsonData.length, "rows");

        if (!jsonData || jsonData.length === 0) {
          alert(
            "❌ Arquivo vazio ou formato incompatível. Certifique-se de que a primeira linha contém os cabeçalhos.",
          );
          setIsImporting(false);
          return;
        }

        const importedEmployees: Employee[] = [];
        for (let i = 0; i < jsonData.length; i++) {
          try {
            const row: any = jsonData[i];
            const keys = Object.keys(row);

            // Helper to get value with loose key matching
            const getVal = (possibleKeys: string[]) => {
              const foundKey = keys.find((k) =>
                possibleKeys.includes(String(k).replace(/^#/, "").toLowerCase().trim()),
              );
              if (!foundKey) return null;
              const val = row[foundKey];
              return val === undefined ||
                val === null ||
                String(val).trim() === ""
                ? null
                : val;
            };

            const parseNumericValue = (val: any): number => {
              if (val === null || val === undefined || val === "") return 0;
              if (typeof val === "number") return val;
              const s = String(val).trim();
              if (s === "") return 0;
              
              const lastDot = s.lastIndexOf(".");
              const lastComma = s.lastIndexOf(",");
              let cleanStr = s;
              
              if (lastComma !== -1 && lastDot !== -1) {
                // Both exist
                if (lastComma > lastDot) {
                  // e.g. 1.234,56
                  cleanStr = s.replace(/\./g, "").replace(",", ".");
                } else {
                  // e.g. 1,234.56
                  cleanStr = s.replace(/,/g, "");
                }
              } else if (lastComma !== -1) {
                // Only commas
                if (s.split(",").length > 2) {
                  cleanStr = s.replace(/,/g, "");
                } else {
                  cleanStr = s.replace(",", ".");
                }
              } else if (lastDot !== -1) {
                // Only dots
                if (s.split(".").length > 2) {
                  cleanStr = s.replace(/\./g, "");
                } else {
                  cleanStr = s;
                }
              }
              
              cleanStr = cleanStr.replace(/[^0-9.-]+/g, "");
              const num = parseFloat(cleanStr);
              return isNaN(num) ? 0 : num;
            };

            const rawName = getVal([
              "nome",
              "nome completo",
              "colaborador",
              "funcionario",
              "funcionário",
            ]);
            if (!rawName) {
              console.warn(
                `[RH Import] Skipping row ${i + 1} because Name is empty.`,
              );
              continue;
            }

            const name = String(rawName);
            const cpfRaw = getVal(["cpf", "documento"]);
            const cpf = cpfRaw ? String(cpfRaw).replace(/[^0-9]/g, "") : "";
            const registrationNumberRaw = getVal([
              "matricula",
              "matrícula",
              "numero de matricula",
              "registro",
              "chapa",
              "cod_matricula",
              "registration_number"
            ]);
            const registrationNumber = registrationNumberRaw ? String(registrationNumberRaw).trim() : "";
            const role = String(
              getVal(["função", "funcao", "cargo", "atividade"]) || "Ajudante",
            );

            let paymentTypeStr = String(
              getVal([
                "tipo de pagamento",
                "tipo pagamento",
                "tipo",
                "forma_pagamento",
              ]) || "Mensalista",
            ).toLowerCase();
            let paymentType: "hour" | "day" | "month" = "month";
            if (
              paymentTypeStr.includes("hora") ||
              paymentTypeStr.includes("horista")
            )
              paymentType = "hour";
            if (
              paymentTypeStr.includes("dia") ||
              paymentTypeStr.includes("diarista")
            )
              paymentType = "day";

            const salaryVal = getVal([
              "salário",
              "salario",
              "salário bruto",
              "salario bruto",
              "valor",
              "remuneracao",
              "remuneração",
            ]);
            let salary = parseNumericValue(salaryVal);

            const admissionDateRaw = getVal([
              "data de admissão",
              "data admissão",
              "data de admissao",
              "admissao",
              "admissão",
              "entrada",
            ]);
            const admissionDate =
              parseDateFromExcel(admissionDateRaw) ||
              new Date().toISOString().split("T")[0];

            const dismissalDateRaw = getVal([
              "data de demissão",
              "data demissão",
              "demissao",
              "demissão",
              "saida",
              "saída",
            ]);
            const dismissalDate = parseDateFromExcel(dismissalDateRaw) || null;

            const statusRaw = getVal([
              "status",
              "situação",
              "situacao",
              "estado",
            ]);
            let status: "active" | "dismissed" = "active";
            if (statusRaw) {
              const s = String(statusRaw).toLowerCase();
              if (
                s.includes("demitido") ||
                s.includes("inativo") ||
                s.includes("desligado")
              )
                status = "dismissed";
            }
            if (dismissalDate) status = "dismissed";

            const rgNumberRaw = getVal([
              "nº de cadastro/vínculo/rg",
              "rg",
              "vínculo",
              "cadastro",
              "numero_rg",
              "rg_numero",
            ]);
            const rgAgencyRaw = getVal([
              "órgão emissor do rg",
              "orgao emissor",
              "orgao_emissor",
              "emissor",
              "rg_emissor",
            ]);
            const pisRaw = getVal(["pis", "nis", "pasep"]);
            const phoneRaw = getVal(["telefone", "contato", "tel"]);
            const mobileRaw = getVal(["celular", "mobile", "cel"]) || phoneRaw;
            const emailRaw = getVal(["email", "e-mail"]);

            // Find matching contract inside the sheet
            const contractVal = getVal([
              "contrato",
              "obra",
              "contrato_numero",
              "numero_contrato",
              "codigo_contrato",
              "contrato_id",
            ]);
            let matchedContractId = selectedContractId || "";
            if (contractVal) {
              const cleanedVal = String(contractVal).toLowerCase().trim();
              const foundC = contracts.find(
                (c) =>
                  (c.contractNumber &&
                    c.contractNumber.toLowerCase().trim() === cleanedVal) ||
                  (c.workName &&
                    c.workName.toLowerCase().trim() === cleanedVal) ||
                  (c.id && c.id.toLowerCase().trim() === cleanedVal),
              );
              if (foundC) {
                matchedContractId = foundC.id;
              }
            }

            const employee: Employee = {
              id: String(
                getVal(["id", "id_colaborador", "codigo", "código"]) ||
                  generateUUID(),
              ),
              companyId: currentUser.companyId,
              contractId: matchedContractId,
              registrationNumber: registrationNumber || undefined,
              name,
              role,
              admissionDate: admissionDate,
              salary,
              paymentType,
              status,
              dismissalDate,
              cpf,
              rgNumber: rgNumberRaw ? String(rgNumberRaw) : "",
              rgAgency: rgAgencyRaw ? String(rgAgencyRaw) : "",
              rgIssuer: rgAgencyRaw ? String(rgAgencyRaw) : "",
              rgState: String(
                getVal(["uf do rg", "rg uf", "estado do rg", "uf_rg"]) || "",
              ),
              birthDate:
                parseDateFromExcel(
                  getVal([
                    "data de nascimento",
                    "nascimento",
                    "data_nascimento",
                  ]),
                ) || (null as any),
              birthPlace: String(
                getVal([
                  "local de nascimento",
                  "naturalidade",
                  "cidade_nascimento",
                ]) ||
                  String(getVal(["local de nascimento", "naturalidade"]) || ""),
              ),
              birthState: String(
                getVal(["uf de nascimento", "nascimento uf"]) || "",
              ),
              workBookletNumber: String(getVal(["nº da ctps", "ctps"]) || ""),
              workBookletSeries: String(
                getVal(["série da ctps", "serie ctps"]) || "",
              ),
              pis: pisRaw ? String(pisRaw) : "",
              phone: phoneRaw ? String(phoneRaw) : "",
              mobile: mobileRaw ? String(mobileRaw) : "",
              email: emailRaw ? String(emailRaw) : "",
              voterIdNumber: String(
                getVal([
                  "nº título de eleitor",
                  "título de eleitor",
                  "titulo eleitor",
                ]) || "",
              ),
              voterZone: String(getVal(["zona eleitoral", "zona"]) || ""),
              voterSection: String(getVal(["seção eleitoral", "secao"]) || ""),
              fatherName: String(getVal(["nome do pai", "pai"]) || ""),
              motherName: String(
                getVal(["nome da mãe", "nome da mae", "mãe"]) || "",
              ),
              spouseName: String(
                getVal(["nome do cônjuge", "conjuge", "esposa", "esposo"]) ||
                  "",
              ),
              dependents: [],
              addressLogradouro: String(
                getVal(["logradouro", "rua", "endereço", "endereco"]) || "",
              ),
              addressNumber: String(getVal(["número", "numero", "nº"]) || ""),
              addressComplement: String(getVal(["complemento"]) || ""),
              addressNeighborhood: String(getVal(["bairro"]) || ""),
              addressCity: String(getVal(["cidade", "município"]) || ""),
              addressZipCode: String(getVal(["cep", "código postal"]) || ""),
              addressState: String(getVal(["uf", "estado"]) || ""),
              commuterBenefits: String(
                getVal(["vt - necessita", "vt", "vale transporte"]) || "",
              )
                .toLowerCase()
                .includes("sim"),
              commuterValue1: parseNumericValue(getVal(["vt - valor 1"])),
              commuterCity1: String(getVal(["vt - cidade 1"]) || ""),
              commuterValue2: parseNumericValue(getVal(["vt - valor 2"])),
              commuterCity2: String(getVal(["vt - cidade 2"]) || ""),
              chargesPercentage: parseNumericValue(
                getVal([
                  "encargos percentual",
                  "encargos_percentual",
                  "charges_percentage",
                  "encargos",
                ])
              ),
              overtimePercentage: parseNumericValue(
                getVal([
                  "horas extras percentual",
                  "he_percentual",
                  "overtime_percentage",
                  "he",
                ])
              ),
              team:
                String(
                  getVal([
                    "equipe",
                    "equipe vinculada",
                    "team",
                    "frente",
                    "grupo",
                  ]) || "",
                ) || undefined,
            };
            importedEmployees.push(employee);
          } catch (rowErr) {
            console.error(
              `[RH Import] Critical error mapping row ${i + 1}:`,
              rowErr,
            );
          }
        }

        console.log(
          `[RH Import] Successfully mapped ${importedEmployees.length} of ${jsonData.length} employees.`,
        );

        if (importedEmployees.length === 0) {
          alert(
            '⚠️ Nenhum colaborador válido encontrado no arquivo. Verifique se as colunas "Nome" ou "Nome Completo" estão preenchidas.',
          );
          setIsImporting(false);
          return;
        }

        if (
          window.confirm(
            `✅ ${importedEmployees.length} colaboradores encontrados. Deseja importá-los para o contrato atual? (Colaboradores com a mesma matrícula ou CPF serão atualizados)`,
          )
        ) {
          const newEmployeesList = [...employees];
          let newCount = 0;
          let updatedCount = 0;
          
          importedEmployees.forEach((impEmp) => {
            const hasRegNum = !!impEmp.registrationNumber;
            const hasCpf = !!impEmp.cpf;
            
            let existingIdx = -1;
            
            if (hasRegNum) {
              existingIdx = newEmployeesList.findIndex(
                (e) => e.registrationNumber?.trim().toLowerCase() === impEmp.registrationNumber!.trim().toLowerCase()
              );
            } else if (hasCpf) {
              existingIdx = newEmployeesList.findIndex(
                (e) => e.cpf?.replace(/[^0-9]/g, "") === impEmp.cpf!.replace(/[^0-9]/g, "")
              );
            }
            
            if (existingIdx >= 0) {
              const existingId = newEmployeesList[existingIdx].id;
              newEmployeesList[existingIdx] = { 
                ...newEmployeesList[existingIdx], 
                ...impEmp, 
                id: existingId // preserve original ID
              };
              impEmp.id = existingId; // preserve the ID inside importedEmployees so Supabase upsert matches!
              updatedCount++;
            } else {
              newEmployeesList.push(impEmp);
              newCount++;
            }
          });

          onUpdateEmployees(newEmployeesList);

          if (teamAssignments && onUpdateAssignments) {
            let updatedAssignments = [...teamAssignments];
            const currentMonth =
              selectedMonth || new Date().toISOString().slice(0, 7);
            importedEmployees.forEach((emp) => {
              if (emp.team && emp.team !== "") {
                const team = (controllerTeams || []).find(
                  (t) => t.name === emp.team,
                );
                if (team) {
                  const exists = updatedAssignments.some(
                    (a) =>
                      a.memberId === emp.id &&
                      a.type === "manpower" &&
                      a.month === currentMonth,
                  );
                  if (!exists) {
                    updatedAssignments.push({
                      id: generateUUID(),
                      teamId: team.id,
                      memberId: emp.id,
                      type: "manpower",
                      month: currentMonth,
                      companyId: emp.companyId || currentUser.companyId,
                      contractId: emp.contractId,
                    });
                  }
                }
              }
            });
            onUpdateAssignments(updatedAssignments);
          }

          let supabaseSuccess = false;
          const config = getSupabaseConfig();
          if (config.enabled) {
            const supabase = createSupabaseClient(config.url, config.key);
            if (supabase) {
              const snakeData = importedEmployees.map(mapToSnake);
              try {
                const { error } = await supabase
                  .from("employees")
                  .upsert(snakeData);
                if (error) {
                  console.error(
                    "[Supabase] Failed to sync imported employees:",
                    error,
                  );
                  alert(
                    `❌ Erro ao salvar no banco de dados Supabase: ${error.message || JSON.stringify(error)}`,
                  );
                } else {
                  console.log("[Supabase] Imported employees saved securely.");
                  supabaseSuccess = true;
                }
              } catch (e: any) {
                console.error(
                  "[Supabase] Exception syncing imported employees:",
                  e,
                );
                alert(
                  `❌ Exceção ao salvar no banco: ${e.message || String(e)}`,
                );
              }
            }
          }

          if (supabaseSuccess) {
            alert(
              `🚀 Atualização no Supabase concluída com sucesso!\n\n` +
              `• Novos colaboradores adicionados: ${newCount}\n` +
              `• Colaboradores atualizados: ${updatedCount}`
            );
          } else if (config.enabled) {
            alert(
              `⚠️ Importação local concluída, mas houve erro na sincronização com o Supabase.\n\n` +
              `• Novos colaboradores: ${newCount}\n` +
              `• Colaboradores atualizados: ${updatedCount}`
            );
          } else {
            alert(
              `✅ Importação concluída localmente (Supabase desativado).\n\n` +
              `• Novos colaboradores: ${newCount}\n` +
              `• Colaboradores atualizados: ${updatedCount}`
            );
          }
        }
      } catch (err) {
        console.error("Import error:", err);
        alert(
          "❌ Erro inesperado ao processar o arquivo. Verifique se o arquivo não está corrompido.",
        );
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
    if (event.target) {
      event.target.value = "";
    }
  };

  const exportAllEmployeesToExcel = () => {
    const contract = contracts.find((c) => c.id === selectedContractId);

    const wsData: any[][] = [
      ["SYNERA - Gestão e Planejamento"],
      ["RELATÓRIO: LISTA DE COLABORADORES"],
      [
        `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      ],
    ];

    if (contract) {
      wsData.push([
        `CONTRATO: ${contract.contractNumber} - ${contract.object || ""}`,
      ]);
    }

    wsData.push([]);
    wsData.push([
      "Nome",
      "CPF",
      "Matrícula",
      "Cargo",
      "Data Admissão",
      showLoadedSalary ? "Remuneração (com Encargos)" : "Remuneração",
      "Tipo Contrato",
    ]);

    filteredEmployees.forEach((e) => {
      const baseSalary = e.salary || 0;
      const finalSalary = showLoadedSalary
        ? baseSalary * (1 + totalExtraCostsPercentage / 100)
        : baseSalary;
      wsData.push([
        e.name,
        e.cpf,
        e.registrationNumber || "-",
        e.role,
        e.admissionDate
          ? new Date(e.admissionDate).toLocaleDateString("pt-BR")
          : "",
        finalSalary,
        e.paymentType === "month"
          ? "Mensalista"
          : e.paymentType === "hour"
            ? "Horista"
            : "Diarista",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `Relatorio_Colaboradores_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const exportAllEmployeesToPDF = () => {
    const doc = new jsPDF("landscape");
    const contract = contracts.find((c) => c.id === selectedContractId);

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // blue-800
    doc.text("SYNERA - Gestão e Planejamento", 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      `Lista Geral de Colaboradores - Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      14,
      21,
    );

    if (contract) {
      doc.setFont("helvetica", "bold");
      doc.text(
        `CONTRATO: ${contract.contractNumber} - ${contract.object || ""}`,
        14,
        27,
      );
    }

    const tableHeaders = [
      ["Nome", "CPF", "Matrícula", "Cargo", "Data Admissão", showLoadedSalary ? "Remuneração (c/ Encargos)" : "Remuneração", "Status"],
    ];

    const tableRows = filteredEmployees.map((e) => {
      const baseSalary = e.salary || 0;
      const finalSalary = showLoadedSalary
        ? baseSalary * (1 + totalExtraCostsPercentage / 100)
        : baseSalary;
      return [
        e.name || "-",
        e.cpf || "-",
        e.registrationNumber || "-",
        e.role || "-",
        e.admissionDate
          ? new Date(e.admissionDate).toLocaleDateString("pt-BR")
          : "-",
        finalSalary
          ? finalSalary.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "R$ 0,00",
        e.status === "active" ? "Ativo" : "Desligado",
      ];
    });

    autoTable(doc, {
      startY: contract ? 32 : 28,
      head: tableHeaders,
      body: tableRows,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: 255,
        fontStyle: "bold",
      },
    });

    doc.save(
      `Relatorio_Colaboradores_${new Date().toISOString().split("T")[0]}.pdf`,
    );
  };

  const handlePrintCollaborators = () => {
    const contract = contracts.find((c) => c.id === selectedContractId);
    const selectedFields = Object.entries(printColumns)
      .filter(([_, enabled]) => enabled)
      .map(([field, _]) => field);

    const getHeaderLabel = (field: string) => {
      switch (field) {
        case "name":
          return "Nome";
        case "cpf":
          return "CPF";
        case "registrationNumber":
          return "Matrícula";
        case "role":
          return "Cargo";
        case "status":
          return "Status";
        case "admissionDate":
          return "Admissão";
        case "salary":
          return showLoadedSalary ? "Remuneração (c/ Encargos)" : "Remuneração";
        case "mobile":
          return "Contato";
        case "email":
          return "E-mail";
        case "team":
          return "Equipe";
        case "pis":
          return "PIS";
        default:
          return field;
      }
    };

    const getFieldValue = (emp: Employee, field: string) => {
      if (field === "team") {
        return getEmployeeTeamName(emp) || "-";
      }
      const val = (emp as any)[field];
      if (field === "status") {
        return val === "active" ? "Ativo" : "Desligado";
      }
      if (field === "admissionDate") {
        return val ? new Date(val).toLocaleDateString("pt-BR") : "-";
      }
      if (field === "salary") {
        const baseSalary = emp.salary || 0;
        const finalSalary = showLoadedSalary
          ? baseSalary * (1 + totalExtraCostsPercentage / 100)
          : baseSalary;
        return finalSalary
          ? finalSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "R$ 0,00";
      }
      return val || "-";
    };

    const headersHtml = selectedFields
      .map(
        (f) =>
          `<th style="text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #1e293b; font-family: sans-serif;">${getHeaderLabel(f)}</th>`,
      )
      .join("");

    const rowsHtml = filteredEmployees
      .map((emp) => {
        const cells = selectedFields
          .map((f) => {
            return `<td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155; font-family: sans-serif;">${getFieldValue(emp, f)}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    // Create unique print container
    const printContainerId = "synera-rh-print-container";
    let printContainer = document.getElementById(printContainerId);
    if (!printContainer) {
      printContainer = document.createElement("div");
      printContainer.id = printContainerId;
      document.body.appendChild(printContainer);
    }

    printContainer.innerHTML = `
      <div style="font-family: sans-serif; color: #1e293b; background: white; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.025em;">SYNERA</h1>
            <h2 style="font-size: 13px; font-weight: 700; color: #475569; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Relatório de Colaboradores</h2>
            ${contract ? `<div style="font-size: 11px; margin-top: 6px; color: #ea580c;"><strong>CONTRATO:</strong> ${contract.contractNumber} - ${contract.object || ''}</div>` : ''}
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b; line-height: 1.4;">
            Total: <strong>${filteredEmployees.length} colaboradores</strong><br>
            Gerado em: ${new Date().toLocaleDateString('pt-BR')}<br>
            ${showLoadedSalary ? '<span style="color: #16a34a; font-weight: bold;">(Encargos de ' + totalExtraCostsPercentage.toFixed(2) + '% inclusos)</span>' : ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              ${headersHtml}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    // Add CSS styles specifically for handling screen vs printer view for the custom block
    const printStyleId = "synera-rh-print-style";
    let printStyle = document.getElementById(printStyleId);
    if (!printStyle) {
      printStyle = document.createElement("style");
      printStyle.id = printStyleId;
      document.head.appendChild(printStyle);
    }
    printStyle.innerHTML = `
      @media print {
        body > *:not(#${printContainerId}) {
          display: none !important;
        }
        #${printContainerId} {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          z-index: 9999999 !important;
          background: white !important;
        }
      }
      @media screen {
        #${printContainerId} {
          display: none !important;
        }
      }
    `;

    setIsPrintColumnsModalOpen(false);

    // Call browser's native print trigger
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const filteredEmployees = useMemo(() => {
    let result = employees.filter(
      (e) =>
        (currentUser.role === "master" ||
          e.companyId === currentUser.companyId) &&
        (e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.cpf.includes(searchTerm) ||
          (e.registrationNumber && e.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (!selectedContractId || e.contractId === selectedContractId),
    );

    return result.sort((a, b) => {
      // Primary Sort: status (active first)
      const statusA = a.status || "active";
      const statusB = b.status || "active";
      if (statusA === "active" && statusB === "dismissed") return -1;
      if (statusA === "dismissed" && statusB === "active") return 1;

      let comparison = 0;
      if (sortField === "name") comparison = a.name.localeCompare(b.name);
      else if (sortField === "cpf")
        comparison = (a.cpf || "").localeCompare(b.cpf || "");
      else if (sortField === "registrationNumber")
        comparison = (a.registrationNumber || "").localeCompare(b.registrationNumber || "");
      else if (sortField === "role")
        comparison = (a.role || "").localeCompare(b.role || "");
      else if (sortField === "admissionDate")
        comparison = (a.admissionDate || "").localeCompare(
          b.admissionDate || "",
        );
      else if (sortField === "salary")
        comparison = (a.salary || 0) - (b.salary || 0);

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [
    employees,
    currentUser,
    searchTerm,
    sortField,
    sortOrder,
    selectedContractId,
  ]);

  // Reset selected employee if contract filter makes them unavailable
  useEffect(() => {
    if (selectedEmployeeId) {
      const isAvailable = filteredEmployees.some(
        (e) => e.id === selectedEmployeeId,
      );
      if (!isAvailable) {
        setSelectedEmployeeId(null);
      }
    }
  }, [selectedContractId, filteredEmployees, selectedEmployeeId]);

  const handleSort = (field: "name" | "cpf" | "role" | "admissionDate" | "salary" | "registrationNumber") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const initialEmployeeValue: Partial<Employee> = {
    name: "",
    cpf: "",
    status: "active",
    role: "",
    team: "",
    admissionDate: new Date().toISOString().split("T")[0],
    salary: 0,
    paymentType: "month",
    rgNumber: "",
    rgAgency: "",
    rgIssuer: "",
    rgState: "",
    birthDate: "",
    birthPlace: "",
    birthState: "",
    workBookletNumber: "",
    workBookletSeries: "",
    pis: "",
    phone: "",
    mobile: "",
    email: "",
    voterIdNumber: "",
    voterZone: "",
    voterSection: "",
    fatherName: "",
    motherName: "",
    spouseName: "",
    dependents: [],
    addressLogradouro: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressCity: "",
    addressZipCode: "",
    addressState: "",
    contractId: selectedContractId || "",
    commuterBenefits: false,
    commuterValue1: 0,
    commuterCity1: "",
    commuterValue2: 0,
    commuterCity2: "",
  };

  const [newEmployee, setNewEmployee] =
    useState<Partial<Employee>>(initialEmployeeValue);

  const syncEmployeeTeamAssignment = (
    employeeId: string,
    teamIdOrName: string | undefined,
    contractId?: string,
    companyId?: string,
  ) => {
    if (!teamAssignments || !onUpdateAssignments) return;
    const currentMonth = selectedMonth || new Date().toISOString().slice(0, 7);
    const team =
      teamIdOrName && teamIdOrName !== "none"
        ? (controllerTeams || []).find((t) => t.id === teamIdOrName || t.name === teamIdOrName)
        : null;
    let updatedAssignments = [...teamAssignments];
    const existingIdx = updatedAssignments.findIndex(
      (a) =>
        a.memberId === employeeId &&
        a.type === "manpower" &&
        a.month === currentMonth,
    );

    if (team) {
      if (existingIdx >= 0) {
        if (updatedAssignments[existingIdx].teamId !== team.id) {
          updatedAssignments[existingIdx] = {
            ...updatedAssignments[existingIdx],
            teamId: team.id,
            contractId:
              contractId || updatedAssignments[existingIdx].contractId,
          };
          onUpdateAssignments(updatedAssignments);
        }
      } else {
        updatedAssignments.push({
          id: generateUUID(),
          teamId: team.id,
          memberId: employeeId,
          type: "manpower",
          month: currentMonth,
          companyId: companyId || currentUser.companyId,
          contractId: contractId,
        });
        onUpdateAssignments(updatedAssignments);
      }
    } else {
      if (existingIdx >= 0) {
        updatedAssignments.splice(existingIdx, 1);
        onUpdateAssignments(updatedAssignments);
      }
    }
  };

  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [saveEmployeeProgress, setSaveEmployeeProgress] = useState<{ step: string; progress: number } | null>(null);
  const [isRoleFocused, setIsRoleFocused] = useState(false);

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.cpf || !newEmployee.admissionDate || !newEmployee.contractId || !newEmployee.role) {
      alert("Nome, CPF, Função, Data de Admissão e Contrato são campos obrigatórios.");
      return;
    }

    const regNumTrimmed = newEmployee.registrationNumber?.trim();
    if (regNumTrimmed) {
      const duplicate = employees.find(
        (e) => e.id !== editingEmployeeId && e.registrationNumber?.trim().toLowerCase() === regNumTrimmed.toLowerCase()
      );
      if (duplicate) {
        alert(`O número de matrícula "${regNumTrimmed}" já está em uso pelo colaborador "${duplicate.name}".`);
        return;
      }
    }

    setIsSavingEmployee(true);
    setSaveEmployeeProgress({ step: "Iniciando cadastro...", progress: 20 });

    try {
      let finalEmployees: Employee[];
      let targetEmployeeId = editingEmployeeId;

      if (editingEmployeeId) {
        // Update existing employee
        finalEmployees = employees.map((e) =>
          e.id === editingEmployeeId
            ? ({
                ...newEmployee,
                id: editingEmployeeId,
                companyId: e.companyId,
              } as Employee)
            : e,
        );
      } else {
        // Create new employee
        const employeeId = generateUUID();
        targetEmployeeId = employeeId;
        const employee: Employee = {
          id: employeeId,
          status: "active",
          companyId: currentUser.companyId,
          registrationNumber: newEmployee.registrationNumber || "",
          name: newEmployee.name!,
          cpf: newEmployee.cpf!,
          role: newEmployee.role || "Colaborador",
          team: newEmployee.team || undefined,
          admissionDate: newEmployee.admissionDate!,
          salary: newEmployee.salary || 0,
          paymentType: (newEmployee.paymentType as any) || "month",
          rgNumber: newEmployee.rgNumber || "",
          rgAgency: newEmployee.rgAgency || "",
          rgIssuer: newEmployee.rgIssuer || "",
          rgState: newEmployee.rgState || "",
          birthDate: newEmployee.birthDate || "",
          birthPlace: newEmployee.birthPlace || "",
          birthState: newEmployee.birthState || "",
          workBookletNumber: newEmployee.workBookletNumber || "",
          workBookletSeries: newEmployee.workBookletSeries || "",
          pis: newEmployee.pis || "",
          phone: newEmployee.phone || "",
          mobile: newEmployee.mobile || "",
          email: newEmployee.email || "",
          voterIdNumber: newEmployee.voterIdNumber || "",
          voterZone: newEmployee.voterZone || "",
          voterSection: newEmployee.voterSection || "",
          fatherName: newEmployee.fatherName || "",
          motherName: newEmployee.motherName || "",
          spouseName: newEmployee.spouseName || "",
          dependents: newEmployee.dependents || [],
          addressLogradouro: newEmployee.addressLogradouro || "",
          addressNumber: newEmployee.addressNumber || "",
          addressComplement: newEmployee.addressComplement || "",
          addressNeighborhood: newEmployee.addressNeighborhood || "",
          addressCity: newEmployee.addressCity || "",
          addressZipCode: newEmployee.addressZipCode || "",
          addressState: newEmployee.addressState || "",
          contractId: newEmployee.contractId,
          commuterBenefits: !!newEmployee.commuterBenefits,
          commuterValue1: newEmployee.commuterValue1,
          commuterCity1: newEmployee.commuterCity1,
          commuterValue2: newEmployee.commuterValue2,
          commuterCity2: newEmployee.commuterCity2,
        };
        finalEmployees = [...employees, employee];
      }

      setSaveEmployeeProgress({ step: "Sincronizando com o banco...", progress: 50 });
      
      // Update local state and trigger app sync
      await onUpdateEmployees(finalEmployees);
      
      syncEmployeeTeamAssignment(
        targetEmployeeId!,
        newEmployee.team,
        newEmployee.contractId,
        currentUser.companyId,
      );

      setSaveEmployeeProgress({ step: "Checando registro no banco...", progress: 75 });
      
      // Verification Step
      const config = getSupabaseConfig();
      if (config.enabled && targetEmployeeId) {
        const supabase = createSupabaseClient(config.url, config.key);
        if (supabase) {
           // Small delay to allow UPSERT to finish
           await new Promise(resolve => setTimeout(resolve, 600));
           const { data, error } = await supabase.from('employees').select('id, contract_id').eq('id', targetEmployeeId).single();
           
           if (error || !data) {
             setSaveEmployeeProgress({ step: "Erro de checagem", progress: 100 });
             console.error("Employee validation failed:", error);
             alert("Atenção: O colaborador não pôde ser salvo com sucesso no banco de dados. \nPossíveis causas: \n- Contrato Inválido \n- Informações Incompletas \n\nPor favor, atualize a página ou tente novamente.");
             setIsSavingEmployee(false);
             setSaveEmployeeProgress(null);
             return;
           }
        }
      }

      setSaveEmployeeProgress({ step: "Concluído!", progress: 100 });
      
      alert("Colaborador salvo com sucesso!");
      
      setTimeout(() => {
        setIsSavingEmployee(false);
        setSaveEmployeeProgress(null);
        setIsDialogOpen(false);
        setEditingEmployeeId(null);
        resetForm();
      }, 600);

    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar: " + (err.message || String(err)));
      setIsSavingEmployee(false);
      setSaveEmployeeProgress(null);
    }
  };

  const handleDismiss = (e: Employee) => {
    const formattedToday = new Date().toLocaleDateString('pt-BR');
    const inputDate = window.prompt(
      "Informe a data de demissão (DD/MM/AAAA ou DD/MM/AA):",
      formattedToday
    );
    if (inputDate) {
      let finalDate = inputDate;
      const parts = inputDate.split('/');
      if (parts.length === 3) {
        let day = parts[0];
        let month = parts[1];
        let year = parts[2];
        if (year.length === 2) {
          year = `20${year}`;
        }
        if (day.length === 1) day = `0${day}`;
        if (month.length === 1) month = `0${month}`;
        finalDate = `${year}-${month}-${day}`;
      } else if (inputDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        finalDate = inputDate;
      } else {
        alert("Formato de data inválido. Use DD/MM/AAAA.");
        return;
      }

      const updated = employees.map((emp) =>
        emp.id === e.id
          ? { ...emp, status: "dismissed" as const, dismissalDate: finalDate }
          : emp,
      );
      onUpdateEmployees(updated);

      // Remove the employee from active team assignments
      if (teamAssignments && onUpdateAssignments) {
        onUpdateAssignments(
          teamAssignments.filter((a) => a.memberId !== e.id)
        );
      }

      // Unset the supervisor status if they were the supervisor of any team
      if (controllerTeams && onUpdateTeams) {
        onUpdateTeams(
          controllerTeams.map((t) =>
            t.supervisorId === e.id ? { ...t, supervisorId: "" } : t
          )
        );
      }
    }
  };

  const resetForm = () => {
    setNewEmployee(initialEmployeeValue);
    setEditingEmployeeId(null);
  };

  const startEdit = (employee: Employee) => {
    setNewEmployee({
      ...initialEmployeeValue,
      ...employee,
      team: getEmployeeTeamName(employee) || undefined,
    });
    setEditingEmployeeId(employee.id);
    setIsDialogOpen(true);
  };

  const addDependent = () => {
    setNewEmployee({
      ...newEmployee,
      dependents: [
        ...(newEmployee.dependents || []),
        { name: "", birthDate: "", cpf: "" },
      ],
    });
  };

  const removeDependent = (index: number) => {
    setNewEmployee({
      ...newEmployee,
      dependents: (newEmployee.dependents || []).filter((_, i) => i !== index),
    });
  };

  const updateDependent = (
    index: number,
    field: keyof Dependent,
    value: string,
  ) => {
    const newDeps = [...(newEmployee.dependents || [])];
    newDeps[index] = { ...newDeps[index], [field]: value };
    setNewEmployee({ ...newEmployee, dependents: newDeps });
  };

  const getDaysInMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  };

  // Alojamento handlers
  const handleCreateAlojamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alF_name || !alF_address || !alF_city) {
      alert("Por favor preencha todos os campos obrigatórios.");
      return;
    }

    const newAl: Alojamento = {
      id: "aloj-" + Date.now(),
      companyId: currentUser?.companyId || "default",
      name: alF_name,
      address: alF_address,
      city: alF_city,
      roomsCount: Number(alF_rooms) || 0,
      maxCapacity: Number(alF_maxCap) || 0,
    };

    if (onUpdateAlojamentos) {
      onUpdateAlojamentos([...alojamentos, newAl]);
    }
    // Reset form
    setAlF_name("");
    setAlF_address("");
    setAlF_city("");
    setAlF_rooms("1");
    setAlF_maxCap("10");
    setShowAddAlojamento(false);
    alert("Alojamento cadastrado com sucesso!");
  };

  const handleDeleteAlojamento = (alId: string) => {
    if (!confirm("Tem certeza que deseja excluir este alojamento?")) return;
    
    // Clear alojamentoId from all employees in this alojamento
    const updatedEmployees = employees.map(emp => {
      if (emp.alojamentoId === alId) {
        const { alojamentoId, ...rest } = emp;
        return rest;
      }
      return emp;
    });
    onUpdateEmployees(updatedEmployees);

    if (onUpdateAlojamentos) {
      onUpdateAlojamentos(alojamentos.filter(al => al.id !== alId));
    }
  };

  const handleAssignEmployee = (empId: string, alId: string | undefined) => {
    const updatedEmployees = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, alojamentoId: alId };
      }
      return emp;
    });
    onUpdateEmployees(updatedEmployees);
  };

  const handleSortFechamento = (field: string) => {
    if (fechamentoSortField === field) {
      setFechamentoSortOrder(fechamentoSortOrder === "asc" ? "desc" : "asc");
    } else {
      setFechamentoSortField(field);
      setFechamentoSortOrder("asc");
    }
  };

  const getSortIconFechamento = (field: string) => {
    if (fechamentoSortField !== field) return <ChevronDown className="w-3 h-3 opacity-20" />;
    return fechamentoSortOrder === "asc" ? (
      <ChevronUp className="w-3 h-3 text-orange-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-orange-600" />
    );
  };

  const sortedFechamentoEmployees = useMemo(() => {
    let sorted = employees.filter((e) => e.status === "active");

    sorted = sorted.sort((a, b) => {
      let aValue: any = "";
      let bValue: any = "";

      if (fechamentoSortField === "name") {
        aValue = a.name || "";
        bValue = b.name || "";
      } else if (fechamentoSortField === "registrationNumber") {
        aValue = a.registrationNumber || "";
        bValue = b.registrationNumber || "";
      } else if (fechamentoSortField === "role") {
        aValue = a.role || "";
        bValue = b.role || "";
      } else {
        const valA = closingRecordsMap[a.id] || {};
        const valB = closingRecordsMap[b.id] || {};

        if (fechamentoSortField === "workedDays") {
          aValue = parseInt(valA.workedDays || "0", 10);
          bValue = parseInt(valB.workedDays || "0", 10);
        } else if (fechamentoSortField === "absences") {
          aValue = parseInt(valA.absences || "0", 10);
          bValue = parseInt(valB.absences || "0", 10);
        } else if (fechamentoSortField === "medicalCertificates") {
          aValue = parseInt(valA.medicalCertificates || "0", 10);
          bValue = parseInt(valB.medicalCertificates || "0", 10);
        } else if (fechamentoSortField === "vacationDays") {
          aValue = parseInt(valA.vacationDays || "0", 10);
          bValue = parseInt(valB.vacationDays || "0", 10);
        } else if (fechamentoSortField === "leaveDays") {
          aValue = parseInt(valA.leaveDays || "0", 10);
          bValue = parseInt(valB.leaveDays || "0", 10);
        } else if (fechamentoSortField === "overtime50") {
          aValue = parseFloat(valA.overtime50 || "0");
          bValue = parseFloat(valB.overtime50 || "0");
        } else if (fechamentoSortField === "overtime100") {
          aValue = parseFloat(valA.overtime100 || "0");
          bValue = parseFloat(valB.overtime100 || "0");
        } else if (fechamentoSortField === "nightShift") {
          aValue = parseFloat(valA.nightShift || "0");
          bValue = parseFloat(valB.nightShift || "0");
        }
      }

      if (aValue < bValue) return fechamentoSortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return fechamentoSortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [employees, closingRecordsMap, fechamentoSortField, fechamentoSortOrder]);

  const existingRoles = Array.from(new Set(employees.map(e => e.role).filter(Boolean))).sort();

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-gradient-to-r from-orange-950 to-orange-800 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500/10 p-3 rounded-2xl border border-orange-500/20">
            <Users className="w-8 h-8 text-orange-300" />
          </div>
          <div>
            <span className="text-sm bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full border border-orange-500/30 font-bold uppercase tracking-wider">Setor Administrativo</span>
            <h1 className="text-4xl font-black tracking-tight mt-1">Recursos Humanos</h1>
            <p className="text-orange-100/80 text-base mt-1">Gerencie colaboradores, folhas de ponto, dependentes e documentos corporativos.</p>
          </div>
        </div>
      </div>

      {!isDialogOpen ? (
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-gray-100/50 p-1">
          <TabsTrigger value="employees" className="gap-2">
            <Users className="w-4 h-4" /> Colaboradores
          </TabsTrigger>
          <TabsTrigger value="fechamento_jornada" className="gap-2">
            <Clock className="w-4 h-4" /> Fechamento de Jornada
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" /> Documentos
          </TabsTrigger>
          <TabsTrigger value="alojamentos" className="gap-2">
            <Home className="w-4 h-4" /> Alojamento
          </TabsTrigger>
          <TabsTrigger value="parameters" className="gap-2">
            <Settings className="w-4 h-4" /> Parâmetros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-none shadow-sm bg-orange-50/20 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardDescription className="font-bold text-orange-900">Total de Funcionários</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="text-3xl font-black text-gray-900">{employees.filter(e => e.status === 'active').length}</div>
                <p className="text-[10px] text-orange-600 font-semibold mt-1">Colaboradores Ativos</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-indigo-50/30 flex flex-col md:col-span-1 lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-indigo-950">Seletor de Mês (Remuneração Dinâmica)</CardTitle>
                    <CardDescription className="text-indigo-900/60 text-[11px]">
                      Selecione um mês para calcular a remuneração com os dados do Fechamento de Jornada.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-full sm:w-auto">
                  <Input
                    type="month"
                    value={colabSelectedMonth}
                    onChange={(e) => setColabSelectedMonth(e.target.value)}
                    className="w-full sm:w-48 h-10 text-sm font-bold border-indigo-200 focus:border-indigo-500 rounded-xl bg-white font-mono shadow-sm"
                  />
                </div>
                {colabSelectedMonth ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1">
                      Mês Ativo: {colabSelectedMonth.split("-")[1]}/{colabSelectedMonth.split("-")[0]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setColabSelectedMonth("")}
                      className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-bold px-2.5 h-8 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Remover Filtro
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    Exibindo valores contratuais fixos. Escolha um mês para aplicar as horas extras, faltas e adicionais.
                  </span>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Colaboradores</CardTitle>
                <CardDescription>
                  Lista completa de funcionários da empresa.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 h-10 select-none shadow-sm mr-2">
                  <Switch
                    id="show-loaded-salary"
                    checked={showLoadedSalary}
                    onCheckedChange={setShowLoadedSalary}
                  />
                  <Label
                    htmlFor="show-loaded-salary"
                    className="text-xs font-bold text-slate-700 cursor-pointer whitespace-nowrap"
                  >
                    Encargos
                  </Label>
                </div>
                <div className="relative mr-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  className="gap-2 text-slate-700 border-slate-200 h-10"
                  onClick={() => setIsExportSelectorOpen(true)}
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Exportar / Importar
                </Button>

                <Button
                  variant="outline"
                  className="gap-2 text-slate-700 border-slate-200 h-10"
                  onClick={() => setIsPrintColumnsModalOpen(true)}
                >
                  <Printer className="w-4 h-4 text-indigo-600" /> Imprimir
                </Button>

                <Button
                  className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold h-10"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                >
                  <UserPlus className="w-4 h-4" /> Novo Colaborador
                </Button>

                <Dialog
                  open={isPrintColumnsModalOpen}
                  onOpenChange={setIsPrintColumnsModalOpen}
                >
                  <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-left">
                    <DialogHeader className="text-left space-y-2">
                      <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-indigo-600" />
                        Configurar Impressão de Colaboradores
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">
                        Selecione as colunas do cadastro que deseja que apareçam
                        no relatório impresso.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 text-left">
                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-name"
                          checked={printColumns.name}
                          onCheckedChange={(checked) =>
                            setPrintColumns({
                              ...printColumns,
                              name: !!checked,
                            })
                          }
                        />
                        <Label
                          htmlFor="col-name"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          Nome
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-cpf"
                          checked={printColumns.cpf}
                          onCheckedChange={(checked) =>
                            setPrintColumns({ ...printColumns, cpf: !!checked })
                          }
                        />
                        <Label
                          htmlFor="col-cpf"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          CPF
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-role"
                          checked={printColumns.role}
                          onCheckedChange={(checked) =>
                            setPrintColumns({
                              ...printColumns,
                              role: !!checked,
                            })
                          }
                        />
                        <Label
                          htmlFor="col-role"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          Cargo
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-status"
                          checked={printColumns.status}
                          onCheckedChange={(checked) =>
                            setPrintColumns({
                              ...printColumns,
                              status: !!checked,
                            })
                          }
                        />
                        <Label
                          htmlFor="col-status"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          Status
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-admissionDate"
                          checked={printColumns.admissionDate}
                          onCheckedChange={(checked) =>
                            setPrintColumns({
                              ...printColumns,
                              admissionDate: !!checked,
                            })
                          }
                        />
                        <Label
                          htmlFor="col-admissionDate"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          Data Admissão
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-salary"
                          checked={printColumns.salary}
                          onCheckedChange={(checked) =>
                            setPrintColumns({
                              ...printColumns,
                              salary: !!checked,
                            })
                          }
                        />
                        <Label
                          htmlFor="col-salary"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          Salário / Remuneração
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-mobile"
                          checked={printColumns.mobile}
                          onCheckedChange={(checked) =>
                            setPrintColumns({
                              ...printColumns,
                              mobile: !!checked,
                            })
                          }
                        />
                        <Label
                          htmlFor="col-mobile"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          Telefone / Celular
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-email"
                          checked={printColumns.email}
                          onCheckedChange={(checked) =>
                            setPrintColumns({
                              ...printColumns,
                              email: !!checked,
                            })
                          }
                        />
                        <Label
                          htmlFor="col-email"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          E-mail
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-team"
                          checked={printColumns.team}
                          onCheckedChange={(checked) =>
                            setPrintColumns({
                              ...printColumns,
                              team: !!checked,
                            })
                          }
                        />
                        <Label
                          htmlFor="col-team"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          Equipe / Frente
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox
                          id="col-pis"
                          checked={printColumns.pis}
                          onCheckedChange={(checked) =>
                            setPrintColumns({ ...printColumns, pis: !!checked })
                          }
                        />
                        <Label
                          htmlFor="col-pis"
                          className="text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          PIS / NIT
                        </Label>
                      </div>
                    </div>

                    <DialogFooter className="flex justify-end gap-2 border-t pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsPrintColumnsModalOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handlePrintCollaborators}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir Relatório
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Novo modal de Exportar Colaboradores e Download de Modelo */}
              <Dialog
                open={isExportSelectorOpen}
                onOpenChange={setIsExportSelectorOpen}
              >
                <DialogContent className="sm:max-w-[750px] w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-left flex flex-col max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="text-left space-y-2 shrink-0">
                    <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Download className="w-5 h-5 text-emerald-600" />
                      Exportar / Importar Banco de RH / Colaboradores
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Selecione o formato para exportação de dados, importe seus dados ou baixe o modelo padrão de cabeçalho para importações de lotes.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 py-4 shrink-0">
                    {/* Opção 1: Relatório PDF */}
                    <button
                      onClick={() => {
                        exportAllEmployeesToPDF();
                        setIsExportSelectorOpen(false);
                      }}
                      className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-red-500 hover:bg-red-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">Relatório PDF</span>
                      <span className="text-slate-400 text-[10px] mt-1 leading-tight">Gera PDF formato Landscape para impressão/assinatura</span>
                    </button>

                    {/* Opção 2: Planilha Excel */}
                    <button
                      onClick={() => {
                        exportAllEmployeesToExcel();
                        setIsExportSelectorOpen(false);
                      }}
                      className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform mb-3">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">Planilha Excel</span>
                      <span className="text-slate-400 text-[10px] mt-1 leading-tight">Exporta a base completa para conferência</span>
                    </button>

                    {/* Opção 3: Modelo / Atualização em Lote */}
                    <button
                      onClick={() => {
                        handleDownloadTemplate(true);
                        setIsExportSelectorOpen(false);
                      }}
                      className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform mb-3">
                        <Download className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">Modelo / Atualização em Lote</span>
                      <span className="text-slate-400 text-[10px] mt-1 leading-tight">Baixa a planilha com os colaboradores para edição ou novas inserções</span>
                    </button>

                    {/* Opção 5: Importar Dados */}
                    <div className="relative flex flex-col items-center justify-center border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50/20 p-5 rounded-2xl transition group text-center cursor-pointer overflow-hidden">
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className={cn(
                          "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10",
                          isImporting && "pointer-events-none"
                        )}
                        onChange={(e) => {
                          handleImportData(e);
                          setIsExportSelectorOpen(false);
                        }}
                        disabled={isImporting}
                      />
                      <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform mb-3">
                        {isImporting ? (
                          <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {isImporting ? "Importando..." : "Importar Dados"}
                      </span>
                      <span className="text-slate-400 text-[10px] mt-1 leading-tight">Envie sua planilha preenchida</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600 border border-slate-100">
                    <p className="font-bold text-slate-800">Dica sobre a Importação e Tags de Colaboradores:</p>
                    <p>Ao realizar a importação de dados por planilha Excel, certifique-se de usar os cabeçalhos das colunas exatamente como definidos no modelo, ou utilize as tags (#) opcionais para mapeamento automático das colunas:</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700 text-[11px]">Identificação e Cargo:</p>
                        <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-blue-700 bg-white p-2 rounded-lg border border-slate-200">
                          <div><span className="font-bold text-slate-600">#nome</span> - Nome Completo</div>
                          <div><span className="font-bold text-slate-600">#cpf</span> - CPF (apenas números ou formatado)</div>
                          <div><span className="font-bold text-slate-600">#funcao</span> - Cargo / Função</div>
                          <div><span className="font-bold text-slate-600">#salario</span> - Salário Bruto</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="font-bold text-slate-700 text-[11px]">Contatos e Outros:</p>
                        <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-emerald-700 bg-white p-2 rounded-lg border border-slate-200">
                          <div><span className="font-bold text-slate-600">#contrato</span> - Código do Contrato</div>
                          <div><span className="font-bold text-slate-600">#email</span> - E-mail do colaborador</div>
                          <div><span className="font-bold text-slate-600">#telefone</span> - Telefone celular de contato</div>
                          <div><span className="font-bold text-slate-600">#pis</span> - Registro do PIS</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="flex justify-end gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsExportSelectorOpen(false)}
                    >
                      Fechar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full [&>div]:max-h-[70vh] [&>div]:overflow-y-auto [&>div]:overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_0_0_#e5e7eb]">
                    <TableRow>
                      <TableHead
                        className="font-bold cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-1">
                          Colaborador
                          {sortField === "name" &&
                            (sortOrder === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("cpf")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          CPF
                          {sortField === "cpf" &&
                            (sortOrder === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("registrationNumber")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Matrícula
                          {sortField === "registrationNumber" &&
                            (sortOrder === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("role")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Cargo
                          {sortField === "role" &&
                            (sortOrder === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            ))}
                        </div>
                      </TableHead>

                      <TableHead
                        className="font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("admissionDate")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Admissão
                          {sortField === "admissionDate" &&
                            (sortOrder === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("salary")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {showLoadedSalary ? "Salário Carregado" : "Salário Base"}
                          {sortField === "salary" &&
                            (sortOrder === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-center">
                        Equipe
                      </TableHead>
                      <TableHead className="w-[150px] font-bold text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-20 text-gray-400"
                        >
                          Nenhum colaborador encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((e) => (
                        <TableRow
                          key={e.id}
                          className={cn(
                            "hover:bg-gray-50/50 cursor-pointer transition-colors",
                            e.status === "dismissed" &&
                              "bg-slate-50/80 opacity-70",
                          )}
                          onDoubleClick={() => startEdit(e)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "p-2 rounded-full",
                                  e.status === "dismissed"
                                    ? "bg-gray-200 text-gray-400"
                                    : "bg-blue-100 text-blue-600",
                                )}
                              >
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p
                                    className={cn(
                                      "font-bold",
                                      e.status === "dismissed"
                                        ? "text-gray-500 line-through"
                                        : "text-gray-900",
                                    )}
                                  >
                                    {e.name}
                                  </p>
                                  {e.status === "dismissed" && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-gray-100 text-gray-500 text-xs uppercase h-4 px-1"
                                    >
                                      Desativado
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 uppercase tracking-wider">
                                  {e.companyId === currentUser.companyId
                                    ? e.registrationNumber ? `Matrícula: ${e.registrationNumber}` : "Sem Matrícula"
                                    : e.registrationNumber ? `Matrícula: ${e.registrationNumber}` : "Sem Matrícula"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-base font-mono text-gray-600">
                            <div className="flex items-center justify-center gap-2">
                              {showCPF[e.id] ? e.cpf : maskCPF(e.cpf)}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-blue-600"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  toggleCPF(e.id);
                                }}
                              >
                                {showCPF[e.id] ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-gray-600 bg-slate-50/20">
                            {e.registrationNumber || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "bg-gray-50",
                                e.status === "dismissed" &&
                                  "text-gray-400 border-gray-200",
                              )}
                            >
                              {e.role}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center text-base text-gray-600">
                            {formatDateForDisplay(e.admissionDate)}
                          </TableCell>
                          <TableCell className="text-center font-mono animate-fade-in py-2 select-none">
                            {(() => {
                              const monthRecord = colabClosingRecordsMap[e.id];
                              const calc = calculateEmployeeRemuneration(e, monthRecord);
                              
                              const displaySalary = colabSelectedMonth ? calc.finalSalary : calc.baseSalary;
                              const finalDisplaySalary = showLoadedSalary
                                ? displaySalary * (1 + totalExtraCostsPercentage / 100)
                                : displaySalary;

                              return (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className={cn(
                                    "text-sm font-black",
                                    colabSelectedMonth ? "text-indigo-600 font-black" : "text-gray-800"
                                  )}>
                                    {finalDisplaySalary.toLocaleString("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    })}
                                  </span>
                                  {showLoadedSalary && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                      +{totalExtraCostsPercentage.toFixed(1)}% encargos
                                    </span>
                                  )}
                                  {colabSelectedMonth && monthRecord && (
                                    <div className="flex flex-col items-center text-[10px] text-slate-500 mt-1 leading-normal font-sans border-t border-slate-100/80 pt-1 w-full max-w-[150px] gap-0.5">
                                      {calc.overtime50Qty > 0 && (
                                        <div className="flex justify-between w-full px-1 gap-1">
                                          <span>H.Ext 50% ({calc.overtime50Qty}h):</span>
                                          <span className="text-emerald-600 font-bold">+{calc.overtime50Value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                                        </div>
                                      )}
                                      {calc.overtime100Qty > 0 && (
                                        <div className="flex justify-between w-full px-1 gap-1">
                                          <span>H.Ext 100% ({calc.overtime100Qty}h):</span>
                                          <span className="text-emerald-600 font-bold">+{calc.overtime100Value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                                        </div>
                                      )}
                                      {calc.absencesDays > 0 && (
                                        <div className="flex justify-between w-full px-1 gap-1 text-rose-600">
                                          <span>Faltas ({calc.absencesDays}d):</span>
                                          <span className="font-bold">-{calc.absencesDiscount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                                        </div>
                                      )}
                                      {!calc.overtime50Qty && !calc.overtime100Qty && !calc.absencesDays && (
                                        <span className="text-slate-400 italic text-[9px]">Salário Base (Limpo)</span>
                                      )}
                                    </div>
                                  )}
                                  {colabSelectedMonth && !monthRecord && (
                                    <span className="text-[10px] text-slate-400 italic">Sem folha fechada</span>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-center min-w-[140px]">
                            <div className="inline-block relative w-full max-w-[150px]">
                              <select
                                value={getEmployeeTeamId(e) || "none"}
                                onChange={(ev) => {
                                  const val = ev.target.value;
                                  
                                  if (!window.confirm(`Deseja realmente confirmar a mudança de equipe para este colaborador?`)) {
                                    ev.target.value = getEmployeeTeamId(e) || "none";
                                    return;
                                  }

                                  const teamIdVal =
                                    val === "none" ? undefined : val;

                                  const targetTeam = (controllerTeams || []).find((t) => t.id === teamIdVal);

                                  // Update employee locally with name for backwards compatibility
                                  const updatedEmployees = employees.map(
                                    (emp) =>
                                      emp.id === e.id
                                        ? { ...emp, team: targetTeam ? targetTeam.name : undefined }
                                        : emp,
                                  );
                                  onUpdateEmployees(updatedEmployees);

                                  // Synchronize assignment using ID
                                  syncEmployeeTeamAssignment(
                                    e.id,
                                    teamIdVal,
                                    e.contractId,
                                    e.companyId || currentUser.companyId,
                                  );
                                }}
                                className={cn(
                                  "w-full text-center font-bold uppercase tracking-wide text-[11px] h-8 rounded-lg px-2 border transition-colors cursor-pointer appearance-none",
                                  !getEmployeeTeamName(e) &&
                                    "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:border-gray-300",
                                )}
                                style={
                                  getEmployeeTeamName(e)
                                    ? {
                                        backgroundColor: `${getEmployeeTeamColor(e) || "#8b5cf6"}1A`, // 10% opacity
                                        borderColor: `${getEmployeeTeamColor(e) || "#8b5cf6"}33`, // 20% opacity
                                        color:
                                          getEmployeeTeamColor(e) || "#7e22ce",
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
                                  .map((t) => (
                                    <option
                                      key={t.id}
                                      value={t.id}
                                      className="text-purple-900 bg-white font-bold uppercase text-[11px]"
                                    >
                                      {t.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  startEdit(e);
                                }}
                                title="Editar Colaborador"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  exportEmployeeToPDF(e);
                                }}
                                title="Exportar PDF"
                              >
                                <FileDown className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-500 hover:text-green-700 hover:bg-green-50"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  exportEmployeeToExcel(e);
                                }}
                                title="Exportar Excel"
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                              </Button>
                              {colabSelectedMonth && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    exportIndividualSlipToPDF(e, colabSelectedMonth);
                                  }}
                                  title="Gerar Holerite PDF"
                                >
                                  <FileText className="w-4 h-4 text-indigo-650" />
                                </Button>
                              )}
                              {e.status !== "dismissed" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleDismiss(e);
                                  }}
                                  title="Demissão"
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  if (confirm(`Excluir ${e.name}?`)) {
                                    onUpdateEmployees(
                                      employees.filter(
                                        (item) => item.id !== e.id,
                                      ),
                                    );
                                    if (
                                      teamAssignments &&
                                      onUpdateAssignments
                                    ) {
                                      onUpdateAssignments(
                                        teamAssignments.filter(
                                          (a) => a.memberId !== e.id,
                                        ),
                                      );
                                    }
                                    if (
                                      controllerTeams &&
                                      onUpdateTeams
                                    ) {
                                      onUpdateTeams(
                                        controllerTeams.map((t) =>
                                          t.supervisorId === e.id ? { ...t, supervisorId: "" } : t
                                        )
                                      );
                                    }
                                  }
                                }}
                                title="Excluir Colaborador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fechamento_jornada">
          <div className="space-y-6">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-orange-500/5 pb-6 border-b border-orange-100/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl shadow-sm">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Fechamento de Jornada</CardTitle>
                    <CardDescription className="text-gray-500 text-xs">
                      Insira dias trabalhados, faltas, atestados, férias, horas extras e adicionais dos colaboradores para o fechamento mensal da jornada.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl shadow-sm">
                    <Label htmlFor="closing-month" className="text-sm font-extrabold text-slate-800 whitespace-nowrap font-sans pl-2">Mês de Referência:</Label>
                    <Input
                      id="closing-month"
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-56 h-12 text-base font-black px-4 border-slate-300 rounded-xl bg-white font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <Button
                    onClick={handleSaveClosings}
                    disabled={isSavingClosings}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-10 px-5 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer text-sm"
                  >
                    {isSavingClosings ? (
                      <>Salvando...</>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Salvar Fechamento (Mês)
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setIsFechamentoExportSelectorOpen(true)}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-10 px-5 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer text-sm"
                    title="Exportar / Importar Fechamento"
                  >
                    <Download className="w-4 h-4 text-emerald-400" /> Exportar / Importar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingClosings ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                    <span className="animate-spin text-orange-600 w-8 h-8 border-4 border-current border-t-transparent rounded-full" />
                    <p className="text-sm font-semibold italic text-slate-500">Buscando dados de fechamento...</p>
                  </div>
                ) : (
                  <div className="w-full [&>div]:max-h-[70vh] [&>div]:overflow-y-auto [&>div]:overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_0_#e5e7eb]">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 max-w-[200px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("name")}>
                            <div className="flex items-center gap-1">Colaborador {getSortIconFechamento("name")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("registrationNumber")}>
                            <div className="flex items-center gap-1">Matrícula {getSortIconFechamento("registrationNumber")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("role")}>
                            <div className="flex items-center gap-1">Função {getSortIconFechamento("role")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 text-center w-20 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("workedDays")}>
                            <div className="flex items-center justify-center gap-1">Dias Trab. {getSortIconFechamento("workedDays")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 text-center w-20 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("absences")}>
                            <div className="flex items-center justify-center gap-1">Faltas {getSortIconFechamento("absences")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 text-center w-20 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("medicalCertificates")}>
                            <div className="flex items-center justify-center gap-1">Atestado {getSortIconFechamento("medicalCertificates")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 text-center w-20 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("vacationDays")}>
                            <div className="flex items-center justify-center gap-1">Férias {getSortIconFechamento("vacationDays")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 text-center w-20 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("leaveDays")}>
                            <div className="flex items-center justify-center gap-1">Afastamento {getSortIconFechamento("leaveDays")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 text-center w-24 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("overtime50")}>
                            <div className="flex items-center justify-center gap-1">HE 50% {getSortIconFechamento("overtime50")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 text-center w-24 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("overtime100")}>
                            <div className="flex items-center justify-center gap-1">HE 100% {getSortIconFechamento("overtime100")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 text-center w-24 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortFechamento("nightShift")}>
                            <div className="flex items-center justify-center gap-1">Adic. Noturno {getSortIconFechamento("nightShift")}</div>
                          </TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs py-3 min-w-[150px]">Obs.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedFechamentoEmployees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={12} className="py-10 text-center text-gray-400 font-medium">
                              Nenhum colaborador ativo cadastrado ou encontrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedFechamentoEmployees.map((emp) => {
                            const val = closingRecordsMap[emp.id] || {
                              workedDays: 22,
                              absences: 0,
                              medicalCertificates: 0,
                              vacationDays: 0,
                              leaveDays: 0,
                              overtime50: 0,
                              overtime100: 0,
                              nightShift: 0,
                              notes: "",
                            };

                            const updateField = (field: string, newValue: any) => {
                              setClosingRecordsMap((prev) => ({
                                ...prev,
                                [emp.id]: {
                                  ...val,
                                  [field]: newValue,
                                },
                              }));
                            };

                            return (
                              <TableRow key={emp.id} className="hover:bg-slate-50/40 divide-x divide-transparent">
                                <TableCell className="py-2.5 font-bold text-slate-900 max-w-[200px] truncate">
                                  {emp.name}
                                </TableCell>
                                <TableCell className="py-2.5 text-xs font-mono text-slate-600 bg-slate-50/10">
                                  {emp.registrationNumber || "-"}
                                </TableCell>
                                <TableCell className="py-2.5 text-xs text-slate-500 font-medium">
                                  {emp.role || "Não definida"}
                                </TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="31"
                                    value={val.workedDays}
                                    onChange={(e) => updateField("workedDays", parseInt(e.target.value, 10) || 0)}
                                    className="w-16 h-8 text-center text-sm font-mono rounded-lg border-slate-200 bg-white"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="31"
                                    value={val.absences}
                                    onChange={(e) => updateField("absences", parseInt(e.target.value, 10) || 0)}
                                    className="w-16 h-8 text-center text-sm font-mono rounded-lg border-slate-200 bg-white text-red-600 font-bold"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="31"
                                    value={val.medicalCertificates}
                                    onChange={(e) => updateField("medicalCertificates", parseInt(e.target.value, 10) || 0)}
                                    className="w-16 h-8 text-center text-sm font-mono rounded-lg border-slate-200 bg-white text-emerald-600 font-semibold"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="31"
                                    value={val.vacationDays}
                                    onChange={(e) => updateField("vacationDays", parseInt(e.target.value, 10) || 0)}
                                    className="w-16 h-8 text-center text-sm font-mono rounded-lg border-slate-200 bg-white text-blue-600 font-semibold"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="31"
                                    value={val.leaveDays}
                                    onChange={(e) => updateField("leaveDays", parseInt(e.target.value, 10) || 0)}
                                    className="w-16 h-8 text-center text-sm font-mono rounded-lg border-slate-200 bg-white text-amber-600 font-semibold"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={val.overtime50}
                                    onChange={(e) => updateField("overtime50", parseFloat(e.target.value) || 0)}
                                    className="w-20 h-8 text-center text-sm font-mono rounded-lg border-slate-200 bg-white"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={val.overtime100}
                                    onChange={(e) => updateField("overtime100", parseFloat(e.target.value) || 0)}
                                    className="w-20 h-8 text-center text-sm font-mono rounded-lg border-slate-200 bg-white"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={val.nightShift}
                                    onChange={(e) => updateField("nightShift", parseFloat(e.target.value) || 0)}
                                    className="w-20 h-8 text-center text-sm font-mono rounded-lg border-slate-200 bg-white"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-1">
                                  <Input
                                    value={val.notes}
                                    onChange={(e) => updateField("notes", e.target.value)}
                                    placeholder="Obs do fechamento..."
                                    className="w-full h-8 text-xs rounded-lg border-slate-200 bg-white"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modal de Exportar Fechamento de Jornada */}
            <Dialog
              open={isFechamentoExportSelectorOpen}
              onOpenChange={setIsFechamentoExportSelectorOpen}
            >
              <DialogContent className="sm:max-w-[750px] w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-left flex flex-col max-h-[90vh] overflow-y-auto">
                <DialogHeader className="text-left space-y-2 shrink-0">
                  <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-5 h-5 text-emerald-600" />
                    Exportar / Importar Fechamento de Jornada
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Selecione o formato para exportação, importe seus dados ou baixe o modelo padrão com as tags (#) necessárias para a importação de lotes.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 py-4 shrink-0">
                  {/* Opção 1: Relatório PDF */}
                  <button
                    onClick={() => {
                      exportFechamentoToPDF();
                      setIsFechamentoExportSelectorOpen(false);
                    }}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-red-500 hover:bg-red-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">Relatório PDF</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Gera PDF de remunerações e apontamentos</span>
                  </button>

                  {/* Opção 2: Planilha Excel */}
                  <button
                    onClick={() => {
                      exportFechamentoToExcel();
                      setIsFechamentoExportSelectorOpen(false);
                    }}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform mb-3">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">Planilha Excel</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Exporta a base de apontamentos em Excel</span>
                  </button>

                  {/* Opção 3: Baixar Modelo de Importação */}
                  <button
                    onClick={async () => {
                      try {
                        const ExcelJS = (await import("exceljs")).default;
                        const workbook = new ExcelJS.Workbook();
                        const worksheet = workbook.addWorksheet("Modelo Fechamento");
                        
                        worksheet.addRow([
                          "#Nome", "#CPF", "#Matricula", "#Dias_Trabalhados", "#Faltas", 
                          "#Atestados", "#Ferias", "#Afastamentos", 
                          "#Hora_Extra_50", "#Hora_Extra_100", "#Adicional_Noturno", "#Observacoes"
                        ]);
                        
                        const buffer = await workbook.xlsx.writeBuffer();
                        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                        saveAs(blob, "Modelo_Importacao_Fechamento.xlsx");
                      } catch (e) {
                        console.error("Erro ao gerar modelo: ", e);
                        alert("Erro ao gerar o modelo de fechamento.");
                      }
                    }}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform mb-3">
                      <Download className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">Baixar Modelo</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Planilha padrão para importações de lote</span>
                  </button>

                  {/* Opção 4: Atualização em Lote */}
                  <button
                    onClick={async () => {
                      try {
                        const ExcelJS = (await import("exceljs")).default;
                        const workbook = new ExcelJS.Workbook();
                        const worksheet = workbook.addWorksheet("Atualizacao Fechamento");
                        
                        worksheet.addRow([
                          "#Nome", "#CPF", "#Matricula", "#Dias_Trabalhados", "#Faltas", 
                          "#Atestados", "#Ferias", "#Afastamentos", 
                          "#Hora_Extra_50", "#Hora_Extra_100", "#Adicional_Noturno", "#Observacoes"
                        ]);
                        
                        sortedFechamentoEmployees.forEach(emp => {
                          const val = closingRecordsMap[emp.id] || {
                            workedDays: 22, absences: 0, medicalCertificates: 0, 
                            vacationDays: 0, leaveDays: 0, overtime50: 0, overtime100: 0, 
                            nightShift: 0, notes: ""
                          };
                          worksheet.addRow([
                            emp.name || "", 
                            emp.cpf || "", 
                            emp.registrationNumber || "", 
                            val.workedDays, 
                            val.absences, 
                            val.medicalCertificates, 
                            val.vacationDays, 
                            val.leaveDays, 
                            val.overtime50, 
                            val.overtime100, 
                            val.nightShift, 
                            val.notes || ""
                          ]);
                        });

                        const buffer = await workbook.xlsx.writeBuffer();
                        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                        saveAs(blob, `Atualizacao_Fechamento_${selectedMonth}.xlsx`);
                        setIsFechamentoExportSelectorOpen(false);
                      } catch (e) {
                        console.error("Erro ao gerar atualizacao: ", e);
                        alert("Erro ao gerar a planilha de atualização.");
                      }
                    }}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-purple-600 hover:bg-purple-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-110 transition-transform mb-3">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">Atualizar em Lote</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Baixa a planilha preenchida para atualizar e reimportar</span>
                  </button>

                  {/* Opção 5: Importar Dados */}
                  <div className="relative flex flex-col items-center justify-center border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50/20 p-5 rounded-2xl transition group text-center cursor-pointer overflow-hidden">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className={cn(
                        "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10",
                        isFechamentoImporting && "pointer-events-none"
                      )}
                      onChange={(e) => {
                        handleImportFechamento(e);
                        setIsFechamentoExportSelectorOpen(false);
                      }}
                      disabled={isFechamentoImporting}
                    />
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform mb-3">
                      {isFechamentoImporting ? (
                         <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                         <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {isFechamentoImporting ? "Importando..." : "Importar Dados"}
                    </span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Atualize o fechamento com sua planilha</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600 border border-slate-100">
                  <p className="font-bold text-slate-800">Dica sobre a Importação e Tags do Fechamento:</p>
                  <p>A importação por tags mapeia automaticamente as colunas da sua planilha para atualizar os registros de fechamento de jornada no mês de referência selecionado. As seguintes tags podem ser incluídas no cabeçalho:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-700 text-[11px]">Identificação (Pelo menos um):</p>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-blue-700 bg-white p-2 rounded-lg border border-slate-200">
                        <div><span className="font-bold text-slate-600">#nome</span> - Nome completo do colaborador</div>
                        <div><span className="font-bold text-slate-600">#cpf</span> - CPF do colaborador (para correspondência exata)</div>
                      </div>
                      <p className="font-bold text-slate-700 text-[11px] mt-2">Apontamentos de Dias:</p>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-indigo-700 bg-white p-2 rounded-lg border border-slate-200">
                        <div><span className="font-bold text-slate-600">#dias_trabalhados</span> - Dias efetivos de trabalho</div>
                        <div><span className="font-bold text-slate-600">#faltas</span> - Quantidade de faltas no mês</div>
                        <div><span className="font-bold text-slate-600">#atestados</span> - Dias abonados por atestado médico</div>
                        <div><span className="font-bold text-slate-600">#ferias</span> - Dias de férias usufruídos</div>
                        <div><span className="font-bold text-slate-600">#afastamentos</span> - Dias de afastamento</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold text-slate-700 text-[11px]">Horas Extras e Adicionais:</p>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-emerald-700 bg-white p-2 rounded-lg border border-slate-200">
                        <div><span className="font-bold text-slate-600">#hora_extra_50</span> - Horas extras com adicional de 50%</div>
                        <div><span className="font-bold text-slate-600">#hora_extra_100</span> - Horas extras com adicional de 100%</div>
                        <div><span className="font-bold text-slate-600">#adicional_noturno</span> - Quantidade de horas noturnas trabalhadas</div>
                      </div>
                      <p className="font-bold text-slate-700 text-[11px] mt-2">Observações:</p>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-amber-700 bg-white p-2 rounded-lg border border-slate-200">
                        <div><span className="font-bold text-slate-600">#observacoes</span> - Campo de observações textuais para o fechamento</div>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsFechamentoExportSelectorOpen(false)}
                  >
                    Fechar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <RHDocuments
            employees={filteredEmployees}
            currentUser={currentUser}
            selectedContractId={selectedContractId}
          />
        </TabsContent>

        <TabsContent value="alojamentos">
          <div className="space-y-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-none shadow-sm bg-orange-50/20">
                <CardHeader className="pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Total de Alojamentos</span>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-gray-900">{alojamentos.length}</span>
                    <Home className="w-8 h-8 text-orange-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-orange-50/20">
                <CardHeader className="pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Vagas Totais</span>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-gray-900 font-mono">
                      {alojamentos.reduce((acc, al) => acc + (al.maxCapacity || 0), 0)}
                    </span>
                    <Building2 className="w-8 h-8 text-orange-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-orange-50/20">
                <CardHeader className="pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Colaboradores Alojados</span>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-gray-900 font-mono">
                      {employees.filter(e => e.alojamentoId && e.status === "active" && alojamentos.some(al => al.id === e.alojamentoId)).length}
                    </span>
                    <Users className="w-8 h-8 text-orange-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-orange-50/20">
                <CardHeader className="pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Leitos Livres</span>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-gray-900 font-mono">
                      {Math.max(0, alojamentos.reduce((acc, al) => acc + (al.maxCapacity || 0), 0) - employees.filter(e => e.alojamentoId && e.status === "active" && alojamentos.some(al => al.id === e.alojamentoId)).length)}
                    </span>
                    <Clock className="w-8 h-8 text-orange-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* List and Actions Header */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6">
                <div>
                  <CardTitle>Gestão de Alojamentos</CardTitle>
                  <CardDescription>
                    Cadastre alojamentos, defina limites de vagas e controle a alocação de trabalhadores.
                  </CardDescription>
                </div>
                <div className="flex w-full sm:w-auto items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar alojamento..."
                      value={searchAlTerm}
                      onChange={(e) => setSearchAlTerm(e.target.value)}
                      className="pl-9 w-full sm:w-64 text-xs"
                    />
                  </div>
                  <Button
                    onClick={() => setShowAddAlojamento(true)}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl gap-2 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Novo Alojamento
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/70">
                      <TableRow>
                        <TableHead className="font-bold text-gray-700">Alojamento</TableHead>
                        <TableHead className="font-bold text-gray-700">Endereço</TableHead>
                        <TableHead className="font-bold text-gray-700">Cidade</TableHead>
                        <TableHead className="font-bold text-gray-700 text-center">Nº de Quartos</TableHead>
                        <TableHead className="font-bold text-gray-700 text-center">Capacidade Máxima</TableHead>
                        <TableHead className="font-bold text-gray-700 text-center">Ocupação Atual</TableHead>
                        <TableHead className="font-bold text-gray-700 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alojamentos
                        .filter(al => {
                          const term = searchAlTerm.toLowerCase().trim();
                          if (!term) return true;
                          return al.name.toLowerCase().includes(term) || al.city.toLowerCase().includes(term);
                        })
                        .map(al => {
                          const occupants = employees.filter(e => e.alojamentoId === al.id && e.status === "active");
                          const percent = al.maxCapacity > 0 ? (occupants.length / al.maxCapacity) * 100 : 0;
                          
                          return (
                            <TableRow key={al.id} className="hover:bg-gray-50/40">
                              <TableCell className="font-bold text-gray-900">{al.name}</TableCell>
                              <TableCell className="text-gray-500">{al.address}</TableCell>
                              <TableCell className="text-gray-500">{al.city}</TableCell>
                              <TableCell className="text-center font-semibold text-gray-700">{al.roomsCount}</TableCell>
                              <TableCell className="text-center font-semibold text-gray-700">{al.maxCapacity}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                                    percent >= 100 
                                      ? "bg-red-50 text-red-700 border-red-200" 
                                      : percent >= 80 
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  )}>
                                    {occupants.length} / {al.maxCapacity} ({Math.round(percent)}%)
                                  </span>
                                  <div className="w-20 bg-gray-100 h-1 rounded-full overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full transition-all duration-300",
                                        percent >= 100 
                                          ? "bg-red-500" 
                                          : percent >= 80 
                                            ? "bg-amber-500" 
                                            : "bg-emerald-500"
                                      )}
                                      style={{ width: `${Math.min(100, percent)}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-2 pr-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-100 text-xs font-semibold cursor-pointer"
                                    onClick={() => setViewingAlojamentoId(al.id)}
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Moradores ({occupants.length})
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={occupants.length >= al.maxCapacity}
                                    className="h-8 gap-1.5 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-100 text-xs font-semibold cursor-pointer"
                                    onClick={() => setAddingToAlojamentoId(al.id)}
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Alojar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-white hover:bg-red-500 rounded-xl cursor-pointer"
                                    onClick={() => handleDeleteAlojamento(al.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {alojamentos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-40 text-center py-10 text-gray-400">
                            <Home className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            Nenhum alojamento cadastrado. Clique em "Novo Alojamento" para começar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="parameters">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: Jornada */}
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-orange-500/5 pb-4 border-b border-orange-100/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">Jornada de Trabalho</CardTitle>
                      <CardDescription className="text-gray-500 text-xs">Defina o padrão de expediente, intervalos e escala operacional.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Horário de Entrada Padrão</Label>
                    <Input
                      type="time"
                      value={rhParams.workEntryTime}
                      onChange={(e) => setRhParams({ ...rhParams, workEntryTime: e.target.value })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Horário de Saída Padrão</Label>
                    <Input
                      type="time"
                      value={rhParams.workExitTime}
                      onChange={(e) => setRhParams({ ...rhParams, workExitTime: e.target.value })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Início do Almoço</Label>
                    <Input
                      type="time"
                      value={rhParams.lunchStart}
                      onChange={(e) => setRhParams({ ...rhParams, lunchStart: e.target.value })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Fim do Almoço</Label>
                    <Input
                      type="time"
                      value={rhParams.lunchEnd}
                      onChange={(e) => setRhParams({ ...rhParams, lunchEnd: e.target.value })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Carga Horária Diária (Horas)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="1"
                      max="24"
                      value={rhParams.dailyHours}
                      onChange={(e) => setRhParams({ ...rhParams, dailyHours: parseFloat(e.target.value) || 0 })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Carga Horária Semanal (Horas)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="168"
                      value={rhParams.weeklyHours}
                      onChange={(e) => setRhParams({ ...rhParams, weeklyHours: parseInt(e.target.value, 10) || 0 })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2 col-span-1 sm:col-span-2">
                    <Label className="text-gray-700 font-bold text-xs">Escala Operacional</Label>
                    <Select
                      value={rhParams.workSchedule}
                      onValueChange={(val) => setRhParams({ ...rhParams, workSchedule: val })}
                    >
                      <SelectTrigger className="w-full rounded-xl border-gray-100 bg-gray-50/50 text-gray-950 font-medium">
                        <SelectValue placeholder="Selecione a escala" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-900 border-gray-100 rounded-xl">
                        <SelectItem value="5x2" className="font-medium">5x2 - Cinco dias de trabalho, dois de folga (Administrativo / Obras)</SelectItem>
                        <SelectItem value="6x1" className="font-medium">6x1 - Seis dias de trabalho, um de folga (Campo / Operacional)</SelectItem>
                        <SelectItem value="12x36" className="font-medium">12x36 - Doze horas de trabalho por trinta e seis de descanso (Segurança)</SelectItem>
                        <SelectItem value="outra" className="font-medium">Outra escala customizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Dia de Início da Jornada (Ciclo)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={rhParams.periodStartDay ?? 21}
                      onChange={(e) => setRhParams({ ...rhParams, periodStartDay: parseInt(e.target.value, 10) || 1 })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Dia de Fechamento da Jornada (Ciclo)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={rhParams.periodEndDay ?? 20}
                      onChange={(e) => setRhParams({ ...rhParams, periodEndDay: parseInt(e.target.value, 10) || 1 })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Horas Extras */}
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-blue-500/5 pb-4 border-b border-blue-100/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">Horas Extras e Adicionais</CardTitle>
                      <CardDescription className="text-gray-500 text-xs">Configure limites de tolerância e multiplicadores para horas adicionais.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Tolerância para Atraso (Minutos)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={rhParams.delayTolerance}
                      onChange={(e) => setRhParams({ ...rhParams, delayTolerance: parseInt(e.target.value, 10) || 0 })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Tolerância para Hora Extra (Minutos)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={rhParams.extraHoursTolerance}
                      onChange={(e) => setRhParams({ ...rhParams, extraHoursTolerance: parseInt(e.target.value, 10) || 0 })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Percentual Hora Extra Semanal / Dias Úteis (50%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="300"
                        value={rhParams.overtimeRate50}
                        onChange={(e) => setRhParams({ ...rhParams, overtimeRate50: parseInt(e.target.value, 10) || 0 })}
                        className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Percentual Hora Extra Domingos / Feriados (100%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="300"
                        value={rhParams.overtimeRate100}
                        onChange={(e) => setRhParams({ ...rhParams, overtimeRate100: parseInt(e.target.value, 10) || 0 })}
                        className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Início do Horário Noturno</Label>
                    <Input
                      type="time"
                      value={rhParams.nightShiftStart}
                      onChange={(e) => setRhParams({ ...rhParams, nightShiftStart: e.target.value })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-bold text-xs">Previsão Fim do Horário Noturno</Label>
                    <Input
                      type="time"
                      value={rhParams.nightShiftEnd}
                      onChange={(e) => setRhParams({ ...rhParams, nightShiftEnd: e.target.value })}
                      className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium"
                    />
                  </div>
                  <div className="space-y-2 col-span-1 sm:col-span-2">
                    <Label className="text-gray-700 font-bold text-xs">Adicional Noturno (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={rhParams.nightShiftAllowance}
                        onChange={(e) => setRhParams({ ...rhParams, nightShiftAllowance: parseInt(e.target.value, 10) || 0 })}
                        className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Banco de Horas */}
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-emerald-500/5 pb-4 border-b border-emerald-100/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900">Banco de Horas</CardTitle>
                        <CardDescription className="text-gray-500 text-xs">Habilite, controle créditos e compensações de saldo.</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">Ativado</span>
                      <Switch
                        checked={rhParams.timeBankEnabled}
                        onCheckedChange={(checked) => setRhParams({ ...rhParams, timeBankEnabled: checked })}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rhParams.timeBankEnabled ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-bold text-xs">Limite de Horas Positivas (Máximo)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={rhParams.timeBankMaxPositive}
                            onChange={(e) => setRhParams({ ...rhParams, timeBankMaxPositive: parseInt(e.target.value, 10) || 0 })}
                            className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium pr-12"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">Horas</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-bold text-xs">Limite de Horas Negativas (Mínimo)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            max="0"
                            value={rhParams.timeBankMaxNegative}
                            onChange={(e) => setRhParams({ ...rhParams, timeBankMaxNegative: parseInt(e.target.value, 10) || 0 })}
                            className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium pr-12"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">Horas</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-bold text-xs">Validade do Banco de Horas (Meses)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="1"
                            max="24"
                            value={rhParams.timeBankValidityMonths}
                            onChange={(e) => setRhParams({ ...rhParams, timeBankValidityMonths: parseInt(e.target.value, 10) || 0 })}
                            className="rounded-xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-gray-950 font-medium pr-14"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">Meses</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 col-span-1 sm:col-span-2">
                        <div>
                          <p className="text-sm font-bold text-gray-950">Compensação Automática de Horas</p>
                          <p className="text-xs text-gray-500">Compensa atrasos e faltas diretamente com o saldo acumulado antes de gerar descontos.</p>
                        </div>
                        <Switch
                          checked={rhParams.autoCompensate}
                          onCheckedChange={(checked) => setRhParams({ ...rhParams, autoCompensate: checked })}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-1 sm:col-span-2 text-center py-6 text-gray-400">
                      Banco de horas desativado. Horas extras excedentes serão pagas mensalmente na folha de ponto.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Taxes and Extra Costs Card */}
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden animate-fade-in-up">
                <CardHeader className="bg-orange-500/5 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">Impostos e Custos Extras</CardTitle>
                      <CardDescription className="text-xs">
                        Adicione impostos patronais, encargos trabalhistas ou custos extras associados ao salário base.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Form to add a new tax item */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 bg-orange-50/35 rounded-2xl border border-orange-100/50">
                    <div className="sm:col-span-7 space-y-1.5">
                      <Label htmlFor="extra-cost-name" className="text-xs font-bold text-slate-700">Nome do Imposto / Benefício</Label>
                      <Input
                        id="extra-cost-name"
                        placeholder="Ex: FGTS, INSS Patronal, RAT"
                        value={newCostName}
                        onChange={(e) => setNewCostName(e.target.value)}
                        className="bg-white border-slate-200 focus-visible:ring-orange-500 text-sm h-10 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1.5 relative">
                      <Label htmlFor="extra-cost-pct" className="text-xs font-bold text-slate-700">Alíquota / Custo (%)</Label>
                      <div className="relative">
                        <Input
                          id="extra-cost-pct"
                          type="number"
                          step="0.01"
                          placeholder="8.00"
                          value={newCostPercentage}
                          onChange={(e) => setNewCostPercentage(e.target.value)}
                          className="bg-white border-slate-200 focus-visible:ring-orange-500 text-sm h-10 pl-3 pr-8 rounded-xl font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">%</span>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        onClick={() => {
                          if (!newCostName.trim()) {
                            alert("Por favor, digite o nome do imposto ou custo extra.");
                            return;
                          }
                          const pct = parseFloat(newCostPercentage);
                          if (isNaN(pct) || pct < 0) {
                            alert("Por favor, informe uma porcentagem válida igual ou maior que zero.");
                            return;
                          }
                          const list = rhParams.extraCosts || [];
                          const newId = Math.random().toString(36).substring(2, 9);
                          const updated = [
                            ...list,
                            { id: newId, name: newCostName.trim(), percentage: pct }
                          ];
                          setRhParams({ ...rhParams, extraCosts: updated });
                          setNewCostName("");
                          setNewCostPercentage("");
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 w-full rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* List of configuration items */}
                  <div className="space-y-2 border border-dashed border-gray-200 rounded-2xl p-4">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">Encargos Configurados atualmente</span>
                    {(!rhParams.extraCosts || rhParams.extraCosts.length === 0) ? (
                      <p className="text-sm text-gray-400 italic py-4 text-center">Nenhum imposto ou custo extra adicionado.</p>
                    ) : (
                      <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
                        {rhParams.extraCosts.map((item: any) => (
                          <div key={item.id} className="py-2.5 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                            {editingCostId === item.id ? (
                              <div className="flex flex-col sm:flex-row items-center gap-2 w-full animate-fade-in">
                                <Input
                                  value={editingCostName}
                                  onChange={(e) => setEditingCostName(e.target.value)}
                                  className="bg-white border-slate-200 text-sm h-9 rounded-lg flex-1"
                                  placeholder="Nome do encargo"
                                />
                                <div className="relative w-28">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingCostPercentage}
                                    onChange={(e) => setEditingCostPercentage(e.target.value)}
                                    className="bg-white border-slate-200 text-sm h-9 rounded-lg pl-2 pr-6 font-mono"
                                    placeholder="8.00"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">%</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border-emerald-100 cursor-pointer"
                                    onClick={() => {
                                      if (!editingCostName.trim()) {
                                        alert("Por favor, digite o nome do imposto.");
                                        return;
                                      }
                                      const pct = parseFloat(editingCostPercentage);
                                      if (isNaN(pct) || pct < 0) {
                                        alert("Por favor, informe uma porcentagem válida igual ou maior que zero.");
                                        return;
                                      }
                                      const updatedList = rhParams.extraCosts.map((c: any) => {
                                        if (c.id === item.id) {
                                          return { ...c, name: editingCostName.trim(), percentage: pct };
                                        }
                                        return c;
                                      });
                                      setRhParams({ ...rhParams, extraCosts: updatedList });
                                      setEditingCostId(null);
                                    }}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border-red-100 cursor-pointer"
                                    onClick={() => setEditingCostId(null)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                  <span className="font-semibold text-slate-700 text-sm">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                    {item.percentage.toFixed(2)} %
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingCostId(item.id);
                                      setEditingCostName(item.name);
                                      setEditingCostPercentage(item.percentage.toString());
                                    }}
                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const updated = (rhParams.extraCosts || []).filter((c: any) => c.id !== item.id);
                                      setRhParams({ ...rhParams, extraCosts: updated });
                                    }}
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Total Extra Costs Percentage Indicator */}
                  <div className="flex justify-between items-center bg-orange-950 font-bold p-4 rounded-2xl text-white shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-xs text-orange-300 uppercase tracking-widest font-extrabold">Carga de Encargos Total</span>
                      <span className="text-xs font-medium text-orange-200/80 mt-0.5">Soma acumulada de todos os impostos configurados</span>
                    </div>
                    <div className="text-2xl font-black font-mono">
                      +{totalExtraCostsPercentage.toFixed(2)}%
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={async () => {
                    const confirmSave = window.confirm("Deseja realmente salvar estes parâmetros de Recursos Humanos no banco de dados e atualizar em toda a empresa?");
                    if (!confirmSave) return;

                    // First save to national device storage (localStorage)
                    localStorage.setItem("rh_parameters_config", JSON.stringify(rhParams));

                    const configObj = getSupabaseConfig();
                    if (configObj.enabled) {
                      const supabase = createSupabaseClient(configObj.url, configObj.key);
                      if (supabase) {
                        try {
                          const compId = currentUser?.companyId || "default";
                          const { error } = await supabase
                            .from("system_config")
                            .upsert({
                              id: `${compId}_rh_parameters_config`,
                              company_id: compId,
                              config_key: "rh_parameters_config",
                              config_value: rhParams,
                              updated_at: new Date().toISOString(),
                            }, {
                              onConflict: "company_id,config_key"
                            });

                          if (error) {
                            console.error("Supabase parameters error:", error);
                            alert(`⚠️ AVISO: Salvamento efetuado localmente neste navegador, mas ocorreu uma falha ao sincronizar com o banco de dados principal.\nDetalhe do erro: ${error.message}`);
                          } else {
                            alert("✅ SUCESSO! Confirmado: Os Parâmetros de Recursos Humanos foram persistidos com sucesso e estão consolidados no banco de dados.");
                          }
                        } catch (e: any) {
                          console.error("Error saving parameters to database:", e);
                          alert(`⚠️ AVISO: Salvamento salvo localmente, mas não foi possível conectar com o banco de dados.\nErro de conexão: ${e.message}`);
                        }
                      } else {
                        alert("✅ Salvo de forma persistente no storage do navegador! (A conexão com o banco de dados não está totalmente ativa).");
                      }
                    } else {
                      alert("✅ Salvo localmente! Se desejar persistir multi-usuário em nuvem, por favor certifique-se que o Supabase/banco de dados está totalmente configurado.");
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 px-6 rounded-2xl shadow-md transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-5 h-5" />
                  Salvar Parâmetros de Recursos Humanos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm("Deseja realmente restaurar os valores padrão de fábrica?")) {
                      localStorage.removeItem("rh_parameters_config");
                      setRhParams({
                        workEntryTime: "08:00",
                        workExitTime: "17:00",
                        lunchStart: "12:00",
                        lunchEnd: "13:00",
                        dailyHours: 8,
                        weeklyHours: 44,
                        workSchedule: "5x2",
                        delayTolerance: 5,
                        extraHoursTolerance: 10,
                        overtimeRate50: 50,
                        overtimeRate100: 100,
                        nightShiftStart: "22:00",
                        nightShiftEnd: "05:00",
                        nightShiftAllowance: 20,
                        timeBankEnabled: true,
                        timeBankMaxPositive: 40,
                        timeBankMaxNegative: -20,
                        timeBankValidityMonths: 6,
                        autoCompensate: true,
                        periodStartDay: 21,
                        periodEndDay: 20,
                        extraCosts: [
                          { id: "1", name: "FGTS", percentage: 8 },
                          { id: "2", name: "INSS Patronal", percentage: 20 },
                          { id: "3", name: "Férias + 1/3 Proporcional", percentage: 11.11 },
                          { id: "4", name: "13º Salário Proporcional", percentage: 8.33 }
                        ]
                      });
                    }
                  }}
                  className="border-gray-200 text-gray-600 hover:bg-gray-100 rounded-2xl h-12 px-5 font-bold cursor-pointer"
                >
                  Restaurar Padrões
                </Button>
              </div>
            </div>

            {/* Sidebar Visual Summary Indicator */}
            <div className="space-y-6">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-gray-900 text-white animate-fade-in-right">
                <CardHeader className="bg-white/5 pb-4 border-b border-white/10">
                  <span className="text-xs text-orange-400 font-extrabold uppercase tracking-wider">Simulador de Jornada Ativa</span>
                  <CardTitle className="text-lg font-bold text-white">Resumo Visual das Regras</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Visual timeline */}
                  <div className="relative border-l-2 border-orange-500 pl-4 space-y-5 py-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase">
                        <Clock className="w-3.5 h-3.5" />
                        Ref.: {rhParams.workEntryTime}h
                      </div>
                      <p className="text-sm font-bold mt-1 text-white">Entrada Autorizada</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Tolerância de atraso configurada em <span className="font-bold text-orange-300">{rhParams.delayTolerance} min</span> (até {((): string => {
                          const [h, m] = rhParams.workEntryTime.split(":").map(Number);
                          if (isNaN(h) || isNaN(m)) return "";
                          const t = new Date();
                          t.setHours(h, m + rhParams.delayTolerance, 0);
                          return t.toTimeString().slice(0, 5);
                        })()}h sem atraso registrado).
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase">
                        <Clock className="w-3.5 h-3.5" />
                        Intervalo {rhParams.lunchStart}h às {rhParams.lunchEnd}h
                      </div>
                      <p className="text-sm font-bold mt-1 text-white">Repouso e Alimentação</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Intervalo intrajornada padrão para almoço técnico de obras de campo.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase">
                        <Clock className="w-3.5 h-3.5" />
                        Saída às {rhParams.workExitTime}h
                      </div>
                      <p className="text-sm font-bold mt-1 text-white">Final do Expediente</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Tolerância para início de contagem de extras de <span className="font-bold text-orange-300">{rhParams.extraHoursTolerance} min</span> (a partir de {((): string => {
                          const [h, m] = rhParams.workExitTime.split(":").map(Number);
                          if (isNaN(h) || isNaN(m)) return "";
                          const t = new Date();
                          t.setHours(h, m + rhParams.extraHoursTolerance, 0);
                          return t.toTimeString().slice(0, 5);
                        })()}h acumula extra).
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase">
                        <Clock className="w-3.5 h-3.5" />
                        Noturno {rhParams.nightShiftStart}h às {rhParams.nightShiftEnd}h
                      </div>
                      <p className="text-sm font-bold mt-1 text-white">Período Noturno (+{rhParams.nightShiftAllowance}%)</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Horas registradas neste intervalo acumulam adicional noturno legal no contracheque.
                      </p>
                    </div>
                  </div>

                  {/* Summary Indicators */}
                  <div className="border-t border-white/10 pt-4 space-y-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Período Mensal:</span>
                      <span className="font-bold text-orange-400">Dia {rhParams.periodStartDay ?? 21} ao Dia {rhParams.periodEndDay ?? 20}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Bco. Horas Ativado:</span>
                      <span className={cn("font-bold text-xs uppercase px-2.5 py-0.5 rounded-full", rhParams.timeBankEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-100 border border-red-500/30")}>
                        {rhParams.timeBankEnabled ? "Sim" : "Não"}
                      </span>
                    </div>
                    {rhParams.timeBankEnabled && (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-medium">Limite Positivo:</span>
                          <span className="font-black text-gray-200">+{rhParams.timeBankMaxPositive} Horas</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-medium">Limite Negativo:</span>
                          <span className="font-black text-red-400">{rhParams.timeBankMaxNegative} Horas</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-medium">Validade do Saldo:</span>
                          <span className="font-bold text-orange-400">{rhParams.timeBankValidityMonths} meses</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-medium">Altas (50% / 100%):</span>
                          <span className="font-black text-blue-400">+{rhParams.overtimeRate50}% / +{rhParams.overtimeRate100}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Info banner */}
              <div className="bg-orange-50/30 border border-orange-100 rounded-2xl p-5">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Acordo Ortodoxo de Obras</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Sempre revise as legislações vigentes e convenções coletivas de trabalho do respectivo estado/local de atuação antes de alterar as tolerâncias regulamentares para evitar disputas trabalhistas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Modal: Novo Alojamento */}
        <Dialog open={showAddAlojamento} onOpenChange={setShowAddAlojamento}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl p-6 bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-orange-500" />
                Cadastrar Novo Alojamento
              </DialogTitle>
              <DialogDescription>
                Informe as características do novo alojamento da obra.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAlojamento} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="al_name" className="text-xs font-bold text-gray-600 uppercase">Nome do Alojamento *</Label>
                <Input
                  id="al_name"
                  value={alF_name}
                  onChange={(e) => setAlF_name(e.target.value)}
                  placeholder="Ex: Alojamento Jardim América"
                  className="rounded-xl border-gray-200 focus:border-orange-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="al_address" className="text-xs font-bold text-gray-600 uppercase">Endereço *</Label>
                <Input
                  id="al_address"
                  value={alF_address}
                  onChange={(e) => setAlF_address(e.target.value)}
                  placeholder="Ex: Rua das Flores, 123"
                  className="rounded-xl border-gray-200 focus:border-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="al_city" className="text-xs font-bold text-gray-600 uppercase">Cidade *</Label>
                  <Input
                    id="al_city"
                    value={alF_city}
                    onChange={(e) => setAlF_city(e.target.value)}
                    placeholder="Cidade"
                    className="rounded-xl border-gray-200 focus:border-orange-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="al_rooms" className="text-xs font-bold text-gray-600 uppercase">Nº de Quartos</Label>
                  <Input
                    id="al_rooms"
                    type="number"
                    min="1"
                    value={alF_rooms}
                    onChange={(e) => setAlF_rooms(e.target.value)}
                    className="rounded-xl border-gray-200 focus:border-orange-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="al_maxCap" className="text-xs font-bold text-gray-600 uppercase">Capacidade Máxima</Label>
                  <Input
                    id="al_maxCap"
                    type="number"
                    min="1"
                    value={alF_maxCap}
                    onChange={(e) => setAlF_maxCap(e.target.value)}
                    className="rounded-xl border-gray-200 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddAlojamento(false)}
                  className="rounded-2xl shrink-0"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl cursor-pointer shadow"
                >
                  Confirmar Cadastro
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Ver Moradores */}
        <Dialog open={!!viewingAlojamentoId} onOpenChange={(open) => !open && setViewingAlojamentoId(null)}>
          <DialogContent className="sm:max-w-[600px] rounded-3xl p-6 bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Moradores - {alojamentos.find(al => al.id === viewingAlojamentoId)?.name}
              </DialogTitle>
              <DialogDescription>
                Lista de colaboradores hospedados neste alojamento.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 max-h-[300px] overflow-y-auto border border-gray-100 rounded-2xl">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-xs py-2 text-gray-600">Nome</TableHead>
                    <TableHead className="font-bold text-xs py-2 text-gray-600">Cargo</TableHead>
                    <TableHead className="font-bold text-xs py-2 text-gray-600 text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.filter(e => e.alojamentoId === viewingAlojamentoId && e.status === "active").length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-400 text-xs">
                        Nenhum colaborador alojado aqui.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees
                      .filter(e => e.alojamentoId === viewingAlojamentoId && e.status === "active")
                      .map(e => (
                        <TableRow key={e.id} className="hover:bg-gray-50/30">
                          <TableCell className="font-semibold text-xs py-2.5 text-gray-950">{e.name}</TableCell>
                          <TableCell className="text-xs py-2.5 text-gray-500">{e.role}</TableCell>
                          <TableCell className="text-right py-2.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-xl text-red-600 border-red-100 hover:bg-red-50 text-xs cursor-pointer"
                              onClick={() => {
                                handleAssignEmployee(e.id, undefined);
                                alert(`Colaborador ${e.name} removido do alojamento.`)
                              }}
                            >
                              Remover
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button
                type="button"
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-xs font-bold w-full sm:w-auto cursor-pointer"
                onClick={() => setViewingAlojamentoId(null)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Alojar Colaborador */}
        <Dialog open={!!addingToAlojamentoId} onOpenChange={(open) => !open && setAddingToAlojamentoId(null)}>
          <DialogContent className="sm:max-w-[600px] rounded-3xl p-6 bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Alojar Colaboradores - {alojamentos.find(al => al.id === addingToAlojamentoId)?.name}
              </DialogTitle>
              <DialogDescription>
                Selecione os colaboradores para adicionar ao alojamento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar por nome ou cargo..."
                  value={searchAlTerm}
                  onChange={(e) => setSearchAlTerm(e.target.value)}
                  className="pl-9 w-full rounded-2xl text-xs"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-2xl">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-xs py-2 text-gray-600">Nome</TableHead>
                      <TableHead className="font-bold text-xs py-2 text-gray-600">Cargo</TableHead>
                      <TableHead className="font-bold text-xs py-2 text-gray-600 text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees
                      .filter(e => e.status === "active" && (!e.alojamentoId || !alojamentos.some(al => al.id === e.alojamentoId)))
                      .filter(e => {
                        const term = searchAlTerm.toLowerCase().trim();
                        if (!term) return true;
                        return e.name.toLowerCase().includes(term) || e.role.toLowerCase().includes(term);
                      }).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-gray-400 text-xs">
                          Nenhum colaborador livre para alojar encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees
                        .filter(e => e.status === "active" && (!e.alojamentoId || !alojamentos.some(al => al.id === e.alojamentoId)))
                        .filter(e => {
                          const term = searchAlTerm.toLowerCase().trim();
                          if (!term) return true;
                          return e.name.toLowerCase().includes(term) || e.role.toLowerCase().includes(term);
                        })
                        .map(e => (
                          <TableRow key={e.id} className="hover:bg-gray-50/30">
                            <TableCell className="font-semibold text-xs py-2.5 text-gray-950">{e.name}</TableCell>
                            <TableCell className="text-xs py-2.5 text-gray-500">{e.role}</TableCell>
                            <TableCell className="text-right py-2.5">
                              <Button
                                size="sm"
                                className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                onClick={() => {
                                  // Assign and verify capacity in UI warning
                                  const alObj = alojamentos.find(al => al.id === addingToAlojamentoId);
                                  const currentOcc = employees.filter(emp => emp.alojamentoId === addingToAlojamentoId && emp.status === "active").length;
                                  if (alObj && currentOcc >= alObj.maxCapacity) {
                                    alert("Alojamento atingiu a capacidade máxima!");
                                    return;
                                  }
                                  handleAssignEmployee(e.id, addingToAlojamentoId!);
                                  alert(`Hóspede ${e.name} alojado com sucesso!`);
                                }}
                              >
                                Alojar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-xs font-bold w-full sm:w-auto cursor-pointer"
                onClick={() => setAddingToAlojamentoId(null)}
              >
                Voltar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col h-[800px] max-h-[85vh] mt-6 relative z-50">
                    <div className="bg-blue-600 p-6 text-white shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            {editingEmployeeId ? (
                              <Users className="w-6 h-6" />
                            ) : (
                              <UserPlus className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white">
                              {editingEmployeeId
                                ? `Editando Colaborador: ${newEmployee.name}`
                                : "Ficha de Admissão Digital"}
                            </h2>
                            <p className="text-blue-100 text-base">
                              {editingEmployeeId
                                ? "Atualização de registro oficial de colaborador"
                                : "Registro oficial de colaborador - Ambiente Seguro e Criptografado"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-blue-700/50 px-3 py-1.5 rounded-full border border-blue-400/30">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-sm font-bold uppercase tracking-widest">
                            Proteção LGPD Ativa
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20 rounded-full h-8 w-8 p-0 flex items-center justify-center cursor-pointer"
                          onClick={() => {
                            setIsDialogOpen(false);
                            resetForm();
                          }}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/50">
                      <div className="px-8 pt-6 pb-2">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 mb-4">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <p className="text-sm text-amber-800">
                            <strong>Aviso de Privacidade:</strong> Os dados
                            inseridos nesta ficha são confidenciais e protegidos
                            por leis de proteção de dados. Apenas pessoal
                            autorizado do RH tem acesso a estas informações.
                          </p>
                        </div>
                      </div>

                      <Tabs
                        defaultValue="personal"
                        className="flex-1 flex flex-col min-h-0 px-8 pb-8"
                      >
                        <TabsList className="flex w-full overflow-x-auto h-14 p-1 mb-8 gap-1 bg-gray-200/50 rounded-xl no-scrollbar shrink-0">
                          <TabsTrigger
                            value="personal"
                            className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4"
                          >
                            <UserIcon className="w-4 h-4" /> Dados Pessoais
                          </TabsTrigger>
                          <TabsTrigger
                            value="documents"
                            className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4"
                          >
                            <CreditCard className="w-4 h-4" /> Documentação
                          </TabsTrigger>
                          <TabsTrigger
                            value="contact"
                            className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4"
                          >
                            <Smartphone className="w-4 h-4" /> Endereço &
                            Contato
                          </TabsTrigger>
                          <TabsTrigger
                            value="family"
                            className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4"
                          >
                            <Heart className="w-4 h-4" /> Grupo Familiar
                          </TabsTrigger>
                          <TabsTrigger
                            value="professional"
                            className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4"
                          >
                            <Briefcase className="w-4 h-4" /> Contrato &
                            Benefícios
                          </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin-visible">
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 min-h-[400px] max-w-6xl mx-auto">
                            <TabsContent
                              value="personal"
                              className="mt-0 space-y-8 animate-in fade-in duration-300"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <UserIcon className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">
                                  Identificação Pessoal
                                </h3>
                              </div>

                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Nome Completo <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      value={newEmployee.name || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          name: e.target.value,
                                        })
                                      }
                                      placeholder="Nome conforme certidão"
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      CPF (Apenas Números) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      value={newEmployee.cpf || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          cpf: applyCPFMask(e.target.value),
                                        })
                                      }
                                      placeholder="000.000.000-00"
                                      className="h-11 font-mono shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Matrícula <span className="text-xs text-slate-400 font-normal lowercase">(campo único)</span>
                                    </Label>
                                    <Input
                                      value={newEmployee.registrationNumber || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          registrationNumber: e.target.value,
                                        })
                                      }
                                      placeholder="Código ou Nº Matrícula"
                                      className="h-11 shadow-sm font-mono"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 space-y-6">
                                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                  <Calendar className="w-3 h-3" /> Nascimento &
                                  Origem
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Data de Nascimento
                                    </Label>
                                    <Input
                                      type="date"
                                      value={newEmployee.birthDate || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          birthDate: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Naturalidade (Cidade)
                                    </Label>
                                    <Input
                                      value={newEmployee.birthPlace || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          birthPlace: e.target.value,
                                        })
                                      }
                                      placeholder="Ex: São Paulo"
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      UF
                                    </Label>
                                    <Input
                                      value={newEmployee.birthState || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          birthState: e.target.value,
                                        })
                                      }
                                      placeholder="UF"
                                      maxLength={2}
                                      className="h-11 uppercase shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent
                              value="documents"
                              className="mt-0 space-y-8 animate-in fade-in duration-300"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">
                                  Documentação Civil
                                </h3>
                              </div>

                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                  <div className="space-y-2 md:col-span-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      RG Nº
                                    </Label>
                                    <Input
                                      value={newEmployee.rgNumber || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          rgNumber: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-3 md:col-span-2">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">
                                        Data de Emissão
                                      </Label>
                                      <Input
                                        type="date"
                                        value={newEmployee.rgAgency || ""}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            rgAgency: e.target.value,
                                          })
                                        }
                                        className="h-11 shadow-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">
                                        Orgão Emissor
                                      </Label>
                                      <Input
                                        value={newEmployee.rgIssuer || ""}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            rgIssuer: e.target.value,
                                          })
                                        }
                                        placeholder="Ex: SSP/SP"
                                        className="h-11 shadow-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">
                                        UF
                                      </Label>
                                      <Input
                                        value={newEmployee.rgState || ""}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            rgState: e.target.value,
                                          })
                                        }
                                        maxLength={2}
                                        className="h-11 uppercase shadow-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 space-y-6">
                                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                  <FileText className="w-3 h-3" /> Dados do
                                  Trabalho (CTPS/PIS)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Carteira de Trabalho (CTPS)
                                    </Label>
                                    <Input
                                      value={
                                        newEmployee.workBookletNumber || ""
                                      }
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          workBookletNumber: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Série
                                    </Label>
                                    <Input
                                      value={
                                        newEmployee.workBookletSeries || ""
                                      }
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          workBookletSeries: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      PIS
                                    </Label>
                                    <Input
                                      value={newEmployee.pis || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          pis: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-purple-50/30 p-6 rounded-2xl border border-purple-100/50 space-y-6">
                                <h4 className="text-sm font-bold text-purple-900 uppercase tracking-widest flex items-center gap-2">
                                  <Users className="w-3 h-3" /> Título de
                                  Eleitor & Exercício Civil
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Título de Eleitor
                                    </Label>
                                    <Input
                                      value={newEmployee.voterIdNumber || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          voterIdNumber: e.target.value,
                                        })
                                      }
                                      className="h-11 font-mono shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Zona
                                    </Label>
                                    <Input
                                      value={newEmployee.voterZone || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          voterZone: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Seção
                                    </Label>
                                    <Input
                                      value={newEmployee.voterSection || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          voterSection: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent
                              value="contact"
                              className="mt-0 space-y-8 animate-in fade-in duration-300"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Smartphone className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">
                                  Endereço & Canais de Contato
                                </h3>
                              </div>

                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                  <Mail className="w-3 h-3" /> Contato Direto
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Telefone Residencial
                                    </Label>
                                    <Input
                                      value={newEmployee.phone || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          phone: applyPhoneMask(e.target.value),
                                        })
                                      }
                                      placeholder="(00) 0000-0000"
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Celular / WhatsApp
                                    </Label>
                                    <Input
                                      value={newEmployee.mobile || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          mobile: applyPhoneMask(
                                            e.target.value,
                                          ),
                                        })
                                      }
                                      placeholder="(00) 90000-0000"
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      E-mail Pessoal
                                    </Label>
                                    <Input
                                      value={newEmployee.email || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          email: e.target.value,
                                        })
                                      }
                                      placeholder="exemplo@gmail.com"
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 space-y-6">
                                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                  <MapPin className="w-3 h-3" /> Localização
                                  Residencial
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2 md:col-span-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Rua / Logradouro
                                    </Label>
                                    <Input
                                      value={
                                        newEmployee.addressLogradouro || ""
                                      }
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          addressLogradouro: e.target.value,
                                        })
                                      }
                                      placeholder="Rua, Avenida, Logradouro..."
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">
                                        Número
                                      </Label>
                                      <Input
                                        value={newEmployee.addressNumber || ""}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            addressNumber: e.target.value,
                                          })
                                        }
                                        className="h-11 shadow-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">
                                        CEP
                                      </Label>
                                      <Input
                                        value={newEmployee.addressZipCode || ""}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            addressZipCode: applyCEPMask(
                                              e.target.value,
                                            ),
                                          })
                                        }
                                        placeholder="00000-000"
                                        className="h-11 shadow-sm font-mono"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Complemento
                                    </Label>
                                    <Input
                                      value={
                                        newEmployee.addressComplement || ""
                                      }
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          addressComplement: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Bairro
                                    </Label>
                                    <Input
                                      value={
                                        newEmployee.addressNeighborhood || ""
                                      }
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          addressNeighborhood: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-2 col-span-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">
                                        Cidade
                                      </Label>
                                      <Input
                                        value={newEmployee.addressCity || ""}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            addressCity: e.target.value,
                                          })
                                        }
                                        className="h-11 shadow-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">
                                        UF
                                      </Label>
                                      <Input
                                        value={newEmployee.addressState || ""}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            addressState: e.target.value,
                                          })
                                        }
                                        maxLength={2}
                                        className="h-11 uppercase shadow-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent
                              value="family"
                              className="mt-0 space-y-8 animate-in fade-in duration-300"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Heart className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">
                                  Núcleo Familiar & Filiação
                                </h3>
                              </div>

                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                  <Users className="w-3 h-3" /> Genitores &
                                  Cônjuge
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Nome do Pai
                                    </Label>
                                    <Input
                                      value={newEmployee.fatherName || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          fatherName: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Nome da Mãe
                                    </Label>
                                    <Input
                                      value={newEmployee.motherName || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          motherName: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">
                                      Nome do Cônjuge (Se casado/união estável)
                                    </Label>
                                    <Input
                                      value={newEmployee.spouseName || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          spouseName: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Baby className="w-5 h-5 text-blue-500" />
                                    <h4 className="text-base font-bold text-gray-700 uppercase tracking-wide">
                                      Dependentes e Filhos
                                    </h4>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addDependent}
                                    className="h-9 px-4 text-sm gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 bg-white"
                                  >
                                    <Plus className="w-4 h-4" /> Compor Novo
                                    Dependente
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(newEmployee.dependents || []).map(
                                    (dep, idx) => (
                                      <div
                                        key={idx}
                                        className="flex gap-3 items-end border border-gray-200 p-4 rounded-xl bg-white shadow-sm animate-in zoom-in-95 duration-200"
                                      >
                                        <div className="flex-1 space-y-2">
                                          <Label className="text-sm uppercase font-bold text-gray-400">
                                            Nome Completo do Filho(a)
                                          </Label>
                                          <Input
                                            value={dep.name || ""}
                                            onChange={(e) =>
                                              updateDependent(
                                                idx,
                                                "name",
                                                e.target.value,
                                              )
                                            }
                                            className="h-10 text-base"
                                          />
                                        </div>
                                        <div className="w-32 space-y-2">
                                          <Label className="text-sm uppercase font-bold text-gray-400">
                                            CPF
                                          </Label>
                                          <Input
                                            value={dep.cpf || ""}
                                            onChange={(e) =>
                                              updateDependent(
                                                idx,
                                                "cpf",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="000.000.000-00"
                                            className="h-10 text-base"
                                          />
                                        </div>
                                        <div className="w-40 space-y-2">
                                          <Label className="text-sm uppercase font-bold text-gray-400">
                                            Data Nasc.
                                          </Label>
                                          <Input
                                            type="date"
                                            value={dep.birthDate || ""}
                                            onChange={(e) =>
                                              updateDependent(
                                                idx,
                                                "birthDate",
                                                e.target.value,
                                              )
                                            }
                                            className="h-10 text-base"
                                          />
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeDependent(idx)}
                                          className="h-10 w-10 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ),
                                  )}
                                  {(newEmployee.dependents || []).length ===
                                    0 && (
                                    <div className="md:col-span-2 py-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/20">
                                      <Baby className="w-8 h-8 text-gray-200 mb-2" />
                                      <p className="text-base text-gray-400 font-medium">
                                        Nenhum filho ou dependente cadastrado.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent
                              value="professional"
                              className="mt-0 space-y-8 animate-in fade-in duration-300"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">
                                  Contrato de Trabalho & Benefícios
                                </h3>
                              </div>

                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                  <div className="space-y-2 lg:col-span-2 relative">
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                      Função / Cargo Pretendido <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      value={newEmployee.role || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          role: e.target.value,
                                        })
                                      }
                                      onFocus={() => setIsRoleFocused(true)}
                                      onBlur={() => {
                                        setTimeout(() => {
                                          setIsRoleFocused(false);
                                        }, 250);
                                      }}
                                      placeholder="Ex: Operador de Máquinas"
                                      autoComplete="off"
                                      className="h-11 shadow-sm focus:ring-blue-500 bg-white"
                                    />
                                    {isRoleFocused && (() => {
                                      const term = (newEmployee.role || '').toLowerCase().trim();
                                      const suggestions = term.length === 0 ? existingRoles : existingRoles.filter(r => r.toLowerCase().includes(term));
                                      
                                      if (suggestions.length === 0) return null;

                                      return (
                                        <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-gray-50 text-left">
                                          {suggestions.map((suggestion, sIdx) => (
                                            <button
                                              key={sIdx}
                                              type="button"
                                              onMouseDown={() => {
                                                setNewEmployee({
                                                  ...newEmployee,
                                                  role: suggestion
                                                });
                                                setIsRoleFocused(false);
                                              }}
                                              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex justify-between items-center"
                                            >
                                              <span className="text-xs font-bold text-slate-800">{suggestion}</span>
                                            </button>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                      Data de Admissão <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      type="date"
                                      value={newEmployee.admissionDate || ""}
                                      onChange={(e) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          admissionDate: e.target.value,
                                        })
                                      }
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm font-bold text-gray-500 uppercase tracking-tighter">
                                        Remuneração Base (R$)
                                      </Label>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setShowSalary(!showSalary)
                                        }
                                        className="h-5 text-xs text-blue-600 gap-1 hover:bg-blue-50 px-1"
                                      >
                                        {showSalary ? (
                                          <EyeOff className="w-3 h-3" />
                                        ) : (
                                          <Eye className="w-3 h-3" />
                                        )}
                                        {showSalary ? "Ocultar" : "Exibir"}
                                      </Button>
                                    </div>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                                        R$
                                      </span>
                                      <Input
                                        type={
                                          showSalary ? "number" : "password"
                                        }
                                        value={newEmployee.salary || 0}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            salary:
                                              parseFloat(e.target.value) || 0,
                                          })
                                        }
                                        placeholder="0.00"
                                        className="h-11 pl-9 shadow-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/50">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                      Modalidade de Contratação
                                    </Label>
                                    <Select
                                      value={newEmployee.paymentType}
                                      onValueChange={(v: any) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          paymentType: v,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-11 bg-white shadow-sm border-slate-200">
                                        <SelectValue placeholder="Selecione a modalidade" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="hour">
                                          Contrato por Hora (Horista)
                                        </SelectItem>
                                        <SelectItem value="day">
                                          Contrato por Dia (Diarista)
                                        </SelectItem>
                                        <SelectItem value="month">
                                          Contrato Mensal (Mensalista)
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                      Contrato Vinculado <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                      value={newEmployee.contractId || ""}
                                      onValueChange={(v: any) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          contractId: v,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-full h-11 bg-white shadow-sm border-blue-100 focus:ring-blue-500 rounded-xl font-medium text-blue-900 ring-offset-blue-50">
                                        <SelectValue placeholder="Selecione o contrato">
                                          {newEmployee.contractId
                                            ? (() => {
                                                const c = contracts.find(
                                                  (x) =>
                                                    x.id ===
                                                    newEmployee.contractId,
                                                );
                                                if (!c)
                                                  return "Contrato não encontrado";
                                                return `${c.workName || c.client || "Sem nome"} (${c.contractNumber || "S/N"})`;
                                              })()
                                            : "Selecione o contrato"}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent className="max-h-80 rounded-xl border-blue-100">
                                        {contracts.map((c) => {
                                          const label = `${c.workName || "Obra sem nome"} - ${c.client || "Cliente não definido"} (${c.contractNumber || "S/N"})`;
                                          return (
                                            <SelectItem
                                              key={c.id}
                                              value={c.id}
                                              textValue={label}
                                            >
                                              <div className="flex flex-col py-1">
                                                <span className="font-bold text-blue-900">
                                                  {c.workName ||
                                                    "Obra sem nome"}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                  {c.client ||
                                                    "Cliente não definido"}{" "}
                                                  • {c.contractNumber || "S/N"}
                                                </span>
                                              </div>
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                      Equipe Vinculada
                                    </Label>
                                    <Select
                                      value={newEmployee.team || "none"}
                                      onValueChange={(val) =>
                                        setNewEmployee({
                                          ...newEmployee,
                                          team:
                                            val === "none" ? undefined : val,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-full h-11 bg-white shadow-sm border-slate-200 rounded-xl font-medium text-gray-900 focus:ring-blue-500">
                                        <SelectValue placeholder="Sem equipe" />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-80 rounded-xl border-slate-200 bg-white">
                                        <SelectItem value="none">
                                          Sem equipe
                                        </SelectItem>
                                        {(controllerTeams || [])
                                          .filter(
                                            (t) =>
                                              !newEmployee.contractId ||
                                              t.contractId ===
                                                newEmployee.contractId,
                                          )
                                          .map((t) => (
                                            <SelectItem
                                              key={t.id}
                                              value={t.name}
                                            >
                                              {t.name}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
                                      <MapPin className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-base font-bold text-blue-900 uppercase">
                                        Vale-Transporte & Mobilidade
                                      </h4>
                                      <p className="text-sm text-blue-700 font-medium">
                                        Desconto legal de 6% ou custeio integral
                                        da empresa
                                      </p>
                                    </div>
                                  </div>
                                  <Switch
                                    id="commuter"
                                    checked={!!newEmployee.commuterBenefits}
                                    onCheckedChange={(checked) =>
                                      setNewEmployee({
                                        ...newEmployee,
                                        commuterBenefits: !!checked,
                                      })
                                    }
                                  />
                                </div>

                                {newEmployee.commuterBenefits && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-3 bg-white p-5 rounded-xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                      <Label className="text-sm font-bold uppercase text-gray-400 tracking-widest">
                                        Trajeto 01 (Principal)
                                      </Label>
                                      <Input
                                        placeholder="Cidade de Origem"
                                        className="h-10 text-base border-gray-100 focus:border-blue-400"
                                        value={newEmployee.commuterCity1 || ""}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            commuterCity1: e.target.value,
                                          })
                                        }
                                      />
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                                          R$
                                        </span>
                                        <Input
                                          type="number"
                                          placeholder="Tarifa Unitária R$"
                                          className="h-10 text-base pl-9 border-gray-100 focus:border-blue-400"
                                          value={newEmployee.commuterValue1}
                                          onChange={(e) =>
                                            setNewEmployee({
                                              ...newEmployee,
                                              commuterValue1:
                                                parseFloat(e.target.value) || 0,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-3 bg-white p-5 rounded-xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                      <Label className="text-sm font-bold uppercase text-gray-400 tracking-widest">
                                        Trajeto 02 (Integração/Extra)
                                      </Label>
                                      <Input
                                        placeholder="Cidade de Conexão ou 2º Trecho"
                                        className="h-10 text-base border-gray-100 focus:border-blue-400"
                                        value={newEmployee.commuterCity2 || ""}
                                        onChange={(e) =>
                                          setNewEmployee({
                                            ...newEmployee,
                                            commuterCity2: e.target.value,
                                          })
                                        }
                                      />
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                                          R$
                                        </span>
                                        <Input
                                          type="number"
                                          placeholder="Tarifa Unitária R$"
                                          className="h-10 text-base pl-9 border-gray-100 focus:border-blue-400"
                                          value={newEmployee.commuterValue2}
                                          onChange={(e) =>
                                            setNewEmployee({
                                              ...newEmployee,
                                              commuterValue2:
                                                parseFloat(e.target.value) || 0,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          </div>
                        </div>
                      </Tabs>
                    </div>

                    <div className="p-8 bg-white border-t shrink-0 flex flex-col items-center">
                      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 shadow-inner">
                          <Checkbox
                            id="privacy-accept"
                            className="mt-1"
                            checked={privacyAccepted}
                            onCheckedChange={(c) => setPrivacyAccepted(!!c)}
                          />
                          <div className="space-y-1">
                            <Label
                              htmlFor="privacy-accept"
                              className="text-sm leading-tight text-gray-600 cursor-pointer font-medium italic"
                            >
                              Eu declaro que as informações acima são
                              verdadeiras e que estou ciente das
                              responsabilidades legais sobre o manuseio de dados
                              pessoais (LGPD). Confirmo que este registro é
                              necessário para fins contratuais e
                              administrativos.
                            </Label>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-end gap-3 text-gray-400 mb-1">
                            <Lock className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                              Criptografia AES-256 Ativa
                              <Separator
                                orientation="vertical"
                                className="h-3 mx-2"
                              />
                              Operador: {currentUser.name}
                            </span>
                          </div>
                          <div className="flex gap-3 relative">
                            {isSavingEmployee && saveEmployeeProgress && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl">
                                <div className="w-full px-4 text-center">
                                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2 truncate">
                                    {saveEmployeeProgress.step}
                                  </p>
                                  <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-600 transition-all duration-300 ease-out" 
                                      style={{ width: `${saveEmployeeProgress.progress}%` }} 
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                            <Button
                                variant="outline"
                                disabled={isSavingEmployee}
                                className="flex-1 h-12 font-bold uppercase tracking-wider text-sm border-gray-200 hover:bg-gray-50"
                                onClick={() => {
                                  setIsDialogOpen(false);
                                  resetForm();
                                }}
                              >
                                Cancelar
                              </Button>
                            <Button
                              onClick={handleAddEmployee}
                              disabled={!privacyAccepted || isSavingEmployee}
                              className={`flex-[2] h-12 font-bold uppercase tracking-wider text-sm shadow-lg transition-all ${
                                privacyAccepted
                                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                                  : "bg-gray-200 text-gray-500 cursor-not-allowed opacity-70"
                              }`}
                            >
                              {isSavingEmployee ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Salvando...
                                </span>
                              ) : (
                                <>
                                  <ShieldAlert className="w-4 h-4 mr-2" />{" "}
                                  {editingEmployeeId
                                    ? "Salvar Alterações"
                                    : "Efetivar Registro Seguro"}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
        </div>
      )}
    </div>
  );
}