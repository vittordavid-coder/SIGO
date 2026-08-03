import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MapPin, Upload, Download, FileSpreadsheet, Layers, Compass, 
  Ruler, Database, Eye, Trash2, CheckCircle2, AlertTriangle, 
  RefreshCw, ChevronRight, Info, Copy, Check, Maximize2, Minimize2, Map,
  Plus, X, Edit3, Tag, Sliders, Filter, ArrowRight, Search, FileText, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Contract, ProjectAlignment, ProjectAlignmentPoint, ProjectPin, ProjectMeasurement } from '../types';

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
    return projectAlignments.find(a => a.contractId === contract.id) || projectAlignments[0];
  }, [projectAlignments, contract.id]);

  const [activeLayerType, setActiveLayerType] = useState<'google_satellite' | 'google_hybrid' | 'google_roadmap' | 'google_terrain'>('google_hybrid');
  const [utmZone, setUtmZone] = useState<number>(23);
  const [coordinateType, setCoordinateType] = useState<'UTM' | 'LAT_LNG'>('UTM');
  const [selectedDatum, setSelectedDatum] = useState<'SIRGAS 2000' | 'SAD-69'>('SIRGAS 2000');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);

  // Visual Importer Modal State (rh-like multi step)
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

  // Sidebar Tool States (Menu Lateral)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'pins' | 'measure' | 'layers' | 'points' | 'sql'>('pins');
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
        const autoMap = { station: '', lat: '', lng: '', utmx: '', utmy: '', radius: '', type: '', desc: '', elevation: '' };
        headers.forEach(h => {
          const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (['estaca', 'station', 'st', 'km'].some(k => lower.includes(k)) && !autoMap.station) autoMap.station = h;
          if (['latitude', 'lat', 'y', 'norte'].some(k => lower.includes(k)) && !autoMap.lat && !lower.includes('utm')) autoMap.lat = h;
          if (['longitude', 'lng', 'lon', 'x', 'leste'].some(k => lower.includes(k)) && !autoMap.lng && !lower.includes('utm')) autoMap.lng = h;
          if (['utmx', 'easting', 'leste'].some(k => lower.includes(k)) && !autoMap.utmx) autoMap.utmx = h;
          if (['utmy', 'northing', 'norte'].some(k => lower.includes(k)) && !autoMap.utmy) autoMap.utmy = h;
          if (['raio', 'radius', 'r'].some(k => lower.includes(k)) && !autoMap.radius) autoMap.radius = h;
          if (['tipo', 'type', 'elemento'].some(k => lower.includes(k)) && !autoMap.type) autoMap.type = h;
          if (['desc', 'descricao', 'obs'].some(k => lower.includes(k)) && !autoMap.desc) autoMap.desc = h;
          if (['cota', 'elevacao', 'z', 'alt'].some(k => lower.includes(k)) && !autoMap.elevation) autoMap.elevation = h;
        });

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

      // PT-BR Decimal Formatting Helper (replaces ',' with '.')
      const parsePtBrFloat = (val: any): number => {
        if (val === undefined || val === null || val === '') return NaN;
        const cleanStr = String(val).trim().replace(/\s+/g, '').replace(',', '.');
        return parseFloat(cleanStr);
      };

      let latNum = parsePtBrFloat(rawLat);
      let lngNum = parsePtBrFloat(rawLng);
      let eastingNum = parsePtBrFloat(rawUTMX);
      let northingNum = parsePtBrFloat(rawUTMY);

      if (coordinateType === 'UTM') {
        if (!isNaN(eastingNum) && !isNaN(northingNum)) {
          const converted = utmToLatLng(eastingNum, northingNum, utmZone, true, selectedDatum);
          latNum = converted.lat;
          lngNum = converted.lng;
        }
      }

      if (!isNaN(latNum) && !isNaN(lngNum) && Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180) {
        parsedPoints.push({
          id: `pt-${index}-${Date.now()}`,
          station: String(rawStation).trim(),
          lat: latNum,
          lng: lngNum,
          easting: !isNaN(eastingNum) ? eastingNum : undefined,
          northing: !isNaN(northingNum) ? northingNum : undefined,
          radius: !isNaN(parsePtBrFloat(rawRadius)) ? parsePtBrFloat(rawRadius) : undefined,
          type: (rawType ? String(rawType).toUpperCase().trim() : 'PI') as any,
          description: rawDesc ? String(rawDesc).trim() : undefined,
          elevation: !isNaN(parsePtBrFloat(rawElev)) ? parsePtBrFloat(rawElev) : undefined
        });
      }
    });

    if (parsedPoints.length === 0) {
      setImportError(`Não foi possível identificar coordenadas válidas para o formato ${coordinateType === 'UTM' ? 'UTM (Metros)' : 'Lat/Lng (Graus)'}. Verifique se os números utilizam vírgula (,) ou ponto (.) decimal PT-BR.`);
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
    if (!currentAlignment || currentAlignment.points.length === 0) return null;
    const pts = currentAlignment.points;
    const totalKm = (currentAlignment.totalLengthMeters / 1000).toFixed(3);
    const totalMeters = currentAlignment.totalLengthMeters.toLocaleString('pt-BR');
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

  // Generate Comprehensive SQL Script
  // Generate Comprehensive SQL Script
  const generatedSql = useMemo(() => {
    if (!currentAlignment) return '';

    const esc = (val: any): string => {
      if (val === null || val === undefined) return "''";
      const s = String(val).replace(/'/g, "''").replace(/\\/g, "\\\\");
      return `'${s}'`;
    };

    const escNum = (val: any, defaultVal: number = 0): string => {
      if (val === null || val === undefined || val === '') return String(defaultVal);
      const n = Number(val);
      return Number.isFinite(n) ? String(n) : String(defaultVal);
    };

    const escNullableNum = (val: any): string => {
      if (val === null || val === undefined || val === '') return 'NULL';
      const n = Number(val);
      return Number.isFinite(n) ? String(n) : 'NULL';
    };

    return `-- =========================================================
-- SCRIPT SQL DE ATUALIZAÇÃO E SINCRONIZAÇÃO DO PROJETO
-- Sistema SYNERA ERP / Sala Técnica
-- Obra: ${esc(contract.workName || contract.client || 'Obra Principal')}
-- Data de Geração: ${new Date().toLocaleDateString('pt-BR')}
-- =========================================================

-- 1. Tabela Principal de Traçados Horizontais
CREATE TABLE IF NOT EXISTS project_alignments (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL,
    contract_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    highway_code VARCHAR(100),
    file_name VARCHAR(255),
    total_length_meters NUMERIC(12, 2) DEFAULT 0,
    start_station VARCHAR(50),
    end_station VARCHAR(50),
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Pontos e Vértices da Geometria do Traçado
CREATE TABLE IF NOT EXISTS project_alignment_points (
    id VARCHAR(255) PRIMARY KEY,
    alignment_id VARCHAR(255) NOT NULL REFERENCES project_alignments(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    station VARCHAR(50) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    easting_utm NUMERIC(12, 3),
    northing_utm NUMERIC(12, 3),
    radius_meters NUMERIC(10, 2) DEFAULT 0,
    deflection_deg NUMERIC(8, 4),
    element_type VARCHAR(20) DEFAULT 'PI',
    description TEXT,
    elevation_meters NUMERIC(10, 2)
);

-- 3. Tabela de Alfinetes e Pontos de Interesse (Pins no Desenho)
CREATE TABLE IF NOT EXISTS project_pins (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL,
    alignment_id VARCHAR(255) REFERENCES project_alignments(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    color VARCHAR(30) DEFAULT 'red',
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    station VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Medições Efetuadas no Desenho (Réguas)
CREATE TABLE IF NOT EXISTS project_measurements (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL,
    alignment_id VARCHAR(255) REFERENCES project_alignments(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    total_distance_meters NUMERIC(12, 2) NOT NULL,
    points_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Índices para Otimização de Consultas Geoespaciais
CREATE INDEX IF NOT EXISTS idx_alignment_contract ON project_alignments(contract_id);
CREATE INDEX IF NOT EXISTS idx_alignment_points_alignment ON project_alignment_points(alignment_id);
CREATE INDEX IF NOT EXISTS idx_pins_contract ON project_pins(contract_id);
CREATE INDEX IF NOT EXISTS idx_measurements_contract ON project_measurements(contract_id);

-- 6. Inserção / Upsert do Traçado Principal
INSERT INTO project_alignments (
    id, contract_id, contract_name, title, highway_code, file_name, total_length_meters, start_station, end_station, imported_at
) VALUES (
    ${esc(currentAlignment.id)},
    ${esc(currentAlignment.contractId)},
    ${esc(currentAlignment.contractName || '')},
    ${esc(currentAlignment.title)},
    ${esc(currentAlignment.highwayCode || '')},
    ${esc(currentAlignment.fileName || '')},
    ${escNum(currentAlignment.totalLengthMeters, 0)},
    ${esc(currentAlignment.startStation || '0+000')},
    ${esc(currentAlignment.endStation || 'FIM')},
    ${esc(currentAlignment.importedAt || new Date().toISOString())}
) ON CONFLICT (id) DO UPDATE SET 
    total_length_meters = EXCLUDED.total_length_meters,
    imported_at = EXCLUDED.imported_at;

-- 7. Inserção dos Vértices do Traçado (${currentAlignment.points.length} registros)
${currentAlignment.points.map((p, idx) => `INSERT INTO project_alignment_points (id, alignment_id, sequence_order, station, latitude, longitude, easting_utm, northing_utm, radius_meters, element_type, description, elevation_meters) VALUES (${esc(p.id)}, ${esc(currentAlignment.id)}, ${idx + 1}, ${esc(p.station)}, ${escNum(p.lat, 0)}, ${escNum(p.lng, 0)}, ${escNullableNum(p.easting)}, ${escNullableNum(p.northing)}, ${escNum(p.radius, 0)}, ${esc(p.type || 'PI')}, ${p.description ? esc(p.description) : 'NULL'}, ${escNullableNum(p.elevation)}) ON CONFLICT (id) DO NOTHING;`).join('\n')}

-- 8. Inserção dos Alfinetes / Pontos de Interesse (${pins.length} registros)
${pins.map(p => `INSERT INTO project_pins (id, contract_id, alignment_id, title, category, color, latitude, longitude, station, notes, created_at) VALUES (${esc(p.id)}, ${esc(p.contractId)}, ${esc(currentAlignment.id)}, ${esc(p.title)}, ${esc(p.category)}, ${esc(p.color)}, ${escNum(p.lat, 0)}, ${escNum(p.lng, 0)}, ${p.station ? esc(p.station) : 'NULL'}, ${p.notes ? esc(p.notes) : 'NULL'}, ${esc(p.createdAt)}) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category, color = EXCLUDED.color, notes = EXCLUDED.notes;`).join('\n')}

-- 9. Inserção das Medições Realizadas (${savedMeasurements.length} registros)
${savedMeasurements.map(m => `INSERT INTO project_measurements (id, contract_id, alignment_id, title, total_distance_meters, points_json, created_at) VALUES (${esc(m.id)}, ${esc(m.contractId)}, ${esc(currentAlignment.id)}, ${esc(m.title)}, ${escNum(m.totalDistanceMeters, 0)}, ${esc(JSON.stringify(m.points))}::jsonb, ${esc(m.createdAt)}) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, total_distance_meters = EXCLUDED.total_distance_meters, points_json = EXCLUDED.points_json;`).join('\n')}
`;
  }, [currentAlignment, contract, pins, savedMeasurements]);

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(generatedSql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  // Map Tile URL Provider
  const mapTileUrl = useMemo(() => {
    switch (activeLayerType) {
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
  }, [activeLayerType]);

  const defaultCenter = useMemo<[number, number]>(() => {
    if (currentAlignment && currentAlignment.points.length > 0) {
      const midIdx = Math.floor(currentAlignment.points.length / 2);
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

          {/* APENAS UM BOTÃO PRINCIPAL DE IMPORTAÇÃO DA PLANILHA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setImportStep(1);
                setShowImportModal(true);
              }}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center gap-3 shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-5 h-5 stroke-[2.5]" />
              Importar Planilha de Traçado
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
                  onClick={() => { setSidebarTab('sql'); setIsSidebarOpen(true); }}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    sidebarTab === 'sql' 
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' 
                      : 'text-slate-400 hover:bg-slate-900'
                  }`}
                  title="Script SQL de Atualização"
                >
                  <Database className="w-4 h-4" />
                  {isSidebarOpen && <span className="text-[10px]">SQL</span>}
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
                              <strong className="text-blue-300 font-black text-sm">{activeMeasureDistance.toLocaleString('pt-BR')} m</strong>
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
                                <p className="text-[10px] text-blue-400 font-black">{m.totalDistanceMeters.toLocaleString('pt-BR')} m</p>
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

                  {/* ABA: CAMADAS DO MAPA */}
                  {sidebarTab === 'layers' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        Provedor de Imagens
                      </span>

                      <div className="space-y-1.5">
                        <button
                          onClick={() => setActiveLayerType('google_hybrid')}
                          className={`w-full p-3 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                            activeLayerType === 'google_hybrid' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>Google Satélite Híbrido</span>
                          {activeLayerType === 'google_hybrid' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </button>

                        <button
                          onClick={() => setActiveLayerType('google_satellite')}
                          className={`w-full p-3 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                            activeLayerType === 'google_satellite' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>Google Satélite Puro</span>
                          {activeLayerType === 'google_satellite' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </button>

                        <button
                          onClick={() => setActiveLayerType('google_roadmap')}
                          className={`w-full p-3 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                            activeLayerType === 'google_roadmap' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>Google Vetorial</span>
                          {activeLayerType === 'google_roadmap' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </button>

                        <button
                          onClick={() => setActiveLayerType('google_terrain')}
                          className={`w-full p-3 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                            activeLayerType === 'google_terrain' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>Google Terreno</span>
                          {activeLayerType === 'google_terrain' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ABA: SCRIPT SQL */}
                  {sidebarTab === 'sql' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        Sincronização com Banco de Dados
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Gere o script SQL DDL + DML contendo as tabelas do projeto, vértices, alfinetes e medições para atualizar o PostgreSQL / Supabase.
                      </p>
                      <button
                        onClick={() => setShowSqlModal(true)}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
                      >
                        <Database className="w-4 h-4" />
                        Visualizar Script SQL
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* CONTÊINER DO MAPA GEOESPACIAL */}
            <div className="flex-1 relative h-full">
              
              {/* STATUS DE FERRAMENTA ATIVA NO TOPO DO MAPA */}
              {activeTool !== 'none' && (
                <div className="absolute top-4 left-4 z-[1000] px-4 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce">
                  {activeTool === 'pin' ? (
                    <>
                      <MapPin className="w-4 h-4 text-red-400 animate-pulse" />
                      <span>Modo Alfinete Ativo: Clique no local desejado do mapa</span>
                    </>
                  ) : (
                    <>
                      <Ruler className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span>Modo Régua Ativo: Clique no mapa para adicionar pontos de medição</span>
                    </>
                  )}
                  <button onClick={() => setActiveTool('none')} className="ml-2 p-1 rounded-full hover:bg-slate-800">
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}

              {/* MAPA INTERATIVO LEAFLET COM TILES GOOGLE MAPS */}
              <MapContainer
                center={defaultCenter}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url={mapTileUrl}
                  maxZoom={20}
                  attribution="&copy; Google Maps Satellite Imagery"
                />

                <MapBoundsFitter points={currentAlignment.points} />

                <MapEventsHandler
                  activeTool={activeTool}
                  onAddPinClick={handleAddPinClick}
                  onAddMeasureClick={handleAddMeasurePoint}
                />

                {/* LINHA POLILINHA DO TRAÇADO HORIZONTAL */}
                <Polyline
                  positions={currentAlignment.points.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 5,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />

                {/* VÉRTICES / MARCADORES DO TRAÇADO */}
                {currentAlignment.points.map((pt, idx) => {
                  const isStart = idx === 0;
                  const isEnd = idx === currentAlignment.points.length - 1;
                  const isCurve = Boolean(pt.radius && pt.radius > 0);

                  let markerColor = '#3b82f6';
                  if (isStart) markerColor = '#10b981';
                  if (isEnd) markerColor = '#ef4444';
                  if (isCurve) markerColor = '#f59e0b';

                  return (
                    <Marker
                      key={pt.id}
                      position={[pt.lat, pt.lng]}
                      icon={L.divIcon({
                        className: 'custom-vertex-marker',
                        html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                      })}
                    >
                      <Popup className="custom-leaflet-popup">
                        <div className="p-2 space-y-1 text-xs">
                          <strong className="text-gray-900 block font-black">Estaca: {pt.station}</strong>
                          <div className="text-gray-600">Tipo: {pt.type || 'PI'}</div>
                          {pt.radius && pt.radius > 0 && <div className="text-amber-600 font-bold">Raio da Curva: {pt.radius} m</div>}
                          {pt.description && <div className="text-gray-500 italic">{pt.description}</div>}
                          <div className="text-[10px] text-gray-400 pt-1">Lat: {pt.lat.toFixed(6)}, Lng: {pt.lng.toFixed(6)}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

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
                      <Marker
                        key={`m-curr-${i}`}
                        position={[p.lat, p.lng]}
                        icon={L.divIcon({
                          className: 'measure-node',
                          html: `<div style="background-color: #3b82f6; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;"></div>`,
                          iconSize: [10, 10],
                          iconAnchor: [5, 5]
                        })}
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

          {/* TABELA DE VÉRTICES E GEOMETRIA DO TRAÇADO */}
          <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Vértices e Elementos Geométricos</h3>
                <p className="text-xs text-gray-500">Lista completa de estacas, coordenadas e raios de curvatura.</p>
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
                    <th className="py-3 px-4">Latitude</th>
                    <th className="py-3 px-4">Longitude</th>
                    <th className="py-3 px-4">Raio (m)</th>
                    <th className="py-3 px-4">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredPoints.slice(0, 50).map((pt, idx) => (
                    <tr key={pt.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-2.5 px-4 text-gray-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-black text-gray-900">{pt.station}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          pt.type === 'PC' ? 'bg-amber-100 text-amber-800' :
                          pt.type === 'PT' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {pt.type || 'PI'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 font-mono">{pt.lat.toFixed(6)}</td>
                      <td className="py-2.5 px-4 text-gray-600 font-mono">{pt.lng.toFixed(6)}</td>
                      <td className="py-2.5 px-4 font-bold text-gray-900">
                        {pt.radius && pt.radius > 0 ? `${pt.radius} m` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-gray-500">{pt.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO VISUAL DA PLANILHA (SISTEMA RH-LIKE) */}
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
                          {rawExcelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
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
                              {rawExcelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
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
                              {rawExcelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
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
                              {rawExcelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
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
                              {rawExcelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
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
                          {rawExcelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
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
                              {rawExcelHeaders.map((header) => {
                                const isStation = columnMapping.station === header;
                                const isLat = columnMapping.lat === header;
                                const isLng = columnMapping.lng === header;
                                const isUtmX = columnMapping.utmx === header;
                                const isUtmY = columnMapping.utmy === header;
                                const isRadius = columnMapping.radius === header;
                                const isMapped = isStation || isLat || isLng || isUtmX || isUtmY || isRadius;

                                return (
                                  <th
                                    key={header}
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
                                {rawExcelHeaders.map((header) => {
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
                                      key={header}
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

      {/* MODAL DO SCRIPT SQL COMPLETO */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 text-white rounded-[32px] shadow-2xl border border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Script SQL de Atualização do Banco</h3>
                    <p className="text-xs text-slate-400">DDL + DML para PostgreSQL / Supabase</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copySqlToClipboard}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
                  >
                    {sqlCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{sqlCopied ? 'Copiado!' : 'Copiar Script SQL'}</span>
                  </button>
                  <button
                    onClick={() => setShowSqlModal(false)}
                    className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-300">
                <pre className="whitespace-pre-wrap leading-relaxed">{generatedSql}</pre>
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

    </div>
  );
}
