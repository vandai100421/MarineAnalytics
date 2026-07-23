import { memo, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useVesselTrack } from '../../api/vessels'
import { useI18n } from '../../i18n/useI18n'

interface DistanceProfileProps {
  mmsi: number
}

const EARTH_RADIUS_NM = 3440.065

function haversineNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a))
}

function DistanceProfileComponent({ mmsi }: DistanceProfileProps) {
  const { data: trackData, isLoading } = useVesselTrack(mmsi)
  const { t } = useI18n()

  const chartData = useMemo(() => {
    if (!trackData || trackData.points.length === 0) return []
    const step = Math.max(1, Math.floor(trackData.points.length / 100))
    const sampled = trackData.points.filter((_, i) => i % step === 0)
    let cumulative = 0
    return sampled.map((p, i) => {
      if (i > 0) {
        const prev = sampled[i - 1]
        cumulative += haversineNm(prev.lat, prev.lon, p.lat, p.lon)
      }
      return {
        ts: new Date(p.ts).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        distance: Number(cumulative.toFixed(2)),
      }
    })
  }, [trackData])

  if (isLoading || !trackData || trackData.points.length === 0) {
    return <p className="py-3 text-center text-xs text-ocean-500">{t('vessel.noTrack')}</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
          <defs>
            <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} unit="nm" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid #3d4e6b',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
          />
          <Area
            type="monotone"
            dataKey="distance"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#distGrad)"
            name={t('field.distance')}
            unit="nm"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export const DistanceProfile = memo(DistanceProfileComponent)
