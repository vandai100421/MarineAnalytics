import { memo } from 'react'
import { useVesselPortCalls } from '../../api/vessels'

interface PortCallsSectionProps {
  mmsi: number
}

function PortCallsSectionComponent({ mmsi }: PortCallsSectionProps) {
  const { data, isLoading } = useVesselPortCalls(mmsi, 20)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  const calls = data?.port_calls ?? []

  if (calls.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-ocean-500">No port calls recorded</p>
    )
  }

  return (
    <div className="space-y-1.5">
      {calls.map((c) => {
        const isActive = !c.departed_at
        const duration = c.duration_minutes
          ? durationLabel(c.duration_minutes)
          : null
        return (
          <div
            key={c.id}
            className={`rounded-lg border p-2 transition-colors ${
              isActive
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-ocean-700/40 bg-ocean-900/40'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isActive ? 'animate-pulse bg-green-500' : 'bg-ocean-500'
                }`}
              />
              <span className="flex-1 truncate text-xs font-semibold text-sea-300">
                {c.port_name ?? `Port ${c.port_id ?? '?'}`}
              </span>
              {c.anchorage && (
                <span className="rounded bg-purple-500/20 px-1 text-[9px] font-semibold text-purple-300">
                  ANCH
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-ocean-400">
              <span>
                {c.arrived_at
                  ? new Date(c.arrived_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
              {duration && <span className="text-ocean-300">{duration}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = minutes / 60
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

export const PortCallsSection = memo(PortCallsSectionComponent)
