import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Smartphone, Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, 
  Send, Camera, HardHat, Wrench, Users, FileText, AlertTriangle, 
  MapPin, CloudSun, Plus, Trash2, ShieldCheck, Download, Share2, 
  ChevronRight, Calendar, ArrowUpRight, Zap, Building2, Package, ArrowLeft, Layers,
  Search, Edit3, X, Eye, LogOut, LayoutDashboard, Sliders, Grid, ZapOff, RefreshCcw,
  Upload, Navigation, Crosshair, Sparkles, BarChart2, XCircle, ArrowRightLeft, UserCheck, Save, MessageCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Contract, ServiceItem, ServiceProduction, ControllerEquipment, Employee, User, DailyReport, MobileSector, FieldProductionReport, ProjectAlignment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Chat } from './Chat';

export interface SyneraMobileViewProps {
  contracts: Contract[];
  services: ServiceItem[];
  serviceProductions: ServiceProduction[];
  equipments: ControllerEquipment[];
  employees: Employee[];
  users?: User[];
  currentUser: User;
  projectAlignments?: ProjectAlignment[];
  fieldReports?: FieldProductionReport[];
  onSaveFieldReport?: (report: FieldProductionReport) => void;
  onUpdateFieldReport?: (report: FieldProductionReport) => void;
  onUpdateServiceProduction: (p: ServiceProduction) => void;
  onAddWorkMovement?: (movement: any) => void;
  onSaveDailyReport?: (report: DailyReport) => void;
  onLogout?: () => void;
  selectedContractId?: string;
  onUpdateContractId?: (id: string) => void;
}

export interface OfflinePendingItem {
  id: string;
  type: 'production' | 'equipment' | 'headcount' | 'daily_log' | 'materials';
  timestamp: string;
  contractId: string;
  contractName: string;
  data: any;
  synced: boolean;
}

const CACHE_KEY = 'synera_mobile_cached_data_v1';
const OFFLINE_QUEUE_KEY = 'synera_mobile_offline_queue_v1';

function ServiceAutoComplete({
  services,
  selectedServiceId,
  onSelectService
}: {
  services: ServiceItem[];
  selectedServiceId: string;
  onSelectService: (service: ServiceItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId);
  }, [services, selectedServiceId]);

  const filteredServices = useMemo(() => {
    if (!query.trim()) return services;
    const lower = query.toLowerCase();
    return services.filter(s => 
      (s.name && s.name.toLowerCase().includes(lower)) ||
      (s.code && s.code.toLowerCase().includes(lower))
    );
  }, [services, query]);

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full min-h-[44px] rounded-2xl bg-slate-900 border border-slate-700 text-white px-3 py-2.5 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
      >
        <span className={selectedService ? "font-extrabold text-xs text-blue-300 truncate max-w-[280px]" : "text-xs text-slate-400 font-medium"}>
          {selectedService ? `${selectedService.code ? `[${selectedService.code}] ` : ''}${selectedService.name} (${selectedService.unit || 'un'})` : 'Pesquisar e selecionar serviço do Controles...'}
        </span>
        <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 5 }}
            className="absolute left-0 right-0 top-12 z-50 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-2 space-y-2 max-h-64 overflow-hidden flex flex-col"
          >
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Digitar nome ou código do serviço..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-1 custom-scrollbar pr-1">
              {filteredServices.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 text-center">Nenhum serviço encontrado em Controles.</p>
              ) : (
                filteredServices.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectService(s);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      selectedServiceId === s.id ? 'bg-blue-600/30 text-blue-300 font-extrabold border border-blue-500/40' : 'text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-white truncate">{s.name}</p>
                      {s.code && <span className="text-[10px] text-slate-400 font-mono">Cód: {s.code}</span>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold shrink-0">
                      {s.unit || 'un'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EquipmentAutoComplete({
  equipments,
  selectedEqId,
  onSelectEquipment
}: {
  equipments: ControllerEquipment[];
  selectedEqId: string;
  onSelectEquipment: (eq: ControllerEquipment) => void;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedEquipment = useMemo(() => {
    return equipments.find(e => e.id === selectedEqId);
  }, [equipments, selectedEqId]);

  const filteredEquipments = useMemo(() => {
    if (!query.trim()) return equipments;
    const lower = query.toLowerCase();
    return equipments.filter(e => 
      (e.name && e.name.toLowerCase().includes(lower)) ||
      (e.code && e.code.toLowerCase().includes(lower)) ||
      (e.type && e.type.toLowerCase().includes(lower)) ||
      (e.category && e.category.toLowerCase().includes(lower))
    );
  }, [equipments, query]);

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full min-h-[44px] rounded-2xl bg-slate-900 border border-slate-700 text-white px-3 py-2.5 flex items-center justify-between cursor-pointer hover:border-amber-500 transition-colors"
      >
        <span className={selectedEquipment ? "font-extrabold text-xs text-amber-300 truncate max-w-[280px]" : "text-xs text-slate-400 font-medium"}>
          {selectedEquipment 
            ? `${selectedEquipment.code ? `[${selectedEquipment.code}] ` : ''}${selectedEquipment.name}${selectedEquipment.type || selectedEquipment.category ? ` (${selectedEquipment.type || selectedEquipment.category})` : ''}` 
            : 'Pesquisar equipamento por nome ou tipo...'}
        </span>
        <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 5 }}
            className="absolute left-0 right-0 top-12 z-50 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-2 space-y-2 max-h-64 overflow-hidden flex flex-col"
          >
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Digitar nome, código ou tipo do equipamento..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-1 custom-scrollbar pr-1">
              {filteredEquipments.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 text-center">Nenhum equipamento encontrado.</p>
              ) : (
                filteredEquipments.map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      onSelectEquipment(e);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      selectedEqId === e.id ? 'bg-amber-600/30 text-amber-300 font-extrabold border border-amber-500/40' : 'text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-white truncate">{e.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {e.code && <span className="text-[10px] text-slate-400 font-mono">Cód: {e.code}</span>}
                        {(e.type || e.category) && (
                          <span className="text-[10px] text-amber-400 font-semibold">
                            Tipo: {e.type || e.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold shrink-0">
                      {e.status || 'Ativo'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SyneraMobileView({
  contracts,
  services,
  serviceProductions,
  equipments,
  employees,
  users = [],
  currentUser,
  projectAlignments = [],
  fieldReports = [],
  onSaveFieldReport,
  onUpdateFieldReport,
  onUpdateServiceProduction,
  onAddWorkMovement,
  onSaveDailyReport,
  onLogout,
}: SyneraMobileViewProps) {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  
  // Selected sector (null = Home/Landing page, or one of the 5 sector IDs or 'sincronizacao')
  const [activeSector, setActiveSector] = useState<MobileSector | 'sincronizacao' | null>(null);

  // Selected active contract in mobile
  const [selectedContractId, setSelectedContractId] = useState<string>(() => {
    return contracts[0]?.id || '';
  });

  // ----------------------------------------------------
  // CAMERA DE CAMPO PWA & ESTACA MAIS PRÓXIMA (SALA TÉCNICA)
  // ----------------------------------------------------
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraQuality, setCameraQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [photoDescription, setPhotoDescription] = useState<string>('');
  const [photoStation, setPhotoStation] = useState<string>('');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [selectedGalleryPhotos, setSelectedGalleryPhotos] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestStationInfo, setNearestStationInfo] = useState<{ station: string; distanceMeters: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Obter alinhamento do projeto para a obra ativa
  const activeAlignment = useMemo(() => {
    if (!projectAlignments || projectAlignments.length === 0) {
      // Tentar ler do localStorage se não veio por prop
      try {
        const stored = localStorage.getItem('sigo_project_alignments');
        if (stored) {
          const parsed: ProjectAlignment[] = JSON.parse(stored);
          return parsed.find(a => a.contractId === selectedContractId) || parsed[0] || null;
        }
      } catch {
        // ignore
      }
      return null;
    }
    return projectAlignments.find(a => a.contractId === selectedContractId) || projectAlignments[0] || null;
  }, [projectAlignments, selectedContractId]);

  // Função para calcular estaca mais próxima e interpolar valor fracionário
  const updateNearestStation = (lat: number, lng: number) => {
    setUserLocation({ lat, lng });

    if (!activeAlignment || !activeAlignment.points || activeAlignment.points.length === 0) {
      setNearestStationInfo(null);
      return;
    }

    const parseStationToMeters = (station: string): number => {
      if (!station) return 0;
      const clean = station.replace(/[^\d+.,]/g, '');
      const parts = clean.split('+');
      if (parts.length === 2) {
        const estaca = parseInt(parts[0], 10) || 0;
        const metros = parseFloat(parts[1].replace(',', '.')) || 0;
        return estaca * 20 + metros;
      }
      return parseFloat(clean.replace(',', '.')) || 0;
    };

    const formatMetersToStation = (meters: number): string => {
      const estaca = Math.floor(meters / 20);
      const remainder = meters % 20;
      return `${estaca}+${remainder.toFixed(2).replace('.', ',').padStart(5, '0')}`;
    };

    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371000;

    let minDistanceToAxis = Infinity;
    let interpolatedStationMeters = 0;

    if (activeAlignment.points.length === 1) {
      const pt = activeAlignment.points[0];
      const dLat = toRad(pt.lat - lat);
      const dLng = toRad(pt.lng - lng);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat)) * Math.cos(toRad(pt.lat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      minDistanceToAxis = R * c;
      interpolatedStationMeters = parseStationToMeters(pt.station);
    } else {
      const latMetersPerDeg = 111320;
      const lngMetersPerDeg = 111320 * Math.cos(lat * Math.PI / 180);

      const getFlatCoords = (l: number, g: number) => ({
        x: g * lngMetersPerDeg,
        y: l * latMetersPerDeg
      });

      const C = getFlatCoords(lat, lng);

      for (let i = 0; i < activeAlignment.points.length - 1; i++) {
        const pt1 = activeAlignment.points[i];
        const pt2 = activeAlignment.points[i+1];
        
        const A = getFlatCoords(pt1.lat, pt1.lng);
        const B = getFlatCoords(pt2.lat, pt2.lng);
        
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const lenSq = dx * dx + dy * dy;
        
        let t = 0;
        if (lenSq !== 0) {
          t = ((C.x - A.x) * dx + (C.y - A.y) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
        }
        
        const projX = A.x + t * dx;
        const projY = A.y + t * dy;
        
        const distToSegment = Math.sqrt((C.x - projX)**2 + (C.y - projY)**2);
        
        if (distToSegment < minDistanceToAxis) {
          minDistanceToAxis = distToSegment;
          const m1 = parseStationToMeters(pt1.station);
          const m2 = parseStationToMeters(pt2.station);
          interpolatedStationMeters = m1 + t * (m2 - m1);
        }
      }
    }

    const formattedDist = Math.round(minDistanceToAxis * 10) / 10;
    setNearestStationInfo({
      station: formatMetersToStation(interpolatedStationMeters),
      distanceMeters: formattedDist
    });
  };

  const fetchUserGps = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        updateNearestStation(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        setIsLocating(false);
        console.warn('GPS não disponível ou negado:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );
  };

  // Inicializar câmera
  const startCameraStream = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      let targetWidth = 1920;
      let targetHeight = 1080;
      if (cameraQuality === '720p') {
        targetWidth = 1280;
        targetHeight = 720;
      } else if (cameraQuality === '480p') {
        targetWidth = 854;
        targetHeight = 480;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: targetWidth },
          height: { ideal: targetHeight }
        },
        audio: false
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Aplicar lanterna se disponível
      const track = stream.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        try {
          await (track as any).applyConstraints({
            advanced: [{ torch: flashEnabled }]
          });
        } catch {
          // torch não suportado no navegador/hardware
        }
      }
    } catch (err) {
      console.warn('Câmera de vídeo HTML5 não disponível diretamente, usando seletor nativo:', err);
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    let watchId: number | null = null;
    if (isCameraOpen) {
      if (navigator.geolocation) {
        setIsLocating(true);
        watchId = navigator.geolocation.watchPosition(
          pos => {
            setIsLocating(false);
            updateNearestStation(pos.coords.latitude, pos.coords.longitude);
          },
          err => {
            setIsLocating(false);
            console.warn('GPS não disponível ou negado:', err);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      }
      startCameraStream();
    } else {
      stopCameraStream();
      setCapturedPhotoUrl(null);
    }
    return () => {
      stopCameraStream();
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isCameraOpen, cameraQuality]);

  const handleTakePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedPhotoUrl(dataUrl);
      }
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCapturedPhotoUrl(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhotoRecord = async () => {
    if (!capturedPhotoUrl) return;

    const stationText = photoStation || (nearestStationInfo ? nearestStationInfo.station : 'Estaca N/I');
    const descText = photoDescription.trim() || 'Foto de inspeção em campo';
    const activeContractObj = contracts.find(c => c.id === selectedContractId) || contracts[0] || { id: 'c1', name: 'Obra Principal' };

    let finalPhotoUrl = capturedPhotoUrl;
    try {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = capturedPhotoUrl;
      await new Promise((resolve, reject) => { 
        img.onload = resolve; 
        img.onerror = reject;
      });
      
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        const fontSize = Math.max(16, Math.floor(canvas.height * 0.03));
        const padding = fontSize;
        const boxHeight = fontSize * 7.5;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        let y = canvas.height - boxHeight + padding * 1.5;
        const dateText = new Date().toLocaleString('pt-BR');
        
        ctx.fillText(`Obra: ${activeContractObj.name || activeContractObj.workName || 'Obra Principal'}`, padding, y);
        y += fontSize * 1.5;
        ctx.fillText(`Data: ${dateText}`, padding, y);
        y += fontSize * 1.5;
        ctx.fillText(`Estaca: ${stationText}`, padding, y);
        y += fontSize * 1.5;
        ctx.fillText(`Obs: ${descText}`, padding, y);
        
        finalPhotoUrl = canvas.toDataURL('image/jpeg', 0.88);
      }
    } catch (err) {
      console.error('Erro ao adicionar texto na foto:', err);
    }

    const newReport: FieldProductionReport = {
      id: `photo-${Date.now()}`,
      contractId: activeContractObj.id,
      sector: 'project_admin',
      date: new Date().toISOString().slice(0, 10),
      location: stationText,
      description: descText,
      photoUrl: finalPhotoUrl,
      createdByName: currentUser.name || currentUser.username,
      synced: false,
      timestamp: new Date().toISOString()
    };

    if (onSaveFieldReport) {
      onSaveFieldReport(newReport);
    }

    const queueItem: OfflinePendingItem = {
      id: newReport.id,
      type: 'production',
      timestamp: newReport.timestamp,
      contractId: activeContractObj.id,
      contractName: activeContractObj.name || activeContractObj.workName || 'Obra Principal',
      data: newReport,
      synced: false
    };

    setOfflineQueue(prev => [queueItem, ...prev]);

    setCapturedPhotoUrl(null);
    setPhotoDescription('');
    setIsCameraOpen(false);

    alert(`📸 Foto de campo registrada com sucesso!\nEstaca: ${stationText}\nDescrição: ${descText}`);
  };

  // Offline Pending Queue State
  const [offlineQueue, setOfflineQueue] = useState<OfflinePendingItem[]>(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // PWA Prompt event state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as any).standalone) ||
      localStorage.getItem('synera_pwa_installed') === 'true'
    );
  });
  const [showPwaGuide, setShowPwaGuide] = useState<boolean>(false);

  // Sync animation state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Modal of user's records & editing
  const [isMyRecordsOpen, setIsMyRecordsOpen] = useState<boolean>(false);
  const [editingMyRecord, setEditingMyRecord] = useState<FieldProductionReport | null>(null);

  // ----------------------------------------------------
  // Form states for field reporting
  // ----------------------------------------------------
  // 1. Produção (Sala Técnica)
  const [prodServiceId, setProdServiceId] = useState<string>('');
  const [prodQty, setProdQty] = useState<string>('');
  const [prodDate, setProdDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [prodStartStation, setProdStartStation] = useState<string>('');
  const [prodEndStation, setProdEndStation] = useState<string>('');
  const [prodTrecho, setProdTrecho] = useState<string>('');
  const [prodNotes, setProdNotes] = useState<string>('');
  const [prodPhoto, setProdPhoto] = useState<string>('');

  // RH Mobile States (Sub-view, Search, Records)
  const [mobileRhSubView, setMobileRhSubView] = useState<'resumo' | 'colaboradores'>('resumo');
  const [rhSearchTerm, setRhSearchTerm] = useState('');
  const [rhTeamFilter, setRhTeamFilter] = useState('ALL');
  const [rhAttendanceDate, setRhAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));

  // RH Employee Records State: employeeId -> { status, entryTime, exitTime, transferredToTeam, notes }
  const [rhEmployeeRecords, setRhEmployeeRecords] = useState<Record<string, {
    status: 'presente' | 'falta' | 'folga';
    entryTime: string;
    exitTime: string;
    transferredToTeam?: string;
    notes?: string;
  }>>(() => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(`synera_mobile_rh_records_${todayStr}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load RH Parameters for mobile responsibles definition
  const rhParams = useMemo(() => {
    try {
      const saved = localStorage.getItem("rh_parameters_config");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }, []);

  // Allowed employees according to RH responsibles definition
  const allowedRhEmployees = useMemo(() => {
    const rawEmps = (employees || []).filter(e => e.status !== 'Inativo' && e.status !== 'Inativo (Demitido)');
    // Deduplicate employees by ID to avoid duplicate React key warnings
    const map = new Map<string, typeof rawEmps[0]>();
    rawEmps.forEach(e => {
      if (e && e.id && !map.has(e.id)) {
        map.set(e.id, e);
      }
    });
    const activeEmps = Array.from(map.values());
    const responsibles = rhParams.mobileResponsibles || [];
    
    if (!responsibles || responsibles.length === 0) {
      return activeEmps;
    }

    const matchedResp = responsibles.find((r: any) => 
      r.employeeId === currentUser?.id || 
      (currentUser?.name && r.employeeName?.toLowerCase() === currentUser.name?.toLowerCase())
    );

    if (matchedResp) {
      if (matchedResp.scope === 'ALL') {
        return activeEmps;
      }
      if (matchedResp.scope === 'TEAM' && matchedResp.teamName) {
        return activeEmps.filter(e => e.team && e.team.toLowerCase().trim() === matchedResp.teamName.toLowerCase().trim());
      }
    }

    return activeEmps;
  }, [employees, rhParams, currentUser]);

  // Chat do Synera Mobile
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Modal de permissões e ajuda (Android / iOS)
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Helper para compartilhar fotos via Web Share API ou fallback download
  const handleSharePhoto = async (photoUrl: string, title?: string, text?: string) => {
    if (!photoUrl) {
      alert('Nenhuma foto capturada para compartilhar.');
      return;
    }
    try {
      if (navigator.share) {
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const file = new File([blob], `evidencia_obra_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: title || 'Evidência Fotográfica - Synera Mobile',
            text: text || 'Foto registrada no campo via Synera Mobile.'
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Fallback de compartilhamento de imagem:', err);
    }
    const a = document.createElement('a');
    a.href = photoUrl;
    a.download = `evidencia_obra_${Date.now()}.jpg`;
    a.click();
  };

  // Testar permissão de câmera
  const testCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCameraPermissionStatus('granted');
      alert('Acesso à Câmera PERMITIDO!');
    } catch (e) {
      setCameraPermissionStatus('denied');
      alert('Acesso à Câmera NEGADO. Por favor, libere a permissão no navegador.');
    }
  };

  // Testar permissão de GPS
  const testGpsPermission = () => {
    if (!navigator.geolocation) {
      alert('GPS não suportado neste navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsPermissionStatus('granted');
        alert(`Acesso ao GPS PERMITIDO! Lat ${pos.coords.latitude.toFixed(5)}, Lng ${pos.coords.longitude.toFixed(5)}`);
        updateNearestStation(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        setGpsPermissionStatus('denied');
        alert('Acesso ao GPS NEGADO. Por favor, ative a localização no seu smartphone.');
      },
      { enableHighAccuracy: true }
    );
  };

  // 2. RH (Gestão de RH)
  const [teamPresent, setTeamPresent] = useState<string>('');
  const [teamAbsent, setTeamAbsent] = useState<string>('0');
  const [teamOvertime, setTeamOvertime] = useState<string>('0');
  const [teamLeader, setTeamLeader] = useState<string>('');
  const [teamNotes, setTeamNotes] = useState<string>('');

  // 3. Equipamentos (Controlador)
  const [eqId, setEqId] = useState<string>('');
  const [eqStartHorometer, setEqStartHorometer] = useState<string>('');
  const [eqEndHorometer, setEqEndHorometer] = useState<string>('');
  const [eqFuel, setEqFuel] = useState<string>('');
  const [eqStatus, setEqStatus] = useState<string>('Em Operação');
  const [eqNotes, setEqNotes] = useState<string>('');
  const [eqSubTab, setEqSubTab] = useState<'novo' | 'pendentes_controlador'>('novo');

  // 4. Materiais (Almoxarife)
  const [matName, setMatName] = useState<string>('');
  const [matType, setMatType] = useState<'saida' | 'entrada' | 'requisicao'>('saida');
  const [matQty, setMatQty] = useState<string>('');
  const [matUnit, setMatUnit] = useState<string>('un');
  const [matNotes, setMatNotes] = useState<string>('');

  // 5. Administrador da Obra (Project Admin - Movimentações, Solicitações & Diário)
  const [admSubTab, setAdmSubTab] = useState<'movimentacoes' | 'solicitacoes' | 'diario'>('movimentacoes');
  
  // Movimentações do Administrador de Obras (Salvas em cache apenas do mês visualizado)
  const [viewMonth, setViewMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [monthlyMovements, setMonthlyMovements] = useState<Array<{
    id: string;
    contractId: string;
    date: string;
    description: string;
    type: 'despesa' | 'entrada' | 'insumo';
    amount: number;
    category: string;
    createdAt: string;
    createdByName: string;
  }>>(() => {
    try {
      const contractId = contracts[0]?.id || '';
      const initialMonth = new Date().toISOString().slice(0, 7);
      const saved = localStorage.getItem(`synera_mobile_movimentacoes_${contractId}_${initialMonth}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [movDesc, setMovDesc] = useState<string>('');
  const [movType, setMovType] = useState<'despesa' | 'entrada' | 'insumo'>('despesa');
  const [movAmount, setMovAmount] = useState<string>('');
  const [movCategory, setMovCategory] = useState<string>('Material');
  const [movDate, setMovDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Efeito para carregar movimentações em cache quando muda a obra ou o mês visualizado
  useEffect(() => {
    if (!selectedContractId || !viewMonth) return;
    try {
      const saved = localStorage.getItem(`synera_mobile_movimentacoes_${selectedContractId}_${viewMonth}`);
      setMonthlyMovements(saved ? JSON.parse(saved) : []);
    } catch {
      setMonthlyMovements([]);
    }
  }, [selectedContractId, viewMonth]);

  // Solicitações do Administrador de Obras
  const [admRequests, setAdmRequests] = useState<Array<{
    id: string;
    contractId: string;
    title: string;
    type: string;
    requester: string;
    amount?: number;
    justification: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
  }>>(() => {
    try {
      const contractId = contracts[0]?.id || '';
      const saved = localStorage.getItem(`synera_mobile_solicitacoes_${contractId}`);
      if (saved) return JSON.parse(saved);
      // Solicitações iniciais de exemplo
      return [
        {
          id: 'sol-001',
          contractId,
          title: 'Adiantamento de Verba para Abastecimento Emergencial',
          type: 'Verba de Campo',
          requester: 'Engenheiro de Campo',
          amount: 2500,
          justification: 'Abastecimento da retroescavadeira no posto parceiro local para não parar a obra.',
          date: new Date().toISOString().slice(0, 10),
          status: 'pending'
        },
        {
          id: 'sol-002',
          contractId,
          title: 'Requisição de Tubos de Drenagem 400mm',
          type: 'Insumo Especial',
          requester: 'Mestre de Obras',
          amount: 4800,
          justification: 'Substituição de manilhas danificadas pela chuva no trecho 3.',
          date: new Date().toISOString().slice(0, 10),
          status: 'pending'
        }
      ];
    } catch {
      return [];
    }
  });

  const [reqTitle, setReqTitle] = useState<string>('');
  const [reqType, setReqType] = useState<string>('Verba de Campo');
  const [reqAmount, setReqAmount] = useState<string>('');
  const [reqJustification, setReqJustification] = useState<string>('');

  useEffect(() => {
    if (!selectedContractId) return;
    try {
      const saved = localStorage.getItem(`synera_mobile_solicitacoes_${selectedContractId}`);
      if (saved) {
        setAdmRequests(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [selectedContractId]);

  // Diário de Obra (RDO)
  const [logWeatherMorning, setLogWeatherMorning] = useState<string>('BOM');
  const [logWeatherAfternoon, setLogWeatherAfternoon] = useState<string>('BOM');
  const [logFiscalization, setLogFiscalization] = useState<string>('');
  const [logAccidents, setLogAccidents] = useState<string>('Sem ocorrências graves no dia.');

  // Network listeners & Cache update
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      try {
        localStorage.setItem('synera_pwa_installed', 'true');
      } catch (err) {
        console.warn('Erro ao salvar estado PWA:', err);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsPwaInstalled(true);
      try {
        localStorage.setItem('synera_pwa_installed', 'true');
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Auto-solicitar permissões nativas ao entrar pela primeira vez no sistema (Android/iPhone)
  useEffect(() => {
    const hasRequested = localStorage.getItem('synera_mobile_perms_requested');
    if (!hasRequested) {
      localStorage.setItem('synera_mobile_perms_requested', 'true');
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            stream.getTracks().forEach(t => t.stop());
            setCameraPermissionStatus('granted');
          })
          .catch(() => setCameraPermissionStatus('denied'));
      }
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            setGpsPermissionStatus('granted');
            updateNearestStation(pos.coords.latitude, pos.coords.longitude);
          },
          () => setGpsPermissionStatus('denied'),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }
  }, []);

  // Sincronização automática de dados (Funcionários, Equipamentos e Traçado da Obra) ao estar online
  useEffect(() => {
    if (isOnline) {
      // Sincronizar fila pendente
      if (offlineQueue.length > 0) {
        handleProcessSync();
      }
      try {
        const cachePayload = {
          contracts: contracts.map(c => ({ id: c.id, name: c.name, code: c.code })),
          services: services.map(s => ({ id: s.id, contractId: s.contractId, name: s.name, unit: s.unit })),
          equipments: equipments.map(e => ({ id: e.id, code: e.code, name: e.name, contractId: e.contractId, status: e.status })),
          employees: (employees || []).map(emp => ({ id: emp.id, name: emp.name, role: emp.role, team: emp.team, status: emp.status })),
          projectAlignments: (projectAlignments || []).map(pa => ({ id: pa.id, name: pa.name, contractId: pa.contractId, stations: pa.stations })),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
      } catch (err) {
        console.warn('Erro ao atualizar cache de dados no Synera Mobile:', err);
      }
    }
  }, [isOnline, contracts, services, equipments, employees, projectAlignments]);

  // Persist offline queue
  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
    } catch (err) {
      console.warn('Erro ao salvar fila offline:', err);
    }
  }, [offlineQueue]);

  // Lock contract for mobile users (they cannot choose more than 1 contract)
  useEffect(() => {
    if (currentUser?.allowedContractIds && currentUser.allowedContractIds.length > 0) {
      setSelectedContractId(currentUser.allowedContractIds[0]);
    } else if (contracts.length > 0 && !selectedContractId) {
      setSelectedContractId(contracts[0].id);
    }
  }, [currentUser, contracts, selectedContractId]);

  // Derived active contract
  const activeContract = useMemo(() => {
    return contracts.find(c => c.id === selectedContractId) || contracts[0] || { id: 'geral', name: 'Obra Principal' };
  }, [contracts, selectedContractId]);

  // Filtered services for current contract - ONLY show services that have controls created in Sala Técnica / Controles
  const contractServices = useMemo(() => {
    const baseServices = services.filter(s => s.contractId === activeContract.id || !s.contractId);

    // Filter by created controls in Sala Técnica / Controles
    const controlledServiceIds = new Set(
      serviceProductions
        .filter(p => p.contractId === activeContract.id || !p.contractId)
        .map(p => p.serviceId)
    );

    if (controlledServiceIds.size > 0) {
      const filtered = baseServices.filter(s => controlledServiceIds.has(s.id));
      if (filtered.length > 0) return filtered;
    }

    return baseServices;
  }, [services, serviceProductions, activeContract.id]);

  // Filtered equipments
  const contractEquipments = useMemo(() => {
    return equipments.filter(e => e.contractId === activeContract.id || !e.contractId || e.contractId === 'all');
  }, [equipments, activeContract]);

  // Image Upload helper for mobile camera
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProdPhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Trigger PWA Install
  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsPwaInstalled(true);
        try {
          localStorage.setItem('synera_pwa_installed', 'true');
        } catch (e) {}
        setDeferredPrompt(null);
      }
    } else {
      setShowPwaGuide(true);
    }
  };

  // Config list for the 5 requested field sectors linked to ERP modules
  const ALL_SECTORS: {
    id: MobileSector;
    name: string;
    erpLink: string;
    description: string;
    icon: React.ReactNode;
    cardBg: string;
    badgeBg: string;
  }[] = [
    {
      id: 'producao',
      name: 'Produção',
      erpLink: 'Vinculado à Sala Técnica',
      description: 'Lançamento de quantidades executadas em campo, trecho da obra e avanço de serviços.',
      icon: <HardHat className="w-6 h-6 text-blue-400" />,
      cardBg: 'from-blue-900/60 to-slate-900 border-blue-500/40 hover:border-blue-400',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    },
    {
      id: 'rh',
      name: 'RH',
      erpLink: 'Vinculado ao RH',
      description: 'Registro de frequência do efetivo, lançamento de faltas, presenças e horas extras.',
      icon: <Users className="w-6 h-6 text-indigo-400" />,
      cardBg: 'from-indigo-900/60 to-slate-900 border-indigo-500/40 hover:border-indigo-400',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    },
    {
      id: 'equipamentos',
      name: 'Equipamentos',
      erpLink: 'Ligado ao Controlador',
      description: 'Aferição de horímetros, consumo de combustível, lubrificantes e paradas da frota.',
      icon: <Wrench className="w-6 h-6 text-amber-400" />,
      cardBg: 'from-amber-900/60 to-slate-900 border-amber-500/40 hover:border-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    },
    {
      id: 'materiais',
      name: 'Materiais',
      erpLink: 'Ligado ao Almoxarife',
      description: 'Recebimento de insumos, romaneios, requisições de campo e saídas para aplicação.',
      icon: <Package className="w-6 h-6 text-emerald-400" />,
      cardBg: 'from-emerald-900/60 to-slate-900 border-emerald-500/40 hover:border-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    },
    {
      id: 'project_admin',
      name: 'Administrador da Obra',
      erpLink: 'Ligado ao Administrador da Obra',
      description: 'Relatório diário de obra (RDO), controle pluviométrico, clima e ocorrências graves.',
      icon: <ShieldCheck className="w-6 h-6 text-purple-400" />,
      cardBg: 'from-purple-900/60 to-slate-900 border-purple-500/40 hover:border-purple-400',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    },
    {
      id: 'galeria',
      name: 'Galeria de Fotos',
      erpLink: 'Compartilhamento de Evidências',
      description: 'Galeria de fotos tiradas pela câmera para compartilhamento via aplicativos do dispositivo (ex: WhatsApp).',
      icon: <Eye className="w-6 h-6 text-fuchsia-400" />,
      cardBg: 'from-fuchsia-900/60 to-slate-900 border-fuchsia-500/40 hover:border-fuchsia-400',
      badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
    }
  ];

  // Filter sectors based on user permissions (if specific sectors are assigned)
  const visibleSectors = useMemo(() => {
    if (!currentUser?.mobileSectors || currentUser.mobileSectors.length === 0 || currentUser.role === 'master' || currentUser.role === 'admin') {
      return ALL_SECTORS;
    }
    return ALL_SECTORS.filter(s => currentUser.mobileSectors?.includes(s.id));
  }, [currentUser]);

  // Process sync offline queue
  const handleProcessSync = async () => {
    if (offlineQueue.length === 0) return;
    setIsSyncing(true);

    try {
      const todayStr = new Date().toISOString().slice(0, 7);

      for (const item of offlineQueue) {
        if (item.type === 'production') {
          const { serviceId, qty, trecho, notes, month } = item.data;
          
          const currentProd = serviceProductions.find(p => p.serviceId === serviceId && p.month === (month || todayStr)) || {
            id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            serviceId,
            month: month || todayStr,
            currentMonthQty: 0,
            accumulatedQty: 0,
            previousQty: 0,
            unitPrice: 0,
            dailyNotes: []
          };

          const updatedProd: ServiceProduction = {
            ...currentProd,
            currentMonthQty: (currentProd.currentMonthQty || 0) + qty,
            dailyNotes: [
              ...(currentProd.dailyNotes || []),
              {
                date: new Date().toISOString().slice(0, 10),
                qty: qty,
                note: `[SYNERA MOBILE / APONTADOR] ${trecho ? `Trecho: ${trecho}. ` : ''}${notes || ''}`,
                recordedBy: currentUser.name || 'Apontador de Campo'
              }
            ]
          };

          onUpdateServiceProduction(updatedProd);

          if (onAddWorkMovement) {
            const sName = services.find(s => s.id === serviceId)?.name || 'Serviço';
            onAddWorkMovement({
              sector: 'SALA TÉCNICA',
              action: 'APONTAMENTO DE CAMPO (PWA)',
              description: `Produção realizada no campo: ${qty} un em ${sName} (${item.contractName})`,
              referenceCode: `PWA-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                notes: `Trecho/Local: ${trecho || 'Campo'}. ${notes || ''}`,
                productionValue: qty,
              }
            });
          }
        } else if (item.type === 'equipment') {
          if (onAddWorkMovement) {
            onAddWorkMovement({
              sector: 'CONTROLADOR',
              action: 'MEDIÇÃO EQUIPAMENTO',
              description: `Aferição no equipamento ${item.data.equipmentName} (${item.data.horometer}h)`,
              referenceCode: `FROTA-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                equipmentName: item.data.equipmentName,
                hoursOrHorometer: item.data.horometer,
                notes: `Combustível: ${item.data.fuel}L. Status: ${item.data.status}. ${item.data.notes}`
              }
            });
          }
        } else if (item.type === 'headcount') {
          if (onAddWorkMovement) {
            onAddWorkMovement({
              sector: 'RH',
              action: 'APONTAMENTO DE MÃO DE OBRA',
              description: `Registro de efetivo de campo: ${item.data.present} presentes, ${item.data.absent} faltas`,
              referenceCode: `RH-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                notes: `Líder: ${item.data.leader}. Horas Extras: ${item.data.overtime}h. ${item.data.notes}`
              }
            });
          }
        } else if (item.type === 'materials') {
          if (onAddWorkMovement) {
            onAddWorkMovement({
              sector: 'ALMOXARIFE',
              action: item.data.type === 'entrada' ? 'RECEBIMENTO MATERIAL' : item.data.type === 'saida' ? 'SAÍDA PARA OBRA' : 'REQUISIÇÃO DE CAMPO',
              description: `Movimentação de material: ${item.data.qty} ${item.data.unit} de ${item.data.materialName}`,
              referenceCode: `ALMOX-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                materialName: item.data.materialName,
                quantity: item.data.qty,
                notes: item.data.notes
              }
            });
          }
        } else if (item.type === 'daily_log') {
          if (onSaveDailyReport) {
            const newReport: DailyReport = {
              id: `r-${Date.now()}`,
              contractId: item.contractId,
              date: new Date().toISOString().slice(0, 10),
              weatherMorning: item.data.weatherMorning,
              weatherAfternoon: item.data.weatherAfternoon,
              fiscalizationComments: item.data.fiscalization,
              accidents: item.data.accidents,
              manpower: [],
              equipment: [],
              activities: [],
              photos: []
            };
            onSaveDailyReport(newReport);
          }

          if (onAddWorkMovement) {
            onAddWorkMovement({
              sector: 'ADMINISTRADOR DA OBRA',
              action: 'DIÁRIO DE CAMPO',
              description: `Registro de diário de obra e ocorrências no campo`,
              referenceCode: `LOG-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                notes: `Clima: ${item.data.weatherMorning}/${item.data.weatherAfternoon}. Obs: ${item.data.fiscalization}`
              }
            });
          }
        }
      }

      setOfflineQueue([]);
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setSyncSuccessMsg('Todos os apontamentos salvos no celular foram sincronizados com o servidor!');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Erro na sincronização:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // ----------------------------------------------------
  // Form submission handlers
  // ----------------------------------------------------
  const handleSaveProduction = () => {
    if (!prodServiceId) {
      alert('Selecione o serviço para apontamento.');
      return;
    }
    const parsedQty = parseFloat(prodQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert('Informe uma quantidade válida produzida no campo.');
      return;
    }

    const serviceObj = services.find(s => s.id === prodServiceId);
    const reportDate = prodDate || new Date().toISOString().slice(0, 10);
    const isNowOnline = navigator.onLine;

    const combinedTrecho = [
      prodStartStation ? `Est. Inicial: ${prodStartStation}` : '',
      prodEndStation ? `Est. Final: ${prodEndStation}` : '',
      prodTrecho
    ].filter(Boolean).join(' | ');

    const newFieldReport: FieldProductionReport = {
      id: `f-rep-${Date.now()}`,
      contractId: activeContract.id,
      contractName: activeContract.name,
      serviceId: prodServiceId,
      serviceName: serviceObj?.name || 'Serviço',
      unit: serviceObj?.unit || 'un',
      qty: parsedQty,
      productionDate: reportDate,
      syncedAt: isNowOnline ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      startStation: prodStartStation,
      endStation: prodEndStation,
      trecho: combinedTrecho || prodTrecho,
      notes: prodNotes,
      photo: prodPhoto,
      reportedBy: currentUser.name || 'Apontador',
      reportedByEmail: currentUser.email,
      status: 'pending'
    };

    if (onSaveFieldReport) {
      onSaveFieldReport(newFieldReport);
    }

    const newQueueItem: OfflinePendingItem = {
      id: newFieldReport.id,
      type: 'production',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        serviceId: prodServiceId,
        serviceName: serviceObj?.name || 'Serviço',
        qty: parsedQty,
        unit: serviceObj?.unit || 'un',
        productionDate: reportDate,
        syncedAt: isNowOnline ? new Date().toISOString() : undefined,
        startStation: prodStartStation,
        endStation: prodEndStation,
        trecho: combinedTrecho || prodTrecho,
        notes: prodNotes,
        photo: prodPhoto
      },
      synced: isNowOnline
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setProdQty('');
    setProdStartStation('');
    setProdEndStation('');
    setProdTrecho('');
    setProdNotes('');
    setProdPhoto('');

    if (isNowOnline) {
      setSyncSuccessMsg('Apontamento de Produção salvo e enviado para a Sala Técnica!');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } else {
      alert('Apontamento de Produção salvo OFFLINE! Será enviado para a Sala Técnica assim que reconectar.');
    }
  };

  const handleSaveEquipment = () => {
    if (!eqId) {
      alert('Selecione o equipamento/veículo.');
      return;
    }
    const startHoro = parseFloat(eqStartHorometer);
    const endHoro = parseFloat(eqEndHorometer);

    if (isNaN(startHoro) || startHoro < 0) {
      alert('Informe um Horímetro Inicial válido.');
      return;
    }
    if (isNaN(endHoro) || endHoro < startHoro) {
      alert('Informe um Horímetro Final válido (maior ou igual ao Horímetro Inicial).');
      return;
    }

    const calculatedHours = parseFloat((endHoro - startHoro).toFixed(2));
    const eqObj = equipments.find(e => e.id === eqId);

    const newQueueItem: OfflinePendingItem = {
      id: `pwa-eq-${Date.now()}`,
      type: 'equipment',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        equipmentId: eqId,
        equipmentName: `${eqObj?.code ? `[${eqObj.code}] ` : ''}${eqObj?.name || 'Equipamento'}`.trim(),
        equipmentType: eqObj?.type || eqObj?.category || 'Equipamento',
        startHorometer: startHoro,
        endHorometer: endHoro,
        horometer: endHoro,
        calculatedHours,
        fuel: parseFloat(eqFuel) || 0,
        status: eqStatus,
        notes: eqNotes,
        approvalStatus: 'pending_controlador',
        requestedBy: currentUser.name || 'Apontador de Campo'
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setEqStartHorometer('');
    setEqEndHorometer('');
    setEqFuel('');
    setEqNotes('');

    alert(`✅ Medição de Equipamento gravada na fila!\n\n• Horímetro Inicial: ${startHoro}h\n• Horímetro Final: ${endHoro}h\n• Total Trabalhado: ${calculatedHours}h\n\n⚠️ Os dados foram registrados e só serão inseridos definitivamente no Supabase após aprovação de um usuário do Setor Controlador.`);
  };

  // Handlers do Administrador de Obras (Movimentações e Solicitações)
  const handleSaveMovimentacao = () => {
    if (!movDesc.trim()) {
      alert('Informe a descrição da movimentação.');
      return;
    }
    const parsedAmount = parseFloat(movAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Informe um valor numérico válido maior que zero.');
      return;
    }

    const newMov = {
      id: `mov-${Date.now()}`,
      contractId: activeContract.id,
      date: movDate || new Date().toISOString().slice(0, 10),
      description: movDesc.trim(),
      type: movType,
      amount: parsedAmount,
      category: movCategory,
      createdAt: new Date().toISOString(),
      createdByName: currentUser.name || 'Admin de Obra'
    };

    const updated = [newMov, ...monthlyMovements];
    setMonthlyMovements(updated);

    try {
      localStorage.setItem(`synera_mobile_movimentacoes_${activeContract.id}_${viewMonth}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar movimentação no cache local:', e);
    }

    if (onAddWorkMovement) {
      onAddWorkMovement({
        sector: 'ADMINISTRADOR DA OBRA',
        action: `MOVIMENTAÇÃO DE CAMPO (${movType.toUpperCase()})`,
        description: `${movDesc} (R$ ${parsedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
        referenceCode: `MOV-${newMov.id.slice(-4)}`,
        contractName: activeContract.name,
        responsibleUser: currentUser.name || 'Admin de Obra',
        details: {
          category: movCategory,
          amount: parsedAmount,
          month: viewMonth
        }
      });
    }

    setMovDesc('');
    setMovAmount('');
    alert(`✅ Movimentação salva com sucesso no cache do mês ${viewMonth}!`);
  };

  const handleSaveSolicitacao = () => {
    if (!reqTitle.trim()) {
      alert('Informe o título / assunto da solicitação.');
      return;
    }
    if (!reqJustification.trim()) {
      alert('Informe a justificativa da solicitação.');
      return;
    }

    const newReq = {
      id: `sol-${Date.now()}`,
      contractId: activeContract.id,
      title: reqTitle.trim(),
      type: reqType,
      requester: currentUser.name || 'Admin de Obra',
      amount: parseFloat(reqAmount) || undefined,
      justification: reqJustification.trim(),
      date: new Date().toISOString().slice(0, 10),
      status: 'pending' as const
    };

    const updated = [newReq, ...admRequests];
    setAdmRequests(updated);

    try {
      localStorage.setItem(`synera_mobile_solicitacoes_${activeContract.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar solicitação no cache local:', e);
    }

    setReqTitle('');
    setReqAmount('');
    setReqJustification('');
    alert('✅ Solicitação cadastrada com sucesso! Aguardando aprovação/recusa do Administrador de Obras.');
  };

  const handleApproveRequest = (reqId: string, action: 'approved' | 'rejected') => {
    // REQUISITO CRÍTICO: Solicitações só podem ser aprovadas ou recusadas quando o Synera Mobile estiver ONLINE!
    if (!isOnline) {
      alert('❌ OPERAÇÃO NÃO PERMITIDA OFFLINE!\n\nAs solicitações do Administrador de Obras só podem ser aprovadas ou recusadas quando o Synera Mobile estiver ONLINE.');
      return;
    }

    const updated = admRequests.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: action,
          approvedBy: currentUser.name || 'Administrador da Obra',
          approvedAt: new Date().toISOString()
        };
      }
      return r;
    });

    setAdmRequests(updated);

    try {
      localStorage.setItem(`synera_mobile_solicitacoes_${activeContract.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao atualizar solicitação:', e);
    }

    if (action === 'approved') {
      alert('✅ Solicitação APROVADA com sucesso no servidor!');
    } else {
      alert('🔴 Solicitação RECUSADA no servidor!');
    }
  };

  const handleSaveHeadcount = () => {
    const parsedPres = parseInt(teamPresent, 10);
    if (isNaN(parsedPres) || parsedPres < 0) {
      alert('Informe o número de pessoas presentes no efetivo.');
      return;
    }

    const newQueueItem: OfflinePendingItem = {
      id: `pwa-team-${Date.now()}`,
      type: 'headcount',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        present: parsedPres,
        absent: parseInt(teamAbsent, 10) || 0,
        overtime: parseFloat(teamOvertime) || 0,
        leader: teamLeader || currentUser.name || 'Apontador',
        notes: teamNotes
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setTeamPresent('');
    setTeamAbsent('0');
    setTeamOvertime('0');
    setTeamNotes('');

    if (navigator.onLine) {
      setTimeout(() => handleProcessSync(), 300);
    } else {
      alert('Registro de Efetivo salvo OFFLINE com sucesso!');
    }
  };

  const handleSaveMaterials = () => {
    if (!matName) {
      alert('Informe a descrição ou nome do material/insumo.');
      return;
    }
    const parsedQty = parseFloat(matQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert('Informe uma quantidade válida para movimentação.');
      return;
    }

    const newQueueItem: OfflinePendingItem = {
      id: `pwa-mat-${Date.now()}`,
      type: 'materials',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        materialName: matName,
        type: matType,
        qty: parsedQty,
        unit: matUnit,
        notes: matNotes
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setMatName('');
    setMatQty('');
    setMatNotes('');

    if (navigator.onLine) {
      setTimeout(() => handleProcessSync(), 300);
    } else {
      alert('Movimentação de Material salva OFFLINE com sucesso!');
    }
  };

  const handleSaveDailyLog = () => {
    const newQueueItem: OfflinePendingItem = {
      id: `pwa-log-${Date.now()}`,
      type: 'daily_log',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        weatherMorning: logWeatherMorning,
        weatherAfternoon: logWeatherAfternoon,
        fiscalization: logFiscalization,
        accidents: logAccidents
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setLogFiscalization('');

    if (navigator.onLine) {
      setTimeout(() => handleProcessSync(), 300);
    } else {
      alert('Diário de Ocorrências salvo OFFLINE com sucesso!');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 bg-slate-900 text-slate-100 font-sans shadow-2xl overflow-hidden relative border-x border-slate-800">
      
      {/* ---------------------------------------------------- */}
      {/* HEADER PRINCIPAL FIXO SYNERA MOBILE */}
      {/* ---------------------------------------------------- */}
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 p-4 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          
          {/* Official System Logo Emblem */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-white">SYNERA</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 uppercase tracking-widest shadow-sm">
                  MOBILE
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400">Apontador de Campo PWA</p>
            </div>
          </div>

          {/* Connection Status Badge & Obra Vinculada */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="px-2.5 py-1 rounded-full border border-indigo-500/40 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[10px] font-black flex items-center gap-1 transition-colors shadow-sm"
                title="Abrir Chat de Comunicação Synera Mobile"
              >
                <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Chat</span>
              </button>

              <div className={`px-2.5 py-1 rounded-full border text-[10px] font-black flex items-center gap-1.5 shadow-sm ${
                isOnline 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' 
                  : 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ONLINE</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-red-400" />
                    <span>OFFLINE</span>
                  </>
                )}
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 transition-colors"
                  title="Sair do aplicativo"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 mt-1 text-right">
              <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-black text-slate-200 truncate max-w-[150px]">
                {activeContract.name || activeContract.workName || activeContract.client || 'Obra Principal'}
              </span>
            </div>

            {offlineQueue.length > 0 && (
              <span className="text-[9px] text-amber-400 font-bold mt-0.5">
                {offlineQueue.length} pendentes
              </span>
            )}
          </div>
        </div>

        {/* Global Sync Notification Success */}
        {syncSuccessMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </motion.div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* CONTEÚDO DA PÁGINA: HOME OU SETOR SELECIONADO */}
      {/* ---------------------------------------------------- */}
      <div className="p-4 space-y-4">

        {/* ==================================================== */}
        {/* VISTA 1: PÁGINA INICIAL / LANDING PWA SYNERA MOBILE */}
        {/* ==================================================== */}
        {activeSector === null && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">

            {/* HERO CARD DE INSTALAÇÃO DO PWA COM ÍCONE DO SISTEMA */}
            {!isPwaInstalled && (
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/90 via-slate-900 to-indigo-950 border border-blue-500/40 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
                    <LayoutDashboard className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-black text-sm text-white tracking-tight">Aplicativo Synera Mobile</h2>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase">
                        PWA
                      </span>
                    </div>
                    <p className="text-xs text-blue-200/90 leading-relaxed font-medium">
                      Instale o app direto no celular para trabalhar sem internet em locais isolados da obra.
                    </p>
                  </div>
                </div>

                {/* BOTÃO PRINCIPAL DE INSTALAÇÃO DO PWA */}
                <Button
                  onClick={handleInstallPwa}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-500/25 mt-1"
                >
                  <Download className="w-4 h-4 text-slate-950 stroke-[3]" />
                  Instalar PWA SYNERA MOBILE
                </Button>
              </div>
            )}

            {/* SEÇÃO DOS 5 SETORES DE CAMPO E SEUS VÍNCULOS COM O ERP */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Setores de Atuação no Campo
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">{visibleSectors.length} Setores</span>
              </div>

              {/* GRID DOS 5 SETORES DE CAMPO */}
              <div className="grid grid-cols-1 gap-3">
                {visibleSectors.map(sector => (
                  <button
                    key={sector.id}
                    onClick={() => setActiveSector(sector.id)}
                    className={`w-full text-left p-4 rounded-3xl bg-gradient-to-r ${sector.cardBg} border transition-all duration-200 active:scale-[0.98] flex items-center justify-between shadow-xl group`}
                  >
                    <div className="flex items-start gap-3.5 pr-2">
                      <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-inner group-hover:scale-105 transition-transform">
                        {sector.icon}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white group-hover:text-emerald-300 transition-colors">
                            {sector.name}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${sector.badgeBg}`}>
                            {sector.erpLink}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                          {sector.description}
                        </p>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CARD QUICK ACCESS DA FILA DE SINCRONIZAÇÃO */}
            <div 
              onClick={() => setActiveSector('sincronizacao')}
              className="p-4 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 cursor-pointer flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Fila de Sincronização Offline</h4>
                  <p className="text-[11px] text-slate-400">
                    {offlineQueue.length === 0 ? 'Nenhum item pendente de envio' : `${offlineQueue.length} apontamento(s) armazenado(s) localmente`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                Ver Fila <ChevronRight className="w-4 h-4" />
              </span>
            </div>

          </motion.div>
        )}

        {/* ==================================================== */}
        {/* BARRA SUPERIOR DE NAVEGAÇÃO INTERNA DO SETOR */}
        {/* ==================================================== */}
        {activeSector !== null && (
          <div className="space-y-4">
            {/* Top Bar para Voltar à Home do PWA */}
            <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-2xl shadow-md">
              <Button
                onClick={() => setActiveSector(null)}
                variant="ghost"
                className="h-9 px-3 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-xl gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar aos Setores
              </Button>

              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Setor de Atuação</span>
                <span className="text-xs font-black text-emerald-400">
                  {activeSector === 'producao' && 'Produção • Sala Técnica'}
                  {activeSector === 'rh' && 'RH • Gestão de Pessoal'}
                  {activeSector === 'equipamentos' && 'Equipamentos • Controlador'}
                  {activeSector === 'materiais' && 'Materiais • Almoxarife'}
                  {activeSector === 'project_admin' && 'Administrador da Obra'}
                  {activeSector === 'sincronizacao' && 'Fila de Sincronização'}
                </span>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* SETOR 1: PRODUÇÃO (VINCULADO À SALA TÉCNICA) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'producao' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <HardHat className="w-5 h-5 text-blue-400" />
                      <div>
                        <h3 className="font-black text-sm text-white">Apontamento de Produção</h3>
                        <p className="text-[10px] text-blue-300">Vinculado à Sala Técnica (Controles)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      Sala Técnica
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300 mb-1 block">Serviço da Obra * (Controles)</Label>
                    <ServiceAutoComplete 
                      services={contractServices} 
                      selectedServiceId={prodServiceId} 
                      onSelectService={s => setProdServiceId(s.id)} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Quantidade Realizada *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 50.5"
                        value={prodQty}
                        onChange={e => setProdQty(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Data da Produção *</Label>
                      <Input
                        type="date"
                        value={prodDate}
                        onChange={e => setProdDate(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-xs mt-1"
                      />
                    </div>
                  </div>

                  {/* Estaca Inicial e Estaca Final */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Estaca Inicial *</Label>
                      <Input
                        placeholder="Ex: 120+00,00"
                        value={prodStartStation}
                        onChange={e => setProdStartStation(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-xs mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Estaca Final *</Label>
                      <Input
                        placeholder="Ex: 145+10,50"
                        value={prodEndStation}
                        onChange={e => setProdEndStation(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Trecho / Local Complementar</Label>
                    <Input
                      placeholder="Ex: Pista Esquerda / Faixa 1"
                      value={prodTrecho}
                      onChange={e => setProdTrecho(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300 block mb-1">Observações de Campo</Label>
                    <textarea
                      rows={3}
                      placeholder="Descreva detalhes do serviço executado em campo, equipe utilizada, etc..."
                      value={prodNotes}
                      onChange={e => setProdNotes(e.target.value)}
                      className="w-full rounded-2xl bg-slate-900 border border-slate-700 text-white p-3 text-xs focus:outline-none focus:border-blue-500 font-medium placeholder:text-slate-500"
                    />
                  </div>

                  {/* Photo attachment & Sharing */}
                  <div className="pt-1 space-y-2">
                    <Label className="text-xs font-bold text-slate-300 block mb-1">Foto da Evidência em Campo</Label>
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-900 border border-dashed border-slate-700 cursor-pointer hover:border-blue-500 text-xs font-semibold text-slate-300">
                        <Camera className="w-4 h-4 text-blue-400" />
                        <span>{prodPhoto ? '📷 Foto Capturada (Alterar)' : 'Tirar Foto com a Câmera'}</span>
                        <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                      </label>

                      {prodPhoto && (
                        <button
                          type="button"
                          onClick={() => handleSharePhoto(prodPhoto, 'Evidência da Produção', `Serviço: ${services.find(s=>s.id===prodServiceId)?.name || 'Serviço'} - Estaca: ${prodStartStation} até ${prodEndStation}`)}
                          className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 shrink-0"
                          title="Compartilhar foto via WhatsApp / App"
                        >
                          <Share2 className="w-4 h-4 stroke-[2.5]" />
                          Compartilhar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={handleSaveProduction}
                      className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm gap-2 shadow-lg shadow-blue-600/30"
                    >
                      <Send className="w-4 h-4" />
                      Registrar Produção no Celular
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsMyRecordsOpen(true)}
                      className="w-full h-10 rounded-2xl bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 font-bold text-xs gap-2"
                    >
                      <FileText className="w-4 h-4 text-emerald-400" />
                      Ver Meus Registros ({fieldReports.length})
                    </Button>
                  </div>
                </div>

                {/* MODAL MEUS REGISTROS / HISTÓRICO E EDIÇÃO */}
                <AnimatePresence>
                  {isMyRecordsOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl space-y-4"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-400" />
                            <h3 className="font-extrabold text-sm text-white">Meus Registros de Produção</h3>
                          </div>
                          <button onClick={() => setIsMyRecordsOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-3 pr-1 custom-scrollbar">
                          {fieldReports.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-8">Nenhum registro de campo efetuado ainda.</p>
                          ) : (
                            fieldReports.map(rep => (
                              <div key={rep.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-white truncate max-w-[200px]">{rep.serviceName}</span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                    rep.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                    rep.status === 'rejected' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                                    'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  }`}>
                                    {rep.status === 'approved' ? 'Aprovado' : rep.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                  <span>Qtd: <strong className="text-emerald-400 font-bold">{rep.qty} {rep.unit}</strong></span>
                                  <span>Data Prod: {new Date(rep.productionDate).toLocaleDateString('pt-BR')}</span>
                                </div>

                                {rep.trecho && <p className="text-[10px] text-slate-400">Trecho: {rep.trecho}</p>}
                                {rep.notes && <p className="text-[10px] text-slate-300 italic">"{rep.notes}"</p>}

                                <div className="text-[9px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                                  <span>Sincronizado: {rep.syncedAt ? new Date(rep.syncedAt).toLocaleTimeString('pt-BR') : 'Aguardando Sincronização'}</span>
                                  {rep.status === 'pending' && onUpdateFieldReport && (
                                    <button
                                      onClick={() => setEditingMyRecord(rep)}
                                      className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 text-[10px]"
                                    >
                                      <Edit3 className="w-3 h-3" /> Editar
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <Button onClick={() => setIsMyRecordsOpen(false)} className="w-full bg-slate-800 text-white rounded-2xl h-10 font-bold text-xs">
                          Fechar
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* MODAL DE EDIÇÃO RÁPIDA DE REGISTRO PENDENTE */}
                <AnimatePresence>
                  {editingMyRecord && (
                    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <h3 className="font-black text-sm text-white">Editar Apontamento de Produção</h3>
                          <button onClick={() => setEditingMyRecord(null)} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-slate-300 font-bold">Quantidade Realizada</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingMyRecord.qty}
                              onChange={e => setEditingMyRecord({ ...editingMyRecord, qty: parseFloat(e.target.value) || 0 })}
                              className="h-10 bg-slate-950 border-slate-800 text-white font-bold text-xs mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-slate-300 font-bold">Data da Produção</Label>
                            <Input
                              type="date"
                              value={editingMyRecord.productionDate}
                              onChange={e => setEditingMyRecord({ ...editingMyRecord, productionDate: e.target.value })}
                              className="h-10 bg-slate-950 border-slate-800 text-white text-xs mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-slate-300 font-bold">Estaca / Trecho</Label>
                            <Input
                              value={editingMyRecord.trecho || ''}
                              onChange={e => setEditingMyRecord({ ...editingMyRecord, trecho: e.target.value })}
                              className="h-10 bg-slate-950 border-slate-800 text-white text-xs mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-slate-300 font-bold">Observações de Campo</Label>
                            <textarea
                              rows={3}
                              value={editingMyRecord.notes || ''}
                              onChange={e => setEditingMyRecord({ ...editingMyRecord, notes: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs mt-1"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" onClick={() => setEditingMyRecord(null)} className="flex-1 bg-slate-800 text-slate-300 border-none rounded-xl text-xs font-bold">
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => {
                              if (onUpdateFieldReport) {
                                onUpdateFieldReport(editingMyRecord);
                              }
                              setEditingMyRecord(null);
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black"
                          >
                            Salvar Alterações
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SETOR 2: RH (VINCULADO AO RH) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'rh' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Sub-Navegação RH Mobile */}
                <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-700/80 gap-1">
                  <button
                    type="button"
                    onClick={() => setMobileRhSubView('resumo')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      mobileRhSubView === 'resumo' 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <BarChart2 className="w-4 h-4" />
                    Resumo RH
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileRhSubView('colaboradores')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      mobileRhSubView === 'colaboradores' 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Lista de Colaboradores ({allowedRhEmployees.length})
                  </button>
                </div>

                {/* SUB-VIEW 1: TELA INICIAL RH (RESUMO DE PRESENÇA) */}
                {mobileRhSubView === 'resumo' && (
                  <div className="space-y-4">
                    {/* Header de Responsável Configurado pelo RH */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-black text-sm text-white">Resumo do Efetivo de RH</h3>
                            <p className="text-[10px] text-indigo-300 font-medium">Gestão de Presença & Ponto Mobile</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          {rhParams.mobileResponsibles?.length > 0 ? 'Acesso Atribuído' : 'Acesso Geral'}
                        </span>
                      </div>

                      {/* Cards de Indicadores do Dia */}
                      {(() => {
                        const totalEmps = allowedRhEmployees.length;
                        const presentCount = allowedRhEmployees.filter(e => (rhEmployeeRecords[e.id]?.status || 'presente') === 'presente').length;
                        const absentCount = allowedRhEmployees.filter(e => rhEmployeeRecords[e.id]?.status === 'falta').length;
                        const leaveCount = allowedRhEmployees.filter(e => rhEmployeeRecords[e.id]?.status === 'folga').length;
                        const transferCount = allowedRhEmployees.filter(e => Boolean(rhEmployeeRecords[e.id]?.transferredToTeam)).length;

                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Presentes</span>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-2xl font-black text-white">{presentCount}</span>
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                    {totalEmps > 0 ? Math.round((presentCount / totalEmps) * 100) : 0}%
                                  </span>
                                </div>
                              </div>

                              <div className="bg-slate-900/90 border border-red-500/30 rounded-2xl p-3.5 space-y-1">
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Faltas / Ausentes</span>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-2xl font-black text-white">{absentCount}</span>
                                  <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                                    {totalEmps > 0 ? Math.round((absentCount / totalEmps) * 100) : 0}%
                                  </span>
                                </div>
                              </div>

                              <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 space-y-1">
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Folgas</span>
                                <span className="text-2xl font-black text-white block">{leaveCount}</span>
                              </div>

                              <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-3.5 space-y-1">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Transferências</span>
                                <span className="text-2xl font-black text-white block">{transferCount}</span>
                              </div>
                            </div>

                            {/* Botão de Atalho para Apontamento de Ponto */}
                            <Button
                              onClick={() => setMobileRhSubView('colaboradores')}
                              className="w-full h-13 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs gap-2.5 shadow-xl shadow-indigo-600/30"
                            >
                              <Users className="w-5 h-5" />
                              Abrir Lista de Colaboradores ({allowedRhEmployees.length})
                            </Button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Resumo Rápido de Headcount por Equipe */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        Registro Consolidado de Headcount
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold text-slate-300">Presentes na Obra *</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 18"
                            value={teamPresent}
                            onChange={e => setTeamPresent(e.target.value)}
                            className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-300">Faltas / Ausências</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 2"
                            value={teamAbsent}
                            onChange={e => setTeamAbsent(e.target.value)}
                            className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold text-slate-300">Horas Extras Totais</Label>
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="Ex: 4.5"
                            value={teamOvertime}
                            onChange={e => setTeamOvertime(e.target.value)}
                            className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-300">Encarregado Responsável</Label>
                          <Input
                            placeholder="Ex: Carlos M. Santos"
                            value={teamLeader}
                            onChange={e => setTeamLeader(e.target.value)}
                            className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleSaveHeadcount}
                        className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs gap-2 shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                        Registrar Resumo no Celular
                      </Button>
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 2: NOVA PÁGINA COM LISTA DE COLABORADORES */}
                {mobileRhSubView === 'colaboradores' && (
                  <div className="space-y-4">
                    {/* Barra de Busca e Filtros */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-4 space-y-3 shadow-xl">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Buscar por nome, cargo ou CPF..."
                            value={rhSearchTerm}
                            onChange={e => setRhSearchTerm(e.target.value)}
                            className="w-full h-10 pl-9 pr-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <select
                          value={rhTeamFilter}
                          onChange={e => setRhTeamFilter(e.target.value)}
                          className="h-10 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-bold text-indigo-300 px-3 focus:outline-none"
                        >
                          <option value="ALL">Todas as Equipes</option>
                          {Array.from(new Set(allowedRhEmployees.map(e => e.team).filter(Boolean))).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Ações em Lote */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-bold text-slate-400">
                          Exibindo {allowedRhEmployees.filter(e => {
                            const matchSearch = !rhSearchTerm.trim() || e.name.toLowerCase().includes(rhSearchTerm.toLowerCase()) || (e.role && e.role.toLowerCase().includes(rhSearchTerm.toLowerCase()));
                            const matchTeam = rhTeamFilter === 'ALL' || e.team === rhTeamFilter;
                            return matchSearch && matchTeam;
                          }).length} colaboradores
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...rhEmployeeRecords };
                            allowedRhEmployees.forEach(emp => {
                              updated[emp.id] = {
                                status: 'presente',
                                entryTime: updated[emp.id]?.entryTime || '07:00',
                                exitTime: updated[emp.id]?.exitTime || '17:00',
                                transferredToTeam: updated[emp.id]?.transferredToTeam,
                                notes: updated[emp.id]?.notes
                              };
                            });
                            setRhEmployeeRecords(updated);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-emerald-500/30 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Marcar Todos Presentes
                        </button>
                      </div>
                    </div>

                    {/* Lista de Cards de Colaboradores */}
                    <div className="space-y-3">
                      {allowedRhEmployees
                        .filter(emp => {
                          const matchSearch = !rhSearchTerm.trim() || emp.name.toLowerCase().includes(rhSearchTerm.toLowerCase()) || (emp.role && emp.role.toLowerCase().includes(rhSearchTerm.toLowerCase()));
                          const matchTeam = rhTeamFilter === 'ALL' || emp.team === rhTeamFilter;
                          return matchSearch && matchTeam;
                        })
                        .map((emp, idx) => {
                          const record = rhEmployeeRecords[emp.id] || {
                            status: 'presente',
                            entryTime: '07:00',
                            exitTime: '17:00'
                          };

                          const updateEmpRecord = (fields: Partial<typeof record>) => {
                            setRhEmployeeRecords(prev => ({
                              ...prev,
                              [emp.id]: {
                                ...record,
                                ...fields
                              }
                            }));
                          };

                          return (
                            <div 
                              key={`${emp.id}-${idx}`} 
                              className={`bg-slate-800/90 border rounded-3xl p-4 space-y-3 shadow-lg transition-all ${
                                record.status === 'presente' ? 'border-slate-700/80' :
                                record.status === 'falta' ? 'border-red-500/50 bg-red-950/20' : 'border-amber-500/50 bg-amber-950/20'
                              }`}
                            >
                              {/* Header do Colaborador */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                                    {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                  </div>
                                  <div>
                                    <h4 className="font-black text-sm text-white leading-tight">{emp.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] font-bold text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded-full">
                                        {emp.role || 'Colaborador'}
                                      </span>
                                      {emp.team && (
                                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                                          {emp.team}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                  record.status === 'presente' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                  record.status === 'falta' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                                  'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}>
                                  {record.status === 'presente' ? 'Presente' : record.status === 'falta' ? 'Falta' : 'Folga'}
                                </span>
                              </div>

                              {/* Botoes de Status de Presença */}
                              <div className="grid grid-cols-3 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => updateEmpRecord({ status: 'presente' })}
                                  className={`py-2 px-2 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    record.status === 'presente' 
                                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Presente
                                </button>

                                <button
                                  type="button"
                                  onClick={() => updateEmpRecord({ status: 'falta' })}
                                  className={`py-2 px-2 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    record.status === 'falta' 
                                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700'
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Falta
                                </button>

                                <button
                                  type="button"
                                  onClick={() => updateEmpRecord({ status: 'folga' })}
                                  className={`py-2 px-2 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    record.status === 'folga' 
                                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  Folga
                                </button>
                              </div>

                              {/* Horários de Entrada e Saída (se presente) */}
                              {record.status === 'presente' && (
                                <div className="space-y-3 pt-2 border-t border-slate-700/60">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Horário Entrada</label>
                                      <input
                                        type="time"
                                        value={record.entryTime || '07:00'}
                                        onChange={e => updateEmpRecord({ entryTime: e.target.value })}
                                        className="w-full h-9 px-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Horário Saída</label>
                                      <input
                                        type="time"
                                        value={record.exitTime || '17:00'}
                                        onChange={e => updateEmpRecord({ exitTime: e.target.value })}
                                        className="w-full h-9 px-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Transferência para Outra Equipe */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                                        <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
                                        Transferência de Equipe
                                      </label>
                                      {record.transferredToTeam && (
                                        <button
                                          type="button"
                                          onClick={() => updateEmpRecord({ transferredToTeam: undefined })}
                                          className="text-[10px] font-bold text-red-400 hover:underline"
                                        >
                                          Cancelar Transferência
                                        </button>
                                      )}
                                    </div>

                                    <select
                                      value={record.transferredToTeam || ''}
                                      onChange={e => updateEmpRecord({ transferredToTeam: e.target.value || undefined })}
                                      className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs font-semibold text-white focus:outline-none"
                                    >
                                      <option value="">-- Não Transferir (Permanecer na Equipe Atual) --</option>
                                      <option value="Equipe Terraplenagem">Equipe Terraplenagem</option>
                                      <option value="Equipe Pavimentação">Equipe Pavimentação</option>
                                      <option value="Equipe Drenagem">Equipe Drenagem</option>
                                      <option value="Equipe Obras de Arte">Equipe Obras de Arte Especial</option>
                                      <option value="Equipe Sinalização">Equipe Sinalização e Acessórios</option>
                                    </select>

                                    {record.transferredToTeam && (
                                      <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-[11px] text-indigo-200 font-bold flex items-center gap-1.5">
                                        <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                        Transferido para: {record.transferredToTeam}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Botão Flutuante de Salvamento Geral */}
                    <div className="sticky bottom-4 z-20 pt-2">
                      <Button
                        onClick={() => {
                          const todayStr = new Date().toISOString().slice(0, 10);
                          localStorage.setItem(`synera_mobile_rh_records_${todayStr}`, JSON.stringify(rhEmployeeRecords));

                          const activeContractObj = contracts.find(c => c.id === selectedContractId) || contracts[0] || { id: 'c1', name: 'Obra Principal' };

                          const queueItem: OfflinePendingItem = {
                            id: `rh-attendance-${Date.now()}`,
                            type: 'headcount',
                            timestamp: new Date().toISOString(),
                            contractId: activeContractObj.id,
                            contractName: activeContractObj.name || 'Obra Principal',
                            data: {
                              date: todayStr,
                              records: rhEmployeeRecords,
                              totalCount: allowedRhEmployees.length
                            },
                            synced: false
                          };

                          setOfflineQueue(prev => [queueItem, ...prev]);
                          alert("✅ SUCESSO! Apontamento de Ponto, Presença e Transferências do RH salvo com sucesso no celular!");
                        }}
                        className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm gap-2.5 shadow-2xl shadow-emerald-500/30"
                      >
                        <Save className="w-5 h-5 stroke-[2.5]" />
                        Salvar Apontamentos do RH no Celular
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SETOR 3: EQUIPAMENTOS (LIGADO AO CONTROLADOR) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'equipamentos' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-amber-400" />
                      <div>
                        <h3 className="font-black text-sm text-white">Medição de Equipamento & Frota</h3>
                        <p className="text-[10px] text-amber-300">Ligado ao Controlador</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Controlador
                    </span>
                  </div>

                  {/* Informação do Fluxo de Aprovação pelo Setor Controlador */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-amber-400">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Aprovação do Setor Controlador Requerida</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Os dados de horímetro e frotas inseridos pelo Synera Mobile entram na fila e só são gravados definitivamente no Supabase após aprovação de um usuário com acesso ao setor <strong>Controlador</strong>.
                    </p>
                  </div>

                  {/* Controle Autocomplete para Equipamentos (Busca por Nome ou Tipo) */}
                  <div>
                    <Label className="text-xs font-bold text-slate-300 block mb-1">
                      Pesquisar Equipamento / Máquina *
                    </Label>
                    <EquipmentAutoComplete
                      equipments={contractEquipments}
                      selectedEqId={eqId}
                      onSelectEquipment={eq => setEqId(eq.id)}
                    />
                  </div>

                  {/* Horímetro Inicial e Horímetro Final */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Horímetro Inicial *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 4520.0"
                        value={eqStartHorometer}
                        onChange={e => setEqStartHorometer(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Horímetro Final *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 4528.5"
                        value={eqEndHorometer}
                        onChange={e => setEqEndHorometer(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                      />
                    </div>
                  </div>

                  {/* Cálculo Automático de Horas Trabalhadas */}
                  {Boolean(eqStartHorometer && eqEndHorometer && !isNaN(parseFloat(eqEndHorometer)) && !isNaN(parseFloat(eqStartHorometer))) && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center justify-between">
                      <span>Total de Horas Trabalhadas Aferidas:</span>
                      <span className="text-sm text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-500/40">
                        {(parseFloat(eqEndHorometer) - parseFloat(eqStartHorometer)).toFixed(1)} hrs
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Abastecimento (Litros)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 120"
                        value={eqFuel}
                        onChange={e => setEqFuel(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Status Operacional</Label>
                      <Select value={eqStatus} onValueChange={setEqStatus}>
                        <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-semibold text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-2xl">
                          <SelectItem value="Em Operação">🟢 Em Operação Normal</SelectItem>
                          <SelectItem value="Parado Manutenção">🔴 Parado para Manutenção</SelectItem>
                          <SelectItem value="Stand-by / Reserva">🟡 Stand-by / Reserva</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Observações de Manutenção / Operação</Label>
                    <Input
                      placeholder="Ex: Troca de filtro de óleo prevista para amanhã."
                      value={eqNotes}
                      onChange={e => setEqNotes(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleSaveEquipment}
                    className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm gap-2 shadow-lg shadow-amber-500/30"
                  >
                    <Send className="w-4 h-4" />
                    Enviar Medição para Aprovação do Controlador
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SETOR 4: MATERIAIS (LIGADO AO ALMOXARIFE) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'materiais' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h3 className="font-black text-sm text-white">Movimentação de Materiais</h3>
                        <p className="text-[10px] text-emerald-300">Ligado ao Almoxarife</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Almoxarife
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Tipo de Movimento *</Label>
                    <Select value={matType} onValueChange={(v: any) => setMatType(v)}>
                      <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-2xl">
                        <SelectItem value="saida">📤 Saída para Obra / Aplicação</SelectItem>
                        <SelectItem value="entrada">📥 Entrada / Recebimento de Insumo</SelectItem>
                        <SelectItem value="requisicao">📋 Requisição de Campo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Descrição ou Código do Material *</Label>
                    <Input
                      placeholder="Ex: Cimento CP-II (Saco 50kg) ou Tubo PVC 100mm"
                      value={matName}
                      onChange={e => setMatName(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-xs mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Quantidade *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 50"
                        value={matQty}
                        onChange={e => setMatQty(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Unidade de Medida</Label>
                      <Input
                        placeholder="Ex: sc, m, m³, un, kg"
                        value={matUnit}
                        onChange={e => setMatUnit(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Observações / Fornecedor / Destino</Label>
                    <Input
                      placeholder="Ex: Entregue à equipe de concreto do trecho 2."
                      value={matNotes}
                      onChange={e => setMatNotes(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleSaveMaterials}
                    className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <Send className="w-4 h-4" />
                    Registrar Material no Celular
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SETOR 5: ADMINISTRADOR DA OBRA (PROJECT ADMIN) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'project_admin' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  {/* Header do Administrador de Obras */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-purple-400" />
                      <div>
                        <h3 className="font-black text-sm text-white">Administrador da Obra</h3>
                        <p className="text-[10px] text-purple-300">Movimentações, Solicitações & Diário</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Admin da Obra
                    </span>
                  </div>

                  {/* Seletor de Sub-abas do Administrador da Obra */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setAdmSubTab('movimentacoes')}
                      className={`py-2 text-[11px] font-black rounded-xl transition-colors ${
                        admSubTab === 'movimentacoes'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💸 Movimentações
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdmSubTab('solicitacoes')}
                      className={`py-2 text-[11px] font-black rounded-xl transition-colors ${
                        admSubTab === 'solicitacoes'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📋 Solicitações
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdmSubTab('diario')}
                      className={`py-2 text-[11px] font-black rounded-xl transition-colors ${
                        admSubTab === 'diario'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ☀️ Diário (RDO)
                    </button>
                  </div>

                  {/* SUB-ABA 1: MOVIMENTAÇÕES (SALVAS EM CACHE APENAS DO MÊS VISUALIZADO) */}
                  {admSubTab === 'movimentacoes' && (
                    <div className="space-y-4 pt-1">
                      {/* Seletor do Mês Visualizado (Filtro do Cache) */}
                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            Mês Visualizado (Cache Local):
                          </label>
                          <input
                            type="month"
                            value={viewMonth}
                            onChange={e => setViewMonth(e.target.value)}
                            className="h-8 px-2 rounded-xl bg-slate-800 border border-slate-600 text-xs font-extrabold text-purple-300 focus:outline-none"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          💾 As movimentações do Administrador da Obra são armazenadas em cache no celular <strong>apenas do mês visualizado ({viewMonth})</strong>.
                        </p>
                      </div>

                      {/* Formulário de Nova Movimentação */}
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-purple-400" />
                          Lançar Nova Movimentação no Cache
                        </h4>

                        <div>
                          <Label className="text-xs font-bold text-slate-300">Descrição da Movimentação *</Label>
                          <Input
                            placeholder="Ex: Pagamento de combustível gerador ou Verba de alimentação"
                            value={movDesc}
                            onChange={e => setMovDesc(e.target.value)}
                            className="h-10 rounded-xl bg-slate-950 border-slate-700 text-white font-medium text-xs mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs font-bold text-slate-300">Tipo *</Label>
                            <Select value={movType} onValueChange={(v: any) => setMovType(v)}>
                              <SelectTrigger className="h-10 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-xl">
                                <SelectItem value="despesa">🔴 Despesa / Saída</SelectItem>
                                <SelectItem value="entrada">🟢 Entrada / Verba</SelectItem>
                                <SelectItem value="insumo">🔵 Insumo / Material</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs font-bold text-slate-300">Valor (R$) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 350.00"
                              value={movAmount}
                              onChange={e => setMovAmount(e.target.value)}
                              className="h-10 rounded-xl bg-slate-950 border-slate-700 text-white font-black text-xs mt-1"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs font-bold text-slate-300">Categoria</Label>
                            <Select value={movCategory} onValueChange={setMovCategory}>
                              <SelectTrigger className="h-10 rounded-xl bg-slate-950 border-slate-700 text-white font-semibold text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-xl">
                                <SelectItem value="Material">Material / Insumo</SelectItem>
                                <SelectItem value="Combustível">Combustível</SelectItem>
                                <SelectItem value="Alimentação">Alimentação / Refeição</SelectItem>
                                <SelectItem value="Serviço Terceirizado">Serviço Terceirizado</SelectItem>
                                <SelectItem value="Manutenção Emergencial">Manutenção Emergencial</SelectItem>
                                <SelectItem value="Outros">Outros Lançamentos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs font-bold text-slate-300">Data do Lançamento</Label>
                            <Input
                              type="date"
                              value={movDate}
                              onChange={e => setMovDate(e.target.value)}
                              className="h-10 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-xs mt-1"
                            />
                          </div>
                        </div>

                        <Button
                          onClick={handleSaveMovimentacao}
                          className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs gap-2 shadow-lg shadow-purple-600/30"
                        >
                          <Save className="w-4 h-4" />
                          Salvar Movimentação em Cache ({viewMonth})
                        </Button>
                      </div>

                      {/* Card de Resumo do Mês Visualizado */}
                      <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-300 block">
                            Total de Movimentações ({viewMonth})
                          </span>
                          <span className="text-sm font-black text-white">{monthlyMovements.length} Lançamento(s)</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-300 block">Total Despesas</span>
                          <span className="text-sm font-black text-rose-400">
                            R$ {monthlyMovements.reduce((acc, m) => acc + (m.type === 'despesa' ? m.amount : 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Movimentações do Mês Visualizado */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                          Movimentações em Cache no Mês ({viewMonth})
                        </h4>

                        {monthlyMovements.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs bg-slate-900 rounded-2xl border border-slate-800">
                            Nenhuma movimentação salva no cache local para o mês {viewMonth}.
                          </div>
                        ) : (
                          monthlyMovements.map(m => (
                            <div key={m.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                    m.type === 'despesa' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                    m.type === 'entrada' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                    'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  }`}>
                                    {m.type}
                                  </span>
                                  <span className="text-xs font-black text-white truncate max-w-[180px]">{m.description}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span>Data: {new Date(m.date).toLocaleDateString('pt-BR')}</span>
                                  <span>Cat: {m.category}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-extrabold text-xs text-purple-300">
                                  R$ {m.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-ABA 2: SOLICITAÇÕES DO ADMINISTRADOR DA OBRA (Aprovação/Recusa restrita ao estado ONLINE) */}
                  {admSubTab === 'solicitacoes' && (
                    <div className="space-y-4 pt-1">
                      {/* Banner Informativo de Conexão Online OBRIGATÓRIA para Aprovações/Recusas */}
                      {!isOnline ? (
                        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-start gap-2.5 shadow-lg">
                          <ZapOff className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-extrabold uppercase text-[10px] text-rose-400 block tracking-wider">
                              ⚡ SYNERA MOBILE OFFLINE
                            </span>
                            <p className="text-[11px] text-rose-200 leading-snug">
                              As solicitações do Administrador de Obras <strong>só podem ser aprovadas ou recusadas quando o Synera Mobile estiver ONLINE</strong>.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Synera Mobile ONLINE — Você pode aprovar ou recusar solicitações diretamente no servidor.</span>
                        </div>
                      )}

                      {/* Formulário de Criar Solicitação */}
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-purple-400" />
                          Nova Solicitação do Administrador
                        </h4>

                        <div>
                          <Label className="text-xs font-bold text-slate-300">Título / Assunto da Solicitação *</Label>
                          <Input
                            placeholder="Ex: Adiantamento de verba para combustível emergencial"
                            value={reqTitle}
                            onChange={e => setReqTitle(e.target.value)}
                            className="h-10 rounded-xl bg-slate-950 border-slate-700 text-white font-medium text-xs mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs font-bold text-slate-300">Tipo de Solicitação</Label>
                            <Select value={reqType} onValueChange={setReqType}>
                              <SelectTrigger className="h-10 rounded-xl bg-slate-950 border-slate-700 text-white font-semibold text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-xl">
                                <SelectItem value="Verba de Campo">Verba de Campo / Adiantamento</SelectItem>
                                <SelectItem value="Insumo Especial">Insumo / Material Especial</SelectItem>
                                <SelectItem value="Equipamento Extra">Equipamento Extra</SelectItem>
                                <SelectItem value="Autorização Hora Extra">Autorização de Hora Extra</SelectItem>
                                <SelectItem value="Outros">Outras Solicitações</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs font-bold text-slate-300">Valor Estimado (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 2500.00"
                              value={reqAmount}
                              onChange={e => setReqAmount(e.target.value)}
                              className="h-10 rounded-xl bg-slate-950 border-slate-700 text-white font-black text-xs mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-300 block mb-1">Justificativa da Solicitação *</Label>
                          <textarea
                            rows={2}
                            placeholder="Descreva a necessidade da solicitação em campo..."
                            value={reqJustification}
                            onChange={e => setReqJustification(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-700 text-white p-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
                          />
                        </div>

                        <Button
                          onClick={handleSaveSolicitacao}
                          className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs gap-2 shadow-lg shadow-purple-600/30"
                        >
                          <Send className="w-4 h-4" />
                          Cadastrar Solicitação do Administrador
                        </Button>
                      </div>

                      {/* Lista de Solicitações do Administrador */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                          Solicitações Cadastradas ({admRequests.length})
                        </h4>

                        {admRequests.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs bg-slate-900 rounded-2xl border border-slate-800">
                            Nenhuma solicitação cadastrada para esta obra.
                          </div>
                        ) : (
                          admRequests.map(req => (
                            <div key={req.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-800 text-purple-300 uppercase border border-slate-700">
                                    {req.type}
                                  </span>
                                  <h5 className="font-extrabold text-xs text-white mt-1 leading-snug">{req.title}</h5>
                                </div>

                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                                  req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                  req.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                                  'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}>
                                  {req.status === 'approved' ? 'Aprovada' : req.status === 'rejected' ? 'Recusada' : 'Pendente'}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-300 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                "{req.justification}"
                              </p>

                              <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-2 font-medium">
                                <span>Solicitante: <strong className="text-slate-200">{req.requester}</strong></span>
                                {req.amount && (
                                  <span className="text-purple-300 font-extrabold text-xs">
                                    R$ {req.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>

                              {/* BOTAO DE APROVAÇÃO E RECUSA (RESTRITO AO ESTADO ONLINE) */}
                              {req.status === 'pending' && (
                                <div className="pt-1">
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      disabled={!isOnline}
                                      onClick={() => handleApproveRequest(req.id, 'approved')}
                                      className={`h-9 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                        isOnline 
                                          ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-md shadow-emerald-600/20 cursor-pointer' 
                                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                                      }`}
                                      title={isOnline ? 'Aprovar solicitação no servidor' : 'Aprovação bloqueada offline'}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Aprovar {isOnline ? '' : '(Requer Online)'}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={!isOnline}
                                      onClick={() => handleApproveRequest(req.id, 'rejected')}
                                      className={`h-9 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                        isOnline 
                                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 cursor-pointer' 
                                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                                      }`}
                                      title={isOnline ? 'Recusar solicitação no servidor' : 'Recusa bloqueada offline'}
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Recusar {isOnline ? '' : '(Requer Online)'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-ABA 3: DIÁRIO DE OBRA & OCORRÊNCIAS (RDO) */}
                  {admSubTab === 'diario' && (
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold text-slate-300">Clima Manhã</Label>
                          <Select value={logWeatherMorning} onValueChange={setLogWeatherMorning}>
                            <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-2xl">
                              <SelectItem value="BOM">☀️ Bom / Limpo</SelectItem>
                              <SelectItem value="NUBLADO">☁️ Nublado</SelectItem>
                              <SelectItem value="CHUVA_FRACA">🌧️ Chuva Fraca</SelectItem>
                              <SelectItem value="CHUVA_FORTE">⛈️ Chuva Forte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-300">Clima Tarde</Label>
                          <Select value={logWeatherAfternoon} onValueChange={setLogWeatherAfternoon}>
                            <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-2xl">
                              <SelectItem value="BOM">☀️ Bom / Limpo</SelectItem>
                              <SelectItem value="NUBLADO">☁️ Nublado</SelectItem>
                              <SelectItem value="CHUVA_FRACA">🌧️ Chuva Fraca</SelectItem>
                              <SelectItem value="CHUVA_FORTE">⛈️ Chuva Forte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-slate-300">Comentários da Fiscalização / Cliente</Label>
                        <Input
                          placeholder="Ex: Engenheiro fiscal inspecionou a drenagem."
                          value={logFiscalization}
                          onChange={e => setLogFiscalization(e.target.value)}
                          className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-slate-300">Segurança do Trabalho & Ocorrências</Label>
                        <Input
                          value={logAccidents}
                          onChange={e => setLogAccidents(e.target.value)}
                          className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                        />
                      </div>

                      <Button
                        onClick={handleSaveDailyLog}
                        className="w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm gap-2 shadow-lg shadow-purple-600/30"
                      >
                        <Send className="w-4 h-4" />
                        Registrar Diário no Celular
                      </Button>
                    </div>
                  )}

                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TELA DA FILA DE SINCRONIZAÇÃO */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'sincronizacao' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-amber-400" />
                      <h3 className="font-black text-sm text-white">Fila de Armazenamento Local</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {offlineQueue.length} Registros Off-line
                    </span>
                  </div>

                  {offlineQueue.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                      <p className="font-bold text-xs text-white">Todos os dados do seu celular estão sincronizados!</p>
                      <p className="text-[11px] text-slate-400">Você pode continuar apontando dados em campo mesmo sem sinal de internet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {offlineQueue.map(item => (
                        <div key={item.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-amber-300">
                              <span className="uppercase text-[10px] font-black px-1.5 py-0.5 bg-slate-800 rounded">
                                {item.type}
                              </span>
                              <span>{item.contractName}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1">
                              {item.type === 'production' && `Produção: ${item.data.qty} ${item.data.unit} (${item.data.serviceName})`}
                              {item.type === 'equipment' && `Equipamento: ${item.data.equipmentName} (${item.data.horometer}h)`}
                              {item.type === 'headcount' && `Equipe: ${item.data.present} presentes, ${item.data.absent} faltas`}
                              {item.type === 'materials' && `Material: ${item.data.qty} ${item.data.unit} de ${item.data.materialName}`}
                              {item.type === 'daily_log' && `Diário de Campo / Clima`}
                            </p>
                            <span className="text-[9px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString('pt-BR')}</span>
                          </div>

                          <button
                            onClick={() => setOfflineQueue(prev => prev.filter(i => i.id !== item.id))}
                            className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {offlineQueue.length > 0 && (
                    <Button
                      disabled={!isOnline || isSyncing}
                      onClick={handleProcessSync}
                      className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm gap-2 shadow-lg shadow-amber-500/30"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isOnline ? 'Enviar Todos para o Servidor' : 'Aguardando Sinal de Conexão'}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TELA DA GALERIA DE FOTOS */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'galeria' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-fuchsia-400" />
                      <h3 className="text-sm font-black text-white uppercase tracking-wide">Galeria de Fotos</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {fieldReports.filter(r => r.photoUrl).length} Foto(s)
                    </span>
                  </div>

                  {fieldReports.filter(r => r.photoUrl).length === 0 ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto flex items-center justify-center">
                        <Camera className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-slate-400 text-xs font-bold px-8">Nenhuma foto registrada na galeria local.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {fieldReports.filter(r => r.photoUrl).map(report => (
                          <div 
                            key={report.id} 
                            onClick={() => setSelectedGalleryPhotos(prev => 
                              prev.includes(report.photoUrl as string) 
                                ? prev.filter(url => url !== report.photoUrl) 
                                : [...prev, report.photoUrl as string]
                            )}
                            className={`relative aspect-[3/4] bg-slate-950 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                              selectedGalleryPhotos.includes(report.photoUrl as string) ? 'border-fuchsia-500 scale-95 shadow-lg shadow-fuchsia-500/30' : 'border-slate-700 hover:border-slate-500'
                            }`}
                          >
                            <img src={report.photoUrl} alt="Foto Campo" className="w-full h-full object-cover" />
                            {selectedGalleryPhotos.includes(report.photoUrl as string) && (
                              <div className="absolute inset-0 bg-fuchsia-500/20 flex items-start justify-end p-2 backdrop-blur-[1px]">
                                <div className="w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center shadow-md">
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 p-2 pt-8">
                              <p className="text-[9px] font-bold text-white truncate">{report.description || 'Sem descrição'}</p>
                              <p className="text-[8px] text-slate-400 truncate">{report.date ? report.date.split('-').reverse().join('/') : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedGalleryPhotos.length > 0 && (
                        <div className="pt-2 sticky bottom-4 z-10">
                          <Button
                            onClick={async () => {
                              try {
                                const files: File[] = [];
                                for (let i = 0; i < selectedGalleryPhotos.length; i++) {
                                  const url = selectedGalleryPhotos[i];
                                  const res = await fetch(url);
                                  const blob = await res.blob();
                                  files.push(new File([blob], `evidencia_obra_${i+1}_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' }));
                                }
                                
                                if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
                                  await navigator.share({
                                    files,
                                    title: 'Evidências Fotográficas - Synera Mobile',
                                    text: 'Fotos registradas no campo via Synera Mobile.'
                                  });
                                } else {
                                  alert('Seu dispositivo não suporta o compartilhamento múltiplo nativo de arquivos.');
                                }
                              } catch (err) {
                                console.error('Erro ao compartilhar fotos:', err);
                                alert('Ocorreu um erro ao tentar compartilhar as fotos.');
                              }
                            }}
                            className="w-full h-12 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-xl shadow-fuchsia-600/30"
                          >
                            <Share2 className="w-5 h-5" />
                            Compartilhar {selectedGalleryPhotos.length} {selectedGalleryPhotos.length === 1 ? 'Foto' : 'Fotos'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </div>
        )}

      </div>

      {/* PWA Manual Guide Modal / Instructions */}
      <AnimatePresence>
        {showPwaGuide && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }} 
              animate={{ y: 0 }} 
              exit={{ y: 100 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 text-white space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-black text-base text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                  <span>Instalar PWA no Celular</span>
                </div>
                <button onClick={() => setShowPwaGuide(false)} className="text-slate-400 text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg">
                  Fechar
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <span className="font-extrabold text-blue-400 block mb-1">📱 No iPhone (iOS Safari):</span>
                  <p>1. Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta para cima).</p>
                  <p>2. Role a lista e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <span className="font-extrabold text-emerald-400 block mb-1">🤖 No Android (Google Chrome):</span>
                  <p>1. Toque nos <strong>três pontinhos (⋮)</strong> no canto superior do navegador.</p>
                  <p>2. Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à Tela Inicial"</strong>.</p>
                </div>
              </div>

              <Button onClick={() => setShowPwaGuide(false)} className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-slate-950">
                Entendi
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL DE CÂMERA DE CAMPO COMPLETA (SYNERA MOBILE PWA) */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between max-w-md mx-auto"
          >
            {/* Input fallback para galeria/arquivos */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUploadFallback}
            />

            {/* TOP BAR: CONTROLES DE CÂMERA & OVERLAY DA ESTACA MAIS PRÓXIMA */}
            <div className="p-4 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent flex items-center justify-between z-20 shrink-0">
              <button
                onClick={() => setIsCameraOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur border border-slate-700 flex items-center justify-center text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* OVERLAY DE ESTACA MAIS PRÓXIMA DA SALA TÉCNICA */}
              <div className="flex-1 mx-2 flex items-center justify-center">
                <div className="px-3 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 backdrop-blur text-xs flex items-center gap-1.5 text-emerald-300 font-extrabold shadow-lg">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                  <span className="truncate max-w-[170px]">
                    {nearestStationInfo
                      ? `Estaca ${nearestStationInfo.station} (${nearestStationInfo.distanceMeters}m)`
                      : isLocating
                      ? 'Buscando estaca...'
                      : 'Estaca de Projeto'}
                  </span>
                  <button onClick={fetchUserGps} className="p-1 hover:text-white" title="Atualizar GPS">
                    <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* OPÇÕES DE QUALIDADE, GRADE E FLASH */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    showGrid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-900/80 text-slate-400 border-slate-700'
                  }`}
                  title="Grade de Enquadramento"
                >
                  <Grid className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setFlashEnabled(!flashEnabled)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    flashEnabled ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-900/80 text-slate-400 border-slate-700'
                  }`}
                  title="Lanterna / Flash"
                >
                  {flashEnabled ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4 text-slate-500" />}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="px-2.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-[10px] font-black uppercase text-blue-400 flex items-center gap-1"
                  >
                    <span>{cameraQuality}</span>
                    <Sliders className="w-3 h-3" />
                  </button>

                  {showQualityMenu && (
                    <div className="absolute right-0 top-11 w-40 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 z-30 text-xs">
                      <p className="text-[10px] font-extrabold text-slate-400 px-2 uppercase">Configurar Qualidade:</p>
                      {(['1080p', '720p', '480p'] as const).map(q => (
                        <button
                          key={q}
                          onClick={() => {
                            setCameraQuality(q);
                            setShowQualityMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                            cameraQuality === q ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{q === '1080p' ? 'Full HD (1080p)' : q === '720p' ? 'HD (720p)' : 'Baixa (480p)'}</span>
                          {cameraQuality === q && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PREVIEW DO VÍDEO / FOTO CAPTURADA */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              {capturedPhotoUrl ? (
                <img src={capturedPhotoUrl} alt="Foto de Campo" className="w-full h-full object-contain" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Grade de Alinhamento */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/10">
                      <div className="border border-white/10" />
                      <div className="border border-white/10" />
                      <div className="border border-white/10" />
                      <div className="border border-white/10" />
                      <div className="border border-white/10" />
                      <div className="border border-white/10" />
                      <div className="border border-white/10" />
                      <div className="border border-white/10" />
                      <div className="border border-white/10" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* BARRA INFERIOR DE CAPTURA E INFORMAÇÃO */}
            <div className="p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-slate-950/90 border-t border-slate-800 space-y-3 shrink-0 z-20">
              
              {/* DESCRIÇÃO DA FOTO */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    Descrição / Observação da Foto *
                  </label>
                  <span className="text-[10px] text-slate-400">Obrigatório</span>
                </div>
                <Input
                  value={photoDescription}
                  onChange={e => setPhotoDescription(e.target.value)}
                  placeholder="Escreva a descrição (ex: Concretagem, armadura, patologia...)"
                  className="bg-slate-900 border-slate-700 text-xs text-white placeholder-slate-500 rounded-xl h-10"
                />
              </div>

              {/* ESTACA IDENTIFICADA */}
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Estaca Calculada / Informada:</label>
                  <Input
                    value={photoStation}
                    onChange={e => setPhotoStation(e.target.value)}
                    placeholder="Ex: Estaca 10+15,00"
                    className="bg-slate-900 border-slate-700 text-xs text-emerald-400 font-bold rounded-xl h-9"
                  />
                </div>
                {nearestStationInfo && (
                  <button
                    onClick={() => setPhotoStation(nearestStationInfo.station)}
                    className="mt-4 px-2.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold"
                  >
                    Usar GPS ({nearestStationInfo.station})
                  </button>
                )}
              </div>

              {/* DISPARADOR DE CAPTURA / SALVAR */}
              {capturedPhotoUrl ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    onClick={() => setCapturedPhotoUrl(null)}
                    className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase"
                  >
                    Tirar Outra Foto
                  </Button>
                  <Button
                    onClick={handleSavePhotoRecord}
                    className="h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    Salvar Registro
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    title="Carregar da Galeria"
                  >
                    <Upload className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleTakePhoto}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-blue-500 p-1 shadow-2xl shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                    title="Disparar Foto"
                  >
                    <div className="w-full h-full bg-slate-950 rounded-full border-2 border-white/80 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white" />
                    </div>
                  </button>

                  <div className="w-11" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RODAPÉ FIXO DE NAVEGAÇÃO DO SYNERA MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 py-2 px-4 z-40 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveSector(null)}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeSector === null ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[10px]">Início</span>
        </button>

        <button
          onClick={() => setIsMyRecordsOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors relative"
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Registros</span>
          {fieldReports.length > 0 && (
            <span className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>

        {/* BOTÃO CENTRAL DE CÂMERA EM DESTAQUE NO RODAPÉ */}
        <button
          onClick={() => setIsCameraOpen(true)}
          className="relative -top-3 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-blue-600 p-1 shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
          title="Câmera de Campo Synera"
        >
          <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center group-hover:bg-slate-900 transition-colors">
            <Camera className="w-7 h-7 text-emerald-400" />
          </div>
        </button>

        <button
          onClick={() => setActiveSector('sincronizacao')}
          className={`flex flex-col items-center gap-1 transition-colors relative ${
            activeSector === 'sincronizacao' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          <span className="text-[10px]">Sincronizar</span>
          {offlineQueue.length > 0 && (
            <span className="absolute -top-1 right-2 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black">
              {offlineQueue.length}
            </span>
          )}
        </button>
      </div>

      {/* MODAL DE CHAT SYNERA MOBILE */}
      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-3.5 bg-slate-950/80 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Chat Synera Mobile</h3>
                    <p className="text-[10px] text-indigo-300 font-medium">Comunicação direta de campo e sala técnica</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsChatOpen(false)} 
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden p-1.5 bg-slate-950">
                <Chat 
                  currentUser={currentUser} 
                  users={users || []} 
                  contracts={contracts} 
                  isMobileView={true} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
