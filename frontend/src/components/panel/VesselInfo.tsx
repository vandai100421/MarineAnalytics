import { useVessel, useVesselRealtime } from '../../api/vessels'

interface VesselInfoProps {
  mmsi: number | null
}

export function VesselInfo({ mmsi }: VesselInfoProps) {
  const { data: vessel, isLoading: vesselLoading, error: vesselError } = useVessel(mmsi)
  const { data: realtime, isLoading: realtimeLoading } = useVesselRealtime(mmsi)

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

  const isLoading = vesselLoading && realtimeLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  const hasStatic = vessel && !vesselError
  const hasRealtime = !!realtime

  if (!hasStatic && !hasRealtime) {
    return (
      <div className="rounded-xl border border-ocean-700/50 bg-ocean-900/50 p-4 text-center">
        <p className="text-sm text-ocean-400">No data for MMSI {mmsi}</p>
      </div>
    )
  }

  const length = hasStatic ? (vessel!.dim_a ?? 0) + (vessel!.dim_b ?? 0) : 0
  const beam = hasStatic ? (vessel!.dim_c ?? 0) + (vessel!.dim_d ?? 0) : 0

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-xl border border-ocean-700/50 bg-gradient-to-br from-ocean-800/60 to-ocean-900/60 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">
              {hasStatic ? (vessel!.name ?? 'Unknown Vessel') : `Vessel ${mmsi}`}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-ocean-400">MMSI {mmsi}</p>
          </div>
          {hasStatic && (
            <span className="rounded-lg bg-sea-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sea-300">
              {vessel!.ship_type_name ?? 'Unknown'}
            </span>
          )}
        </div>
      </div>

      {/* Realtime position */}
      {hasRealtime && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-green-300">
              Realtime Position
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Latitude" value={realtime!.lat.toFixed(4)} unit="°" />
            <StatCard label="Longitude" value={realtime!.lon.toFixed(4)} unit="°" />
            <StatCard label="Speed" value={realtime!.sog.toFixed(1)} unit="kn" />
            <StatCard label="Course" value={realtime!.cog.toFixed(0)} unit="°" />
            <StatCard label="Heading" value={realtime!.heading.toFixed(0)} unit="°" />
            <StatCard
              label="Updated"
              value={realtime!.ts ? new Date(realtime!.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
            />
          </div>
        </div>
      )}

      {/* Static info */}
      {hasStatic && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Callsign" value={vessel!.callsign ?? '—'} />
            <StatCard label="IMO" value={vessel!.imo ? String(vessel!.imo) : '—'} />
            <StatCard label="Destination" value={vessel!.destination ?? '—'} />
            <StatCard
              label="ETA"
              value={vessel!.eta ? new Date(vessel!.eta).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
            />
          </div>

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
                  <p className="text-sm font-semibold text-white">{vessel!.dim_a}+{vessel!.dim_b}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-ocean-500">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
            Updated {new Date(vessel!.updated_at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
          </div>
        </>
      )}

      {!hasStatic && (
        <div className="rounded-xl border border-ocean-700/40 bg-ocean-900/40 p-3 text-center">
          <p className="text-xs text-ocean-500">No static data available for this vessel</p>
        </div>
      )}
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
