useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomX(prev => Math.min(20, prev * 1.1));
    } else {
      setZoomX(prev => Math.max(0.5, prev / 1.1));
    }
  };

  let isPanning = false;
  let startX = 0;
  let scrollLeft = 0;

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 1) { // Middle click
      e.preventDefault();
      isPanning = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      container.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed
    container.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (e.button === 1 && isPanning) {
      isPanning = false;
      container.style.cursor = 'auto';
    }
  };

  container.addEventListener('wheel', handleWheel, { passive: false });
  container.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  return () => {
    container.removeEventListener('wheel', handleWheel);
    container.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, []);
