import { lazy, Suspense, useState, useEffect } from 'react'
import { MapView } from './components/map/MapView'
import { VesselInfo } from './components/panel/VesselInfo'
import { AircraftInfo } from './components/panel/AircraftInfo'
import { Filters } from './components/panel/Filters'
import { StatsCards } from './components/dashboard/StatsCards'
import { useMapStore } from './store/mapStore'
import { useVesselTrack } from './api/vessels'
import { useAircraftPositions } from './api/aircraft'
import { useStatsOverview } from './api/stats'

const TimelineScrubber = lazy(() =>
  import('./components/playback/TimelineScrubber').then((m) => ({ default: m.TimelineScrubber })),
)
const Charts = lazy(() => import('./components/dashboard/Charts').then((m) => ({ default: m.Charts })))
const GeofenceEditor = lazy(() =>
  import('./components/geofence/GeofenceEditor').then((m) => ({ default: m.GeofenceEditor })),
)
const AlertPanel = lazy(() =>
  import('./components/geofence/AlertPanel').then((m) => ({ default: m.AlertPanel })),
)

type SidebarTab = 'vessel' | 'filters' | 'dashboard' | 'geofence'

const TAB_ICONS: Record<SidebarTab, string> = {
  vessel: 'M3 6l9-3 9 3v15l-9-3-9 3V6z',
  filters: 'M3 5h18M6 12h12M10 19h4',
  dashboard: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  geofence: 'M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9a2 2 0 110-4 2 2 0 010 4z',
}

export default function App() {
  const selectedMmsi = useMapStore((state) => state.selectedMmsi)
  const selectedHex = useMapStore((state) => state.selectedHex)
  const filters = useMapStore((state) => state.filters)
  const setFilters = useMapStore((state) => state.setFilters)
  const setPlaybackIndex = useMapStore((state) => state.setPlaybackIndex)
  const bbox = useMapStore((state) => state.bbox)
  const [tab, setTab] = useState<SidebarTab>('vessel')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [geoEditorActive, setGeoEditorActive] = useState(false)
  const [geoRefreshKey, setGeoRefreshKey] = useState(0)
  const { data: trackData } = useVesselTrack(selectedMmsi)
  const { data: aircraftData } = useAircraftPositions(bbox)
  const { data: stats } = useStatsOverview()

  // Auto-switch to vessel tab when a vessel is selected
  useEffect(() => {
    if (selectedMmsi !== null) {
      setTab('vessel')
      setSidebarOpen(true)
    }
  }, [selectedMmsi])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ocean-950">
      {/* Top Bar */}
      <header className="glass-dark absolute left-0 right-0 top-0 z-20 flex h-14 items-center gap-4 border-b border-ocean-700/50 px-4">
        <div className="flex items-center gap-2">
          <svg className="h-7 w-7 text-sea-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">MarineAnalytics</h1>
            <p className="text-[10px] text-ocean-400">Realtime AIS Tracking</p>
          </div>
        </div>

        {/* Live stats in topbar */}
        <div className="ml-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <span className="text-xs text-ocean-300">LIVE</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Stat label="Active" value={stats ? String(stats.active_vessels) : '—'} color="text-sea-300" />
            <span className="h-4 w-px bg-ocean-700" />
            <Stat label="Total" value={stats ? String(stats.total_vessels) : '—'} color="text-green-400" />
            <span className="h-4 w-px bg-ocean-700" />
            <Stat label="Avg SOG" value={stats ? `${stats.avg_sog}kn` : '—'} color="text-amber-400" />
          </div>
        </div>

        <div className="flex-1" />

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-ocean-300 transition-colors hover:bg-ocean-700/50 hover:text-white"
          title="Toggle panel"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sidebarOpen ? (
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </header>

      {/* Map Area */}
      <div className="relative flex-1">
        <div className="absolute inset-0 pt-14">
          <MapView />
        </div>
        {selectedMmsi && trackData && trackData.points.length > 0 && (
          <div className="absolute bottom-6 left-1/2 z-10 w-[420px] -translate-x-1/2 animate-slide-up">
            <Suspense
              fallback={
                <div className="glass rounded-xl p-4 text-center text-sm text-ocean-400">Loading...</div>
              }
            >
              <TimelineScrubber total={trackData.points.length} onIndexChange={setPlaybackIndex} />
            </Suspense>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside
        className={`glass-dark relative z-20 flex h-full flex-col border-l border-ocean-700/50 transition-all duration-300 ${
          sidebarOpen ? 'w-96' : 'w-0'
        } overflow-hidden`}
      >
        {/* Tab bar */}
        <div className="mt-14 flex border-b border-ocean-700/50 bg-ocean-900/50">
          {(Object.keys(TAB_ICONS) as SidebarTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium uppercase tracking-wider transition-all ${
                tab === t
                  ? 'border-b-2 border-sea-400 bg-ocean-800/50 text-sea-300'
                  : 'text-ocean-400 hover:bg-ocean-800/30 hover:text-ocean-200'
              }`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={TAB_ICONS[t]} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'vessel' && (
            <div className="animate-fade-in p-4">
              <VesselInfo mmsi={selectedMmsi} />
              {selectedHex && (
                <div className="mt-4 border-t border-ocean-700/50 pt-4">
                  <AircraftInfo hex={selectedHex} positions={aircraftData} />
                </div>
              )}
            </div>
          )}

          {tab === 'filters' && (
            <div className="animate-fade-in p-4">
              <Filters filters={filters} onChange={setFilters} />
            </div>
          )}

          {tab === 'dashboard' && (
            <div className="animate-fade-in space-y-4 p-4">
              <StatsCards />
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ocean-400">
                  Statistics
                </h3>
                <Suspense
                  fallback={<div className="py-8 text-center text-sm text-ocean-400">Loading charts...</div>}
                >
                  <Charts />
                </Suspense>
              </div>
            </div>
          )}

          {tab === 'geofence' && (
            <div className="animate-fade-in space-y-4 p-4">
              <Suspense
                fallback={<div className="py-8 text-center text-sm text-ocean-400">Loading...</div>}
              >
                <GeofenceEditor
                  isActive={geoEditorActive}
                  onToggle={() => setGeoEditorActive(!geoEditorActive)}
                  onCreated={() => setGeoRefreshKey((k) => k + 1)}
                />
              </Suspense>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ocean-400">
                  Recent Alerts
                </h3>
                <Suspense
                  fallback={<div className="py-4 text-center text-sm text-ocean-400">Loading...</div>}
                >
                  <AlertPanel key={geoRefreshKey} />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-ocean-400">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}
