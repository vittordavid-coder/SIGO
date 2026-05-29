import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn, applyCPFMask, applyPhoneMask, applyCEPMask } from '../lib/utils';
import { 
  Users, 
  Calendar, 
  FileText, 
  Download, 
  Search, 
  Building2, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
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
  ArrowRight,
  Upload,
  Printer
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Employee, TimeRecord, User, Dependent, ControllerManpower, ManpowerMonthlyData, Contract } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getSupabaseConfig, createSupabaseClient } from '../lib/supabaseClient';

import { v4 as generateUUID } from 'uuid';

const EMPLOYEE_DB_COLUMNS = [
  'id', 'company_id', 'name', 'role', 'status', 'admission_date', 'dismissal_date', 'salary', 'payment_type',
  'cpf', 'rg_number', 'rg_agency', 'rg_issuer', 'rg_state', 'birth_date', 'birth_place',
  'birth_state', 'work_booklet_number', 'work_booklet_series', 'pis', 'phone', 'mobile',
  'email', 'voter_id_number', 'voter_zone', 'voter_section', 'father_name', 'mother_name',
  'spouse_name', 'dependents', 'address_logradouro', 'address_number', 'address_complement',
  'address_neighborhood', 'address_city', 'address_zip_code', 'address_state', 'contract_id',
  'commuter_benefits', 'commuter_value1', 'commuter_city1', 'commuter_value2', 'commuter_city2',
  'team', 'charges_percentage', 'overtime_percentage',
  'created_at', 'updated_at'
];

const mapToSnake = (obj: any) => {
  if (!obj) return obj;
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
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
  DialogTrigger 
} from "@/components/ui/dialog";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { RHDocuments } from './RHDocuments';

interface RHViewProps {
  currentUser: User;
  employees: Employee[];
  timeRecords: TimeRecord[];
  contracts: Contract[];
  selectedContractId: string | null;
  onUpdateContractId: (id: string) => void;
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateRecords: (records: TimeRecord[]) => void;
  initialTab?: string;
  controllerTeams?: ControllerTeam[];
}

export default function RHView({ 
  currentUser, 
  employees, 
  timeRecords, 
  contracts, 
  selectedContractId,
  onUpdateContractId,
  onUpdateEmployees, 
  onUpdateRecords,
  initialTab,
  controllerTeams = []
}: RHViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab || 'employees');
  const [searchTerm, setSearchTerm] = useState('');

  // Sync activeTab if initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showCPF, setShowCPF] = useState<Record<string, boolean>>({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'cpf' | 'role' | 'admissionDate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isPrintColumnsModalOpen, setIsPrintColumnsModalOpen] = useState(false);
  const [printColumns, setPrintColumns] = useState({
    name: true,
    cpf: true,
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
    setShowCPF(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return '';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return cpf;
    return `***.${clean.substring(3, 6)}.***-**`;
  };

  const formatDateForDisplay = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    // Handle YYYY-MM-DD reliably without timezone shifts
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    // Safe parse with noon to avoid UTC shifts
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  const exportEmployeeToPDF = (e: Employee) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const title = `FICHA DE ADMISSÃO - ${e.name.toUpperCase()}`;
    
    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SYNERA - GESTÃO DE RECURSOS HUMANOS', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema Integrado de Gestão Operacional', 105, 22, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 105, 32, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    const tableData = [
      ['NOME COMPLETO', e.name || '-'],
      ['CPF / PIS', `${e.cpf || '-'} / ${e.pis || '-'}`],
      ['DATA NASCIMENTO', formatDateForDisplay(e.birthDate)],
      ['NATURALIDADE', `${e.birthPlace || '-'} - ${e.birthState || '-'}`],
      ['RG / EMISSÃO / ÓRGÃO / UF', `${e.rgNumber || '-'} / ${formatDateForDisplay(e.rgAgency)} / ${e.rgIssuer || '-'} / ${e.rgState || '-'}`],
      ['CTPS / SÉRIE', `${e.workBookletNumber || '-'} / ${e.workBookletSeries || '-'}`],
      ['TÍTULO ELEITOR', `${e.voterIdNumber || '-'} (Zona: ${e.voterZone || '-'} - Seç: ${e.voterSection || '-'})`],
      ['CARGO / FUNÇÃO', e.role || '-'],
      ['DATA ADMISSÃO', formatDateForDisplay(e.admissionDate)],
      ['SALÁRIO BASE', `R$ ${e.salary?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`],
      ['TIPO CONTRATO', e.paymentType === 'month' ? 'Mensalista' : e.paymentType === 'hour' ? 'Horista' : 'Diarista'],
      ['FILIAÇÃO', `PAI: ${e.fatherName || '-'} | MÃE: ${e.motherName || '-'}`],
      ['CÔNJUGE', e.spouseName || 'NÃO INFORMADO'],
      ['ENDEREÇO', `${e.addressLogradouro || '-'}, ${e.addressNumber || '-'} - ${e.addressComplement || '-'}`],
      ['BAIRRO / CIDADE / UF', `${e.addressNeighborhood || '-'} - ${e.addressCity || '-'}/${e.addressState || '-'}`],
      ['CEP / CONTATO', `${e.addressZipCode || '-'} | ${e.mobile || '-'} / ${e.phone || '-'}`],
      ['VALE TRANSPORTE', e.commuterBenefits ? `SIM (R$ ${e.commuterValue1 + e.commuterValue2})` : 'NÃO']
    ];

    autoTable(doc, {
      startY: 45,
      head: [['CATEGORIA', 'DETALHES']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 60 } }
    });

    if (e.dependents && e.dependents.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('DEPENDENTES / FILHOS', 14, (doc as any).lastAutoTable.finalY + 10);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['NOME COMPLETO DO DEPENDENTE', 'CPF', 'DATA DE NASCIMENTO']],
        body: e.dependents.map(d => [
          d.name, 
          d.cpf || '-',
          formatDateForDisplay(d.birthDate)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105] },
        styles: { fontSize: 8 }
      });
    }

    const finalY = (doc as any).lastAutoTable.finalY;
    const footerY = finalY + 35 > 270 ? 270 : finalY + 35;

    doc.line(20, footerY, 90, footerY);
    doc.line(120, footerY, 190, footerY);
    doc.setFontSize(8);
    doc.text('ASSINATURA DO COLABORADOR', 55, footerY + 5, { align: 'center' });
    doc.text('ASSINATURA DO RESPONSÁVEL RH', 155, footerY + 5, { align: 'center' });

    doc.save(`Ficha_Admissao_${e.name.replace(/\s+/g, '_')}.pdf`);
  };

  const exportEmployeeToExcel = (e: Employee) => {
    const mainData = [
      ['SYNERA - GESTÃO DE RECURSOS HUMANOS'],
      ['FICHA DE ADMISSÃO DIGITAL'],
      ['Gerado em:', new Date().toLocaleString('pt-BR')],
      [''],
      ['Identificação Pessoal', ''],
      ['Nome Completo', e.name],
      ['CPF', e.cpf],
      ['Data de Nascimento', formatDateForDisplay(e.birthDate)],
      ['Naturalidade', e.birthPlace],
      ['UF Naturalidade', e.birthState],
      ['Nome do Pai', e.fatherName],
      ['Nome da Mãe', e.motherName],
      ['Nome do Cônjuge', e.spouseName || 'NÃO POSSUI'],
      [''],
      ['Documentação', ''],
      ['RG', e.rgNumber],
      ['Data de Emissão', formatDateForDisplay(e.rgAgency)],
      ['Orgão Emissor', e.rgIssuer],
      ['RG UF', e.rgState],
      ['CTPS Nº', e.workBookletNumber],
      ['CTPS Série', e.workBookletSeries],
      ['PIS', e.pis],
      ['Título Eleitor', e.voterIdNumber],
      ['Título Zona', e.voterZone],
      ['Título Seção', e.voterSection],
      [''],
      ['Endereço e Contato', ''],
      ['Rua/Logradouro', e.addressLogradouro],
      ['Número', e.addressNumber],
      ['Complemento', e.addressComplement],
      ['Bairro', e.addressNeighborhood],
      ['Cidade', e.addressCity],
      ['UF Estado', e.addressState],
      ['CEP', e.addressZipCode],
      ['E-mail', e.email],
      ['Celular/WhatsApp', e.mobile],
      ['Telefone Fixo', e.phone],
      [''],
      ['Dados Contratuais', ''],
      ['Cargo/Função', e.role],
      ['Data Admissão', formatDateForDisplay(e.admissionDate)],
      ['Status', e.status === 'active' ? 'Ativo' : 'Desativado'],
      ['Data Demissão', formatDateForDisplay(e.dismissalDate)],
      ['Salário Base', e.salary],
      ['Tipo de Recebimento', e.paymentType === 'month' ? 'Mensalista' : e.paymentType === 'hour' ? 'Horista' : 'Diarista'],
      ['Vale Transporte', e.commuterBenefits ? 'SIM' : 'NÃO'],
      ['Tarifa Trajeto 1', e.commuterValue1],
      ['Tarifa Trajeto 2', e.commuterValue2]
    ];

    if (e.dependents && e.dependents.length > 0) {
      mainData.push(['']);
      mainData.push(['DEPENDENTES']);
      e.dependents.forEach((d, i) => {
        mainData.push([
          `Dependente ${i+1}`, 
          d.name, 
          `CPF: ${d.cpf || ''}`,
          `Nascimento: ${d.birthDate ? new Date(d.birthDate).toLocaleDateString('pt-BR') : ''}`
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(mainData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados do Colaborador");
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), `Ficha_Admissao_${e.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    try {
      const data = [
        ['Contrato', 'Nome Completo', 'CPF', 'Função', 'Tipo de Pagamento', 'Salário Bruto', 'Data de Admissão', 'Nº de Cadastro/Vínculo/RG', 'Órgão Emissor do RG', 'UF do RG', 'Data de Nascimento', 'Local de Nascimento', 'UF de Nascimento', 'Nº da CTPS', 'Série da CTPS', 'PIS', 'Telefone', 'Celular', 'Email', 'Status', 'Data de Demissão', 'Nº Título de Eleitor', 'Zona Eleitoral', 'Seção Eleitoral', 'Nome do Pai', 'Nome da Mãe', 'Nome do Cônjuge', 'Logradouro', 'Número', 'Complemento', 'Bairro', 'Cidade', 'CEP', 'UF', 'VT - Necessita', 'VT - Valor 1', 'VT - Cidade 1', 'VT - Valor 2', 'VT - Cidade 2', 'Encargos Percentual', 'Horas Extras Percentual'],
        ['CTR-123', 'João da Silva', '123.456.789-00', 'Pedreiro', 'Mensalista', 2500, '2023-01-15', '12345678', 'SSP', 'SP', '1990-01-01', 'São Paulo', 'SP', '1234567', '12345', '12345678901', '(11) 98765-4321', '(11) 98765-4321', 'joao@email.com', 'Ativo', '', '123456789012', '123', '456', 'José da Silva', 'Maria da Silva', 'Ana da Silva', 'Rua das Flores', '123', 'Apto 1', 'Centro', 'São Paulo', '01000-000', 'SP', 'Não', 0, '', 0, '', '84.15', '50']
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo_Colaboradores");
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blobData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blobData, `Modelo_Importacao_Colaboradores.xlsx`);
    } catch (error) {
      console.error('Failed to generate template:', error);
      alert('Erro ao gerar modelo de importação.');
    }
  };

  const parseDateFromExcel = (value: any): string | undefined => {
    if (typeof value === 'number') {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    } else if (value) {
      const parts = String(value).split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (String(value).includes('-')) {
        return String(value).split('T')[0];
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
      alert('❌ Erro ao ler o arquivo físico.');
    };

    reader.onload = async (evt) => {
      try {
        console.log('[RH Import] File loaded, starting processing...');
        const buildData = evt.target?.result;
        if (!buildData) throw new Error('Falha ao ler o byte-stream do arquivo.');

        const wb = XLSX.read(buildData, { type: 'array' });
        console.log('[RH Import] Workbook read successful, Sheets:', wb.SheetNames);
        
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: null });
        console.log('[RH Import] jsonData found:', jsonData.length, 'rows');
        
        if (!jsonData || jsonData.length === 0) {
          alert('❌ Arquivo vazio ou formato incompatível. Certifique-se de que a primeira linha contém os cabeçalhos.');
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
              const foundKey = keys.find(k => possibleKeys.includes(String(k).toLowerCase().trim()));
              if (!foundKey) return null;
              const val = row[foundKey];
              return (val === undefined || val === null || String(val).trim() === '') ? null : val;
            };

            const rawName = getVal(['nome', 'nome completo', 'colaborador', 'funcionario', 'funcionário']);
            if (!rawName) {
              console.warn(`[RH Import] Skipping row ${i+1} because Name is empty.`);
              continue;
            }

            const name = String(rawName);
            const cpfRaw = getVal(['cpf', 'documento']);
            const cpf = cpfRaw ? String(cpfRaw).replace(/[^0-9]/g, '') : '';
            const role = String(getVal(['função', 'funcao', 'cargo', 'atividade']) || 'Ajudante');
            
            let paymentTypeStr = String(getVal(['tipo de pagamento', 'tipo pagamento', 'tipo', 'forma_pagamento']) || 'Mensalista').toLowerCase();
            let paymentType: 'hour' | 'day' | 'month' = 'month';
            if (paymentTypeStr.includes('hora') || paymentTypeStr.includes('horista')) paymentType = 'hour';
            if (paymentTypeStr.includes('dia') || paymentTypeStr.includes('diarista')) paymentType = 'day';

            const salaryVal = getVal(['salário', 'salario', 'salário bruto', 'salario bruto', 'valor', 'remuneracao', 'remuneração']);
            let salary = 0;
            if (salaryVal !== null) {
              salary = typeof salaryVal === 'number' ? salaryVal : parseFloat(String(salaryVal).replace(/[^0-9,-]+/g,"").replace(",", "."));
            }
            if (isNaN(salary)) salary = 0;

            const admissionDateRaw = getVal(['data de admissão', 'data admissão', 'data de admissao', 'admissao', 'admissão', 'entrada']);
            const admissionDate = parseDateFromExcel(admissionDateRaw) || new Date().toISOString().split('T')[0];

            const dismissalDateRaw = getVal(['data de demissão', 'data demissão', 'demissao', 'demissão', 'saida', 'saída']);
            const dismissalDate = parseDateFromExcel(dismissalDateRaw) || null;

            const statusRaw = getVal(['status', 'situação', 'situacao', 'estado']);
            let status: 'active' | 'dismissed' = 'active';
            if (statusRaw) {
              const s = String(statusRaw).toLowerCase();
              if (s.includes('demitido') || s.includes('inativo') || s.includes('desligado')) status = 'dismissed';
            }
            if (dismissalDate) status = 'dismissed';

            const rgNumberRaw = getVal(['nº de cadastro/vínculo/rg', 'rg', 'vínculo', 'cadastro', 'numero_rg', 'rg_numero']);
            const rgAgencyRaw = getVal(['órgão emissor do rg', 'orgao emissor', 'orgao_emissor', 'emissor', 'rg_emissor']);
            const pisRaw = getVal(['pis', 'nis', 'pasep']);
            const phoneRaw = getVal(['telefone', 'contato', 'tel']);
            const mobileRaw = getVal(['celular', 'mobile', 'cel']) || phoneRaw;
            const emailRaw = getVal(['email', 'e-mail']);

            // Find matching contract inside the sheet
            const contractVal = getVal(['contrato', 'obra', 'contrato_numero', 'numero_contrato', 'codigo_contrato', 'contrato_id']);
            let matchedContractId = selectedContractId || '';
            if (contractVal) {
              const cleanedVal = String(contractVal).toLowerCase().trim();
              const foundC = contracts.find(c => 
                (c.contractNumber && c.contractNumber.toLowerCase().trim() === cleanedVal) ||
                (c.workName && c.workName.toLowerCase().trim() === cleanedVal) ||
                (c.id && c.id.toLowerCase().trim() === cleanedVal)
              );
              if (foundC) {
                matchedContractId = foundC.id;
              }
            }

            const employee: Employee = {
              id: String(getVal(['id', 'id_colaborador', 'codigo', 'código']) || generateUUID()),
              companyId: currentUser.companyId,
              contractId: matchedContractId,
              name,
              role,
              admissionDate: admissionDate,
              salary,
              paymentType,
              status,
              dismissalDate,
              cpf,
              rgNumber: rgNumberRaw ? String(rgNumberRaw) : '',
              rgAgency: rgAgencyRaw ? String(rgAgencyRaw) : '',
              rgIssuer: rgAgencyRaw ? String(rgAgencyRaw) : '',
              rgState: String(getVal(['uf do rg', 'rg uf', 'estado do rg', 'uf_rg']) || ''),
              birthDate: parseDateFromExcel(getVal(['data de nascimento', 'nascimento', 'data_nascimento'])) || null as any,
              birthPlace: String(getVal(['local de nascimento', 'naturalidade', 'cidade_nascimento']) || String(getVal(['local de nascimento', 'naturalidade']) || '')),
              birthState: String(getVal(['uf de nascimento', 'nascimento uf']) || ''),
              workBookletNumber: String(getVal(['nº da ctps', 'ctps']) || ''),
              workBookletSeries: String(getVal(['série da ctps', 'serie ctps']) || ''),
              pis: pisRaw ? String(pisRaw) : '',
              phone: phoneRaw ? String(phoneRaw) : '',
              mobile: mobileRaw ? String(mobileRaw) : '',
              email: emailRaw ? String(emailRaw) : '',
              voterIdNumber: String(getVal(['nº título de eleitor', 'título de eleitor', 'titulo eleitor']) || ''),
              voterZone: String(getVal(['zona eleitoral', 'zona']) || ''),
              voterSection: String(getVal(['seção eleitoral', 'secao']) || ''),
              fatherName: String(getVal(['nome do pai', 'pai']) || ''),
              motherName: String(getVal(['nome da mãe', 'nome da mae', 'mãe']) || ''),
              spouseName: String(getVal(['nome do cônjuge', 'conjuge', 'esposa', 'esposo']) || ''),
              dependents: [],
              addressLogradouro: String(getVal(['logradouro', 'rua', 'endereço', 'endereco']) || ''),
              addressNumber: String(getVal(['número', 'numero', 'nº']) || ''),
              addressComplement: String(getVal(['complemento']) || ''),
              addressNeighborhood: String(getVal(['bairro']) || ''),
              addressCity: String(getVal(['cidade', 'município']) || ''),
              addressZipCode: String(getVal(['cep', 'código postal']) || ''),
              addressState: String(getVal(['uf', 'estado']) || ''),
              commuterBenefits: String(getVal(['vt - necessita', 'vt', 'vale transporte']) || '').toLowerCase().includes('sim'),
              commuterValue1: parseFloat(String(getVal(['vt - valor 1']) || '0').replace(/[^0-9,-]+/g,"").replace(",", ".")) || 0,
              commuterCity1: String(getVal(['vt - cidade 1']) || ''),
              commuterValue2: parseFloat(String(getVal(['vt - valor 2']) || '0').replace(/[^0-9,-]+/g,"").replace(",", ".")) || 0,
              commuterCity2: String(getVal(['vt - cidade 2']) || ''),
              chargesPercentage: parseFloat(String(getVal(['encargos percentual', 'encargos_percentual', 'charges_percentage', 'encargos']) || '0').replace(/[^0-9,-]+/g,"").replace(",", ".")) || 0,
              overtimePercentage: parseFloat(String(getVal(['horas extras percentual', 'he_percentual', 'overtime_percentage', 'he']) || '0').replace(/[^0-9,-]+/g,"").replace(",", ".")) || 0,
            };
            importedEmployees.push(employee);
          } catch (rowErr) {
            console.error(`[RH Import] Critical error mapping row ${i+1}:`, rowErr);
          }
        }

        console.log(`[RH Import] Successfully mapped ${importedEmployees.length} of ${jsonData.length} employees.`);

        if (importedEmployees.length === 0) {
          alert('⚠️ Nenhum colaborador válido encontrado no arquivo. Verifique se as colunas "Nome" ou "Nome Completo" estão preenchidas.');
          setIsImporting(false);
          return;
        }

        if (window.confirm(`✅ ${importedEmployees.length} colaboradores encontrados. Deseja importá-los para o contrato atual?`)) {
          onUpdateEmployees([...employees, ...importedEmployees]);

          let supabaseSuccess = false;
          const config = getSupabaseConfig();
          if (config.enabled) {
            const supabase = createSupabaseClient(config.url, config.key);
            if (supabase) {
              const snakeData = importedEmployees.map(mapToSnake);
              try {
                const { error } = await supabase.from('employees').upsert(snakeData);
                if (error) {
                   console.error('[Supabase] Failed to sync imported employees:', error);
                   alert(`❌ Erro ao salvar no banco de dados Supabase: ${error.message || JSON.stringify(error)}`);
                } else {
                   console.log('[Supabase] Imported employees saved securely.');
                   supabaseSuccess = true;
                }
              } catch (e: any) {
                console.error('[Supabase] Exception syncing imported employees:', e);
                alert(`❌ Exceção ao salvar no banco: ${e.message || String(e)}`);
              }
            }
          }

          if (supabaseSuccess) {
            alert(`🚀 ${importedEmployees.length} colaboradores importados e sincronizados com sucesso!`);
          } else if (config.enabled) {
            alert(`⚠️ ${importedEmployees.length} colaboradores importados LOCALMENTE, mas houve erro na sincronização com a nuvem.`);
          } else {
            alert(`✅ ${importedEmployees.length} colaboradores importados no modo offline com sucesso!`);
          }
        }

      } catch (err) {
        console.error('Import error:', err);
        alert('❌ Erro inesperado ao processar o arquivo. Verifique se o arquivo não está corrompido.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
    if (event.target) {
      event.target.value = '';
    }
  };

  const exportAllEmployeesToExcel = () => {
    const wsData: any[][] = [
      ['RELATÓRIO GERAL DE COLABORADORES'],
      [`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`],
      [],
      ['Nome', 'CPF', 'Cargo', 'Data Admissão', 'Remuneração', 'Tipo Contrato']
    ];

    filteredEmployees.forEach(e => {
      wsData.push([
        e.name,
        e.cpf,
        e.role,
        e.admissionDate ? new Date(e.admissionDate).toLocaleDateString('pt-BR') : '',
        e.salary,
        e.paymentType === 'month' ? 'Mensalista' : e.paymentType === 'hour' ? 'Horista' : 'Diarista'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), `Relatorio_Colaboradores_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportAllEmployeesToPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // blue-800
    doc.text("SYNERA - Gestão e Planejamento", 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Lista Geral de Colaboradores - Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 21);
    
    const tableHeaders = [['Nome', 'CPF', 'Cargo', 'Data Admissão', 'Remuneração', 'Status']];
    
    const tableRows = filteredEmployees.map(e => [
      e.name || '-',
      e.cpf || '-',
      e.role || '-',
      e.admissionDate ? new Date(e.admissionDate).toLocaleDateString('pt-BR') : '-',
      e.salary ? e.salary.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00',
      e.status === 'active' ? 'Ativo' : 'Desligado'
    ]);

    autoTable(doc, {
      startY: 25,
      head: tableHeaders,
      body: tableRows,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' }
    });

    doc.save(`Relatorio_Colaboradores_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrintCollaborators = () => {
    const selectedFields = Object.entries(printColumns)
      .filter(([_, enabled]) => enabled)
      .map(([field, _]) => field);

    const getHeaderLabel = (field: string) => {
      switch(field) {
        case 'name': return 'Nome';
        case 'cpf': return 'CPF';
        case 'role': return 'Cargo';
        case 'status': return 'Status';
        case 'admissionDate': return 'Admissão';
        case 'salary': return 'Salário';
        case 'mobile': return 'Contato';
        case 'email': return 'E-mail';
        case 'team': return 'Equipe';
        case 'pis': return 'PIS';
        default: return field;
      }
    };

    const getFieldValue = (emp: Employee, field: string) => {
      const val = (emp as any)[field];
      if (field === 'status') {
        return val === 'active' ? 'Ativo' : 'Desligado';
      }
      if (field === 'admissionDate') {
        return val ? new Date(val).toLocaleDateString('pt-BR') : '-';
      }
      if (field === 'salary') {
        return val ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
      }
      return val || '-';
    };

    const headersHtml = selectedFields.map(f => `<th style="text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #1e293b;">${getHeaderLabel(f)}</th>`).join('');

    const rowsHtml = filteredEmployees.map(emp => {
      const cells = selectedFields.map(f => {
        return `<td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155;">${getFieldValue(emp, f)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    if (!iframe.contentWindow) return;

    const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(n => n.outerHTML).join('\n');

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lista_Colaboradores_SYNERA</title>
          ${styles}
          <style>
            @page { margin: 12mm; size: landscape; }
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              background: white; 
              margin: 0;
              padding: 0;
            }
            .header-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .main-table {
              width: 100%;
              border-collapse: collapse;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div>
              <h1 style="font-size: 18px; font-weight: bold; color: #1e3a8a; margin: 0; text-transform: uppercase;">SYNERA - Gestão e Planejamento</h1>
              <h2 style="font-size: 13px; font-weight: bold; color: #475569; margin: 4px 0 0 0;">RELATÓRIO: LISTA DE COLABORADORES</h2>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              Total: <strong>\${filteredEmployees.length} colaboradores</strong><br>
              Gerado em: \${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>

          <table class="main-table">
            <thead>
              <tr>
                \${headersHtml}
              </tr>
            </thead>
            <tbody>
              \${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    iframe.contentWindow.document.close();
    setIsPrintColumnsModalOpen(false);
  };
  
  const filteredEmployees = useMemo(() => {
    let result = employees.filter(e => 
      (currentUser.role === 'master' || e.companyId === currentUser.companyId) &&
      (e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.cpf.includes(searchTerm)) &&
      (!selectedContractId || e.contractId === selectedContractId)
    );

    return result.sort((a, b) => {
      // Primary Sort: status (active first)
      const statusA = a.status || 'active';
      const statusB = b.status || 'active';
      if (statusA === 'active' && statusB === 'dismissed') return -1;
      if (statusA === 'dismissed' && statusB === 'active') return 1;

      let comparison = 0;
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortField === 'cpf') comparison = (a.cpf || '').localeCompare(b.cpf || '');
      else if (sortField === 'role') comparison = (a.role || '').localeCompare(b.role || '');
      else if (sortField === 'admissionDate') comparison = (a.admissionDate || '').localeCompare(b.admissionDate || '');
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [employees, currentUser, searchTerm, sortField, sortOrder, selectedContractId]);

  // Reset selected employee if contract filter makes them unavailable
  useEffect(() => {
    if (selectedEmployeeId) {
      const isAvailable = filteredEmployees.some(e => e.id === selectedEmployeeId);
      if (!isAvailable) {
        setSelectedEmployeeId(null);
      }
    }
  }, [selectedContractId, filteredEmployees, selectedEmployeeId]);

  const handleSort = (field: 'name' | 'cpf' | 'role' | 'admissionDate') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const initialEmployeeValue: Partial<Employee> = {
    name: '',
    cpf: '',
    status: 'active',
    role: '',
    admissionDate: new Date().toISOString().split('T')[0],
    salary: 0,
    paymentType: 'month',
    rgNumber: '',
    rgAgency: '',
    rgIssuer: '',
    rgState: '',
    birthDate: '',
    birthPlace: '',
    birthState: '',
    workBookletNumber: '',
    workBookletSeries: '',
    pis: '',
    phone: '',
    mobile: '',
    email: '',
    voterIdNumber: '',
    voterZone: '',
    voterSection: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    dependents: [],
    addressLogradouro: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressCity: '',
    addressZipCode: '',
    addressState: '',
    contractId: selectedContractId || '',
    commuterBenefits: false,
    commuterValue1: 0,
    commuterCity1: '',
    commuterValue2: 0,
    commuterCity2: ''
  };

  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>(initialEmployeeValue);

  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.cpf) {
      alert('Nome e CPF são campos obrigatórios.');
      return;
    }

    if (editingEmployeeId) {
      // Update existing employee
      const updatedEmployees = employees.map(e => 
        e.id === editingEmployeeId 
          ? { ...newEmployee, id: editingEmployeeId, companyId: e.companyId } as Employee
          : e
      );
      onUpdateEmployees(updatedEmployees);
      setIsDialogOpen(false);
      setEditingEmployeeId(null);
    } else {
      // Create new employee
      const employee: Employee = {
        id: generateUUID(),
        status: 'active',
        companyId: currentUser.companyId,
        name: newEmployee.name!,
        cpf: newEmployee.cpf!,
        role: newEmployee.role || 'Colaborador',
        admissionDate: newEmployee.admissionDate!,
        salary: newEmployee.salary || 0,
        paymentType: newEmployee.paymentType as any || 'month',
        rgNumber: newEmployee.rgNumber || '',
        rgAgency: newEmployee.rgAgency || '',
        rgIssuer: newEmployee.rgIssuer || '',
        rgState: newEmployee.rgState || '',
        birthDate: newEmployee.birthDate || '',
        birthPlace: newEmployee.birthPlace || '',
        birthState: newEmployee.birthState || '',
        workBookletNumber: newEmployee.workBookletNumber || '',
        workBookletSeries: newEmployee.workBookletSeries || '',
        pis: newEmployee.pis || '',
        phone: newEmployee.phone || '',
        mobile: newEmployee.mobile || '',
        email: newEmployee.email || '',
        voterIdNumber: newEmployee.voterIdNumber || '',
        voterZone: newEmployee.voterZone || '',
        voterSection: newEmployee.voterSection || '',
        fatherName: newEmployee.fatherName || '',
        motherName: newEmployee.motherName || '',
        spouseName: newEmployee.spouseName || '',
        dependents: newEmployee.dependents || [],
        addressLogradouro: newEmployee.addressLogradouro || '',
        addressNumber: newEmployee.addressNumber || '',
        addressComplement: newEmployee.addressComplement || '',
        addressNeighborhood: newEmployee.addressNeighborhood || '',
        addressCity: newEmployee.addressCity || '',
        addressZipCode: newEmployee.addressZipCode || '',
        addressState: newEmployee.addressState || '',
        contractId: newEmployee.contractId,
        commuterBenefits: !!newEmployee.commuterBenefits,
        commuterValue1: newEmployee.commuterValue1,
        commuterCity1: newEmployee.commuterCity1,
        commuterValue2: newEmployee.commuterValue2,
        commuterCity2: newEmployee.commuterCity2,
      };
      onUpdateEmployees([...employees, employee]);
    }
    
    resetForm();
  };

  const handleDismiss = (e: Employee) => {
    const date = window.prompt('Informe a data de demissão (AAAA-MM-DD):', new Date().toISOString().split('T')[0]);
    if (date) {
      const updated = employees.map(emp => 
        emp.id === e.id ? { ...emp, status: 'dismissed' as const, dismissalDate: date } : emp
      );
      onUpdateEmployees(updated);
    }
  };

  const resetForm = () => {
    setNewEmployee(initialEmployeeValue);
    setEditingEmployeeId(null);
  };

  const startEdit = (employee: Employee) => {
    setNewEmployee({ ...initialEmployeeValue, ...employee });
    setEditingEmployeeId(employee.id);
    setIsDialogOpen(true);
  };

  const addDependent = () => {
    setNewEmployee({
      ...newEmployee,
      dependents: [...(newEmployee.dependents || []), { name: '', birthDate: '', cpf: '' }]
    });
  };

  const removeDependent = (index: number) => {
    setNewEmployee({
      ...newEmployee,
      dependents: (newEmployee.dependents || []).filter((_, i) => i !== index)
    });
  };

  const updateDependent = (index: number, field: keyof Dependent, value: string) => {
    const newDeps = [...(newEmployee.dependents || [])];
    newDeps[index] = { ...newDeps[index], [field]: value };
    setNewEmployee({ ...newEmployee, dependents: newDeps });
  };

  const getDaysInMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recursos Humanos</h1>
          <p className="text-gray-500 text-base">Gerencie colaboradores, pontos e documentos.</p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100/50 p-1">
          <TabsTrigger value="employees" className="gap-2">
            <Users className="w-4 h-4" /> Colaboradores
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" /> Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Colaboradores</CardTitle>
                <CardDescription>Lista completa de funcionários da empresa.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Buscar nome ou CPF..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
                  <Download className="w-4 h-4" /> Download Modelo
                </Button>
                <div className="relative">
                  <Input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    className={cn(
                      "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
                      isImporting && "pointer-events-none"
                    )} 
                    onChange={handleImportData} 
                    disabled={isImporting}
                  />
                  <Button variant="outline" className="gap-2 pointer-events-none" disabled={isImporting}>
                    {isImporting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Processando...
                      </div>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Importar RH
                      </>
                    )}
                  </Button>
                </div>

                <Button variant="outline" className="gap-2 text-slate-700 border-slate-200" onClick={() => setIsPrintColumnsModalOpen(true)}>
                  <Printer className="w-4 h-4 text-indigo-505" /> Imprimir Lista
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 text-slate-700 border-slate-200">
                      <Download className="w-4 h-4 text-emerald-505" /> Exportar Lista
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 border border-slate-200 shadow-xl rounded-xl bg-white p-1.5 z-50">
                    <DropdownMenuItem 
                      onClick={exportAllEmployeesToPDF} 
                      className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-2.5"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      Exportar em PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={exportAllEmployeesToExcel} 
                      className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-2.5"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      Exportar em EXCEL
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={isPrintColumnsModalOpen} onOpenChange={setIsPrintColumnsModalOpen}>
                  <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-left">
                    <DialogHeader className="text-left space-y-2">
                      <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-indigo-600" />
                        Configurar Impressão de Colaboradores
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">
                        Selecione as colunas do cadastro que deseja que apareçam no relatório impresso.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 text-left">
                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-name" 
                          checked={printColumns.name} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, name: !!checked })}
                        />
                        <Label htmlFor="col-name" className="text-sm font-semibold text-slate-700 cursor-pointer">Nome</Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-cpf" 
                          checked={printColumns.cpf} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, cpf: !!checked })}
                        />
                        <Label htmlFor="col-cpf" className="text-sm font-semibold text-slate-700 cursor-pointer">CPF</Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-role" 
                          checked={printColumns.role} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, role: !!checked })}
                        />
                        <Label htmlFor="col-role" className="text-sm font-semibold text-slate-700 cursor-pointer">Cargo</Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-status" 
                          checked={printColumns.status} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, status: !!checked })}
                        />
                        <Label htmlFor="col-status" className="text-sm font-semibold text-slate-700 cursor-pointer">Status</Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-admissionDate" 
                          checked={printColumns.admissionDate} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, admissionDate: !!checked })}
                        />
                        <Label htmlFor="col-admissionDate" className="text-sm font-semibold text-slate-700 cursor-pointer">Data Admissão</Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-salary" 
                          checked={printColumns.salary} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, salary: !!checked })}
                        />
                        <Label htmlFor="col-salary" className="text-sm font-semibold text-slate-700 cursor-pointer">Salário / Remuneração</Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-mobile" 
                          checked={printColumns.mobile} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, mobile: !!checked })}
                        />
                        <Label htmlFor="col-mobile" className="text-sm font-semibold text-slate-700 cursor-pointer">Telefone / Celular</Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-email" 
                          checked={printColumns.email} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, email: !!checked })}
                        />
                        <Label htmlFor="col-email" className="text-sm font-semibold text-slate-700 cursor-pointer">E-mail</Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-team" 
                          checked={printColumns.team} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, team: !!checked })}
                        />
                        <Label htmlFor="col-team" className="text-sm font-semibold text-slate-700 cursor-pointer">Equipe / Frente</Label>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Checkbox 
                          id="col-pis" 
                          checked={printColumns.pis} 
                          onCheckedChange={(checked) => setPrintColumns({ ...printColumns, pis: !!checked })}
                        />
                        <Label htmlFor="col-pis" className="text-sm font-semibold text-slate-700 cursor-pointer">PIS / NIT</Label>
                      </div>
                    </div>

                    <DialogFooter className="flex justify-end gap-2 border-t pt-4">
                      <Button variant="outline" onClick={() => setIsPrintColumnsModalOpen(false)}>Cancelar</Button>
                      <Button onClick={handlePrintCollaborators} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir Relatório
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" onClick={() => {
                      resetForm();
                      setIsDialogOpen(true);
                    }}>
                      <UserPlus className="w-4 h-4" /> Novo Colaborador
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] md:max-w-[95vw] h-[95vh] flex flex-col p-0 border border-border shadow-2xl">
                    <div className="bg-blue-600 p-6 text-white shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            {editingEmployeeId ? <Users className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold text-white">
                              {editingEmployeeId ? `Editando Colaborador: ${newEmployee.name}` : 'Ficha de Admissão Digital'}
                            </DialogTitle>
                            <DialogDescription className="text-blue-100 text-base">
                              {editingEmployeeId ? 'Atualização de registro oficial de colaborador' : 'Registro oficial de colaborador - Ambiente Seguro e Criptografado'}
                            </DialogDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-700/50 px-3 py-1.5 rounded-full border border-blue-400/30">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-sm font-bold uppercase tracking-widest">Proteção LGPD Ativa</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/50">
                      <div className="px-8 pt-6 pb-2">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 mb-4">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <p className="text-sm text-amber-800">
                            <strong>Aviso de Privacidade:</strong> Os dados inseridos nesta ficha são confidenciais e protegidos por leis de proteção de dados. Apenas pessoal autorizado do RH tem acesso a estas informações.
                          </p>
                        </div>
                      </div>

                      <Tabs defaultValue="personal" className="flex-1 flex flex-col min-h-0 px-8 pb-8">
                        <TabsList className="flex w-full overflow-x-auto h-14 p-1 mb-8 gap-1 bg-gray-200/50 rounded-xl no-scrollbar shrink-0">
                          <TabsTrigger value="personal" className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4">
                            <UserIcon className="w-4 h-4" /> Dados Pessoais
                          </TabsTrigger>
                          <TabsTrigger value="documents" className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4">
                            <CreditCard className="w-4 h-4" /> Documentação
                          </TabsTrigger>
                          <TabsTrigger value="contact" className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4">
                            <Smartphone className="w-4 h-4" /> Endereço & Contato
                          </TabsTrigger>
                          <TabsTrigger value="family" className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4">
                            <Heart className="w-4 h-4" /> Grupo Familiar
                          </TabsTrigger>
                          <TabsTrigger value="professional" className="flex-1 gap-2 font-bold text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4">
                            <Briefcase className="w-4 h-4" /> Contrato & Benefícios
                          </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin-visible">
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 min-h-[400px] max-w-6xl mx-auto">
                            <TabsContent value="personal" className="mt-0 space-y-8 animate-in fade-in duration-300">
                              <div className="flex items-center gap-2 mb-2">
                                <UserIcon className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">Identificação Pessoal</h3>
                              </div>
                              
                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  <div className="space-y-2 lg:col-span-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Nome Completo</Label>
                                    <Input 
                                      value={newEmployee.name || ''} 
                                      onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} 
                                      placeholder="Nome conforme certidão" 
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">CPF (Apenas Números)</Label>
                                    <Input 
                                      value={newEmployee.cpf || ''} 
                                      onChange={e => setNewEmployee({...newEmployee, cpf: applyCPFMask(e.target.value)})} 
                                      placeholder="000.000.000-00" 
                                      className="h-11 font-mono shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 space-y-6">
                                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                  <Calendar className="w-3 h-3" /> Nascimento & Origem
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Data de Nascimento</Label>
                                    <Input 
                                      type="date" 
                                      value={newEmployee.birthDate || ''} 
                                      onChange={e => setNewEmployee({...newEmployee, birthDate: e.target.value})} 
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Naturalidade (Cidade)</Label>
                                    <Input 
                                      value={newEmployee.birthPlace || ''} 
                                      onChange={e => setNewEmployee({...newEmployee, birthPlace: e.target.value})} 
                                      placeholder="Ex: São Paulo" 
                                      className="h-11 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">UF</Label>
                                    <Input 
                                      value={newEmployee.birthState || ''} 
                                      onChange={e => setNewEmployee({...newEmployee, birthState: e.target.value})} 
                                      placeholder="UF" 
                                      maxLength={2}
                                      className="h-11 uppercase shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="documents" className="mt-0 space-y-8 animate-in fade-in duration-300">
                              <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">Documentação Civil</h3>
                              </div>
                              
                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                  <div className="space-y-2 md:col-span-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">RG Nº</Label>
                                    <Input value={newEmployee.rgNumber || ''} onChange={e => setNewEmployee({...newEmployee, rgNumber: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                  <div className="grid grid-cols-3 gap-3 md:col-span-2">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">Data de Emissão</Label>
                                      <Input type="date" value={newEmployee.rgAgency || ''} onChange={e => setNewEmployee({...newEmployee, rgAgency: e.target.value})} className="h-11 shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">Orgão Emissor</Label>
                                      <Input value={newEmployee.rgIssuer || ''} onChange={e => setNewEmployee({...newEmployee, rgIssuer: e.target.value})} placeholder="Ex: SSP/SP" className="h-11 shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">UF</Label>
                                      <Input value={newEmployee.rgState || ''} onChange={e => setNewEmployee({...newEmployee, rgState: e.target.value})} maxLength={2} className="h-11 uppercase shadow-sm" />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 space-y-6">
                                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                  <FileText className="w-3 h-3" /> Dados do Trabalho (CTPS/PIS)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Carteira de Trabalho (CTPS)</Label>
                                    <Input value={newEmployee.workBookletNumber || ''} onChange={e => setNewEmployee({...newEmployee, workBookletNumber: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Série</Label>
                                    <Input value={newEmployee.workBookletSeries || ''} onChange={e => setNewEmployee({...newEmployee, workBookletSeries: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">PIS</Label>
                                    <Input value={newEmployee.pis || ''} onChange={e => setNewEmployee({...newEmployee, pis: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-purple-50/30 p-6 rounded-2xl border border-purple-100/50 space-y-6">
                                <h4 className="text-sm font-bold text-purple-900 uppercase tracking-widest flex items-center gap-2">
                                  <Users className="w-3 h-3" /> Título de Eleitor & Exercício Civil
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Título de Eleitor</Label>
                                    <Input value={newEmployee.voterIdNumber || ''} onChange={e => setNewEmployee({...newEmployee, voterIdNumber: e.target.value})} className="h-11 font-mono shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Zona</Label>
                                    <Input value={newEmployee.voterZone || ''} onChange={e => setNewEmployee({...newEmployee, voterZone: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Seção</Label>
                                    <Input value={newEmployee.voterSection || ''} onChange={e => setNewEmployee({...newEmployee, voterSection: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="contact" className="mt-0 space-y-8 animate-in fade-in duration-300">
                              <div className="flex items-center gap-2 mb-2">
                                <Smartphone className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">Endereço & Canais de Contato</h3>
                              </div>

                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                  <Mail className="w-3 h-3" /> Contato Direto
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Telefone Residencial</Label>
                                    <Input value={newEmployee.phone || ''} onChange={e => setNewEmployee({...newEmployee, phone: applyPhoneMask(e.target.value)})} placeholder="(00) 0000-0000" className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Celular / WhatsApp</Label>
                                    <Input value={newEmployee.mobile || ''} onChange={e => setNewEmployee({...newEmployee, mobile: applyPhoneMask(e.target.value)})} placeholder="(00) 90000-0000" className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">E-mail Pessoal</Label>
                                    <Input value={newEmployee.email || ''} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} placeholder="exemplo@gmail.com" className="h-11 shadow-sm" />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 space-y-6">
                                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                  <MapPin className="w-3 h-3" /> Localização Residencial
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2 md:col-span-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Rua / Logradouro</Label>
                                    <Input value={newEmployee.addressLogradouro || ''} onChange={e => setNewEmployee({...newEmployee, addressLogradouro: e.target.value})} placeholder="Rua, Avenida, Logradouro..." className="h-11 shadow-sm" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">Número</Label>
                                      <Input value={newEmployee.addressNumber || ''} onChange={e => setNewEmployee({...newEmployee, addressNumber: e.target.value})} className="h-11 shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">CEP</Label>
                                      <Input value={newEmployee.addressZipCode || ''} onChange={e => setNewEmployee({...newEmployee, addressZipCode: applyCEPMask(e.target.value)})} placeholder="00000-000" className="h-11 shadow-sm font-mono" />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Complemento</Label>
                                    <Input value={newEmployee.addressComplement || ''} onChange={e => setNewEmployee({...newEmployee, addressComplement: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Bairro</Label>
                                    <Input value={newEmployee.addressNeighborhood || ''} onChange={e => setNewEmployee({...newEmployee, addressNeighborhood: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-2 col-span-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">Cidade</Label>
                                      <Input value={newEmployee.addressCity || ''} onChange={e => setNewEmployee({...newEmployee, addressCity: e.target.value})} className="h-11 shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-gray-500 uppercase">UF</Label>
                                      <Input value={newEmployee.addressState || ''} onChange={e => setNewEmployee({...newEmployee, addressState: e.target.value})} maxLength={2} className="h-11 uppercase shadow-sm" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="family" className="mt-0 space-y-8 animate-in fade-in duration-300">
                              <div className="flex items-center gap-2 mb-2">
                                <Heart className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">Núcleo Familiar & Filiação</h3>
                              </div>

                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                  <Users className="w-3 h-3" /> Genitores & Cônjuge
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Nome do Pai</Label>
                                    <Input value={newEmployee.fatherName || ''} onChange={e => setNewEmployee({...newEmployee, fatherName: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Nome da Mãe</Label>
                                    <Input value={newEmployee.motherName || ''} onChange={e => setNewEmployee({...newEmployee, motherName: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase">Nome do Cônjuge (Se casado/união estável)</Label>
                                    <Input value={newEmployee.spouseName || ''} onChange={e => setNewEmployee({...newEmployee, spouseName: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Baby className="w-5 h-5 text-blue-500" />
                                    <h4 className="text-base font-bold text-gray-700 uppercase tracking-wide">Dependentes e Filhos</h4>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={addDependent} className="h-9 px-4 text-sm gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 bg-white">
                                    <Plus className="w-4 h-4" /> Compor Novo Dependente
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(newEmployee.dependents || []).map((dep, idx) => (
                                    <div key={idx} className="flex gap-3 items-end border border-gray-200 p-4 rounded-xl bg-white shadow-sm animate-in zoom-in-95 duration-200">
                                      <div className="flex-1 space-y-2">
                                        <Label className="text-sm uppercase font-bold text-gray-400">Nome Completo do Filho(a)</Label>
                                        <Input 
                                          value={dep.name || ''} 
                                          onChange={e => updateDependent(idx, 'name', e.target.value)} 
                                          className="h-10 text-base"
                                        />
                                      </div>
                                      <div className="w-32 space-y-2">
                                        <Label className="text-sm uppercase font-bold text-gray-400">CPF</Label>
                                        <Input 
                                          value={dep.cpf || ''} 
                                          onChange={e => updateDependent(idx, 'cpf', e.target.value)} 
                                          placeholder="000.000.000-00"
                                          className="h-10 text-base"
                                        />
                                      </div>
                                      <div className="w-40 space-y-2">
                                        <Label className="text-sm uppercase font-bold text-gray-400">Data Nasc.</Label>
                                        <Input 
                                          type="date"
                                          value={dep.birthDate || ''} 
                                          onChange={e => updateDependent(idx, 'birthDate', e.target.value)} 
                                          className="h-10 text-base"
                                        />
                                      </div>
                                      <Button variant="ghost" size="icon" onClick={() => removeDependent(idx)} className="h-10 w-10 text-gray-400 hover:text-red-500 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  {(newEmployee.dependents || []).length === 0 && (
                                    <div className="md:col-span-2 py-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/20">
                                      <Baby className="w-8 h-8 text-gray-200 mb-2" />
                                      <p className="text-base text-gray-400 font-medium">Nenhum filho ou dependente cadastrado.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="professional" className="mt-0 space-y-8 animate-in fade-in duration-300">
                              <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">Contrato de Trabalho & Benefícios</h3>
                              </div>

                              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                  <div className="space-y-2 lg:col-span-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Função / Cargo Pretendido</Label>
                                    <Input value={newEmployee.role || ''} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} placeholder="Ex: Operador de Máquinas" className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Data de Admissão</Label>
                                    <Input type="date" value={newEmployee.admissionDate || ''} onChange={e => setNewEmployee({...newEmployee, admissionDate: e.target.value})} className="h-11 shadow-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm font-bold text-gray-500 uppercase tracking-tighter">Remuneração Base (R$)</Label>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setShowSalary(!showSalary)}
                                        className="h-5 text-xs text-blue-600 gap-1 hover:bg-blue-50 px-1"
                                      >
                                        {showSalary ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        {showSalary ? "Ocultar" : "Exibir"}
                                      </Button>
                                    </div>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                                      <Input 
                                        type={showSalary ? "number" : "password"} 
                                        value={newEmployee.salary || 0} 
                                        onChange={e => setNewEmployee({...newEmployee, salary: parseFloat(e.target.value) || 0})} 
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
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Modalidade de Contratação</Label>
                                    <Select value={newEmployee.paymentType} onValueChange={(v: any) => setNewEmployee({...newEmployee, paymentType: v})}>
                                      <SelectTrigger className="h-11 bg-white shadow-sm border-slate-200">
                                        <SelectValue placeholder="Selecione a modalidade" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="hour">Contrato por Hora (Horista)</SelectItem>
                                        <SelectItem value="day">Contrato por Dia (Diarista)</SelectItem>
                                        <SelectItem value="month">Contrato Mensal (Mensalista)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Contrato Vinculado</Label>
                                    <Select value={newEmployee.contractId || ''} onValueChange={(v: any) => setNewEmployee({...newEmployee, contractId: v})}>
                                      <SelectTrigger className="w-full h-11 bg-white shadow-sm border-blue-100 focus:ring-blue-500 rounded-xl font-medium text-blue-900 ring-offset-blue-50">
                                        <SelectValue placeholder="Selecione o contrato">
                                          {newEmployee.contractId ? (
                                            (() => {
                                              const c = contracts.find(x => x.id === newEmployee.contractId);
                                              if (!c) return "Contrato não encontrado";
                                              return `${c.workName || c.client || 'Sem nome'} (${c.contractNumber || 'S/N'})`;
                                            })()
                                          ) : "Selecione o contrato"}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent className="max-h-80 rounded-xl border-blue-100">
                                        {contracts.map(c => {
                                          const label = `${c.workName || 'Obra sem nome'} - ${c.client || 'Cliente não definido'} (${c.contractNumber || 'S/N'})`;
                                          return (
                                            <SelectItem 
                                              key={c.id} 
                                              value={c.id}
                                              textValue={label}
                                            >
                                              <div className="flex flex-col py-1">
                                                <span className="font-bold text-blue-900">{c.workName || 'Obra sem nome'}</span>
                                                <span className="text-sm text-gray-500">{c.client || 'Cliente não definido'} • {c.contractNumber || 'S/N'}</span>
                                              </div>
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Equipe Vinculada</Label>
                                    <Select 
                                      value={newEmployee.team || 'none'} 
                                      onValueChange={val => setNewEmployee({...newEmployee, team: val === 'none' ? undefined : val})}
                                    >
                                      <SelectTrigger className="w-full h-11 bg-white shadow-sm border-slate-200 rounded-xl font-medium text-gray-900 focus:ring-blue-500">
                                        <SelectValue placeholder="Sem equipe" />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-80 rounded-xl border-slate-200 bg-white">
                                        <SelectItem value="none">Sem equipe</SelectItem>
                                        {(controllerTeams || [])
                                          .filter(t => !newEmployee.contractId || t.contractId === newEmployee.contractId)
                                          .map(t => (
                                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                          ))
                                        }
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
                                      <h4 className="text-base font-bold text-blue-900 uppercase">Vale-Transporte & Mobilidade</h4>
                                      <p className="text-sm text-blue-700 font-medium">Desconto legal de 6% ou custeio integral da empresa</p>
                                    </div>
                                  </div>
                                  <Switch 
                                    id="commuter" 
                                    checked={!!newEmployee.commuterBenefits} 
                                    onCheckedChange={(checked) => setNewEmployee({ ...newEmployee, commuterBenefits: !!checked })}
                                  />
                                </div>
                                
                                {newEmployee.commuterBenefits && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-3 bg-white p-5 rounded-xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                      <Label className="text-sm font-bold uppercase text-gray-400 tracking-widest">Trajeto 01 (Principal)</Label>
                                      <Input 
                                        placeholder="Cidade de Origem" 
                                        className="h-10 text-base border-gray-100 focus:border-blue-400"
                                        value={newEmployee.commuterCity1 || ''}
                                        onChange={e => setNewEmployee({ ...newEmployee, commuterCity1: e.target.value })}
                                      />
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                                        <Input 
                                          type="number" 
                                          placeholder="Tarifa Unitária R$" 
                                          className="h-10 text-base pl-9 border-gray-100 focus:border-blue-400"
                                          value={newEmployee.commuterValue1}
                                          onChange={e => setNewEmployee({ ...newEmployee, commuterValue1: parseFloat(e.target.value) || 0 })}
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-3 bg-white p-5 rounded-xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                      <Label className="text-sm font-bold uppercase text-gray-400 tracking-widest">Trajeto 02 (Integração/Extra)</Label>
                                      <Input 
                                        placeholder="Cidade de Conexão ou 2º Trecho" 
                                        className="h-10 text-base border-gray-100 focus:border-blue-400"
                                        value={newEmployee.commuterCity2 || ''}
                                        onChange={e => setNewEmployee({ ...newEmployee, commuterCity2: e.target.value })}
                                      />
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                                        <Input 
                                          type="number" 
                                          placeholder="Tarifa Unitária R$" 
                                          className="h-10 text-base pl-9 border-gray-100 focus:border-blue-400"
                                          value={newEmployee.commuterValue2}
                                          onChange={e => setNewEmployee({ ...newEmployee, commuterValue2: parseFloat(e.target.value) || 0 })}
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
                            <Label htmlFor="privacy-accept" className="text-sm leading-tight text-gray-600 cursor-pointer font-medium italic">
                              Eu declaro que as informações acima são verdadeiras e que estou ciente das responsabilidades legais sobre o manuseio de dados pessoais (LGPD). Confirmo que este registro é necessário para fins contratuais e administrativos.
                            </Label>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-end gap-3 text-gray-400 mb-1">
                            <Lock className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                              Criptografia AES-256 Ativa
                              <Separator orientation="vertical" className="h-3 mx-2" />
                              Operador: {currentUser.name}
                            </span>
                          </div>
                          <div className="flex gap-3">
                            <DialogTrigger asChild>
                              <Button variant="outline" className="flex-1 h-12 font-bold uppercase tracking-wider text-sm border-gray-200 hover:bg-gray-50">Cancelar</Button>
                            </DialogTrigger>
                            <Button 
                              onClick={handleAddEmployee} 
                              disabled={!privacyAccepted}
                              className={`flex-[2] h-12 font-bold uppercase tracking-wider text-sm shadow-lg transition-all ${
                                privacyAccepted 
                                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" 
                                  : "bg-gray-200 text-gray-500 cursor-not-allowed opacity-70"
                              }`}
                            >
                              <ShieldAlert className="w-4 h-4 mr-2" /> {editingEmployeeId ? 'Salvar Alterações' : 'Efetivar Registro Seguro'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead 
                      className="font-bold cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Colaborador
                        {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('cpf')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        CPF
                        {sortField === 'cpf' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Cargo
                        {sortField === 'role' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>

                    <TableHead 
                      className="font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('admissionDate')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Admissão
                        {sortField === 'admissionDate' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-center">Obra / Contrato</TableHead>
                    <TableHead className="font-bold text-center">Equipe</TableHead>
                    <TableHead className="w-[150px] font-bold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-gray-400">
                        Nenhum colaborador encontrado.
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.map(e => (
                    <TableRow 
                      key={e.id} 
                      className={cn(
                        "hover:bg-gray-50/50 cursor-pointer transition-colors",
                        e.status === 'dismissed' && "bg-slate-50/80 opacity-70"
                      )}
                      onDoubleClick={() => startEdit(e)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-full",
                            e.status === 'dismissed' ? "bg-gray-200 text-gray-400" : "bg-blue-100 text-blue-600"
                          )}>
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "font-bold",
                                e.status === 'dismissed' ? "text-gray-500 line-through" : "text-gray-900"
                              )}>{e.name}</p>
                              {e.status === 'dismissed' && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs uppercase h-4 px-1">Desativado</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">{e.companyId === currentUser.companyId ? 'Sua Empresa' : 'Outra Empresa'}</p>
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
                            onClick={(ev) => { ev.stopPropagation(); toggleCPF(e.id); }}
                          >
                            {showCPF[e.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "bg-gray-50",
                          e.status === 'dismissed' && "text-gray-400 border-gray-200"
                        )}>{e.role}</Badge>
                      </TableCell>

                      <TableCell className="text-center text-base text-gray-600">
                        {formatDateForDisplay(e.admissionDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const contract = contracts.find(c => c.id === e.contractId);
                          if (!contract) return <span className="text-gray-400 italic text-sm">Não Alocado</span>;
                          return (
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-bold text-blue-700">{contract.contractNumber}</span>
                              <span className="text-xs text-gray-500 uppercase font-medium max-w-[120px] truncate">
                                {contract.workName || contract.client}
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        {e.team ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-bold uppercase tracking-wide text-[11px] whitespace-nowrap">
                            {e.team}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 italic text-sm">Sem Equipe</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                            onClick={(ev) => { ev.stopPropagation(); startEdit(e); }}
                            title="Editar Colaborador"
                          >
                            <Edit className="w-4 h-4" /> 
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={(ev) => { ev.stopPropagation(); exportEmployeeToPDF(e); }}
                            title="Exportar PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-500 hover:text-green-700 hover:bg-green-50"
                            onClick={(ev) => { ev.stopPropagation(); exportEmployeeToExcel(e); }}
                            title="Exportar Excel"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </Button>
                          {e.status !== 'dismissed' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(ev) => { ev.stopPropagation(); handleDismiss(e); }}
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
                                onUpdateEmployees(employees.filter(item => item.id !== e.id));
                              }
                            }}
                            title="Excluir Colaborador"
                          >
                            <Trash2 className="w-4 h-4" />
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

        <TabsContent value="documents">
          <RHDocuments employees={filteredEmployees} currentUser={currentUser} selectedContractId={selectedContractId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
