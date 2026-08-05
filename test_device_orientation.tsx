import { useEffect, useState } from 'react';
function useDeviceOrientation() {
  const [orientation, setOrientation] = useState(0);
  useEffect(() => {
    const handleOrientation = (e) => {
      let angle = window.screen?.orientation?.angle || 0;
      if (typeof window.orientation !== 'undefined') {
        angle = window.orientation;
      }
      setOrientation(angle);
    };
    window.addEventListener('orientationchange', handleOrientation);
    handleOrientation();
    return () => window.removeEventListener('orientationchange', handleOrientation);
  }, []);
  return orientation;
}
