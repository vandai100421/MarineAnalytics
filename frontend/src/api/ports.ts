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

export interface ExpectedArrival {
  mmsi: number
  name: string | null
  destination: string | null
  eta: string | null
  ship_type_name: string | null
}

export interface ExpectedArrivalsResponse {
  total: number
  port_name: string
  horizon_hours: number
  vessels: ExpectedArrival[]
}

export function usePortExpectedArrivals(portId: number | null, hours: number = 24) {
  return useQuery<ExpectedArrivalsResponse>({
    queryKey: ['port-expected-arrivals', portId, hours],
    queryFn: () =>
      apiFetch<ExpectedArrivalsResponse>(
        `/api/v1/ports/${portId}/expected-arrivals?hours=${hours}`,
      ),
    enabled: portId !== null,
    refetchInterval: 60_000,
  })
}

export interface RecentDeparture {
  id: number
  mmsi: number
  arrived_at: string | null
  departed_at: string | null
  dwell_minutes: number | null
  anchorage: boolean
}

export interface RecentDeparturesResponse {
  total: number
  port_name: string
  horizon_hours: number
  departures: RecentDeparture[]
}

export function usePortRecentDepartures(portId: number | null, hours: number = 24) {
  return useQuery<RecentDeparturesResponse>({
    queryKey: ['port-recent-departures', portId, hours],
    queryFn: () =>
      apiFetch<RecentDeparturesResponse>(
        `/api/v1/ports/${portId}/recent-departures?hours=${hours}`,
      ),
    enabled: portId !== null,
    refetchInterval: 60_000,
  })
}
