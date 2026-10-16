import { useState, useEffect } from 'react';
import { MapPin, Flame, Thermometer, Gauge, Clock, Activity, TrendingUp } from 'lucide-react';
import type { WildfireAlert, AlertUpdate, Severity } from '@/types';
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

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={TrendingUp} label="Area" value={`${alert.area_acres.toLocaleString()} acres`} />
          <MetricCard icon={Thermometer} label="Surface Temp" value={`${alert.temperature_c}°C`} />
          <MetricCard icon={Gauge} label="AI Confidence" value={`${alert.confidence}%`} color={severityColors[alert.severity]} />
          <MetricCard icon={Clock} label="Detected" value={new Date(alert.detected_at).toLocaleString()} />
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Description</h4>
          <p className="text-sm leading-relaxed text-secondary">{alert.description}</p>
        </div>

        <div>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
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
    <div className="rounded-xl border border-default bg-elevated p-3">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`mt-1.5 text-sm font-bold ${color ?? 'text-primary'}`}>{value}</p>
    </div>
  );
}
