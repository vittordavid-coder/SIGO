sed -i -e '/useMapEvents({/i \
  const map = useMap();\
  useEffect(() => {\
    let isPanning = false;\
    let startPoint;\
\
    const onMouseDown = (e) => {\
      if (e.originalEvent.button === 1) { // Middle click\
        e.originalEvent.preventDefault();\
        isPanning = true;\
        startPoint = map.mouseEventToContainerPoint(e.originalEvent);\
        map.getContainer().style.cursor = "grabbing";\
      }\
    };\
\
    const onMouseMove = (e) => {\
      if (!isPanning) return;\
      e.originalEvent.preventDefault();\
      const currentPoint = map.mouseEventToContainerPoint(e.originalEvent);\
      const offset = [startPoint.x - currentPoint.x, startPoint.y - currentPoint.y];\
      map.panBy(offset, { animate: false });\
      startPoint = currentPoint;\
    };\
\
    const onMouseUp = (e) => {\
      if (e.originalEvent.button === 1 && isPanning) {\
        isPanning = false;\
        map.getContainer().style.cursor = "";\
      }\
    };\
\
    map.on("mousedown", onMouseDown);\
    map.on("mousemove", onMouseMove);\
    map.on("mouseup", onMouseUp);\
\
    return () => {\
      map.off("mousedown", onMouseDown);\
      map.off("mousemove", onMouseMove);\
      map.off("mouseup", onMouseUp);\
    };\
  }, [map]);\
' src/components/ProjectAlignmentView.tsx
