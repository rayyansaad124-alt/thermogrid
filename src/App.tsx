import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WildfireAlert, Satellite, RiskZone, ResponseTeam } from '@/types';
import type { View } from '@/types/custom';
import { AlertCircle, ArrowRight, Download, Globe2, Radio, RefreshCw } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import DashboardStats from '@/components/DashboardStats';
import AlertFeed from '@/components/AlertFeed';
import AlertDetail from '@/components/AlertDetail';
import SatelliteFleet from '@/components/SatelliteFleet';
const GlobalMap = lazy(() => import('@/components/GlobalMap'));
const Analytics = lazy(() => import('@/components/Analytics'));
import RiskAssessment from '@/components/RiskAssessment';
import ResponseCoordination from '@/components/ResponseCoordination';
import Starfield from '@/components/Starfield';
import ThemeToggle from '@/components/ThemeToggle';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [alerts, setAlerts] = useState<WildfireAlert[]>([]);
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  const fetchData = useCallback(async () => {
    setDataError(null);
    setLoading(true);
    const [alertsRes, satsRes, zonesRes, teamsRes] = await Promise.all([
      supabase.from('wildfire_alerts').select('*').order('detected_at', { ascending: false }),
      supabase.from('satellites').select('*').order('name'),
      supabase.from('risk_zones').select('*').order('risk_score', { ascending: false }),
      supabase.from('response_teams').select('*').order('team_name'),
    ]);
    const firstError = [alertsRes.error, satsRes.error, zonesRes.error, teamsRes.error].find(Boolean);
    if (alertsRes.data) setAlerts(alertsRes.data as WildfireAlert[]);
    if (satsRes.data) setSatellites(satsRes.data as Satellite[]);
    if (zonesRes.data) setRiskZones(zonesRes.data as RiskZone[]);
    if (teamsRes.data) setTeams(teamsRes.data as ResponseTeam[]);
    if (firstError) setDataError('Live data could not be refreshed.');
    else setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('thermogrid-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wildfire_alerts' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'satellites' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risk_zones' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'response_teams' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? null;

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const totalAcres = alerts.reduce((sum, a) => sum + a.area_acres, 0);
  const activeSatellites = satellites.filter((s) => s.status === 'active');
  const deployedTeams = teams.filter((t) => t.status === 'deployed');
  const extremeZones = riskZones.filter((z) => z.risk_level === 'extreme' || z.risk_level === 'high');

  const headerTitle: Record<View, string> = {
    dashboard: 'Dashboard',
    overview: 'Mission Control',
    alerts: 'Active Wildfire Alerts',
    satellites: 'Satellite Fleet Status',
    map: 'Global Fire Map',
    analytics: 'Thermal Analytics',
    risk: 'Risk Assessment',
    response: 'Response Coordination',
  };

  const headerSubtitle: Record<View, string> = {
    dashboard: 'Real-time satellite wildfire monitoring dashboard',
    overview: 'Real-time satellite wildfire monitoring dashboard',
    alerts: `${activeAlerts.length} active incidents requiring attention`,
    satellites: `${activeSatellites.length} satellites operational`,
    map: 'Geospatial view of all detected thermal anomalies',
    analytics: 'Detection trends and statistical breakdowns',
    risk: `${extremeZones.length} zones at elevated risk levels`,
    response: `${deployedTeams.length} teams deployed across ${new Set(deployedTeams.map((t) => t.base_location)).size} bases`,
  };

  return (
    <div className="theme-transition flex min-h-screen bg-base text-primary">
      <Starfield count={48} />

      <div className="relative z-10 flex w-full">
        <Sidebar view={view} setView={setView} activeCount={activeAlerts.length} />

        <main className="flex-1 overflow-auto">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-default bg-panel/80 px-6 py-4 backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/icons/WhatsApp_Image_2026-10-17_at_12.53.02_AM.jpeg" alt="ThermoGrid" className="h-9 w-9 shrink-0 rounded-lg object-contain lg:hidden" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-primary">
                {headerTitle[view]}
              </h1>
                <p className="text-sm text-secondary">
                  {headerSubtitle[view]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 rounded-full border border-default bg-panel-hover px-3 py-1.5 sm:flex">
                <div className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-medium text-emerald-400">Live Feed</span>
              </div>
              <div className="hidden items-center gap-2 text-sm text-secondary md:flex">
                <Radio className="h-4 w-4 text-cyan-400" />
                <span>{activeSatellites.length} satellites online</span>
              </div>
              <span className="hidden text-xs text-muted xl:block">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Updating...'}
              </span>
              {installPrompt && (
                <button
                  onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}
                  className="hidden min-h-11 items-center gap-2 rounded-lg border border-default bg-panel-hover px-3 text-xs font-semibold text-secondary hover:text-primary sm:flex"
                >
                  <Download className="h-4 w-4" /> Install
                </button>
              )}
              <ThemeToggle />
            </div>
          </header>

          <div className="p-3 pb-24 sm:p-6 sm:pb-6">
            {dataError && (
              <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
                <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{dataError}</span>
                <button onClick={fetchData} className="flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-orange-100 hover:bg-orange-500/15" aria-label="Retry loading live data">
                  <RefreshCw className="h-4 w-4" /> Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-default border-t-cyan-400" role="status" aria-label="Loading" />
                  <p className="text-sm text-muted">Connecting to satellite network...</p>
                </div>
              </div>
            ) : (
              <Suspense fallback={<div className="flex h-[60vh] items-center justify-center text-sm text-muted">Loading view...</div>}>
                {view === 'dashboard' && (
                  <section className="relative isolate min-h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-default bg-slate-950">
                    <video
                      className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                    >
                      <source src="https://svs.gsfc.nasa.gov/vis/a000000/a005000/a005067/fleet_today_30sec.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 -z-10 bg-slate-950/75" />
                    <div className="grid min-h-[calc(100vh-180px)] items-center gap-16 px-6 py-12 sm:px-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24 lg:px-16">
                      <div className="max-w-2xl">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">ThermoGrid command center</p>
                        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">See wildfire risk before it spreads.</h2>
                        <ul className="mt-6 max-w-xl space-y-3 text-base leading-7 text-slate-200 sm:text-lg">
                          <li className="flex gap-3"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />Track thermal anomalies from a live satellite feed.</li>
                          <li className="flex gap-3"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />Assess fire severity, spread, and nearby population risk.</li>
                          <li className="flex gap-3"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />Coordinate response teams from one operational view.</li>
                        </ul>
                        <button onClick={() => setView('map')} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(242,106,46,0.25)] transition-transform hover:scale-[1.03] hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-950">
                          Open global map <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="relative flex min-h-[280px] items-center justify-center lg:min-h-[420px]" aria-label="ThermoGrid satellite globe visualization">
                        <div className="absolute h-56 w-56 rounded-full bg-orange-500/10 blur-3xl sm:h-72 sm:w-72" />
                        <Globe2 className="relative h-56 w-56 text-[#1F3A5F] drop-shadow-[0_0_24px_rgba(242,106,46,0.35)] sm:h-80 sm:w-80" strokeWidth={0.7} aria-hidden="true" />
                        <span className="thermal-pulse-ring absolute left-[29%] top-[38%] h-3 w-3 rounded-full bg-orange-400 shadow-[0_0_18px_6px_rgba(242,106,46,0.45)]" />
                        <span className="thermal-pulse-ring absolute right-[29%] top-[55%] h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_16px_5px_rgba(248,113,113,0.4)] [animation-delay:0.8s]" />
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur">Global thermal coverage</div>
                      </div>
                    </div>
                  </section>
                )}

                {view === 'overview' && (
                  <div className="space-y-6">
                    <DashboardStats
                      totalAlerts={alerts.length}
                      activeCount={activeAlerts.length}
                      criticalCount={criticalAlerts.length}
                      totalAcres={totalAcres}
                      satelliteCount={satellites.length}
                      activeSatelliteCount={activeSatellites.length}
                      totalPersonnel={teams.reduce((sum, t) => sum + t.personnel_count, 0)}
                      deployedTeamCount={deployedTeams.length}
                    />
                    <div className="grid gap-6 lg:grid-cols-2">
                      <AlertFeed
                        alerts={alerts.slice(0, 6)}
                        onSelect={(id) => { setView('alerts'); setSelectedAlertId(id); }}
                        compact
                      />
                      <GlobalMap alerts={alerts} onSelect={(id) => { setView('alerts'); setSelectedAlertId(id); }} compact />
                    </div>
                  </div>
                )}

                {view === 'alerts' && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                    <AlertFeed alerts={alerts} onSelect={setSelectedAlertId} selectedId={selectedAlertId} />
                    {selectedAlert ? (
                      <AlertDetail alert={selectedAlert} />
                    ) : (
                      <div className="flex items-center justify-center rounded-2xl border border-default bg-panel p-8">
                        <div className="text-center">
                          <p className="text-sm text-muted">Select an alert to view detailed information</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {view === 'satellites' && <SatelliteFleet satellites={satellites} />}

                {view === 'map' && (
                  <div className="h-[calc(100dvh-140px)] min-h-[500px] sm:h-[calc(100vh-180px)]">
                    <GlobalMap alerts={alerts} onSelect={(id) => { setView('alerts'); setSelectedAlertId(id); }} />
                  </div>
                )}

                {view === 'analytics' && <Analytics alerts={alerts} satellites={satellites} />}

                {view === 'risk' && <RiskAssessment riskZones={riskZones} />}

                {view === 'response' && (
                  <ResponseCoordination teams={teams} alerts={alerts} onSelectAlert={(id) => { setView('alerts'); setSelectedAlertId(id); }} />
                )}
              </Suspense>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
