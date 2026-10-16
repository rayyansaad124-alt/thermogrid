import { Users, Plane, Cpu, Truck, Clock, MapPin, Wrench } from 'lucide-react';
import type { ResponseTeam, WildfireAlert, TeamType, TeamStatus } from '@/types';

interface ResponseCoordinationProps {
  teams: ResponseTeam[];
  alerts: WildfireAlert[];
  onSelectAlert: (id: string) => void;
}

const teamTypeConfig: Record<TeamType, { label: string; icon: typeof Users; color: string }> = {
  ground: { label: 'Ground', icon: Truck, color: 'text-emerald-400' },
  aerial: { label: 'Aerial', icon: Plane, color: 'text-sky-400' },
  drone: { label: 'Drone', icon: Cpu, color: 'text-violet-400' },
  support: { label: 'Support', icon: Users, color: 'text-amber-400' },
};

const statusConfig: Record<TeamStatus, { label: string; text: string; bg: string; dot: string }> = {
  deployed: { label: 'Deployed', text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  en_route: { label: 'En Route', text: 'text-cyan-400', bg: 'bg-cyan-500/10', dot: 'bg-cyan-500' },
  standby: { label: 'Standby', text: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  returning: { label: 'Returning', text: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-500' },
  off_duty: { label: 'Off Duty', text: 'text-slate-500', bg: 'bg-slate-500/5', dot: 'bg-slate-600' },
};

function timeSince(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function ResponseCoordination({ teams, alerts, onSelectAlert }: ResponseCoordinationProps) {
  const deployed = teams.filter((t) => t.status === 'deployed');
  const enRoute = teams.filter((t) => t.status === 'en_route');
  const standby = teams.filter((t) => t.status === 'standby');
  const totalPersonnel = teams.reduce((sum, t) => sum + t.personnel_count, 0);
  const deployedPersonnel = deployed.reduce((sum, t) => sum + t.personnel_count, 0);

  return (
    <div className="space-y-6">
      {/* Response summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Teams Deployed" value={String(deployed.length)} sub={`En route: ${enRoute.length}`} color="text-emerald-400" />
        <SummaryCard label="Standby Teams" value={String(standby.length)} sub="Ready for deployment" color="text-amber-400" />
        <SummaryCard label="Deployed Personnel" value={deployedPersonnel.toLocaleString()} sub={`of ${totalPersonnel.toLocaleString()} total`} color="text-cyan-400" />
        <SummaryCard label="Active Assignments" value={String(teams.filter((t) => t.alert_id).length)} sub="Linked to alerts" color="text-orange-400" />
      </div>

      {/* Team cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team, idx) => {
          const typeCfg = teamTypeConfig[team.team_type];
          const statCfg = statusConfig[team.status];
          const TypeIcon = typeCfg.icon;
          const linkedAlert = team.alert_id ? alerts.find((a) => a.id === team.alert_id) : null;

          return (
            <div
              key={team.id}
              className="group relative overflow-hidden rounded-2xl border border-default bg-panel p-5 transition-all duration-300 hover:border-hover"
              style={{ animation: `fadeInUp 0.4s ease-out ${idx * 40}ms both` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-elevated border border-default`}>
                    <TypeIcon className={`h-5 w-5 ${typeCfg.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">{team.team_name}</h3>
                    <p className="text-xs text-secondary">{typeCfg.label} · {team.personnel_count} personnel</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full ${statCfg.bg} px-2.5 py-1`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${statCfg.dot} ${team.status === 'deployed' || team.status === 'en_route' ? 'animate-pulse' : ''}`} />
                  <span className={`text-[11px] font-medium ${statCfg.text}`}>{statCfg.label}</span>
                </div>
              </div>

              {/* Location and assignment */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-muted" />
                  <span className="text-secondary">{team.base_location}</span>
                </div>
                {linkedAlert && (
                  <button
                    onClick={() => onSelectAlert(linkedAlert.id)}
                    className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    Assigned to: {linkedAlert.title}
                  </button>
                )}
                {!linkedAlert && (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    Unassigned
                  </div>
                )}
              </div>

              {/* Deployed time */}
              {team.deployed_at && (
                <div className="mt-3 flex items-center gap-2 border-t border-default pt-3 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted" />
                  <span className="text-muted">Deployed</span>
                  <span className="font-medium text-secondary">{timeSince(team.deployed_at)} ago</span>
                </div>
              )}

              {/* Equipment */}
              {team.equipment.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {team.equipment.map((eq) => (
                    <span key={eq} className="flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-[11px] text-secondary border border-default">
                      <Wrench className="h-2.5 w-2.5" />
                      {eq}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl border border-default bg-panel p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-secondary">{sub}</p>
    </div>
  );
}
