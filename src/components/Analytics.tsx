import { BarChart3, TrendingUp, Flame, Thermometer, Activity, Globe, Layers } from 'lucide-react';
import type { WildfireAlert, Satellite, Severity, AlertStatus } from '@/types';

interface AnalyticsProps {
  alerts: WildfireAlert[];
  satellites: Satellite[];
}

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
const severityColors: Record<Severity, string> = {
  critical: '#f43f5e',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#0ea5e9',
};
const statusOrder: AlertStatus[] = ['active', 'contained', 'controlled', 'resolved'];
const statusColors: Record<AlertStatus, string> = {
  active: '#ef4444',
  contained: '#f59e0b',
  controlled: '#0ea5e9',
  resolved: '#10b981',
};

export default function Analytics({ alerts, satellites }: AnalyticsProps) {
  // Severity distribution
  const severityCounts = severityOrder.map((s) => ({
    severity: s,
    count: alerts.filter((a) => a.severity === s).length,
  }));
  const maxSeverityCount = Math.max(...severityCounts.map((s) => s.count), 1);

  // Status distribution
  const statusCounts = statusOrder.map((s) => ({
    status: s,
    count: alerts.filter((a) => a.status === s).length,
  }));
  const maxStatusCount = Math.max(...statusCounts.map((s) => s.count), 1);

  // Area by region (top 5)
  const regionData = Object.entries(
    alerts.reduce((acc, a) => {
      const region = a.region.split(',')[0];
      acc[region] = (acc[region] ?? 0) + a.area_acres;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxRegionArea = Math.max(...regionData.map((r) => r[1]), 1);

  // Temperature vs confidence scatter data
  const scatterData = alerts.map((a) => ({
    x: a.temperature_c,
    y: a.confidence,
    severity: a.severity,
    title: a.title,
  }));

  // Satellite status pie data
  const satStatusCounts = {
    active: satellites.filter((s) => s.status === 'active').length,
    standby: satellites.filter((s) => s.status === 'standby').length,
    maintenance: satellites.filter((s) => s.status === 'maintenance').length,
  };
  const totalSats = satellites.length;
  const satSegments = [
    { label: 'Active', count: satStatusCounts.active, color: '#10b981' },
    { label: 'Standby', count: satStatusCounts.standby, color: '#f59e0b' },
    { label: 'Maintenance', count: satStatusCounts.maintenance, color: '#64748b' },
  ];

  // Detection time distribution (by hour bucket)
  const hourBuckets = Array.from({ length: 12 }, (_, i) => ({
    label: `${i * 2}-${(i + 1) * 2}h`,
    count: alerts.filter((a) => {
      const hoursAgo = (Date.now() - new Date(a.detected_at).getTime()) / 3600000;
      return hoursAgo >= i * 2 && hoursAgo < (i + 1) * 2;
    }).length,
  }));
  const maxHourCount = Math.max(...hourBuckets.map((h) => h.count), 1);

  const avgConfidence = alerts.length > 0
    ? Math.round(alerts.reduce((sum, a) => sum + a.confidence, 0) / alerts.length)
    : 0;
  const avgTemp = alerts.length > 0
    ? Math.round(alerts.reduce((sum, a) => sum + a.temperature_c, 0) / alerts.length)
    : 0;
  const totalArea = alerts.reduce((sum, a) => sum + a.area_acres, 0);

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Flame} label="Total Incidents" value={String(alerts.length)} color="text-orange-400" />
        <SummaryCard icon={TrendingUp} label="Total Area" value={`${totalArea.toLocaleString()} acres`} color="text-amber-400" />
        <SummaryCard icon={Thermometer} label="Avg Surface Temp" value={`${avgTemp}°C`} color="text-rose-400" />
        <SummaryCard icon={Activity} label="Avg AI Confidence" value={`${avgConfidence}%`} color="text-cyan-400" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Severity Distribution */}
        <div className="rounded-2xl border border-default bg-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-400" />
            <h3 className="font-semibold text-primary">Severity Distribution</h3>
          </div>
          <div className="space-y-3">
            {severityCounts.map((s) => (
              <div key={s.severity} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium capitalize text-secondary">{s.severity}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-6 rounded-full transition-all duration-500"
                    style={{
                      width: `${(s.count / maxSeverityCount) * 100}%`,
                      backgroundColor: severityColors[s.severity],
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-bold text-primary">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-2xl border border-default bg-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-primary">Status Breakdown</h3>
          </div>
          <div className="space-y-3">
            {statusCounts.map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className="w-24 text-xs font-medium capitalize text-secondary">{s.status}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-6 rounded-full transition-all duration-500"
                    style={{
                      width: `${(s.count / maxStatusCount) * 100}%`,
                      backgroundColor: statusColors[s.status],
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-bold text-primary">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Area by Region */}
        <div className="rounded-2xl border border-default bg-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-primary">Burned Area by Region</h3>
          </div>
          <div className="space-y-3">
            {regionData.map(([region, area]) => (
              <div key={region} className="flex items-center gap-3">
                <span className="w-32 truncate text-xs font-medium text-secondary">{region}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${(area / maxRegionArea) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right text-xs font-bold text-primary">{area.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Satellite Status Donut */}
        <div className="rounded-2xl border border-default bg-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-primary">Satellite Fleet Status</h3>
          </div>
          <div className="flex items-center gap-8">
            {/* CSS donut */}
            <div className="relative h-36 w-36 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                {satSegments.map((seg, i) => {
                  const pct = totalSats > 0 ? seg.count / totalSats : 0;
                  const offset = satSegments.slice(0, i).reduce((sum, s) => sum + s.count / totalSats, 0);
                  return (
                    <circle
                      key={seg.label}
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="4"
                      strokeDasharray={`${pct * 100} ${100 - pct * 100}`}
                      strokeDashoffset={`${-offset * 100}`}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-primary">{totalSats}</span>
                <span className="text-[10px] text-muted">Total</span>
              </div>
            </div>
            <div className="space-y-2">
              {satSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs font-medium text-secondary">{seg.label}</span>
                  <span className="text-sm font-bold text-primary">{seg.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detection Timeline */}
      <div className="rounded-2xl border border-default bg-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-violet-400" />
          <h3 className="font-semibold text-primary">Detection Timeline (past 24 hours)</h3>
        </div>
        <div className="flex items-end gap-2" style={{ height: '120px' }}>
          {hourBuckets.map((bucket, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-cyan-500/40 to-cyan-400 transition-all duration-500 hover:from-cyan-500/60 hover:to-cyan-300"
                  style={{ height: `${(bucket.count / maxHourCount) * 100}%`, minHeight: bucket.count > 0 ? '4px' : '0' }}
                  title={`${bucket.count} detections`}
                />
              </div>
              <span className="text-[9px] text-muted">{bucket.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Temperature vs Confidence Scatter */}
      <div className="rounded-2xl border border-default bg-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-rose-400" />
          <h3 className="font-semibold text-primary">Temperature vs AI Confidence</h3>
        </div>
        <div className="relative" style={{ height: '240px' }}>
          {/* Axes */}
          <div className="absolute bottom-6 left-10 right-0 border-t border-default" />
          <div className="absolute bottom-6 left-10 top-0 border-l border-default" />
          {/* Y axis labels */}
          <div className="absolute bottom-6 left-0 top-0 flex flex-col justify-between py-0 text-[9px] text-muted">
            <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
          </div>
          {/* X axis labels */}
          <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[9px] text-muted">
            <span>0°C</span><span>200°C</span><span>400°C</span><span>600°C</span><span>800°C</span>
          </div>
          {/* Data points */}
          <div className="absolute bottom-6 left-10 right-0 top-0">
            {scatterData.map((point, i) => {
              const xPct = (point.x / 800) * 100;
              const yPct = 100 - point.y;
              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 translate-y-1/2 rounded-full transition-transform hover:scale-150"
                  style={{
                    left: `${xPct}%`,
                    bottom: `${yPct}%`,
                    width: '10px',
                    height: '10px',
                    backgroundColor: severityColors[point.severity],
                    opacity: 0.7,
                    boxShadow: `0 0 6px ${severityColors[point.severity]}`,
                  }}
                  title={`${point.title}: ${point.x}°C, ${point.y}% confidence`}
                />
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          {severityOrder.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-secondary">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: severityColors[s] }} />
              {s}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">X: Surface temperature · Y: AI detection confidence</p>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: typeof Flame; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-default bg-panel p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}
