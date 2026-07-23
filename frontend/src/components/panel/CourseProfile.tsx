import { memo, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useVesselTrack } from '../../api/vessels'
import { useI18n } from '../../i18n/useI18n'

interface CourseProfileProps {
  mmsi: number
}

function CourseProfileComponent({ mmsi }: CourseProfileProps) {
  const { data: trackData, isLoading } = useVesselTrack(mmsi)
  const { t } = useI18n()

  const chartData = useMemo(() => {
    if (!trackData || trackData.points.length === 0) return []
    const step = Math.max(1, Math.floor(trackData.points.length / 100))
    return trackData.points
      .filter((_, i) => i % step === 0)
      .map((p) => ({
        ts: new Date(p.ts).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cog: p.cog ?? 0,
        heading: p.heading ?? 0,
      }))
  }, [trackData])

  if (isLoading || !trackData || trackData.points.length === 0) {
    return <p className="py-3 text-center text-xs text-ocean-500">{t('vessel.noTrack')}</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
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
          <YAxis
            stroke="#475569"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            domain={[0, 360]}
            unit="°"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid #3d4e6b',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
          />
          <Line
            type="monotone"
            dataKey="cog"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name={t('field.course')}
            unit="°"
          />
          <Line
            type="monotone"
            dataKey="heading"
            stroke="#a78bfa"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            name={t('field.heading')}
            unit="°"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export const CourseProfile = memo(CourseProfileComponent)
