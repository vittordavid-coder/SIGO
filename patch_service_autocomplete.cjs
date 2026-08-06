const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const target = `function ServiceAutoComplete({
  services,
  selectedServiceId,
  onSelectService
}: {
  services: ServiceItem[];
  selectedServiceId: string;
  onSelectService: (service: ServiceItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId);
  }, [services, selectedServiceId]);

  const filteredServices = useMemo(() => {
    if (!query.trim()) return services;
    const lower = query.toLowerCase();
    return services.filter(s => 
      (s.name && s.name.toLowerCase().includes(lower)) ||
      (s.code && s.code.toLowerCase().includes(lower))
    );
  }, [services, query]);

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full min-h-[44px] rounded-2xl bg-slate-900 border border-slate-700 text-white px-3 py-2.5 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
      >
        <span className={selectedService ? "font-extrabold text-xs text-blue-300 truncate max-w-[280px]" : "text-xs text-slate-400 font-medium"}>
          {selectedService ? \`\${selectedService.code ? \`[\${selectedService.code}] \` : ''}\${selectedService.name} (\${selectedService.unit || 'un'})\` : 'Pesquisar e selecionar serviço do Controles...'}
        </span>
        <ChevronRight className={\`w-4 h-4 text-slate-400 shrink-0 transition-transform \${isOpen ? 'rotate-90' : ''}\`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 5 }}
            className="absolute left-0 right-0 top-12 z-50 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-2 space-y-2 max-h-64 overflow-hidden flex flex-col"
          >
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Digitar nome ou código do serviço..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-1 custom-scrollbar pr-1">
              {filteredServices.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 text-center">Nenhum serviço encontrado em Controles.</p>
              ) : (
                filteredServices.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectService(s);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className={\`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors \${
                      selectedServiceId === s.id ? 'bg-blue-600/30 text-blue-300 font-extrabold border border-blue-500/40' : 'text-slate-200 hover:bg-slate-900'
                    }\`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-white truncate">{s.name}</p>
                      {s.code && <span className="text-[10px] text-slate-400 font-mono">Cód: {s.code}</span>}
                    </div>
                    {s.unit && <span className="text-[10px] font-bold text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded">{s.unit}</span>}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

const replacement = `function ServiceAutoComplete({
  services,
  selectedServiceId,
  onSelectService
}: {
  services: ServiceItem[];
  selectedServiceId: string;
  onSelectService: (service: ServiceItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        const selected = services.find(s => s.id === selectedServiceId);
        if (selected) {
          setQuery(\`\${selected.code ? \`[\${selected.code}] \` : ''}\${selected.name}\`);
        } else if (!selectedServiceId) {
          setQuery('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedServiceId, services]);

  useEffect(() => {
    const selectedOption = services.find(o => o.id === selectedServiceId);
    if (selectedOption) {
      setQuery(\`\${selectedOption.code ? \`[\${selectedOption.code}] \` : ''}\${selectedOption.name}\`);
    } else {
      setQuery('');
    }
  }, [selectedServiceId, services]);

  const filteredServices = useMemo(() => {
    if (!query.trim()) return services;
    const lower = query.toLowerCase();
    return services.filter(s => 
      (s.name && s.name.toLowerCase().includes(lower)) ||
      (s.code && s.code.toLowerCase().includes(lower))
    );
  }, [services, query]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input 
          type="text" 
          placeholder="Pesquisar e selecionar serviço..." 
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setIsOpen(true);
          }}
          className="w-full min-h-[44px] rounded-2xl bg-slate-900 border border-slate-700 text-white px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors"
        />
        <ChevronRight className={\`w-4 h-4 text-slate-400 shrink-0 transition-transform absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none \${isOpen ? 'rotate-90' : ''}\`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 5 }}
            className="absolute left-0 right-0 top-12 z-50 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-2 max-h-64 overflow-hidden flex flex-col"
          >
            <div className="overflow-y-auto flex-1 space-y-1 custom-scrollbar pr-1">
              {filteredServices.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 text-center">Nenhum serviço encontrado.</p>
              ) : (
                filteredServices.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectService(s);
                      setIsOpen(false);
                      setQuery(\`\${s.code ? \`[\${s.code}] \` : ''}\${s.name}\`);
                    }}
                    className={\`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors \${
                      selectedServiceId === s.id ? 'bg-blue-600/30 text-blue-300 font-extrabold border border-blue-500/40' : 'text-slate-200 hover:bg-slate-900'
                    }\`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-white truncate">{s.name}</p>
                      {s.code && <span className="text-[10px] text-slate-400 font-mono">Cód: {s.code}</span>}
                    </div>
                    {s.unit && <span className="text-[10px] font-bold text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded">{s.unit}</span>}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

if (content.includes('function ServiceAutoComplete({')) {
  // We need to use regex because the target might have slight differences
  const regex = /function ServiceAutoComplete\(\{[\s\S]*?<\/div>\s*\);\s*\}/;
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Patched ServiceAutoComplete');
} else {
  console.log('Target not found');
}
