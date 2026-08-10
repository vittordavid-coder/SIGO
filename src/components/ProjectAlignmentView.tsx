import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MapPin, Upload, Download, FileSpreadsheet, Layers, Compass, 
  Ruler, Eye, Trash2, CheckCircle2, AlertTriangle, 
  RefreshCw, ChevronRight, Info, Copy, Check, Maximize2, Minimize2, Map,
  Plus, X, Edit3, Tag, Sliders, Filter, ArrowRight, Search, FileText, CheckCircle,
  ZoomIn, ZoomOut, TrendingUp, Settings, EyeOff, Palette, RotateCcw, SlidersHorizontal,
  FileCode, Database, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Contract, ProjectAlignment, ProjectAlignmentPoint, ProjectPin, ProjectMeasurement } from '../types';
import {
  CadViewSettings,
  DEFAULT_CAD_SETTINGS,
  loadCadSettings,
  saveCadSettings,
  resetCadSettings,
  exportCadSettingsScript
} from '../utils/cadSettingsManager';

// Map Recenter Helper Component
function MapBoundsFitter({ points }: { points: ProjectAlignmentPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, points]);

  return null;
}

// Map Event Interceptor for Pin Dropping & Ruler Measurements
function MapEventsHandler({ 
  activeTool, 
  onAddPinClick, 
  onAddMeasureClick 
}: { 
  activeTool: 'none' | 'pin' | 'measure';
  onAddPinClick: (lat: number, lng: number) => void;
  onAddMeasureClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    let isPanning = false;
    let startPoint;

    const onMouseDown = (e) => {
      if (e.originalEvent.button === 1) { // Middle click
        e.originalEvent.preventDefault();
        isPanning = true;
        startPoint = map.mouseEventToContainerPoint(e.originalEvent);
        map.getContainer().style.cursor = "grabbing";
      }
    };

    const onMouseMove = (e) => {
      if (!isPanning) return;
      e.originalEvent.preventDefault();
      const currentPoint = map.mouseEventToContainerPoint(e.originalEvent);
      const offset = [startPoint.x - currentPoint.x, startPoint.y - currentPoint.y];
      map.panBy(offset, { animate: false });
      startPoint = currentPoint;
    };

    const onMouseUp = (e) => {
      if (e.originalEvent.button === 1 && isPanning) {
        isPanning = false;
        map.getContainer().style.cursor = "";
      }
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
    };
  }, [map]);

  useMapEvents({
    click(e) {
      if (activeTool === 'pin') {
        onAddPinClick(e.latlng.lat, e.latlng.lng);
      } else if (activeTool === 'measure') {
        onAddMeasureClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Map Background Color Applier (Forces dynamic Leaflet canvas background updates)
function MapBackgroundColorApplier({ color, enableGoogleMaps }: { color: string; enableGoogleMaps: boolean }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (container) {
      container.style.backgroundColor = color;
      const leafletPane = container.querySelector('.leaflet-pane') as HTMLElement;
      if (leafletPane) {
        leafletPane.style.backgroundColor = enableGoogleMaps ? 'transparent' : color;
      }
      const tilePane = container.querySelector('.leaflet-tile-pane') as HTMLElement;
      if (tilePane) {
        tilePane.style.backgroundColor = enableGoogleMaps ? 'transparent' : color;
      }
    }
  }, [map, color, enableGoogleMaps]);

  return null;
}

// Leaflet Map Zoom Level Tracker (Optimized with rounded zoom integer)
function ZoomLevelTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(Math.round(map.getZoom()));
    }
  });

  useEffect(() => {
    onZoomChange(Math.round(map.getZoom()));
  }, [map, onZoomChange]);

  return null;
}

// Calculate angle between points for perpendicular (transversal) station line
function getAlignmentAngleDegrees(
  prevPt?: { lat: number; lng: number },
  currPt?: { lat: number; lng: number },
  nextPt?: { lat: number; lng: number }
): number {
  if (!currPt) return 0;
  const p1 = prevPt || currPt;
  const p2 = nextPt || currPt;
  const dy = p2.lat - p1.lat;
  const dx = (p2.lng - p1.lng) * Math.cos((currPt.lat * Math.PI) / 180);
  if (dx === 0 && dy === 0) return 0;
  // Heading angle in screen coordinate space (clockwise from horizontal East)
  return (Math.atan2(-dy, dx) * 180) / Math.PI;
}

// Format clean station text (omits +0,000 or +0.000 fractional zeros unless > 0)
export function formatCleanStationText(stationRaw: string | number): string {
  if (stationRaw === undefined || stationRaw === null) return '';
  let s = String(stationRaw).trim();
  // Strip fractional zeros after comma or dot, e.g. "10+00,000" -> "10+00" or "0+00.00" -> "0+00"
  s = s.replace(/([,\.]0+)(\s*)$/, '');
  return s;
}

// Custom CAD Station Marker Generator (Perpendicular transversal tick + Transversal Station Text alongside tick)
function createCadStationIcon(
  pt: ProjectAlignmentPoint,
  prevPt: ProjectAlignmentPoint | undefined,
  nextPt: ProjectAlignmentPoint | undefined,
  isSelected: boolean,
  settings: CadViewSettings
) {
  // Heading angle of alignment trajectory
  const headingAngle = getAlignmentAngleDegrees(prevPt, pt, nextPt);
  
  // Initial tick div is vertical (90 deg to horizontal). Rotating initial vertical div by headingAngle keeps it strictly transversal (perpendicular) to trajectory at all angles.
  const perpAngle = headingAngle;

  const tickColor = settings.stationTickColor || '#22c55e';
  const textColor = settings.stationTextColor || '#22c55e';
  const fontSize = settings.stationFontSize || 12;

  const stationText = formatCleanStationText(pt.station || '');

  const html = `
    <div style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
      ${settings.showStationTicks ? `
        <div style="
          position: absolute;
          width: 2px;
          height: 26px;
          background-color: ${isSelected ? '#f59e0b' : tickColor};
          top: 50%;
          left: 50%;
          margin-top: -13px;
          margin-left: -1px;
          transform: rotate(${perpAngle}deg);
          box-shadow: 0 0 5px rgba(0,0,0,0.9);
          border-radius: 1px;
          z-index: 1;
        "></div>
      ` : ''}

      <div style="
        position: absolute;
        width: ${isSelected ? '12px' : '6px'};
        height: ${isSelected ? '12px' : '6px'};
        background-color: ${isSelected ? '#f59e0b' : tickColor};
        border-radius: 50%;
        top: 50%;
        left: 50%;
        margin-top: ${isSelected ? '-6px' : '-3px'};
        margin-left: ${isSelected ? '-6px' : '-3px'};
        border: 1.5px solid #ffffff;
        box-shadow: 0 0 6px rgba(0,0,0,0.8);
        z-index: 2;
      "></div>

      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(${perpAngle}deg) translateY(-22px) rotate(${settings.stationTextRotation || 0}deg);
        white-space: nowrap;
        font-family: 'JetBrains Mono', 'Courier New', monospace, sans-serif;
        font-size: ${fontSize}px;
        font-weight: 900;
        color: ${isSelected ? '#f59e0b' : textColor};
        text-shadow: 0 0 4px #000000, 0 0 2px #000000, 1px 1px 3px #000000;
        user-select: none;
        letter-spacing: -0.5px;
        z-index: 3;
      ">
        ${stationText}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'cad-station-marker',
    html,
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30]
  });
}

// Custom Leaflet Pin Icon Creator
const createCustomPinIcon = (color: string) => {
  const colorMap: Record<string, string> = {
    red: '#ef4444',
    emerald: '#10b981',
    blue: '#3b82f6',
    amber: '#f59e0b',
    purple: '#8b5cf6',
    pink: '#ec4899',
  };
  const hex = colorMap[color] || '#ef4444';
  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div style="
        background-color: ${hex};
        width: 26px;
        height: 26px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });
};

// Convert UTM (WGS84 / SIRGAS 2000 / SAD-69) to Lat / Lng (Approximate for South America / Brazil zones)
function utmToLatLng(
  easting: number,
  northing: number,
  zone: number = 23,
  southernHemisphere: boolean = true,
  datum: 'SIRGAS 2000' | 'SAD-69' = 'SIRGAS 2000'
) {
  const a = 6378137; // semi-major axis
  const f = 1 / 298.257223563; // flattening
  const k0 = 0.9996; // scale factor
  const e = Math.sqrt(2 * f - f * f);
  const e2 = (e * e) / (1 - e * e);

  const x = easting - 500000;
  const y = southernHemisphere ? northing - 10000000 : northing;

  const m = y / k0;
  const mu = m / (a * (1 - (e * e) / 4 - (3 * e * e * e * e) / 64 - (5 * e * e * e * e * e * e) / 256));

  const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));

  const phi1 = mu +
    (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
    (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
    (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu);

  const c1 = e2 * Math.pow(Math.cos(phi1), 2);
  const t1 = Math.pow(Math.tan(phi1), 2);
  const r1 = a * (1 - e * e) / Math.pow(1 - e * e * Math.pow(Math.sin(phi1), 2), 1.5);
  const d1 = a / Math.sqrt(1 - e * e * Math.pow(Math.sin(phi1), 2));

  const d = x / (d1 * k0);

  const latRad = phi1 - (d1 * Math.tan(phi1) / r1) * (
    Math.pow(d, 2) / 2 -
    (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * e2) * Math.pow(d, 4) / 24 +
    (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * e2 - 3 * c1 * c1) * Math.pow(d, 6) / 720
  );

  const centralMeridian = (zone - 1) * 6 - 180 + 3;
  const lngRad = (centralMeridian * Math.PI / 180) + (
    d -
    (1 + 2 * t1 + c1) * Math.pow(d, 3) / 6 +
    (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * e2 + 24 * t1 * t1) * Math.pow(d, 5) / 120
  ) / Math.cos(phi1);

  let lat = latRad * (180 / Math.PI);
  let lng = lngRad * (180 / Math.PI);

  if (datum === 'SAD-69') {
    // Offset típico SAD-69 para SIRGAS-2000 / WGS-84 na América do Sul (~65m)
    lat -= 0.00055;
    lng -= 0.00050;
  }

  return { lat, lng };
}

// Calculate Haversine distance in meters between two lat/lng points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Map Bounds Fitter & Interactive Zoom Control Helper
function MapController({ 
  selectedPoint, 
  points,
  zoomTrigger
}: { 
  selectedPoint: ProjectAlignmentPoint | null; 
  points: ProjectAlignmentPoint[];
  zoomTrigger: { type: 'in' | 'out' | 'fit' | 'selected'; id: number } | null;
}) {
  const map = useMap();

  // Initial bounds fit
  useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, points]);

  // Selected point fly-to
  useEffect(() => {
    if (selectedPoint) {
      map.flyTo([selectedPoint.lat, selectedPoint.lng], 20, { duration: 1 });
    }
  }, [selectedPoint, map]);

  // Interactive zoom triggers
  useEffect(() => {
    if (!zoomTrigger) return;
    if (zoomTrigger.type === 'in') {
      map.zoomIn();
    } else if (zoomTrigger.type === 'out') {
      map.zoomOut();
    } else if (zoomTrigger.type === 'fit') {
      if (points && points.length > 0) {
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      }
    } else if (zoomTrigger.type === 'selected' && selectedPoint) {
      map.flyTo([selectedPoint.lat, selectedPoint.lng], 20, { duration: 1 });
    }
  }, [zoomTrigger, map, points, selectedPoint]);

  return null;
}

// Station Search Box Component (Buscar estaca e aplicar zoom 17 no Mapa e Perfil Vertical)
function StationSearchBox({
  points,
  onSelectStation
}: {
  points: ProjectAlignmentPoint[];
  onSelectStation: (point: ProjectAlignmentPoint) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const matchedPoints = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    return points.filter(p => 
      p.station.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.type && p.type.toLowerCase().includes(term))
    ).slice(0, 10);
  }, [points, searchTerm]);

  const handleSelect = (pt: ProjectAlignmentPoint) => {
    onSelectStation(pt);
    setSearchTerm(`Estaca ${pt.station}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && matchedPoints.length > 0) {
      handleSelect(matchedPoints[0]);
    }
  };

  return (
    <div className="relative w-full sm:w-80">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-emerald-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar estaca (ex: 10+00, 15)..."
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/90 text-xs font-black text-white placeholder-slate-400 shadow-2xl focus:outline-none focus:border-emerald-500 transition-all"
        />
        {searchTerm ? (
          <button
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <span className="absolute right-3 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Zoom 20
          </span>
        )}
      </div>

      {/* Auto-complete Dropdown */}
      {isOpen && matchedPoints.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[2000] bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-800/80 max-h-64 overflow-y-auto custom-scrollbar">
          {matchedPoints.map(pt => (
            <button
              key={pt.id}
              onClick={() => handleSelect(pt)}
              className="w-full px-4 py-3 text-left hover:bg-slate-800 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="font-black text-white text-xs block">Estaca {pt.station}</span>
                  {pt.description && <span className="text-[10px] text-slate-400">{pt.description}</span>}
                </div>
              </div>
              <div className="text-right">
                {pt.elevation !== undefined && !isNaN(pt.elevation) && (
                  <span className="text-xs text-emerald-400 font-mono font-black block">{pt.elevation.toFixed(2)} m</span>
                )}
                <span className="text-[9px] text-blue-400 uppercase font-extrabold">{pt.type || 'PI'}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// VERTICAL PROFILE (PERFIL VERTICAL DO TRAÇADO COM ZOOM E AUTO-SCROLL)
function VerticalProfileChart({
  points,
  selectedPointId,
  onSelectPoint
}: {
  points: ProjectAlignmentPoint[];
  selectedPointId: string | null;
  onSelectPoint: (point: ProjectAlignmentPoint) => void;
}) {
  const [zoomX, setZoomX] = useState<number>(1);
  const [zoomY, setZoomY] = useState<number>(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const profilePointsWithElev = useMemo(() => {
    let currentDist = 0;
    return points.map((p, idx) => {
      if (idx > 0) {
        const prev = points[idx - 1];
        const distM = haversineDistance(prev.lat, prev.lng, p.lat, p.lng);
        currentDist += distM;
      }
      return {
        point: p,
        cumulativeDistMeters: currentDist,
        elevation: p.elevation !== undefined && !isNaN(p.elevation) ? p.elevation : null
      };
    }).filter(p => p.elevation !== null) as { point: ProjectAlignmentPoint; cumulativeDistMeters: number; elevation: number }[];
  }, [points]);

  const minElev = useMemo(() => profilePointsWithElev.length ? Math.min(...profilePointsWithElev.map(p => p.elevation)) : 0, [profilePointsWithElev]);
  const maxElev = useMemo(() => profilePointsWithElev.length ? Math.max(...profilePointsWithElev.map(p => p.elevation)) : 10, [profilePointsWithElev]);
  const totalLength = useMemo(() => profilePointsWithElev.length ? profilePointsWithElev[profilePointsWithElev.length - 1].cumulativeDistMeters : 1, [profilePointsWithElev]);

  const baseSvgWidth = 950;
  const svgWidth = baseSvgWidth * zoomX;
  const svgHeight = 280;
  const padding = { top: 40, right: 50, bottom: 55, left: 70 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const elevRange = Math.max(maxElev - minElev, 1);
  const yPadding = (elevRange * 0.15) / zoomY;
  const yMin = minElev - yPadding;
  const yMax = maxElev + yPadding;

  const getX = (dist: number) => padding.left + (dist / (totalLength || 1)) * graphWidth;
  const getY = (elev: number) => padding.top + graphHeight - ((elev - yMin) / ((yMax - yMin) || 1)) * graphHeight;

  const linePath = profilePointsWithElev.reduce((acc, p, i) => {
    const x = getX(p.cumulativeDistMeters);
    const y = getY(p.elevation);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaPath = `${linePath} L ${getX(totalLength)} ${padding.top + graphHeight} L ${padding.left} ${padding.top + graphHeight} Z`;

  const selectedProfilePt = profilePointsWithElev.find(p => p.point.id === selectedPointId);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoomX(prev => Math.min(20, Math.max(0.5, prev * zoomFactor)));
    };

    let isPanning = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleMouseDown = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        isPanning = true;
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
        container.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e) => {
      if (!isPanning) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = (e) => {
      if (e.button === 1 && isPanning) {
        isPanning = false;
        container.style.cursor = "auto";
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Auto-scroll and apply Zoom 10 on vertical profile when selectedPointId changes
  useEffect(() => {
    if (selectedPointId) {
      setZoomX(10);
    }
  }, [selectedPointId]);

  useEffect(() => {
    if (selectedProfilePt && scrollContainerRef.current) {
      const selectedX = getX(selectedProfilePt.cumulativeDistMeters);
      const containerWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: selectedX - containerWidth / 2,
        behavior: 'smooth'
      });
    }
  }, [selectedPointId, zoomX, selectedProfilePt]);

  // Handle mouse wheel zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) return; // Allow horizontal scrolling with shift key
      e.preventDefault();
      
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      // Also adjust zoom sensitivity for trackpads (smaller deltaY means smaller steps if desired, but fixed steps are fine)
      setZoomX(prev => Math.min(20, Math.max(0.75, parseFloat((prev + delta).toFixed(2)))));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  if (profilePointsWithElev.length < 2) {
    return (
      <div className="bg-slate-900 rounded-[28px] border border-slate-800 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-black text-white">Perfil Vertical / Altimétrico</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Se o arquivo importado mantiver a coluna de <strong>COTA</strong> (elevação em metros), o perfil vertical é gerado automaticamente aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-[32px] border border-slate-800 p-6 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Header do Perfil Vertical com Controles de Zoom */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">Perfil Altimétrico / Vertical do Traçado</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                {profilePointsWithElev.length} Cotas
              </span>
            </div>
            <p className="text-xs text-slate-400">Desenho altimétrico contínuo com suporte a Zoom e Exagero Vertical</p>
          </div>
        </div>

        {/* Controles de Zoom do Perfil Vertical */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold text-slate-300">
            <span className="px-2.5 text-[10px] font-black uppercase text-slate-400">Zoom Perfil (X):</span>
            <button
              onClick={() => setZoomX(prev => Math.max(0.75, parseFloat((prev - 0.25).toFixed(2))))}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              title="Afastar Zoom Horizontal (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-black text-emerald-400">{zoomX.toFixed(2)}x</span>
            <button
              onClick={() => setZoomX(prev => Math.min(4, parseFloat((prev + 0.25).toFixed(2))))}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              title="Aproximar Zoom Horizontal (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold text-slate-300">
            <span className="px-2.5 text-[10px] font-black uppercase text-slate-400">Exagero (Y):</span>
            {[1, 2, 4, 8].map(y => (
              <button
                key={y}
                onClick={() => setZoomY(y)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all ${
                  zoomY === y ? 'bg-emerald-500 text-slate-950 shadow' : 'hover:bg-slate-800 text-slate-400'
                }`}
              >
                {y}x
              </button>
            ))}
          </div>

          {(zoomX !== 1 || zoomY !== 1) && (
            <button
              onClick={() => { setZoomX(1); setZoomY(1); }}
              className="p-2 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Redefinir Zoom do Perfil"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="hidden xl:flex items-center gap-3 text-xs font-bold text-slate-300 bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-800">
            <div>Min: <strong className="text-emerald-400 font-black">{minElev.toFixed(1)}m</strong></div>
            <div className="w-px h-3 bg-slate-800" />
            <div>Max: <strong className="text-blue-400 font-black">{maxElev.toFixed(1)}m</strong></div>
          </div>
        </div>
      </div>

      {/* SVG Container do Perfil com Scroll Horizontal Responsivo */}
      <div ref={scrollContainerRef} className="relative overflow-x-auto custom-scrollbar">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: `${100 * zoomX}%`, minWidth: '700px' }} className="h-auto select-none">
          <defs>
            <linearGradient id="profileAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="profileLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Grade Horizontal de Elevações (Y) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const elevVal = yMin + ratio * (yMax - yMin);
            const yPos = getY(elevVal);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={padding.left + graphWidth}
                  y2={yPos}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 10}
                  y={yPos + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  {elevVal.toFixed(1)} m
                </text>
              </g>
            );
          })}

          {/* Grade Vertical de Estacas / Quilometragem (X) */}
          {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((ratio, i) => {
            const distVal = ratio * totalLength;
            const xPos = getX(distVal);
            return (
              <g key={`x-${i}`}>
                <line
                  x1={xPos}
                  y1={padding.top}
                  x2={xPos}
                  y2={padding.top + graphHeight}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={xPos}
                  y={padding.top + graphHeight + 18}
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {(distVal / 1000).toFixed(2)} km
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#profileAreaGrad)" />
          <path d={linePath} fill="none" stroke="url(#profileLineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Pontos de Vértice no Perfil Vertical */}
          {profilePointsWithElev.map((p) => {
            const x = getX(p.cumulativeDistMeters);
            const y = getY(p.elevation);
            const isSelected = p.point.id === selectedPointId;

            return (
              <g key={p.point.id} className="cursor-pointer group" onClick={() => onSelectPoint(p.point)}>
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 6 : 1.5}
                  fill={isSelected ? '#f59e0b' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 2 : 1}
                />
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={16}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                )}
              </g>
            );
          })}

          {/* Linha de Destaque da Estaca Selecionada */}
          {selectedProfilePt && (
            <g>
              <line
                x1={getX(selectedProfilePt.cumulativeDistMeters)}
                y1={padding.top}
                x2={getX(selectedProfilePt.cumulativeDistMeters)}
                y2={padding.top + graphHeight}
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />
              <rect
                x={Math.min(Math.max(getX(selectedProfilePt.cumulativeDistMeters) - 65, padding.left), svgWidth - 140)}
                y={padding.top - 30}
                width="130"
                height="24"
                rx="8"
                fill="#0f172a"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              <text
                x={Math.min(Math.max(getX(selectedProfilePt.cumulativeDistMeters) - 65, padding.left) + 65, svgWidth - 75)}
                y={padding.top - 14}
                fill="#f59e0b"
                fontSize="10"
                fontWeight="black"
                textAnchor="middle"
              >
                Estaca {selectedProfilePt.point.station} • {selectedProfilePt.elevation.toFixed(2)} m
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
        <span>Clique em qualquer cota do perfil para sincronizar e focar a estaca no mapa (Zoom 17).</span>
        <span className="text-emerald-400 font-bold">Zoom Horizontal ({zoomX.toFixed(2)}x) | Exagero Vertical ({zoomY}x)</span>
      </div>
    </div>
  );
}

interface ProjectAlignmentViewProps {
  contract: Contract;
  projectAlignments?: ProjectAlignment[];
  onSaveProjectAlignment?: (alignment: ProjectAlignment) => void;
  onDeleteProjectAlignment?: (alignmentId: string) => void;
}

export function ProjectAlignmentView({
  contract,
  projectAlignments = [],
  onSaveProjectAlignment,
  onDeleteProjectAlignment
}: ProjectAlignmentViewProps) {
  // Current active alignment for this contract or newly uploaded
  const currentAlignment = useMemo(() => {
    const a = projectAlignments.find(a => a.contractId === contract.id) || projectAlignments[0];
    if (a && !a.points) return { ...a, points: [] };
    return a;
  }, [projectAlignments, contract.id]);

  // CAD Visualization Settings (Loaded from localStorage)
  const [cadSettings, setCadSettings] = useState<CadViewSettings>(loadCadSettings);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(14);

  // Automatically persist settings to localStorage whenever changed
  useEffect(() => {
    saveCadSettings(cadSettings);
  }, [cadSettings]);

  const [utmZone, setUtmZone] = useState<number>(23);
  const [coordinateType, setCoordinateType] = useState<'UTM' | 'LAT_LNG'>('UTM');
  const [selectedDatum, setSelectedDatum] = useState<'SIRGAS 2000' | 'SAD-69'>('SIRGAS 2000');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);

  // Cross-highlighting & Zoom State
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [zoomTrigger, setZoomTrigger] = useState<{ type: 'in' | 'out' | 'fit' | 'selected'; id: number } | null>(null);

  const selectedPoint = useMemo(() => {
    if (!currentAlignment || !selectedPointId) return null;
    return currentAlignment.points.find(p => p.id === selectedPointId) || null;
  }, [currentAlignment, selectedPointId]);

  // Visual Importer Modal State (rh-like multi step)
  const [showImportExportModal, setShowImportExportModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawExcelHeaders, setRawExcelHeaders] = useState<string[]>([]);
  const [rawExcelRows, setRawExcelRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    station: string;
    lat: string;
    lng: string;
    utmx: string;
    utmy: string;
    radius: string;
    type: string;
    desc: string;
    elevation: string;
  }>({
    station: '',
    lat: '',
    lng: '',
    utmx: '',
    utmy: '',
    radius: '',
    type: '',
    desc: '',
    elevation: ''
  });
  const [parsedPreviewPoints, setParsedPreviewPoints] = useState<ProjectAlignmentPoint[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  // KML Export Modal State
  const [showKmlModal, setShowKmlModal] = useState<boolean>(false);
  const [kmlOptions, setKmlOptions] = useState({
    includeAlignmentLine: true,
    includeStations: true,
    includePins: true,
    includeMeasurements: true
  });

  // Sidebar Tool States (Menu Lateral)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'pins' | 'measure' | 'layers' | 'settings'>('pins');
  const [activeTool, setActiveTool] = useState<'none' | 'pin' | 'measure'>('none');

  // Pins State
  const [pins, setPins] = useState<ProjectPin[]>(() => currentAlignment?.pins || []);
  const [pinFormModal, setPinFormModal] = useState<{
    isOpen: boolean;
    lat: number;
    lng: number;
    title: string;
    category: ProjectPin['category'];
    color: string;
    station: string;
    notes: string;
    editingPinId?: string;
  }>({
    isOpen: false,
    lat: 0,
    lng: 0,
    title: '',
    category: 'obras_arte',
    color: 'red',
    station: '',
    notes: ''
  });

  // Ruler / Measurements State
  const [currentMeasurePoints, setCurrentMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [savedMeasurements, setSavedMeasurements] = useState<ProjectMeasurement[]>(() => currentAlignment?.savedMeasurements || []);
  const [measureTitle, setMeasureTitle] = useState<string>('');

  // Sync pins and saved measurements if alignment changes
  useEffect(() => {
    if (currentAlignment?.pins) setPins(currentAlignment.pins);
    if (currentAlignment?.savedMeasurements) setSavedMeasurements(currentAlignment.savedMeasurements);
  }, [currentAlignment]);

  // Save changes to current alignment
  const updateAlignmentData = (newPins: ProjectPin[], newMeasurements: ProjectMeasurement[]) => {
    if (!currentAlignment || !onSaveProjectAlignment) return;
    const updated: ProjectAlignment = {
      ...currentAlignment,
      pins: newPins,
      savedMeasurements: newMeasurements
    };
    onSaveProjectAlignment(updated);
  };

  // Download Sample Excel Template for Traçado Horizontal
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        Estaca: '0+000',
        Km: 0.000,
        Latitude: -23.550520,
        Longitude: -46.633308,
        UTM_X: 333200.50,
        UTM_Y: 7394800.10,
        Raio_m: 0,
        Tipo_Elemento: 'PI',
        Descricao: 'Estaca Inicial - Início da Obra'
      },
      {
        Estaca: '0+10,00',
        Km: 0.200,
        Latitude: -23.551800,
        Longitude: -46.631500,
        UTM_X: 333380.00,
        UTM_Y: 7394660.00,
        Raio_m: 350,
        Tipo_Elemento: 'PC',
        Descricao: 'Início Curva C1 (Direita)'
      },
      {
        Estaca: '0+25,12',
        Km: 0.512,
        Latitude: -23.553500,
        Longitude: -46.629000,
        UTM_X: 333630.00,
        UTM_Y: 7394470.00,
        Raio_m: 350,
        Tipo_Elemento: 'PI',
        Descricao: 'Vértice PI-01 Curva C1'
      },
      {
        Estaca: '0+40,00',
        Km: 0.800,
        Latitude: -23.555200,
        Longitude: -46.626500,
        UTM_X: 333890.00,
        UTM_Y: 7394280.00,
        Raio_m: 350,
        Tipo_Elemento: 'PT',
        Descricao: 'Fim Curva C1 / Início Tangente T2'
      },
      {
        Estaca: '1+05,00',
        Km: 1.100,
        Latitude: -23.557800,
        Longitude: -46.623000,
        UTM_X: 334250.00,
        UTM_Y: 7393990.00,
        Raio_m: 500,
        Tipo_Elemento: 'PC',
        Descricao: 'Início Curva C2 (Esquerda)'
      },
      {
        Estaca: '1+30,00',
        Km: 1.600,
        Latitude: -23.561000,
        Longitude: -46.619000,
        UTM_X: 334660.00,
        UTM_Y: 7393630.00,
        Raio_m: 500,
        Tipo_Elemento: 'PI',
        Descricao: 'Vértice PI-02'
      },
      {
        Estaca: '2+00,00',
        Km: 2.000,
        Latitude: -23.563800,
        Longitude: -46.615500,
        UTM_X: 335020.00,
        UTM_Y: 7393320.00,
        Raio_m: 0,
        Tipo_Elemento: 'PT',
        Descricao: 'Fim de Traçado Provisório / Estaca Final'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tracado_Horizontal');

    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, 
      { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 15 }, { wch: 35 }
    ];

    XLSX.writeFile(wb, `Modelo_Tracado_Horizontal_${contract.workName || 'Obra'}.xlsx`);
  };

  const handleKmlImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const xml = evt.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const coordsNodes = Array.from(doc.getElementsByTagName('coordinates'));
        
        let newPoints: ProjectAlignmentPoint[] = [];
        let idCounter = 1;

        coordsNodes.forEach(coordNode => {
           const coordsText = coordNode.textContent?.trim().split(/\s+/);
           coordsText?.forEach(c => {
              const parts = c.split(',');
              if (parts.length >= 2) {
                 newPoints.push({
                   id: `kml-pt-${idCounter}-${Date.now()}`,
                   station: `KML ${idCounter}`,
                   lat: parseFloat(parts[1]),
                   lng: parseFloat(parts[0]),
                   elevation: parts.length > 2 ? parseFloat(parts[2]) : undefined,
                   type: 'PI'
                 });
                 idCounter++;
              }
           });
        });

        if (newPoints.length === 0) {
          throw new Error("Nenhuma coordenada encontrada no arquivo KML.");
        }

        const newAlignment: ProjectAlignment = {
          id: currentAlignment?.id || `align-${Date.now()}`,
          contractId: contract.id,
          name: file.name.replace('.kml', ''),
          points: newPoints,
          pins: currentAlignment?.pins || [],
          savedMeasurements: currentAlignment?.savedMeasurements || [],
          updatedAt: new Date().toISOString()
        };

        if (onSaveProjectAlignment) {
          onSaveProjectAlignment(newAlignment);
        }
        
        setShowImportExportModal(false);
        setSaveSuccessMessage("KML importado com sucesso!");
        setTimeout(() => setSaveSuccessMessage(null), 3000);

      } catch (err: any) {
        alert("Erro ao importar KML: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Step 1: Handle File Selection for Visual Importer
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawData || rawData.length === 0) {
          throw new Error('O arquivo de planilha está vazio.');
        }

        const headers = Object.keys(rawData[0]);
        setRawExcelHeaders(headers);
        setRawExcelRows(rawData);

        // Auto-detect columns
        const autoMap = { station: '', lat: '', lng: '', utmx: '', utmy: '', radius: '', type: '', desc: '', elevation: '', complementaryInfo: '' };
        let detectedUtm = false;

        headers.forEach(h => {
          const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (['estaca', 'station', 'st', 'km', 'estacamento'].some(k => lower.includes(k)) && !autoMap.station) autoMap.station = h;
          
          if (['norte', 'northing', 'utmy'].some(k => lower.includes(k)) && !autoMap.utmy) {
            autoMap.utmy = h;
            detectedUtm = true;
          }
          if (['este', 'leste', 'easting', 'utmx'].some(k => lower.includes(k)) && !autoMap.utmx) {
            autoMap.utmx = h;
            detectedUtm = true;
          }
          if (['latitude', 'lat'].some(k => lower.includes(k)) && !autoMap.lat && !lower.includes('utm') && !lower.includes('norte')) autoMap.lat = h;
          if (['longitude', 'lng', 'lon'].some(k => lower.includes(k)) && !autoMap.lng && !lower.includes('utm') && !lower.includes('este') && !lower.includes('leste')) autoMap.lng = h;
          
          if (['raio', 'radius', 'r'].some(k => lower.includes(k)) && !autoMap.radius) autoMap.radius = h;
          if (['tipo', 'type', 'elemento'].some(k => lower.includes(k)) && !autoMap.type) autoMap.type = h;
          if (['info', 'complementar', 'complemento'].some(k => lower.includes(k)) && !autoMap.complementaryInfo) autoMap.complementaryInfo = h;
          if (['desc', 'descricao', 'obs', 'observacao', 'notas'].some(k => lower.includes(k)) && !autoMap.desc) autoMap.desc = h;
          if (['cota', 'elevacao', 'z', 'alt', 'altitude'].some(k => lower.includes(k)) && !autoMap.elevation) autoMap.elevation = h;
        });

        if (detectedUtm) setCoordinateType('UTM');
        setColumnMapping(autoMap);
        setImportStep(2); // Move to Column Mapping Step
      } catch (err: any) {
        setImportError(err.message || 'Erro ao ler arquivo Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Step 2 -> Step 3: Process Column Mapping into Preview Points
  const handleProcessMapping = () => {
    setImportError(null);
    const parsedPoints: ProjectAlignmentPoint[] = [];

    // Robust PT-BR Decimal Formatting Helper
    const parsePtBrFloat = (val: any): number => {
      if (val === undefined || val === null || val === '') return NaN;
      if (typeof val === 'number') return isFinite(val) ? val : NaN;
      
      let str = String(val).trim().replace(/\s+/g, '');
      if (!str) return NaN;

      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');

      if (lastDot !== -1 && lastComma !== -1) {
        if (lastComma > lastDot) {
          str = str.replace(/\./g, '').replace(',', '.');
        } else {
          str = str.replace(/,/g, '');
        }
      } else if (lastComma !== -1) {
        str = str.replace(',', '.');
      } else if (lastDot !== -1) {
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1) {
          str = str.replace(/\./g, '');
        }
      }

      const match = str.match(/[-+]?[0-9]*\.?[0-9]+/);
      if (!match) return NaN;
      return parseFloat(match[0]);
    };

    rawExcelRows.forEach((row, index) => {
      const rawStation = columnMapping.station ? row[columnMapping.station] : `E-${index}`;
      const rawLat = columnMapping.lat ? row[columnMapping.lat] : undefined;
      const rawLng = columnMapping.lng ? row[columnMapping.lng] : undefined;
      const rawUTMX = columnMapping.utmx ? row[columnMapping.utmx] : undefined;
      const rawUTMY = columnMapping.utmy ? row[columnMapping.utmy] : undefined;
      const rawRadius = columnMapping.radius ? row[columnMapping.radius] : undefined;
      const rawType = columnMapping.type ? row[columnMapping.type] : undefined;
      const rawDesc = columnMapping.desc ? row[columnMapping.desc] : undefined;
      const rawElev = columnMapping.elevation ? row[columnMapping.elevation] : undefined;
      const rawComp = columnMapping.complementaryInfo ? row[columnMapping.complementaryInfo] : undefined;

      // Extract trailing suffix if present in Estaca (e.g. "0+8,359 PI" -> stationCode "0+8,359", suffix "PI")
      const strStation = String(rawStation).trim();
      const stationParts = strStation.split(/\s+/);
      const stationCode = stationParts[0] || strStation;
      const stationSuffix = stationParts.length > 1 ? stationParts.slice(1).join(' ') : '';

      let latNum = parsePtBrFloat(rawLat);
      let lngNum = parsePtBrFloat(rawLng);
      let eastingNum = parsePtBrFloat(rawUTMX);
      let northingNum = parsePtBrFloat(rawUTMY);
      let elevNum = parsePtBrFloat(rawElev);
      let radiusNum = parsePtBrFloat(rawRadius);

      // Fallback if utmy/utmx mapped via lat/lng selects
      if (coordinateType === 'UTM') {
        if (isNaN(eastingNum) && !isNaN(lngNum)) eastingNum = lngNum;
        if (isNaN(northingNum) && !isNaN(latNum)) northingNum = latNum;

        if (!isNaN(eastingNum) && !isNaN(northingNum)) {
          const converted = utmToLatLng(eastingNum, northingNum, utmZone, true, selectedDatum);
          latNum = converted.lat;
          lngNum = converted.lng;
        }
      }

      if (!isNaN(latNum) && !isNaN(lngNum) && Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180) {
        const compText = rawComp ? String(rawComp).trim() : stationSuffix;
        const typeText = rawType ? String(rawType).toUpperCase().trim() : (stationSuffix || 'PI');

        parsedPoints.push({
          id: `pt-${index}-${Date.now()}`,
          station: stationCode,
          lat: latNum,
          lng: lngNum,
          easting: !isNaN(eastingNum) ? eastingNum : undefined,
          northing: !isNaN(northingNum) ? northingNum : undefined,
          radius: !isNaN(radiusNum) ? radiusNum : undefined,
          type: typeText,
          description: rawDesc ? String(rawDesc).trim() : undefined,
          elevation: !isNaN(elevNum) ? elevNum : undefined,
          complementaryInfo: compText || undefined
        });
      }
    });

    if (parsedPoints.length === 0) {
      setImportError(`Não foi possível identificar coordenadas válidas para o formato ${coordinateType === 'UTM' ? 'UTM (Metros)' : 'Lat/Lng (Graus)'}. Verifique se as colunas selecionadas contêm números válidos com vírgula (,) ou ponto (.) decimal.`);
      return;
    }

    setParsedPreviewPoints(parsedPoints);
    setImportStep(3); // Move to Preview & Confirm Step
  };

  // Step 3: Finalize Import & Save Alignment
  const handleFinalizeImport = () => {
    if (parsedPreviewPoints.length === 0) return;

    let totalLen = 0;
    for (let i = 1; i < parsedPreviewPoints.length; i++) {
      totalLen += haversineDistance(
        parsedPreviewPoints[i - 1].lat, parsedPreviewPoints[i - 1].lng,
        parsedPreviewPoints[i].lat, parsedPreviewPoints[i].lng
      );
    }

    const newAlignment: ProjectAlignment = {
      id: `proj-${Date.now()}`,
      contractId: contract.id,
      contractName: contract.workName || contract.client || 'Sem Nome',
      title: `Traçado Horizontal - ${selectedFile?.name.replace(/\.[^/.]+$/, '') || 'Novo Traçado'}`,
      highwayCode: contract.contractNumber || 'TRECHO-01',
      importedAt: new Date().toISOString(),
      fileName: selectedFile?.name || 'planilha.xlsx',
      totalLengthMeters: Math.round(totalLen * 100) / 100,
      startStation: parsedPreviewPoints[0]?.station || '0+000',
      endStation: parsedPreviewPoints[parsedPreviewPoints.length - 1]?.station || `E-${parsedPreviewPoints.length}`,
      points: parsedPreviewPoints,
      pins: pins,
      savedMeasurements: savedMeasurements
    };

    if (onSaveProjectAlignment) {
      onSaveProjectAlignment(newAlignment);
    }

    setSaveSuccessMessage(`✅ Dados do Traçado gravados com sucesso no banco de dados! Foram salvas ${parsedPreviewPoints.length} estacas (${Math.round(totalLen)} metros de extensão).`);
    setShowImportModal(false);
    setImportStep(1);
    setSelectedFile(null);

    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 8000);
  };

  // Measure Tools: Add Point to Active Measurement
  const handleAddMeasurePoint = (lat: number, lng: number) => {
    setCurrentMeasurePoints(prev => [...prev, { lat, lng }]);
  };

  // Measure Tools: Calculate active total measurement distance in meters
  const activeMeasureDistance = useMemo(() => {
    if (currentMeasurePoints.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < currentMeasurePoints.length; i++) {
      dist += haversineDistance(
        currentMeasurePoints[i - 1].lat, currentMeasurePoints[i - 1].lng,
        currentMeasurePoints[i].lat, currentMeasurePoints[i].lng
      );
    }
    return Math.round(dist * 100) / 100;
  }, [currentMeasurePoints]);

  // Save Active Measurement
  const handleSaveMeasurement = () => {
    if (currentMeasurePoints.length < 2) return;
    const title = measureTitle.trim() || `Medição ${savedMeasurements.length + 1}`;
    const newMeasure: ProjectMeasurement = {
      id: `meas-${Date.now()}`,
      contractId: contract.id,
      alignmentId: currentAlignment?.id,
      title,
      totalDistanceMeters: activeMeasureDistance,
      points: currentMeasurePoints,
      createdAt: new Date().toISOString()
    };
    const updated = [...savedMeasurements, newMeasure];
    setSavedMeasurements(updated);
    updateAlignmentData(pins, updated);
    setCurrentMeasurePoints([]);
    setMeasureTitle('');
  };

  // Delete Saved Measurement
  const handleDeleteMeasurement = (id: string) => {
    const updated = savedMeasurements.filter(m => m.id !== id);
    setSavedMeasurements(updated);
    updateAlignmentData(pins, updated);
  };

  // Pin Tools: Click on Map to Drop Pin
  const handleAddPinClick = (lat: number, lng: number) => {
    setPinFormModal({
      isOpen: true,
      lat,
      lng,
      title: '',
      category: 'obras_arte',
      color: 'red',
      station: '',
      notes: ''
    });
  };

  // Save Pin Form
  const handleSavePin = () => {
    if (!pinFormModal.title.trim()) return;

    if (pinFormModal.editingPinId) {
      const updated = pins.map(p => p.id === pinFormModal.editingPinId ? {
        ...p,
        title: pinFormModal.title,
        category: pinFormModal.category,
        color: pinFormModal.color,
        station: pinFormModal.station,
        notes: pinFormModal.notes
      } : p);
      setPins(updated);
      updateAlignmentData(updated, savedMeasurements);
    } else {
      const newPin: ProjectPin = {
        id: `pin-${Date.now()}`,
        contractId: contract.id,
        alignmentId: currentAlignment?.id,
        title: pinFormModal.title.trim(),
        category: pinFormModal.category,
        color: pinFormModal.color,
        lat: pinFormModal.lat,
        lng: pinFormModal.lng,
        station: pinFormModal.station.trim() || undefined,
        notes: pinFormModal.notes.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      const updated = [...pins, newPin];
      setPins(updated);
      updateAlignmentData(updated, savedMeasurements);
    }

    setPinFormModal(prev => ({ ...prev, isOpen: false }));
    setActiveTool('none');
  };

  // Delete Pin
  const handleDeletePin = (pinId: string) => {
    const updated = pins.filter(p => p.id !== pinId);
    setPins(updated);
    updateAlignmentData(updated, savedMeasurements);
    setSaveSuccessMessage('✅ Alfinete removido com sucesso.');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Export SQL Script as .txt file for Sala Técnica / Database Persistence
  const handleExportSqlScriptTxt = () => {
    if (!currentAlignment) {
      setSaveSuccessMessage('⚠️ Nenhum traçado horizontal está carregado no momento.');
      return;
    }

    const sanitizeSql = (val: any): string => {
      if (val === undefined || val === null) return 'NULL';
      if (typeof val === 'number') return isFinite(val) ? String(val) : 'NULL';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      const str = String(val).replace(/'/g, "''");
      return `'${str}'`;
    };

    const workName = contract.workName || contract.client || 'Obra';
    const contractNo = contract.contractNumber || 'TRECHO-01';

    let sql = `-- =============================================================================\n`;
    sql += `-- SCRIPT DE BANCO DE DADOS - SALA TÉCNICA / PROJETO DE TRAÇADO HORIZONTAL\n`;
    sql += `-- Obra: ${workName}\n`;
    sql += `-- Contrato: ${contractNo}\n`;
    sql += `-- Data de Geração: ${new Date().toLocaleString('pt-BR')}\n`;
    sql += `-- =============================================================================\n\n`;

    sql += `-- 1. CRIAÇÃO DA ESTRUTURA DE TABELAS (DDL)\n`;
    sql += `CREATE TABLE IF NOT EXISTS project_alignments (\n`;
    sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
    sql += `  contract_id VARCHAR(64) NOT NULL,\n`;
    sql += `  contract_name VARCHAR(255),\n`;
    sql += `  title VARCHAR(255) NOT NULL,\n`;
    sql += `  highway_code VARCHAR(64),\n`;
    sql += `  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  file_name VARCHAR(255),\n`;
    sql += `  total_length_meters NUMERIC(12,2),\n`;
    sql += `  start_station VARCHAR(32),\n`;
    sql += `  end_station VARCHAR(32)\n`;
    sql += `);\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS project_alignment_points (\n`;
    sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
    sql += `  alignment_id VARCHAR(64) REFERENCES project_alignments(id) ON DELETE CASCADE,\n`;
    sql += `  point_order INT NOT NULL,\n`;
    sql += `  station VARCHAR(32) NOT NULL,\n`;
    sql += `  latitude NUMERIC(10,8) NOT NULL,\n`;
    sql += `  longitude NUMERIC(11,8) NOT NULL,\n`;
    sql += `  easting NUMERIC(12,3),\n`;
    sql += `  northing NUMERIC(12,3),\n`;
    sql += `  elevation NUMERIC(8,3),\n`;
    sql += `  radius NUMERIC(10,2),\n`;
    sql += `  element_type VARCHAR(16),\n`;
    sql += `  description TEXT,\n`;
    sql += `  complementary_info TEXT\n`;
    sql += `);\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS project_pins (\n`;
    sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
    sql += `  contract_id VARCHAR(64) NOT NULL,\n`;
    sql += `  alignment_id VARCHAR(64),\n`;
    sql += `  title VARCHAR(255) NOT NULL,\n`;
    sql += `  category VARCHAR(64),\n`;
    sql += `  color VARCHAR(32),\n`;
    sql += `  latitude NUMERIC(10,8) NOT NULL,\n`;
    sql += `  longitude NUMERIC(11,8) NOT NULL,\n`;
    sql += `  station VARCHAR(32),\n`;
    sql += `  notes TEXT,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS project_measurements (\n`;
    sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
    sql += `  contract_id VARCHAR(64) NOT NULL,\n`;
    sql += `  alignment_id VARCHAR(64),\n`;
    sql += `  title VARCHAR(255) NOT NULL,\n`;
    sql += `  total_distance_meters NUMERIC(12,2),\n`;
    sql += `  points_json TEXT,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS cad_visualization_settings (\n`;
    sql += `  contract_id VARCHAR(64) PRIMARY KEY,\n`;
    sql += `  enable_google_maps BOOLEAN,\n`;
    sql += `  google_maps_layer_type VARCHAR(32),\n`;
    sql += `  canvas_bg_color VARCHAR(16),\n`;
    sql += `  centerline_color VARCHAR(16),\n`;
    sql += `  centerline_weight INT,\n`;
    sql += `  centerline_dash_array VARCHAR(32),\n`;
    sql += `  show_stations BOOLEAN,\n`;
    sql += `  min_station_zoom INT,\n`;
    sql += `  station_tick_color VARCHAR(16),\n`;
    sql += `  station_text_color VARCHAR(16),\n`;
    sql += `  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    sql += `-- 2. INSERÇÃO E SINCRO DE DADOS DO PROJETO (DML)\n`;
    sql += `INSERT INTO project_alignments (\n`;
    sql += `  id, contract_id, contract_name, title, highway_code, imported_at, file_name, total_length_meters, start_station, end_station\n`;
    sql += `) VALUES (\n`;
    sql += `  ${sanitizeSql(currentAlignment.id)}, ${sanitizeSql(contract.id)}, ${sanitizeSql(workName)}, ${sanitizeSql(currentAlignment.title)}, ${sanitizeSql(currentAlignment.highwayCode)},\n`;
    sql += `  ${sanitizeSql(currentAlignment.importedAt)}, ${sanitizeSql(currentAlignment.fileName)}, ${sanitizeSql(currentAlignment.totalLengthMeters)}, ${sanitizeSql(currentAlignment.startStation)}, ${sanitizeSql(currentAlignment.endStation)}\n`;
    sql += `) ON CONFLICT (id) DO UPDATE SET\n`;
    sql += `  title = EXCLUDED.title,\n`;
    sql += `  total_length_meters = EXCLUDED.total_length_meters,\n`;
    sql += `  start_station = EXCLUDED.start_station,\n`;
    sql += `  end_station = EXCLUDED.end_station;\n\n`;

    if (currentAlignment.points && currentAlignment.points?.length > 0) {
      sql += `-- Estacas do Traçado Horizontal (${currentAlignment.points?.length} pontos)\n`;
      sql += `DELETE FROM project_alignment_points WHERE alignment_id = ${sanitizeSql(currentAlignment.id)};\n`;
      currentAlignment.points.forEach((pt, idx) => {
        sql += `INSERT INTO project_alignment_points (id, alignment_id, point_order, station, latitude, longitude, easting, northing, elevation, radius, element_type, description, complementary_info) VALUES (`;
        sql += `${sanitizeSql(pt.id)}, ${sanitizeSql(currentAlignment.id)}, ${idx + 1}, ${sanitizeSql(pt.station)}, ${sanitizeSql(pt.lat)}, ${sanitizeSql(pt.lng)}, ${sanitizeSql(pt.easting)}, ${sanitizeSql(pt.northing)}, ${sanitizeSql(pt.elevation)}, ${sanitizeSql(pt.radius)}, ${sanitizeSql(pt.type)}, ${sanitizeSql(pt.description)}, ${sanitizeSql(pt.complementaryInfo)}`;
        sql += `);\n`;
      });
      sql += `\n`;
    }

    if (pins && pins.length > 0) {
      sql += `-- Alfinetes e Ocorrências Marcadas (${pins.length} registros)\n`;
      sql += `DELETE FROM project_pins WHERE contract_id = ${sanitizeSql(contract.id)};\n`;
      pins.forEach(pin => {
        sql += `INSERT INTO project_pins (id, contract_id, alignment_id, title, category, color, latitude, longitude, station, notes, created_at) VALUES (`;
        sql += `${sanitizeSql(pin.id)}, ${sanitizeSql(contract.id)}, ${sanitizeSql(currentAlignment.id)}, ${sanitizeSql(pin.title)}, ${sanitizeSql(pin.category)}, ${sanitizeSql(pin.color)}, ${sanitizeSql(pin.lat)}, ${sanitizeSql(pin.lng)}, ${sanitizeSql(pin.station)}, ${sanitizeSql(pin.notes)}, ${sanitizeSql(pin.createdAt)}`;
        sql += `);\n`;
      });
      sql += `\n`;
    }

    if (savedMeasurements && savedMeasurements.length > 0) {
      sql += `-- Medições Salvas no Desenho (${savedMeasurements.length} registros)\n`;
      sql += `DELETE FROM project_measurements WHERE contract_id = ${sanitizeSql(contract.id)};\n`;
      savedMeasurements.forEach(m => {
        sql += `INSERT INTO project_measurements (id, contract_id, alignment_id, title, total_distance_meters, points_json, created_at) VALUES (`;
        sql += `${sanitizeSql(m.id)}, ${sanitizeSql(contract.id)}, ${sanitizeSql(currentAlignment.id)}, ${sanitizeSql(m.title)}, ${sanitizeSql(m.totalDistanceMeters)}, ${sanitizeSql(JSON.stringify(m.points))}, ${sanitizeSql(m.createdAt)}`;
        sql += `);\n`;
      });
      sql += `\n`;
    }

    sql += `-- Configurações de Visualização CAD\n`;
    sql += `INSERT INTO cad_visualization_settings (\n`;
    sql += `  contract_id, enable_google_maps, google_maps_layer_type, canvas_bg_color, centerline_color, centerline_weight, centerline_dash_array, show_stations, min_station_zoom, station_tick_color, station_text_color\n`;
    sql += `) VALUES (\n`;
    sql += `  ${sanitizeSql(contract.id)}, ${sanitizeSql(cadSettings.enableGoogleMaps)}, ${sanitizeSql(cadSettings.googleMapsLayerType)}, ${sanitizeSql(cadSettings.canvasBgColor)}, ${sanitizeSql(cadSettings.centerlineColor)}, ${sanitizeSql(cadSettings.centerlineWeight)}, ${sanitizeSql(cadSettings.centerlineDashArray)}, ${sanitizeSql(cadSettings.showStations)}, ${sanitizeSql(cadSettings.minStationZoom)}, ${sanitizeSql(cadSettings.stationTickColor)}, ${sanitizeSql(cadSettings.stationTextColor)}\n`;
    sql += `) ON CONFLICT (contract_id) DO UPDATE SET\n`;
    sql += `  enable_google_maps = EXCLUDED.enable_google_maps,\n`;
    sql += `  canvas_bg_color = EXCLUDED.canvas_bg_color,\n`;
    sql += `  centerline_color = EXCLUDED.centerline_color,\n`;
    sql += `  station_tick_color = EXCLUDED.station_tick_color;\n`;

    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const cleanFileName = `script_sql_sala_tecnica_${workName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.txt`;
    saveAs(blob, cleanFileName);

    setSaveSuccessMessage(`✅ Script SQL (.txt) criado com sucesso! Contém ${currentAlignment.points?.length} estacas, ${pins.length} alfinetes e parâmetros CAD.`);
    setTimeout(() => setSaveSuccessMessage(null), 8000);
  };

  // Export Alignment & Pins to Google Earth KML format
  const handleExportKml = () => {
    if (!currentAlignment) {
      setSaveSuccessMessage('⚠️ Nenhum traçado horizontal está disponível para exportação KML.');
      return;
    }

    const escapeXml = (str: any) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const workName = contract.workName || contract.client || 'Obra';

    let kml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    kml += `<kml xmlns="http://www.opengis.net/kml/2.2">\n`;
    kml += `  <Document>\n`;
    kml += `    <name>${escapeXml(currentAlignment.title)}</name>\n`;
    kml += `    <description>Projeto de Traçado Horizontal - Sala Técnica - ${escapeXml(workName)}</description>\n\n`;

    // Line Style (Yellow centerline ff00ffff)
    kml += `    <Style id="centerlineStyle">\n`;
    kml += `      <LineStyle>\n`;
    kml += `        <color>ff00ffff</color>\n`;
    kml += `        <width>4</width>\n`;
    kml += `      </LineStyle>\n`;
    kml += `    </Style>\n\n`;

    // Station Style
    kml += `    <Style id="stationStyle">\n`;
    kml += `      <IconStyle>\n`;
    kml += `        <scale>0.8</scale>\n`;
    kml += `        <Icon>\n`;
    kml += `          <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>\n`;
    kml += `        </Icon>\n`;
    kml += `      </IconStyle>\n`;
    kml += `    </Style>\n\n`;

    // Pin Style
    kml += `    <Style id="pinStyle">\n`;
    kml += `      <IconStyle>\n`;
    kml += `        <scale>1.1</scale>\n`;
    kml += `        <Icon>\n`;
    kml += `          <href>http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>\n`;
    kml += `        </Icon>\n`;
    kml += `      </IconStyle>\n`;
    kml += `    </Style>\n\n`;

    // Folder: Alignment Line
    if (kmlOptions.includeAlignmentLine && currentAlignment.points?.length > 0) {
      kml += `    <Folder>\n`;
      kml += `      <name>Eixo do Traçado Horizontal</name>\n`;
      kml += `      <Placemark>\n`;
      kml += `        <name>${escapeXml(currentAlignment.title)}</name>\n`;
      kml += `        <styleUrl>#centerlineStyle</styleUrl>\n`;
      kml += `        <LineString>\n`;
      kml += `          <extrude>1</extrude>\n`;
      kml += `          <tessellate>1</tessellate>\n`;
      kml += `          <altitudeMode>clampToGround</altitudeMode>\n`;
      kml += `          <coordinates>\n`;
      currentAlignment.points.forEach(pt => {
        const elev = pt.elevation !== undefined && !isNaN(pt.elevation) ? pt.elevation : 0;
        kml += `            ${pt.lng},${pt.lat},${elev}\n`;
      });
      kml += `          </coordinates>\n`;
      kml += `        </LineString>\n`;
      kml += `      </Placemark>\n`;
      kml += `    </Folder>\n\n`;
    }

    // Folder: Station Points
    if (kmlOptions.includeStations && currentAlignment.points?.length > 0) {
      kml += `    <Folder>\n`;
      kml += `      <name>Estacas do Traçado (${currentAlignment.points?.length})</name>\n`;
      currentAlignment.points.forEach(pt => {
        const elev = pt.elevation !== undefined && !isNaN(pt.elevation) ? pt.elevation : 0;
        kml += `      <Placemark>\n`;
        kml += `        <name>Estaca ${escapeXml(pt.station)}</name>\n`;
        kml += `        <description><![CDATA[\n`;
        kml += `          <b>Estaca:</b> ${escapeXml(pt.station)}<br/>\n`;
        kml += `          <b>Tipo:</b> ${escapeXml(pt.type || 'PI')}<br/>\n`;
        kml += `          <b>Cota:</b> ${elev.toFixed(2)} m<br/>\n`;
        if (pt.radius) kml += `          <b>Raio de Curva:</b> ${pt.radius} m<br/>\n`;
        if (pt.description) kml += `          <b>Descrição:</b> ${escapeXml(pt.description)}<br/>\n`;
        if (pt.complementaryInfo) kml += `          <b>Info Comp:</b> ${escapeXml(pt.complementaryInfo)}<br/>\n`;
        kml += `        ]]></description>\n`;
        kml += `        <styleUrl>#stationStyle</styleUrl>\n`;
        kml += `        <Point>\n`;
        kml += `          <coordinates>${pt.lng},${pt.lat},${elev}</coordinates>\n`;
        kml += `        </Point>\n`;
        kml += `      </Placemark>\n`;
      });
      kml += `    </Folder>\n\n`;
    }

    // Folder: Pins / Alfinetes
    if (kmlOptions.includePins && pins.length > 0) {
      kml += `    <Folder>\n`;
      kml += `      <name>Alfinetes e Ocorrências (${pins.length})</name>\n`;
      pins.forEach(pin => {
        kml += `      <Placemark>\n`;
        kml += `        <name>${escapeXml(pin.title)}</name>\n`;
        kml += `        <description><![CDATA[\n`;
        kml += `          <b>Categoria:</b> ${escapeXml(pin.category)}<br/>\n`;
        if (pin.station) kml += `          <b>Estaca:</b> ${escapeXml(pin.station)}<br/>\n`;
        if (pin.notes) kml += `          <b>Observações:</b> ${escapeXml(pin.notes)}<br/>\n`;
        kml += `          <b>Data:</b> ${new Date(pin.createdAt).toLocaleString('pt-BR')}<br/>\n`;
        kml += `        ]]></description>\n`;
        kml += `        <styleUrl>#pinStyle</styleUrl>\n`;
        kml += `        <Point>\n`;
        kml += `          <coordinates>${pin.lng},${pin.lat},0</coordinates>\n`;
        kml += `        </Point>\n`;
        kml += `      </Placemark>\n`;
      });
      kml += `    </Folder>\n\n`;
    }

    // Folder: Measurements
    if (kmlOptions.includeMeasurements && savedMeasurements.length > 0) {
      kml += `    <Folder>\n`;
      kml += `      <name>Medições de Régua (${savedMeasurements.length})</name>\n`;
      savedMeasurements.forEach(m => {
        kml += `      <Placemark>\n`;
        kml += `        <name>${escapeXml(m.title)} - ${(m.totalDistanceMeters || 0).toLocaleString('pt-BR')} m</name>\n`;
        kml += `        <LineString>\n`;
        kml += `          <coordinates>\n`;
        m.points.forEach(p => {
          kml += `            ${p.lng},${p.lat},0\n`;
        });
        kml += `          </coordinates>\n`;
        kml += `        </LineString>\n`;
        kml += `      </Placemark>\n`;
      });
      kml += `    </Folder>\n\n`;
    }

    kml += `  </Document>\n`;
    kml += `</kml>`;

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
    const cleanFileName = `tracado_${workName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.kml`;
    saveAs(blob, cleanFileName);

    setShowKmlModal(false);
    setSaveSuccessMessage(`✅ Arquivo KML exportado com sucesso! Pronto para abrir no Google Earth com traçado e alfinetes.`);
    setTimeout(() => setSaveSuccessMessage(null), 8000);
  };

  // Filtered Points in Table
  const filteredPoints = useMemo(() => {
    if (!currentAlignment) return [];
    if (!searchTerm.trim()) return currentAlignment.points;
    const term = searchTerm.toLowerCase();
    return currentAlignment.points.filter(p => 
      p.station.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.type && p.type.toLowerCase().includes(term))
    );
  }, [currentAlignment, searchTerm]);

  // Alignment Summary Stats
  const stats = useMemo(() => {
    if (!currentAlignment || !currentAlignment.points || currentAlignment.points.length === 0) return null;
    const pts = currentAlignment.points;
    const totalKm = (currentAlignment.totalLengthMeters / 1000).toFixed(3);
    const totalMeters = (currentAlignment.totalLengthMeters || 0).toLocaleString('pt-BR');
    const curvesCount = pts.filter(p => p.radius && p.radius > 0).length;

    const radiuses = pts.map(p => p.radius).filter((r): r is number => Boolean(r && r > 0));
    const minRadius = radiuses.length > 0 ? Math.min(...radiuses) : null;

    return {
      totalPoints: pts.length,
      totalKm,
      totalMeters,
      curvesCount,
      minRadius,
      startStation: pts[0]?.station || '0+000',
      endStation: pts[pts.length - 1]?.station || 'FIM'
    };
  }, [currentAlignment]);

  // Map Tile URL Provider
  const mapTileUrl = useMemo(() => {
    switch (cadSettings.googleMapsLayerType) {
      case 'google_satellite':
        return 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
      case 'google_hybrid':
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      case 'google_roadmap':
        return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      case 'google_terrain':
        return 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
      default:
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    }
  }, [cadSettings.googleMapsLayerType]);

  const defaultCenter = useMemo<[number, number]>(() => {
    if (currentAlignment && currentAlignment.points?.length > 0) {
      const midIdx = Math.floor(currentAlignment.points?.length / 2);
      return [currentAlignment.points[midIdx].lat, currentAlignment.points[midIdx].lng];
    }
    return [-23.55052, -46.633308];
  }, [currentAlignment]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER LIMPO DO PROJETO DA SALA TÉCNICA - COM APENAS UM BOTÃO DE IMPORTAÇÃO */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden border border-blue-500/20">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Sala Técnica • Engenharia de Obra
              </span>
              {currentAlignment && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Projeto Ativo
                </span>
              )}
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Projeto de Traçado Horizontal
            </h2>
            <p className="text-blue-200/80 text-sm max-w-2xl leading-relaxed">
              Visualização vetorial geoespacial sobre imagens de satélite do Google Maps, com medições e pontos de interesse.
            </p>
          </div>

          {/* BOTOES DE AÇÃO DA SALA TÉCNICA (IMPORTAÇÃO E KML) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowImportExportModal(true)}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2.5 shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4 stroke-[2.5]" />
              Importar / Exportar
            </button>
          </div>
        </div>
      </div>

      {/* MENSAGEM DE CONFIRMAÇÃO DE GRAVAÇÃO NO BANCO DE DADOS */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 text-emerald-300 text-sm font-bold flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button 
            onClick={() => setSaveSuccessMessage(null)} 
            className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* SE NENHUM PROJETO ESTIVER CARREGADO */}
      {!currentAlignment && (
        <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-200 shadow-sm space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <FileSpreadsheet className="w-10 h-10" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Nenhum Traçado Horizontal Importado</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Clique no botão de importação visual para carregar o arquivo Excel com as coordenadas do eixos e estacas da rodovia.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
                setImportStep(1);
                setShowImportModal(true);
              }}
              className="px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center gap-3 shadow-xl shadow-emerald-200 transition-all"
            >
              <Upload className="w-5 h-5 stroke-[2.5]" />
              Importar Planilha do Projeto (.xls)
            </button>
          </div>
        </div>
      )}

      {/* VISUALIZAÇÃO PRINCIPAL DO PROJETO COM MAPA E MENU LATERAL INTEGRADO */}
      {currentAlignment && (
        <div className="space-y-6">

          {/* CARDS DE ESTATÍSTICAS DO TRAÇADO */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-blue-600" /> Extensão Total
                </span>
                <p className="text-xl font-black text-gray-900">{stats.totalKm} km</p>
                <p className="text-[11px] text-gray-400 font-bold">{stats.totalMeters} m lineares</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Estaca Inicial
                </span>
                <p className="text-xl font-black text-gray-900">{stats.startStation}</p>
                <p className="text-[11px] text-gray-400 font-bold">Origem do Trecho</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-purple-600" /> Estaca Final
                </span>
                <p className="text-xl font-black text-gray-900">{stats.endStation}</p>
                <p className="text-[11px] text-gray-400 font-bold">Término do Trecho</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-600" /> Curvas / Raios
                </span>
                <p className="text-xl font-black text-gray-900">{stats.curvesCount} Curvas</p>
                <p className="text-[11px] text-amber-600 font-bold">
                  {stats.minRadius ? `Raio mín: ${stats.minRadius}m` : 'Sem curvas'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1 col-span-2 md:col-span-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-red-500" /> Pontos / Medições
                </span>
                <p className="text-xl font-black text-gray-900">{pins.length} Pins • {savedMeasurements.length} Med.</p>
                <p className="text-[11px] text-gray-400 font-bold truncate">{currentAlignment.fileName}</p>
              </div>
            </div>
          )}

          {/* INTERFAZ GEOESPACIAL: MAPA LEAFLET COM MENU LATERAL DE FERRAMENTAS */}
          <div className={`bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl overflow-hidden relative flex flex-col md:flex-row transition-all duration-300 ${
            isMapExpanded ? 'fixed inset-4 z-50 rounded-2xl h-[calc(100vh-2rem)]' : 'h-[640px]'
          }`}>
            
            {/* MENU LATERAL DE FERRAMENTAS DO PROJETO */}
            <div className={`bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 z-[1001] shrink-0 ${
              isSidebarOpen ? 'w-full md:w-80 h-72 md:h-full' : 'w-full md:w-16 h-14 md:h-full'
            }`}>
              {/* Top Bar / Header do Menu Lateral */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  {isSidebarOpen && (
                    <div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wider">Menu do Projeto</h4>
                      <p className="text-[10px] text-slate-400">Ferramentas de Desenho</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarOpen ? 'rotate-180 md:rotate-180' : ''}`} />
                </button>
              </div>

              {/* Botões de Navegação entre Abas do Menu Lateral */}
              <div className={`p-2 border-b border-slate-800 grid gap-1 ${isSidebarOpen ? 'grid-cols-4' : 'grid-cols-1'}`}>
                <button
                  onClick={() => { setSidebarTab('pins'); setIsSidebarOpen(true); }}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    sidebarTab === 'pins' 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                      : 'text-slate-400 hover:bg-slate-900'
                  }`}
                  title="Alfinetes & Pontos de Interesse"
                >
                  <MapPin className="w-4 h-4" />
                  {isSidebarOpen && <span className="text-[10px]">Alfinetes</span>}
                </button>

                <button
                  onClick={() => { setSidebarTab('measure'); setIsSidebarOpen(true); }}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    sidebarTab === 'measure' 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
                      : 'text-slate-400 hover:bg-slate-900'
                  }`}
                  title="Tirar Medidas / Régua"
                >
                  <Ruler className="w-4 h-4" />
                  {isSidebarOpen && <span className="text-[10px]">Medição</span>}
                </button>

                <button
                  onClick={() => { setSidebarTab('layers'); setIsSidebarOpen(true); }}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    sidebarTab === 'layers' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'text-slate-400 hover:bg-slate-900'
                  }`}
                  title="Camadas do Mapa"
                >
                  <Layers className="w-4 h-4" />
                  {isSidebarOpen && <span className="text-[10px]">Camadas</span>}
                </button>

                <button
                  onClick={() => { setSidebarTab('settings'); setIsSidebarOpen(true); }}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    sidebarTab === 'settings' 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                      : 'text-slate-400 hover:bg-slate-900'
                  }`}
                  title="Configurações de Visualização CAD"
                >
                  <Settings className="w-4 h-4" />
                  {isSidebarOpen && <span className="text-[10px]">Ajustes</span>}
                </button>
              </div>

              {/* Conteúdo Expandido do Menu Lateral */}
              {isSidebarOpen && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  
                  {/* ABA: ALFINETES / PONTOS DE INTERESSE */}
                  {sidebarTab === 'pins' && (
                    <div className="space-y-4">
                      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-red-400" /> Adicionar Alfinete
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Ative a ferramenta e clique em qualquer local do mapa para marcar uma obra de arte, bueiro ou ocorrência.
                        </p>
                        <button
                          onClick={() => setActiveTool(activeTool === 'pin' ? 'none' : 'pin')}
                          className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                            activeTool === 'pin' 
                              ? 'bg-red-500 text-slate-950 shadow-lg animate-pulse' 
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          {activeTool === 'pin' ? 'Clique no Mapa para Marcar' : 'Inserir Alfinete'}
                        </button>
                      </div>

                      {/* LISTA DE ALFINETES CADASTRADOS */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Alfinetes Salvos ({pins.length})
                        </span>

                        {pins.length === 0 ? (
                          <div className="p-4 text-center rounded-2xl bg-slate-900/50 border border-slate-800/80 text-slate-500 text-xs">
                            Nenhum alfinete marcado ainda.
                          </div>
                        ) : (
                          pins.map(pin => (
                            <div key={pin.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-2 hover:border-slate-700 transition-colors">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full bg-${pin.color === 'red' ? 'red-500' : pin.color === 'emerald' ? 'emerald-500' : pin.color === 'blue' ? 'blue-500' : 'amber-500'}`} />
                                  <h5 className="text-xs font-bold text-white leading-snug">{pin.title}</h5>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  {pin.station && <span className="font-semibold text-slate-300">Estaca: {pin.station}</span>}
                                  <span>Cat: {pin.category}</span>
                                </div>
                                {pin.notes && <p className="text-[10px] text-slate-400 italic">{pin.notes}</p>}
                              </div>

                              <button
                                onClick={() => handleDeletePin(pin.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Excluir Alfinete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* ABA: RÉGUA / TIRAR MEDIDAS */}
                  {sidebarTab === 'measure' && (
                    <div className="space-y-4">
                      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                            <Ruler className="w-4 h-4 text-blue-400" /> Régua de Medição
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Clique sequencialmente no mapa para traçar uma linha e medir distâncias exatas.
                        </p>

                        <button
                          onClick={() => setActiveTool(activeTool === 'measure' ? 'none' : 'measure')}
                          className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                            activeTool === 'measure' 
                              ? 'bg-blue-500 text-slate-950 shadow-lg animate-pulse' 
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Ruler className="w-4 h-4" />
                          {activeTool === 'measure' ? 'Clique no Mapa para Medir' : 'Ativar Régua'}
                        </button>

                        {/* EXIBIÇÃO DA MEDIÇÃO ATIVA */}
                        {currentMeasurePoints.length > 0 && (
                          <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-500/30 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Distância Atual:</span>
                              <strong className="text-blue-300 font-black text-sm">{(activeMeasureDistance || 0).toLocaleString('pt-BR')} m</strong>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Vértices marcados: {currentMeasurePoints.length}
                            </div>

                            <input
                              type="text"
                              placeholder="Nome da medição (ex: Ponte Estaca 140)"
                              value={measureTitle}
                              onChange={e => setMeasureTitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500"
                            />

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={handleSaveMeasurement}
                                disabled={currentMeasurePoints.length < 2}
                                className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50"
                              >
                                Salvar Medição
                              </button>
                              <button
                                onClick={() => setCurrentMeasurePoints([])}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                              >
                                Limpar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* LISTA DE MEDIÇÕES SALVAS */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Medições Salvas ({savedMeasurements.length})
                        </span>

                        {savedMeasurements.length === 0 ? (
                          <div className="p-4 text-center rounded-2xl bg-slate-900/50 border border-slate-800/80 text-slate-500 text-xs">
                            Nenhuma medição salva.
                          </div>
                        ) : (
                          savedMeasurements.map(m => (
                            <div key={m.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                              <div>
                                <h5 className="text-xs font-bold text-white">{m.title}</h5>
                                <p className="text-[10px] text-blue-400 font-black">{(m.totalDistanceMeters || 0).toLocaleString('pt-BR')} m</p>
                              </div>
                              <button
                                onClick={() => handleDeleteMeasurement(m.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* ABA: CAMADAS DO MAPA & GOOGLE MAPS TOGGLE */}
                  {sidebarTab === 'layers' && (
                    <div className="space-y-4">
                      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-slate-200 flex items-center gap-2">
                            <Map className="w-4 h-4 text-emerald-400" /> Google Maps
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cadSettings.enableGoogleMaps}
                              onChange={e => setCadSettings(s => ({ ...s, enableGoogleMaps: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {cadSettings.enableGoogleMaps
                            ? 'Imagens de satélite do Google ativas.'
                            : 'Google Maps desativado por padrão para deixar o sistema mais leve e rápido.'}
                        </p>

                        {cadSettings.enableGoogleMaps && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-800">
                            {[
                              { id: 'google_hybrid', label: 'Satélite Híbrido' },
                              { id: 'google_satellite', label: 'Satélite Puro' },
                              { id: 'google_roadmap', label: 'Vetorial / Ruas' },
                              { id: 'google_terrain', label: 'Terreno' },
                            ].map(l => (
                              <button
                                key={l.id}
                                onClick={() => setCadSettings(s => ({ ...s, googleMapsLayerType: l.id as any }))}
                                className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                                  cadSettings.googleMapsLayerType === l.id 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <span>{l.label}</span>
                                {cadSettings.googleMapsLayerType === l.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COR DE FUNDO DO CANVAS CAD */}
                      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                        <span className="text-xs font-black uppercase text-slate-200 flex items-center gap-2">
                          <Palette className="w-4 h-4 text-purple-400" /> Cor de Fundo do Canvas CAD
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { color: '#12161f', label: 'Escuro CAD' },
                            { color: '#0f172a', label: 'Pretonite' },
                            { color: '#1e293b', label: 'Grafite' },
                            { color: '#f8fafc', label: 'Branco' },
                          ].map(bg => (
                            <button
                              key={bg.color}
                              onClick={() => setCadSettings(s => ({ ...s, canvasBgColor: bg.color }))}
                              className={`p-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${
                                cadSettings.canvasBgColor === bg.color
                                  ? 'border-emerald-500 bg-slate-800 text-white'
                                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: bg.color }} />
                              <span>{bg.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setShowSettingsModal(true)}
                        className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                      >
                        <Settings className="w-4 h-4" />
                        Abrir Configurações CAD
                      </button>
                    </div>
                  )}

                  {/* ABA: CONFIGURAÇÕES DE VISUALIZAÇÃO CAD */}
                  {sidebarTab === 'settings' && (
                    <div className="space-y-4">
                      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                        <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-2">
                          <Settings className="w-4 h-4" /> Visualização do Desenho
                        </span>
                        
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="text-slate-400 font-bold block mb-1">Cor do Eixo Principal</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={cadSettings.centerlineColor}
                                onChange={e => setCadSettings(s => ({ ...s, centerlineColor: e.target.value }))}
                                className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer"
                              />
                              <span className="font-mono text-slate-300">{cadSettings.centerlineColor}</span>
                              <button
                                onClick={() => setCadSettings(s => ({ ...s, centerlineColor: '#facc15' }))}
                                className="ml-auto text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded"
                              >
                                Amarelo Padrão
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-slate-400 font-bold block mb-1">Cor das Estacas e Tiques</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={cadSettings.stationTickColor}
                                onChange={e => setCadSettings(s => ({ 
                                  ...s, 
                                  stationTickColor: e.target.value,
                                  stationTextColor: e.target.value 
                                }))}
                                className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer"
                              />
                              <span className="font-mono text-slate-300">{cadSettings.stationTickColor}</span>
                              <button
                                onClick={() => setCadSettings(s => ({ 
                                  ...s, 
                                  stationTickColor: '#22c55e',
                                  stationTextColor: '#22c55e'
                                }))}
                                className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded"
                              >
                                Verde Padrão
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-slate-400 font-bold">Zoom Mínimo p/ Estacas</label>
                              <span className="text-amber-400 font-black">Nível {cadSettings.minStationZoom}</span>
                            </div>
                            <input
                              type="range"
                              min={12}
                              max={18}
                              step={1}
                              value={cadSettings.minStationZoom}
                              onChange={e => setCadSettings(s => ({ ...s, minStationZoom: Number(e.target.value) }))}
                              className="w-full accent-amber-500"
                            />
                            <p className="text-[10px] text-slate-500">As estacas só são mostradas quando o zoom do mapa estiver igual ou superior a este nível.</p>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <label className="text-slate-400 font-bold">Rotação Texto (Estacas)</label>
                              <span className="text-amber-400 font-black">{cadSettings.stationTextRotation || 0}°</span>
                            </div>
                            <input
                              type="range"
                              min={-90}
                              max={90}
                              step={15}
                              value={cadSettings.stationTextRotation || 0}
                              onChange={e => setCadSettings(s => ({ ...s, stationTextRotation: Number(e.target.value) }))}
                              className="w-full accent-amber-500"
                            />
                            <p className="text-[10px] text-slate-500">Ajusta a inclinação em relação à perpendicular.</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => exportCadSettingsScript(cadSettings)}
                          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Exportar Script de Configuração (.json)
                        </button>

                        <button
                          onClick={() => {
                            const res = resetCadSettings();
                            setCadSettings(res);
                          }}
                          className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2 border border-red-500/20"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restaurar Padrões de Fábrica
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* CONTÊINER DO MAPA GEOESPACIAL */}
            <div className="flex-1 relative h-full">
              
              {/* CAIXA DE BUSCA DE ESTACAS E STATUS NO TOPO ESQUERDO DO MAPA */}
              <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 max-w-sm">
                <StationSearchBox
                  points={currentAlignment.points}
                  onSelectStation={(pt) => {
                    setSelectedPointId(pt.id);
                    setZoomTrigger({ type: 'selected', id: Date.now() });
                  }}
                />

                {!cadSettings.enableGoogleMaps && (
                  <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-black shadow-2xl flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    <span>Google Maps Desativado (Modo CAD Leve)</span>
                    <button
                      onClick={() => setCadSettings(s => ({ ...s, enableGoogleMaps: true }))}
                      className="ml-2 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] font-bold transition-all"
                    >
                      Ativar
                    </button>
                  </div>
                )}
              </div>

              {/* STATUS DE FERRAMENTA ATIVA NO TOPO DO MAPA */}
              {activeTool !== 'none' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce">
                  {activeTool === 'pin' ? (
                    <>
                      <MapPin className="w-4 h-4 text-red-400 animate-pulse" />
                      <span>Modo Alfinete Ativo: Clique no mapa</span>
                    </>
                  ) : (
                    <>
                      <Ruler className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span>Modo Régua Ativo: Clique no mapa</span>
                    </>
                  )}
                  <button onClick={() => setActiveTool('none')} className="ml-2 p-1 rounded-full hover:bg-slate-800">
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}

              {/* CONTROLES DE ZOOM DO MAPA E BOTÃO DE AJUSTES */}
              <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl">
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                  title="Configurações de Visualização CAD"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <div className="w-full h-px bg-slate-700/60 my-0.5" />
                <button
                  onClick={() => setZoomTrigger({ type: 'in', id: Date.now() })}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                  title="Aproximar Zoom (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomTrigger({ type: 'out', id: Date.now() })}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                  title="Afastar Zoom (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-full h-px bg-slate-700/60 my-0.5" />
                <button
                  onClick={() => setZoomTrigger({ type: 'fit', id: Date.now() })}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
                  title="Enquadrar Traçado Completo"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                {selectedPoint && (
                  <button
                    onClick={() => setZoomTrigger({ type: 'selected', id: Date.now() })}
                    className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors animate-pulse"
                    title={`Focar Estaca Selecionada (${selectedPoint.station})`}
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* MAPA INTERATIVO LEAFLET COM TILES GOOGLE MAPS E SUPORTE A MODO CAD LEVE */}
              <MapContainer
                center={defaultCenter}
                zoom={14}
                style={{ width: '100%', height: '100%', backgroundColor: cadSettings.canvasBgColor }}
                zoomControl={false}
                zoomSnap={0.1}
                wheelPxPerZoomLevel={60}
              >
                <MapBackgroundColorApplier color={cadSettings.canvasBgColor} enableGoogleMaps={cadSettings.enableGoogleMaps} />
                <ZoomLevelTracker onZoomChange={setCurrentZoom} />

                {cadSettings.enableGoogleMaps && (
                  <TileLayer
                    url={mapTileUrl}
                    maxZoom={20}
                    attribution="&copy; Google Maps"
                  />
                )}

                <MapController
                  selectedPoint={selectedPoint}
                  points={currentAlignment.points}
                  zoomTrigger={zoomTrigger}
                />

                <MapEventsHandler
                  activeTool={activeTool}
                  onAddPinClick={handleAddPinClick}
                  onAddMeasureClick={handleAddMeasurePoint}
                />

                {/* LINHA POLILINHA DO TRAÇADO HORIZONTAL (LINHA DE EIXO AMARELA) */}
                <Polyline
                  positions={currentAlignment.points.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: cadSettings.centerlineColor || '#facc15',
                    weight: cadSettings.centerlineWeight || 3,
                    dashArray: cadSettings.centerlineDashArray || undefined,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />

                {/* EXIBIÇÃO DAS ESTACAS APENAS QUANDO O ZOOM ESTIVER PRÓXIMO */}
                {cadSettings.showStations && currentZoom >= cadSettings.minStationZoom ? (
                  currentAlignment.points.map((pt, idx) => {
                    if (idx % (cadSettings.stationStep || 1) !== 0 && idx !== currentAlignment.points?.length - 1) {
                      return null;
                    }

                    const prevPt = currentAlignment.points[idx - 1];
                    const nextPt = currentAlignment.points[idx + 1];
                    const isSelected = pt.id === selectedPointId;

                    return (
                      <Marker
                        key={`st-marker-${pt.id}`}
                        position={[pt.lat, pt.lng]}
                        eventHandlers={{
                          click: () => setSelectedPointId(pt.id)
                        }}
                        icon={createCadStationIcon(pt, prevPt, nextPt, isSelected, cadSettings)}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="p-2 space-y-1 text-xs">
                            <strong className="text-gray-900 block font-black text-sm">Estaca: {pt.station}</strong>
                            <div className="text-gray-600 font-bold">Tipo: {pt.type || 'PI'}</div>
                            {pt.elevation !== undefined && !isNaN(pt.elevation) && (
                              <div className="text-emerald-700 font-black">Cota: {pt.elevation.toFixed(2)} m</div>
                            )}
                            {pt.complementaryInfo && <div className="text-purple-700 font-bold">{pt.complementaryInfo}</div>}
                            {pt.description && <div className="text-gray-500 italic">{pt.description}</div>}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })
                ) : (
                  /* Quando o zoom estiver distante, mostra apenas pequenos vértices discretos otimizados (CircleMarker) */
                  currentAlignment.points.map((pt, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === currentAlignment.points?.length - 1;
                    const isSelected = pt.id === selectedPointId;

                    let markerColor = cadSettings.stationTickColor || '#22c55e';
                    if (isStart) markerColor = '#10b981';
                    if (isEnd) markerColor = '#ef4444';
                    if (isSelected) markerColor = '#f59e0b';

                    return (
                      <CircleMarker
                        key={`vtx-marker-${pt.id}`}
                        center={[pt.lat, pt.lng]}
                        radius={isSelected ? 5 : 2}
                        pathOptions={{ 
                          color: '#ffffff', 
                          weight: 1, 
                          fillColor: markerColor, 
                          fillOpacity: 1 
                        }}
                        eventHandlers={{
                          click: () => setSelectedPointId(pt.id)
                        }}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="p-2 space-y-1 text-xs">
                            <strong className="text-gray-900 block font-black text-sm">Estaca: {pt.station}</strong>
                            <p className="text-[10px] text-gray-500 font-bold">Aproxime o zoom (nível {cadSettings.minStationZoom}+) para exibir a rotulagem das estacas em CAD</p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })
                )}

                {/* MARCADORES DE ALFINETES / PONTOS DE INTERESSE (PINS) */}
                {pins.map(pin => (
                  <Marker
                    key={pin.id}
                    position={[pin.lat, pin.lng]}
                    icon={createCustomPinIcon(pin.color)}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-2 space-y-1 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px] uppercase">
                          {pin.category}
                        </span>
                        <h4 className="font-black text-gray-900 text-sm">{pin.title}</h4>
                        {pin.station && <p className="text-gray-600 font-bold">Estaca: {pin.station}</p>}
                        {pin.notes && <p className="text-gray-500 italic">{pin.notes}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* MEDIÇÃO ATIVA (RÉGUA) */}
                {currentMeasurePoints.length > 0 && (
                  <>
                    <Polyline
                      positions={currentMeasurePoints.map(p => [p.lat, p.lng])}
                      pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '6, 6' }}
                    />
                    {currentMeasurePoints.map((p, i) => (
                      <CircleMarker
                        key={`m-curr-${i}`}
                        center={[p.lat, p.lng]}
                        radius={4}
                        pathOptions={{ color: '#ffffff', weight: 1, fillColor: '#3b82f6', fillOpacity: 1 }}
                      />
                    ))}
                  </>
                )}

                {/* MEDIÇÕES SALVAS */}
                {savedMeasurements.map(m => (
                  <Polyline
                    key={m.id}
                    positions={m.points.map(p => [p.lat, p.lng])}
                    pathOptions={{ color: '#8b5cf6', weight: 3, opacity: 0.8 }}
                  />
                ))}
              </MapContainer>
            </div>
          </div>

          {/* PERFIL VERTICAL / ALTIMÉTRICO DO TRAÇADO */}
          <VerticalProfileChart
            points={currentAlignment.points}
            selectedPointId={selectedPointId}
            onSelectPoint={(pt) => {
              setSelectedPointId(pt.id);
              setZoomTrigger({ type: 'selected', id: Date.now() });
            }}
          />

          {/* TABELA DE VÉRTICES E GEOMETRIA DO TRAÇADO */}
          <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Vértices e Elementos Geométricos</h3>
                <p className="text-xs text-gray-500">Lista completa de estacas, coordenadas UTM/Geodésicas, cotas e raio de curvatura.</p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar estaca ou descrição..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-black uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4"># Order</th>
                    <th className="py-3 px-4">Estaca</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Cota (m)</th>
                    <th className="py-3 px-4">Info Comp.</th>
                    <th className="py-3 px-4">Latitude</th>
                    <th className="py-3 px-4">Longitude</th>
                    <th className="py-3 px-4">Raio (m)</th>
                    <th className="py-3 px-4">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredPoints.slice(0, 100).map((pt, idx) => {
                    const isSelected = pt.id === selectedPointId;
                    return (
                      <tr 
                        key={pt.id} 
                        onClick={() => {
                          setSelectedPointId(pt.id);
                          setZoomTrigger({ type: 'selected', id: Date.now() });
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-50 border-l-4 border-l-amber-500' : 'hover:bg-blue-50/50'
                        }`}
                      >
                        <td className="py-2.5 px-4 text-gray-400 font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-black text-gray-900 flex items-center gap-1.5">
                          {isSelected && <MapPin className="w-3.5 h-3.5 text-amber-500 animate-bounce" />}
                          <span>{pt.station}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            pt.type === 'PC' ? 'bg-amber-100 text-amber-800' :
                            pt.type === 'PT' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {pt.type || 'PI'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-black text-emerald-700 font-mono">
                          {pt.elevation !== undefined && !isNaN(pt.elevation) ? `${pt.elevation.toFixed(2)} m` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-purple-700 font-bold">
                          {pt.complementaryInfo || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 font-mono">{pt.lat.toFixed(6)}</td>
                        <td className="py-2.5 px-4 text-gray-600 font-mono">{pt.lng.toFixed(6)}</td>
                        <td className="py-2.5 px-4 font-bold text-gray-900">
                          {pt.radius && pt.radius > 0 ? `${pt.radius} m` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-gray-500">{pt.description || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO VISUAL DA PLANILHA (SISTEMA RH-LIKE) */}
      {/* MODAL DE IMPORTAÇÃO / EXPORTAÇÃO (SISTEMA RH-LIKE) */}
      <AnimatePresence>
        {showImportExportModal && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-slate-800 rounded-[32px] shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Importar / Exportar Dados do Traçado</h3>
                    <p className="text-xs text-slate-500">
                      Selecione o formato para exportação, importe seus dados (KML ou Excel) ou baixe o modelo padrão.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportExportModal(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Option 1: Baixar Modelo Excel */}
                  <button
                    onClick={handleDownloadSampleExcel}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/50 p-6 rounded-2xl transition group text-center cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform mb-3">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">Baixar Modelo</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Planilha padrão (.xlsx) de traçado</span>
                  </button>

                  {/* Option 2: Importar Excel */}
                  <button
                    onClick={() => {
                      setShowImportExportModal(false);
                      setImportStep(1);
                      setShowImportModal(true);
                    }}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/50 p-6 rounded-2xl transition group text-center cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">Importar Planilha</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Mapear dados do Excel (.xlsx)</span>
                  </button>

                  {/* Option 3: Importar KML */}
                  <div className="relative flex flex-col items-center justify-center border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50/50 p-6 rounded-2xl transition group text-center cursor-pointer overflow-hidden">
                    <input
                      type="file"
                      accept=".kml"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleKmlImport}
                    />
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform mb-3">
                      <Map className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">Importar KML</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Poligonais e marcadores do Google Earth</span>
                  </div>

                  {/* Option 4: Exportar KML */}
                  <button
                    onClick={() => {
                      setShowImportExportModal(false);
                      setShowKmlModal(true);
                    }}
                    disabled={!currentAlignment}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50/50 p-6 rounded-2xl transition group text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-110 transition-transform mb-3">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">Exportar KML</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Salvar traçado atual em KML</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header do Modal */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Assistente de Importação de Traçado</h3>
                    <p className="text-xs text-slate-400">Sistema de Mapeamento Inteligente de Planilhas</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Progresso em Passos (Step Indicator) */}
              <div className="px-8 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-xs font-bold">
                <div className={`flex items-center gap-2 ${importStep >= 1 ? 'text-emerald-600 font-black' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${importStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                  <span>Arquivo & Modelo</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <div className={`flex items-center gap-2 ${importStep >= 2 ? 'text-emerald-600 font-black' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${importStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                  <span>Mapeamento</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <div className={`flex items-center gap-2 ${importStep >= 3 ? 'text-emerald-600 font-black' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${importStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                  <span>Pré-visualização</span>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {importError && (
                <div className="m-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Conteúdo Dinâmico por Passo */}
              <div className="p-8 overflow-y-auto flex-1 space-y-6">
                
                {/* PASSO 1: SELEÇÃO DO ARQUIVO */}
                {importStep === 1 && (
                  <div className="space-y-6 text-center">
                    <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-[24px] p-8 bg-emerald-50/50 transition-all flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-gray-900">Arraste a planilha Excel ou clique para selecionar</h4>
                        <p className="text-xs text-gray-500 mt-1">Formatos suportados: .xls, .xlsx, .csv</p>
                      </div>

                      <label className="mt-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-200 transition-all">
                        Selecionar Arquivo
                        <input
                          type="file"
                          accept=".xls,.xlsx,.csv"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                          }}
                        />
                      </label>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Não tem o padrão ideal?</span>
                      <button
                        onClick={handleDownloadSampleExcel}
                        className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
                      >
                        <Download className="w-4 h-4 text-emerald-600" />
                        Baixar Planilha Exemplo
                      </button>
                    </div>
                  </div>
                )}

                {/* PASSO 2: CONFIGURAÇÃO DE COORDENADAS E MAPEAMENTO */}
                {importStep === 2 && (
                  <div className="space-y-6">
                    {/* SELEÇÃO DO SISTEMA DE COORDENADAS E DATUM */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <MapPin className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Sistema de Coordenadas do Projeto</h4>
                          <p className="text-[11px] text-slate-400">Defina o tipo de coordenadas, a zona UTM e o datum geodésico da planilha.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Tipo de Coordenadas */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Tipo de Coordenadas *</label>
                          <select
                            value={coordinateType}
                            onChange={e => setCoordinateType(e.target.value as 'UTM' | 'LAT_LNG')}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:border-emerald-500"
                          >
                            <option value="UTM">UTM (Projeção Metros - Easting / Northing)</option>
                            <option value="LAT_LNG">Geográficas (Lat / Lng - Graus Decimais)</option>
                          </select>
                        </div>

                        {/* Zona UTM */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Zona UTM (Fuso) *</label>
                          <select
                            value={utmZone}
                            onChange={e => setUtmZone(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:border-emerald-500"
                          >
                            {[18, 19, 20, 21, 22, 23, 24, 25].map(z => (
                              <option key={z} value={z}>Zona {z} Sul (Fuso {z} S)</option>
                            ))}
                          </select>
                        </div>

                        {/* Datum Geodésico */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Datum Geodésico *</label>
                          <select
                            value={selectedDatum}
                            onChange={e => setSelectedDatum(e.target.value as 'SIRGAS 2000' | 'SAD-69')}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:border-emerald-500"
                          >
                            <option value="SIRGAS 2000">SIRGAS 2000 (Padrão Oficial do Brasil)</option>
                            <option value="SAD-69">SAD-69 (Sul-Americano 1969)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-gray-900">Associe as Colunas da Sua Planilha</h4>
                      <p className="text-xs text-gray-500">Selecione qual coluna do arquivo corresponde a cada campo do projeto.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700">Coluna de Estacas / Estação *</label>
                        <select
                          value={columnMapping.station}
                          onChange={e => setColumnMapping(prev => ({ ...prev, station: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900"
                        >
                          <option value="">-- Selecionar Coluna --</option>
                          {rawExcelHeaders.map((h, i) => <option key={`st-${i}-${h}`} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {coordinateType === 'LAT_LNG' ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700">Latitude (Graus Decimais - ex: -23,54321) *</label>
                            <select
                              value={columnMapping.lat}
                              onChange={e => setColumnMapping(prev => ({ ...prev, lat: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-emerald-300 text-xs font-bold text-gray-900"
                            >
                              <option value="">-- Selecionar Coluna --</option>
                              {rawExcelHeaders.map((h, i) => <option key={`lat-${i}-${h}`} value={h}>{h}</option>)}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700">Longitude (Graus Decimais - ex: -46,63512) *</label>
                            <select
                              value={columnMapping.lng}
                              onChange={e => setColumnMapping(prev => ({ ...prev, lng: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-emerald-300 text-xs font-bold text-gray-900"
                            >
                              <option value="">-- Selecionar Coluna --</option>
                              {rawExcelHeaders.map((h, i) => <option key={`lng-${i}-${h}`} value={h}>{h}</option>)}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700">UTM X / Este (Easting - ex: 345678,90) *</label>
                            <select
                              value={columnMapping.utmx}
                              onChange={e => setColumnMapping(prev => ({ ...prev, utmx: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-emerald-300 text-xs font-bold text-gray-900"
                            >
                              <option value="">-- Selecionar Coluna --</option>
                              {rawExcelHeaders.map((h, i) => <option key={`utmx-${i}-${h}`} value={h}>{h}</option>)}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700">UTM Y / Norte (Northing - ex: 7456789,12) *</label>
                            <select
                              value={columnMapping.utmy}
                              onChange={e => setColumnMapping(prev => ({ ...prev, utmy: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-emerald-300 text-xs font-bold text-gray-900"
                            >
                              <option value="">-- Selecionar Coluna --</option>
                              {rawExcelHeaders.map((h, i) => <option key={`utmy-${i}-${h}`} value={h}>{h}</option>)}
                            </select>
                          </div>
                        </>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700">Raio da Curva (m)</label>
                        <select
                          value={columnMapping.radius}
                          onChange={e => setColumnMapping(prev => ({ ...prev, radius: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900"
                        >
                          <option value="">-- Nenhuma / Selecionar --</option>
                          {rawExcelHeaders.map((h, i) => <option key={`rad-${i}-${h}`} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                      <strong>Nota Geodésica ({selectedDatum}):</strong> As coordenadas serão processadas na {coordinateType === 'UTM' ? `Projeção UTM Zona ${utmZone} Sul` : 'Projeção Lat/Lng Graus Decimais'} utilizando o Datum <strong>{selectedDatum}</strong> para o mapa de satélite.
                    </div>

                    {/* PRÉ-VISUALIZAÇÃO AO VIVO DAS COLUNAS (IGUAL AO RH) */}
                    <div className="space-y-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-emerald-600" />
                          Pré-visualização dos Dados do Arquivo ({rawExcelRows.length} linhas lidas)
                        </h5>
                        <span className="text-[10px] font-bold text-gray-500">
                          Exibindo 8 primeiras linhas da planilha
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-gray-200 max-h-52 bg-white shadow-inner">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 border-b border-gray-200">
                            <tr>
                              <th className="py-2 px-3 text-[10px] uppercase text-gray-400 w-10">#</th>
                              {rawExcelHeaders.map((header, hIdx) => {
                                const isStation = columnMapping.station === header;
                                const isLat = columnMapping.lat === header;
                                const isLng = columnMapping.lng === header;
                                const isUtmX = columnMapping.utmx === header;
                                const isUtmY = columnMapping.utmy === header;
                                const isRadius = columnMapping.radius === header;
                                const isMapped = isStation || isLat || isLng || isUtmX || isUtmY || isRadius;

                                return (
                                  <th
                                    key={`th-${header}-${hIdx}`}
                                    className={`py-2 px-3 font-extrabold whitespace-nowrap border-r border-gray-200 last:border-0 ${
                                      isMapped ? 'bg-emerald-100/80 text-emerald-950' : 'text-gray-700'
                                    }`}
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <span>{header}</span>
                                      {isStation && <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-black uppercase">Estaca</span>}
                                      {isLat && <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-black uppercase">Lat</span>}
                                      {isLng && <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-black uppercase">Lng</span>}
                                      {isUtmX && <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-600 text-white font-black uppercase">UTM X</span>}
                                      {isUtmY && <span className="text-[9px] px-1.5 py-0.2 rounded bg-fuchsia-600 text-white font-black uppercase">UTM Y</span>}
                                      {isRadius && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-600 text-white font-black uppercase">Raio</span>}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                            {rawExcelRows.slice(0, 8).map((row, rowIdx) => (
                              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                <td className="py-2 px-3 text-[10px] text-gray-400 font-bold border-r border-gray-100">{rowIdx + 1}</td>
                                {rawExcelHeaders.map((header, hIdx) => {
                                  const isStation = columnMapping.station === header;
                                  const isLat = columnMapping.lat === header;
                                  const isLng = columnMapping.lng === header;
                                  const isUtmX = columnMapping.utmx === header;
                                  const isUtmY = columnMapping.utmy === header;
                                  const isRadius = columnMapping.radius === header;
                                  const isMapped = isStation || isLat || isLng || isUtmX || isUtmY || isRadius;

                                  const cellVal = row[header];
                                  return (
                                    <td
                                      key={`td-${rowIdx}-${header}-${hIdx}`}
                                      className={`py-2 px-3 whitespace-nowrap border-r border-gray-100 last:border-0 ${
                                        isMapped ? 'bg-emerald-50/60 font-bold text-emerald-950' : 'text-gray-700'
                                      }`}
                                    >
                                      {cellVal !== undefined && cellVal !== null ? String(cellVal) : '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* PASSO 3: PRÉ-VISUALIZAÇÃO & CONFIRMAÇÃO */}
                {importStep === 3 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        <div>
                          <h4 className="text-sm font-black text-emerald-900">
                            {parsedPreviewPoints.length} Vértices Georreferenciados Encontrados
                          </h4>
                          <p className="text-xs text-emerald-700">
                            Estaca Inicial: {parsedPreviewPoints[0]?.station} • Estaca Final: {parsedPreviewPoints[parsedPreviewPoints.length - 1]?.station}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100 text-gray-600 font-black uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Estaca</th>
                            <th className="py-2.5 px-3">Lat</th>
                            <th className="py-2.5 px-3">Lng</th>
                            <th className="py-2.5 px-3">Raio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {parsedPreviewPoints.slice(0, 10).map((pt, i) => (
                            <tr key={i}>
                              <td className="py-2 px-3 font-bold text-gray-900">{pt.station}</td>
                              <td className="py-2 px-3 font-mono text-gray-600">{pt.lat.toFixed(5)}</td>
                              <td className="py-2 px-3 font-mono text-gray-600">{pt.lng.toFixed(5)}</td>
                              <td className="py-2 px-3 text-gray-700">{pt.radius || 0} m</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
                <button
                  onClick={() => {
                    if (importStep > 1) setImportStep((importStep - 1) as any);
                    else setShowImportModal(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs uppercase"
                >
                  {importStep === 1 ? 'Cancelar' : 'Voltar'}
                </button>

                {importStep === 2 && (
                  <button
                    onClick={handleProcessMapping}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>Processar Mapeamento</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {importStep === 3 && (
                  <button
                    onClick={handleFinalizeImport}
                    className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-200 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar e Carregar no Projeto</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIGURAÇÕES DE VISUALIZAÇÃO CAD E TRAÇADO */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 text-white rounded-[32px] shadow-2xl border border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Configurações de Visualização CAD</h3>
                    <p className="text-xs text-slate-400">Estilo de Linhas, Estacas, Cores e Modos Leves</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs custom-scrollbar">
                
                {/* SEÇÃO 1: DESEMPENHO E MAPA DE FUNDO */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-black text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Desempenho e Imagens de Fundo
                  </h4>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <strong className="text-white font-bold block">Google Maps (Imagem de Satélite)</strong>
                      <span className="text-[11px] text-slate-400">Desative para deixar a renderização do sistema mais leve.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cadSettings.enableGoogleMaps}
                        onChange={e => setCadSettings(s => ({ ...s, enableGoogleMaps: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* SELEÇÃO DE COR DE FUNDO */}
                  <div className="space-y-2">
                    <label className="font-bold text-slate-300 block">Cor de Fundo da Tela de Desenho (Canvas)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { color: '#12161f', label: 'Escuro CAD' },
                        { color: '#0f172a', label: 'Pretonite' },
                        { color: '#1e293b', label: 'Grafite' },
                        { color: '#000000', label: 'Preto Puro' },
                        { color: '#f8fafc', label: 'Branco CAD' },
                      ].map(bg => (
                        <button
                          key={bg.color}
                          onClick={() => setCadSettings(s => ({ ...s, canvasBgColor: bg.color }))}
                          className={`p-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${
                            cadSettings.canvasBgColor === bg.color
                              ? 'border-amber-500 bg-slate-800 text-white shadow-lg'
                              : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: bg.color }} />
                          <span className="truncate">{bg.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 2: EIXO CENTRAL DO PROJETO */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-black text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Linha de Eixo do Traçado
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block">Cor do Eixo Principal</label>
                      <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <input
                          type="color"
                          value={cadSettings.centerlineColor}
                          onChange={e => setCadSettings(s => ({ ...s, centerlineColor: e.target.value }))}
                          className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer"
                        />
                        <span className="font-mono text-slate-200 font-bold">{cadSettings.centerlineColor}</span>
                        <button
                          onClick={() => setCadSettings(s => ({ ...s, centerlineColor: '#facc15' }))}
                          className="ml-auto px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[10px] font-bold"
                        >
                          Amarelo
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block">Espessura da Linha ({cadSettings.centerlineWeight}px)</label>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={cadSettings.centerlineWeight}
                        onChange={e => setCadSettings(s => ({ ...s, centerlineWeight: Number(e.target.value) }))}
                        className="w-full accent-amber-500 mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 3: ESTACAS E TEXTOS CAD */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-black text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Configuração de Estacas
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block">Cor do Ponto e Linha da Estaca</label>
                      <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <input
                          type="color"
                          value={cadSettings.stationTickColor}
                          onChange={e => setCadSettings(s => ({ 
                            ...s, 
                            stationTickColor: e.target.value,
                            stationTextColor: e.target.value 
                          }))}
                          className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer"
                        />
                        <span className="font-mono text-slate-200 font-bold">{cadSettings.stationTickColor}</span>
                        <button
                          onClick={() => setCadSettings(s => ({ 
                            ...s, 
                            stationTickColor: '#22c55e',
                            stationTextColor: '#22c55e'
                          }))}
                          className="ml-auto px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-bold"
                        >
                          Verde
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-300">Zoom Mínimo para Exibir Estacas</label>
                        <span className="font-black text-amber-400">Nível {cadSettings.minStationZoom}</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={19}
                        value={cadSettings.minStationZoom}
                        onChange={e => setCadSettings(s => ({ ...s, minStationZoom: Number(e.target.value) }))}
                        className="w-full accent-amber-500 mt-2"
                      />
                      <p className="text-[10px] text-slate-400">
                        Apenas mostra os textos e tiques verdes das estacas quando o zoom for ≥ Nível {cadSettings.minStationZoom}.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 pt-2">
                    <div>
                      <strong className="text-white font-bold block">Exibir Estacas no Desenho</strong>
                      <span className="text-[11px] text-slate-400">Mostrar rótulos e perpendiculares de estacas.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cadSettings.showStations}
                        onChange={e => setCadSettings(s => ({ ...s, showStations: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-bold">Rotação do Texto (Estacas)</span>
                      <span className="text-amber-400 font-black">{cadSettings.stationTextRotation || 0}°</span>
                    </div>
                    <div>
                      <input
                        type="range"
                        min={-90}
                        max={90}
                        step={15}
                        value={cadSettings.stationTextRotation || 0}
                        onChange={e => setCadSettings(s => ({ ...s, stationTextRotation: Number(e.target.value) }))}
                        className="w-full accent-amber-500 mt-2"
                      />
                      <p className="text-[10px] text-slate-400">
                        Ajusta a inclinação do texto em relação à linha perpendicular. (0 = perpendicular, 90 = paralelo)
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* RODAPÉ DO MODAL */}
              <div className="p-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
                <button
                  onClick={() => {
                    const def = resetCadSettings();
                    setCadSettings(def);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar Padrões
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportCadSettingsScript(cadSettings)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700"
                  >
                    <Download className="w-4 h-4" />
                    Script JSON
                  </button>
                  <button
                    onClick={() => {
                      saveCadSettings(cadSettings);
                      setShowSettingsModal(false);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Salvar e Aplicar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE FORMULÁRIO PARA NOVO ALFINETE (PIN) */}
      <AnimatePresence>
        {pinFormModal.isOpen && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 text-white rounded-[32px] shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-400" />
                  Novo Alfinete no Desenho
                </h4>
                <button
                  onClick={() => setPinFormModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Título / Nome do Ponto *</label>
                  <input
                    type="text"
                    placeholder="ex: Bueiro Duplo de Concreto E-140"
                    value={pinFormModal.title}
                    onChange={e => setPinFormModal(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300">Categoria</label>
                    <select
                      value={pinFormModal.category}
                      onChange={e => setPinFormModal(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      <option value="obras_arte">Obra de Arte Especial</option>
                      <option value="bueiro">Bueiro / Drenagem</option>
                      <option value="patologia">Patologia / Defeito</option>
                      <option value="corte_aterro">Corte / Aterro Crítico</option>
                      <option value="estaca">Marco de Estaca</option>
                      <option value="outro">Outro Ponto</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Cor do Marcador</label>
                    <select
                      value={pinFormModal.color}
                      onChange={e => setPinFormModal(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      <option value="red">Vermelho</option>
                      <option value="emerald">Verde Esmeralda</option>
                      <option value="blue">Azul</option>
                      <option value="amber">Amarelo Âmbar</option>
                      <option value="purple">Roxo</option>
                      <option value="pink">Rosa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">Estaca aproximada (opcional)</label>
                  <input
                    type="text"
                    placeholder="ex: 140+12,50"
                    value={pinFormModal.station}
                    onChange={e => setPinFormModal(prev => ({ ...prev, station: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">Observações / Detalhes</label>
                  <textarea
                    rows={3}
                    placeholder="Adicione detalhes adicionais..."
                    value={pinFormModal.notes}
                    onChange={e => setPinFormModal(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setPinFormModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePin}
                  disabled={!pinFormModal.title.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  Salvar Alfinete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE OPÇÕES DE EXPORTAÇÃO KML */}
      <AnimatePresence>
        {showKmlModal && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 text-white rounded-[32px] shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Exportar Projeto para KML</h4>
                    <p className="text-xs text-slate-400">Gere um arquivo compatível com Google Earth e GPS de campo</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowKmlModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Selecione as camadas para incluir no KML:</p>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-blue-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div>
                      <strong className="text-xs text-slate-200 block">Eixo do Traçado Horizontal</strong>
                      <span className="text-[11px] text-slate-400">Linha contínua amarela do eixos com coordenadas e cotas</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={kmlOptions.includeAlignmentLine}
                    onChange={e => setKmlOptions(o => ({ ...o, includeAlignmentLine: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-blue-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <div>
                      <strong className="text-xs text-slate-200 block">Pontos e Estacas do Traçado ({currentAlignment?.points?.length || 0})</strong>
                      <span className="text-[11px] text-slate-400">Placemarks individuais com numéro de estaca e raio de curva</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={kmlOptions.includeStations}
                    onChange={e => setKmlOptions(o => ({ ...o, includeStations: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-blue-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div>
                      <strong className="text-xs text-slate-200 block">Alfinetes e Ocorrências ({pins.length})</strong>
                      <span className="text-[11px] text-slate-400">Marcadores de obras de arte, patologias e pontos cadastrados</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={kmlOptions.includePins}
                    onChange={e => setKmlOptions(o => ({ ...o, includePins: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-blue-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-cyan-400" />
                    <div>
                      <strong className="text-xs text-slate-200 block">Medições da Régua ({savedMeasurements.length})</strong>
                      <span className="text-[11px] text-slate-400">Linhas de distância e áreas medidas no desenho</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={kmlOptions.includeMeasurements}
                    onChange={e => setKmlOptions(o => ({ ...o, includeMeasurements: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowKmlModal(false)}
                  className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportKml}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Download className="w-4 h-4" />
                  Gerar e Baixar .KML
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
