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
    refetchInterval: 15_000,
    staleTime: 10_000,
  })
}

export function useVesselCluster(bbox: BoundingBox | null, zoom: number) {
  const precision = zoom < 4 ? 1 : zoom < 6 ? 2 : zoom < 8 ? 3 : 4
  const params = new URLSearchParams()
  if (bbox) {
    params.set('bbox', `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`)
  }
  params.set('precision', String(precision))
  const query = params.toString()

  return useQuery<VesselPosition[]>({
    queryKey: ['vessel-cluster', query],
    queryFn: () => apiFetch<VesselPosition[]>(`/api/v1/vessels/cluster?${query}`),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useVessel(mmsi: number | null) {
  return useQuery<Vessel>({
    queryKey: ['vessel', mmsi],
    queryFn: () => apiFetch<Vessel>(`/api/v1/vessels/${mmsi}`),
    enabled: mmsi !== null,
    retry: false,
  })
}

export function useVesselRealtime(mmsi: number | null) {
  return useQuery<VesselPosition>({
    queryKey: ['vessel-realtime', mmsi],
    queryFn: () => apiFetch<VesselPosition>(`/api/v1/vessels/${mmsi}/realtime`),
    enabled: mmsi !== null,
    refetchInterval: 5_000,
    retry: false,
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
