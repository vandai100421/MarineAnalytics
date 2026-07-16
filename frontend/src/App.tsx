import { useState } from 'react'
import { MapView } from './components/map/MapView'
import { VesselInfo } from './components/panel/VesselInfo'
import { Filters } from './components/panel/Filters'
import { TimelineScrubber } from './components/playback/TimelineScrubber'
import { StatsCards } from './components/dashboard/StatsCards'
import { Charts } from './components/dashboard/Charts'
import { GeofenceEditor } from './components/geofence/GeofenceEditor'
import { AlertPanel } from './components/geofence/AlertPanel'
import { useMapStore } from './store/mapStore'
import { useVesselTrack } from './api/vessels'

type SidebarTab = 'map' | 'dashboard' | 'geofence'

export default function App() {
  const selectedMmsi = useMapStore((state) => state.selectedMmsi)
  const filters = useMapStore((state) => state.filters)
  const setFilters = useMapStore((state) => state.setFilters)
  const setPlaybackIndex = useMapStore((state) => state.setPlaybackIndex)
  const [tab, setTab] = useState<SidebarTab>('map')
  const [geoEditorActive, setGeoEditorActive] = useState(false)
  const [geoRefreshKey, setGeoRefreshKey] = useState(0)
  const { data: trackData } = useVesselTrack(selectedMmsi)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      <div className="relative flex-1">
        <MapView />
        {selectedMmsi && trackData && trackData.points.length > 0 && (
          <div className="absolute bottom-4 left-1/2 z-10 w-96 -translate-x-1/2">
            <TimelineScrubber
              total={trackData.points.length}
              onIndexChange={setPlaybackIndex}
            />
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
              <Charts />
            </section>
          </div>
        )}

        {tab === 'geofence' && (
          <div className="flex-1 overflow-y-auto p-4">
            <section className="mb-6">
              <GeofenceEditor
                isActive={geoEditorActive}
                onToggle={() => setGeoEditorActive(!geoEditorActive)}
                onCreated={() => setGeoRefreshKey((k) => k + 1)}
              />
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase text-gray-400">
                Recent Alerts
              </h2>
              <AlertPanel key={geoRefreshKey} />
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}
