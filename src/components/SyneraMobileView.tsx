import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Smartphone, Wifi, WifiOff, RefreshCw, CheckCircle2, Check, Clock, 
  Send, Camera, HardHat, Wrench, Users, FileText, AlertTriangle, AlertCircle,
  MapPin, CloudSun, Plus, Trash2, ShieldCheck, Download, Share2, 
  ChevronRight, Calendar, ArrowUpRight, Zap, Building2, Package, ArrowLeft, Layers,
  Search, Edit3, X, Eye, LogOut, LayoutDashboard, Sliders, Grid, ZapOff, RefreshCcw,
  Upload, Navigation, Crosshair, Sparkles, BarChart2, XCircle, ArrowRightLeft, UserCheck, Save, MessageCircle, Settings,
  RotateCw, Maximize2, Filter, Type, CheckSquare, Square, Stamp, Truck, Box, FolderDown
} from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Contract, ServiceItem, ServiceProduction, ControllerEquipment, Employee, User, DailyReport, MobileSector, FieldProductionReport, ProjectAlignment } from '../types';
import { safeSetLocalStorage } from '../lib/useLocalStorage';
import { saveFieldReportToIDB, saveMultipleFieldReportsToIDB, getAllFieldReportsFromIDB, deleteFieldReportFromIDB, getDeletedFieldReportIds, addDeletedFieldReportId } from '../lib/offlineStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { Chat } from './Chat';

export interface SyneraMobileViewProps {
  isCamOnly?: boolean;
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
  onDeleteFieldReport?: (reportId: string) => void;
  onUpdateServiceProduction: (p: ServiceProduction) => void;
  onAddWorkMovement?: (movement: any) => void;
  onSaveDailyReport?: (report: DailyReport) => void;
  onLogout?: () => void;
  selectedContractId?: string;
  onUpdateContractId?: (id: string) => void;
  onSyncRequest?: () => Promise<void>;
  systemConfig?: any[];
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
const SYNC_HISTORY_KEY = 'synera_mobile_sync_history_v1';

export const getLocalTodayDateStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatLocalDateStr = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return dateStr;
};
export interface SyncHistoryItem {
  id: string;
  timestamp: string;
  action: 'upload' | 'download';
  details: string;
}
export const STAMP_CONFIG_KEY = 'synera_stamp_config_v1';

/**
 * Interface de Configuração Profissional do Carimbo Técnico de Fotos Synera Cam
 */
export interface StampConfig {
  style: 'hud_banner' | 'corner_badge' | 'subtle_bottom' | 'full_watermark';
  position: 'bottom' | 'bottom_left' | 'bottom_right' | 'top_left';
  fontSize: 'sm' | 'md' | 'lg';
  bgOpacity: number; // 0.0 a 1.0
  themeColor: string; // Cor de acento (Hex: #10B981, #F59E0B, #38BDF8, #D946EF, #E11D48, #FFFFFF)
  showWorkName: boolean;
  showStation: boolean;
  showDateTime: boolean;
  showCoordinates: boolean;
  showDescription: boolean;
  showLogoBadge: boolean;
  rotateCaption: boolean;
  customHeaderTitle: string;
}

export const DEFAULT_STAMP_CONFIG: StampConfig = {
  style: 'hud_banner',
  position: 'bottom',
  fontSize: 'md',
  bgOpacity: 0.85,
  themeColor: '#10B981',
  showWorkName: true,
  showStation: true,
  showDateTime: true,
  showCoordinates: true,
  showDescription: true,
  showLogoBadge: true,
  rotateCaption: false,
  customHeaderTitle: 'SYNERA CAM • REGISTRO DE CAMPO',
};

/**
 * Detecta e remove bordas/faixas pretas de pillarbox/letterbox geradas por drivers de vídeo de navegadores mobile em WebRTC.
 */
export const removeBlackBordersFromCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  if (width < 100 || height < 100) return canvas;

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, width, height);
  } catch (e) {
    return canvas;
  }

  const data = imgData.data;

  // Função para checar se um pixel é preto (R, G, B muito baixos)
  const isBlackPixel = (x: number, y: number): boolean => {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return r + g + b < 30; // limiar de preto
  };

  // Amostragem de linhas para verificar se uma coluna x inteira é faixa preta
  const isColumnBlack = (x: number): boolean => {
    const steps = 12;
    for (let i = 1; i < steps; i++) {
      const sampleY = Math.floor((height * i) / steps);
      if (!isBlackPixel(x, sampleY)) {
        return false; // Tem conteúdo visível
      }
    }
    return true;
  };

  // Amostragem de colunas para verificar se uma linha y inteira é faixa preta
  const isRowBlack = (y: number): boolean => {
    const steps = 12;
    for (let i = 1; i < steps; i++) {
      const sampleX = Math.floor((width * i) / steps);
      if (!isBlackPixel(sampleX, y)) {
        return false; // Tem conteúdo visível
      }
    }
    return true;
  };

  let minX = 0;
  while (minX < width / 2 && isColumnBlack(minX)) {
    minX++;
  }

  let maxX = width - 1;
  while (maxX > width / 2 && isColumnBlack(maxX)) {
    maxX--;
  }

  let minY = 0;
  while (minY < height / 2 && isRowBlack(minY)) {
    minY++;
  }

  let maxY = height - 1;
  while (maxY > height / 2 && isRowBlack(maxY)) {
    maxY--;
  }

  const hasLeftBar = minX > 12;
  const hasRightBar = (width - 1 - maxX) > 12;
  const hasTopBar = minY > 12;
  const hasBottomBar = (height - 1 - maxY) > 12;

  if (!hasLeftBar && !hasRightBar && !hasTopBar && !hasBottomBar) {
    return canvas; // Sem bordas pretas
  }

  const cropW = Math.max(100, maxX - minX + 1);
  const cropH = Math.max(100, maxY - minY + 1);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;

  const croppedCtx = croppedCanvas.getContext('2d');
  if (croppedCtx) {
    croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return croppedCanvas;
  }

  return canvas;
};

/**
 * Função para estampar carimbo técnico altamente configurável (Obra, Estaca, Data/Hora, GPS, Obs, Synera Logo)
 * diretamente no bitmap canvas da foto de forma precisa.
 */
export const stampPhotoWithMetadata = async (
  rawImageSrc: string,
  options: {
    contractName?: string;
    station?: string;
    description?: string;
    locationText?: string;
    dateText?: string;
    rotationDegrees?: number; // 0, 90, 180, 270
    isMirrored?: boolean;
    stampConfig?: StampConfig;
  }
): Promise<string> => {
  return new Promise((resolve) => {
    if (!rawImageSrc) {
      resolve('');
      return;
    }

    const config = options.stampConfig || DEFAULT_STAMP_CONFIG;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const rot = ((options.rotationDegrees || 0) % 360 + 360) % 360;
        const isSwapped = rot === 90 || rot === 270;
        
        let origW = img.width || 1920;
        let origH = img.height || 1080;
        
        const MAX_DIM = 1920;
        if (origW > MAX_DIM || origH > MAX_DIM) {
          if (origW > origH) {
            origH = Math.round(origH * (MAX_DIM / origW));
            origW = MAX_DIM;
          } else {
            origW = Math.round(origW * (MAX_DIM / origH));
            origH = MAX_DIM;
          }
        }

        let rawCanvas = document.createElement('canvas');
        const canvasWInitial = isSwapped ? origH : origW;
        const canvasHInitial = isSwapped ? origW : origH;
        rawCanvas.width = canvasWInitial;
        rawCanvas.height = canvasHInitial;

        let ctx = rawCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(rawImageSrc);
          return;
        }

        ctx.save();
        ctx.translate(canvasWInitial / 2, canvasHInitial / 2);
        if (rot !== 0) {
          ctx.rotate((rot * Math.PI) / 180);
        }
        if (options.isMirrored) {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
        ctx.restore();

        // Limpeza automática de qualquer faixa preta (pillarbox/letterbox)
        const canvas = removeBlackBordersFromCanvas(rawCanvas);
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(rawImageSrc);
          return;
        }

        // Calculo proporcional de fontes baseado na menor dimensão da imagem
        const minDim = Math.min(canvasW, canvasH);
        const scaleMult = config.fontSize === 'sm' ? 0.025 : config.fontSize === 'lg' ? 0.040 : 0.032;
        const baseFontSize = Math.max(14, Math.floor(minDim * scaleMult));
        const padding = baseFontSize * 0.85;
        const margin = Math.max(16, Math.floor(minDim * 0.03));
        const accentColor = config.themeColor || '#10B981';

        // Preparar linhas de informação conforme configuração ativada
        const lines: { text: string; color: string; fontStyle?: string }[] = [];
        
        if (config.showWorkName && options.contractName) {
          lines.push({
            text: `OBRA: ${options.contractName}`,
            color: '#FFFFFF',
            fontStyle: `900 ${baseFontSize}px sans-serif`
          });
        }

        if (config.showStation || config.showDateTime) {
          const parts: string[] = [];
          if (config.showStation) parts.push(`ESTACA: ${options.station || 'Estaca N/I'}`);
          if (config.showDateTime) parts.push(`DATA: ${options.dateText || new Date().toLocaleString('pt-BR')}`);
          lines.push({
            text: parts.join('   |   '),
            color: '#F59E0B',
            fontStyle: `700 ${Math.floor(baseFontSize * 0.9)}px sans-serif`
          });
        }

        if (config.showCoordinates && options.locationText) {
          lines.push({
            text: `GPS: ${options.locationText}`,
            color: '#38BDF8',
            fontStyle: `600 ${Math.floor(baseFontSize * 0.82)}px sans-serif`
          });
        }

        if (config.showDescription && options.description) {
          lines.push({
            text: `OBS: ${options.description}`,
            color: '#E2E8F0',
            fontStyle: `italic 500 ${Math.floor(baseFontSize * 0.82)}px sans-serif`
          });
        }

        if (lines.length === 0 && !config.showLogoBadge) {
          resolve(canvas.toDataURL('image/jpeg', 0.88));
          return;
        }

        ctx.save();
        const textCanvasW = config.rotateCaption ? canvasH : canvasW;
        const textCanvasH = config.rotateCaption ? canvasW : canvasH;
        if (config.rotateCaption) {
          ctx.translate(canvasW, 0);
          ctx.rotate(Math.PI / 2);
        }
        
        // Função auxiliar para retângulo arredondado
        const drawRoundedBox = (x: number, y: number, w: number, h: number, r: number | number[]) => {
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, r);
          } else {
            const rad = typeof r === 'number' ? r : r[0] || 0;
            ctx.moveTo(x + rad, y);
            ctx.lineTo(x + w - rad, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
            ctx.lineTo(x + w, y + h - rad);
            ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
            ctx.lineTo(x + rad, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
            ctx.lineTo(x, y + rad);
            ctx.quadraticCurveTo(x, y, x + rad, y);
            ctx.closePath();
          }
        };

        const badgeHeaderHeight = config.showLogoBadge ? baseFontSize * 1.5 : 0;
        const lineHeight = baseFontSize * 1.35;
        const boxContentHeight = badgeHeaderHeight + (lines.length * lineHeight) + (padding * 2);

        // Medição e posiciamento do Box do Carimbo
        let maxTextW = 0;
        ctx.font = `bold ${baseFontSize}px sans-serif`;
        if (config.showLogoBadge) {
          maxTextW = Math.max(maxTextW, ctx.measureText(config.customHeaderTitle || 'SYNERA CAM').width);
        }
        for (const l of lines) {
          ctx.font = l.fontStyle || `bold ${baseFontSize}px sans-serif`;
          maxTextW = Math.max(maxTextW, ctx.measureText(l.text).width);
        }

        let boxWidth = textCanvasW - (margin * 2);
        if (config.style === 'corner_badge') {
          boxWidth = Math.min(textCanvasW - (margin * 2), maxTextW + (padding * 2.5) + 16);
        }

        let boxX = margin;
        if (config.position === 'bottom_right') {
          boxX = textCanvasW - margin - boxWidth;
        } else if (config.position === 'bottom_left' || config.position === 'bottom') {
          boxX = margin;
        } else if (config.position === 'top_left') {
          boxX = margin;
        }

        let boxY = textCanvasH - margin - boxContentHeight;
        if (config.position === 'top_left') {
          boxY = margin;
        }

        const borderRadius = Math.max(12, Math.floor(baseFontSize * 0.8));
        const bgAlpha = Math.max(0, Math.min(1, config.bgOpacity ?? 0.85));

        // Estilos de fundo
        if (config.style === 'hud_banner' || config.style === 'corner_badge' || config.style === 'full_watermark') {
          if (bgAlpha > 0) {
            drawRoundedBox(boxX, boxY, boxWidth, boxContentHeight, borderRadius);
            ctx.fillStyle = `rgba(2, 6, 23, ${bgAlpha})`;
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = `${accentColor}40`;
            ctx.stroke();

            // Barra de acento lateral
            drawRoundedBox(boxX, boxY, Math.max(4, Math.floor(baseFontSize * 0.3)), boxContentHeight, [borderRadius, 0, 0, borderRadius]);
            ctx.fillStyle = accentColor;
            ctx.fill();
          }
        } else if (config.style === 'subtle_bottom') {
          const gradY = textCanvasH - boxContentHeight - margin;
          const grad = ctx.createLinearGradient(0, gradY, 0, textCanvasH);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, bgAlpha + 0.2)})`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, gradY, textCanvasW, boxContentHeight + margin * 2);
        }

        // Sombras para garantir legibilidade dos textos
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 1.5;
        ctx.shadowOffsetY = 1.5;

        // Cabeçalho Synera Cam
        let curY = boxY + padding + baseFontSize * 0.65;
        if (config.showLogoBadge) {
          const badgeText = config.customHeaderTitle || '📷 SYNERA CAM • REGISTRO DE CAMPO GPS';
          ctx.font = `900 ${Math.floor(baseFontSize * 0.78)}px sans-serif`;
          ctx.fillStyle = accentColor;
          ctx.fillText(badgeText, boxX + padding + 6, curY);

          curY += baseFontSize * 0.9;
          if (lines.length > 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(boxX + padding, curY);
            ctx.lineTo(boxX + boxWidth - padding, curY);
            ctx.stroke();
            curY += padding * 0.5;
          }
        }

        // Desenhar Linhas de Informação
        const textX = boxX + padding + 6;
        for (const line of lines) {
          curY += baseFontSize * 0.8;
          ctx.font = line.fontStyle || `bold ${baseFontSize}px sans-serif`;
          ctx.fillStyle = line.color;
          ctx.fillText(line.text, textX, curY, boxWidth - padding * 2 - 12);
          curY += lineHeight - (baseFontSize * 0.8);
        }

        ctx.restore();
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch (e) {
        console.error('Erro ao estampar imagem:', e);
        resolve(rawImageSrc);
      }
    };
    img.onerror = () => resolve(rawImageSrc);
    img.src = rawImageSrc;
  });
};

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
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        const selected = services.find(s => s.id === selectedServiceId);
        if (selected) {
          setQuery(`${selected.code ? `[${selected.code}] ` : ''}${selected.name}`);
        } else if (!selectedServiceId) {
          setQuery('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedServiceId, services]);

  useEffect(() => {
    const selectedOption = services.find(o => o.id === selectedServiceId);
    if (selectedOption) {
      setQuery(`${selectedOption.code ? `[${selectedOption.code}] ` : ''}${selectedOption.name}`);
    } else {
      setQuery('');
    }
  }, [selectedServiceId, services]);

  const filteredServices = useMemo(() => {
    if (!query.trim()) return services;
    const lower = query.toLowerCase();
    return services.filter(s => 
      (s.name && s.name.toLowerCase().includes(lower)) ||
      (s.code && s.code.toLowerCase().includes(lower))
    );
  }, [services, query]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input 
          type="text" 
          placeholder="Pesquisar e selecionar serviço..." 
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setIsOpen(true);
          }}
          className="w-full min-h-[44px] rounded-2xl bg-slate-900 border border-slate-700 text-white px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors"
        />
        <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isOpen ? 'rotate-90' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 5 }}
            className="absolute left-0 right-0 top-12 z-50 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-2 max-h-64 overflow-hidden flex flex-col"
          >
            <div className="overflow-y-auto flex-1 space-y-1 custom-scrollbar pr-1">
              {filteredServices.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 text-center">Nenhum serviço encontrado.</p>
              ) : (
                filteredServices.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectService(s);
                      setIsOpen(false);
                      setQuery(`${s.code ? `[${s.code}] ` : ''}${s.name}`);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      selectedServiceId === s.id ? 'bg-blue-600/30 text-blue-300 font-extrabold border border-blue-500/40' : 'text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-white truncate">{s.name}</p>
                      {s.code && <span className="text-[10px] text-slate-400 font-mono">Cód: {s.code}</span>}
                    </div>
                    {s.unit && <span className="text-[10px] font-bold text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded">{s.unit}</span>}
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
  onDeleteFieldReport,
  onUpdateServiceProduction,
  onAddWorkMovement,
  onSaveDailyReport,
  onLogout,
  onSyncRequest,
  selectedContractId: propSelectedContractId,
  onUpdateContractId,
  isCamOnly = false,
  systemConfig = [],
}: SyneraMobileViewProps) {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  
  // Selected sector (null = Home/Landing page, or one of the 5 sector IDs, 'sincronizacao', 'registros', 'projetos_baixados', 'galeria')
  const [activeSector, setActiveSector] = useState<MobileSector | 'sincronizacao' | 'registros' | 'projetos_baixados' | 'galeria' | null>(null);

  // Downloaded Projects cache state for Synera Cam (iOS / Android)
  const [camDownloadedProjects, setCamDownloadedProjects] = useState<Array<{
    contractId: string;
    contractName: string;
    contractNumber?: string;
    client?: string;
    workName?: string;
    downloadedAt: string;
    alignmentCount: number;
    status: 'ready' | 'downloading';
  }>>(() => {
    try {
      const stored = localStorage.getItem('synera_cam_downloaded_projects');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });
  const [isDownloadingProject, setIsDownloadingProject] = useState<boolean>(false);

  // States for dedicated Registros screen
  const [registrosFilterStatus, setRegistrosFilterStatus] = useState<'all' | 'pending' | 'synced'>('all');
  const [registrosSearch, setRegistrosSearch] = useState<string>('');
  const [registrosFilterContract, setRegistrosFilterContract] = useState<string>('all');

  // Mobile User Specific Field Reports (Strictly show ONLY entries created by the logged-in user)
  const userFieldReports = useMemo(() => {
    if (!fieldReports || isCamOnly) return [];
    if (!currentUser || currentUser.id === 'offline-cam-user') return [];

    return fieldReports.filter(r => {
      const emailMatch = Boolean(
        currentUser.email && r.reportedByEmail && 
        r.reportedByEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim()
      );
        
      const nameMatch = Boolean(
        currentUser.name && r.reportedBy && 
        r.reportedBy.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
      );

      const createdNameMatch = Boolean(
        currentUser.name && r.createdByName &&
        r.createdByName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
      );

      const userIdMatch = Boolean(r.userId && r.userId === currentUser.id);

      const isUserReport = emailMatch || nameMatch || createdNameMatch || userIdMatch;

      // Pending/offline local reports created on this device by this user
      const isLocalPending = (r.status === 'pending' || !r.syncedAt || !r.synced) &&
        (!r.reportedByEmail || isUserReport);

      return isUserReport || isLocalPending;
    });
  }, [fieldReports, currentUser, isCamOnly]);

  // Filtered reports for Meus Registros screen
  const filteredUserReports = useMemo(() => {
    return userFieldReports.filter(r => {
      const isSynced = r.status === 'synced' || r.status === 'approved' || Boolean(r.syncedAt);
      if (registrosFilterStatus === 'pending' && isSynced) return false;
      if (registrosFilterStatus === 'synced' && !isSynced) return false;

      if (registrosFilterContract !== 'all' && r.contractId !== registrosFilterContract) return false;

      if (registrosSearch.trim()) {
        const q = registrosSearch.toLowerCase().trim();
        const sName = (r.serviceName || '').toLowerCase();
        const trecho = (r.trecho || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        if (!sName.includes(q) && !trecho.includes(q) && !notes.includes(q)) return false;
      }

      return true;
    });
  }, [userFieldReports, registrosFilterStatus, registrosFilterContract, registrosSearch]);

  // Restaura relatórios do IndexedDB para garantir que nenhum apontamento offline seja perdido
  useEffect(() => {
    let isMounted = true;
    getAllFieldReportsFromIDB().then(idbReports => {
      if (!isMounted || !idbReports || idbReports.length === 0) return;
      const deletedIds = getDeletedFieldReportIds();
      idbReports.forEach(r => {
        if (r && r.id && !deletedIds.includes(r.id) && onSaveFieldReport) {
          const exists = fieldReports?.some(f => f.id === r.id);
          if (!exists) {
            onSaveFieldReport(r);
          }
        }
      });
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [onSaveFieldReport, fieldReports]);

  // Selected active contract in mobile
  const [selectedContractId, setSelectedContractIdState] = useState<string>(() => {
    return propSelectedContractId || (currentUser?.allowedContractIds?.[0]) || contracts[0]?.id || '';
  });

  const setSelectedContract = (id: string) => {
    setSelectedContractIdState(id);
    if (onUpdateContractId) {
      onUpdateContractId(id);
    }
  };
  const setSelectedContractId = setSelectedContract;

  useEffect(() => {
    if (propSelectedContractId && propSelectedContractId !== selectedContractId) {
      setSelectedContractIdState(propSelectedContractId);
    } else if (currentUser?.allowedContractIds && currentUser.allowedContractIds.length > 0) {
      const allowedId = currentUser.allowedContractIds[0];
      if (allowedId && allowedId !== selectedContractId) {
        setSelectedContractIdState(allowedId);
        if (onUpdateContractId) onUpdateContractId(allowedId);
      }
    } else if (contracts.length > 0 && (!selectedContractId || !contracts.some(c => c.id === selectedContractId))) {
      const defaultId = contracts[0].id;
      setSelectedContractIdState(defaultId);
      if (onUpdateContractId) onUpdateContractId(defaultId);
    }
  }, [currentUser, contracts, propSelectedContractId, selectedContractId, onUpdateContractId]);

  // ----------------------------------------------------
  // CAMERA DE CAMPO PWA & ESTACA MAIS PRÓXIMA (SALA TÉCNICA)
  // ----------------------------------------------------
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraQuality, setCameraQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraRotation, setCameraRotation] = useState<number>(0); // 0, 90, 180, 270 deg

  // ----------------------------------------------------
  // CONFIGURAÇÃO DO CARIMBO TÉCNICO (CONFIGURABLE STAMP)
  // ----------------------------------------------------
  const [stampConfig, setStampConfig] = useState<StampConfig>(() => {
    try {
      const saved = localStorage.getItem(STAMP_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao carregar stampConfig do localStorage:', e);
    }
    return DEFAULT_STAMP_CONFIG;
  });

  const [showStampSettingsModal, setShowStampSettingsModal] = useState<boolean>(false);
  const [showStampInfoModal, setShowStampInfoModal] = useState<boolean>(false);

  const updateStampConfig = (newConfig: Partial<StampConfig>) => {
    setStampConfig(prev => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem(STAMP_CONFIG_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Erro ao salvar stampConfig:', e);
      }
      return updated;
    });
  };

  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight;
  });

  // Rotação automática da câmera baseada na orientação física do dispositivo
  useEffect(() => {
    const handleOrientationChange = () => {
      const angle = window.screen?.orientation?.angle || (window as any).orientation || 0;
      setIsLandscape(window.innerWidth > window.innerHeight || angle === 90 || angle === -90 || angle === 270);
      
      // Auto-rotacionar a câmera se estiver em paisagem e a resolução de vídeo for retrato
      // Será validado no momento de capturar a foto se a resolução real precisa da rotação.
      if (angle === 90 || angle === -90 || angle === 270) {
        // Se a tela estiver em modo paisagem, podemos assumir que o usuário deitou o telefone.
        // O preview de vídeo será ajustado via CSS se necessário.
      }
    };
    
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    handleOrientationChange();
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Monitoramento de Inclinômetro / Bússola em tempo real para o Nível HUD da Câmera
  useEffect(() => {
    if (!isCameraOpen) return;
    const handleDeviceMotion = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.beta !== undefined) {
        setDeviceTiltPitch(Math.round(e.beta));
      }
      if (e.gamma !== null && e.gamma !== undefined) {
        setDeviceTiltRoll(Math.round(e.gamma));
      }
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleDeviceMotion, true);
    }
    return () => {
      if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleDeviceMotion, true);
      }
    };
  }, [isCameraOpen]);

  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosticResults, setDiagnosticResults] = useState<{
    mediaSupported: boolean;
    permissionState: string;
    devicesCount: number;
    devicesList: string[];
    testStreamWorking: boolean;
    gpsWorking: boolean;
    nativeFallbackWorking: boolean;
  } | null>(null);
  const [photoDescription, setPhotoDescription] = useState<string>('');
  const [photoStation, setPhotoStation] = useState<string>('');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [selectedGalleryPhotos, setSelectedGalleryPhotos] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestStationInfo, setNearestStationInfo] = useState<{ station: string; distanceMeters: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

  // Estados da Galeria de Fotos (Filtro, Busca, Ampliar, Editar, Excluir)
  const [galleryFilterContract, setGalleryFilterContract] = useState<string>('all');
  const [gallerySearchQuery, setGallerySearchQuery] = useState<string>('');
  const [previewingReport, setPreviewingReport] = useState<FieldProductionReport | null>(null);
  const [editingPhotoReport, setEditingPhotoReport] = useState<FieldProductionReport | null>(null);
  const [editStation, setEditStation] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

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

  // Método de Verificação e Diagnóstico Completo da Câmera
  const runCameraDiagnostics = async () => {
    setIsDiagnosing(true);
    let mediaSupported = false;
    let permissionState = 'desconhecido';
    let devicesCount = 0;
    let devicesList: string[] = [];
    let testStreamWorking = false;
    let gpsWorking = false;
    let nativeFallbackWorking = true;

    // 1. Verificar suporte à API MediaDevices
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      mediaSupported = true;
    }

    // 2. Enumerar câmeras disponíveis
    if (mediaSupported) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        devicesCount = videoDevices.length;
        devicesList = videoDevices.map((d, i) => d.label || `Câmera #${i + 1} (${d.deviceId.slice(0, 8)})`);
      } catch (e) {
        console.warn('Erro ao enumerar dispositivos de vídeo:', e);
      }
    }

    // 3. Consultar Permissão do Navegador
    if (typeof navigator !== 'undefined' && navigator.permissions && (navigator.permissions as any).query) {
      try {
        const res = await (navigator.permissions as any).query({ name: 'camera' });
        permissionState = res.state;
      } catch {
        permissionState = 'nao_suportado';
      }
    }

    // 4. Testar transmissão de vídeo ao vivo
    if (mediaSupported) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false
        });
        if (testStream && testStream.getVideoTracks().length > 0) {
          testStreamWorking = true;
          permissionState = 'granted';
          testStream.getTracks().forEach(t => t.stop());
        }
      } catch (err: any) {
        console.warn('Teste de transmissão de vídeo falhou:', err);
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          permissionState = 'denied';
        }
      }
    }

    // 5. Verificar GPS da Obra
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      gpsWorking = true;
    }

    setDiagnosticResults({
      mediaSupported,
      permissionState,
      devicesCount,
      devicesList,
      testStreamWorking,
      gpsWorking,
      nativeFallbackWorking
    });
    setIsDiagnosing(false);
  };

  // Inicializar transmissão de vídeo ao vivo da câmera com níveis de fallback
  const startCameraStream = async () => {
    setCameraError(null);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('O seu navegador não possui suporte a vídeo em tempo real no iframe atual. Utilize a Câmera Nativa do Celular.');
        return;
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

      let stream: MediaStream | null = null;
      try {
        // Tentativa 1: facingMode ideal + resolução
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: targetWidth },
            height: { ideal: targetHeight }
          },
          audio: false
        });
      } catch (e1) {
        console.warn('Tentativa 1 com resolução falhou, tentando apenas facingMode:', e1);
        try {
          // Tentativa 2: Apenas facingMode
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false
          });
        } catch (e2) {
          console.warn('Tentativa 2 falhou, tentando vídeo genérico:', e2);
          // Tentativa 3: Qualquer câmera disponível
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      if (stream) {
        setCameraStream(stream);
        if (videoRef.current) {
          const v = videoRef.current;
          v.muted = true;
          v.setAttribute('playsinline', 'true');
          v.setAttribute('webkit-playsinline', 'true');
          v.srcObject = stream;
          v.play().catch(pErr => console.warn('Falha no auto-play do vídeo:', pErr));
        }

        // Aplicar lanterna se disponível
        const track = stream.getVideoTracks()[0];
        if (track && 'applyConstraints' in track) {
          try {
            await (track as any).applyConstraints({
              advanced: [{ torch: flashEnabled }]
            });
          } catch {
            // torch não suportado no dispositivo
          }
        }
      }
    } catch (err: any) {
      console.warn('Erro ao inicializar câmera de vídeo HTML5:', err);
      let msg = 'A transmissão de vídeo ao vivo não pôde ser aberta diretamente neste navegador.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Permissão de câmera negada. Ative a câmera nas permissões do site ou use a Câmera Nativa do Celular.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'Nenhum dispositivo de câmera foi detectado no aparelho.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        msg = 'A câmera já está sendo utilizada por outro aplicativo.';
      }
      setCameraError(msg);
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  // Garantir vinculação do stream de vídeo ao elemento <video> quando este é renderizado (compatível com iOS Safari/WebKit)
  useEffect(() => {
    if (videoRef.current && cameraStream && isCameraOpen) {
      const v = videoRef.current;
      v.muted = true;
      v.setAttribute('playsinline', 'true');
      v.setAttribute('webkit-playsinline', 'true');
      v.srcObject = cameraStream;
      v.onloadedmetadata = () => {
        v.play().catch(pErr => console.warn('Falha no play do vídeo no iOS:', pErr));
      };
      v.play().catch(pErr => console.warn('Falha no auto-play do vídeo:', pErr));
    }
  }, [cameraStream, isCameraOpen]);

  // Monitoramento contínuo de GPS para atualização da Estaca de Projeto mesmo antes de abrir a câmera
  useEffect(() => {
    let watchId: number | null = null;
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsLocating(true);
      fetchUserGps();
      watchId = navigator.geolocation.watchPosition(
        pos => {
          setIsLocating(false);
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          updateNearestStation(pos.coords.latitude, pos.coords.longitude);
        },
        err => {
          setIsLocating(false);
          console.warn('GPS não disponível ou negado:', err);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 }
      );
    }
    return () => {
      if (watchId !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    if (isCameraOpen) {
      startCameraStream();
    } else {
      stopCameraStream();
      setCapturedPhotoUrl(null);
      setCameraError(null);
    }
    return () => {
      stopCameraStream();
    };
  }, [isCameraOpen, cameraQuality, facingMode]);

  // Função para comprimir e redimensionar fotos brutas de câmeras de celular (evita estouro de memória e tela branca)
  const compressAndResizeImage = (fileOrUrl: File | Blob | string, maxDimension = 1024, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      let objectUrlToRevoke: string | null = null;
      let src = '';

      if (typeof fileOrUrl === 'string') {
        src = fileOrUrl;
      } else {
        try {
          objectUrlToRevoke = URL.createObjectURL(fileOrUrl);
          src = objectUrlToRevoke;
        } catch {
          resolve('');
          return;
        }
      }

      const cleanup = () => {
        if (objectUrlToRevoke) {
          try { URL.revokeObjectURL(objectUrlToRevoke); } catch {}
        }
      };

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width || 800;
          let height = img.height || 600;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round(height * (maxDimension / width));
              width = maxDimension;
            } else {
              width = Math.round(width * (maxDimension / height));
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const cleanCanvas = removeBlackBordersFromCanvas(canvas);
            const compressed = cleanCanvas.toDataURL('image/jpeg', quality);
            cleanup();
            resolve(compressed);
          } else {
            cleanup();
            resolve(typeof fileOrUrl === 'string' ? fileOrUrl : '');
          }
        } catch (e) {
          console.error('Erro na compressão de imagem:', e);
          cleanup();
          resolve(typeof fileOrUrl === 'string' ? fileOrUrl : '');
        }
      };
      img.onerror = () => {
        cleanup();
        resolve(typeof fileOrUrl === 'string' ? fileOrUrl : '');
      };
      
      img.src = src;
    });
  };

  const handleTakePhoto = async () => {
    if (capturedPhotoUrl) return;

    const activeContract = contracts.find(c => c.id === selectedContractId) || contracts[0] || { id: 'c1', name: 'Obra Principal' };
    const stationText = photoStation || (nearestStationInfo ? nearestStationInfo.station : 'Estaca N/I');
    const descText = photoDescription.trim() || 'Foto de inspeção em campo';
    const locText = userLocation ? `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}` : '';

    if (videoRef.current && videoRef.current.readyState >= 2) {
      try {
        const video = videoRef.current;
        const origW = video.videoWidth || 1920;
        const origH = video.videoHeight || 1080;
        const maxDim = 1920;
        let w = origW;
        let h = origH;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round(h * (maxDim / w));
            w = maxDim;
          } else {
            w = Math.round(w * (maxDim / h));
            h = maxDim;
          }
        }
        const rawCanvas = document.createElement('canvas');
        rawCanvas.width = w;
        rawCanvas.height = h;
        const ctx = rawCanvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          if (facingMode === 'user') {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, w, h);

          // Remover bordas/faixas pretas caso o stream WebRTC tenha gerado pillarbox
          const cleanCanvas = removeBlackBordersFromCanvas(rawCanvas);
          const rawDataUrl = cleanCanvas.toDataURL('image/jpeg', 0.90);

          if (rawDataUrl && rawDataUrl.length > 100) {
            // Se o usuário está segurando o celular deitado (isLandscape) mas o vídeo gravou em retrato (w < h), 
            // e não forçou rotação manual, assumimos auto-rotação de 90 graus.
            let finalRotation = cameraRotation;
            if (isLandscape && cleanCanvas.width < cleanCanvas.height && cameraRotation === 0) {
               finalRotation = 90;
            }

            const stampedUrl = await stampPhotoWithMetadata(rawDataUrl, {
              contractName: activeContract.name || activeContract.workName || 'Obra Principal',
              station: stationText,
              description: descText,
              locationText: locText,
              dateText: new Date().toLocaleString('pt-BR'),
              rotationDegrees: finalRotation,
              isMirrored: false,
              stampConfig: stampConfig
            });
            setCapturedPhotoUrl(stampedUrl || rawDataUrl);
          } else {
            fileInputRef.current?.click();
          }
        } else {
          fileInputRef.current?.click();
        }
      } catch (err) {
        console.error('Erro ao capturar foto da transmissão:', err);
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileUploadFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await compressAndResizeImage(file, 1920, 0.90);
        if (resized) {
          const activeContract = contracts.find(c => c.id === selectedContractId) || contracts[0] || { id: 'c1', name: 'Obra Principal' };
          const stationText = photoStation || (nearestStationInfo ? nearestStationInfo.station : 'Estaca N/I');
          const descText = photoDescription.trim() || 'Foto de inspeção em campo';
          const locText = userLocation ? `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}` : '';

          const stampedUrl = await stampPhotoWithMetadata(resized, {
            contractName: activeContract.name || activeContract.workName || 'Obra Principal',
            station: stationText,
            description: descText,
            locationText: locText,
            dateText: new Date().toLocaleString('pt-BR'),
            rotationDegrees: cameraRotation,
            stampConfig: stampConfig
          });
          setCapturedPhotoUrl(stampedUrl || resized);
        }
      } catch (err) {
        console.error('Erro ao processar foto da câmera nativa:', err);
      } finally {
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleDownloadPhoto = async (dataUrl: string) => {
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], `synera_cam_${Date.now()}.jpg`, { type: mime });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Foto Synera Cam',
              text: 'Evidência fotográfica capturada via Synera Cam'
            });
            return;
          }
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return;
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `synera_cam_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('Erro ao realizar download:', err);
      const w = window.open('');
      if (w) {
        w.document.write(`<img src="${dataUrl}" style="max-width:100%"/>`);
      }
    }
  };

  const handleSavePhotoRecord = async () => {
    if (!capturedPhotoUrl) return;

    const stationText = photoStation || (nearestStationInfo ? nearestStationInfo.station : 'Estaca N/I');
    const descText = photoDescription.trim() || 'Foto de inspeção em campo';
    const activeContract = contracts.find(c => c.id === selectedContractId) || contracts[0] || { id: 'c1', name: 'Obra Principal' };
    const locText = userLocation ? `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}` : '';

    const finalPhotoUrl = await stampPhotoWithMetadata(capturedPhotoUrl, {
      contractName: activeContract.name || activeContract.workName || 'Obra Principal',
      station: stationText,
      description: descText,
      locationText: locText,
      dateText: new Date().toLocaleString('pt-BR'),
      rotationDegrees: cameraRotation,
      stampConfig: stampConfig
    });

    const newReport: FieldProductionReport = {
      id: `photo-${Date.now()}`,
      contractId: activeContract.id,
      sector: 'project_admin',
      date: new Date().toISOString().slice(0, 10),
      location: stationText,
      description: descText,
      photoUrl: finalPhotoUrl,
      photo: finalPhotoUrl,
      reportedBy: currentUser?.name || currentUser?.username || 'Apontador',
      reportedByEmail: currentUser?.email || 'apontador@synera.app',
      createdByName: currentUser?.name || currentUser?.username || 'Apontador',
      synced: false,
      timestamp: new Date().toISOString()
    };

    try {
      if (onSaveFieldReport) {
        onSaveFieldReport(newReport);
      }
      saveFieldReportToIDB(newReport);
    } catch (e) {
      console.warn('Erro ao disparar onSaveFieldReport:', e);
    }

    try {
      const stored = localStorage.getItem('sigo_field_reports');
      const parsed: FieldProductionReport[] = stored ? JSON.parse(stored) : [];
      const updatedLocal = [newReport, ...parsed.filter(r => r.id !== newReport.id)];
      safeSetLocalStorage('sigo_field_reports', updatedLocal);
      if (activeContract && (activeContract as any).companyId) {
        safeSetLocalStorage(`${(activeContract as any).companyId}_sigo_field_reports`, updatedLocal);
      }
    } catch (err) {
      console.warn('Erro ao salvar no localStorage local:', err);
    }

    // Fotos tiradas com a câmera ficam salvas apenas na galeria local do dispositivo.
    // Elas NÃO são enviadas como registros de produção para o sistema/servidor.

    setCapturedPhotoUrl(null);
    setPhotoDescription('');
    // setIsCameraOpen(false); // Mantém a câmera aberta como solicitado

    alert(`📸 Foto de campo registrada e salva na galeria local do dispositivo!\nEstaca: ${stationText}\nDescrição: ${descText}`);
  };

  // ----------------------------------------------------
  // FUNÇÕES DA GALERIA DE FOTOS (Visualizar, Editar, Excluir)
  // ----------------------------------------------------
  const handleDeleteReport = (reportId: string) => {
    const targetReport = (fieldReports || []).find(r => r.id === reportId);
    let confirmMsg = 'Tem certeza de que deseja excluir este registro de campo do celular?';
    if (targetReport) {
      const isSynced = targetReport.status === 'synced' || targetReport.status === 'approved' || Boolean(targetReport.syncedAt);
      if (isSynced) {
        confirmMsg = 'Atenção: Este registro já foi sincronizado com o servidor. Deseja realmente excluí-lo? Ele será removido do celular e permanentemente excluído do banco de dados do servidor.';
      }
    }

    if (!window.confirm(confirmMsg)) return;

    if (onDeleteFieldReport) {
      onDeleteFieldReport(reportId);
    } else {
      try {
        const stored = localStorage.getItem('sigo_field_reports');
        if (stored) {
          const parsed: FieldProductionReport[] = JSON.parse(stored);
          const filtered = parsed.filter(r => r.id !== reportId);
          safeSetLocalStorage('sigo_field_reports', filtered);
        }
      } catch (e) {
        console.error('Erro ao excluir registro local:', e);
      }
    }

    setSelectedGalleryPhotos(prev => {
      const rep = (fieldReports || []).find(r => r.id === reportId);
      return rep ? prev.filter(url => url !== rep.photoUrl) : prev;
    });

    if (previewingReport?.id === reportId) setPreviewingReport(null);
    if (editingPhotoReport?.id === reportId) setEditingPhotoReport(null);
  };

  const handleBatchDeletePhotos = () => {
    if (selectedGalleryPhotos.length === 0) return;
    const syncedPhotos = (fieldReports || []).filter(r => r.photoUrl && selectedGalleryPhotos.includes(r.photoUrl) && (r.status === 'synced' || r.status === 'approved' || Boolean(r.syncedAt)));
    if (syncedPhotos.length > 0) {
      alert('Fotos já sincronizadas com o servidor não podem ser excluídas.');
      return;
    }

    if (!window.confirm(`Tem certeza de que deseja excluir ${selectedGalleryPhotos.length} foto(s) selecionada(s)?`)) return;

    const reportsToDelete = (fieldReports || []).filter(r => r.photoUrl && selectedGalleryPhotos.includes(r.photoUrl));
    reportsToDelete.forEach(rep => {
      if (onDeleteFieldReport) {
        onDeleteFieldReport(rep.id);
      }
    });

    setSelectedGalleryPhotos([]);
  };

  const handleShareMultiplePhotos = async (urls: string[]) => {
    if (urls.length === 0) return;
    
    try {
      const files = await Promise.all(
        urls.map(async (url, index) => {
          const res = await fetch(url);
          const blob = await res.blob();
          return new File([blob], `synera_cam_foto_${index + 1}.jpg`, { type: blob.type });
        })
      );

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          title: 'Fotos Synera Cam',
          files
        });
      } else {
        alert("Seu navegador não suporta o compartilhamento de arquivos múltiplos.");
      }
    } catch (error) {
      console.error("Erro ao compartilhar", error);
    }
  };

  const [fullScreenPhotoIndex, setFullScreenPhotoIndex] = useState<number | null>(null);

  const handleOpenEditModal = (report: FieldProductionReport) => {
    const isSynced = report.status === 'synced' || report.status === 'approved' || Boolean(report.syncedAt);
    if (isSynced) {
      alert('Este registro já foi sincronizado com o servidor e não pode ser editado.');
      return;
    }

    setEditingPhotoReport(report);
    setEditStation(report.location || report.trecho || '');
    setEditDescription(report.description || report.notes || '');
  };

  const handleSavePhotoEdit = async () => {
    if (!editingPhotoReport) return;

    const activeContract = contracts.find(c => c.id === editingPhotoReport.contractId) || contracts[0];
    let updatedPhotoUrl = editingPhotoReport.photoUrl;

    if (editingPhotoReport.photoUrl) {
      updatedPhotoUrl = await stampPhotoWithMetadata(editingPhotoReport.photoUrl, {
        contractName: activeContract?.name || activeContract?.workName || 'Obra Principal',
        station: editStation || 'Estaca N/I',
        description: editDescription || 'Sem descrição',
        dateText: editingPhotoReport.timestamp ? new Date(editingPhotoReport.timestamp).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
        stampConfig: stampConfig
      });
    }

    const updatedReport: FieldProductionReport = {
      ...editingPhotoReport,
      location: editStation,
      description: editDescription,
      photoUrl: updatedPhotoUrl
    };

    if (onUpdateFieldReport) {
      onUpdateFieldReport(updatedReport);
    }

    if (previewingReport?.id === updatedReport.id) {
      setPreviewingReport(updatedReport);
    }

    setEditingPhotoReport(null);
    alert('Foto e carimbo técnico atualizados com sucesso!');
  };

  // Offline Pending Queue State (Registros de Apontamento)
  const [offlineQueue, setOfflineQueue] = useState<OfflinePendingItem[]>(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const parsed: OfflinePendingItem[] = saved ? JSON.parse(saved) : [];
      // Garantir que fotos de câmera não estejam na fila do sistema (apenas apontamentos de produção/equipamento/rh/materiais/diário)
      return parsed.filter(item => !item.id.startsWith('photo-'));
    } catch {
      return [];
    }
  });

  // PWA Prompt event state
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(SYNC_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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
  const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);

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
  const [prodInfoType, setProdInfoType] = useState<'qty' | 'trips' | 'dimensions'>('qty');
  const [prodQty, setProdQty] = useState<string>('');
  const [prodTripsQty, setProdTripsQty] = useState<string>('');
  const [prodLengthM, setProdLengthM] = useState<string>('');
  const [prodWidthM, setProdWidthM] = useState<string>('');
  const [prodHeightM, setProdHeightM] = useState<string>('');
  const [prodDate, setProdDate] = useState<string>(() => getLocalTodayDateStr());
  const [prodStartStation, setProdStartStation] = useState<string>('');
  const [prodEndStation, setProdEndStation] = useState<string>('');
  const [prodTrecho, setProdTrecho] = useState<string>('');
  const [prodNotes, setProdNotes] = useState<string>('');
  const [prodPhoto, setProdPhoto] = useState<string>('');

  // Auto-calculate quantity based on selected information type
  useEffect(() => {
    if (prodInfoType === 'dimensions') {
      const l = parseFloat(prodLengthM) || 0;
      const w = parseFloat(prodWidthM) || 0;
      const h = parseFloat(prodHeightM) || 0;
      if (l > 0 && w > 0 && h > 0) {
        const vol = l * w * h;
        setProdQty(vol.toFixed(2));
      }
    } else if (prodInfoType === 'trips') {
      if (prodTripsQty) {
        const trips = parseInt(prodTripsQty, 10) || 0;
        setProdQty(trips.toString());
      }
    }
  }, [prodInfoType, prodLengthM, prodWidthM, prodHeightM, prodTripsQty]);

  // RH Mobile States (Sub-view, Search, Records)
  const [mobileRhSubView, setMobileRhSubView] = useState<'resumo' | 'colaboradores'>('resumo');
  const [rhSearchTerm, setRhSearchTerm] = useState('');
  const [rhTeamFilter, setRhTeamFilter] = useState('ALL');
  const [rhAttendanceDate, setRhAttendanceDate] = useState(() => getLocalTodayDateStr());

  // RH Transfer Support States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferredEmpIds, setTransferredEmpIds] = useState<string[]>([]);
  const [transferSearchTerm, setTransferSearchTerm] = useState('');

  // RH Employee Records State: employeeId -> { status, entryTime, exitTime, transferredToTeam, notes }
  const [rhEmployeeRecords, setRhEmployeeRecords] = useState<Record<string, {
    status: 'presente' | 'falta' | 'folga';
    entryTime: string;
    exitTime: string;
    transferredToTeam?: string;
    notes?: string;
  }>>(() => {
    try {
      const todayStr = getLocalTodayDateStr();
      const saved = localStorage.getItem(`synera_mobile_rh_records_${todayStr}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load RH Parameters for mobile responsibles definition
  const rhParams = useMemo(() => {
    if (Array.isArray(systemConfig) && systemConfig.length > 0) {
      const item = systemConfig.find(c => c.configKey === 'rh_parameters_config');
      if (item && item.configValue) {
        return item.configValue;
      }
    }
    try {
      const saved = localStorage.getItem("rh_parameters_config");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }, [systemConfig]);

  // Determine current user's linked team (or null for master/admin)
  const currentUserTeam = useMemo(() => {
    if (currentUser?.role === 'master' || currentUser?.role === 'admin') {
      return null; // Master/Admin tem acesso a todas as equipes
    }
    const responsibles = rhParams.mobileResponsibles || [];
    const activeEmps = (employees || []).filter(e => e && (!e.dismissalDate || !e.dismissalDate.trim()));
    
    // Find matched employee for current user
    const matchedEmp = activeEmps.find(e => 
      (currentUser?.id && e.id === currentUser.id) ||
      (currentUser?.name && e.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
      (currentUser?.email && e.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
      (currentUser?.username && e.cpf?.replace(/\D/g, '') === currentUser.username.replace(/\D/g, ''))
    );

    const userResponsibles = responsibles.filter((r: any) => {
      if (r.employeeId === currentUser?.id) return true;
      if (matchedEmp && r.employeeId === matchedEmp.id) return true;
      if (currentUser?.name && r.employeeName?.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) return true;
      if (currentUser?.email && r.employeeName?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) return true;
      return false;
    });

    if (userResponsibles.some((r: any) => r.scope === 'ALL')) return null;

    const assignedTeam = userResponsibles.find((r: any) => r.scope === 'TEAM' && r.teamName)?.teamName;
    if (assignedTeam) return assignedTeam;

    if (matchedEmp && matchedEmp.team) return matchedEmp.team;

    // Se possui responsáveis cadastrados no RH mas este usuário não tem equipe designada:
    return '__NO_TEAM_DESIGNATED__';
  }, [currentUser, rhParams, employees]);

  const isUserEnabledInMobileResponsibles = useMemo(() => {
    if (currentUser?.role === 'master' || currentUser?.role === 'admin') return true;
    const responsibles = rhParams.mobileResponsibles || [];
    if (responsibles.length === 0) return true;

    const activeEmps = (employees || []).filter(e => e && (!e.dismissalDate || !e.dismissalDate.trim()));
    const matchedEmp = activeEmps.find(e => 
      (currentUser?.id && e.id === currentUser.id) ||
      (currentUser?.name && e.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
      (currentUser?.email && e.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
      (currentUser?.username && e.cpf?.replace(/\D/g, '') === currentUser.username.replace(/\D/g, ''))
    );

    return responsibles.some((r: any) => {
      if (r.employeeId === currentUser?.id) return true;
      if (matchedEmp && r.employeeId === matchedEmp.id) return true;
      if (currentUser?.name && r.employeeName?.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) return true;
      if (currentUser?.email && r.employeeName?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) return true;
      return false;
    });
  }, [currentUser, rhParams, employees]);

  // Allowed employees according to RH team linking + transfers & filtering out dismissed employees
  const allowedRhEmployees = useMemo(() => {
    if (!isUserEnabledInMobileResponsibles) {
      return [];
    }

    if (currentUserTeam === '__NO_TEAM_DESIGNATED__') {
      return []; // Usuário não foi designado a nenhuma equipe pelo RH do Sistema
    }

    const rawEmps = (employees || []).filter(e => {
      if (!e) return false;
      if (e.dismissalDate && e.dismissalDate.trim() !== '') return false;
      const st = (e.status || 'active').toLowerCase().trim();
      if (st === 'dismissed' || st === 'demitido' || st === 'inativo' || st === 'inativo (demitido)' || st === 'desligado') {
        return false;
      }
      return true;
    });

    const map = new Map<string, typeof rawEmps[0]>();
    rawEmps.forEach(e => {
      if (e && e.id && !map.has(e.id)) {
        map.set(e.id, e);
      }
    });
    const activeEmps = Array.from(map.values());

    if (currentUserTeam === null) {
      return activeEmps;
    }

    const normUserTeam = currentUserTeam.toLowerCase().trim();

    return activeEmps.filter(emp => {
      const isOriginalTeam = emp.team && emp.team.toLowerCase().trim() === normUserTeam;
      const isTransferredHere = transferredEmpIds.includes(emp.id) || 
        (rhEmployeeRecords[emp.id]?.transferredToTeam && rhEmployeeRecords[emp.id].transferredToTeam?.toLowerCase().trim() === normUserTeam);

      return isOriginalTeam || isTransferredHere;
    });
  }, [employees, currentUserTeam, transferredEmpIds, rhEmployeeRecords, isUserEnabledInMobileResponsibles]);

  // Other team employees for transfer selection
  const otherTeamEmployees = useMemo(() => {
    if (!currentUserTeam) return [];
    const normUserTeam = currentUserTeam.toLowerCase().trim();

    const activeEmps = (employees || []).filter(e => {
      if (!e) return false;
      if (e.dismissalDate && e.dismissalDate.trim() !== '') return false;
      const st = (e.status || 'active').toLowerCase().trim();
      if (st === 'dismissed' || st === 'demitido' || st === 'inativo' || st === 'desligado') return false;
      return true;
    });

    return activeEmps.filter(emp => {
      const isOriginalTeam = emp.team && emp.team.toLowerCase().trim() === normUserTeam;
      if (isOriginalTeam) return false;

      const isTransferredHere = transferredEmpIds.includes(emp.id) || 
        (rhEmployeeRecords[emp.id]?.transferredToTeam && rhEmployeeRecords[emp.id].transferredToTeam?.toLowerCase().trim() === normUserTeam);

      return !isTransferredHere;
    });
  }, [employees, currentUserTeam, transferredEmpIds, rhEmployeeRecords]);

  // Permission helper for attendance marking
  const canMarkAttendance = (emp: typeof allowedRhEmployees[0]) => {
    if (!currentUserTeam) return true; // master/admin
    const normUserTeam = currentUserTeam.toLowerCase().trim();
    const isOriginalTeam = emp.team && emp.team.toLowerCase().trim() === normUserTeam;
    const isTransferredHere = transferredEmpIds.includes(emp.id) || 
      (rhEmployeeRecords[emp.id]?.transferredToTeam && rhEmployeeRecords[emp.id].transferredToTeam?.toLowerCase().trim() === normUserTeam);

    return isOriginalTeam || isTransferredHere;
  };

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

  // Cache de dados no localStorage para uso offline
  useEffect(() => {
    if (isOnline) {
      try {
        const cachePayload = {
          contracts: contracts.map(c => ({ id: c.id, name: c.name, code: c.code })),
          services: services.map(s => ({ id: s.id, contractId: s.contractId, name: s.name, unit: s.unit })),
          equipments: equipments.map(e => ({ id: e.id, code: e.code, name: e.name, contractId: e.contractId, status: e.status })),
          employees: (employees || []).map(emp => ({ id: emp.id, name: emp.name, registrationNumber: emp.registrationNumber, role: emp.role, team: emp.team, status: emp.status })),
          projectAlignments: (projectAlignments || []).map(pa => ({ id: pa.id, name: pa.name, contractId: pa.contractId, stations: pa.stations })),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
      } catch (err) {
        console.warn('Erro ao atualizar cache de dados no Synera Mobile:', err);
      }
    }
  }, [isOnline, contracts, services, equipments, employees, projectAlignments]);

  // SyncDownloadedProjects list whenever contracts/projectAlignments update
  useEffect(() => {
    if (contracts && contracts.length > 0) {
      try {
        const existing = JSON.parse(localStorage.getItem('synera_cam_downloaded_projects') || '[]');
        let updated = false;
        const newList = Array.isArray(existing) ? [...existing] : [];

        contracts.forEach(c => {
          if (!newList.some((p: any) => p.contractId === c.id)) {
            const alignmentsCount = (projectAlignments || []).filter(a => !a.contractId || a.contractId === c.id).length;
            newList.push({
              contractId: c.id,
              contractName: c.name || (c as any).workName || 'Obra Principal',
              contractNumber: c.contractNumber,
              client: c.client,
              workName: (c as any).workName || c.name,
              downloadedAt: new Date().toISOString(),
              alignmentCount: alignmentsCount,
              status: 'ready'
            });
            updated = true;
          }
        });

        if (updated) {
          localStorage.setItem('synera_cam_downloaded_projects', JSON.stringify(newList));
          setCamDownloadedProjects(newList);
        }
      } catch {}
    }
  }, [contracts, projectAlignments]);

  // Handler to download/update project offline data on iOS and Android
  const handleDownloadProjectForCam = async (targetContractId: string) => {
    setIsDownloadingProject(true);
    try {
      const targetContract = contracts.find(c => c.id === targetContractId) || activeContract;
      if (!targetContract) {
        alert('Nenhum projeto encontrado para download.');
        setIsDownloadingProject(false);
        return;
      }

      const alignmentsToSave = (projectAlignments || []).filter(a => !a.contractId || a.contractId === targetContract.id);
      
      try {
        localStorage.setItem('sigo_project_alignments', JSON.stringify(alignmentsToSave));
      } catch (e) {
        console.warn('Erro ao salvar alinhamentos no localStorage:', e);
      }

      const newEntry = {
        contractId: targetContract.id,
        contractName: targetContract.name || (targetContract as any).workName || 'Obra Principal',
        contractNumber: targetContract.contractNumber,
        client: targetContract.client,
        workName: (targetContract as any).workName || targetContract.name,
        downloadedAt: new Date().toISOString(),
        alignmentCount: alignmentsToSave.length,
        status: 'ready' as const
      };

      const existing = JSON.parse(localStorage.getItem('synera_cam_downloaded_projects') || '[]');
      const filteredExisting = Array.isArray(existing) ? existing.filter((p: any) => p.contractId !== targetContract.id) : [];
      const updatedList = [newEntry, ...filteredExisting];

      try {
        localStorage.setItem('synera_cam_downloaded_projects', JSON.stringify(updatedList));
      } catch (e) {}

      setCamDownloadedProjects(updatedList);
      setSelectedContract(targetContract.id);

      if (onSyncRequest) {
        await onSyncRequest();
      }

      alert(`Projeto "${targetContract.name || 'Obra'}" baixado e ativado no dispositivo!\n${alignmentsToSave.length} estaca(s) salvas para uso off-line no iOS/Android.`);
    } catch (err) {
      console.error('[Cam Download Error]:', err);
      alert('Erro ao baixar dados do projeto. Verifique a conexão e tente novamente.');
    } finally {
      setIsDownloadingProject(false);
    }
  };

  // Persist offline queue
  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
    } catch (err) {
      console.warn('Erro ao salvar fila offline:', err);
    }
  }, [offlineQueue]);
  useEffect(() => {
    try {
      localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(syncHistory.slice(0, 50)));
    } catch (err) {
      console.warn('Erro ao salvar histórico de sync:', err);
    }
  }, [syncHistory]);

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
    // Collect all controls created in Sala Técnica for active contract (or global controls without contractId)
    const contractProds = (serviceProductions || []).filter(
      p => !p.contractId || p.contractId === activeContract.id
    );

    const controlledKeys = new Set<string>();
    contractProds.forEach(p => {
      if (p.serviceId) {
        controlledKeys.add(p.serviceId.toString().trim().toLowerCase());
      }
    });

    const resultList: any[] = [];
    const seenIds = new Set<string>();

    const tryAddService = (s: { id: string; code?: string; name?: string; unit?: string; contractId?: string }) => {
      if (!s || !s.id) return;
      const keyId = s.id.toString().trim().toLowerCase();
      const keyCode = (s.code || '').toString().trim().toLowerCase();
      const keyName = (s.name || '').toString().trim().toLowerCase();

      const isControlled =
        controlledKeys.has(keyId) ||
        (keyCode && controlledKeys.has(keyCode)) ||
        (keyName && controlledKeys.has(keyName));

      if (controlledKeys.size === 0 || isControlled) {
        if (!seenIds.has(keyId)) {
          seenIds.add(keyId);
          resultList.push(s);
        }
      }
    };

    // A) Check master services array (compositions)
    (services || []).forEach(s => tryAddService(s));

    // B) Check services directly attached to contract (activeContract.services)
    if (activeContract && Array.isArray((activeContract as any).services)) {
      (activeContract as any).services.forEach((cs: any) => {
        const id = cs.serviceId || cs.code || cs.name;
        if (id) {
          tryAddService({
            id,
            code: cs.code || 'SERV',
            name: cs.name || cs.serviceId || 'Serviço da Obra',
            unit: 'un',
            contractId: activeContract.id
          });
        }
      });
    }

    // C) Check services inside budget groups (activeContract.groups)
    if (activeContract && Array.isArray((activeContract as any).groups)) {
      (activeContract as any).groups.forEach((g: any) => {
        if (Array.isArray(g.services)) {
          g.services.forEach((cs: any) => {
            const id = cs.serviceId || cs.code || cs.name;
            if (id) {
              tryAddService({
                id,
                code: cs.code || 'SERV',
                name: cs.name || cs.serviceId || 'Serviço da Obra',
                unit: 'un',
                contractId: activeContract.id
              });
            }
          });
        }
      });
    }

    // D) Guarantee: For ANY control in serviceProductions that wasn't found in services/contract, synthesize it so it's ALWAYS selectable!
    contractProds.forEach(p => {
      if (p.serviceId) {
        const key = p.serviceId.toString().trim().toLowerCase();
        if (!seenIds.has(key)) {
          const match = (services || []).find(
            s =>
              s.id?.toString().trim().toLowerCase() === key ||
              s.code?.toString().trim().toLowerCase() === key ||
              s.name?.toString().trim().toLowerCase() === key
          );
          seenIds.add(key);
          resultList.push({
            id: p.serviceId,
            code: match?.code || p.serviceId,
            name: p.customTitle || match?.name || p.serviceId || 'Serviço Controlado',
            unit: match?.unit || 'un',
            contractId: activeContract.id
          });
        }
      }
    });

    // Fallback: If no controls match or result is empty, return services belonging to active contract
    const baseList = resultList.length > 0
      ? resultList
      : (services || []).filter(s => !s.contractId || s.contractId === activeContract.id);

    // Map baseList to ensure customTitle from Sala Técnica / Controles is used as the control title
    return baseList.map(s => {
      const sKeyId = (s.id || '').toString().trim().toLowerCase();
      const sKeyCode = (s.code || '').toString().trim().toLowerCase();
      const sKeyName = (s.name || '').toString().trim().toLowerCase();

      const matchingProd = contractProds.find(p => {
        if (!p.serviceId) return false;
        const pKey = p.serviceId.toString().trim().toLowerCase();
        return pKey === sKeyId || pKey === sKeyCode || pKey === sKeyName;
      });

      if (matchingProd && matchingProd.customTitle) {
        return {
          ...s,
          name: matchingProd.customTitle
        };
      }
      return s;
    });
  }, [services, serviceProductions, activeContract]);

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
    if (isCamOnly) return ALL_SECTORS.filter(s => s.id === "camera" || s.id === "galeria");
    if (!currentUser?.mobileSectors || currentUser.mobileSectors.length === 0 || currentUser.role === 'master' || currentUser.role === 'admin') {
      return ALL_SECTORS;
    }
    return ALL_SECTORS.filter(s => currentUser.mobileSectors?.includes(s.id));
  }, [currentUser, isCamOnly]);

  // Process sync offline queue
  const handleProcessSync = async () => {
    // Before syncing, ask the user if they are sure they want to synchronize
    const confirmSync = window.confirm('Deseja realmente sincronizar os dados com o servidor agora? Esta ação enviará todos os seus apontamentos de campo locais e atualizará os dados do dispositivo.');
    if (!confirmSync) {
      return;
    }

    setIsSyncing(true);

    if (isCamOnly) {
      try {
        const nowIso = new Date().toISOString();
        if (onSyncRequest) {
          await onSyncRequest();
        }
        setOfflineQueue([]);
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        setSyncSuccessMsg('Synera Cam sincronizado! Fotos enviadas e dados mantidos no celular.');
        setTimeout(() => setSyncSuccessMsg(null), 3500);
      } catch (err) {
        console.warn('Erro ao sincronizar Synera Cam:', err);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const todayStr = nowIso.slice(0, 7);

      const numServices = services.filter(s => s.contractId === activeContract?.id || !s.contractId).length;
      const numEmployees = (employees || []).length;
      const numEquipments = (equipments || []).length;

      const downloadHistory = [
        {
          id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-1`,
          timestamp: nowIso,
          action: 'download' as const,
          details: `Baixado: Projeto ${activeContract?.name || 'Geral'}`
        },
        {
          id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-2`,
          timestamp: nowIso,
          action: 'download' as const,
          details: `Lista de Funcionários ${numEmployees} colaboradores`
        },
        {
          id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-3`,
          timestamp: nowIso,
          action: 'download' as const,
          details: `Lista de Equipamentos ${numEquipments}`
        },
        {
          id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-4`,
          timestamp: nowIso,
          action: 'download' as const,
          details: `Lista de Serviços atualizados (${numServices})`
        },
        {
          id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-5`,
          timestamp: nowIso,
          action: 'download' as const,
          details: `Lista de materiais atualizados`
        }
      ];
      setSyncHistory(prev => [...downloadHistory, ...prev].slice(0, 50));

      for (const item of offlineQueue) {
        if (item.type === 'production') {
          const { serviceId, qty, trecho, notes, month, productionDate } = item.data;
          const reportDate = productionDate || new Date().toISOString().slice(0, 10);
          const targetMonth = month || reportDate.slice(0, 7);
          const dayNum = parseInt(reportDate.slice(8, 10), 10);
          
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
                notes: `Data Prod: ${reportDate}. Trecho/Local: ${trecho || 'Campo'}. ${notes || ''}`,
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
              type: 'hr_headcount',
              action: 'APONTAMENTO DE MÃO DE OBRA',
              description: `Registro de efetivo de campo: ${item.data.present} presentes, ${item.data.absent} faltas`,
              referenceCode: `RH-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                notes: `Líder: ${item.data.leader}. Horas Extras: ${item.data.overtime}h. ${item.data.notes}`,
                records: item.data.records
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

      // Mark local pending reports as synced
      let currentLocalReports: FieldProductionReport[] = [];
      try {
        currentLocalReports = JSON.parse(localStorage.getItem('sigo_field_reports') || '[]');
      } catch (e) {}

      const allReportsToMark = fieldReports.length > 0 ? fieldReports : currentLocalReports;
      const updatedFieldReports = allReportsToMark.map(r => {
        if (r.status === 'pending' || !r.syncedAt || !r.synced) {
          const syncedRep: FieldProductionReport = {
            ...r,
            status: 'synced' as const,
            syncedAt: nowIso,
            synced: true
          };
          if (onUpdateFieldReport) {
            onUpdateFieldReport(syncedRep);
          }
          return syncedRep;
        }
        return r;
      });

      try {
        localStorage.setItem('sigo_field_reports', JSON.stringify(updatedFieldReports));
        saveMultipleFieldReportsToIDB(updatedFieldReports);
      } catch (e) {}

      const newHistoryItems = offlineQueue.map(item => ({
        id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: nowIso,
        action: 'upload' as const,
        details: `Enviado [${item.type === 'production' ? 'Produção' : item.type === 'equipment' ? 'Equipamento' : item.type === 'headcount' ? 'RH' : item.type === 'materials' ? 'Material' : 'Diário'}]: ${item.type === 'production' ? item.data.qty + ' ' + item.data.unit + ' de ' + (item.data.serviceName || 'Serviço') : item.type === 'equipment' ? item.data.equipmentName + ' (' + item.data.horometer + 'h)' : item.type === 'headcount' ? item.data.present + ' presentes' : item.type === 'materials' ? item.data.qty + ' ' + item.data.unit + ' de ' + item.data.materialName : 'Relatório Diário'}`
      }));
      setSyncHistory(prev => [...newHistoryItems, ...prev].slice(0, 50));
      setOfflineQueue([]);
      localStorage.removeItem(OFFLINE_QUEUE_KEY);

      // Trigger cloud upload
      if (onSyncRequest) {
        await onSyncRequest();
      }

      setSyncSuccessMsg('Sincronização concluída! Dados transmitidos com sucesso para a Sala Técnica.');
      setTimeout(() => setSyncSuccessMsg(null), 3500);
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
    const matchedControl = contractServices.find(cs => cs.id === prodServiceId || cs.code === prodServiceId);
    const controlTitle = matchedControl?.name || serviceObj?.name || 'Serviço';

    const reportDate = prodDate || new Date().toISOString().slice(0, 10);

    let typeDetailNote = '';
    if (prodInfoType === 'trips') {
      typeDetailNote = `[Tipo: Nº de Viagens (${prodTripsQty || '1'} viagem(ns))]`;
    } else if (prodInfoType === 'dimensions') {
      typeDetailNote = `[Tipo: Dimensões (${prodLengthM || '0'}m x ${prodWidthM || '0'}m x ${prodHeightM || '0'}m)]`;
    } else {
      typeDetailNote = `[Tipo: Qtd de Serviço]`;
    }

    const fullNotes = [typeDetailNote, prodNotes].filter(Boolean).join(' - ');

    const combinedTrecho = [
      prodStartStation ? `Est. Inicial: ${prodStartStation}` : '',
      prodEndStation ? `Est. Final: ${prodEndStation}` : '',
      prodTrecho
    ].filter(Boolean).join(' | ');

    const newFieldReport: FieldProductionReport = {
      id: `f-rep-${Date.now()}`,
      companyId: (activeContract as any).companyId || currentUser?.companyId || '',
      contractId: activeContract.id,
      contractName: activeContract.name,
      serviceId: prodServiceId,
      serviceName: controlTitle,
      unit: serviceObj?.unit || 'un',
      qty: parsedQty,
      infoType: prodInfoType,
      tripsQty: prodTripsQty ? parseInt(prodTripsQty, 10) : undefined,
      lengthM: prodLengthM ? parseFloat(prodLengthM) : undefined,
      widthM: prodWidthM ? parseFloat(prodWidthM) : undefined,
      heightM: prodHeightM ? parseFloat(prodHeightM) : undefined,
      productionDate: reportDate,
      syncedAt: undefined,
      createdAt: new Date().toISOString(),
      startStation: prodStartStation,
      endStation: prodEndStation,
      trecho: combinedTrecho || prodTrecho,
      notes: fullNotes,
      photo: prodPhoto,
      photoUrl: prodPhoto,
      reportedBy: currentUser?.name || 'Apontador',
      reportedByEmail: currentUser?.email || 'apontador@synera.app',
      status: 'pending'
    };

    if (onSaveFieldReport) {
      onSaveFieldReport(newFieldReport);
    }
    saveFieldReportToIDB(newFieldReport);

    try {
      const currentLocal = JSON.parse(localStorage.getItem('sigo_field_reports') || '[]');
      const updatedLocal = [newFieldReport, ...currentLocal.filter((r: any) => r.id !== newFieldReport.id)];
      safeSetLocalStorage('sigo_field_reports', updatedLocal);
      if (activeContract && (activeContract as any).companyId) {
        safeSetLocalStorage(`${(activeContract as any).companyId}_sigo_field_reports`, updatedLocal);
      }
    } catch (e) {
      console.warn('Erro ao salvar no localStorage local:', e);
    }

    const newQueueItem: OfflinePendingItem = {
      id: newFieldReport.id,
      type: 'production',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        serviceId: prodServiceId,
        serviceName: controlTitle,
        qty: parsedQty,
        infoType: prodInfoType,
        tripsQty: prodTripsQty ? parseInt(prodTripsQty, 10) : undefined,
        lengthM: prodLengthM ? parseFloat(prodLengthM) : undefined,
        widthM: prodWidthM ? parseFloat(prodWidthM) : undefined,
        heightM: prodHeightM ? parseFloat(prodHeightM) : undefined,
        unit: serviceObj?.unit || 'un',
        productionDate: reportDate,
        syncedAt: undefined,
        startStation: prodStartStation,
        endStation: prodEndStation,
        trecho: combinedTrecho || prodTrecho,
        notes: fullNotes,
        photo: prodPhoto
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setProdQty('');
    setProdInfoType('qty');
    setProdTripsQty('');
    setProdLengthM('');
    setProdWidthM('');
    setProdHeightM('');
    setProdStartStation('');
    setProdEndStation('');
    setProdTrecho('');
    setProdNotes('');
    setProdPhoto('');

    setSyncSuccessMsg('Apontamento de Produção salvo no dispositivo! Clique em "Sincronizar" para enviar.');
    setTimeout(() => setSyncSuccessMsg(null), 4000);
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
        notes: teamNotes,
        records: rhEmployeeRecords
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setTeamPresent('');
    setTeamAbsent('0');
    setTeamOvertime('0');
    setTeamNotes('');

    alert('✅ Registro de Efetivo salvo na fila do dispositivo!\n\nClique no botão "Sincronizar" quando desejar enviar para o servidor.');
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

    alert('✅ Movimentação de Material salva na fila do dispositivo!\n\nClique no botão "Sincronizar" quando desejar enviar para o servidor.');
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

    alert('✅ Diário de Ocorrências salvo na fila do dispositivo!\n\nClique no botão "Sincronizar" quando desejar enviar para o servidor.');
  };

  return (
    <div className="w-full max-w-md landscape:max-w-5xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto min-h-screen pb-24 bg-slate-900 text-slate-100 font-sans shadow-2xl overflow-hidden relative border-x border-slate-800 transition-all">
      
      {/* ---------------------------------------------------- */}
      {/* HEADER PRINCIPAL FIXO SYNERA MOBILE */}
      {/* ---------------------------------------------------- */}
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 p-4 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          
          {/* Official System Logo Emblem */}
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${isCamOnly ? 'bg-purple-600 shadow-purple-600/30' : 'bg-blue-600 shadow-blue-600/30'}`}>
              {isCamOnly ? <Camera className="w-6 h-6 text-white" /> : <LayoutDashboard className="w-6 h-6 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-white">SYNERA</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${isCamOnly ? 'bg-purple-500 text-white' : 'bg-emerald-500 text-slate-950'} uppercase tracking-widest shadow-sm`}>
                  {isCamOnly ? 'CAM' : 'MOBILE'}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400">
                {isCamOnly ? 'Câmera & GPS do Projeto PWA' : 'Apontador de Campo PWA'}
              </p>
            </div>
          </div>

          {/* Connection Status Badge & Seleção Superior de Contrato/Obra */}
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

            {/* Seleção Superior de Obra/Contrato */}
            <div className="flex items-center gap-1 mt-1 text-right">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {contracts && contracts.length > 0 ? (
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="bg-slate-950 text-emerald-300 text-[11px] font-extrabold py-0.5 px-2 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none cursor-pointer max-w-[175px] truncate shadow-inner"
                  title="Selecionar Obra / Contrato Ativo no Menu Superior"
                >
                  {contracts.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white font-bold">
                      {c.name || c.workName || c.client || `Contrato #${c.id}`}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[10px] font-black text-slate-200 truncate max-w-[150px]">
                  {activeContract.name || activeContract.workName || activeContract.client || 'Obra Principal'}
                </span>
              )}
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

            {/* CARD DESTACADO DA ESTACA DE PROJETO ATUAL (SYNERA CAM - TELA INICIAL) */}
            {isCamOnly && (
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950/90 to-slate-950 border-2 border-emerald-500/80 rounded-3xl p-5 shadow-2xl space-y-3 ring-1 ring-emerald-500/30">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Obra Conectada:</span>
                  </div>
                  {contracts && contracts.length > 1 ? (
                    <select
                      value={selectedContractId}
                      onChange={(e) => setSelectedContract(e.target.value)}
                      className="bg-slate-900 text-emerald-300 font-extrabold text-xs px-2.5 py-1 rounded-xl border border-emerald-500/40 focus:outline-none focus:border-emerald-400"
                    >
                      {contracts.map(c => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white font-bold">
                          {c.name || c.workName || c.client || `Obra #${c.id}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-black text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                      {activeContract.name || activeContract.workName || activeContract.client || 'Obra Principal'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
                      <MapPin className="w-7 h-7 text-emerald-400 animate-pulse" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <span>Estaca de Projeto Atual</span>
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                        {nearestStationInfo
                          ? nearestStationInfo.station
                          : isLocating
                          ? 'Calculando estaca...'
                          : photoStation || 'Aguardando GPS...'}
                      </h2>
                      {nearestStationInfo && (
                        <p className="text-xs font-bold text-emerald-300/90 mt-0.5">
                          Distância do eixo: {nearestStationInfo.distanceMeters}m
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fetchUserGps}
                    className="p-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-300 transition-all active:scale-95 shrink-0 flex items-center gap-2 shadow-lg"
                    title="Atualizar estaca via GPS"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-bold hidden sm:inline">Atualizar GPS</span>
                  </button>
                </div>

                {/* BOTÃO PRINCIPAL DE DISPARO DA CÂMERA ACIMA DOS DEMAIS BOTÕES */}
                <div className="pt-2">
                  <Button
                    onClick={() => setIsCameraOpen(true)}
                    className="w-full h-14 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm uppercase tracking-wide rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                  >
                    <Camera className="w-6 h-6 stroke-[2.5]" />
                    <span>Abrir Câmera com Carimbo Técnico</span>
                  </Button>
                </div>
              </div>
            )}

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
                      <h2 className="font-black text-sm text-white tracking-tight">{isCamOnly ? "Aplicativo Synera Cam" : "Aplicativo Synera Mobile"}</h2>
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
                {!isPwaInstalled ? (
                  <Button
                    onClick={handleInstallPwa}
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
                  >
                    <Download className="w-4 h-4" />
                    Instalar App Synera no Celular
                  </Button>
                ) : (
                  <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-700/60 text-slate-300 text-[11px] font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> App Pronto para Uso
                    </span>
                    <span className="text-[10px] text-slate-400">Modo Offline Ativo</span>
                  </div>
                )}
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
              <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 gap-3">
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

            {/* CARD QUICK ACCESS DA SINCRONIZAÇÃO EM SEGUNDO PLANO */}
            <div 
              onClick={handleProcessSync}
              className="p-4 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 cursor-pointer flex items-center justify-between transition-all shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Sincronizar Dados de Campo</h4>
                  <p className="text-[11px] text-slate-400">
                    {offlineQueue.length === 0 ? 'Todos os dados locais sincronizados' : `${offlineQueue.length} apontamento(s) aguardando envio ao servidor`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </span>
            </div>

            {/* CARD QUICK ACCESS: PROJETOS OFF-LINE (SYNERA CAM) OU MEUS REGISTROS (SYNERA MOBILE) */}
            {isCamOnly ? (
              <div 
                onClick={() => setActiveSector('projetos_baixados' as any)}
                className="p-4 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/50 cursor-pointer flex items-center justify-between transition-all shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <FolderDown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-white">Projetos Off-line no Cam</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                        {camDownloadedProjects.length} baixado(s)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {activeContract ? `${activeContract.name || (activeContract as any).workName || 'Obra Ativa'} ativado` : 'Gerencie projetos para uso off-line no iOS e Android'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  Ver Projetos <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            ) : (
              <div 
                onClick={() => setActiveSector('registros')}
                className="p-4 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-blue-500/50 cursor-pointer flex items-center justify-between transition-all shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-white">Meus Registros de Campo</h4>
                      {userFieldReports.filter(r => r.status === 'pending' || !r.syncedAt).length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                          {userFieldReports.filter(r => r.status === 'pending' || !r.syncedAt).length} pendente(s)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {userFieldReports.length} lançamento(s) registrados neste celular
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                  Ver Registros <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            )}

          </motion.div>
        )}

        {/* ==================================================== */}
        {/* BARRA SUPERIOR DE NAVEGAÇÃO INTERNA DO SETOR */}
        {/* ==================================================== */}
        {activeSector !== null && (
          <div className="space-y-4">
            {/* Top Bar para Voltar à Home do PWA */}
            <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-2xl shadow-md">
              <button 
                onClick={() => setActiveSector(null)} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Voltar ao Menu</span>
              </button>

              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Setor de Atuação</span>
                <span className="text-xs font-black text-emerald-400">
                  {activeSector === 'producao' && 'Produção • Sala Técnica'}
                  {activeSector === 'rh' && 'RH • Gestão de Pessoal'}
                  {activeSector === 'equipamentos' && 'Equipamentos • Controlador'}
                  {activeSector === 'materiais' && 'Materiais • Almoxarife'}
                  {activeSector === 'project_admin' && 'Administrador da Obra'}
                  {activeSector === 'sincronizacao' && 'Sincronizar Dados'}
                  {activeSector === 'registros' && 'Meus Registros de Campo'}
                  {activeSector === ('projetos_baixados' as any) && 'Projetos Off-line no Synera Cam'}
                  {activeSector === 'galeria' && 'Galeria de Fotos'}
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

                  {/* Tipo da Informação Selector */}
                  <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700/80">
                    <Label className="text-xs font-black text-blue-300 uppercase tracking-wider block">
                      Tipo da Informação *
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setProdInfoType('qty')}
                        className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 border ${
                          prodInfoType === 'qty'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Quantidade do Serviço
                      </button>

                      <button
                        type="button"
                        onClick={() => setProdInfoType('trips')}
                        className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 border ${
                          prodInfoType === 'trips'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Nº de Viagens
                      </button>

                      <button
                        type="button"
                        onClick={() => setProdInfoType('dimensions')}
                        className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 border ${
                          prodInfoType === 'dimensions'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <Box className="w-3.5 h-3.5" />
                        Dimensões (C x L x A)
                      </button>
                    </div>

                    {/* Inputs de acordo com o Tipo de Informação */}
                    {prodInfoType === 'qty' && (
                      <div className="pt-2">
                        <Label className="text-xs font-bold text-slate-300 block mb-1">Quantidade Realizada *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 50.5"
                          value={prodQty}
                          onChange={e => setProdQty(e.target.value)}
                          className="h-12 rounded-2xl bg-slate-950 border-slate-700 text-white font-black text-base sm:text-lg px-4"
                        />
                      </div>
                    )}

                    {prodInfoType === 'trips' && (
                      <div className="pt-2 space-y-2">
                        <Label className="text-xs font-bold text-slate-300 block">Número de Viagens (Inteiro) *</Label>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Ex: 8"
                          value={prodTripsQty}
                          onChange={e => setProdTripsQty(e.target.value)}
                          className="h-12 rounded-2xl bg-slate-950 border-slate-700 text-white font-black text-base sm:text-lg px-4"
                        />
                        <div className="flex items-center justify-between text-[11px] text-blue-300 font-bold px-1">
                          <span>Total Apontado: {prodQty || '0'} viagem(ns)</span>
                        </div>
                      </div>
                    )}

                    {prodInfoType === 'dimensions' && (
                      <div className="pt-2 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <Label className="text-xs font-bold text-slate-300 block mb-1">Comprimento (m) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 50.00"
                              value={prodLengthM}
                              onChange={e => setProdLengthM(e.target.value)}
                              className="h-12 rounded-2xl bg-slate-950 border-slate-700 text-white font-black text-base px-3"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-bold text-slate-300 block mb-1">Largura (m) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 3.50"
                              value={prodWidthM}
                              onChange={e => setProdWidthM(e.target.value)}
                              className="h-12 rounded-2xl bg-slate-950 border-slate-700 text-white font-black text-base px-3"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-bold text-slate-300 block mb-1">Altura / Espessura (m) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 0.20"
                              value={prodHeightM}
                              onChange={e => setProdHeightM(e.target.value)}
                              className="h-12 rounded-2xl bg-slate-950 border-slate-700 text-white font-black text-base px-3"
                            />
                          </div>
                        </div>

                        {prodLengthM && prodWidthM && prodHeightM && (
                          <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-between text-xs font-bold text-blue-200">
                            <span>Volume Calculado (C x L x A):</span>
                            <span className="text-sm font-black text-white">{prodQty || '0.00'} m³</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300 mb-1 block">Data da Produção *</Label>
                      <Input
                        type="date"
                        value={prodDate}
                        onChange={e => setProdDate(e.target.value)}
                        className="h-12 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-sm px-3"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300 mb-1 block">Estaca Inicial *</Label>
                      <Input
                        placeholder="Ex: 120+00,00"
                        value={prodStartStation}
                        onChange={e => setProdStartStation(e.target.value)}
                        className="h-12 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-sm px-3"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300 mb-1 block">Estaca Final *</Label>
                      <Input
                        placeholder="Ex: 145+10,50"
                        value={prodEndStation}
                        onChange={e => setProdEndStation(e.target.value)}
                        className="h-12 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-sm px-3"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300 mb-1 block">Trecho / Local Complementar</Label>
                    <Input
                      placeholder="Ex: Pista Esquerda / Faixa 1"
                      value={prodTrecho}
                      onChange={e => setProdTrecho(e.target.value)}
                      className="h-12 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-sm px-3"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300 block mb-1">Observações de Campo</Label>
                    <textarea
                      rows={3}
                      placeholder="Descreva detalhes do serviço executado em campo, equipe utilizada, etc..."
                      value={prodNotes}
                      onChange={e => setProdNotes(e.target.value)}
                      className="w-full rounded-2xl bg-slate-900 border border-slate-700 text-white p-3.5 text-sm sm:text-base focus:outline-none focus:border-blue-500 font-bold placeholder:text-slate-500"
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

                  <div className="space-y-2 pt-3 border-t border-slate-700/60">
                    <Button
                      onClick={handleSaveProduction}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                    >
                      <Save className="w-4 h-4 stroke-[2.5]" />
                      Salvar Apontamento de Produção
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsMyRecordsOpen(true)}
                        className="flex-1 h-10 rounded-xl bg-slate-900 border-slate-700 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800"
                      >
                        <FileText className="w-4 h-4 text-blue-400" />
                        Ver Lançamentos ({userFieldReports.length})
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setActiveSector(null)}
                        className="h-10 px-4 rounded-xl bg-slate-800/80 text-slate-300 font-bold text-xs hover:bg-slate-700"
                      >
                        Voltar
                      </Button>
                    </div>
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
                          {userFieldReports.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-8">Nenhum registro de campo efetuado ainda.</p>
                          ) : (
                            userFieldReports.map(rep => (
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
                                  <span>Data Prod: {formatLocalDateStr(rep.productionDate)}</span>
                                </div>

                                {rep.trecho && <p className="text-[10px] text-slate-400">Trecho: {rep.trecho}</p>}
                                {rep.notes && <p className="text-[10px] text-slate-300 italic">"{rep.notes}"</p>}

                                {rep.status === 'rejected' && (
                                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 space-y-1 text-[10px]">
                                    <div className="flex items-center gap-1.5 text-rose-300 font-extrabold uppercase">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                      <span>Registro Rejeitado pela Sala Técnica</span>
                                    </div>
                                    <p className="text-rose-100 font-bold">
                                      Motivo: "{rep.rejectionReason || 'Sem motivo especificado.'}"
                                    </p>
                                    {rep.rejectedBy && (
                                      <p className="text-rose-400 text-[9px]">
                                        Rejeitado por: {rep.rejectedBy} {rep.rejectedAt ? `em ${new Date(rep.rejectedAt).toLocaleString('pt-BR')}` : ''}
                                      </p>
                                    )}
                                  </div>
                                )}

                                <div className="text-[9px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                                  <span>Sincronizado: {rep.syncedAt ? new Date(rep.syncedAt).toLocaleTimeString('pt-BR') : 'Aguardando Sincronização'}</span>
                                  {!(rep.status === 'synced' || rep.status === 'approved' || Boolean(rep.syncedAt)) ? (
                                    <button
                                      onClick={() => setEditingMyRecord(rep)}
                                      className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 text-[10px]"
                                    >
                                      <Edit3 className="w-3 h-3" /> Editar
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                                      <CheckCircle2 className="w-3 h-3" /> Sincronizado (Bloqueado)
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <Button
                          onClick={() => setIsMyRecordsOpen(false)}
                          className="w-full h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700"
                        >
                          Fechar Janela de Lançamentos
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
                          <Button
                            variant="outline"
                            onClick={() => setEditingMyRecord(null)}
                            className="flex-1 h-10 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs border-slate-700"
                          >
                            Cancelar
                          </Button>

                          <Button
                            onClick={() => {
                              if (editingMyRecord && onUpdateFieldReport) {
                                onUpdateFieldReport(editingMyRecord);
                                setEditingMyRecord(null);
                                alert('Apontamento atualizado com sucesso!');
                              }
                            }}
                            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30"
                          >
                            <Save className="w-4 h-4 mr-1" />
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
                              type="button"
                              onClick={() => setMobileRhSubView('colaboradores')}
                              className="w-full h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                            >
                              <Users className="w-4 h-4" />
                              Ir para Chamada / Ponto Individual de Colaboradores
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
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                      >
                        <Save className="w-4 h-4 stroke-[2.5]" />
                        Salvar Resumo do Efetivo de RH
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

                      {/* Ações e Transferências */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-700/60">
                        <span className="text-[11px] font-bold text-slate-400">
                          Exibindo {allowedRhEmployees.filter(e => {
                            const matchSearch = !rhSearchTerm.trim() || e.name.toLowerCase().includes(rhSearchTerm.toLowerCase()) || (e.role && e.role.toLowerCase().includes(rhSearchTerm.toLowerCase()));
                            const matchTeam = rhTeamFilter === 'ALL' || e.team === rhTeamFilter;
                            return matchSearch && matchTeam;
                          }).length} colaboradores {currentUserTeam ? `(Equipe: ${currentUserTeam})` : ''}
                        </span>

                        <div className="flex items-center gap-2">
                          {currentUserTeam && (
                            <button
                              type="button"
                              onClick={() => setIsTransferModalOpen(true)}
                              className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-purple-500/30 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 text-purple-400" />
                              + Add por Transferência
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...rhEmployeeRecords };
                              allowedRhEmployees.forEach(emp => {
                                if (canMarkAttendance(emp)) {
                                  updated[emp.id] = {
                                    status: 'presente',
                                    entryTime: updated[emp.id]?.entryTime || '07:00',
                                    exitTime: updated[emp.id]?.exitTime || '17:00',
                                    transferredToTeam: updated[emp.id]?.transferredToTeam,
                                    notes: updated[emp.id]?.notes
                                  };
                                }
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

                          const isAttendanceAllowed = canMarkAttendance(emp);

                          const updateEmpRecord = (fields: Partial<typeof record>) => {
                            if (!isAttendanceAllowed) {
                              alert(`Presença e falta só podem ser preenchidas para colaboradores da sua equipe vinculada (${currentUserTeam}).`);
                              return;
                            }
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
                                    {emp.name ? emp.name.split(' ').filter(n=>n).map(n => n[0]).slice(0, 2).join('') : 'UN'}
                                  </div>
                                  <div>
                                    <h4 className="font-black text-sm text-white leading-tight">{emp.name}</h4>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-bold text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded-full">
                                        {emp.role || 'Colaborador'}
                                      </span>
                                      {emp.team && (
                                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                                          {emp.team}
                                        </span>
                                      )}
                                      {!isAttendanceAllowed && (
                                        <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                                          🔒 Outra Equipe (Apenas Leitura)
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
                                  disabled={!isAttendanceAllowed}
                                  onClick={() => updateEmpRecord({ status: 'presente' })}
                                  className={`py-2 px-2 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    !isAttendanceAllowed ? 'opacity-50 cursor-not-allowed bg-slate-900/40 text-slate-500 border border-slate-800' :
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
                                  disabled={!isAttendanceAllowed}
                                  onClick={() => updateEmpRecord({ status: 'falta' })}
                                  className={`py-2 px-2 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    !isAttendanceAllowed ? 'opacity-50 cursor-not-allowed bg-slate-900/40 text-slate-500 border border-slate-800' :
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
                                  disabled={!isAttendanceAllowed}
                                  onClick={() => updateEmpRecord({ status: 'folga' })}
                                  className={`py-2 px-2 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    !isAttendanceAllowed ? 'opacity-50 cursor-not-allowed bg-slate-900/40 text-slate-500 border border-slate-800' :
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

                    {/* MODAL DE SELEÇÃO DE COLABORADOR DE OUTRA EQUIPE (TRANSFERÊNCIA) */}
                    <AnimatePresence>
                      {isTransferModalOpen && (
                        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-lg space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
                          >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                              <div>
                                <h3 className="font-black text-sm text-white flex items-center gap-2">
                                  <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                                  Adicionar Colaborador por Transferência
                                </h3>
                                <p className="text-[10px] text-purple-300">
                                  Selecione um funcionário de outra equipe para incluir na sua equipe ({currentUserTeam || 'Minha Equipe'}).
                                </p>
                              </div>
                              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="relative shrink-0">
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Buscar colaborador de outra equipe por nome ou cargo..."
                                value={transferSearchTerm}
                                onChange={e => setTransferSearchTerm(e.target.value)}
                                className="w-full h-10 pl-9 pr-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-purple-500"
                              />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                              {otherTeamEmployees
                                .filter(e => !transferSearchTerm.trim() || e.name.toLowerCase().includes(transferSearchTerm.toLowerCase()) || (e.role && e.role.toLowerCase().includes(transferSearchTerm.toLowerCase())))
                                .length === 0 ? (
                                <div className="text-center py-8 text-xs text-slate-400">
                                  Nenhum colaborador de outra equipe disponível para transferência.
                                </div>
                              ) : (
                                otherTeamEmployees
                                  .filter(e => !transferSearchTerm.trim() || e.name.toLowerCase().includes(transferSearchTerm.toLowerCase()) || (e.role && e.role.toLowerCase().includes(transferSearchTerm.toLowerCase())))
                                  .map(emp => (
                                    <div key={emp.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                                      <div>
                                        <h4 className="font-extrabold text-xs text-white leading-tight">{emp.name}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                          <span>{emp.role || 'Colaborador'}</span>
                                          {emp.team && (
                                            <span className="text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded-full">
                                              Equipe Origem: {emp.team}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const targetTeam = currentUserTeam || 'Minha Equipe';
                                          setTransferredEmpIds(prev => Array.from(new Set([...prev, emp.id])));
                                          setRhEmployeeRecords(prev => ({
                                            ...prev,
                                            [emp.id]: {
                                              status: 'presente',
                                              entryTime: '07:00',
                                              exitTime: '17:00',
                                              transferredToTeam: targetTeam,
                                              notes: `Transferido temporariamente para ${targetTeam}`
                                            }
                                          }));
                                          alert(`${emp.name} foi transferido para a sua equipe (${targetTeam}).`);
                                          setIsTransferModalOpen(false);
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shrink-0 flex items-center gap-1 shadow-md shadow-purple-600/30"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Transferir
                                      </button>
                                    </div>
                                  ))
                              )}
                            </div>

                            <div className="shrink-0 pt-2 border-t border-slate-800">
                              <Button
                                variant="outline"
                                onClick={() => setIsTransferModalOpen(false)}
                                className="w-full h-10 rounded-2xl bg-slate-800 border-slate-700 text-slate-300 font-bold text-xs"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Botão Flutuante de Salvamento Geral */}
                    <div className="sticky bottom-4 z-20 pt-2 space-y-2">
                      <Button
                        onClick={handleSaveHeadcount}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl shadow-emerald-600/40 border border-emerald-400/40"
                      >
                        <Save className="w-4 h-4 stroke-[2.5]" />
                        Salvar Ponto & Lista de Colaboradores
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
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30"
                  >
                    <Save className="w-4 h-4 stroke-[2.5]" />
                    Salvar Apontamento de Equipamento
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
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <Save className="w-4 h-4 stroke-[2.5]" />
                    Salvar Movimentação de Material
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
                          className="w-full h-11 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                        >
                          <Save className="w-4 h-4" />
                          Salvar Movimentação Financeira
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
                            R$ {monthlyMovements.reduce((acc, m) => acc + (m.type === 'despesa' ? (m.amount || 0) : 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                  <span>Data: {(m.date ? new Date(m.date).toLocaleDateString('pt-BR') : '')}</span>
                                  <span>Cat: {m.category}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-extrabold text-xs text-purple-300">
                                  R$ {(m.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                          className="w-full h-11 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                        >
                          <Plus className="w-4 h-4" />
                          Enviar Solicitação do Administrador
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
                                {req.amount !== undefined && req.amount !== null && (
                                  <span className="text-purple-300 font-extrabold text-xs">
                                    R$ {(Number(req.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                      >
                        <Save className="w-4 h-4 stroke-[2.5]" />
                        Salvar Diário de Obra & Clima
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

                  <div className="pt-2 border-t border-slate-700/60 mt-4">
                    <Button
                      onClick={handleProcessSync}
                      disabled={isSyncing || !isOnline}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider"
                    >
                      {isSyncing ? 'Sincronizando...' : (offlineQueue.length > 0 ? 'Sincronizar Envio e Recebimento' : 'Atualizar Dados Offline')}
                    </Button>
                  </div>

                  {syncHistory.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-700/60">
                      <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Histórico de Sincronização
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {syncHistory.map(hist => (
                          <div key={hist.id} className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-start gap-2 text-xs">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                              {hist.action === 'upload' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200">{hist.details}</p>
                              <span className="text-[10px] text-slate-500">{new Date(hist.timestamp).toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setActiveSector(null)}
                      className="w-full h-10 rounded-xl bg-slate-900 border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800"
                    >
                      Voltar ao Menu Principal
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TELA DEDICADA DE MEUS REGISTROS DE CAMPO (STATUS DE SINC) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'registros' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-12">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                  
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setActiveSector(null)} 
                        className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-600 text-slate-200 transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          Meus Registros de Campo
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400">
                          Acompanhe o status de envio e sincronização dos seus lançamentos
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resumo em Cards de Estatística */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700/60 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">Total Registrados</span>
                      <span className="text-base font-black text-white">{userFieldReports.length}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                      <span className="text-[10px] text-amber-300 font-bold block">🟡 Pendentes</span>
                      <span className="text-base font-black text-amber-400">
                        {userFieldReports.filter(r => r.status === 'pending' || !r.syncedAt).length}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                      <span className="text-[10px] text-emerald-300 font-bold block">🟢 Sincronizados</span>
                      <span className="text-base font-black text-emerald-400">
                        {userFieldReports.filter(r => r.status === 'synced' || r.status === 'approved' || Boolean(r.syncedAt)).length}
                      </span>
                    </div>
                  </div>

                  {/* BANNER PRINCIPAL DE AÇÃO DE SINCRONIZAÇÃO */}
                  {userFieldReports.filter(r => r.status === 'pending' || !r.syncedAt).length > 0 ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/40 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-amber-300">
                            {userFieldReports.filter(r => r.status === 'pending' || !r.syncedAt).length} apontamento(s) aguardando envio
                          </h4>
                          <p className="text-[10px] text-slate-300">
                            Os dados estão salvos neste celular. Clique no botão abaixo para transmitir ao servidor.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleProcessSync}
                        disabled={isSyncing}
                        className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-2 shadow-lg shadow-amber-500/20"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Enviando Dados...' : 'Sincronizar Pendentes Agora'}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-emerald-300">Todos os seus registros estão sincronizados</p>
                          <p className="text-[10px] text-slate-400">Base de dados atualizada no servidor Supabase.</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleProcessSync}
                        disabled={isSyncing}
                        variant="outline"
                        className="h-8 px-3 rounded-lg border-emerald-500/40 text-emerald-300 font-bold text-[10px] hover:bg-emerald-500/20"
                      >
                        Atualizar
                      </Button>
                    </div>
                  )}

                  {/* ABA DE FILTROS (TODOS, PENDENTES, SINCRONIZADOS) */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-700/60">
                    <button
                      onClick={() => setRegistrosFilterStatus('all')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        registrosFilterStatus === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Todos ({userFieldReports.length})
                    </button>
                    <button
                      onClick={() => setRegistrosFilterStatus('pending')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        registrosFilterStatus === 'pending' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Pendentes ({userFieldReports.filter(r => r.status === 'pending' || !r.syncedAt).length})
                    </button>
                    <button
                      onClick={() => setRegistrosFilterStatus('synced')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        registrosFilterStatus === 'synced' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sincronizados ({userFieldReports.filter(r => r.status === 'synced' || r.status === 'approved' || Boolean(r.syncedAt)).length})
                    </button>
                  </div>

                  {/* FILTROS ADICIONAIS: PESQUISA E OBRA */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <Input
                        value={registrosSearch}
                        onChange={(e) => setRegistrosSearch(e.target.value)}
                        placeholder="Buscar por serviço, trecho ou nota..."
                        className="pl-9 h-9 bg-slate-900 border-slate-700 text-white text-xs rounded-xl"
                      />
                    </div>
                    <Select value={registrosFilterContract} onValueChange={setRegistrosFilterContract}>
                      <SelectTrigger className="h-9 w-full sm:w-48 bg-slate-900 border-slate-700 text-white text-xs rounded-xl">
                        <SelectValue placeholder="Filtrar por Obra" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        <SelectItem value="all">Todas as Obras</SelectItem>
                        {contracts.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name || c.workName || 'Obra'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* LISTA DE CARDS DE REGISTRO DE CAMPO */}
                  <div className="space-y-3">
                    {filteredUserReports.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                        <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-400">Nenhum registro encontrado para este filtro.</p>
                      </div>
                    ) : (
                      filteredUserReports.map(rep => {
                        const isSynced = rep.status === 'synced' || rep.status === 'approved' || Boolean(rep.syncedAt);

                        return (
                          <div 
                            key={rep.id} 
                            className={`p-4 rounded-2xl bg-slate-900 border transition-all space-y-2.5 ${
                              isSynced ? 'border-slate-800 hover:border-emerald-500/30' : 'border-amber-500/50 bg-slate-900/90 shadow-md'
                            }`}
                          >
                            {/* Header do Card */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-black text-white">{rep.serviceName || 'Apontamento de Campo'}</h4>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {contracts.find(c => c.id === rep.contractId)?.name || rep.contractName || 'Obra Geral'}
                                </p>
                              </div>
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${
                                isSynced 
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              }`}>
                                {isSynced ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    Enviado / Sincronizado
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    Pendente de Envio
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Detalhes do Apontamento */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                              <div>
                                <span className="text-slate-500 text-[9px] block uppercase font-bold">Quantidade</span>
                                <span className="text-emerald-400 font-extrabold text-xs">{rep.qty} {rep.unit || 'un'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[9px] block uppercase font-bold">Data da Produção</span>
                                <span className="text-slate-200 font-bold">{formatLocalDateStr(rep.productionDate)}</span>
                              </div>
                            </div>

                            {rep.trecho && (
                              <p className="text-[10px] text-slate-300 font-medium bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                                <strong>Local/Trecho:</strong> {rep.trecho}
                              </p>
                            )}

                            {rep.notes && (
                              <p className="text-[10px] text-slate-400 italic">
                                "{rep.notes}"
                              </p>
                            )}

                            {rep.status === 'rejected' && (
                              <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/60 space-y-1 text-xs">
                                <div className="flex items-center gap-1.5 text-rose-300 font-black uppercase text-[10px]">
                                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                  <span>Registro Rejeitado pela Sala Técnica</span>
                                </div>
                                <p className="text-rose-100 font-bold text-xs bg-rose-900/40 p-2.5 rounded-lg border border-rose-800/50">
                                  "{rep.rejectionReason || 'Não foi fornecida uma justificativa específica.'}"
                                </p>
                                {rep.rejectedBy && (
                                  <p className="text-rose-400 text-[10px] pt-0.5">
                                    Rejeitado por: {rep.rejectedBy} {rep.rejectedAt ? `em ${new Date(rep.rejectedAt).toLocaleString('pt-BR')}` : ''}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Foto Anexa se Houver */}
                            {(rep.photoUrl || rep.photo) && (
                              <div className="relative rounded-xl overflow-hidden border border-slate-800 max-h-36">
                                <img 
                                  src={rep.photoUrl || rep.photo} 
                                  alt="Foto de Campo" 
                                  className="w-full h-36 object-cover" 
                                />
                              </div>
                            )}

                            {/* Rodapé do Card */}
                            <div className="flex items-center justify-between text-[9px] text-slate-500 pt-2 border-t border-slate-800">
                              <span>
                                {isSynced && rep.syncedAt 
                                  ? `Enviado em: ${new Date(rep.syncedAt).toLocaleString('pt-BR')}`
                                  : 'Salvo localmente no dispositivo (aguardando sincronização)'}
                              </span>
                              <div className="flex items-center gap-2">
                                {isSynced && (
                                  <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60 shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Sincronizado
                                  </span>
                                )}
                                <button
                                  onClick={() => handleDeleteReport(rep.id)}
                                  className="text-red-400 hover:text-red-300 font-extrabold flex items-center gap-1 text-[10px] shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <Button
                    onClick={() => setActiveSector(null)}
                    variant="outline"
                    className="w-full h-11 rounded-2xl bg-slate-900 border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-800"
                  >
                    Voltar ao Menu Inicial
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TELA DEDICADA DE PROJETOS BAIXADOS (SYNERA CAM OFF-LINE) */}
            {/* ---------------------------------------------------- */}
            {activeSector === ('projetos_baixados' as any) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-12">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                  
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setActiveSector(null)} 
                        className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-600 text-slate-200 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h3 className="font-black text-sm text-white flex items-center gap-2">
                          <FolderDown className="w-4 h-4 text-emerald-400" />
                          Projetos Off-line no Synera Cam
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Contratos, eixos e estacas armazenados no celular (iOS & Android)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card de Ação Principal: Baixar / Atualizar Dados do Projeto Ativo */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Projeto / Obra Ativa:</span>
                          <h4 className="text-sm font-black text-white">{activeContract?.name || (activeContract as any)?.workName || 'Obra Principal'}</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {(projectAlignments || []).length} estacas cadastradas
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Ao clicar em "Baixar Projeto", as coordenadas GPS e estacas do eixo são salvas diretamente na memória do seu dispositivo (iPhone, iPad ou Android) para funcionar 100% off-line no Synera Cam.
                    </p>

                    <Button
                      onClick={() => handleDownloadProjectForCam(activeContract?.id)}
                      disabled={isDownloadingProject}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                    >
                      <Download className={`w-4 h-4 stroke-[2.5] ${isDownloadingProject ? 'animate-bounce' : ''}`} />
                      {isDownloadingProject ? 'Baixando Dados do Projeto...' : 'Baixar / Atualizar Dados do Projeto no iOS/Android'}
                    </Button>
                  </div>

                  {/* Lista de Projetos Armazenados Localmente */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Projetos Disponíveis no Aparelho ({camDownloadedProjects.length})
                      </h4>
                    </div>

                    {camDownloadedProjects.length === 0 ? (
                      <div className="p-6 text-center bg-slate-900/60 rounded-2xl border border-slate-700/50 space-y-2">
                        <FolderDown className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-300 font-bold">Nenhum projeto foi baixado ainda.</p>
                        <p className="text-[11px] text-slate-400">
                          Clique no botão verde acima para baixar as estacas e dados da obra e ter suporte off-line no Synera Cam.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {camDownloadedProjects.map(proj => {
                          const isSelected = proj.contractId === selectedContractId;
                          return (
                            <div 
                              key={proj.contractId}
                              className={`p-4 rounded-2xl border transition-all ${
                                isSelected 
                                  ? 'bg-slate-900/90 border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-lg' 
                                  : 'bg-slate-900/50 border-slate-700/60 hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-white truncate">{proj.contractName}</span>
                                    {isSelected && (
                                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 uppercase">
                                        Projeto Ativo
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      Baixado: {new Date(proj.downloadedAt).toLocaleDateString('pt-BR')} às {new Date(proj.downloadedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span>•</span>
                                    <span className="text-emerald-400 font-bold">
                                      {proj.alignmentCount} estacas
                                    </span>
                                  </div>
                                </div>

                                {!isSelected && (
                                  <Button
                                    onClick={() => {
                                      setSelectedContract(proj.contractId);
                                      alert(`Projeto "${proj.contractName}" ativado no Synera Cam.`);
                                    }}
                                    className="h-9 px-3.5 text-[11px] font-extrabold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shrink-0"
                                  >
                                    Ativar no Cam
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => setActiveSector(null)}
                    variant="outline"
                    className="w-full h-11 rounded-2xl bg-slate-900 border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-800"
                  >
                    Voltar ao Menu Inicial
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TELA DA GALERIA DE FOTOS (VISUALIZAR, SELECIONAR, EDITAR, EXCLUIR) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'galeria' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-12">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                  
                  {/* Cabeçalho da Galeria */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setActiveSector(null)} 
                        className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-600 text-slate-200 transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                          <Eye className="w-4 h-4 text-fuchsia-400" />
                          Galeria de Fotos Synera Cam
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400">
                          {fieldReports.filter(r => r.photoUrl).length} foto(s) de campo cadastradas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowStampSettingsModal(true)}
                        variant="outline"
                        className="h-9 px-3 border-slate-700 bg-slate-900 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
                        title="Configurar Estilo e Posição do Carimbo Técnico"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Carimbo</span>
                      </Button>

                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="h-9 px-3 border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                        title="Tirar foto diretamente pela Câmera Nativa em Máxima Resolução HD/4K"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Câmera HD Nativa</span>
                      </Button>

                      <Button
                        onClick={() => setIsCameraOpen(true)}
                        className="h-9 px-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="hidden sm:inline">Ao Vivo PWA</span>
                      </Button>
                    </div>
                  </div>

                  {/* Filtros e Busca de Fotos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        placeholder="Buscar por estaca ou descrição..."
                        value={gallerySearchQuery}
                        onChange={e => setGallerySearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl bg-slate-900 border-slate-700 text-white text-xs"
                      />
                    </div>

                    <Select value={galleryFilterContract} onValueChange={setGalleryFilterContract}>
                      <SelectTrigger className="h-10 rounded-xl bg-slate-900 border-slate-700 text-white text-xs">
                        <SelectValue placeholder="Filtrar por Obra" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        <SelectItem value="all">Todas as Obras ({userFieldReports.filter(r => r.photoUrl).length})</SelectItem>
                        {contracts.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name || c.workName || 'Obra'} ({userFieldReports.filter(r => r.photoUrl && r.contractId === c.id).length})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Barra de Ações em Lote (quando houver seleção) */}
                  {selectedGalleryPhotos.length > 0 && (
                    <div className="p-3 bg-fuchsia-950/80 border border-fuchsia-500/50 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
                      <div className="flex items-center gap-2 text-fuchsia-300 font-bold">
                        <CheckSquare className="w-4 h-4 text-fuchsia-400" />
                        <span>{selectedGalleryPhotos.length} foto(s) selecionada(s)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            selectedGalleryPhotos.forEach(url => handleDownloadPhoto(url));
                          }}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg border border-slate-700 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-400" />
                          Baixar
                        </button>

                        <button
                          onClick={() => handleShareMultiplePhotos(selectedGalleryPhotos)}
                          className="px-2.5 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-md shadow-fuchsia-600/30"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Compartilhar
                        </button>
                        <button
                          onClick={handleBatchDeletePhotos}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] rounded-lg flex items-center gap-1 shadow-md shadow-rose-600/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>

                        <button
                          onClick={() => setSelectedGalleryPhotos([])}
                          className="p-1.5 text-slate-400 hover:text-white"
                          title="Desmarcar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista/Grid de Fotos da Galeria */}
                  {(() => {
                    const filteredGalleryPhotos = userFieldReports.filter(r => {
                      if (!r.photoUrl) return false;
                      if (galleryFilterContract !== 'all' && r.contractId !== galleryFilterContract) return false;
                      if (gallerySearchQuery.trim()) {
                        const q = gallerySearchQuery.toLowerCase();
                        const descMatch = (r.description || '').toLowerCase().includes(q);
                        const locMatch = (r.location || '').toLowerCase().includes(q);
                        return descMatch || locMatch;
                      }
                      return true;
                    });

                    if (filteredGalleryPhotos.length === 0) {
                      return (
                        <div className="py-12 text-center space-y-3">
                          <div className="w-16 h-16 bg-slate-800/80 rounded-full mx-auto flex items-center justify-center">
                            <Camera className="w-8 h-8 text-slate-500" />
                          </div>
                          <p className="text-slate-300 text-xs font-bold px-8">Nenhuma foto encontrada para os filtros selecionados.</p>
                          <Button
                            onClick={() => {
                              setGalleryFilterContract('all');
                              setGallerySearchQuery('');
                            }}
                            className="h-8 px-3 text-[11px] bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                          >
                            Limpar Filtros
                          </Button>
                        </div>
                      );
                    }

                    const getValidDate = (report: any) => {
                      let d;
                      if (report.timestamp) d = new Date(report.timestamp);
                      else if (report.createdAt) d = new Date(report.createdAt);
                      else if (report.date) {
                        if (report.date.includes('/')) {
                          const parts = report.date.split('/');
                          if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
                        } else {
                          d = new Date(report.date);
                        }
                      }
                      if (!d || isNaN(d.getTime())) d = new Date();
                      return d;
                    };

                    filteredGalleryPhotos.sort((a, b) => {
                      return getValidDate(b).getTime() - getValidDate(a).getTime();
                    });

                    const grouped = filteredGalleryPhotos.reduce((acc, report) => {
                      const d = getValidDate(report);
                      const m = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      const formatted = m.charAt(0).toUpperCase() + m.slice(1);
                      if (!acc[formatted]) acc[formatted] = [];
                      acc[formatted].push(report);
                      return acc;
                    }, {} as Record<string, typeof filteredGalleryPhotos>);

                    return (
                      <div className="space-y-6 pb-6">
                        {Object.entries(grouped).map(([month, reports]) => (
                          <div key={month} className="space-y-3">
                            <h4 className="text-sm font-black text-slate-300 uppercase tracking-wider sticky top-0 bg-slate-800/80 p-2 rounded-xl backdrop-blur-sm z-20 shadow-md border border-slate-700/60">
                              {month} <span className="text-slate-500 font-bold ml-1 text-xs">({reports.length})</span>
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {reports.map(report => {
                                const globalIndex = filteredGalleryPhotos.findIndex(r => r.id === report.id);
                                const isSelected = selectedGalleryPhotos.includes(report.photoUrl as string);
                                return (
                                  <div 
                                    key={report.id} 
                                    onClick={() => setFullScreenPhotoIndex(globalIndex)}
                                    className={`group relative aspect-[3/4] bg-slate-950 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                                      isSelected ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/50 scale-[0.98]' : 'border-slate-700/80 hover:border-slate-500'
                                    }`}
                                  >
                                    <img src={report.photoUrl} alt="Foto Campo" className="w-full h-full object-cover" />
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedGalleryPhotos(prev => 
                                           prev.includes(report.photoUrl as string)
                                             ? prev.filter(url => url !== report.photoUrl)
                                             : [...prev, report.photoUrl as string]
                                        );
                                      }}
                                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform z-30 ${
                                        isSelected ? 'bg-fuchsia-500 text-white scale-110' : 'bg-slate-900/80 text-slate-400 border border-slate-600 hover:text-white'
                                      }`}
                                      title={isSelected ? 'Desmarcar foto' : 'Selecionar foto'}
                                    >
                                      {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Square className="w-4 h-4" />}
                                    </button>

                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 border border-amber-500/40 backdrop-blur text-[9px] font-black text-amber-300 z-30">
                                      {report.location || 'Estaca N/I'}
                                    </div>

                                    <div className="absolute inset-x-2 top-10 flex items-center justify-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity z-30">
                                      {!(report.status === 'synced' || report.status === 'approved' || Boolean(report.syncedAt)) && (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(report); }}
                                            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-amber-400 shadow-xl"
                                            title="Editar dados da foto"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                                            className="p-2 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 text-rose-300 shadow-xl"
                                            title="Excluir foto"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-2.5 pt-6 pointer-events-none z-20">
                                      <p className="text-[10px] font-extrabold text-white truncate">{report.description || 'Sem descrição'}</p>
                                      <p className="text-[9px] text-slate-400 font-medium">
                                        {report.timestamp ? (report.timestamp && !isNaN(new Date(report.timestamp).getTime()) ? new Date(report.timestamp).toLocaleDateString('pt-BR') : report.date) : report.date}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        <AnimatePresence>
                          {fullScreenPhotoIndex !== null && filteredGalleryPhotos[fullScreenPhotoIndex] && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
                            >
                              <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
                                 <button onClick={() => setFullScreenPhotoIndex(null)} className="p-2 bg-slate-900/40 border border-slate-700/50 rounded-full hover:bg-slate-900/60"><ArrowLeft className="w-5 h-5 text-white" /></button>
                                 <div className="flex flex-col items-center">
                                  <span className="font-bold text-sm tracking-wider text-slate-200">{fullScreenPhotoIndex + 1} / {filteredGalleryPhotos.length}</span>
                                  <span className="text-[10px] text-amber-400 font-bold">{filteredGalleryPhotos[fullScreenPhotoIndex].location || 'Estaca N/I'}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleShareMultiplePhotos([filteredGalleryPhotos[fullScreenPhotoIndex].photoUrl as string])}
                                    className="p-2 bg-slate-900/40 border border-slate-700/50 rounded-full hover:bg-slate-900/60"
                                  >
                                    <Share2 className="w-5 h-5 text-fuchsia-400" />
                                  </button>
                                 </div>
                              </div>

                              <motion.div 
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={1}
                                onDragEnd={(e, { offset, velocity }) => {
                                  const swipe = Math.abs(offset.x) * velocity.x;
                                  if (swipe < -500 || offset.x < -60) {
                                    if (fullScreenPhotoIndex < filteredGalleryPhotos.length - 1) setFullScreenPhotoIndex(prev => prev! + 1);
                                  } else if (swipe > 500 || offset.x > 60) {
                                    if (fullScreenPhotoIndex > 0) setFullScreenPhotoIndex(prev => prev! - 1);
                                  }
                                }}
                                className="flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none"
                              >
                                <motion.img 
                                  key={fullScreenPhotoIndex}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  src={filteredGalleryPhotos[fullScreenPhotoIndex].photoUrl}
                                  alt="Preview"
                                  className="max-w-full max-h-full object-contain pointer-events-none" 
                                />
                              </motion.div>
                              <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent">
                                <p className="text-xs text-white font-medium text-center bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-xl">
                                  {filteredGalleryPhotos[fullScreenPhotoIndex].description || 'Nenhuma descrição fornecida.'}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}

                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* MODAL DE AMPLIAÇÃO / LIGHTBOX DA FOTO (PREVIEWING) */}
            {/* ---------------------------------------------------- */}
            {previewingReport && (
              <Dialog open={!!previewingReport} onOpenChange={() => setPreviewingReport(null)}>
                <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 text-white p-0 overflow-hidden rounded-3xl">
                  <div className="flex flex-col md:flex-row max-h-[85vh] overflow-y-auto">
                    {/* Imagem Ampliada */}
                    <div className="flex-1 bg-black flex items-center justify-center p-2 min-h-[300px]">
                      <img 
                        src={previewingReport.photoUrl} 
                        alt="Foto Ampliada" 
                        className="max-h-[70vh] w-auto object-contain rounded-xl"
                      />
                    </div>

                    {/* Painel Lateral com Detalhes */}
                    <div className="w-full md:w-80 p-5 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span className="text-xs font-black uppercase text-fuchsia-400 tracking-wider">Detalhes da Foto</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            ID: {previewingReport.id.slice(-6)}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-slate-400 font-bold block text-[10px] uppercase">Obra / Contrato:</span>
                            <span className="font-black text-white">
                              {contracts.find(c => c.id === previewingReport.contractId)?.name || 'Obra Principal'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-bold block text-[10px] uppercase">Estaca / Localização:</span>
                            <span className="font-black text-amber-400 text-sm">
                              {previewingReport.location || 'Estaca N/I'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-bold block text-[10px] uppercase">Data e Hora do Registro:</span>
                            <span className="font-bold text-emerald-400">
                              {previewingReport.timestamp 
                                ? new Date(previewingReport.timestamp).toLocaleString('pt-BR') 
                                : previewingReport.date}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-bold block text-[10px] uppercase">Registrado por:</span>
                            <span className="font-medium text-slate-200">
                              {previewingReport.createdByName || 'Apontador de Campo'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-bold block text-[10px] uppercase">Observações / Descrição:</span>
                            <p className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 italic mt-1 leading-relaxed">
                              {previewingReport.description || 'Nenhuma observação informada.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Botoes de Ação no Lightbox */}
                      <div className="space-y-2 pt-4 border-t border-slate-800">
                        <Button
                          onClick={() => handleDownloadPhoto(previewingReport.photoUrl as string)}
                          className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Baixar Foto com Carimbo
                        </Button>

                        {!(previewingReport.status === 'synced' || previewingReport.status === 'approved' || Boolean(previewingReport.syncedAt)) ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => {
                                handleOpenEditModal(previewingReport);
                              }}
                              className="h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Editar
                            </Button>

                            <Button
                              onClick={() => handleDeleteReport(previewingReport.id)}
                              className="h-9 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-800"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </Button>
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] font-bold text-center flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Registro Sincronizado e Bloqueado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* ---------------------------------------------------- */}
            {/* MODAL DE EDIÇÃO DE FOTO / ESTACA / DESCRIÇÃO */}
            {/* ---------------------------------------------------- */}
            {editingPhotoReport && (
              <Dialog open={!!editingPhotoReport} onOpenChange={() => setEditingPhotoReport(null)}>
                <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-3xl p-6 space-y-4">
                  <DialogHeader>
                    <DialogTitle className="text-base font-black text-amber-400 flex items-center gap-2">
                      <Edit3 className="w-5 h-5" />
                      Editar Informações da Foto
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-400">
                      Atualize a estaca ou descrição. O carimbo técnico da foto será automaticamente atualizado.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 pt-2">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Estaca / Localização:</Label>
                      <Input
                        value={editStation}
                        onChange={e => setEditStation(e.target.value)}
                        placeholder="Ex: Estaca 120+15.0"
                        className="h-11 rounded-2xl bg-slate-950 border-slate-700 text-amber-300 font-black text-sm mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Descrição / Observação:</Label>
                      <Input
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        placeholder="Ex: Execução de meio-fio e Sarjeta"
                        className="h-11 rounded-2xl bg-slate-950 border-slate-700 text-white font-medium text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <Button
                      onClick={() => setEditingPhotoReport(null)}
                      className="h-10 px-4 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
                    >
                      Cancelar
                    </Button>

                    <Button
                      onClick={handleSavePhotoEdit}
                      className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      <Save className="w-4 h-4 stroke-[2.5]" />
                      Salvar Alterações
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                <button onClick={() => setShowPwaGuide(false)} className="text-slate-400 text-xs font-bold px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                  Fechar
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                  <span className="font-extrabold text-blue-400 block">📱 No iPhone (iOS Safari):</span>
                  <p>1. Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta para cima).</p>
                  <p>2. Role a lista e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                  <span className="font-extrabold text-emerald-400 block">🤖 No Android (Google Chrome):</span>
                  <p>1. Toque nos <strong>três pontinhos (⋮)</strong> no canto superior do navegador.</p>
                  <p>2. Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à Tela Inicial"</strong>.</p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Selecione o Aplicativo Desejado:</p>
                
                <Button 
                  onClick={() => {
                    setShowPwaGuide(false);
                    if (!isCamOnly) {
                      handleInstallPwa();
                    } else {
                      window.location.href = '/';
                    }
                  }}
                  className="w-full h-12 bg-slate-950 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 text-white justify-start gap-3 rounded-2xl px-4"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <LayoutDashboard className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-xs">PWA Synera Mobile</span>
                    <span className="text-[9px] text-slate-400 font-normal">Atualização de dados de campo</span>
                  </div>
                </Button>

                <Button 
                  onClick={() => {
                    setShowPwaGuide(false);
                    if (isCamOnly) {
                      handleInstallPwa();
                    } else {
                      window.location.href = '/cam.html';
                    }
                  }}
                  className="w-full h-12 bg-slate-950 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 text-white justify-start gap-3 rounded-2xl px-4"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-xs">PWA Synera Cam</span>
                    <span className="text-[9px] text-slate-400 font-normal">Câmera, estaca GPS e dados da obra</span>
                  </div>
                </Button>
              </div>
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
            className="fixed inset-0 z-50 bg-black text-white w-full h-full overflow-hidden select-none"
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

            {/* PREVIEW DO VÍDEO / FOTO CAPTURADA / CARD DE FALLBACK (POSICIONADO EM TOTAL PREENCHIMENTO DE TELA) */}
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden w-full h-full">
              {cameraStream && !cameraError && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    transform: `rotate(${cameraRotation}deg) ${facingMode === 'user' ? 'scaleX(-1)' : ''}`,
                    transition: 'transform 0.3s ease-in-out'
                  }}
                  className={capturedPhotoUrl ? 'hidden' : 'w-full h-full object-cover'}
                />
              )}

              {capturedPhotoUrl ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black z-0 pt-20 pb-44 px-3 landscape:pt-16 landscape:pb-28 landscape:pl-4 landscape:pr-4 sm:landscape:pr-36 transition-all">
                  <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl bg-slate-950 p-1">
                    <img
                      src={capturedPhotoUrl}
                      alt="Foto de Campo"
                      className="max-w-full max-h-full object-contain rounded-xl select-none"
                    />
                  </div>
                </div>
              ) : cameraStream && !cameraError ? (
                <>
                  {/* Grade de Alinhamento */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/10 z-10">
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
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-sm mx-auto z-10">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-base text-white">Transmissão de Vídeo em Espera</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {cameraError || 'Iniciando captura de vídeo ou aguardando permissão do navegador...'}
                    </p>
                  </div>

                  <div className="w-full space-y-2 pt-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Camera className="w-4 h-4 stroke-[3]" />
                      Usar Câmera Nativa do Celular
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                        className="h-10 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                        Inverter Câmera
                      </Button>

                      <Button
                        onClick={() => {
                          setShowDiagnosticModal(true);
                          runCameraDiagnostics();
                        }}
                        className="h-10 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        Diagnosticar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TOP BAR: CONTROLES DE CÂMERA & OVERLAY DA ESTACA DE PROJETO (DESTACADO / MAIOR) */}
            <div className="absolute top-0 inset-x-0 landscape:right-28 sm:landscape:right-32 p-3 sm:p-4 bg-gradient-to-b from-slate-950/95 via-slate-950/70 to-transparent flex items-center justify-between z-20 pointer-events-auto">
              <button
                onClick={() => setIsCameraOpen(false)}
                className="w-11 h-11 rounded-full bg-slate-900/90 backdrop-blur border border-slate-700 flex items-center justify-center text-white hover:bg-slate-800 transition-colors shadow-lg shrink-0"
              >
                <X className="w-5 h-5" />
              </button>

              {/* OVERLAY DA ESTACA DE PROJETO (MAIOR E DESTACADO PARA O USUÁRIO DE CAMPO) */}
              <div className="flex-1 mx-2 sm:mx-4 flex items-center justify-center">
                <div className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-2xl bg-gradient-to-r from-slate-950/95 via-emerald-950/90 to-slate-950/95 border-2 border-emerald-500/80 backdrop-blur-md flex items-center gap-3 text-emerald-300 shadow-2xl shadow-emerald-950/80 ring-1 ring-emerald-500/30">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
                    <MapPin className="w-5 h-5 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-400 tracking-wider leading-tight flex items-center gap-1">
                      <span>Estaca de Projeto</span>
                    </span>
                    <span className="text-sm sm:text-lg font-black text-white tracking-wide truncate max-w-[170px] sm:max-w-[280px] landscape:max-w-[340px] drop-shadow-sm">
                      {nearestStationInfo
                        ? `${nearestStationInfo.station} (${nearestStationInfo.distanceMeters}m)`
                        : isLocating
                        ? 'Buscando estaca...'
                        : photoStation || 'Aguardando GPS...'}
                    </span>
                  </div>
                  <button
                    onClick={fetchUserGps}
                    className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 text-emerald-300 transition-all active:scale-95 shrink-0 ml-1"
                    title="Atualizar GPS da Estaca de Projeto"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* MENU SUPERIOR DA CÂMERA (Carimbo, Configurações e Alternar Câmera) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowStampInfoModal(true)}
                  className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1 backdrop-blur shadow-lg shadow-emerald-500/10"
                  title="Informações do Carimbo (Abrir Gaveta Lateral)"
                >
                  <Stamp className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">Carimbo</span>
                </button>

                <button
                  onClick={() => setShowStampSettingsModal(true)}
                  className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 text-xs font-bold backdrop-blur transition-all"
                  title="Configurações (Estilo e Posição)"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  className={`p-2 rounded-xl border text-xs font-bold backdrop-blur transition-all ${
                    facingMode === 'user' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-slate-900/80 text-slate-400 border-slate-700'
                  }`}
                  title={facingMode === 'user' ? 'Câmera Frontal Ativa (Mudar para Traseira)' : 'Câmera Traseira Ativa (Mudar para Frontal)'}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LANDSCAPE LATERAL BARRA DIREITA DE CONTROLES (ESTILO CÂMERA PROFISSIONAL EM PAISAGEM) */}
            <div className={`${capturedPhotoUrl ? 'hidden' : 'hidden landscape:flex'} fixed right-0 top-0 bottom-0 w-28 sm:w-32 bg-slate-950/90 backdrop-blur-xl border-l border-slate-800/80 flex-col items-center justify-between py-6 px-2 z-30 pointer-events-auto`}>
              {/* Topo: Inverter Câmera & Câmera Celular */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-all active:scale-95 text-center shadow-lg w-20"
                  title="Abrir Câmera Nativa do Celular (HD/4K)"
                >
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <span className="text-[8px] font-extrabold uppercase tracking-tight leading-none">Câmera Celular</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-blue-400 transition-all active:scale-95 text-center shadow-lg w-20"
                  title={facingMode === 'user' ? 'Mudar para Câmera Traseira' : 'Mudar para Câmera Frontal'}
                >
                  <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                  <span className="text-[8px] font-extrabold uppercase tracking-tight leading-none">Inverter</span>
                </button>
              </div>

              {/* Centro: Botão de Disparo Principal (Tirar Foto) */}
              <button
                type="button"
                onClick={handleTakePhoto}
                className="relative group p-1 flex flex-col items-center gap-1 my-auto"
                title="Tirar Foto com Carimbo Técnico (Synera Cam)"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-1 shadow-2xl shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-full border-2 border-emerald-400/80 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                    <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-pulse" />
                  </div>
                </div>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Tirar Foto</span>
              </button>

              {/* Base: Abrir Gaveta do Carimbo */}
              <button
                type="button"
                onClick={() => setShowStampInfoModal(true)}
                className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-all active:scale-95 text-center shadow-lg w-20"
                title="Informações do Carimbo"
              >
                <Stamp className="w-5 h-5 text-emerald-400" />
                <span className="text-[8px] font-extrabold uppercase tracking-tight leading-none">Carimbo</span>
              </button>
            </div>

            {/* BARRA INFERIOR DE CAPTURA E INFORMAÇÃO */}
            <div className={`${capturedPhotoUrl ? 'flex' : 'landscape:hidden flex'} absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent z-20 space-y-2 flex-col items-center pointer-events-auto`}>
              <div className="max-w-md w-full">
                <div 
                  onClick={() => setShowStampInfoModal(true)}
                  className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/50 p-2.5 sm:p-3 landscape:p-1.5 landscape:px-3 rounded-2xl mb-1.5 landscape:mb-1 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 landscape:w-7 landscape:h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                      <Stamp className="w-4 h-4 sm:w-5 sm:h-5 landscape:w-3.5 landscape:h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] landscape:text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        Informações do Carimbo
                      </span>
                      <span className="text-xs landscape:text-[11px] text-white font-medium truncate max-w-[200px] sm:max-w-[280px]">
                        {photoDescription || photoStation ? (
                          <>{photoStation ? `[${photoStation}] ` : ''}{photoDescription || 'Sem observações'}</>
                        ) : (
                          'Toque para abrir a gaveta do carimbo...'
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="p-1.5 text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                {capturedPhotoUrl ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Button
                      onClick={() => {
                        setCapturedPhotoUrl(null);
                        setPhotoDescription('');
                      }}
                      className="w-full h-11 sm:h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider backdrop-blur"
                    >
                      Descartar
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSavePhotoRecord}
                        className="flex-1 h-11 sm:h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-500/25"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        Salvar
                      </Button>
                      <button 
                        onClick={() => handleDownloadPhoto(capturedPhotoUrl)}
                        title="Salvar foto no dispositivo / galeria"
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 flex items-center justify-center border border-slate-700 text-white shrink-0 backdrop-blur"
                      >
                        <Download className="w-5 h-5 text-blue-400" />
                      </button>

                      <button 
                        onClick={() => handleSharePhoto(capturedPhotoUrl, photoDescription)}
                        title="Compartilhar foto"
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 flex items-center justify-center border border-slate-700 text-white shrink-0 backdrop-blur"
                      >
                        <Share2 className="w-5 h-5 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-around gap-3 pt-0.5 pb-0.5">
                    {/* Botão para Alternar p/ Câmera Nativa do Celular */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-1 p-2 sm:px-4 rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-all active:scale-95 text-center min-w-[85px] sm:min-w-[95px] shadow-lg"
                      title="Abrir Câmera Nativa do Celular (HD/4K)"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight leading-tight">Câmera Celular</span>
                    </button>

                    {/* Botão Único de Disparo da Câmera Synera Cam */}
                    <button
                      type="button"
                      onClick={handleTakePhoto}
                      className="relative group p-1 flex flex-col items-center gap-0.5"
                      title="Tirar Foto com Carimbo Técnico (Synera Cam)"
                    >
                      <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-1 shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center">
                        <div className="w-full h-full bg-slate-950 rounded-full border-2 border-emerald-400/80 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                          <Camera className="w-7 h-7 sm:w-9 sm:h-9 text-emerald-400 animate-pulse" />
                        </div>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-widest">Tirar Foto</span>
                    </button>

                    {/* Botão para Alternar Câmera Frontal / Traseira */}
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                      className="flex flex-col items-center gap-1 p-2 sm:px-4 rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-blue-400 transition-all active:scale-95 text-center min-w-[85px] sm:min-w-[95px] shadow-lg"
                      title={facingMode === 'user' ? 'Mudar para Câmera Traseira' : 'Mudar para Câmera Frontal'}
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight leading-tight">Inverter Câmera</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST DE SINCRONIZAÇÃO EM SEGUNDO PLANO */}
      <AnimatePresence>
        {(isSyncing || syncSuccessMsg) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-16 left-4 right-4 max-w-md mx-auto z-50 flex items-center justify-between p-3.5 bg-slate-900/95 border border-emerald-500/50 text-white rounded-2xl shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">
                  {isSyncing ? 'Sincronizando em segundo plano...' : syncSuccessMsg}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isSyncing ? 'Enviando apontamentos locais para o servidor' : 'Sua base de dados móvel está atualizada'}
                </p>
              </div>
            </div>
            {!isSyncing && (
              <button onClick={() => setSyncSuccessMsg(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* RODAPÉ FIXO DE NAVEGAÇÃO DO SYNERA MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md landscape:max-w-5xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 py-2 px-4 z-40 flex items-center justify-around shadow-2xl transition-all">
        <button
          onClick={() => setActiveSector(null)}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeSector === null ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[10px]">Início</span>
        </button>

        {isCamOnly ? (
          <button
            onClick={() => setActiveSector('projetos_baixados' as any)}
            className={`flex flex-col items-center gap-1 transition-colors relative ${
              activeSector === ('projetos_baixados' as any) ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderDown className="w-5 h-5" />
            <span className="text-[10px]">Projetos</span>
            {camDownloadedProjects.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1 rounded-full bg-emerald-500 text-slate-950 text-[8px] font-black">
                {camDownloadedProjects.length}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => setActiveSector('registros')}
            className={`flex flex-col items-center gap-1 transition-colors relative ${
              activeSector === 'registros' ? 'text-blue-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px]">Registros</span>
            {userFieldReports.filter(r => r.status === 'pending' || !r.syncedAt).length > 0 && (
              <span className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        )}

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
          onClick={handleProcessSync}
          disabled={isSyncing}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors relative"
          title="Sincronizar dados em segundo plano"
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          <span className="text-[10px]">{isSyncing ? 'Sincronizando' : 'Sincronizar'}</span>
          {offlineQueue.length > 0 && (
            <span className="absolute -top-1 right-2 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black">
              {offlineQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowOptionsMenu(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors relative"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Opções</span>
        </button>

      </div>
      
      {/* MENU DE OPÇÕES (FOOTER) */}
      <AnimatePresence>
        {showOptionsMenu && (
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
                <div className="flex items-center gap-2 font-black text-base text-slate-200">
                  <Settings className="w-5 h-5" />
                  <span>Opções</span>
                </div>
                <button onClick={() => setShowOptionsMenu(false)} className="text-slate-400 text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg">
                  Fechar
                </button>
              </div>

              
              <div className="flex flex-col gap-3 py-2">
                <Button 
                  onClick={() => { setShowOptionsMenu(false); if(!isCamOnly) { handleInstallPwa(); } else { window.location.href = "/"; } }}
                  className="h-14 bg-slate-950 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 text-white justify-start gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-sm">Instalar Synera Mobile</span>
                    <span className="text-[10px] text-slate-400 font-normal">Apontamentos, diários, equipes e frota</span>
                  </div>
                </Button>

                <Button 
                  onClick={() => { setShowOptionsMenu(false); if(isCamOnly) { handleInstallPwa(); } else { window.location.href = "/cam.html"; } }}
                  className="h-14 bg-slate-950 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 text-white justify-start gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-sm">Instalar Synera Cam</span>
                    <span className="text-[10px] text-slate-400 font-normal">Fotos com coordenadas GPS, estaca e carimbo</span>
                  </div>
                </Button>

                <Button 
                  onClick={() => { 
                    setShowOptionsMenu(false); 
                    setShowDiagnosticModal(true);
                    runCameraDiagnostics();
                  }}
                  className="h-14 bg-slate-950 border border-slate-700 hover:border-purple-500 hover:bg-slate-800 text-white justify-start gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-sm">Diagnóstico de Câmera & Sistema</span>
                    <span className="text-[10px] text-slate-400 font-normal">Verificar funcionamento da câmera e permissões</span>
                  </div>
                </Button>

                <Button 
                  onClick={() => { 
                    setShowOptionsMenu(false); 
                    handleProcessSync();
                  }}
                  className="h-14 bg-slate-950 border border-slate-700 hover:border-amber-500 hover:bg-slate-800 text-white justify-start gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-sm">Sincronizar Dados em Segundo Plano</span>
                    <span className="text-[10px] text-slate-400 font-normal">Enviar pendências e atualizar base de dados</span>
                  </div>
                </Button>

                {onLogout && (
                  <Button 
                    onClick={() => { setShowOptionsMenu(false); onLogout(); }}
                    className="h-14 bg-slate-950 border border-slate-700 hover:border-rose-500 hover:bg-slate-800 text-rose-400 justify-start gap-4 mt-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                      <LogOut className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="font-bold text-sm text-rose-400">Sair do Sistema</span>
                      <span className="text-[10px] text-rose-500/70 font-normal">Fazer logout da conta atual</span>
                    </div>
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE DIAGNÓSTICO E VERIFICAÇÃO DE CÂMERA */}
      <AnimatePresence>
        {showDiagnosticModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-5 text-white space-y-4 shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Diagnóstico de Câmera</h3>
                    <p className="text-[10px] text-purple-300 font-semibold">Synera Cam & Synera Mobile</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiagnosticModal(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-3 pr-1 custom-scrollbar">
                {isDiagnosing ? (
                  <div className="py-12 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-white">Testando componentes de hardware e permissões...</p>
                    <p className="text-[11px] text-slate-400">Verificando suporte WebRTC, sensores de vídeo e GPS de campo.</p>
                  </div>
                ) : diagnosticResults ? (
                  <>
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-emerald-400" />
                          Transmissão de Vídeo (WebRTC)
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          diagnosticResults.mediaSupported ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {diagnosticResults.mediaSupported ? '✓ Suportado' : '⚠️ Limitado'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {diagnosticResults.mediaSupported
                          ? 'A API de vídeo em tempo real está ativa no seu navegador.'
                          : 'A transmissão ao vivo não está disponível diretamente neste ambiente. O modo de Câmera Nativa garantirá o uso.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-400" />
                          Permissão da Câmera
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          diagnosticResults.permissionState === 'granted' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {diagnosticResults.permissionState === 'granted' ? '✓ Permitida' : '⚠️ Verifique Permissão'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Status de permissão do navegador: <strong className="text-white uppercase">{diagnosticResults.permissionState}</strong>.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                          <Grid className="w-4 h-4 text-purple-400" />
                          Sensores de Câmera Física
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          {diagnosticResults.devicesCount > 0 ? `${diagnosticResults.devicesCount} Câmera(s)` : 'Modo Nativo'}
                        </span>
                      </div>
                      {diagnosticResults.devicesList.length > 0 ? (
                        <ul className="text-[11px] text-slate-400 space-y-1">
                          {diagnosticResults.devicesList.map((dev, i) => (
                            <li key={i} className="flex items-center gap-1 text-slate-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{dev}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-400">Câmeras gerenciadas diretamente pelo sistema operacional do celular.</p>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          GPS de Obra & Estaca
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          diagnosticResults.gpsWorking ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}>
                          {diagnosticResults.gpsWorking ? '✓ Ativo' : '✗ Indisponível'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {diagnosticResults.gpsWorking
                          ? 'Geolocalização pronta para estampar coordenadas e estacas nas fotos.'
                          : 'Ative o GPS nas configurações do celular para estampar a estaca da obra nas fotos.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Garantia de Funcionamento Nativo (100%)</span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                        O Synera possui sistema de captura nativa embutido. Caso o navegador bloqueie a transmissão ao vivo, o botão <strong>"Usar Câmera Nativa"</strong> abre diretamente o aplicativo de câmera do celular sem falhas.
                      </p>
                    </div>

                    <div className="pt-2 space-y-2">
                      <Button
                        onClick={() => {
                          setShowDiagnosticModal(false);
                          setIsCameraOpen(true);
                        }}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Camera className="w-4.5 h-4.5 stroke-[2.5]" />
                        Testar Câmera Agora
                      </Button>

                      <Button
                        onClick={runCameraDiagnostics}
                        className="w-full h-10 rounded-xl bg-slate-950 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                        Refazer Verificação Tecnica
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* ==================================================== */}
      {/* GAVETA LATERAL DE INFORMAÇÕES DO CARIMBO TÉCNICO     */}
      {/* ==================================================== */}
      <Sheet open={showStampInfoModal} onOpenChange={setShowStampInfoModal}>
        <SheetContent side="right" className="bg-slate-900 border-l border-slate-800 text-white w-full sm:max-w-md p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
          <div className="space-y-6">
            <SheetHeader className="p-0 border-b border-slate-800 pb-4">
              <SheetTitle className="text-base font-black text-emerald-400 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Stamp className="w-5 h-5" />
                </div>
                Informações do Carimbo
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-400">
                Preencha ou ajuste os dados de campo (estaca, observações) para o carimbo da foto.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5">
              {/* Estaca */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Estaca Calculada / Informada
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={photoStation}
                    onChange={e => setPhotoStation(e.target.value)}
                    placeholder="Ex: Estaca 10+15,00"
                    className="bg-slate-950 border-slate-800 text-sm text-emerald-400 font-bold rounded-xl h-12 flex-1"
                  />
                  {nearestStationInfo && (
                    <button
                      type="button"
                      onClick={() => setPhotoStation(nearestStationInfo.station)}
                      className="h-12 px-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 transition-colors shrink-0"
                    >
                      Usar GPS ({nearestStationInfo.station})
                    </button>
                  )}
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                  Descrição / Observação da Foto
                </label>
                <textarea
                  value={photoDescription}
                  onChange={e => setPhotoDescription(e.target.value)}
                  placeholder="Escreva a descrição (ex: Concretagem de pilar, armadura, inspeção de aterro...)"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 rounded-xl p-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Obra Ativa */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  Obra / Contrato
                </label>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium">
                  {activeContract?.name || activeContract?.workName || 'Obra Principal'}
                </div>
              </div>

              {/* Atalho para configurações de estilo */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowStampInfoModal(false);
                    setShowStampSettingsModal(true);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    Personalizar Estilo e Cores do Carimbo
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <Button
              onClick={() => setShowStampInfoModal(false)}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4 stroke-[3] mr-2" />
              Confirmar Informações
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ==================================================== */}
      {/* MODAL DE CONFIGURAÇÃO DO CARIMBO TÉCNICO DE FOTO */}
      {/* ==================================================== */}
      <Dialog open={showStampSettingsModal} onOpenChange={setShowStampSettingsModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg rounded-3xl p-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-black text-emerald-400 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Configurar Carimbo Técnico de Foto
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Personalize o formato, posição, cores e quais dados da obra serão gravados permanentemente nas imagens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* 1. MODELO VISUAL DO CARIMBO */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                1. Modelo Visual do Carimbo
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'hud_banner', name: 'HUD Banner Pro', desc: 'Faixa inferior escura com destaque neon' },
                  { id: 'corner_badge', name: 'Badge Flutuante', desc: 'Cartão de canto elegante e compacto' },
                  { id: 'subtle_bottom', name: 'Legenda Nítida', desc: 'Texto limpo com sombra suave' },
                  { id: 'full_watermark', name: 'Marca d\'Água Completa', desc: 'Cabeçalho oficial com metadados' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateStampConfig({ style: m.id as any })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      stampConfig.style === m.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-white font-bold ring-2 ring-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-black text-emerald-400">{m.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. POSICIONAMENTO NA FOTO */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                2. Posição do Carimbo
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'bottom', label: '⬇️ Inferior Central' },
                  { id: 'bottom_left', label: '↙️ Inferior Esquerda' },
                  { id: 'bottom_right', label: '↘️ Inferior Direita' },
                  { id: 'top_left', label: '↖️ Superior Esquerda' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => updateStampConfig({ position: p.id as any })}
                    className={`p-2.5 rounded-xl border text-center text-[11px] font-bold transition-all ${
                      stampConfig.position === p.id
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. COR DE ACENTO E TAMANHO DA FONTE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Cor do Acento Técnico
                </Label>
                <div className="flex items-center gap-2">
                  {[
                    { color: '#10B981', label: 'Verde' },
                    { color: '#F59E0B', label: 'Laranja' },
                    { color: '#38BDF8', label: 'Azul' },
                    { color: '#D946EF', label: 'Roxo' },
                    { color: '#E11D48', label: 'Vermelho' },
                    { color: '#FFFFFF', label: 'Branco' }
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => updateStampConfig({ themeColor: c.color })}
                      style={{ backgroundColor: c.color }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        stampConfig.themeColor === c.color ? 'scale-110 border-white ring-2 ring-emerald-400' : 'border-slate-800 opacity-80'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Tamanho do Texto
                </Label>
                <div className="flex gap-1.5">
                  {[
                    { id: 'sm', label: 'Pequeno' },
                    { id: 'md', label: 'Médio' },
                    { id: 'lg', label: 'Grande' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => updateStampConfig({ fontSize: s.id as any })}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${
                        stampConfig.fontSize === s.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. OPACIDADE DO FUNDO DO CARIMBO */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                <span>Opacidade do Fundo ({Math.round((stampConfig.bgOpacity ?? 0.85) * 100)}%)</span>
              </div>
              <div className="flex gap-2">
                {[
                  { val: 0, label: 'Transparente (0%)' },
                  { val: 0.5, label: 'Sutil (50%)' },
                  { val: 0.85, label: 'Padrão (85%)' },
                  { val: 1.0, label: 'Opaco (100%)' }
                ].map(o => (
                  <button
                    key={o.val}
                    type="button"
                    onClick={() => updateStampConfig({ bgOpacity: o.val })}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border ${
                      stampConfig.bgOpacity === o.val
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. SELEÇÃO DE CAMPOS VISÍVEIS */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Campos a Gravar na Foto
              </Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => updateStampConfig({ showWorkName: !stampConfig.showWorkName })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between font-bold transition-colors ${
                    stampConfig.showWorkName ? 'bg-slate-800 border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>Obra / Contrato</span>
                  {stampConfig.showWorkName ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => updateStampConfig({ showStation: !stampConfig.showStation })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between font-bold transition-colors ${
                    stampConfig.showStation ? 'bg-slate-800 border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>Estaca de Projeto</span>
                  {stampConfig.showStation ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => updateStampConfig({ showDateTime: !stampConfig.showDateTime })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between font-bold transition-colors ${
                    stampConfig.showDateTime ? 'bg-slate-800 border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>Data e Hora</span>
                  {stampConfig.showDateTime ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => updateStampConfig({ showCoordinates: !stampConfig.showCoordinates })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between font-bold transition-colors ${
                    stampConfig.showCoordinates ? 'bg-slate-800 border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>Coordenadas GPS</span>
                  {stampConfig.showCoordinates ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => updateStampConfig({ showDescription: !stampConfig.showDescription })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between font-bold transition-colors ${
                    stampConfig.showDescription ? 'bg-slate-800 border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>Observações</span>
                  {stampConfig.showDescription ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => updateStampConfig({ showLogoBadge: !stampConfig.showLogoBadge })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between font-bold transition-colors ${
                    stampConfig.showLogoBadge ? 'bg-slate-800 border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>Badge Cabeçalho</span>
                  {stampConfig.showLogoBadge ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 6. TÍTULO PERSONALIZADO DO CABEÇALHO */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">
                Título Personalizado do Cabeçalho
              </Label>
              <Input
                value={stampConfig.customHeaderTitle}
                onChange={e => updateStampConfig({ customHeaderTitle: e.target.value })}
                placeholder="Ex: SYNERA CAM • REGISTRO DE CAMPO"
                className="bg-slate-950 border-slate-800 text-xs text-white rounded-xl h-10 font-bold"
              />
            </div>

            {/* 7. SIMULADOR DE PRÉ-VISUALIZAÇÃO AO VIVO */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <Label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Pré-Visualização do Carimbo em Tempo Real
              </Label>
              <div className="relative w-full h-44 rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80"
                  alt="Simulação de Campo"
                  className="w-full h-full object-cover opacity-80"
                />

                {/* SIMULAÇÃO DO CARIMBO CONFORME STAMPCONFIG */}
                <div
                  className={`absolute p-2.5 rounded-2xl border backdrop-blur text-left transition-all max-w-[90%] ${
                    stampConfig.position === 'top_left' ? 'top-2 left-2' :
                    stampConfig.position === 'bottom_left' ? 'bottom-2 left-2' :
                    stampConfig.position === 'bottom_right' ? 'bottom-2 right-2' :
                    'bottom-2 left-2 right-2'
                  }`}
                  style={{
                    backgroundColor: `rgba(2, 6, 23, ${stampConfig.bgOpacity ?? 0.85})`,
                    borderColor: `${stampConfig.themeColor || '#10B981'}50`,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                  }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                    style={{ backgroundColor: stampConfig.themeColor || '#10B981' }}
                  />
                  {stampConfig.showLogoBadge && (
                    <div className="text-[10px] font-black pb-1 mb-1 border-b border-white/10" style={{ color: stampConfig.themeColor || '#10B981' }}>
                      📷 {stampConfig.customHeaderTitle || 'SYNERA CAM • REGISTRO DE CAMPO'}
                    </div>
                  )}
                  <div className="space-y-0.5 text-[9px] font-bold text-white pl-1">
                    {stampConfig.showWorkName && <div>OBRA: Obra de Teste Simulada</div>}
                    {(stampConfig.showStation || stampConfig.showDateTime) && (
                      <div className="text-amber-400">
                        {stampConfig.showStation && 'ESTACA: 120+15,00'}
                        {stampConfig.showStation && stampConfig.showDateTime && '   |   '}
                        {stampConfig.showDateTime && `DATA: ${new Date().toLocaleDateString('pt-BR')}`}
                      </div>
                    )}
                    {stampConfig.showCoordinates && <div className="text-sky-400">GPS: -23.5505, -46.6333</div>}
                    {stampConfig.showDescription && <div className="text-slate-300 italic">OBS: Inspeção de concretagem</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                onClick={() => updateStampConfig(DEFAULT_STAMP_CONFIG)}
                variant="outline"
                className="flex-1 h-11 rounded-2xl border-slate-700 text-slate-300 text-xs font-bold"
              >
                Restaurar Padrão
              </Button>
              <Button
                type="button"
                onClick={() => setShowStampSettingsModal(false)}
                className="flex-1 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase"
              >
                Concluir e Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
