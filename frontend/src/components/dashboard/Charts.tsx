import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useStatsByType } from '../../api/stats'

export function Charts() {
  const { data, isLoading } = useStatsByType()

  if (isLoading || !data) {
    return <p className="text-sm text-gray-400">Loading charts...</p>
  }

  const chartData = data.types
    .filter((t) => t.count > 0)
    .slice(0, 10)
    .map((t) => ({
      name: t.ship_type_name,
      count: t.count,
    }))

  if (chartData.length === 0) {
    return <p className="text-sm text-gray-400">No data available</p>
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">Vessels by Type</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" stroke="#9ca3af" fontSize={11} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            fontSize={11}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
