import { LayoutGrid, Flame, Satellite, Map, BarChart3, AlertCircle, Users, Gauge } from 'lucide-react';
import type { View } from '@/types/custom';

interface SidebarProps {
  view: View;
  setView: (view: View) => void;
  activeCount: number;
}

const navItems: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'alerts', label: 'Wildfire Alerts', icon: Flame },
  { id: 'map', label: 'Global Map', icon: Map },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'risk', label: 'Risk Assessment', icon: AlertCircle },
  { id: 'response', label: 'Response Teams', icon: Users },
  { id: 'satellites', label: 'Satellite Fleet', icon: Satellite },
];

export default function Sidebar({ view, setView, activeCount }: SidebarProps) {
  const mobileItems = navItems.filter((item) => ['dashboard', 'alerts', 'map', 'analytics'].includes(item.id));

  return (
    <>
    <aside className="hidden w-64 flex-col border-r border-default bg-panel/60 backdrop-blur-sm lg:flex">
      <div className="flex items-center gap-3 border-b border-default px-5 py-5">
        <img
          src="/images/WhatsApp_Image_2026-10-17_at_12.53.02_AM.jpeg"
          alt="ThermoGrid"
          className="h-10 w-10 shrink-0 rounded-xl object-contain"
          style={{ mixBlendMode: 'multiply', aspectRatio: '1 / 1' }}
        />
        <div className="min-w-0">
          <h2 className="whitespace-nowrap text-sm font-bold text-primary">ThermoGrid</h2>
          <p className="text-[11px] text-muted">Satellite Monitoring</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Monitoring</p>
        {navItems.slice(0, 4).map((item) => (
          <NavItem key={item.id} item={item} view={view} setView={setView} activeCount={activeCount} />
        ))}

        <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted">Analysis</p>
        {navItems.slice(4, 6).map((item) => (
          <NavItem key={item.id} item={item} view={view} setView={setView} />
        ))}

        <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted">Operations</p>
        {navItems.slice(6).map((item) => (
          <NavItem key={item.id} item={item} view={view} setView={setView} />
        ))}
      </nav>

      <div className="border-t border-default px-5 py-4">
        <div className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-3 border border-default">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-secondary">System Operational</span>
        </div>
      </div>
    </aside>
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-default bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const isActive = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${isActive ? 'text-cyan-400' : 'text-secondary'}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.id === 'alerts' && activeCount > 0 ? `${item.label} (${activeCount})` : item.label}</span>
          </button>
        );
      })}
    </nav>
    </>
  );
}

function NavItem({
  item,
  view,
  setView,
  activeCount,
}: {
  item: { id: View; label: string; icon: typeof LayoutGrid };
  view: View;
  setView: (view: View) => void;
  activeCount?: number;
}) {
  const Icon = item.icon;
  const isActive = view === item.id;
  return (
    <button
      onClick={() => setView(item.id)}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-cyan-500/20 to-transparent text-cyan-400'
          : 'text-secondary hover:bg-panel-hover hover:text-primary'
      }`}
    >
      <Icon className={`h-5 w-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-muted group-hover:text-secondary'}`} />
      <span>{item.label}</span>
      {item.id === 'alerts' && activeCount !== undefined && activeCount > 0 && (
        <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-bold text-red-400">
          {activeCount}
        </span>
      )}
    </button>
  );
}
