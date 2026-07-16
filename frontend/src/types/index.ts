export interface VesselPosition {
  mmsi: number
  lat: number
  lon: number
  sog: number
  cog: number
  heading: number
  ts: string
}

export interface Vessel {
  mmsi: number
  name: string | null
  ship_type: number | null
  ship_type_name: string | null
  callsign: string | null
  imo: number | null
  dim_a: number | null
  dim_b: number | null
  dim_c: number | null
  dim_d: number | null
  destination: string | null
  eta: string | null
  updated_at: string
}

export interface PositionReport {
  mmsi: number
  ts: string
  lat: number
  lon: number
  sog: number | null
  cog: number | null
  heading: number | null
  nav_status: number | null
}

export interface TrackResponse {
  mmsi: number
  total: number
  points: PositionReport[]
}

export interface BoundingBox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

export interface VesselFilters {
  shipTypes?: number[]
  minSog?: number
  maxSog?: number
}

export interface AircraftPosition {
  hex: string
  ts: string
  lat: number
  lon: number
  alt: number | null
  gs: number | null
  track: number | null
  flight: string | null
  reg: string | null
  type: string | null
}

export const SHIP_TYPE_OPTIONS = [
  { value: 30, label: 'Fishing' },
  { value: 31, label: 'Towing' },
  { value: 35, label: 'Military' },
  { value: 36, label: 'Sailing' },
  { value: 37, label: 'Pleasure craft' },
  { value: 50, label: 'Pilot vessel' },
  { value: 51, label: 'Search and rescue' },
  { value: 52, label: 'Tug' },
  { value: 55, label: 'Law enforcement' },
  { value: 60, label: 'Passenger' },
  { value: 70, label: 'Cargo' },
  { value: 80, label: 'Tanker' },
  { value: 90, label: 'Other' },
] as const
