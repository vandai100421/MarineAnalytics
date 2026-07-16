import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { AircraftPosition, BoundingBox } from '../types'

export function useAircraftPositions(bbox: BoundingBox | null) {
  const params = new URLSearchParams()
  if (bbox) {
    params.set('bbox', `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`)
  }
  const query = params.toString()

  return useQuery<AircraftPosition[]>({
    queryKey: ['aircraft-positions', query],
    queryFn: () =>
      apiFetch<AircraftPosition[]>(`/api/v1/aircraft/positions${query ? `?${query}` : ''}`),
    refetchInterval: 10_000,
    staleTime: 5_000,
  })
}
