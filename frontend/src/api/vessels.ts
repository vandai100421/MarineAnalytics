import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { TrackResponse, Vessel, VesselPosition, BoundingBox } from '../types'

export function useVesselPositions(bbox: BoundingBox | null, minSog?: number) {
  const params = new URLSearchParams()
  if (bbox) {
    params.set('bbox', `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`)
  }
  if (minSog !== undefined && minSog > 0) {
    params.set('min_sog', String(minSog))
  }
  const query = params.toString()

  return useQuery<VesselPosition[]>({
    queryKey: ['vessel-positions', query],
    queryFn: () => apiFetch<VesselPosition[]>(`/api/v1/vessels/positions${query ? `?${query}` : ''}`),
    refetchInterval: 10_000,
    staleTime: 5_000,
  })
}

export function useVessel(mmsi: number | null) {
  return useQuery<Vessel>({
    queryKey: ['vessel', mmsi],
    queryFn: () => apiFetch<Vessel>(`/api/v1/vessels/${mmsi}`),
    enabled: mmsi !== null,
  })
}

export function useVesselTrack(
  mmsi: number | null,
  from?: string,
  to?: string,
) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()

  return useQuery<TrackResponse>({
    queryKey: ['vessel-track', mmsi, from, to],
    queryFn: () =>
      apiFetch<TrackResponse>(`/api/v1/vessels/${mmsi}/track${query ? `?${query}` : ''}`),
    enabled: mmsi !== null,
  })
}
