import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Fleet, FleetCreate, FleetMember, FleetStats } from '../types'

export function useFleets() {
  return useQuery<Fleet[]>({
    queryKey: ['fleets'],
    queryFn: () => apiFetch<Fleet[]>('/api/v1/fleets'),
    refetchInterval: 30_000,
  })
}

export interface FleetMemberColor {
  mmsi: number
  color: string
  fleet_name: string
}

export function useAllFleetMembers() {
  return useQuery<FleetMemberColor[]>({
    queryKey: ['fleet-all-members'],
    queryFn: () => apiFetch<FleetMemberColor[]>('/api/v1/fleets/all-members'),
    refetchInterval: 30_000,
  })
}

export function useFleetMembers(fleetId: number | null) {
  return useQuery<FleetMember[]>({
    queryKey: ['fleet-members', fleetId],
    queryFn: () => apiFetch<FleetMember[]>(`/api/v1/fleets/${fleetId}/members`),
    enabled: fleetId !== null,
    refetchInterval: 30_000,
  })
}

export function useFleetStats(fleetId: number | null) {
  return useQuery<FleetStats>({
    queryKey: ['fleet-stats', fleetId],
    queryFn: () => apiFetch<FleetStats>(`/api/v1/fleets/${fleetId}/stats`),
    enabled: fleetId !== null,
    refetchInterval: 15_000,
  })
}

export function useCreateFleet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FleetCreate) =>
      apiFetch<Fleet>('/api/v1/fleets', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fleets'] }),
  })
}

export function useDeleteFleet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fleetId: number) =>
      apiFetch<void>(`/api/v1/fleets/${fleetId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fleets'] }),
  })
}

export function useAddMember(fleetId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mmsi: number) =>
      apiFetch<FleetMember>(`/api/v1/fleets/${fleetId}/members`, {
        method: 'POST',
        body: JSON.stringify({ mmsi }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-members', fleetId] })
      qc.invalidateQueries({ queryKey: ['fleets'] })
      qc.invalidateQueries({ queryKey: ['fleet-stats', fleetId] })
    },
  })
}

export function useRemoveMember(fleetId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mmsi: number) =>
      apiFetch<void>(`/api/v1/fleets/${fleetId}/members/${mmsi}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-members', fleetId] })
      qc.invalidateQueries({ queryKey: ['fleets'] })
      qc.invalidateQueries({ queryKey: ['fleet-stats', fleetId] })
    },
  })
}
