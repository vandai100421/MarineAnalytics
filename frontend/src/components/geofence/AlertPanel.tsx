import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/client'

interface AlertItem {
  id: number
  mmsi: number
  geofence_id: number | null
  ts: string
  event_type: string
  lat: number | null
  lon: number | null
}

interface AlertsListResponse {
  total: number
  alerts: AlertItem[]
}

export function AlertPanel() {
  const { data, isLoading, refetch } = useQuery<AlertsListResponse>({
    queryKey: ['alerts'],
    queryFn: () => apiFetch<AlertsListResponse>('/api/v1/alerts?limit=20'),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return <p className="text-sm text-gray-400">Loading alerts...</p>
  }

  const alerts = data?.alerts ?? []

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No recent alerts. Geofence violations will appear here.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {data?.total ?? 0} total alerts
        </p>
        <button
          onClick={() => refetch()}
          className="text-xs text-sea-100 hover:underline"
        >
          Refresh
        </button>
      </div>
      <div className="space-y-1.5">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-lg bg-gray-700 p-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-amber-400">
                {alert.event_type === 'enter' ? 'Entered' : 'Exited'}
              </span>
              <span className="text-gray-400">
                {new Date(alert.ts).toLocaleString()}
              </span>
            </div>
            <div className="mt-1 text-gray-300">
              MMSI: {alert.mmsi}
              {alert.geofence_id && ` · Geofence #${alert.geofence_id}`}
            </div>
            {alert.lat !== null && alert.lon !== null && (
              <div className="text-gray-500">
                {alert.lat.toFixed(4)}, {alert.lon.toFixed(4)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
