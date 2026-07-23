import { memo } from 'react'
import { useVessel, useVesselRealtime } from '../../api/vessels'
import { useT } from '../../i18n/useI18n'
import { flagFromMmsi, isoToFlagEmoji } from '../../utils/midTable'

interface VesselHeaderProps {
  mmsi: number
}

const NAV_STATUS: { code: number; label: string; color: string }[] = [
  { code: 0, label: 'Under way (engine)', color: 'bg-green-500/20 text-green-300' },
  { code: 1, label: 'At anchor', color: 'bg-amber-500/20 text-amber-300' },
  { code: 2, label: 'Not under command', color: 'bg-red-500/20 text-red-300' },
  { code: 3, label: 'Restricted manoeuvrability', color: 'bg-orange-500/20 text-orange-300' },
  { code: 4, label: 'Constrained by draught', color: 'bg-orange-500/20 text-orange-300' },
  { code: 5, label: 'Moored', color: 'bg-slate-500/20 text-slate-300' },
  { code: 6, label: 'Aground', color: 'bg-red-500/20 text-red-300' },
  { code: 7, label: 'Engaged in fishing', color: 'bg-blue-500/20 text-blue-300' },
  { code: 8, label: 'Under way (sailing)', color: 'bg-green-500/20 text-green-300' },
  { code: 15, label: 'Undefined', color: 'bg-slate-500/20 text-slate-300' },
]

function VesselHeaderComponent({ mmsi }: VesselHeaderProps) {
  const { data: vessel } = useVessel(mmsi)
  const { data: realtime } = useVesselRealtime(mmsi)
  const t = useT()

  const flag = flagFromMmsi(mmsi)
  const flagEmoji = flag ? isoToFlagEmoji(flag.iso) : ''
  const vesselName = vessel?.name ?? t('vessel.unknown')
  const vesselType = vessel?.ship_type_name ?? '—'

  const navStatus = realtime
    ? NAV_STATUS.find((s) => s.code === (realtime as { nav_status?: number }).nav_status)
    : null

  return (
    <div className="border-b border-ocean-700/40 bg-gradient-to-br from-ocean-900/80 to-ocean-950 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {flagEmoji && <span className="text-2xl leading-none" title={flag?.country}>{flagEmoji}</span>}
            <h2 className="truncate text-base font-bold text-white" title={vesselName}>
              {vesselName}
            </h2>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-ocean-800/70 px-1.5 py-0.5 font-mono text-[10px] text-ocean-200">
              MMSI {mmsi}
            </span>
            {vessel?.imo && (
              <span className="rounded bg-ocean-800/70 px-1.5 py-0.5 font-mono text-[10px] text-ocean-200">
                IMO {vessel.imo}
              </span>
            )}
            {vessel?.callsign && (
              <span className="rounded bg-ocean-800/70 px-1.5 py-0.5 font-mono text-[10px] text-ocean-200">
                CS {vessel.callsign}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-sea-300">{vesselType}</p>
          {flag && (
            <p className="mt-0.5 text-[10px] text-ocean-400">
              {flag.country} · {flag.iso}
            </p>
          )}
        </div>
      </div>

      {navStatus && (
        <div className="mt-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-current/20 px-2.5 py-1 text-[10px] font-semibold ${navStatus.color}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {navStatus.label}
          </span>
        </div>
      )}
    </div>
  )
}

export const VesselHeader = memo(VesselHeaderComponent)
