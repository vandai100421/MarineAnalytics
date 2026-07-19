import { lazy, Suspense, useEffect } from 'react'
import { MapView } from './components/map/MapView'
import { TopNavBar } from './components/layout/TopNavBar'
import { LeftPanel } from './components/layout/LeftPanel'
import { useMapStore } from './store/mapStore'
import { useT } from './i18n/useI18n'

const GeofenceEditor = lazy(() =>
  import('./components/geofence/GeofenceEditor').then((m) => ({ default: m.GeofenceEditor })),
)
const AlertPanel = lazy(() =>
  import('./components/geofence/AlertPanel').then((m) => ({ default: m.AlertPanel })),
)

export default function App() {
  const leftPanelOpen = useMapStore((state) => state.leftPanelOpen)
  const setRightPanelOpen = useMapStore((state) => state.setRightPanelOpen)
  const selectedMmsi = useMapStore((state) => state.selectedMmsi)
  const selectedHex = useMapStore((state) => state.selectedHex)
  const selectedPortId = useMapStore((state) => state.selectedPortId)
  const t = useT()

  const hasSelection = selectedMmsi !== null || selectedHex !== null || selectedPortId !== null

  useEffect(() => {
    setRightPanelOpen(hasSelection)
  }, [hasSelection, setRightPanelOpen])

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
          <div className="border-t border-ocean-700/40 p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
              {t('section.geofences')}
            </h3>
            <Suspense
              fallback={<div className="text-center text-xs text-ocean-400">{t('panel.loading')}</div>}
            >
              <GeofenceEditor isActive={false} onToggle={() => {}} onCreated={() => {}} />
            </Suspense>
            <div className="mt-3">
              <Suspense
                fallback={<div className="text-center text-xs text-ocean-400">{t('panel.loading')}</div>}
              >
                <AlertPanel />
              </Suspense>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative mt-14 flex-1">
        <div className="absolute inset-0">
          <MapView />
        </div>
      </main>
    </div>
  )
}
