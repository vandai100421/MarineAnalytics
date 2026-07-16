import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

interface OverviewResponse {
  active_vessels: number
  total_vessels: number
  avg_sog: number
}

interface TypeCount {
  ship_type: number
  ship_type_name: string
  count: number
}

interface ByTypeResponse {
  types: TypeCount[]
}

export function useStatsOverview() {
  return useQuery<OverviewResponse>({
    queryKey: ['stats-overview'],
    queryFn: () => apiFetch<OverviewResponse>('/api/v1/stats/overview'),
    refetchInterval: 15_000,
  })
}

export function useStatsByType() {
  return useQuery<ByTypeResponse>({
    queryKey: ['stats-by-type'],
    queryFn: () => apiFetch<ByTypeResponse>('/api/v1/stats/by-type'),
    refetchInterval: 30_000,
  })
}
