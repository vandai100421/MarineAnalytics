import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { ByTypeResponse, OverviewResponse, TimeSeriesResponse } from '../types'

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

export function useStatsTimeseries(period: '24h' | '7d' | '30d' = '24h') {
  return useQuery<TimeSeriesResponse>({
    queryKey: ['stats-timeseries', period],
    queryFn: () => apiFetch<TimeSeriesResponse>(`/api/v1/stats/timeseries?period=${period}`),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
