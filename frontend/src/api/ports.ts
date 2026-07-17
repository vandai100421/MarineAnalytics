import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type {
  BoundingBox,
  Port,
  PortArrivalsListResponse,
  PortCongestion,
  PortCongestionListResponse,
} from '../types'

function bboxStr(bbox: BoundingBox | null): string | null {
  if (!bbox) return null
  return `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`
}

export function usePorts(bbox: BoundingBox | null, enabled: boolean = true) {
  const bs = bboxStr(bbox)
  const params = new URLSearchParams()
  if (bs) params.set('bbox', bs)
  params.set('limit', '200')
  const query = params.toString()

  return useQuery<Port[]>({
    queryKey: ['ports', bs],
    queryFn: () => apiFetch<Port[]>(`/api/v1/ports?${query}`),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function usePort(portId: number | null) {
  return useQuery<Port>({
    queryKey: ['port', portId],
    queryFn: () => apiFetch<Port>(`/api/v1/ports/${portId}`),
    enabled: portId !== null,
    retry: false,
  })
}

export function usePortCongestion(portId: number | null) {
  return useQuery<PortCongestion>({
    queryKey: ['port-congestion', portId],
    queryFn: () => apiFetch<PortCongestion>(`/api/v1/ports/${portId}/congestion`),
    enabled: portId !== null,
    refetchInterval: 15_000,
  })
}

export function usePortArrivals(portId: number | null, limit: number = 20) {
  return useQuery<PortArrivalsListResponse>({
    queryKey: ['port-arrivals', portId, limit],
    queryFn: () =>
      apiFetch<PortArrivalsListResponse>(
        `/api/v1/ports/${portId}/arrivals?limit=${limit}`,
      ),
    enabled: portId !== null,
    refetchInterval: 30_000,
  })
}

export function usePortCongestionAll(limit: number = 10) {
  return useQuery<PortCongestionListResponse>({
    queryKey: ['port-congestion-all', limit],
    queryFn: () =>
      apiFetch<PortCongestionListResponse>(
        `/api/v1/stats/port-congestion?limit=${limit}`,
      ),
    refetchInterval: 30_000,
  })
}
