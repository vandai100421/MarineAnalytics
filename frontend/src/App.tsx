import { MapView } from './components/map/MapView'
import { useMapStore } from './store/mapStore'

export default function App() {
  const selectedMmsi = useMapStore((state) => state.selectedMmsi)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      <div className="flex-1">
        <MapView />
      </div>
      <aside className="w-80 border-l border-gray-700 bg-gray-800 p-4 text-white">
        <h1 className="mb-4 text-lg font-bold text-sea-100">MarineAnalytics</h1>
        {selectedMmsi ? (
          <div>
            <h2 className="mb-2 font-semibold text-sea-100">Vessel Info</h2>
            <p className="text-sm text-gray-300">MMSI: {selectedMmsi}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Click a vessel to see details</p>
        )}
      </aside>
    </div>
  )
}
