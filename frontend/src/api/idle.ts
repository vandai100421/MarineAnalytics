import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { IdleEventListResponse, IdleSummary } from '../types'

export function useIdleEvents(
  bbox: string | null = null,
  activeOnly: boolean = false,
  limit: number = 200,
) {
  const params = new URLSearchParams()
  if (bbox) params.set('bbox', bbox)
  if (activeOnly) params.set('active_only', 'true')
  params.set('limit', String(limit))
  const query = params.toString()

  return useQuery<IdleEventListResponse>({
    queryKey: ['idle-events', bbox, activeOnly, limit],
    queryFn: () => apiFetch<IdleEventListResponse>(`/api/v1/idle-events?${query}`),
    refetchInterval: 30_000,
  })
}

export function useIdleSummary() {
  return useQuery<IdleSummary>({
    queryKey: ['idle-summary'],
    queryFn: () => apiFetch<IdleSummary>('/api/v1/idle-events/summary'),
    refetchInterval: 30_000,
  })
}
