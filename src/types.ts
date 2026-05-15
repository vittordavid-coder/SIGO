export type ResourceType = 'labor' | 'material' | 'equipment';

export interface Resource {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  unit: string;
  type: ResourceType;
  basePrice: number;
  encargos?: number;
}

export interface CompositionItem {
  resourceId: string;
  consumption: number;
}

export interface ServiceComposition {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  unit: string;
  production: number;
  fit: number;
  items: CompositionItem[];
}

export interface BudgetGroup {
  id: string;
  name: string;
  services: {
    serviceId: string;
    code?: string;
    name?: string;
    quantity: number;
    price?: number;
    worksheetType?: WorksheetType;
  }[];
}

export interface Quotation {
  id: string;
  companyId?: string;
  budgetName: string;
  organization: string;
  date: string;
  sectorResponsible: string;
  requesterSector: string;
  year: number;
  trecho: string;
  municipios: string;
  rodovias: string;
  version: string;
  extension: string;
  baseDate: string;
  services: {
    serviceId: string;
    quantity: number;
  }[];
  groups?: BudgetGroup[];
}

export type UserRole = 'master' | 'admin' | 'editor' | 'reader' | 'project_admin';

export type AppModule = 'quotations' | 'measurements' | 'rh' | 'control' | 'purchases' | 'project_admin' | 'settings' | 'financeiro' | 'gerencia';

export interface Dependent {
  name: string;
  birthDate: string;
  cpf: string;
}

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  role: string;
  admissionDate: string;
  salary: number;
  paymentType: 'hour' | 'day' | 'month';
  
  // Personal & Documents
  cpf: string;
  rgNumber: string;
  rgAgency: string;
  rgIssuer: string;
  rgState: string;
  birthDate: string;
  birthPlace: string;
  birthState: string;
  workBookletNumber: string;
  workBookletSeries: string;
  pis: string;
  phone: string;
  mobile: string;
  email?: string;
  status: 'active' | 'dismissed';
  dismissalDate?: string;
  
  // Voter Info
  voterIdNumber: string;
  voterZone: string;
  voterSection: string;
  
  // Family
  fatherName: string;
  motherName: string;
  spouseName: string;
  dependents: Dependent[];
  
  // Address
  addressLogradouro: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressZipCode: string;
  addressState: string;
  
  // Contract
  contractId?: string;

  // Benefits
  commuterBenefits: boolean;
  commuterValue1?: number;
  commuterCity1?: string;
  commuterValue2?: number;
  commuterCity2?: string;
}

export interface TimeRecord {
  id: string;
  employeeId: string;
  date: string;
  entry: string;
  exit: string;
  overtime: string;
  companyId: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string; // user id or 'group'
  company_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
  attachment_url?: string;
  attachment_name?: string;
}

export interface ChatNotification {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  message: string;
  type: 'chat' | 'system';
  created_at: string;
  read: boolean;
}

export interface EmailConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
}

export interface User {
  id: string;
  companyId?: string;
  companyName?: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  jobFunction?: string;
  allowedQuotationIds?: string[];
  allowedContractIds?: string[];
  allowedModules?: AppModule[];
  keys?: number;
  keysExpiresAt?: string;
  isActive?: boolean;
  sessionId?: string;
  desiredPlan?: string;
  desiredModules?: AppModule[];
  hasCompany?: boolean;
  isApproved?: boolean;
  email?: string;
  mustChangePassword?: boolean;
  profilePhoto?: string;
  phone?: string;
  address?: string;
  emailConfig?: EmailConfig;
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  tempPassword?: string;
}

export interface ModulePrice {
  moduleId: AppModule;
  label: string;
  price: number;
}

export interface SystemPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  modules?: AppModule[];
}

export interface MarketingConfig {
  modulePrices: ModulePrice[];
  plans: SystemPlan[];
}

export interface DashboardItem {
  id: string;
  label: string;
  visible: boolean;
}

export interface DashboardSection {
  moduleId: AppModule;
  label: string;
  visible: boolean;
  items: DashboardItem[];
}

export interface DashboardConfig {
  sections: DashboardSection[];
}

export interface AuditLog {
  id: string;
  companyId?: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  module: string;
}

export type TimeUnit = 'days' | 'weeks' | 'months';

export interface ServiceSchedule {
  serviceId: string;
  distribution: {
    periodIndex: number;
    value: number;
  }[];
}

export interface Schedule {
  id: string;
  quotationId: string;
  startDate: string;
  duration: number;
  timeUnit: TimeUnit;
  distributionType: 'quantity' | 'percentage';
  services: ServiceSchedule[];
}

export interface ABCConfig {
  limitA: number;
  limitB: number;
}

export interface BDIConfig {
  ac: number; // Administração Central
  s: number;  // Seguros
  r: number;  // Riscos
  g: number;  // Garantias
  df: number; // Despesas Financeiras
  l: number;  // Lucro
  i: number;  // Impostos
}

export type WorksheetType = 'direct' | 'cubation' | 'transport';

export interface Contract {
  id: string;
  companyId?: string;
  quotationId?: string;
  contractNumber: string;
  workName?: string; // OBRA
  totalValue?: number; // Valor Total
  object: string;
  client: string;
  contractor: string;
  startDate: string;
  endDate?: string;
  supervisor?: string;
  notes?: string;
  measurementUnit?: string;      // Unidade de medição (ex: Estaca)
  measurementUnitValue?: string; // Valor da Unidade de medição (ex: 20 m)
  initialStation?: string;
  finalStation?: string;
  services?: {
    serviceId: string;
    code?: string;
    name?: string;
    quantity: number;
    price?: number;
    worksheetType?: WorksheetType;
  }[];
  groups?: BudgetGroup[];
  groupAdjustments?: Record<string, number>;
}

export interface MeasurementItem {
  serviceId: string;
  quantity: number;
}

export interface Measurement {
  id: string;
  companyId?: string;
  contractId: string;
  number: number;
  period: string; // e.g., "Mês 01/2026"
  date: string;
  items: MeasurementItem[];
  status?: 'open' | 'closed' | 'pending_deletion';
}

export interface TemplateColumn {
  id: string;
  label: string;
  formula?: string; // Optional formula like "Comp * Larg * Alt"
  type: 'number' | 'text' | 'calculated';
  isResult?: boolean; // Indicates if this is the column that sums up to the total measurement quantity
}

export interface MeasurementTemplate {
  id: string;
  companyId?: string;
  contractId?: string;
  name: string;
  unit: string; // The service unit (e.g., m³) this template belongs to
  columns: TemplateColumn[];
}

export interface MemoryRow {
  id: string;
  values: Record<string, any>;
}

export interface CalculationMemory {
  id: string;
  companyId?: string;
  contractId: string;
  measurementId: string;
  serviceId: string;
  rows: MemoryRow[];
}

export interface HighwayLocation {
  id: string;
  companyId?: string;
  contractId: string;
  name: string;
  materialIds: string[];
  referenceStation: string;
  lateralDistance: number;
  city: string;
}

export interface StationGroup {
  id: string;
  companyId?: string;
  contractId: string;
  name: string;
  initialStation: string;
  finalStation: string;
  materialIds: string[];
  volume: number;
  serviceId: string; // Linked service
}

export interface CubationRow {
  id: string;
  estaca: string;
  frac: number;
  acFc: string;
  area: number;
  somaAreas: number;
  semiDistancia: number;
  volume: number;
  observacao: string;
}

export interface CubationData {
  id: string;
  companyId?: string;
  contractId: string;
  measurementId: string;
  stationGroupId: string;
  serviceId: string;
  rows: CubationRow[];
}

export interface TransportRow {
  id: string;
  locationId: string;
  initialStation: string;
  initialFrac: number;
  finalStation: string;
  finalFrac: number;
  volume: number;
  density: number;
  weight: number;
  dmtCalculationMode: 'average' | 'center_of_mass';
  centerOfMassStake?: string; 
  centerOfMassFrac?: number;
  dmt: number;
  moment: number;
  observacao: string;
}

export interface TransportData {
  id: string;
  companyId?: string;
  contractId: string;
  measurementId: string;
  serviceId: string;
  rows: TransportRow[];
}

export interface ProductionDaily {
  date: string;
  planned: number;
  actual: number;
  plannedAccumulated: number;
  actualAccumulated: number;
  projected: number;
  projectedAccumulated: number;
}

export interface ServiceProduction {
  id: string;
  companyId?: string;
  contractId: string;
  serviceId: string;
  customTitle?: string;
  month: string; // YYYY-MM
  numEquip: number;
  workDays: number;
  hoursDay: number;
  unitHour: number;
  efficiency: number;
  rainPercent: number;
  startDate: string;
  endDate: string;
  order?: number;
  prevMonthAccumulated?: number;
  dailyData: Record<string, { actual: number; planned?: number }>; // Date string -> values
}

export interface DailyReportActivity {
  id: string;
  code: string;
  description: string;
  type: 'Produção' | 'Projeto' | 'Cronograma' | 'Outros';
  category: 'CONTRATADA' | 'SUPERVISÃO' | 'FISCALIZAÇÃO';
}

export interface DailyReport {
  id: string;
  companyId?: string;
  contractId: string;
  date: string;
  weatherMorning: 'Bom' | 'Chuvoso' | 'Impraticável';
  weatherAfternoon: 'Bom' | 'Chuvoso' | 'Impraticável';
  weatherNight: 'Bom' | 'Chuvoso' | 'Impraticável';
  rainfallMm: number;
  manpower: { description: string; quantity: number }[];
  equipment: { description: string; quantity: number }[];
  activities: DailyReportActivity[];
  accidents: string;
  fiscalizationComments?: string;
}

export interface PluviometryRecord {
  id: string;
  companyId?: string;
  contractId: string;
  date: string;
  nightStatus: 'Bom' | 'Chuvoso' | 'Impraticável';
  morningStatus: 'Bom' | 'Chuvoso' | 'Impraticável';
  afternoonStatus: 'Bom' | 'Chuvoso' | 'Impraticável';
  rainfallMm: number;
}

export interface TechnicalSchedulePeriodDist {
  periodIndex: number;
  plannedQty: number;
  actualQty: number;
  plannedValue: number;
  actualValue: number;
}

export interface TechnicalServiceSchedule {
  serviceId: string;
  distribution: TechnicalSchedulePeriodDist[];
}

export interface TechnicalSchedule {
  id: string;
  companyId?: string;
  contractId: string;
  startDate: string;
  duration: number;
  timeUnit: TimeUnit;
  services: TechnicalServiceSchedule[];
}

export interface PurchaseRequest {
  id: string;
  companyId?: string;
  contractId?: string;
  equipmentId?: string;
  date: string;
  description: string;
  category: string;
  costCenter?: string;
  sector: string;
  priority?: 'Normal' | 'Alta' | 'Urgente';
  status: 'Cancelado' | 'Pendente' | 'Em orçamento' | 'Compra Aprovado' | 'Comprado' | 'Recebido';
  deliveryDeadline?: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    status?: 'Pendente' | 'Em orçamento' | 'Comprado' | 'Recebido' | 'Cancelado';
    appliedQuantity?: number;
  }[];
}

export interface PurchaseQuotation {
  id: string;
  companyId?: string;
  items: {
    requestId: string;
    itemId: string;
    equipmentId?: string;
    description: string;
    quantity: number;
    unit: string;
  }[];
  date: string;
  suppliers: {
    supplierId: string;
    status: 'sent' | 'responded';
    responses: {
      itemId: string;
      price: number;
      notes?: string;
    }[];
    paymentCondition?: string;
    notes?: string;
  }[];
  status: 'draft' | 'sent' | 'responded' | 'awaiting_approval' | 'approved' | 'completed';
  selectedSupplierId?: string;
}

export interface PurchaseOrderItem {
  id: string;
  requestId?: string;
  itemId?: string;
  equipmentId?: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface PaymentCondition {
  id: string;
  condition: string;
  dueDate: string;
  value: number;
  observation: string;
}

export interface PurchaseOrder {
  id: string;
  companyId?: string;
  contractId?: string;
  equipmentId?: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  phone: string;
  email: string;
  orderDate: string;
  deliveryDate: string;
  category?: string;
  costCenter?: string;
  
  deliveryAddress: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    zipCode: string;
    city: string;
    state: string;
  };

  items: PurchaseOrderItem[];
  subtotal: number;
  discount: number;
  additions: number;
  total: number;

  paymentConditions: PaymentCondition[];

  observations: string;
  status: 'draft' | 'approved' | 'sent' | 'delivered' | 'cancelled' | 'waiting_delivery' | 'finalizada';
  originQuotationId?: string;
  evaluation?: SupplierEvaluation;
}

export interface SupplierEvaluation {
  punctuality: number;
  quality: number;
  service: number;
  price: number;
  deadline: number;
  date: string;
  comments?: string;
}

export interface Supplier {
  id: string;
  companyId?: string;
  registrationNumber: string;
  supplierCode: string;
  activity: string;
  name: string;
  contact: string;
  nextel: string;
  phone: string;
  mobile: string;
  address: string;
  neighborhoodCity: string;
  zipCode: string;
  state: string;
  emailWebsite: string;
  observations: string;
  assignedContractIds?: string[];
}

export interface EquipmentTransfer {
  id: string;
  companyId: string;
  equipmentId: string;
  sourceContractId: string;
  targetContractId: string;
  transferDate: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface MaterialRequestItem {
  id: string;
  quantity: number;
  description: string;
  unit?: string;
  application: string; // Equipment ID or Plate
  priority?: 'Normal' | 'Alta' | 'Urgente';
}

export interface MaterialRequest {
  id: string;
  companyId?: string;
  contractId?: string;
  requesterId?: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  items: MaterialRequestItem[];
}

export interface ControllerTeam {
  id: string;
  companyId?: string;
  contractId?: string;
  name: string;
  supervisorId: string; // ID of the manpower/employee
}

export interface EquipmentAttribute {
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi-select';
  value: any;
  options?: string[]; // For select/multi-select
}

export interface ControllerEquipment {
  id: string;
  companyId?: string;
  contractId?: string;
  code?: string; // Código patrimonial ou interno
  name: string;
  type: string; // Tipo de Equipamento (Escavadeira, Caminhão, etc)
  brand?: string; // Marca
  model: string;
  year?: number; // Ano
  situation?: 'Ativo' | 'Inativo' | 'Vendido' | 'Sucateado' | 'Em Manutenção';
  plate: string;
  origin: string;
  category: string; // Porte / Categoria
  ownerName?: string; // Proprietário (para alugados)
  ownerCnpj?: string; // CNPJ (para alugados)
  entryDate: string;
  exitDate?: string;
  inMaintenance?: boolean;
  maintenance_entry_date?: string;
  maintenance_exit_date?: string;
  maintenance_type?: 'preventive' | 'corrective';
  chargesPercentage?: number;
  overtimePercentage?: number;
  measurementUnit?: 'Horímetro' | 'Quilometragem' | 'Mensal';
  currentReading?: number; // Última leitura de horímetro/odômetro
  contractedPrice?: number; // Preço Contratado
  observations?: string;
  customFields?: Record<string, EquipmentAttribute>; // JSONB Data
  photos?: string[]; // URLs das fotos (Supabase Storage)
  history?: ServiceHistoryEntry[];
}

export interface ServiceHistoryEntry {
  id: string;
  date: string;
  type: 'maintenance' | 'part_application' | 'fueling' | 'transfer';
  description: string;
  relatedId?: string; // ID da solicitação, ordem de compra, etc
  parts?: {
    description: string;
    quantity: number;
    unit: string;
  }[];
}

export interface EquipmentMaintenance {
  id: string;
  equipmentId: string;
  companyId: string;
  entryDate: string;
  exitDate?: string;
  type: 'preventive' | 'corrective';
  requestedItems: string;
  daysInMaintenance?: number; 
  totalCost?: number;
}

export interface EquipmentMonthlyData {
  id: string;
  companyId?: string;
  contractId?: string;
  equipmentId: string;
  month: string; // YYYY-MM
  cost: number;
}

export interface FuelTank {
  id: string;
  companyId?: string;
  contractId?: string;
  name: string;
  capacity: number;
  currentLevel: number;
  fuelType?: string;
}

export interface FuelLog {
  id: string;
  companyId?: string;
  tankId: string;
  type: 'entrada' | 'saida';
  date: string;
  quantity: number;
  equipmentId?: string;
  notes?: string;
  cost?: number;
  supplier?: string;
  unitPrice?: number;
  invoiceNumber?: string;
}

export interface ControllerManpower {
  id: string;
  companyId?: string;
  contractId?: string;
  name: string;
  role: string;
  dailyWorker?: string;
  entryDate: string;
  exitDate?: string;
  chargesPercentage?: number;
  overtimePercentage?: number;
}

export interface ManpowerMonthlyData {
  id: string;
  companyId?: string;
  contractId?: string;
  manpowerId: string;
  month: string; // YYYY-MM
  salary: number;
  overtimeRate: number;
  dailyRate: number;
}

export interface DailyEquipmentMeasurement {
  date: string;
  initialReading: number;
  finalReading: number;
  discount: boolean;
  status: 'Trabalhando' | 'Chuva' | 'Manutenção' | 'Aguardando Frente' | 'à Disposição';
}

export interface EquipmentMeasurement {
  id: string;
  equipmentId: string;
  companyId: string;
  number: number;
  month: string; 
  period: string; 
  totalUnits: number;
  totalValue: number;
  details: DailyEquipmentMeasurement[];
}

export interface TeamAssignment {
  id: string;
  companyId?: string;
  contractId?: string;
  teamId: string;
  memberId: string; // Equipment or Manpower ID
  type: 'equipment' | 'manpower';
  month: string; // YYYY-MM
}
