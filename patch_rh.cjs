const fs = require('fs');
let content = fs.readFileSync('src/components/RHView.tsx', 'utf8');

if (!content.includes('InlineAutocomplete')) {
  content = content.replace('export default function RHView', `import { InlineAutocomplete } from './InlineAutocomplete';

export default function RHView`);
}

// Replace Comboboxes
const empTarget = `                      <Combobox
                        options={employees.map((e) => ({
                          value: e.id,
                          label: \`\${e.name} \${e.role ? \`(\${e.role})\` : ''} \${e.team ? \`[Equipe: \${e.team}]\` : ''}\`
                        }))}
                        value={selectedRespEmpId}
                        onChange={(val) => setSelectedRespEmpId(val)}
                        placeholder="-- Escolha um Funcionário --"
                        emptyText="Nenhum funcionário encontrado"
                        className="h-10 rounded-xl border-gray-200 bg-white text-xs font-semibold text-gray-900"
                      />`;

const empReplacement = `                      <InlineAutocomplete
                        options={employees.map((e) => ({
                          value: e.id,
                          label: \`\${e.name} \${e.role ? \`(\${e.role})\` : ''} \${e.team ? \`[Equipe: \${e.team}]\` : ''}\`
                        }))}
                        value={selectedRespEmpId}
                        onChange={(val) => setSelectedRespEmpId(val)}
                        onSelect={(val, label) => setSelectedRespEmpId(val)}
                        placeholder="-- Escolha um Funcionário --"
                      />
                      {/* Hint to show selected item */}
                      {selectedRespEmpId && employees.find(e => e.id === selectedRespEmpId) && (
                         <div className="text-[10px] text-emerald-600 font-bold mt-1">Selecionado: {employees.find(e => e.id === selectedRespEmpId)?.name}</div>
                      )}`;

const teamTarget = `                        <Combobox
                          options={(controllerTeams || []).map((t) => ({
                            value: t.name,
                            label: t.name
                          }))}
                          value={selectedRespTeam}
                          onChange={(val) => setSelectedRespTeam(val)}
                          placeholder="Ex: Equipe Terraplenagem"
                          emptyText="Nenhuma equipe encontrada"
                          className="h-10 rounded-xl border-gray-200 bg-white text-xs font-semibold text-gray-900"
                        />`;

const teamReplacement = `                        <InlineAutocomplete
                          options={(controllerTeams || []).map((t) => ({
                            value: t.name,
                            label: t.name
                          }))}
                          value={selectedRespTeam}
                          onChange={(val) => setSelectedRespTeam(val)}
                          onSelect={(val) => setSelectedRespTeam(val)}
                          placeholder="Ex: Equipe Terraplenagem"
                        />`;

content = content.replace(empTarget, empReplacement);
content = content.replace(teamTarget, teamReplacement);

fs.writeFileSync('src/components/RHView.tsx', content);
console.log('Patched RHView');
