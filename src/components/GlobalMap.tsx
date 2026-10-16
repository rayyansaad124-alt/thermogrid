/* ArcGIS classes are loaded dynamically and have no local TypeScript declarations. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useEffect, useCallback, useState } from 'react';
import { loadModules } from 'esri-loader';
import type { WildfireAlert } from '@/types';
import { Flame, Activity, Layers as LayersIcon, LocateFixed } from 'lucide-react';

interface GlobalMapProps {
  alerts: WildfireAlert[];
  onSelect: (id: string) => void;
  compact?: boolean;
}

type ThermalLevel = 'high' | 'medium' | 'low';

const levelHex: Record<ThermalLevel, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#22c55e',
};

function getThermalLevel(confidence: number): ThermalLevel {
  if (confidence >= 70) return 'high';
  if (confidence >= 40) return 'medium';
  return 'low';
}

function getLevelRGB(level: ThermalLevel): [number, number, number] {
  switch (level) {
    case 'high': return [239, 68, 68];
    case 'medium': return [249, 115, 22];
    case 'low': return [34, 197, 94];
  }
}

interface EsriBundle {
  Map: any;
  MapView: any;
  Graphic: any;
  GraphicsLayer: any;
  Point: any;
}

export default function GlobalMap({ alerts, onSelect, compact }: GlobalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const graphicsLayerRef = useRef<any>(null);
  const pulseLayerRef = useRef<any>(null);
  const esriRef = useRef<EsriBundle | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [locationError, setLocationError] = useState(false);
  onSelectRef.current = onSelect;

  const createMap = useCallback((esri: EsriBundle) => {
    const map = new esri.Map({
      basemap: 'satellite',
    });

    const graphicsLayer = new esri.GraphicsLayer();
    const pulseLayer = new esri.GraphicsLayer();
    map.addMany([pulseLayer, graphicsLayer]);

    mapRef.current = map;
    graphicsLayerRef.current = graphicsLayer;
    pulseLayerRef.current = pulseLayer;

    return map;
  }, []);

  const createView = useCallback((esri: EsriBundle, map: any): any => {
    if (!containerRef.current) return null;

    return new esri.MapView({
      map,
      container: containerRef.current,
      center: [10, 20] as [number, number],
      zoom: compact ? 2 : 3,
      constraints: {
        minZoom: 1,
        maxZoom: 16,
      },
      ui: {
        components: ['zoom', 'compass'],
      },
    });
  }, [compact]);

  const addAlertGraphics = useCallback((esri: EsriBundle, activeAlerts: WildfireAlert[]) => {
    const graphicsLayer = graphicsLayerRef.current;
    const pulseLayer = pulseLayerRef.current;
    if (!graphicsLayer || !pulseLayer) return;

    graphicsLayer.removeAll();
    pulseLayer.removeAll();

    for (const alert of activeAlerts) {
      const level = getThermalLevel(alert.confidence);
      const isActive = alert.status === 'active';
      const [r, g, b] = getLevelRGB(level);

      const point = new esri.Point({
        longitude: alert.longitude,
        latitude: alert.latitude,
      });

      const attributes = {
        id: alert.id,
        region: alert.region,
        confidence: alert.confidence,
        area_acres: alert.area_acres,
        severity: alert.severity,
        status: alert.status,
        temperature_c: alert.temperature_c,
      };

      if (isActive) {
        const pulseGraphic = new esri.Graphic({
          geometry: point,
          symbol: {
            type: 'simple-marker',
            style: 'circle',
            color: [r, g, b, 0.15],
            size: 28,
            outline: { color: [r, g, b, 0.4], width: 1 },
          },
          attributes,
        });
        pulseLayer.add(pulseGraphic);
      }

      const markerGraphic = new esri.Graphic({
        geometry: point,
        symbol: {
          type: 'simple-marker',
          style: 'circle',
          color: [r, g, b, isActive ? 0.85 : 0.5],
          size: isActive ? 14 : 10,
          outline: { color: [255, 255, 255, 0.8], width: 1.5 },
        },
        attributes,
        popupTemplate: {
          title: alert.title,
          content: [
            {
              type: 'fields',
              fieldInfos: [
                { fieldName: 'region', label: 'Region' },
                { fieldName: 'confidence', label: 'Thermal Confidence', format: { places: 0, suffix: '%' } },
                { fieldName: 'area_acres', label: 'Area (acres)', format: { places: 0, digitSeparator: true } },
                { fieldName: 'severity', label: 'Severity' },
                { fieldName: 'status', label: 'Status' },
                { fieldName: 'temperature_c', label: 'Temperature', format: { places: 1, suffix: ' C' } },
              ],
            },
          ],
        },
      });

      graphicsLayer.add(markerGraphic);
    }
  }, []);

  const setupClickHandler = useCallback((view: any) => {
    view.on('click', (event: any) => {
      view.hitTest(event).then((response: any) => {
        for (const result of response.results) {
          const id = result?.graphic?.attributes?.id;
          if (typeof id === 'string') {
            onSelectRef.current(id);
            break;
          }
        }
      });
    });
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setMapError(false);

    loadModules([
      'esri/Map',
      'esri/views/MapView',
      'esri/Graphic',
      'esri/layers/GraphicsLayer',
      'esri/geometry/Point',
    ], {
      css: false,
    }).then(([Map, MapView, Graphic, GraphicsLayer, Point]: any[]) => {
      if (cancelled || !containerRef.current) return;

      const esri: EsriBundle = { Map, MapView, Graphic, GraphicsLayer, Point };
      esriRef.current = esri;

      createMap(esri);

      const view = createView(esri, mapRef.current);
      if (!view) return;
      viewRef.current = view;

      view.when().then(() => {
        if (cancelled) return;
        addAlertGraphics(esri, alerts);
        setupClickHandler(view);
        setReady(true);
      }).catch(() => {
        if (!cancelled) setMapError(true);
      });
    }).catch(() => {
      if (!cancelled) setMapError(true);
    });

    return () => {
      cancelled = true;
      setReady(false);
      if (viewRef.current) {
        try { viewRef.current.container = null; } catch { /* ignore */ }
        try { viewRef.current.destroy(); } catch { /* ignore */ }
        viewRef.current = null;
      }
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch { /* ignore */ }
        mapRef.current = null;
      }
      graphicsLayerRef.current = null;
      pulseLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken]);

  // Update graphics when alerts change
  useEffect(() => {
    const esri = esriRef.current;
    if (!esri || !ready) return;
    addAlertGraphics(esri, alerts);
  }, [alerts, ready, addAlertGraphics]);



  const activeCount = alerts.filter((a) => a.status === 'active').length;

  const useMyLocation = () => {
    if (!navigator.geolocation || !viewRef.current) {
      setLocationError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationError(false);
        viewRef.current.goTo({ center: [coords.longitude, coords.latitude], zoom: 7 });
      },
      () => setLocationError(true),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-default bg-panel ${compact ? '' : 'flex flex-col h-full'}`}>
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-default bg-panel/80 px-5 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" />
          <h3 className="font-semibold text-primary">Global Fire Map</h3>
          <span className="ml-2 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5">
            <div className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-[10px] font-medium text-emerald-400">Live</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <button onClick={useMyLocation} className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 hover:bg-panel-hover hover:text-primary" aria-label="Use my location to find nearby fires">
            <LocateFixed className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Use my location</span>
          </button>
          <span className="hidden items-center gap-1.5 sm:flex"><LayersIcon className="h-3.5 w-3.5" />Satellite Tiles</span>
        </div>
      </div>

      {/* Map container — always visible, Esri attaches here */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          flex: compact ? 'none' : '1 1 0%',
          height: compact ? 300 : '100%',
          minHeight: compact ? 300 : 400,
        }}
        className="relative z-0"
      />

      {locationError && <p role="status" className="absolute right-3 top-16 z-20 rounded-lg border border-orange-500/40 bg-slate-950/90 px-3 py-2 text-xs text-orange-200">Location access was unavailable.</p>}

      {/* Loading indicator */}
      {!ready && !mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-panel/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-default border-t-cyan-400" role="status" aria-label="Loading map" />
            <p className="text-xs text-muted">Loading Esri satellite imagery...</p>
          </div>
        </div>
      )}

      {mapError && (
        <div role="alert" className="absolute inset-0 z-20 flex items-center justify-center bg-panel/95 px-6 text-center">
          <div className="flex max-w-xs flex-col items-center gap-3">
            <Flame className="h-8 w-8 text-orange-400" />
            <p className="text-sm font-medium text-primary">The map could not load.</p>
            <p className="text-xs text-muted">Check your connection and try again.</p>
            <button onClick={() => setRetryToken((token) => token + 1)} className="min-h-11 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Retry map</button>
          </div>
        </div>
      )}

      {/* Bottom-left badge: active detections */}
      <div
        className="pointer-events-none absolute z-10 left-3 bottom-3"
        style={{ marginBottom: compact ? '8px' : '24px' }}
      >
        <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-space-950/85 px-3 py-2 shadow-xl backdrop-blur-sm">
          <div className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </div>
          <span className="text-xs font-bold text-white">{activeCount}</span>
          <span className="text-[11px] font-medium text-slate-300">active detections</span>
        </div>
      </div>

      {/* Bottom-right legend: THERMAL DETECTION */}
      <div
        className="pointer-events-none absolute z-10 right-3 bottom-3"
        style={{ marginBottom: compact ? '8px' : '24px', marginRight: compact ? '8px' : '12px' }}
      >
        <div className="rounded-lg border border-slate-700/60 bg-space-950/85 px-3.5 py-3 shadow-xl backdrop-blur-sm">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Thermal Detection</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: levelHex.high, boxShadow: `0 0 6px ${levelHex.high}` }} />
              <span className="text-[11px] font-medium text-slate-300">High</span>
              <span className="text-[10px] text-slate-500">70-100</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: levelHex.medium, boxShadow: `0 0 6px ${levelHex.medium}` }} />
              <span className="text-[11px] font-medium text-slate-300">Medium</span>
              <span className="text-[10px] text-slate-500">40-69</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: levelHex.low, boxShadow: `0 0 6px ${levelHex.low}` }} />
              <span className="text-[11px] font-medium text-slate-300">Low</span>
              <span className="text-[10px] text-slate-500">0-39</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
