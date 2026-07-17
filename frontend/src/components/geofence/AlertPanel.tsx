import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/client'
import { exportAlertsCSV } from '../../api/exports'
import type { AlertsListResponse } from '../../types'
import { useI18n } from '../../i18n/useI18n'

export function AlertPanel() {
  const { data, isLoading, refetch } = useQuery<AlertsListResponse>({
    queryKey: ['alerts'],
    queryFn: () => apiFetch<AlertsListResponse>('/api/v1/alerts?limit=20'),
    refetchInterval: 30_000,
  })
  const { t, lang } = useI18n()

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
        <p className="text-xs text-ocean-400">{t('alert.noAlerts')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
          {data?.total ?? 0} {t('alert.total')}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAlertsCSV()}
            className="flex items-center gap-1 text-[11px] text-sea-300 hover:text-sea-200"
            title={t('port.exportArrivals')}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            CSV
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-[11px] text-sea-300 hover:text-sea-200"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('alert.refresh')}
          </button>
        </div>
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
                {alert.event_type === 'enter' ? t('alert.entered') : t('alert.exited')}
              </span>
              <span className="font-mono text-[10px] text-ocean-500">
                {new Date(alert.ts).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="mt-1 text-xs text-ocean-300">
              MMSI <span className="font-mono font-medium text-ocean-100">{alert.mmsi}</span>
              {alert.geofence_id && <span className="text-ocean-500"> · #{alert.geofence_id}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
