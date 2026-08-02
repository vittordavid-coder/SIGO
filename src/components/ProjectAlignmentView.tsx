import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MapPin, Upload, Download, FileSpreadsheet, Layers, Compass, 
  Ruler, Database, Eye, Trash2, CheckCircle2, AlertTriangle, 
  RefreshCw, ChevronRight, Info, Copy, Check, Maximize2, Minimize2, Map
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Contract, ProjectAlignment, ProjectAlignmentPoint } from '../types';

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

// Convert UTM (WGS84 / SIRGAS 2000) to Lat / Lng (Approximate for South America / Brazil zones)
function utmToLatLng(easting: number, northing: number, zone: number = 23, southernHemisphere: boolean = true) {
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

  return {
    lat: latRad * (180 / Math.PI),
    lng: lngRad * (180 / Math.PI)
  };
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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ProjectAlignmentPoint | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Auto width
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, 
      { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 15 }, { wch: 35 }
    ];

    XLSX.writeFile(wb, `Modelo_Tracado_Horizontal_${contract.workName || 'Obra'}.xlsx`);
  };

  // Handle Uploading Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawData || rawData.length === 0) {
          throw new Error('O arquivo de planilha está vazio ou não possui linhas válidas.');
        }

        const parsedPoints: ProjectAlignmentPoint[] = [];

        rawData.forEach((row, index) => {
          // Normalize row keys to lowercase
          const keys = Object.keys(row);
          const getVal = (possibleNames: string[]) => {
            const foundKey = keys.find(k => possibleNames.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p.toLowerCase())));
            return foundKey ? row[foundKey] : undefined;
          };

          // Find station
          const rawStation = getVal(['estaca', 'station', 'st', 'km']) ?? `E-${index}`;
          const rawLat = getVal(['lat', 'latitude', 'y', 'northing']);
          const rawLng = getVal(['lng', 'lon', 'longitude', 'x', 'easting']);
          const rawUTMX = getVal(['utmx', 'x', 'easting', 'leste']);
          const rawUTMY = getVal(['utmy', 'y', 'northing', 'norte']);
          const rawRadius = getVal(['raio', 'radius', 'r']);
          const rawType = getVal(['tipo', 'type', 'elemento', 'element']);
          const rawDesc = getVal(['desc', 'descricao', 'description', 'observacao', 'obs']);
          const rawElev = getVal(['cota', 'elevacao', 'z', 'alt']);

          let latNum = parseFloat(String(rawLat).replace(',', '.'));
          let lngNum = parseFloat(String(rawLng).replace(',', '.'));
          let eastingNum = parseFloat(String(rawUTMX).replace(',', '.'));
          let northingNum = parseFloat(String(rawUTMY).replace(',', '.'));

          // Check if coordinates are in UTM format (X: ~100.000 to 900.000, Y: ~1.000.000 to 10.000.000)
          if ((isNaN(latNum) || isNaN(lngNum)) && !isNaN(eastingNum) && !isNaN(northingNum)) {
            const converted = utmToLatLng(eastingNum, northingNum, utmZone, true);
            latNum = converted.lat;
            lngNum = converted.lng;
          } else if (!isNaN(latNum) && Math.abs(latNum) > 100000 && !isNaN(lngNum) && Math.abs(lngNum) > 100000) {
            // Swap if user put Y in lat and X in lng
            const converted = utmToLatLng(lngNum, latNum, utmZone, true);
            latNum = converted.lat;
            lngNum = converted.lng;
          }

          if (!isNaN(latNum) && !isNaN(lngNum) && Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180) {
            parsedPoints.push({
              id: `pt-${index}-${Date.now()}`,
              station: String(rawStation).trim(),
              lat: latNum,
              lng: lngNum,
              easting: !isNaN(eastingNum) ? eastingNum : undefined,
              northing: !isNaN(northingNum) ? northingNum : undefined,
              radius: rawRadius ? parseFloat(String(rawRadius).replace(',', '.')) || 0 : undefined,
              type: (rawType ? String(rawType).toUpperCase().trim() : 'PI') as any,
              description: rawDesc ? String(rawDesc).trim() : undefined,
              elevation: rawElev ? parseFloat(String(rawElev).replace(',', '.')) || 0 : undefined
            });
          }
        });

        if (parsedPoints.length === 0) {
          throw new Error('Não foi possível reconhecer colunas de coordenadas válidas (Latitude/Longitude ou UTM X/Y) na planilha. Baixe o modelo para referência.');
        }

        // Calculate total length in meters
        let totalLen = 0;
        for (let i = 1; i < parsedPoints.length; i++) {
          totalLen += haversineDistance(
            parsedPoints[i - 1].lat, parsedPoints[i - 1].lng,
            parsedPoints[i].lat, parsedPoints[i].lng
          );
        }

        const newAlignment: ProjectAlignment = {
          id: `proj-${Date.now()}`,
          contractId: contract.id,
          contractName: contract.workName || contract.client || 'Sem Nome',
          title: `Traçado Horizontal - ${file.name.replace(/\.[^/.]+$/, '')}`,
          highwayCode: contract.contractNumber || 'TRECHO-01',
          importedAt: new Date().toISOString(),
          fileName: file.name,
          totalLengthMeters: Math.round(totalLen * 100) / 100,
          startStation: parsedPoints[0]?.station || '0+000',
          endStation: parsedPoints[parsedPoints.length - 1]?.station || `E-${parsedPoints.length}`,
          points: parsedPoints
        };

        if (onSaveProjectAlignment) {
          onSaveProjectAlignment(newAlignment);
        }

        setIsUploading(false);
      } catch (err: any) {
        setUploadError(err.message || 'Erro ao processar planilha Excel.');
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setUploadError('Erro de leitura do arquivo no navegador.');
      setIsUploading(false);
    };

    reader.readAsBinaryString(file);
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

  // Generate SQL Script
  const generatedSql = useMemo(() => {
    if (!currentAlignment) return '';

    return `-- =========================================================
-- SCRIPT SQL: CRIAÇÃO E INSERÇÃO DO PROJETO DE TRAÇADO HORIZONTAL
-- Sistema SYNERA ERP / Sala Técnica
-- Obra: ${contract.workName || contract.client}
-- Data de Geração: ${new Date().toLocaleDateString('pt-BR')}
-- =========================================================

-- 1. Criação da Tabela Principal do Projeto
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

-- 2. Criação da Tabela de Pontos e Geometria do Traçado Horizontal
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

-- Índices de Desempenho
CREATE INDEX IF NOT EXISTS idx_alignment_contract ON project_alignments(contract_id);
CREATE INDEX IF NOT EXISTS idx_alignment_points_alignment ON project_alignment_points(alignment_id);

-- 3. Inserção do Projeto Atual
INSERT INTO project_alignments (
    id, contract_id, contract_name, title, highway_code, file_name, total_length_meters, start_station, end_station, imported_at
) VALUES (
    '${currentAlignment.id}',
    '${currentAlignment.contractId}',
    '${(currentAlignment.contractName || '').replace(/'/g, "''")}',
    '${currentAlignment.title.replace(/'/g, "''")}',
    '${(currentAlignment.highwayCode || '').replace(/'/g, "''")}',
    '${(currentAlignment.fileName || '').replace(/'/g, "''")}',
    ${currentAlignment.totalLengthMeters},
    '${currentAlignment.startStation}',
    '${currentAlignment.endStation}',
    '${currentAlignment.importedAt}'
) ON CONFLICT (id) DO UPDATE SET 
    total_length_meters = EXCLUDED.total_length_meters,
    imported_at = EXCLUDED.imported_at;

-- 4. Inserção dos Pontos do Traçado (${currentAlignment.points.length} registros)
${currentAlignment.points.map((p, idx) => `INSERT INTO project_alignment_points (id, alignment_id, sequence_order, station, latitude, longitude, easting_utm, northing_utm, radius_meters, element_type, description, elevation_meters) VALUES ('${p.id}', '${currentAlignment.id}', ${idx + 1}, '${p.station}', ${p.lat}, ${p.lng}, ${p.easting ?? 'NULL'}, ${p.northing ?? 'NULL'}, ${p.radius ?? 0}, '${p.type || 'PI'}', ${(p.description ? `'${p.description.replace(/'/g, "''")}'` : 'NULL')}, ${p.elevation ?? 0});`).join('\n')}
`;
  }, [currentAlignment, contract]);

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(generatedSql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  // Google Map Tile Source URL
  const mapTileUrl = useMemo(() => {
    switch (activeLayerType) {
      case 'google_satellite':
        return 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
      case 'google_hybrid':
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'; // Default Google Satellite + Roads
      case 'google_roadmap':
        return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      case 'google_terrain':
        return 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
      default:
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    }
  }, [activeLayerType]);

  // Center coordinate for Leaflet map init
  const defaultCenter = useMemo<[number, number]>(() => {
    if (currentAlignment && currentAlignment.points.length > 0) {
      const midIdx = Math.floor(currentAlignment.points.length / 2);
      return [currentAlignment.points[midIdx].lat, currentAlignment.points[midIdx].lng];
    }
    return [-23.55052, -46.633308]; // Default SP
  }, [currentAlignment]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER PRINCIPAL DE PROJETO DA SALA TÉCNICA */}
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
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  Projeto Carregado
                </span>
              )}
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Projeto de Traçado Horizontal
            </h2>
            <p className="text-blue-200/80 text-sm max-w-2xl leading-relaxed">
              Importe a planilha de eixos e vértices (.xls/.xlsx) para visualização geoespacial com fundo de mapa em imagens de <strong className="text-white font-black">Satélite do Google Maps</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadSampleExcel}
              className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg hover:scale-[1.02]"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Baixar Modelo Excel
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4 stroke-[3]" />
              {currentAlignment ? 'Substituir Planilha' : 'Carregar Planilha (.xls)'}
            </button>

            <input 
              ref={fileInputRef}
              type="file" 
              accept=".xls,.xlsx,.csv" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>

      {/* MENSAGEM DE ERRO NA IMPORTAÇÃO */}
      {uploadError && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-bold">{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-xs font-black uppercase hover:underline">Fechar</button>
        </motion.div>
      )}

      {/* SE NENHUM PROJETO ESTIVER CARREGADO */}
      {!currentAlignment && !isUploading && (
        <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-200 shadow-sm space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <FileSpreadsheet className="w-10 h-10" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Nenhum Traçado Horizontal Importado</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Carregue uma planilha Excel contendo as estacas, coordenadas (Latitude/Longitude ou UTM) e raios das curvas da rodovia.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-blue-200 transition-all"
            >
              <Upload className="w-5 h-5" />
              Selecionar Planilha do Projeto (.xls)
            </button>

            <button
              onClick={handleDownloadSampleExcel}
              className="px-6 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Download className="w-5 h-5 text-gray-500" />
              Ver Exemplo de Planilha
            </button>
          </div>

          <div className="pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
              <span className="text-xs font-black text-blue-600 uppercase">1. Colunas Aceitas</span>
              <p className="text-xs text-gray-600 leading-snug">Estaca, Latitude, Longitude, UTM X, UTM Y, Raio (m), Tipo de Elemento e Descrição.</p>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
              <span className="text-xs font-black text-emerald-600 uppercase">2. Fundo Google Maps Satélite</span>
              <p className="text-xs text-gray-600 leading-snug">O sistema renderiza automaticamente o traçado vetorial em cima das ortofotos de satélite.</p>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
              <span className="text-xs font-black text-purple-600 uppercase">3. Integração com Banco</span>
              <p className="text-xs text-gray-600 leading-snug">Gere scripts SQL prontos para exportação e sincronização com seu banco de dados técnico.</p>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL COMPLETO DO PROJETO CARREGADO */}
      {currentAlignment && (
        <div className="space-y-6">

          {/* DASHBOARD DE ESTATÍSTICAS TÉCNICAS DO TRAÇADO */}
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
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> Total de Vértices
                </span>
                <p className="text-xl font-black text-gray-900">{stats.totalPoints} Pontos</p>
                <p className="text-[11px] text-gray-400 font-bold truncate">{currentAlignment.fileName}</p>
              </div>
            </div>
          )}

          {/* VISUALIZADOR GEOESPACIAL DO MAPA GOOGLE MAPS (SATÉLITE DEFAULT) */}
          <div className={`bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl overflow-hidden relative transition-all duration-300 ${
            isMapExpanded ? 'fixed inset-4 z-50 rounded-2xl h-[calc(100vh-2rem)]' : 'h-[520px]'
          }`}>
            
            {/* BARRA DE FERRAMENTAS SOBREPOSTA AO MAPA */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
              
              {/* CAMADAS DO GOOGLE MAPS */}
              <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-1 pointer-events-auto">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2 flex items-center gap-1">
                  <Map className="w-3.5 h-3.5 text-emerald-400" /> Google Maps:
                </span>

                <button
                  onClick={() => setActiveLayerType('google_hybrid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeLayerType === 'google_hybrid' 
                      ? 'bg-emerald-500 text-slate-950 shadow-md' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Satélite Híbrido (Padrão)
                </button>

                <button
                  onClick={() => setActiveLayerType('google_satellite')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeLayerType === 'google_satellite' 
                      ? 'bg-emerald-500 text-slate-950 shadow-md' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Satélite Puro
                </button>

                <button
                  onClick={() => setActiveLayerType('google_roadmap')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeLayerType === 'google_roadmap' 
                      ? 'bg-emerald-500 text-slate-950 shadow-md' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Mapa Vetorial
                </button>

                <button
                  onClick={() => setActiveLayerType('google_terrain')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeLayerType === 'google_terrain' 
                      ? 'bg-emerald-500 text-slate-950 shadow-md' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Terreno
                </button>
              </div>

              {/* AÇÕES ADICIONAIS DO MAPA */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => setShowSqlModal(true)}
                  className="px-3.5 py-2 rounded-2xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-xl backdrop-blur-md border border-indigo-400/30 transition-all"
                >
                  <Database className="w-3.5 h-3.5" />
                  Script SQL
                </button>

                <button
                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                  className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-extrabold border border-slate-700/80 shadow-xl backdrop-blur-md transition-all"
                  title={isMapExpanded ? 'Minimizar Mapa' : 'Expandir Mapa'}
                >
                  {isMapExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

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

              {/* LINHA POLILINHA DO TRAÇADO HORIZONTAL */}
              <Polyline
                positions={currentAlignment.points.map(p => [p.lat, p.lng])}
                pathOptions={{
                  color: '#06b6d4', // Cyan
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

                let markerColor = '#3b82f6'; // Blue default PI
                if (isStart) markerColor = '#10b981'; // Green Start
                if (isEnd) markerColor = '#ef4444'; // Red End
                if (isCurve) markerColor = '#f59e0b'; // Amber Curve

                const customIcon = L.divIcon({
                  className: 'custom-map-marker',
                  html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
                  iconSize: [14, 14],
                  iconAnchor: [7, 7]
                });

                return (
                  <Marker
                    key={pt.id}
                    position={[pt.lat, pt.lng]}
                    icon={customIcon}
                    eventHandlers={{
                      click: () => setSelectedPoint(pt)
                    }}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-1 space-y-1 text-slate-900">
                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-1">
                          <span className="font-black text-sm text-blue-700">Estaca: {pt.station}</span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {pt.type || 'PI'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-600">{pt.description || 'Vértice do Traçado'}</p>
                        <div className="text-[11px] space-y-0.5 text-gray-500 pt-1 font-mono">
                          <p>Lat: {pt.lat.toFixed(6)} | Lng: {pt.lng.toFixed(6)}</p>
                          {pt.easting && <p>UTM X: {pt.easting.toLocaleString('pt-BR')} | Y: {pt.northing?.toLocaleString('pt-BR')}</p>}
                          {pt.radius ? <p className="text-amber-600 font-extrabold">Raio de Curva: {pt.radius}m</p> : null}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* TABELA DE ESTACAS E VÉRTICES DO PROJETO */}
          <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  Tabela de Vértices do Traçado Horizontal
                </h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                  Lista completa de coordenadas e elementos geométricos da diretriz
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Pesquisar por estaca, tipo ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium w-full md:w-72 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />

                {onDeleteProjectAlignment && (
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover este projeto de traçado horizontal?')) {
                        onDeleteProjectAlignment(currentAlignment.id);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors shrink-0"
                    title="Excluir Projeto Atual"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 max-h-96 custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-black tracking-wider text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Estaca</th>
                    <th className="py-3 px-4">Elemento</th>
                    <th className="py-3 px-4">Latitude</th>
                    <th className="py-3 px-4">Longitude</th>
                    <th className="py-3 px-4">Raio (m)</th>
                    <th className="py-3 px-4">Cota (m)</th>
                    <th className="py-3 px-4">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {filteredPoints.map((pt, idx) => (
                    <tr key={pt.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-black text-gray-900">{pt.station}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          pt.radius ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {pt.type || 'PI'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600">{pt.lat.toFixed(6)}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600">{pt.lng.toFixed(6)}</td>
                      <td className="py-3 px-4 font-bold text-amber-700">{pt.radius ? `${pt.radius} m` : '-'}</td>
                      <td className="py-3 px-4 font-mono text-gray-500">{pt.elevation ? `${pt.elevation} m` : '-'}</td>
                      <td className="py-3 px-4 text-gray-500">{pt.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL COM O SCRIPT SQL PRONTO PARA BANCO DE DADOS */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 text-slate-100 rounded-[32px] border border-slate-800 p-6 md:p-8 max-w-4xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Script SQL para Banco de Dados</h3>
                    <p className="text-xs text-slate-400">Comandos DDL e DML para persistência do projeto em PostgreSQL / Cloud SQL</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSqlModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 custom-scrollbar relative">
                <pre className="whitespace-pre-wrap leading-relaxed">{generatedSql}</pre>
              </div>

              <div className="flex justify-between items-center pt-2 shrink-0">
                <span className="text-xs text-slate-400">
                  {currentAlignment?.points.length} vértices compilados no script.
                </span>

                <button
                  onClick={copySqlToClipboard}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all"
                >
                  {sqlCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {sqlCopied ? 'Script Copiado!' : 'Copiar Script SQL'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
