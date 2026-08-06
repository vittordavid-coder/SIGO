const fs = require('fs');
let content = fs.readFileSync('src/components/RHView.tsx', 'utf8');

const targetProps = `interface RHViewProps {
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
  employeeTransfers?: EmployeeTransfer[];
  onUpdateTransfers?: (transfers: EmployeeTransfer[]) => void;
  onAddWorkMovement?: (movement: Omit<WorkMovement, 'id' | 'timestamp'>) => void;
}`;

const replaceProps = `interface RHViewProps {
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
  employeeTransfers?: EmployeeTransfer[];
  onUpdateTransfers?: (transfers: EmployeeTransfer[]) => void;
  onAddWorkMovement?: (movement: Omit<WorkMovement, 'id' | 'timestamp'>) => void;
  workMovements?: WorkMovement[];
  onUpdateWorkMovements?: (val: any) => void;
}`;

if (content.includes(targetProps)) {
  content = content.replace(targetProps, replaceProps);
  
  const targetComp = `export default function RHView({
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
  employeeTransfers = [],
  onUpdateTransfers,
  onAddWorkMovement,
}: RHViewProps) {`;

  const replaceComp = `export default function RHView({
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
  employeeTransfers = [],
  onUpdateTransfers,
  onAddWorkMovement,
  workMovements = [],
  onUpdateWorkMovements,
}: RHViewProps) {`;
  
  content = content.replace(targetComp, replaceComp);
  
  fs.writeFileSync('src/components/RHView.tsx', content);
  console.log('Patched RHView props');
} else {
  console.log('Target not found for RHView props');
}
