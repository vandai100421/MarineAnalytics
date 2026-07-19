import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useState } from 'react'
import { useStatsByType, useStatsTimeseries } from '../../api/stats'
import { exportTimeseriesCSV } from '../../api/exports'
import { useI18n } from '../../i18n/useI18n'

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
  const [view, setView] = useState<'type' | 'timeseries'>('type')
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h')
  const { data: byTypeData, isLoading: typeLoading } = useStatsByType()
  const { data: tsData, isLoading: tsLoading } = useStatsTimeseries(period)
  const { t } = useI18n()

  return (
    <div className="rounded-xl border border-ocean-700/40 bg-ocean-900/40 p-3">
      <div className="mb-3 flex items-center gap-1">
        <button
          onClick={() => setView('type')}
          className={`rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all ${
            view === 'type' ? 'bg-sea-500/20 text-sea-300' : 'text-ocean-400 hover:text-ocean-200'
          }`}
        >
          {t('chart.byType')}
        </button>
        <button
          onClick={() => setView('timeseries')}
          className={`rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all ${
            view === 'timeseries'
              ? 'bg-sea-500/20 text-sea-300'
              : 'text-ocean-400 hover:text-ocean-200'
          }`}
        >
          {t('chart.timeline')}
        </button>
        {view === 'timeseries' && (
          <div className="ml-auto flex items-center gap-0.5">
            {(['24h', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-all ${
                  period === p ? 'bg-sea-500/30 text-sea-200' : 'text-ocean-500 hover:text-ocean-300'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => exportTimeseriesCSV(period)}
              className="ml-1 rounded p-0.5 text-ocean-400 hover:text-sea-300"
              title={t('vessel.exportTrack')}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {view === 'type' && (
        <>
          {typeLoading || !byTypeData ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
            </div>
          ) : byTypeData.types.filter((tp) => tp.count > 0).length === 0 ? (
            <p className="py-8 text-center text-sm text-ocean-400">{t('chart.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={byTypeData.types
                  .filter((tp) => tp.count > 0)
                  .slice(0, 10)
                  .map((tp) => ({ name: tp.ship_type_name, count: tp.count }))}
                layout="vertical"
                margin={{ left: -10, right: 10, top: 0, bottom: 0 }}
              >
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
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                  {byTypeData.types
                    .filter((tp) => tp.count > 0)
                    .slice(0, 10)
                    .map((entry) => (
                      <Cell key={entry.ship_type_name} fill={TYPE_BAR_COLORS[entry.ship_type_name] ?? '#0ea5e9'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      )}

      {view === 'timeseries' && (
        <>
          {tsLoading || !tsData ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
            </div>
          ) : tsData.points.length === 0 ? (
            <p className="py-8 text-center text-sm text-ocean-400">{t('chart.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={tsData.points.map((p) => ({
                  ts: new Date(p.ts).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  count: p.vessel_count,
                  sog: p.avg_sog,
                }))}
                margin={{ left: -16, right: 10, top: 5, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="ts"
                  stroke="#475569"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid #3d4e6b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e2e8f0',
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={false} name={t('layer.vessels')} />
                <Line
                  type="monotone"
                  dataKey="sog"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  name={t('stat.avgSog')}
                  yAxisId="right"
                />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={9} tickLine={false} axisLine={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </div>
  )
}
