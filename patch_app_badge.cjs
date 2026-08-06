const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const pendingCountCode = `
  const pendingFieldReports = fieldReports.filter(r => r.status === 'pending').length;
`;

if (!code.includes('pendingFieldReports')) {
  code = code.replace("const [fieldReports, setFieldReports] = useLocalStorage<FieldProductionReport[]>('sigo_field_reports', [], compId);", 
  "const [fieldReports, setFieldReports] = useLocalStorage<FieldProductionReport[]>('sigo_field_reports', [], compId);\n" + pendingCountCode);
}

// Now add the badge to the SidebarItem mapping
const mappingCode = `
                        showHandle={isSidebarOpen}
                        badge={item.id === 'campo' ? pendingFieldReports : undefined}
                      />
                    </Reorder.Item>
`;

if (!code.includes("badge={item.id === 'campo' ? pendingFieldReports : undefined}")) {
  code = code.replace("showHandle={isSidebarOpen}\n                      />\n                    </Reorder.Item>", mappingCode);
}

fs.writeFileSync('src/App.tsx', code);
