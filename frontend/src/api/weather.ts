import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { BoundingBox } from '../types'

export interface WindPoint {
  lat: number
  lon: number
  wind_speed: number | null
  wind_direction: number | null
  wave_height: number | null
}

export interface WindResponse {
  points: WindPoint[]
}

export function useWind(bbox: BoundingBox | null, enabled: boolean = true) {
  const bs = bbox
    ? `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`
    : null
  return useQuery<WindResponse>({
    queryKey: ['wind', bs],
    queryFn: () =>
      apiFetch<WindResponse>(`/api/v1/weather/wind?bbox=${encodeURIComponent(bs ?? '')}`),
    enabled: enabled && bs !== null,
    refetchInterval: 600_000,
    staleTime: 300_000,
  })
}
