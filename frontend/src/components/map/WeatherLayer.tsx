import { useMemo } from 'react'
import { IconLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import type { WindPoint } from '../../api/weather'

interface CreateWeatherLayerOptions {
  data: WindPoint[]
}

function windSpeedToColor(speed: number | null): [number, number, number, number] {
  if (speed === null) return [100, 116, 139, 100]
  if (speed < 5) return [34, 197, 94, 150]
  if (speed < 10) return [132, 204, 22, 170]
  if (speed < 15) return [234, 179, 8, 180]
  if (speed < 20) return [249, 115, 22, 200]
  if (speed < 25) return [239, 68, 68, 220]
  return [220, 38, 38, 240]
}

const WEATHER_ICON =
  'M3 15h4a4 4 0 100-8 5 5 0 00-9.6 1.5M3 15v4M7 15v4M11 15v4'

export function createWeatherLayer({ data }: CreateWeatherLayerOptions): Layer {
  return new IconLayer({
    id: 'weather-layer',
    data,
    getPosition: (d: WindPoint) => [d.lon, d.lat],
    getColor: (d: WindPoint) => windSpeedToColor(d.wind_speed),
    getIcon: () => ({
      url: `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="${WEATHER_ICON}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      )}`,
      width: 24,
      height: 24,
      anchorY: 12,
      anchorX: 12,
    }),
    getSize: 24,
    sizeMinPixels: 16,
    sizeMaxPixels: 36,
    getAngle: (d: WindPoint) => -(d.wind_direction ?? 0),
    pickable: false,
  } as never)
}

export function useWeatherLayerData(points: WindPoint[] | undefined) {
  return useMemo(() => {
    if (!points || points.length === 0) return []
    return points.filter((p) => p.wind_speed !== null)
  }, [points])
}
