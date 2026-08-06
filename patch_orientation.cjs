const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

const hook = `
  // Auto-rotate on orientation change
  useEffect(() => {
    const handleOrientation = () => {
      let angle = window.screen?.orientation?.angle || window.orientation || 0;
      if (angle === 90) {
        setCameraRotation(90);
        setStampConfig(prev => ({ ...prev, rotateCaption: true }));
      } else if (angle === -90 || angle === 270) {
        setCameraRotation(270);
        setStampConfig(prev => ({ ...prev, rotateCaption: true }));
      } else {
        setCameraRotation(0);
        setStampConfig(prev => ({ ...prev, rotateCaption: false }));
      }
    };
    
    handleOrientation();
    window.addEventListener('orientationchange', handleOrientation);
    return () => window.removeEventListener('orientationchange', handleOrientation);
  }, []);
`;

code = code.replace(/\/\/ Helper para iniciar streaming de video/g, hook.trim() + '\n\n  // Helper para iniciar streaming de video');

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
