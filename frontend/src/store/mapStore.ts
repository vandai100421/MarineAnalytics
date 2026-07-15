import { create } from 'zustand'
import type { BoundingBox, VesselFilters } from '../types'

interface MapState {
  bbox: BoundingBox | null
  filters: VesselFilters
  selectedMmsi: number | null
  setBbox: (bbox: BoundingBox | null) => void
  setFilters: (filters: VesselFilters) => void
  setSelectedMmsi: (mmsi: number | null) => void
}

export const useMapStore = create<MapState>((set) => ({
  bbox: null,
  filters: {},
  selectedMmsi: null,
  setBbox: (bbox) => set({ bbox }),
  setFilters: (filters) => set({ filters }),
  setSelectedMmsi: (mmsi) => set({ selectedMmsi: mmsi }),
}))
