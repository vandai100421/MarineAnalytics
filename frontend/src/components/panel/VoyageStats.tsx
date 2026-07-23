import { memo } from 'react'
import { useVesselTrackStats } from '../../api/vessels'
import { useT } from '../../i18n/useI18n'

interface VoyageStatsProps {
  mmsi: number
}

function VoyageStatsComponent({ mmsi }: VoyageStatsProps) {
  const { data } = useVesselTrackStats(mmsi)
  const t = useT()

  if (!data || data.duration_hours === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard
        label={t('track.totalDistance')}
        value={data.total_distance_nm.toFixed(1)}
        unit="nm"
        color="text-sea-300"
      />
      <StatCard
        label={t('track.duration')}
        value={formatDuration(data.duration_hours)}
        color="text-amber-300"
      />
      <StatCard
        label={t('track.avgSpeed')}
        value={data.avg_sog.toFixed(1)}
        unit="kn"
        color="text-green-300"
      />
      <StatCard
        label={t('track.maxSpeed')}
        value={data.max_sog.toFixed(1)}
        unit="kn"
        color="text-red-300"
      />
    </div>
  )
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: string
  unit?: string
  color: string
}) {
  return (
    <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <p className={`text-sm font-bold ${color}`}>{value}</p>
        {unit && <span className="text-[10px] text-ocean-500">{unit}</span>}
      </div>
    </div>
  )
}

export const VoyageStats = memo(VoyageStatsComponent)
