import { useState } from 'react';
import { Flame, Clock, MapPin, TrendingUp, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { WildfireAlert, Severity, AlertStatus } from '@/types';

interface AlertFeedProps {
  alerts: WildfireAlert[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  compact?: boolean;
  className?: string;
}

const severityConfig: Record<Severity, { label: string; bg: string; text: string; border: string; dot: string }> = {
  critical: { label: 'CRITICAL', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40', dot: 'bg-rose-500' },
  high: { label: 'HIGH', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/40', dot: 'bg-orange-500' },
  medium: { label: 'MEDIUM', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/40', dot: 'bg-amber-500' },
  low: { label: 'LOW', bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/40', dot: 'bg-sky-500' },
};

const statusConfig: Record<AlertStatus, { label: string; text: string; bg: string }> = {
  active: { label: 'Active', text: 'text-red-400', bg: 'bg-red-500/20' },
  contained: { label: 'Contained', text: 'text-amber-400', bg: 'bg-amber-500/20' },
  controlled: { label: 'Controlled', text: 'text-sky-400', bg: 'bg-sky-500/20' },
  resolved: { label: 'Resolved', text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ${mins}m ago`;
  return `${mins}m ago`;
}

export default function AlertFeed({ alerts, onSelect, selectedId, compact, className }: AlertFeedProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const filteredAlerts = alerts.filter((alert) => (
    (severityFilter === 'all' || alert.severity === severityFilter) &&
    (statusFilter === 'all' || alert.status === statusFilter)
  ));

  return (
    <div className={`overflow-hidden rounded-2xl border border-default bg-panel ${className ?? ''}`}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-default bg-panel/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" />
          <h3 className="font-semibold text-primary">{compact ? 'Recent Alerts' : 'All Alerts'}</h3>
        </div>
        {!compact && (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted sm:inline">{filteredAlerts.length} of {alerts.length} incidents</span>
            <button onClick={() => setFiltersOpen((open) => !open)} className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-secondary hover:bg-panel-hover hover:text-primary" aria-expanded={filtersOpen} aria-controls="alert-filters">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
          </div>
        )}
      </div>

      {filtersOpen && !compact && (
        <div id="alert-filters" className="grid grid-cols-1 gap-3 border-b border-default bg-panel-hover p-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-secondary">Severity
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as Severity | 'all')} className="mt-1 min-h-11 w-full rounded-lg border border-default bg-panel px-3 text-sm text-primary">
              <option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </label>
          <label className="text-xs font-medium text-secondary">Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AlertStatus | 'all')} className="mt-1 min-h-11 w-full rounded-lg border border-default bg-panel px-3 text-sm text-primary">
              <option value="all">All statuses</option><option value="active">Active</option><option value="contained">Contained</option><option value="controlled">Controlled</option><option value="resolved">Resolved</option>
            </select>
          </label>
        </div>
      )}

      <div className={`${compact ? 'h-[calc(100%-65px)] max-h-[600px]' : 'max-h-[600px]'} overflow-y-auto`}>
        {filteredAlerts.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted">{alerts.length === 0 ? 'No alerts detected' : 'No alerts match these filters'}</p>
          </div>
        ) : (
          <div className="divide-y divide-border-default border-default">
            {filteredAlerts.map((alert) => {
              const sev = severityConfig[alert.severity];
              const stat = statusConfig[alert.status];
              const isSelected = selectedId === alert.id;
              return (
                <button
                  key={alert.id}
                  onClick={() => onSelect(alert.id)}
                  className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-all duration-200 hover:bg-panel-hover ${
                    isSelected ? 'bg-panel-hover' : ''
                  }`}
                >
                  <div className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${sev.dot} ${alert.status === 'active' ? 'animate-pulse' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-primary truncate">{alert.title}</h4>
                      <span className={`rounded-md border ${sev.border} ${sev.bg} px-1.5 py-0.5 text-[10px] font-bold ${sev.text}`}>
                        {sev.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {alert.region}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {alert.area_acres.toLocaleString()} acres
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(alert.detected_at)}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${stat.text} ${stat.bg}`}>
                        {stat.label}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="mt-2 h-4 w-4 flex-shrink-0 text-muted" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
