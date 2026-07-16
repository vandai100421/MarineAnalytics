import { useVessel } from '../../api/vessels'

interface VesselInfoProps {
  mmsi: number | null
}

export function VesselInfo({ mmsi }: VesselInfoProps) {
  const { data: vessel, isLoading } = useVessel(mmsi)

  if (mmsi === null) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ocean-800/50">
          <svg className="h-8 w-8 text-ocean-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6l9-3 9 3v15l-9-3-9 3V6z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-ocean-300">No vessel selected</p>
        <p className="mt-1 text-xs text-ocean-500">Click a vessel on the map to view details</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  if (!vessel) {
    return (
      <div className="rounded-xl border border-ocean-700/50 bg-ocean-900/50 p-4 text-center">
        <p className="text-sm text-ocean-400">Vessel {mmsi} not found</p>
      </div>
    )
  }

  const length = (vessel.dim_a ?? 0) + (vessel.dim_b ?? 0)
  const beam = (vessel.dim_c ?? 0) + (vessel.dim_d ?? 0)

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-xl border border-ocean-700/50 bg-gradient-to-br from-ocean-800/60 to-ocean-900/60 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">
              {vessel.name ?? 'Unknown Vessel'}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-ocean-400">MMSI {vessel.mmsi}</p>
          </div>
          <span className="rounded-lg bg-sea-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sea-300">
            {vessel.ship_type_name ?? 'Unknown'}
          </span>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon="M5 13l4 4L19 7" label="Callsign" value={vessel.callsign ?? '—'} />
        <StatCard icon="M9 12l2 2 4-4" label="IMO" value={vessel.imo ? String(vessel.imo) : '—'} />
        <StatCard
          icon="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          label="Destination"
          value={vessel.destination ?? '—'}
        />
        <StatCard
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          label="ETA"
          value={vessel.eta ? new Date(vessel.eta).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
        />
      </div>

      {/* Dimensions */}
      {length > 0 && beam > 0 && (
        <div className="rounded-xl border border-ocean-700/50 bg-ocean-900/40 p-4">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
            Dimensions
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-ocean-500">Length</p>
              <p className="text-sm font-semibold text-white">{length}m</p>
            </div>
            <div className="h-8 w-px bg-ocean-700" />
            <div className="flex-1">
              <p className="text-xs text-ocean-500">Beam</p>
              <p className="text-sm font-semibold text-white">{beam}m</p>
            </div>
            <div className="h-8 w-px bg-ocean-700" />
            <div className="flex-1">
              <p className="text-xs text-ocean-500">A + B</p>
              <p className="text-sm font-semibold text-white">{vessel.dim_a}+{vessel.dim_b}</p>
            </div>
          </div>
        </div>
      )}

      {/* Last updated */}
      <div className="flex items-center gap-1.5 text-[10px] text-ocean-500">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" strokeLinecap="round" />
        </svg>
        Updated {new Date(vessel.updated_at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-3">
      <div className="flex items-center gap-1.5">
        <svg className="h-3 w-3 text-ocean-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-ocean-100" title={value}>{value}</p>
    </div>
  )
}
