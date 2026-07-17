import { memo } from 'react'
import { useStatsOverview } from '../../api/stats'
import { useT } from '../../i18n/useI18n'

function StatsCardsComponent() {
  const { data, isLoading } = useStatsOverview()
  const t = useT()

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-3 gap-2">
        <Card label={t('stat.active')} value="—" />
        <Card label={t('stat.total')} value="—" />
        <Card label={t('stat.avgSpeed')} value="—" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Card
        label={t('stat.active')}
        value={String(data.active_vessels)}
        icon="M5 13l4 4L19 7"
        color="text-sea-300"
        bg="from-sea-500/10 to-transparent"
      />
      <Card
        label={t('stat.total')}
        value={String(data.total_vessels)}
        icon="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z"
        color="text-green-400"
        bg="from-green-500/10 to-transparent"
      />
      <Card
        label={t('stat.avgSpeed')}
        value={`${data.avg_sog}`}
        unit="kn"
        icon="M13 10V3L4 14h7v7l9-11h-7z"
        color="text-amber-400"
        bg="from-amber-500/10 to-transparent"
      />
    </div>
  )
}

export const StatsCards = memo(StatsCardsComponent)

function Card({
  label,
  value,
  unit,
  icon,
  color = 'text-white',
  bg = 'from-ocean-700/20 to-transparent',
}: {
  label: string
  value: string
  unit?: string
  icon?: string
  color?: string
  bg?: string
}) {
  return (
    <div className={`rounded-xl border border-ocean-700/40 bg-gradient-to-br ${bg} p-3`}>
      {icon && (
        <svg className={`mb-1.5 h-4 w-4 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {unit && <span className="text-xs text-ocean-500">{unit}</span>}
      </div>
    </div>
  )
}
