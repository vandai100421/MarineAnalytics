import type { AircraftPosition } from '../../types'
import { useT } from '../../i18n/useI18n'

interface AircraftInfoProps {
  hex: string | null
  positions: AircraftPosition[] | undefined
}

export function AircraftInfo({ hex, positions }: AircraftInfoProps) {
  const t = useT()

  if (hex === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ocean-800/50">
          <svg className="h-6 w-6 text-ocean-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-ocean-400">{t('aircraft.noAircraft')}</p>
      </div>
    )
  }

  const aircraft = positions?.find((a) => a.hex === hex)

  if (!aircraft) {
    return (
      <div className="rounded-xl border border-ocean-700/50 bg-ocean-900/50 p-4 text-center">
        <p className="text-sm text-ocean-400">{t('aircraft.notFound')} {hex}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-ocean-900/40 p-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-purple-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <div className="flex-1 min-w-0">
            <h2 className="truncate text-base font-bold text-white">{aircraft.flight ?? t('aircraft.unknownFlight')}</h2>
            <p className="font-mono text-[10px] text-ocean-400">HEX {aircraft.hex}</p>
          </div>
          {aircraft.origin_country && (
            <span className="rounded bg-ocean-800/70 px-1.5 py-0.5 text-[9px] font-medium text-ocean-200">
              {aircraft.origin_country}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label={t('field.altitude')} value={aircraft.alt !== null ? `${aircraft.alt}` : '—'} unit="ft" />
        <StatCard label={t('field.groundSpeed')} value={aircraft.gs !== null ? `${aircraft.gs}` : '—'} unit="kn" />
        <StatCard label={t('field.track')} value={aircraft.track !== null ? `${aircraft.track}` : '—'} unit="°" />
        <StatCard
          label="Vertical Rate"
          value={aircraft.vertical_rate !== null ? `${aircraft.vertical_rate > 0 ? '+' : ''}${aircraft.vertical_rate}` : '—'}
          unit="fpm"
        />
        <StatCard label={t('field.type')} value={aircraft.type ?? '—'} />
        <StatCard label={t('field.registration')} value={aircraft.reg ?? '—'} />
      </div>

      {aircraft.vertical_rate !== null && (
        <div
          className={`rounded-lg border p-2 text-center text-xs font-medium ${
            aircraft.vertical_rate > 100
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : aircraft.vertical_rate < -100
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                : 'border-ocean-700/40 bg-ocean-900/40 text-ocean-300'
          }`}
        >
          {aircraft.vertical_rate > 100
            ? `↑ Climbing ${Math.abs(aircraft.vertical_rate).toFixed(0)} fpm`
            : aircraft.vertical_rate < -100
              ? `↓ Descending ${Math.abs(aircraft.vertical_rate).toFixed(0)} fpm`
              : '— Level flight'}
        </div>
      )}

      <StatCard label={t('field.position')} value={`${aircraft.lat.toFixed(2)}, ${aircraft.lon.toFixed(2)}`} />
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <p className="truncate text-sm font-medium text-ocean-100" title={value}>{value}</p>
        {unit && <span className="text-[10px] text-ocean-500">{unit}</span>}
      </div>
    </div>
  )
}
