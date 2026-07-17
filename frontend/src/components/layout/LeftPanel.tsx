import { memo, lazy, Suspense } from 'react'
import { useMapStore } from '../../store/mapStore'
import { useT } from '../../i18n/useI18n'
import { Filters } from '../panel/Filters'
import { VesselSearch } from '../panel/VesselSearch'
import { LayerControls } from '../panel/LayerControls'
import { StatsCards } from '../dashboard/StatsCards'

const Charts = lazy(() => import('../dashboard/Charts').then((m) => ({ default: m.Charts })))
const PortCongestionChart = lazy(() =>
  import('../dashboard/PortCongestionChart').then((m) => ({ default: m.PortCongestionChart })),
)

function LeftPanelComponent() {
  const filters = useMapStore((s) => s.filters)
  const setFilters = useMapStore((s) => s.setFilters)
  const layerToggles = useMapStore((s) => s.layerToggles)
  const t = useT()

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-ocean-700/40 p-3">
        <VesselSearch />
      </div>

      <div className="border-b border-ocean-700/40 p-3">
        <LayerControls />
      </div>

      <div className="border-b border-ocean-700/40 p-3">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
          {t('section.filters')}
        </h3>
        <Filters filters={filters} onChange={setFilters} />
      </div>

      <div className="p-3">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
          {t('section.overview')}
        </h3>
        <StatsCards />
        <div className="mt-3">
          <Suspense
            fallback={<div className="py-8 text-center text-sm text-ocean-400">{t('chart.loadingCharts')}</div>}
          >
            <Charts />
          </Suspense>
        </div>
        {(layerToggles.ports || layerToggles.tradeflow) && (
          <div className="mt-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
              {t('section.portCongestion')}
            </h3>
            <Suspense
              fallback={<div className="py-4 text-center text-xs text-ocean-400">{t('panel.loading')}</div>}
            >
              <PortCongestionChart />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}

export const LeftPanel = memo(LeftPanelComponent)
