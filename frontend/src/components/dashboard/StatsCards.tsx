import { useStatsOverview } from '../../api/stats'

export function StatsCards() {
  const { data, isLoading } = useStatsOverview()

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-3 gap-3">
        <Card label="Active" value="—" />
        <Card label="Total" value="—" />
        <Card label="Avg Speed" value="—" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card label="Active" value={String(data.active_vessels)} accent="text-sea-100" />
      <Card label="Total" value={String(data.total_vessels)} accent="text-green-400" />
      <Card
        label="Avg Speed"
        value={`${data.avg_sog} kn`}
        accent="text-amber-400"
      />
    </div>
  )
}

function Card({
  label,
  value,
  accent = 'text-white',
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-lg bg-gray-700 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}
