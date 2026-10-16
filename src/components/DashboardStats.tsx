import { Flame, AlertTriangle, TrendingUp, Satellite as SatelliteIcon, Activity, Radar, Users, Truck } from 'lucide-react';

interface DashboardStatsProps {
  totalAlerts: number;
  activeCount: number;
  criticalCount: number;
  totalAcres: number;
  satelliteCount: number;
  activeSatelliteCount: number;
  totalPersonnel: number;
  deployedTeamCount: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
  delay,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  sublabel: string;
  color: string;
  delay: number;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-default bg-panel p-5 transition-all duration-300 hover:border-hover"
      style={{ animation: `fadeInUp 0.5s ease-out ${delay}ms both` }}
    >
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${color} opacity-5 blur-2xl transition-opacity duration-300 group-hover:opacity-10`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
          <p className="mt-1 text-xs text-secondary">{sublabel}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color} bg-opacity-10`}>
          <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardStats({
  totalAlerts,
  activeCount,
  criticalCount,
  totalAcres,
  satelliteCount,
  activeSatelliteCount,
  totalPersonnel,
  deployedTeamCount,
}: DashboardStatsProps) {
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Flame} label="Total Alerts" value={String(totalAlerts)} sublabel="All incidents tracked" color="bg-orange-500" delay={0} />
        <StatCard icon={Activity} label="Active Fires" value={String(activeCount)} sublabel={`${criticalCount} critical severity`} color="bg-red-500" delay={60} />
        <StatCard icon={TrendingUp} label="Acres Burned" value={totalAcres.toLocaleString()} sublabel="Total area affected" color="bg-amber-500" delay={120} />
        <StatCard icon={SatelliteIcon} label="Satellites" value={`${activeSatelliteCount}/${satelliteCount}`} sublabel="Operational fleet" color="bg-cyan-500" delay={180} />
        <StatCard icon={Users} label="Personnel" value={totalPersonnel.toLocaleString()} sublabel="Total response staff" color="bg-emerald-500" delay={240} />
        <StatCard icon={Truck} label="Teams Deployed" value={String(deployedTeamCount)} sublabel="Active in the field" color="bg-violet-500" delay={300} />
        <StatCard icon={Radar} label="Coverage" value="Global" sublabel="24/7 thermal scanning" color="bg-sky-500" delay={360} />
        <StatCard icon={AlertTriangle} label="Avg Confidence" value="84%" sublabel="AI detection accuracy" color="bg-teal-500" delay={420} />
      </div>
    </>
  );
}
