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
import { usePortCongestionAll } from '../../api/ports'
import { useT } from '../../i18n/useI18n'

export function PortCongestionChart() {
  const { data, isLoading } = usePortCongestionAll(10)
  const t = useT()

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  if (data.ports.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-ocean-500">
        {t('port.noArrivals')}
      </p>
    )
  }

  const chartData = data.ports.map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name,
    fullName: p.name,
    count: p.vessel_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: -10, right: 10, top: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#475569"
          fontSize={9}
          width={80}
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
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={
                entry.count > 15
                  ? '#ef4444'
                  : entry.count > 5
                    ? '#fbbf24'
                    : '#22c55e'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
