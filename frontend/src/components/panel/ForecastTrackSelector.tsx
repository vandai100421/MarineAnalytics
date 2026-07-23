import { memo } from 'react'
import { useMapStore, type ForecastHorizon } from '../../store/mapStore'

const HORIZONS: ForecastHorizon[] = [0, 1, 3, 6, 12, 24]

function ForecastTrackSelectorComponent() {
  const horizon = useMapStore((s) => s.forecastHorizon)
  const setHorizon = useMapStore((s) => s.setForecastHorizon)

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
        Forecast Track
      </p>
      <div className="grid grid-cols-6 gap-1">
        {HORIZONS.map((value) => (
          <button
            key={value}
            onClick={() => setHorizon(value)}
            className={`rounded-md px-1 py-1 text-[10px] font-medium transition-all ${
              horizon === value
                ? 'bg-purple-500 text-white'
                : 'border border-ocean-700/40 bg-ocean-900/40 text-ocean-300 hover:bg-ocean-800/50 hover:text-white'
            }`}
          >
            {value === 0 ? 'OFF' : `${value}h`}
          </button>
        ))}
      </div>
    </div>
  )
}

export const ForecastTrackSelector = memo(ForecastTrackSelectorComponent)

interface ForecastPoint {
  lon: number
  lat: number
  ts: string
}

export function computeForecast(
  track: { lon: number; lat: number; sog: number | null; cog: number | null; ts: string }[],
  horizonHours: number,
): ForecastPoint[] {
  if (track.length === 0 || horizonHours === 0) return []
  const last = track[track.length - 1]
  if (!last.sog || !last.cog) return []

  const sogKnots = last.sog
  const cogRad = (last.cog * Math.PI) / 180
  const speedKmh = sogKnots * 1.852

  const points: ForecastPoint[] = []
  const startTs = new Date(last.ts).getTime()
  const stepMin = 10
  const totalSteps = (horizonHours * 60) / stepMin

  let lat = last.lat
  let lon = last.lon

  for (let i = 1; i <= totalSteps; i++) {
    const stepHours = stepMin / 60
    const distanceKm = speedKmh * stepHours
    const distanceDeg = distanceKm / 111

    lat += distanceDeg * Math.cos(cogRad)
    lon += distanceDeg * Math.sin(cogRad) / Math.cos((lat * Math.PI) / 180)

    points.push({
      lon,
      lat,
      ts: new Date(startTs + i * stepMin * 60_000).toISOString(),
    })
  }
  return points
}
