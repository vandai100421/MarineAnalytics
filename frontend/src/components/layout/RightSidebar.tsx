import { memo, lazy, Suspense } from 'react'
import { useMapStore, type RightTab } from '../../store/mapStore'
import { useT } from '../../i18n/useI18n'
import { BaseLayers, AnalyticsOverlays } from '../panel/LayerControls'
import { RightPanel } from './RightPanel'

const FleetManager = lazy(() =>
  import('../panel/FleetManager').then((m) => ({ default: m.FleetManager })),
)
const GeofenceEditor = lazy(() =>
  import('../geofence/GeofenceEditor').then((m) => ({ default: m.GeofenceEditor })),
)
const AlertPanel = lazy(() =>
  import('../geofence/AlertPanel').then((m) => ({ default: m.AlertPanel })),
)

interface TabDef {
  id: RightTab
  label: string
  icon: string
}

const TABS: TabDef[] = [
  {
    id: 'layers',
    label: 'section.baseLayers',
    icon: 'M3 6l9-3 9 3v15l-9-3-9 3V6z',
  },
  {
    id: 'analytics',
    label: 'section.analyticsOverlays',
    icon: 'M3 17l6-6 4 4 8-8M14 7h7v7',
  },
  {
    id: 'fleet',
    label: 'section.fleetManager',
    icon: 'M3 6h18M3 12h18M3 18h18',
  },
  {
    id: 'geofences',
    label: 'section.geofences',
    icon: 'M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z',
  },
  {
    id: 'alerts',
    label: 'section.alerts',
    icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v4M12 16h.01',
  },
  {
    id: 'details',
    label: 'section.details',
    icon: 'M12 16v-4M12 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
]

function RightSidebarComponent() {
  const rightActiveTab = useMapStore((s) => s.rightActiveTab)
  const toggleRightTab = useMapStore((s) => s.toggleRightTab)
  const selectedMmsi = useMapStore((s) => s.selectedMmsi)
  const selectedHex = useMapStore((s) => s.selectedHex)
  const selectedPortId = useMapStore((s) => s.selectedPortId)
  const t = useT()

  const hasSelection = selectedMmsi !== null || selectedHex !== null || selectedPortId !== null
  const isPanelOpen = rightActiveTab !== null

  return (
    <div className="flex h-full">
      <div
        className={`glass-dark flex h-full flex-col border-l border-ocean-700/50 transition-all duration-300 ease-out ${
          isPanelOpen ? 'w-80 opacity-100' : 'w-0 overflow-hidden opacity-0'
        }`}
        style={{ flexShrink: 0 }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {rightActiveTab === 'layers' && (
            <TabContent title={t('section.baseLayers')}>
              <BaseLayers />
            </TabContent>
          )}
          {rightActiveTab === 'analytics' && (
            <TabContent title={t('section.analyticsOverlays')}>
              <AnalyticsOverlays />
            </TabContent>
          )}
          {rightActiveTab === 'fleet' && (
            <TabContent title={t('section.fleetManager')}>
              <Suspense fallback={<Loading />}>
                <FleetManager />
              </Suspense>
            </TabContent>
          )}
          {rightActiveTab === 'geofences' && (
            <TabContent title={t('section.geofences')}>
              <Suspense fallback={<Loading />}>
                <GeofenceEditor isActive={false} onToggle={() => {}} onCreated={() => {}} />
              </Suspense>
            </TabContent>
          )}
          {rightActiveTab === 'alerts' && (
            <TabContent title={t('section.alerts')}>
              <Suspense fallback={<Loading />}>
                <AlertPanel />
              </Suspense>
            </TabContent>
          )}
          {rightActiveTab === 'details' && <RightPanel />}
        </div>
      </div>

      <nav
        className="glass-dark flex h-full w-14 flex-col border-l border-ocean-700/50 py-2"
        style={{ flexShrink: 0 }}
      >
        {TABS.map((tab) => {
          const isActive = rightActiveTab === tab.id
          const disabled = tab.id === 'details' && !hasSelection
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && toggleRightTab(tab.id)}
              disabled={disabled}
              title={t(tab.label as never)}
              className={`group relative mx-1 my-0.5 flex h-12 items-center justify-center rounded-lg transition-all ${
                disabled
                  ? 'cursor-not-allowed text-ocean-700'
                  : isActive
                    ? 'bg-sea-500/20 text-sea-300'
                    : 'text-ocean-400 hover:bg-ocean-800/60 hover:text-white'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-sea-400" />
              )}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={tab.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-ocean-800 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block">
                {t(tab.label as never)}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function TabContent({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ocean-700/40 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ocean-200">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
    </div>
  )
}

export const RightSidebar = memo(RightSidebarComponent)
