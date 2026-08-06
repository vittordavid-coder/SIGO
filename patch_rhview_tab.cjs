const fs = require('fs');
let content = fs.readFileSync('src/components/RHView.tsx', 'utf8');

const targetPending = `  const [searchTerm, setSearchTerm] = useState("");`;
const replacePending = `  const pendingFieldMovements = workMovements.filter(m => 
    m.type === 'hr_headcount' && 
    (!selectedContractId || m.contractId === selectedContractId) && 
    (!m.details || (m.details.status !== 'approved' && m.details.status !== 'rejected'))
  );

  const [searchTerm, setSearchTerm] = useState("");`;

content = content.replace(targetPending, replacePending);

const targetTab = `          <TabsTrigger value="parameters" className="gap-2">
            <Settings className="w-4 h-4" /> Parâmetros
          </TabsTrigger>
        </TabsList>`;
const replaceTab = `          <TabsTrigger value="parameters" className="gap-2">
            <Settings className="w-4 h-4" /> Parâmetros
          </TabsTrigger>
          <TabsTrigger value="campo" className="gap-2 relative">
            <Smartphone className="w-4 h-4" /> Campo
            {pendingFieldMovements.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                {pendingFieldMovements.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>`;

content = content.replace(targetTab, replaceTab);

fs.writeFileSync('src/components/RHView.tsx', content);
console.log('Patched RHView for Campo tab');
