import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { TradeFlowListResponse } from '../types'

export function useTradeFlows(limit: number = 50) {
  return useQuery<TradeFlowListResponse>({
    queryKey: ['trade-flows', limit],
    queryFn: () => apiFetch<TradeFlowListResponse>(`/api/v1/trade-flows?limit=${limit}`),
    refetchInterval: 60_000,
  })
}
