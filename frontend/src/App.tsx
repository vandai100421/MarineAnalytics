import { lazy, Suspense, useState } from 'react'
import { MapView } from './components/map/MapView'
import { VesselInfo } from './components/panel/VesselInfo'
import { AircraftInfo } from './components/panel/AircraftInfo'
import { Filters } from './components/panel/Filters'
import { StatsCards } from './components/dashboard/StatsCards'
import { useMapStore } from './store/mapStore'
import { useVesselTrack } from './api/vessels'
import { useAircraftPositions } from './api/aircraft'

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

type SidebarTab = 'map' | 'dashboard' | 'geofence'

export default function App() {
  const selectedMmsi = useMapStore((state) => state.selectedMmsi)
  const selectedHex = useMapStore((state) => state.selectedHex)
  const filters = useMapStore((state) => state.filters)
  const setFilters = useMapStore((state) => state.setFilters)
  const setPlaybackIndex = useMapStore((state) => state.setPlaybackIndex)
  const bbox = useMapStore((state) => state.bbox)
  const [tab, setTab] = useState<SidebarTab>('map')
  const [geoEditorActive, setGeoEditorActive] = useState(false)
  const [geoRefreshKey, setGeoRefreshKey] = useState(0)
  const { data: trackData } = useVesselTrack(selectedMmsi)
  const { data: aircraftData } = useAircraftPositions(bbox)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      <div className="relative flex-1">
        <MapView />
        {selectedMmsi && trackData && trackData.points.length > 0 && (
          <div className="absolute bottom-4 left-1/2 z-10 w-96 -translate-x-1/2">
            <Suspense fallback={<div className="rounded bg-gray-800 p-4 text-center text-gray-400">Loading...</div>}>
              <TimelineScrubber
                total={trackData.points.length}
                onIndexChange={setPlaybackIndex}
              />
            </Suspense>
          </div>
        )}
      </div>
      <aside className="flex w-80 flex-col border-l border-gray-700 bg-gray-800">
        <div className="flex border-b border-gray-700">
          {(['map', 'dashboard', 'geofence'] as SidebarTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'bg-gray-700 text-sea-100'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'map' && (
          <div className="flex-1 overflow-y-auto p-4">
            <section className="mb-6">
              <h2 className="mb-2 text-sm font-semibold uppercase text-gray-400">
                Vessel Info
              </h2>
              <VesselInfo mmsi={selectedMmsi} />
              {selectedHex && (
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <h2 className="mb-2 text-sm font-semibold uppercase text-gray-400">
                    Aircraft Info
                  </h2>
                  <AircraftInfo hex={selectedHex} positions={aircraftData} />
                </div>
              )}
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase text-gray-400">
                Filters
              </h2>
              <Filters filters={filters} onChange={setFilters} />
            </section>
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-4">
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">
                Overview
              </h2>
              <StatsCards />
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">
                Statistics
              </h2>
              <Suspense fallback={<div className="text-center text-gray-400">Loading charts...</div>}>
                <Charts />
              </Suspense>
            </section>
          </div>
        )}

        {tab === 'geofence' && (
          <div className="flex-1 overflow-y-auto p-4">
            <section className="mb-6">
              <Suspense fallback={<div className="text-center text-gray-400">Loading...</div>}>
                <GeofenceEditor
                  isActive={geoEditorActive}
                  onToggle={() => setGeoEditorActive(!geoEditorActive)}
                  onCreated={() => setGeoRefreshKey((k) => k + 1)}
                />
              </Suspense>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase text-gray-400">
                Recent Alerts
              </h2>
              <Suspense fallback={<div className="text-center text-gray-400">Loading...</div>}>
                <AlertPanel key={geoRefreshKey} />
              </Suspense>
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}
