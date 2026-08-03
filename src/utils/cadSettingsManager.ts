// CAD & Topography Visualization Settings Manager
// Handles persistence in localStorage and configuration export/import

export interface CadViewSettings {
  enableGoogleMaps: boolean;
  googleMapsLayerType: 'google_hybrid' | 'google_satellite' | 'google_roadmap' | 'google_terrain';
  canvasBgColor: string;
  centerlineColor: string;
  centerlineWeight: number;
  centerlineDashArray: string;
  showStations: boolean;
  minStationZoom: number;
  stationTickColor: string;
  stationTextColor: string;
  stationFontSize: number;
  stationStep: number;
  showStationTicks: boolean;
  stationTextRotation: number;
}

export const DEFAULT_CAD_SETTINGS: CadViewSettings = {
  enableGoogleMaps: false, // OFF by default for lightweight performance
  googleMapsLayerType: 'google_hybrid',
  canvasBgColor: '#12161f', // Dark CAD background
  centerlineColor: '#facc15', // Yellow centerline (Linha de eixo amarela)
  centerlineWeight: 3,
  centerlineDashArray: '',
  showStations: true, // Display stations by default when zoomed in
  minStationZoom: 15, // Only display labels when zoom >= 15
  stationTickColor: '#22c55e', // Green perpendicular tick mark (Ponto/Linha verde)
  stationTextColor: '#22c55e', // Green station text (Texto verde como na imagem CAD)
  stationFontSize: 13,
  stationStep: 1,
  showStationTicks: true,
  stationTextRotation: 0,
};

const STORAGE_KEY = 'cad_visualization_settings_v2';

export function loadCadSettings(): CadViewSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CAD_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load CAD visualization settings:', err);
  }
  return { ...DEFAULT_CAD_SETTINGS };
}

export function saveCadSettings(settings: CadViewSettings): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Failed to save CAD visualization settings:', err);
    return false;
  }
}

export function resetCadSettings(): CadViewSettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset CAD settings:', err);
  }
  return { ...DEFAULT_CAD_SETTINGS };
}

export function exportCadSettingsScript(settings: CadViewSettings): void {
  const jsonStr = JSON.stringify(settings, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `config_visualizacao_estacas_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
