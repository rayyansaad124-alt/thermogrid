import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Satellite, Loader2, CheckCircle2, AlertCircle, Key, ExternalLink, Settings2 } from 'lucide-react';

interface FirmsSyncResult {
  synced: number;
  total: number;
  source: string;
  timestamp: string;
  detections?: Array<{
    title: string;
    region: string;
    severity: string;
    confidence: number;
    satellite_source: string;
  }>;
}

const MAP_KEY_STORAGE = 'firms_map_key';
const SENSOR_STORAGE = 'firms_sensor';

export default function FirmsSyncControl() {
  const [mapKey, setMapKey] = useState('');
  const [sensor, setSensor] = useState<'viirs' | 'modis'>('viirs');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<FirmsSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem(MAP_KEY_STORAGE) ?? '';
    const savedSensor = (localStorage.getItem(SENSOR_STORAGE) as 'viirs' | 'modis') ?? 'viirs';
    setMapKey(savedKey);
    setSensor(savedSensor);
  }, []);

  const syncFirms = useCallback(async () => {
    if (!mapKey.trim()) {
      setError('Enter your NASA FIRMS MAP_KEY to sync live fire data.');
      setShowSettings(true);
      return;
    }

    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      localStorage.setItem(MAP_KEY_STORAGE, mapKey.trim());
      localStorage.setItem(SENSOR_STORAGE, sensor);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-firms-data`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          mapKey: mapKey.trim(),
          sensor,
          region: 'Global',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? `Sync failed (${response.status})`);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error during sync');
    } finally {
      setSyncing(false);
    }
  }, [mapKey, sensor]);

  return (
    <div className="flex items-center gap-2">
      {/* Sync button */}
      <button
        onClick={syncFirms}
        disabled={syncing}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/20 hover:text-orange-200 disabled:opacity-50"
        aria-label="Sync live fire data from NASA FIRMS"
      >
        {syncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Satellite className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync FIRMS'}</span>
      </button>

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings((s) => !s)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-default bg-panel-hover text-secondary transition-colors hover:text-primary"
        aria-label="Configure FIRMS sync settings"
        aria-expanded={showSettings}
      >
        <Settings2 className="h-3.5 w-3.5" />
      </button>

      {/* Settings dropdown */}
      {showSettings && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowSettings(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-default bg-panel p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <Key className="h-4 w-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-primary">NASA FIRMS Sync</h3>
            </div>
            <p className="mb-3 text-xs text-muted leading-relaxed">
              Connect to NASA's FIRMS satellite fire detection service. Get a free MAP_KEY from NASA.
            </p>
            <a
              href="https://firms.modaps.eosdis.nasa.gov/mapserver/key/"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              Get free MAP_KEY <ExternalLink className="h-3 w-3" />
            </a>

            <label className="block text-xs font-medium text-secondary mb-1">MAP_KEY</label>
            <input
              type="password"
              value={mapKey}
              onChange={(e) => setMapKey(e.target.value)}
              placeholder="Enter your FIRMS MAP_KEY"
              className="mb-3 min-h-11 w-full rounded-lg border border-default bg-elevated px-3 text-sm text-primary placeholder:text-muted focus:border-orange-500/50 focus:outline-none"
            />

            <label className="block text-xs font-medium text-secondary mb-1">Satellite Sensor</label>
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setSensor('viirs')}
                className={`flex-1 min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  sensor === 'viirs'
                    ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
                    : 'border-default bg-elevated text-secondary hover:text-primary'
                }`}
              >
                VIIRS (375m)
              </button>
              <button
                onClick={() => setSensor('modis')}
                className={`flex-1 min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  sensor === 'modis'
                    ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
                    : 'border-default bg-elevated text-secondary hover:text-primary'
                }`}
              >
                MODIS (1km)
              </button>
            </div>

            <button
              onClick={() => { syncFirms(); setShowSettings(false); }}
              disabled={syncing || !mapKey.trim()}
              className="min-h-11 w-full rounded-lg bg-orange-500 px-3 text-sm font-bold text-white transition-colors hover:bg-orange-400 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {result && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold">{result.synced} detections synced</span> from {result.source}
                  {result.detections && result.detections.length > 0 && (
                    <div className="mt-1 text-[11px] text-emerald-400/70">
                      Top: {result.detections[0].title} ({result.detections[0].satellite_source})
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
