import { useVessel, useVesselRealtime } from '../../api/vessels'
import { useT } from '../../i18n/useI18n'

interface VesselInfoProps {
  mmsi: number | null
  section?: 'position' | 'particulars' | 'all'
}

export function VesselInfo({ mmsi, section = 'all' }: VesselInfoProps) {
  const { data: vessel, isLoading: vesselLoading, error: vesselError } = useVessel(mmsi)
  const { data: realtime, isLoading: realtimeLoading } = useVesselRealtime(mmsi)
  const t = useT()

  if (mmsi === null) {
    return <p className="py-4 text-center text-xs text-ocean-500">{t('panel.noVesselSelected')}</p>
  }

  const isLoading = vesselLoading && realtimeLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  const hasStatic = vessel && !vesselError
  const hasRealtime = !!realtime

  if (!hasStatic && !hasRealtime) {
    return (
      <div className="rounded-xl border border-ocean-700/50 bg-ocean-900/50 p-3 text-center">
        <p className="text-xs text-ocean-400">{t('panel.noData')} MMSI {mmsi}</p>
      </div>
    )
  }

  const showPosition = section === 'position' || section === 'all'
  const showParticulars = section === 'particulars' || section === 'all'

  return (
    <div className="space-y-3">
      {showPosition && hasRealtime && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-green-300">
              {t('app.live')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label={t('field.latitude')} value={realtime!.lat.toFixed(4)} unit="°" />
            <StatCard label={t('field.longitude')} value={realtime!.lon.toFixed(4)} unit="°" />
            <StatCard label={t('field.speed')} value={realtime!.sog.toFixed(1)} unit="kn" />
            <StatCard label={t('field.course')} value={realtime!.cog.toFixed(0)} unit="°" />
            <StatCard label={t('field.heading')} value={realtime!.heading.toFixed(0)} unit="°" />
            <StatCard
              label={t('vessel.updated')}
              value={
                realtime!.ts
                  ? new Date(realtime!.ts).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
              }
            />
          </div>
        </div>
      )}

      {showPosition && !hasRealtime && (
        <p className="text-xs text-ocean-500">{t('vessel.noRealtime')}</p>
      )}

      {showParticulars && hasStatic && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label={t('field.callsign')} value={vessel!.callsign ?? '—'} />
            <StatCard label={t('field.imo')} value={vessel!.imo ? String(vessel!.imo) : '—'} />
            <StatCard label={t('field.destination')} value={vessel!.destination ?? '—'} />
            <StatCard
              label={t('field.eta')}
              value={
                vessel!.eta
                  ? new Date(vessel!.eta).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : '—'
              }
            />
            {vessel!.ais_class && (
              <StatCard label="AIS Class" value={vessel!.ais_class} />
            )}
            {vessel!.flag && (
              <StatCard label={t('vessel.flag')} value={vessel!.flag} />
            )}
            {vessel!.year_built && (
              <StatCard label="Year Built" value={String(vessel!.year_built)} />
            )}
            {vessel!.gt !== null && vessel!.gt !== undefined && (
              <StatCard label="Gross Tonnage" value={String(vessel!.gt)} unit="t" />
            )}
            {vessel!.dwt !== null && vessel!.dwt !== undefined && (
              <StatCard label="Deadweight" value={String(vessel!.dwt)} unit="t" />
            )}
            {vessel!.draught_max !== null && vessel!.draught_max !== undefined && (
              <StatCard label="Draught Max" value={vessel!.draught_max.toFixed(1)} unit="m" />
            )}
          </div>

          {(() => {
            const length = vessel!.loa ?? (vessel!.dim_a ?? 0) + (vessel!.dim_b ?? 0)
            const beam = vessel!.beam ?? (vessel!.dim_c ?? 0) + (vessel!.dim_d ?? 0)
            if (length > 0 && beam > 0) {
              return (
                <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
                    {t('field.dimensions')}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[10px] text-ocean-500">{t('field.length')}</p>
                      <p className="text-sm font-semibold text-white">{length}m</p>
                    </div>
                    <div className="h-6 w-px bg-ocean-700" />
                    <div className="flex-1">
                      <p className="text-[10px] text-ocean-500">{t('field.beam')}</p>
                      <p className="text-sm font-semibold text-white">{beam}m</p>
                    </div>
                    {(vessel!.dim_a || vessel!.dim_b) && (
                      <>
                        <div className="h-6 w-px bg-ocean-700" />
                        <div className="flex-1">
                          <p className="text-[10px] text-ocean-500">A+B</p>
                          <p className="text-sm font-semibold text-white">
                            {vessel!.dim_a}+{vessel!.dim_b}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            }
            return null
          })()}

          <div className="flex items-center gap-1 text-[10px] text-ocean-500">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
            {t('vessel.updated')}{' '}
            {new Date(vessel!.updated_at).toLocaleString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: 'short',
            })}
          </div>
        </>
      )}

      {showParticulars && !hasStatic && (
        <p className="text-xs text-ocean-500">{t('vessel.noStaticData')}</p>
      )}
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <p className="truncate text-sm font-medium text-ocean-100" title={value}>
          {value}
        </p>
        {unit && <span className="text-[10px] text-ocean-500">{unit}</span>}
      </div>
    </div>
  )
}
