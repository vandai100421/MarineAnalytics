import { memo, lazy, Suspense } from 'react'
import {
  usePort,
  usePortCongestion,
  usePortArrivals,
  usePortExpectedArrivals,
  usePortRecentDepartures,
} from '../../api/ports'
import { exportPortArrivalsCSV } from '../../api/exports'
import { useMapStore } from '../../store/mapStore'
import { useT } from '../../i18n/useI18n'

const PortCongestionChart = lazy(() =>
  import('../dashboard/PortCongestionChart').then((m) => ({ default: m.PortCongestionChart })),
)

interface PortInfoProps {
  portId: number
}

function PortInfoComponent({ portId }: PortInfoProps) {
  const { data: port, isLoading: portLoading } = usePort(portId)
  const { data: congestion } = usePortCongestion(portId)
  const { data: arrivalsData, isLoading: arrivalsLoading } = usePortArrivals(portId, 20)
  const { data: expectedData } = usePortExpectedArrivals(portId, 24)
  const { data: departuresData } = usePortRecentDepartures(portId, 24)
  const setSelectedMmsi = useMapStore((s) => s.setSelectedMmsi)
  const setSelectedPortId = useMapStore((s) => s.setSelectedPortId)
  const t = useT()

  if (portLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  if (!port) {
    return (
      <div className="p-4 text-center text-sm text-ocean-400">{t('panel.noData')}</div>
    )
  }

  const congestionColor =
    congestion && congestion.vessel_count > 15
      ? 'text-red-400'
      : congestion && congestion.vessel_count > 5
        ? 'text-amber-400'
        : 'text-green-400'

  return (
    <div>
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-amber-500/20 to-ocean-950">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="h-16 w-16 text-amber-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="5" r="2" fill="currentColor" />
            <path d="M12 7v4M9 11h6M12 11v4M8 15h8M5 19h14M7 19l-2 2M17 19l2 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-950 to-transparent p-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{port.name}</h2>
            {port.country_code && (
              <span className="rounded bg-ocean-700/50 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-ocean-200">
                {port.country_code}
              </span>
            )}
          </div>
          {port.unlocode && (
            <p className="font-mono text-[10px] text-ocean-400">UN/LOCODE: {port.unlocode}</p>
          )}
        </div>
      </div>

      {congestion && (
        <div className="border-b border-ocean-700/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 17l6-6 4 4 8-8M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ocean-200">
              {t('port.congestion')}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{t('port.vessels')}</p>
              <p className={`text-lg font-bold ${congestionColor}`}>{congestion.vessel_count}</p>
            </div>
            <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{t('port.avgDwell')}</p>
              <p className="text-lg font-bold text-sea-300">
                {congestion.avg_dwell_minutes.toFixed(0)}
                <span className="text-[10px] text-ocean-500">{t('time.minutes')}</span>
              </p>
            </div>
            <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{t('port.anchorage')}</p>
              <p className="text-lg font-bold text-purple-300">{congestion.anchorage_count}</p>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-ocean-700/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ocean-200">
            {t('port.recentArrivals')}
          </h3>
          <button
            onClick={() => exportPortArrivalsCSV(portId)}
            className="flex items-center gap-1 text-[11px] text-sea-300 hover:text-sea-200"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('port.exportArrivals')}
          </button>
        </div>
        {arrivalsLoading ? (
          <div className="py-4 text-center text-xs text-ocean-400">{t('panel.loading')}</div>
        ) : arrivalsData && arrivalsData.arrivals.length > 0 ? (
          <div className="space-y-1.5">
            {arrivalsData.arrivals.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2"
              >
                <div className={`h-2 w-2 flex-shrink-0 rounded-full ${a.departed_at ? 'bg-ocean-500' : 'bg-green-500 animate-pulse'}`} />
                <button
                  onClick={() => {
                    setSelectedMmsi(a.mmsi)
                    setSelectedPortId(null)
                  }}
                  className="font-mono text-xs text-sea-300 hover:underline"
                >
                  {a.mmsi}
                </button>
                {a.anchorage && (
                  <span className="rounded bg-purple-500/20 px-1 text-[9px] font-semibold text-purple-300">
                    {t('port.anch')}
                  </span>
                )}
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-ocean-400">
                    {new Date(a.arrived_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {a.dwell_minutes && (
                    <p className="text-[9px] text-ocean-500">{a.dwell_minutes.toFixed(0)}{t('port.dwell')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-ocean-500">
            {t('port.noArrivals')}
          </p>
        )}
      </div>

      <div className="border-b border-ocean-700/40 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ocean-200">
          Expected Arrivals (24h)
        </h3>
        {expectedData && expectedData.vessels.length > 0 ? (
          <div className="space-y-1.5">
            {expectedData.vessels.slice(0, 10).map((v) => (
              <div
                key={v.mmsi}
                className="flex items-center gap-2 rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2"
              >
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
                <button
                  onClick={() => {
                    setSelectedMmsi(v.mmsi)
                    setSelectedPortId(null)
                  }}
                  className="font-mono text-xs text-sea-300 hover:underline"
                >
                  {v.name ?? v.mmsi}
                </button>
                <span className="ml-auto text-[10px] text-ocean-400">
                  {v.eta
                    ? new Date(v.eta).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-3 text-center text-xs text-ocean-500">No expected arrivals</p>
        )}
      </div>

      <div className="border-b border-ocean-700/40 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ocean-200">
          Recent Departures (24h)
        </h3>
        {departuresData && departuresData.departures.length > 0 ? (
          <div className="space-y-1.5">
            {departuresData.departures.slice(0, 10).map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2 rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2"
              >
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-ocean-500" />
                <button
                  onClick={() => {
                    setSelectedMmsi(d.mmsi)
                    setSelectedPortId(null)
                  }}
                  className="font-mono text-xs text-sea-300 hover:underline"
                >
                  {d.mmsi}
                </button>
                {d.dwell_minutes && (
                  <span className="text-[10px] text-ocean-400">
                    {d.dwell_minutes < 60
                      ? `${Math.round(d.dwell_minutes)}m`
                      : `${(d.dwell_minutes / 60).toFixed(1)}h`}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-ocean-400">
                  {d.departed_at
                    ? new Date(d.departed_at).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-3 text-center text-xs text-ocean-500">No recent departures</p>
        )}
      </div>

      <div className="p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ocean-200">
          {t('port.topCongested')}
        </h3>
        <Suspense fallback={<div className="text-center text-xs text-ocean-400">{t('panel.loading')}</div>}>
          <PortCongestionChart />
        </Suspense>
      </div>
    </div>
  )
}

export const PortInfo = memo(PortInfoComponent)
