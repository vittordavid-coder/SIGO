sed -i -e '/\/\/ Auto-scroll and apply Zoom/i \
  useEffect(() => {\
    const container = scrollContainerRef.current;\
    if (!container) return;\
\
    const handleWheel = (e) => {\
      e.preventDefault();\
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;\
      setZoomX(prev => Math.min(20, Math.max(0.5, prev * zoomFactor)));\
    };\
\
    let isPanning = false;\
    let startX = 0;\
    let scrollLeft = 0;\
\
    const handleMouseDown = (e) => {\
      if (e.button === 1) {\
        e.preventDefault();\
        isPanning = true;\
        startX = e.pageX - container.offsetLeft;\
        scrollLeft = container.scrollLeft;\
        container.style.cursor = "grabbing";\
      }\
    };\
\
    const handleMouseMove = (e) => {\
      if (!isPanning) return;\
      e.preventDefault();\
      const x = e.pageX - container.offsetLeft;\
      const walk = (x - startX) * 1.5;\
      container.scrollLeft = scrollLeft - walk;\
    };\
\
    const handleMouseUp = (e) => {\
      if (e.button === 1 && isPanning) {\
        isPanning = false;\
        container.style.cursor = "auto";\
      }\
    };\
\
    container.addEventListener("wheel", handleWheel, { passive: false });\
    container.addEventListener("mousedown", handleMouseDown);\
    window.addEventListener("mousemove", handleMouseMove);\
    window.addEventListener("mouseup", handleMouseUp);\
\
    return () => {\
      container.removeEventListener("wheel", handleWheel);\
      container.removeEventListener("mousedown", handleMouseDown);\
      window.removeEventListener("mousemove", handleMouseMove);\
      window.removeEventListener("mouseup", handleMouseUp);\
    };\
  }, []);\
' src/components/ProjectAlignmentView.tsx
