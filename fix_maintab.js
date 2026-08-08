const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const \[mainTab, setMainTab\] = useState.*?\(\(\) => \{\s*try \{\s*if \(typeof window !== 'undefined' && \(window\.matchMedia\('\(display-mode: standalone\)'\)\.matches \|\| Boolean\(\(navigator as any\)\.standalone\)\)\) \{\s*return 'mobile';\s*\}\s*return \(window\.sessionStorage\.getItem\('sigo_main_tab'\) as any\) \|\| 'home';\s*\} catch \{\s*return 'home';\s*\}\s*\}\);/s;

const replacement = `const [mainTab, setMainTab] = useState<'home' | 'quotations' | 'measurements' | 'rh' | 'control' | 'purchases' | 'project_admin' | 'settings' | 'admin' | 'profile' | 'gerencia' | 'financeiro' | 'almoxarife' | 'help' | 'mobile'>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.location.pathname.includes('cam.html') || window.location.pathname.includes('mobile.html') || window.location.search.includes('tab=mobile')) {
          return 'mobile';
        }
        if (window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as any).standalone)) {
          return 'mobile';
        }
      }
      return (window.sessionStorage.getItem('sigo_main_tab') as any) || 'home';
    } catch {
      return 'home';
    }
  });`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
