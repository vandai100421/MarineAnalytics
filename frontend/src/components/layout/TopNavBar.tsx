import { memo } from 'react'
import { useMapStore } from '../../store/mapStore'
import { useStatsOverview } from '../../api/stats'
import { useI18n } from '../../i18n/useI18n'

function TopNavBarComponent() {
  const leftPanelOpen = useMapStore((s) => s.leftPanelOpen)
  const setLeftPanelOpen = useMapStore((s) => s.setLeftPanelOpen)
  const { data: stats } = useStatsOverview()
  const { t } = useI18n()

  return (
    <header className="glass-dark absolute left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-ocean-700/50 px-4">
      <div className="flex items-center gap-2">
        <svg className="h-7 w-7 text-sea-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="hidden sm:block">
          <h1 className="text-sm font-bold tracking-tight text-white">{t('app.title')}</h1>
          <p className="text-[10px] text-ocean-400">{t('app.subtitle')}</p>
        </div>
      </div>

      <div className="h-6 w-px bg-ocean-700/50" />

      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="hidden text-xs text-ocean-300 sm:inline">{t('app.live')}</span>
      </div>

      <div className="hidden items-center gap-3 text-xs lg:flex">
        <Stat label={t('stat.active')} value={stats ? String(stats.active_vessels) : '—'} color="text-sea-300" />
        <span className="h-4 w-px bg-ocean-700" />
        <Stat label={t('stat.total')} value={stats ? String(stats.total_vessels) : '—'} color="text-green-400" />
        <span className="h-4 w-px bg-ocean-700" />
        <Stat label={t('stat.avgSog')} value={stats ? `${stats.avg_sog}kn` : '—'} color="text-amber-400" />
      </div>

      <div className="flex-1" />

      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className={`rounded-lg p-2 transition-colors ${
          leftPanelOpen
            ? 'bg-sea-500/20 text-sea-300'
            : 'text-ocean-300 hover:bg-ocean-700/50 hover:text-white'
        }`}
        title={t('panel.toggleFilters')}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
    </header>
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

export const TopNavBar = memo(TopNavBarComponent)

