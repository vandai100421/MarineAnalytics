import { create } from 'zustand'
import type { BoundingBox, VesselFilters, VesselPosition } from '../types'

export type MapMode = 'vessels' | 'heatmap' | 'aircraft' | 'both'

export type RightTab = 'layers' | 'analytics' | 'fleet' | 'geofences' | 'alerts' | 'details'

export type TrackRange = '1h' | '6h' | '24h' | '7d' | '30d'

export type ForecastHorizon = 0 | 1 | 3 | 6 | 12 | 24

interface LayerToggles {
  ports: boolean
  tradeflow: boolean
  anchorage: boolean
  idle: boolean
  fleet: boolean
  weather: boolean
}

interface RightPanelSections {
  position: boolean
  particulars: boolean
  voyage: boolean
  track: boolean
  portCalls: boolean
  events: boolean
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
  rightActiveTab: RightTab | null
  rightPanelSections: RightPanelSections
  trackRange: TrackRange
  trackFrom: string | null
  trackTo: string | null
  forecastHorizon: ForecastHorizon
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
  setRightActiveTab: (tab: RightTab | null) => void
  toggleRightTab: (tab: RightTab) => void
  toggleSection: (section: keyof RightPanelSections) => void
  setTrackRange: (range: TrackRange) => void
  setForecastHorizon: (h: ForecastHorizon) => void
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
  layerToggles: { ports: false, tradeflow: false, anchorage: false, idle: false, fleet: false, weather: false },
  playbackIndex: 0,
  searchQuery: '',
  leftPanelOpen: true,
  rightPanelOpen: true,
  rightActiveTab: null,
  rightPanelSections: {
    position: true,
    particulars: true,
    voyage: true,
    track: true,
    portCalls: true,
    events: true,
  },
  trackRange: '24h',
  trackFrom: null,
  trackTo: null,
  forecastHorizon: 0,
  setBbox: (bbox) => set({ bbox }),
  setFilters: (filters) => set({ filters }),
  setSelectedMmsi: (mmsi) =>
    set({
      selectedMmsi: mmsi,
      selectedHex: null,
      selectedPortId: null,
      rightActiveTab: mmsi !== null ? 'details' : null,
    }),
  setSelectedHex: (hex) =>
    set({
      selectedHex: hex,
      selectedMmsi: null,
      selectedPortId: null,
      rightActiveTab: hex !== null ? 'details' : null,
    }),
  setSelectedPortId: (portId) =>
    set({
      selectedPortId: portId,
      selectedMmsi: null,
      selectedHex: null,
      rightActiveTab: portId !== null ? 'details' : null,
    }),
  setSelectedFleetId: (fleetId) => set({ selectedFleetId: fleetId }),
  clearSelection: () =>
    set({ selectedMmsi: null, selectedHex: null, selectedPortId: null, rightActiveTab: null }),
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
  setRightActiveTab: (rightActiveTab) => set({ rightActiveTab }),
  toggleRightTab: (tab) =>
    set((state) => ({
      rightActiveTab: state.rightActiveTab === tab ? null : tab,
    })),
  toggleSection: (section) =>
    set((state) => ({
      rightPanelSections: {
        ...state.rightPanelSections,
        [section]: !state.rightPanelSections[section],
      },
    })),
  setTrackRange: (range) => {
    const now = new Date()
    const from = new Date()
    switch (range) {
      case '1h':
        from.setHours(now.getHours() - 1)
        break
      case '6h':
        from.setHours(now.getHours() - 6)
        break
      case '24h':
        from.setDate(now.getDate() - 1)
        break
      case '7d':
        from.setDate(now.getDate() - 7)
        break
      case '30d':
        from.setDate(now.getDate() - 30)
        break
    }
    set({ trackRange: range, trackFrom: from.toISOString(), trackTo: now.toISOString() })
  },
  setForecastHorizon: (h) => set({ forecastHorizon: h }),
}))
