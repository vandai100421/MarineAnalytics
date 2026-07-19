import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type {
  BoundingBox,
  PaginatedResponse,
  PredictedEta,
  TrackResponse,
  Vessel,
  VesselListItem,
  VesselPosition,
  VesselSearchResult,
} from '../types'

export function useVesselPositions(
  bbox: BoundingBox | null,
  filters?: { minSog?: number; maxSog?: number; shipTypes?: number[]; name?: string; destination?: string },
) {
  const params = new URLSearchParams()
  if (bbox) {
    params.set('bbox', `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`)
  }
  if (filters?.minSog !== undefined && filters.minSog > 0) {
    params.set('min_sog', String(filters.minSog))
  }
  if (filters?.maxSog !== undefined) {
    params.set('max_sog', String(filters.maxSog))
  }
  if (filters?.shipTypes && filters.shipTypes.length > 0) {
    params.set('ship_types', filters.shipTypes.join(','))
  }
  if (filters?.name) {
    params.set('name', filters.name)
  }
  if (filters?.destination) {
    params.set('destination', filters.destination)
  }
  const query = params.toString()

  return useQuery<VesselPosition[]>({
    queryKey: ['vessel-positions', query],
    queryFn: () => apiFetch<VesselPosition[]>(`/api/v1/vessels/positions${query ? `?${query}` : ''}`),
    refetchInterval: 30_000,
    staleTime: 20_000,
  })
}

export function useVesselCluster(
  bbox: BoundingBox | null,
  zoom: number,
  filters?: {
    minSog?: number
    maxSog?: number
    shipTypes?: number[]
    name?: string
    destination?: string
  },
) {
  const precision = zoom < 4 ? 1 : zoom < 6 ? 2 : zoom < 8 ? 3 : 4
  const params = new URLSearchParams()
  if (bbox) {
    params.set('bbox', `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`)
  }
  params.set('precision', String(precision))
  if (filters?.minSog !== undefined && filters.minSog > 0) {
    params.set('min_sog', String(filters.minSog))
  }
  if (filters?.maxSog !== undefined) {
    params.set('max_sog', String(filters.maxSog))
  }
  if (filters?.shipTypes && filters.shipTypes.length > 0) {
    params.set('ship_types', filters.shipTypes.join(','))
  }
  if (filters?.name) {
    params.set('name', filters.name)
  }
  if (filters?.destination) {
    params.set('destination', filters.destination)
  }
  const query = params.toString()

  return useQuery<VesselPosition[]>({
    queryKey: ['vessel-cluster', query],
    queryFn: () => apiFetch<VesselPosition[]>(`/api/v1/vessels/cluster?${query}`),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useVesselSearch(query: string, enabled: boolean = true) {
  return useQuery<VesselSearchResult[]>({
    queryKey: ['vessel-search', query],
    queryFn: () =>
      apiFetch<VesselSearchResult[]>(
        `/api/v1/vessels/search?q=${encodeURIComponent(query)}&limit=10`,
      ),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 30_000,
  })
}

export function useVesselList(
  limit: number = 50,
  offset: number = 0,
  filters?: { shipType?: number; name?: string; destination?: string },
) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  if (filters?.shipType !== undefined) {
    params.set('ship_type', String(filters.shipType))
  }
  if (filters?.name) {
    params.set('name', filters.name)
  }
  if (filters?.destination) {
    params.set('destination', filters.destination)
  }

  return useQuery<PaginatedResponse<VesselListItem>>({
    queryKey: ['vessel-list', limit, offset, filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<VesselListItem>>(`/api/v1/vessels/list?${params.toString()}`),
    staleTime: 10_000,
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

export function useVesselEta(mmsi: number | null) {
  return useQuery<PredictedEta>({
    queryKey: ['vessel-eta', mmsi],
    queryFn: () => apiFetch<PredictedEta>(`/api/v1/vessels/${mmsi}/eta`),
    enabled: mmsi !== null,
    refetchInterval: 30_000,
    retry: false,
  })
}
