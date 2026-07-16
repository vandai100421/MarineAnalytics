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
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  const alerts = data?.alerts ?? []

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-ocean-700/40 bg-ocean-900/40 p-4 text-center">
        <svg className="mx-auto mb-2 h-8 w-8 text-ocean-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
        <p className="text-xs text-ocean-400">No alerts. Geofence violations will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
          {data?.total ?? 0} Total Alerts
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 text-[11px] text-sea-300 hover:text-sea-200"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Refresh
        </button>
      </div>
      <div className="space-y-1.5">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border p-2.5 ${
              alert.event_type === 'enter'
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-green-500/30 bg-green-500/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-1 text-xs font-semibold ${
                alert.event_type === 'enter' ? 'text-red-300' : 'text-green-300'
              }`}>
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {alert.event_type === 'enter' ? (
                    <path d="M12 2L2 22h20L12 2z M12 9v5 M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                {alert.event_type === 'enter' ? 'Entered' : 'Exited'}
              </span>
              <span className="font-mono text-[10px] text-ocean-500">
                {new Date(alert.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="mt-1 text-xs text-ocean-300">
              MMSI <span className="font-mono font-medium text-ocean-100">{alert.mmsi}</span>
              {alert.geofence_id && <span className="text-ocean-500"> · Geofence #{alert.geofence_id}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
