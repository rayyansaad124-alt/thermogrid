import { AlertCircle, Droplets, Wind, Leaf, Users, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { RiskZone, RiskLevel, TemperatureTrend } from '@/types';

interface RiskAssessmentProps {
  riskZones: RiskZone[];
}

const riskConfig: Record<RiskLevel, { label: string; text: string; bg: string; border: string }> = {
  extreme: { label: 'Extreme', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/40' },
  high: { label: 'High', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/40' },
  moderate: { label: 'Moderate', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/40' },
  low: { label: 'Low', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40' },
};

const trendConfig: Record<TemperatureTrend, { icon: typeof ArrowUp; text: string }> = {
  rising: { icon: ArrowUp, text: 'text-rose-400' },
  stable: { icon: Minus, text: 'text-slate-400' },
  falling: { icon: ArrowDown, text: 'text-emerald-400' },
};

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m ago`;
  return `${mins}m ago`;
}

export default function RiskAssessment({ riskZones }: RiskAssessmentProps) {
  const sortedZones = [...riskZones].sort((a, b) => b.risk_score - a.risk_score);
  const extremeCount = riskZones.filter((z) => z.risk_level === 'extreme').length;
  const highCount = riskZones.filter((z) => z.risk_level === 'high').length;
  const totalAtRisk = riskZones.reduce((sum, z) => sum + z.population_at_risk, 0);
  const avgRisk = riskZones.length > 0
    ? Math.round(riskZones.reduce((sum, z) => sum + z.risk_score, 0) / riskZones.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Risk summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RiskSummaryCard label="Extreme Risk Zones" value={String(extremeCount)} color="text-rose-400" border="border-rose-500/30" />
        <RiskSummaryCard label="High Risk Zones" value={String(highCount)} color="text-orange-400" border="border-orange-500/30" />
        <RiskSummaryCard label="Population at Risk" value={totalAtRisk.toLocaleString()} color="text-amber-400" border="border-amber-500/30" />
        <RiskSummaryCard label="Average Risk Score" value={`${avgRisk}/100`} color="text-cyan-400" border="border-cyan-500/30" />
      </div>

      {/* Risk zone cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedZones.map((zone, idx) => {
          const risk = riskConfig[zone.risk_level];
          const trend = trendConfig[zone.temperature_trend];
          const TrendIcon = trend.icon;

          return (
            <div
              key={zone.id}
              className={`group relative overflow-hidden rounded-2xl border ${risk.border} bg-panel p-5 transition-all duration-300 hover:border-hover`}
              style={{ animation: `fadeInUp 0.4s ease-out ${idx * 50}ms both` }}
            >
              {/* Risk score gauge */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-primary">{zone.name}</h3>
                  <p className="text-xs text-secondary">{zone.region}</p>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full ${risk.bg} px-3 py-1`}>
                  <AlertCircle className={`h-3.5 w-3.5 ${risk.text}`} />
                  <span className={`text-xs font-bold ${risk.text}`}>{risk.label}</span>
                </div>
              </div>

              {/* Risk score bar */}
              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Risk Score</span>
                  <div className="flex items-center gap-1">
                    <TrendIcon className={`h-3 w-3 ${trend.text}`} />
                    <span className="text-sm font-bold text-primary">{zone.risk_score}</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${zone.risk_score}%`,
                      background: `linear-gradient(to right, #f59e0b, #ef4444, #dc2626)`,
                    }}
                  />
                </div>
              </div>

              {/* Environmental metrics */}
              <div className="grid grid-cols-2 gap-3">
                <Metric icon={Droplets} label="Humidity" value={`${zone.humidity}%`} />
                <Metric icon={Wind} label="Wind" value={`${zone.wind_speed} km/h`} />
                <Metric icon={Leaf} label="Dryness" value={`${zone.vegetation_dryness}/100`} />
                <Metric icon={Users} label="At Risk" value={zone.population_at_risk.toLocaleString()} />
              </div>

              {/* Last assessment */}
              <div className="mt-3 flex items-center justify-between border-t border-default pt-3">
                <span className="text-[11px] text-muted">Last assessed</span>
                <span className="text-[11px] font-medium text-secondary">{timeSince(zone.last_assessment)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskSummaryCard({ label, value, color, border }: { label: string; value: string; color: string; border: string }) {
  return (
    <div className={`rounded-2xl border ${border} bg-panel p-4`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Droplets; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-elevated p-2.5 border border-default">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-xs font-bold text-primary">{value}</p>
    </div>
  );
}
