import { memo } from 'react'
import { useVesselEvents } from '../../api/vessels'

interface VesselEventsSectionProps {
  mmsi: number
}

const EVENT_META: Record<string, { label: string; color: string; icon: string }> = {
  stale: {
    label: 'Stale Position',
    color: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    icon: 'M12 8v4M12 16h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  gap: {
    label: 'AIS Gap',
    color: 'border-orange-500/30 bg-orange-500/5 text-orange-300',
    icon: 'M3 12h4l3-8 4 16 3-8h4',
  },
  spoofing: {
    label: 'Position Spoofing',
    color: 'border-red-500/30 bg-red-500/5 text-red-300',
    icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v4M12 16h.01',
  },
  speed_anomaly: {
    label: 'Speed Anomaly',
    color: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  course_anomaly: {
    label: 'Course Change',
    color: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
    icon: 'M3 17l6-6 4 4 8-8M14 7h7v7',
  },
}

function VesselEventsSectionComponent({ mmsi }: VesselEventsSectionProps) {
  const { data, isLoading } = useVesselEvents(mmsi, 30)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  const events = data?.events ?? []

  if (events.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-ocean-500">No anomalies detected</p>
    )
  }

  return (
    <div className="space-y-1.5">
      {events.map((e) => {
        const meta = EVENT_META[e.event_type] ?? {
          label: e.event_type,
          color: 'border-ocean-700/40 bg-ocean-900/40 text-ocean-300',
          icon: 'M12 2a10 10 0 100 20 10 10 0 000-20z',
        }
        return (
          <div
            key={e.id}
            className={`rounded-lg border p-2 ${meta.color}`}
          >
            <div className="flex items-center gap-1.5">
              <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={meta.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="flex-1 truncate text-xs font-semibold">{meta.label}</span>
              {e.severity === 'critical' && (
                <span className="rounded bg-red-500/30 px-1 text-[9px] font-bold text-red-200">
                  CRIT
                </span>
              )}
              {e.severity === 'warning' && (
                <span className="rounded bg-amber-500/30 px-1 text-[9px] font-bold text-amber-200">
                  WARN
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] opacity-80">
              <span>
                {new Date(e.ts).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {e.lat !== null && e.lon !== null && (
                <span className="font-mono">
                  {e.lat.toFixed(2)}, {e.lon.toFixed(2)}
                </span>
              )}
            </div>
            {e.details && Object.keys(e.details).length > 0 && (
              <div className="mt-1 truncate text-[10px] opacity-60">
                {Object.entries(e.details)
                  .filter(([k]) => k !== 'prev_ts')
                  .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(2) : String(v)}`)
                  .join(' · ')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export const VesselEventsSection = memo(VesselEventsSectionComponent)
