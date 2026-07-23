import { useEffect } from 'react'
import { MapView } from './components/map/MapView'
import { TopNavBar } from './components/layout/TopNavBar'
import { LeftPanel } from './components/layout/LeftPanel'
import { RightSidebar } from './components/layout/RightSidebar'
import { useMapStore } from './store/mapStore'

export default function App() {
  const leftPanelOpen = useMapStore((state) => state.leftPanelOpen)
  const setSelectedMmsi = useMapStore((state) => state.setSelectedMmsi)
  const setRightActiveTab = useMapStore((state) => state.setRightActiveTab)

  useEffect(() => {
    document.title = 'MarineAnalytics'
    const params = new URLSearchParams(window.location.search)
    const mmsiParam = params.get('mmsi')
    if (mmsiParam) {
      const mmsi = Number(mmsiParam)
      if (Number.isFinite(mmsi) && mmsi > 0) {
        setSelectedMmsi(mmsi)
        setRightActiveTab('details')
      }
    }
  }, [setSelectedMmsi, setRightActiveTab])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ocean-950">
      <TopNavBar />

      <aside
        className={`glass-dark relative z-20 mt-14 flex flex-col border-r border-ocean-700/50 transition-transform duration-300 ease-out ${
          leftPanelOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full'
        }`}
        style={{ flexShrink: 0 }}
      >
        <div className="min-h-0 flex-1">
          <LeftPanel />
        </div>
      </aside>

      <main className="relative mt-14 flex-1">
        <div className="absolute inset-0">
          <MapView />
        </div>
      </main>

      <aside
        className="glass-dark relative z-20 mt-14 flex"
        style={{ flexShrink: 0 }}
      >
        <RightSidebar />
      </aside>
    </div>
  )
}
