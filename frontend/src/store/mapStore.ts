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
  setSelectedMmsi: (mmsi: number | null) => set({ selectedMmsi: mmsi }),
  setSelectedHex: (hex: string | null) => set({ selectedHex: hex }),
  setSelectedPortId: (portId: number | null) => set({ selectedPortId: portId }),
  setSelectedFleetId: (fleetId: number | null) => set({ selectedFleetId: fleetId }),
  updatePositions: (positions) =>
    set((state) => {
      const next = new Map(state.realtimePositions)
      for (const p of positions) {
        next.set(p.mmsi, p)
      }
      return { realtimePositions: next }
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
