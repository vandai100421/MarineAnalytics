import type { AircraftPosition } from '../../types'

interface AircraftInfoProps {
  hex: string | null
  positions: AircraftPosition[] | undefined
}

export function AircraftInfo({ hex, positions }: AircraftInfoProps) {
  if (hex === null) {
    return <p className="text-sm text-gray-400">Click an aircraft to see details</p>
  }

  const aircraft = positions?.find((a) => a.hex === hex)

  if (!aircraft) {
    return <p className="text-sm text-gray-400">Aircraft {hex} not found</p>
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-purple-300">
          {aircraft.flight ?? 'Unknown Flight'}
        </h2>
        <p className="text-sm text-gray-400">HEX: {aircraft.hex}</p>
      </div>
      <div className="space-y-1 text-sm">
        <InfoRow label="Registration" value={aircraft.reg ?? '—'} />
        <InfoRow label="Type" value={aircraft.type ?? '—'} />
        <InfoRow
          label="Altitude"
          value={aircraft.alt !== null ? `${aircraft.alt} ft` : '—'}
        />
        <InfoRow
          label="Ground Speed"
          value={aircraft.gs !== null ? `${aircraft.gs} kn` : '—'}
        />
        <InfoRow
          label="Track"
          value={aircraft.track !== null ? `${aircraft.track}°` : '—'}
        />
        <InfoRow
          label="Position"
          value={`${aircraft.lat.toFixed(4)}, ${aircraft.lon.toFixed(4)}`}
        />
        <InfoRow
          label="Updated"
          value={new Date(aircraft.ts).toLocaleString()}
        />
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
