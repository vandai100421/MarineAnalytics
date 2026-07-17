import { downloadCSV } from './client'

export function exportVesselsCSV(params?: {
  bbox?: string
  shipType?: number
  minSog?: number
}) {
  const qs = new URLSearchParams()
  if (params?.bbox) qs.set('bbox', params.bbox)
  if (params?.shipType !== undefined) qs.set('ship_type', String(params.shipType))
  if (params?.minSog !== undefined) qs.set('min_sog', String(params.minSog))
  const query = qs.toString()
  return downloadCSV(
    `/api/v1/exports/vessels.csv${query ? `?${query}` : ''}`,
    'vessels.csv',
  )
}

export function exportTrackCSV(mmsi: number, from?: string, to?: string) {
  const qs = new URLSearchParams()
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  const query = qs.toString()
  return downloadCSV(
    `/api/v1/exports/vessels/${mmsi}/track.csv${query ? `?${query}` : ''}`,
    `track_${mmsi}.csv`,
  )
}

export function exportAlertsCSV(from?: string, geofenceId?: number) {
  const qs = new URLSearchParams()
  if (from) qs.set('from', from)
  if (geofenceId !== undefined) qs.set('geofence_id', String(geofenceId))
  const query = qs.toString()
  return downloadCSV(
    `/api/v1/exports/alerts.csv${query ? `?${query}` : ''}`,
    'alerts.csv',
  )
}

export function exportTimeseriesCSV(period: '24h' | '7d' | '30d' = '24h') {
  return downloadCSV(
    `/api/v1/exports/stats/timeseries.csv?period=${period}`,
    `timeseries_${period}.csv`,
  )
}

export function exportPortArrivalsCSV(portId: number, limit: number = 1000) {
  return downloadCSV(
    `/api/v1/exports/ports/${portId}/arrivals.csv?limit=${limit}`,
    `port_${portId}_arrivals.csv`,
  )
}
