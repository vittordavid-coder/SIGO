  const [mainTab, setMainTab] = useState<'home' | 'quotations' | 'measurements' | 'rh' | 'control' | 'purchases' | 'project_admin' | 'settings' | 'admin' | 'profile' | 'gerencia' | 'financeiro' | 'almoxarife' | 'help' | 'mobile'>(() => {
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
  });
