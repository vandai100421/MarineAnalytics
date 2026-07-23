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
  photo_url: string | null
  gt: number | null
  dwt: number | null
  loa: number | null
  beam: number | null
  draught_max: number | null
  year_built: number | null
  flag: string | null
  ais_class: string | null
  updated_at: string
}

export interface VesselSearchResult {
  mmsi: number
  name: string | null
  ship_type: number | null
  ship_type_name: string | null
  callsign: string | null
  imo: number | null
  destination: string | null
}

export interface VesselListItem {
  mmsi: number
  name: string | null
  ship_type: number | null
  ship_type_name: string | null
  destination: string | null
  updated_at: string
}

export interface PaginatedResponse<T> {
  total: number
  limit: number
  offset: number
  items: T[]
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
  name?: string
  destination?: string
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
  vertical_rate: number | null
  origin_country: string | null
}

export interface TimeSeriesPoint {
  ts: string
  vessel_count: number
  avg_sog: number
}

export interface TimeSeriesResponse {
  period: string
  points: TimeSeriesPoint[]
}

export interface AlertItem {
  id: number
  mmsi: number
  geofence_id: number | null
  ts: string
  event_type: string
  lat: number | null
  lon: number | null
}

export interface AlertsListResponse {
  total: number
  alerts: AlertItem[]
}

export interface GeofenceResponse {
  id: number
  name: string
  type: string
  coordinates: number[][]
  description: string | null
  created_at: string
}

export interface OverviewResponse {
  active_vessels: number
  total_vessels: number
  avg_sog: number
  db_total: number
}

export interface TypeCount {
  ship_type: number
  ship_type_name: string
  count: number
}

export interface ByTypeResponse {
  types: TypeCount[]
}

export interface Port {
  id: number
  name: string
  country_code: string | null
  unlocode: string | null
  lat: number
  lon: number
  radius_m: number
  type: string
}

export interface PortArrival {
  id: number
  mmsi: number
  port_id: number
  arrived_at: string
  departed_at: string | null
  dwell_minutes: number | null
  anchorage: boolean
  lat: number | null
  lon: number | null
}

export interface PortArrivalsListResponse {
  total: number
  arrivals: PortArrival[]
}

export interface PortCongestion {
  port_id: number
  name: string
  country_code: string | null
  vessel_count: number
  avg_dwell_minutes: number
  anchorage_count: number
}

export interface PortCongestionListResponse {
  ports: PortCongestion[]
}

export interface PredictedEta {
  mmsi: number
  destination_raw: string | null
  matched_port: Port | null
  match_confidence: number
  distance_nm: number | null
  current_sog: number
  eta_hours: number | null
  eta_time: string | null
  ais_eta: string | null
}

export interface TradeFlow {
  origin_port_id: number
  origin_name: string
  origin_lat: number
  origin_lon: number
  dest_port_id: number
  dest_name: string
  dest_lat: number
  dest_lon: number
  vessel_count: number
}

export interface TradeFlowListResponse {
  flows: TradeFlow[]
  total: number
}

export interface IdleEvent {
  id: number
  mmsi: number
  start_ts: string
  end_ts: string | null
  duration_minutes: number | null
  start_lat: number
  start_lon: number
  end_lat: number | null
  end_lon: number | null
  avg_sog: number | null
  max_sog: number | null
}

export interface IdleEventListResponse {
  total: number
  events: IdleEvent[]
}

export interface IdleSummary {
  total_events: number
  active_idle: number
  avg_duration_minutes: number
}

export interface PortCall {
  id: number
  mmsi: number
  port_id: number | null
  port_name: string | null
  arrived_at: string | null
  departed_at: string | null
  duration_minutes: number | null
  distance_nm: number | null
  anchorage: boolean
  lat: number | null
  lon: number | null
}

export interface PortCallListResponse {
  total: number
  port_calls: PortCall[]
}

export interface VesselEvent {
  id: number
  mmsi: number
  event_type: string
  ts: string
  lat: number | null
  lon: number | null
  severity: string
  details: Record<string, unknown> | null
}

export interface VesselEventListResponse {
  total: number
  events: VesselEvent[]
}

export interface TrackStats {
  total_distance_nm: number
  avg_sog: number
  max_sog: number
  duration_hours: number
}

export interface Fleet {
  id: number
  name: string
  description: string | null
  color: string
  created_at: string
  member_count: number
}

export interface FleetCreate {
  name: string
  description?: string
  color: string
}

export interface FleetMember {
  id: number
  fleet_id: number
  mmsi: number
  added_at: string
  vessel_name: string | null
  ship_type_name: string | null
}

export interface FleetStats {
  fleet_id: number
  name: string
  total_members: number
  active_members: number
  avg_sog: number
  idle_count: number
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

export interface ImportSummary {
  version: string
  imported_at: string | null
  crawl_run_id: number | null
  vessels_created: number
  vessels_updated: number
  positions_created: number
  aircraft_created: number
  ports_created: number
  weather_created: number
  redis_synced: number
  aircraft_redis_synced: number
  errors: string[]
}

export interface SyncRedisResult {
  vessels_synced: number
  aircraft_synced: number
  redis_key_format: string
  ttl_seconds: number
}
