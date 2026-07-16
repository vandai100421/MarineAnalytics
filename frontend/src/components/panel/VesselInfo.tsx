import { useVessel } from '../../api/vessels'

interface VesselInfoProps {
  mmsi: number | null
}

export function VesselInfo({ mmsi }: VesselInfoProps) {
  const { data: vessel, isLoading } = useVessel(mmsi)

  if (mmsi === null) {
    return (
      <p className="text-sm text-gray-400">Click a vessel to see details</p>
    )
  }

  if (isLoading) {
    return <p className="text-sm text-gray-400">Loading...</p>
  }

  if (!vessel) {
    return <p className="text-sm text-gray-400">Vessel {mmsi} not found</p>
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-sea-100">
          {vessel.name ?? 'Unknown'}
        </h2>
        <p className="text-sm text-gray-400">MMSI: {vessel.mmsi}</p>
      </div>
      <div className="space-y-1 text-sm">
        <InfoRow label="Type" value={vessel.ship_type_name ?? 'Unknown'} />
        <InfoRow label="Callsign" value={vessel.callsign ?? '—'} />
        <InfoRow label="IMO" value={vessel.imo ? String(vessel.imo) : '—'} />
        <InfoRow label="Destination" value={vessel.destination ?? '—'} />
        {vessel.eta && (
          <InfoRow
            label="ETA"
            value={new Date(vessel.eta).toLocaleString()}
          />
        )}
        {vessel.dim_a !== null && (
          <InfoRow
            label="Dimensions"
            value={`${(vessel.dim_a ?? 0) + (vessel.dim_b ?? 0)}m x ${
              (vessel.dim_c ?? 0) + (vessel.dim_d ?? 0)
            }m`}
          />
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  )
}
