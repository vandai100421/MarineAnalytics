import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useStatsByType } from '../../api/stats'

const TYPE_BAR_COLORS: Record<string, string> = {
  Cargo: '#3b82f6',
  Tanker: '#a855f7',
  Fishing: '#f97316',
  Passenger: '#06b6d4',
  Sailing: '#22c55e',
  'Pleasure craft': '#14b8a6',
  Tug: '#eab308',
  Towing: '#eab308',
  'Pilot vessel': '#ec4899',
  'Search and rescue': '#ec4899',
}

export function Charts() {
  const { data, isLoading } = useStatsByType()

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  const chartData = data.types
    .filter((t) => t.count > 0)
    .slice(0, 10)
    .map((t) => ({
      name: t.ship_type_name,
      count: t.count,
    }))

  if (chartData.length === 0) {
    return <p className="py-8 text-center text-sm text-ocean-400">No data available</p>
  }

  return (
    <div className="rounded-xl border border-ocean-700/40 bg-ocean-900/40 p-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ocean-400">
        Vessels by Type
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#475569"
            fontSize={10}
            width={70}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(30, 41, 59, 0.5)' }}
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid #3d4e6b',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={TYPE_BAR_COLORS[entry.name] ?? '#0ea5e9'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
