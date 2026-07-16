import { create } from 'zustand'
import type { BoundingBox, VesselFilters, VesselPosition } from '../types'

interface MapState {
  bbox: BoundingBox | null
  filters: VesselFilters
  selectedMmsi: number | null
  realtimePositions: Map<number, VesselPosition>
  view: 'map' | 'dashboard'
  mapMode: 'vessels' | 'heatmap'
  playbackIndex: number
  setBbox: (bbox: BoundingBox | null) => void
  setFilters: (filters: VesselFilters) => void
  setSelectedMmsi: (mmsi: number | null) => void
  updatePositions: (positions: VesselPosition[]) => void
  setView: (view: 'map' | 'dashboard') => void
  setMapMode: (mode: 'vessels' | 'heatmap') => void
  setPlaybackIndex: (index: number) => void
}

export const useMapStore = create<MapState>((set) => ({
  bbox: null,
  filters: {},
  selectedMmsi: null,
  realtimePositions: new Map(),
  view: 'map',
  mapMode: 'vessels',
  playbackIndex: 0,
  setBbox: (bbox) => set({ bbox }),
  setFilters: (filters) => set({ filters }),
  setSelectedMmsi: (mmsi: number | null) => set({ selectedMmsi: mmsi }),
  updatePositions: (positions) =>
    set((state) => {
      const next = new Map(state.realtimePositions)
      for (const p of positions) {
        next.set(p.mmsi, p)
      }
      return { realtimePositions: next }
    }),
  setView: (view) => set({ view }),
  setMapMode: (mapMode) => set({ mapMode }),
  setPlaybackIndex: (playbackIndex) => set({ playbackIndex }),
}))
