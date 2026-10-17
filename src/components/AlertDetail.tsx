import { useState, useEffect } from 'react';
import { MapPin, Flame, Thermometer, Gauge, Activity, TrendingUp, ShieldCheck, ExternalLink, Satellite } from 'lucide-react';
import type { WildfireAlert, AlertUpdate, Severity, AlertStatus } from '@/types';
import { supabase } from '@/lib/supabase';

interface AlertDetailProps {
  alert: WildfireAlert;
}

const severityColors: Record<Severity, string> = {
  critical: 'text-rose-400',
  high: 'text-orange-400',
  medium: 'text-amber-400',
  low: 'text-sky-400',
};

const containmentByStatus: Record<AlertStatus, string> = {
  active: '0%',
  contained: '50%',
  controlled: '85%',
  resolved: '100%',
};

const updateTypeLabels: Record<string, string> = {
  detection: 'Detection',
  status_change: 'Status Change',
  growth: 'Growth',
  containment: 'Containment',
  resolution: 'Resolution',
};

export default function AlertDetail({ alert }: AlertDetailProps) {
  const [updates, setUpdates] = useState<AlertUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('alert_updates')
        .select('*')
        .eq('alert_id', alert.id)
        .order('created_at', { ascending: true });
      setUpdates((data as AlertUpdate[]) ?? []);
      setLoading(false);
    })();
  }, [alert.id]);

  return (
    <div className="space-y-4 overflow-y-auto rounded-2xl border border-default bg-panel" style={{ maxHeight: '70vh' }}>
      <div className="relative h-32 overflow-hidden rounded-t-2xl bg-gradient-to-br from-orange-900/40 via-red-900/30 to-slate-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(249,115,22,0.3) 0%, transparent 60%), radial-gradient(circle at 70% 60%, rgba(239,68,68,0.3) 0%, transparent 50%)',
        }} />
        <a
          href="https://firms.modaps.eosdis.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-xs font-medium text-sky-400 transition-colors hover:text-sky-300 cursor-pointer backdrop-blur-sm"
        >
          Satellite Live Monitoring <ExternalLink className="h-3 w-3" />
        </a>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white">{alert.title}</h3>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-300">
            <MapPin className="h-3 w-3" />
            {alert.region} — {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* Satellite source banner */}
        {alert.satellite_source && (
          <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Satellite className="h-4 w-4 text-cyan-400" />
              <div>
                <p className="text-xs font-semibold text-cyan-300">Detected by {alert.satellite_source}</p>
                {alert.scan_direction && (
                  <p className="text-[11px] text-muted">{alert.scan_direction} scan · NASA FIRMS</p>
                )}
              </div>
            </div>
            {alert.brightness && (
              <div className="text-right">
                <p className="text-xs font-bold text-orange-400">{alert.brightness} K</p>
                <p className="text-[10px] text-muted">Brightness</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={TrendingUp} label="Acres Burned" value={alert.area_acres.toLocaleString()} />
          <MetricCard icon={Thermometer} label="Surface Temp" value={`${alert.temperature_c}°C`} />
          <MetricCard icon={ShieldCheck} label="Containment" value={containmentByStatus[alert.status]} color={alert.status === 'resolved' ? 'text-emerald-400' : alert.status === 'active' ? 'text-rose-400' : 'text-amber-400'} />
          <MetricCard icon={Gauge} label="AI Confidence" value={`${alert.confidence}%`} color={severityColors[alert.severity]} />
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</h4>
          <p className="text-sm leading-relaxed text-secondary">{alert.description}</p>
        </div>

        <div>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Activity className="h-3 w-3" />
            Incident Timeline
          </h4>
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-default border-t-cyan-400" />
            </div>
          ) : updates.length === 0 ? (
            <p className="text-sm text-muted">No updates recorded</p>
          ) : (
            <div className="relative space-y-4 border-l border-default pl-4">
              {updates.map((update) => (
                <div key={update.id} className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 bg-cyan-500" style={{ borderColor: 'var(--bg-panel)' }} />
                  <p className="text-xs font-medium text-cyan-400">{updateTypeLabels[update.update_type] ?? update.update_type}</p>
                  <p className="mt-0.5 text-sm text-secondary">{update.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {new Date(update.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: typeof Flame; label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-default bg-elevated p-4">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`mt-2 text-base font-bold ${color ?? 'text-primary'}`}>{value}</p>
    </div>
  );
}
