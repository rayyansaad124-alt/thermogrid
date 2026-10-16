import { Satellite as SatelliteIcon, Radio, Clock, Cpu } from 'lucide-react';
import type { Satellite, SatelliteStatus, OrbitType } from '@/types';

interface SatelliteFleetProps {
  satellites: Satellite[];
}

const statusConfig: Record<SatelliteStatus, { label: string; text: string; bg: string; dot: string }> = {
  active: { label: 'Active', text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  standby: { label: 'Standby', text: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  maintenance: { label: 'Maintenance', text: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-500' },
};

const orbitConfig: Record<OrbitType, { label: string; desc: string }> = {
  LEO: { label: 'Low Earth Orbit', desc: '400-2,000 km' },
  MEO: { label: 'Medium Earth Orbit', desc: '2,000-35,786 km' },
  GEO: { label: 'Geostationary', desc: '35,786 km' },
};

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Past due';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m ago`;
  return `${mins}m ago`;
}

export default function SatelliteFleet({ satellites }: SatelliteFleetProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {satellites.map((sat) => {
        const stat = statusConfig[sat.status];
        const orbit = orbitConfig[sat.orbit_type];
        return (
          <div
            key={sat.id}
            className="group relative overflow-hidden rounded-2xl border border-default bg-panel p-5 transition-all duration-300 hover:border-hover"
          >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-500/5 blur-3xl transition-opacity duration-300 group-hover:bg-cyan-500/10" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                  <SatelliteIcon className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-primary">{sat.name}</h3>
                  <p className="text-xs text-secondary">{sat.agency}</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 rounded-full ${stat.bg} px-2.5 py-1`}>
                <div className={`h-1.5 w-1.5 rounded-full ${stat.dot} ${sat.status === 'active' ? 'animate-pulse' : ''}`} />
                <span className={`text-[11px] font-medium ${stat.text}`}>{stat.label}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Orbit</p>
                <p className="mt-0.5 text-sm font-medium text-primary">{orbit.label}</p>
                <p className="text-[11px] text-muted">{orbit.desc}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Coverage</p>
                <p className="mt-0.5 text-sm font-medium text-primary">{sat.coverage_region}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-elevated px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted" />
                <div>
                  <p className="text-[10px] text-muted">Last pass</p>
                  <p className="text-xs font-medium text-secondary">{timeSince(sat.last_pass)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-muted" />
                <div className="text-right">
                  <p className="text-[10px] text-muted">Next pass</p>
                  <p className="text-xs font-medium text-cyan-400">{timeUntil(sat.next_pass)}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {sat.sensors.map((sensor) => (
                <span key={sensor} className="flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-[11px] text-secondary border border-default">
                  <Cpu className="h-3 w-3" />
                  {sensor}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
