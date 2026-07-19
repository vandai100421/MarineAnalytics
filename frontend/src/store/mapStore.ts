import { create } from 'zustand'
import type { BoundingBox, VesselFilters, VesselPosition } from '../types'

export type MapMode = 'vessels' | 'heatmap' | 'aircraft' | 'both'

interface LayerToggles {
  ports: boolean
  tradeflow: boolean
  anchorage: boolean
  idle: boolean
  fleet: boolean
}

interface RightPanelSections {
  position: boolean
  particulars: boolean
  voyage: boolean
  track: boolean
}

interface MapState {
  bbox: BoundingBox | null
  filters: VesselFilters
  selectedMmsi: number | null
  selectedHex: string | null
  selectedPortId: number | null
  selectedFleetId: number | null
  realtimePositions: Map<number, VesselPosition>
  mapMode: MapMode
  layerToggles: LayerToggles
  playbackIndex: number
  searchQuery: string
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  rightPanelSections: RightPanelSections
  setBbox: (bbox: BoundingBox | null) => void
  setFilters: (filters: VesselFilters) => void
  setSelectedMmsi: (mmsi: number | null) => void
  setSelectedHex: (hex: string | null) => void
  setSelectedPortId: (portId: number | null) => void
  setSelectedFleetId: (fleetId: number | null) => void
  clearSelection: () => void
  updatePositions: (positions: VesselPosition[]) => void
  setMapMode: (mode: MapMode) => void
  setLayerToggle: (key: keyof LayerToggles, value: boolean) => void
  setPlaybackIndex: (index: number) => void
  setSearchQuery: (query: string) => void
  setLeftPanelOpen: (open: boolean) => void
  setRightPanelOpen: (open: boolean) => void
  toggleSection: (section: keyof RightPanelSections) => void
}

export const useMapStore = create<MapState>((set) => ({
  bbox: null,
  filters: {},
  selectedMmsi: null,
  selectedHex: null,
  selectedPortId: null,
  selectedFleetId: null,
  realtimePositions: new Map(),
  mapMode: 'vessels',
  layerToggles: { ports: false, tradeflow: false, anchorage: false, idle: false, fleet: false },
  playbackIndex: 0,
  searchQuery: '',
  leftPanelOpen: true,
  rightPanelOpen: true,
  rightPanelSections: {
    position: true,
    particulars: true,
    voyage: true,
    track: true,
  },
  setBbox: (bbox) => set({ bbox }),
  setFilters: (filters) => set({ filters }),
  setSelectedMmsi: (mmsi) =>
    set({
      selectedMmsi: mmsi,
      selectedHex: null,
      selectedPortId: null,
    }),
  setSelectedHex: (hex) =>
    set({
      selectedHex: hex,
      selectedMmsi: null,
      selectedPortId: null,
    }),
  setSelectedPortId: (portId) =>
    set({
      selectedPortId: portId,
      selectedMmsi: null,
      selectedHex: null,
    }),
  setSelectedFleetId: (fleetId) => set({ selectedFleetId: fleetId }),
  clearSelection: () =>
    set({ selectedMmsi: null, selectedHex: null, selectedPortId: null }),
  updatePositions: (positions) =>
    set((state) => {
      if (positions.length === 0) return state
      const next = new Map(state.realtimePositions)
      let changed = false
      for (const p of positions) {
        const existing = next.get(p.mmsi)
        if (!existing || existing.ts !== p.ts) {
          next.set(p.mmsi, p)
          changed = true
        }
      }
      return changed ? { realtimePositions: next } : state
    }),
  setMapMode: (mapMode) => set({ mapMode }),
  setLayerToggle: (key, value) =>
    set((state) => ({
      layerToggles: { ...state.layerToggles, [key]: value },
    })),
  setPlaybackIndex: (playbackIndex) => set({ playbackIndex }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLeftPanelOpen: (leftPanelOpen) => set({ leftPanelOpen }),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  toggleSection: (section) =>
    set((state) => ({
      rightPanelSections: {
        ...state.rightPanelSections,
        [section]: !state.rightPanelSections[section],
      },
    })),
}))
