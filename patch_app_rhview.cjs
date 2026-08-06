const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `              {mainTab === 'rh' && (
                <RHView 
                  currentUser={effectiveUser}
                  employees={employees}
                  alojamentos={alojamentos || []}
                  onUpdateAlojamentos={updateAlojamentos}
                  timeRecords={timeRecords}
                  contracts={finalContracts}
                  selectedContractId={selectedContractId}
                  onUpdateContractId={(id) => setSelectedContractId(id || null)}
                  onUpdateEmployees={updateEmployees}
                  onUpdateRecords={setTimeRecords}
                  initialTab={activeRHTab}
                  controllerTeams={finalControllerTeams}
                  teamAssignments={teamAssignments}
                  onUpdateAssignments={updateTeamAssignments}
                  onUpdateTeams={setControllerTeams}
                  employeeTransfers={employeeTransfers}
                  onUpdateTransfers={updateEmployeeTransfers}
                  onAddWorkMovement={addWorkMovement}
                />
              )}`;

const replace = `              {mainTab === 'rh' && (
                <RHView 
                  currentUser={effectiveUser}
                  employees={employees}
                  alojamentos={alojamentos || []}
                  onUpdateAlojamentos={updateAlojamentos}
                  timeRecords={timeRecords}
                  contracts={finalContracts}
                  selectedContractId={selectedContractId}
                  onUpdateContractId={(id) => setSelectedContractId(id || null)}
                  onUpdateEmployees={updateEmployees}
                  onUpdateRecords={setTimeRecords}
                  initialTab={activeRHTab}
                  controllerTeams={finalControllerTeams}
                  teamAssignments={teamAssignments}
                  onUpdateAssignments={updateTeamAssignments}
                  onUpdateTeams={setControllerTeams}
                  employeeTransfers={employeeTransfers}
                  onUpdateTransfers={updateEmployeeTransfers}
                  onAddWorkMovement={addWorkMovement}
                  workMovements={workMovements}
                  onUpdateWorkMovements={updateWorkMovements}
                />
              )}`;

if (content.includes(target)) {
  content = content.replace(target, replace);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Patched App.tsx for RHView');
} else {
  console.log('Target not found in App.tsx');
}
