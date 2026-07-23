import { memo, lazy, Suspense, useState } from 'react'
import { useMapStore } from '../../store/mapStore'
import { useAircraftPositions } from '../../api/aircraft'
import { useT } from '../../i18n/useI18n'
import { Filters } from '../panel/Filters'
import { VesselSearch } from '../panel/VesselSearch'
import { StatsCards } from '../dashboard/StatsCards'

const Charts = lazy(() => import('../dashboard/Charts').then((m) => ({ default: m.Charts })))
const PortCongestionChart = lazy(() =>
  import('../dashboard/PortCongestionChart').then((m) => ({ default: m.PortCongestionChart })),
)

function LeftPanelComponent() {
  const filters = useMapStore((s) => s.filters)
  const setFilters = useMapStore((s) => s.setFilters)
  const layerToggles = useMapStore((s) => s.layerToggles)
  const bbox = useMapStore((s) => s.bbox)
  const mapMode = useMapStore((s) => s.mapMode)
  const t = useT()

  const showAircraft = mapMode === 'aircraft' || mapMode === 'both'

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-ocean-700/40 p-3">
        {showAircraft ? <AircraftSearchBox /> : <VesselSearch />}
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

        {showAircraft && <AircraftStats bbox={bbox} />}

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

function AircraftSearchBox() {
  const t = useT()
  const setSelectedHex = useMapStore((s) => s.setSelectedHex)
  const bbox = useMapStore((s) => s.bbox)
  const { data: aircraft } = useAircraftPositions(bbox)
  const [query, setQuery] = useState('')

  const results = query.trim().length >= 2
    ? (aircraft ?? []).filter((a) => {
        const q = query.toLowerCase()
        return (
          (a.flight && a.flight.toLowerCase().includes(q)) ||
          a.hex.toLowerCase().includes(q) ||
          (a.reg && a.reg.toLowerCase().includes(q))
        )
      }).slice(0, 10)
    : []

  return (
    <div>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
        {t('panel.searchAircraft')}
      </h3>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('panel.searchAircraft')}
        className="w-full rounded-lg border border-ocean-700/50 bg-ocean-900/50 px-3 py-2 text-xs text-white placeholder:text-ocean-500 focus:border-sea-500/50 focus:outline-none"
      />
      {results.length > 0 && (
        <div className="mt-1 max-h-64 space-y-0.5 overflow-y-auto">
          {results.map((a) => (
            <button
              key={a.hex}
              onClick={() => {
                setSelectedHex(a.hex)
                setQuery('')
              }}
              className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-ocean-200 transition-colors hover:bg-ocean-800/60"
            >
              <span className="font-semibold text-sea-300">{a.flight || a.hex}</span>
              <span className="ml-2 text-ocean-500">{a.hex}</span>
              {a.alt !== null && <span className="ml-2 text-amber-400">{Math.round(a.alt)}ft</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AircraftStats({ bbox }: { bbox: import('../../types').BoundingBox | null }) {
  const t = useT()
  const { data: aircraft } = useAircraftPositions(bbox)

  const stats = (() => {
    if (!aircraft || aircraft.length === 0) {
      return { total: 0, onGround: 0, cruising: 0, avgAlt: 0, avgGs: 0 }
    }
    const withAlt = aircraft.filter((a) => a.alt !== null)
    const withGs = aircraft.filter((a) => a.gs !== null)
    const total = aircraft.length
    const onGround = withAlt.filter((a) => (a.alt ?? 0) < 1000).length
    const cruising = withAlt.filter((a) => (a.alt ?? 0) >= 30000).length
    const avgAlt = withAlt.length > 0 ? withAlt.reduce((s, a) => s + (a.alt ?? 0), 0) / withAlt.length : 0
    const avgGs = withGs.length > 0 ? withGs.reduce((s, a) => s + (a.gs ?? 0), 0) / withGs.length : 0
    return { total, onGround, cruising, avgAlt, avgGs }
  })()

  const altBands = [
    { range: '< 1k ft', color: '#ef4444', count: 0 },
    { range: '1k-10k', color: '#f97316', count: 0 },
    { range: '10k-30k', color: '#eab308', count: 0 },
    { range: '30k-40k', color: '#22c55e', count: 0 },
    { range: '40k+', color: '#3b82f6', count: 0 },
  ]
  if (aircraft) {
    for (const a of aircraft) {
      const alt = a.alt ?? -1
      if (alt < 1000) altBands[0].count++
      else if (alt < 10000) altBands[1].count++
      else if (alt < 30000) altBands[2].count++
      else if (alt < 40000) altBands[3].count++
      else altBands[4].count++
    }
  }
  const maxBand = Math.max(...altBands.map((b) => b.count), 1)

  return (
    <div className="mt-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
        {t('section.aircraftStats')}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label={t('aircraft.active')} value={String(stats.total)} color="text-sea-300" />
        <StatCard label={t('aircraft.onGround')} value={String(stats.onGround)} color="text-red-400" />
        <StatCard label={t('aircraft.cruising')} value={String(stats.cruising)} color="text-blue-400" />
        <StatCard label={t('aircraft.avgAlt')} value={`${Math.round(stats.avgAlt)} ft`} color="text-amber-400" />
      </div>

      <div className="mt-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
          {t('chart.aircraftByAlt')}
        </h4>
        <div className="space-y-1.5">
          {altBands.map((b) => (
            <div key={b.range} className="flex items-center gap-2">
              <span className="w-16 text-[10px] text-ocean-400">{b.range}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-ocean-900/60">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(b.count / maxBand) * 100}%`, backgroundColor: b.color }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-semibold text-ocean-300">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-ocean-400">{t('aircraft.avgGs')}</p>
        <p className="mt-1 text-lg font-bold text-purple-300">{Math.round(stats.avgGs)} kn</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2">
      <p className="text-[10px] uppercase tracking-wider text-ocean-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}

export const LeftPanel = memo(LeftPanelComponent)
