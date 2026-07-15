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
