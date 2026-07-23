import { memo } from 'react'
import { useMapStore, type TrackRange } from '../../store/mapStore'
import { useVesselTrack } from '../../api/vessels'
import { useT } from '../../i18n/useI18n'
import { exportTrackCSV } from '../../api/exports'
import { downloadKml, downloadGpx } from '../../utils/trackExport'
import { ForecastTrackSelector } from './ForecastTrackSelector'

interface TrackToolsProps {
  mmsi: number
}

const RANGES: { value: TrackRange; labelKey: string }[] = [
  { value: '1h', labelKey: 'track.range.1h' },
  { value: '6h', labelKey: 'track.range.6h' },
  { value: '24h', labelKey: 'track.range.24h' },
  { value: '7d', labelKey: 'track.range.7d' },
  { value: '30d', labelKey: 'track.range.30d' },
]

function TrackToolsComponent({ mmsi }: TrackToolsProps) {
  const trackRange = useMapStore((s) => s.trackRange)
  const setTrackRange = useMapStore((s) => s.setTrackRange)
  const trackFrom = useMapStore((s) => s.trackFrom)
  const trackTo = useMapStore((s) => s.trackTo)
  const { data: trackData } = useVesselTrack(mmsi, trackFrom ?? undefined, trackTo ?? undefined)
  const t = useT()

  const hasTrack = trackData && trackData.points.length > 0

  return (
    <div className="space-y-2">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
          {t('section.trackHistory')}
        </p>
        <div className="grid grid-cols-5 gap-1">
          {RANGES.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => setTrackRange(value)}
              className={`rounded-md px-1 py-1 text-[10px] font-medium transition-all ${
                trackRange === value
                  ? 'bg-sea-500 text-white'
                  : 'border border-ocean-700/40 bg-ocean-900/40 text-ocean-300 hover:bg-ocean-800/50 hover:text-white'
              }`}
            >
              {t(labelKey as never)}
            </button>
          ))}
        </div>
      </div>

      <ForecastTrackSelector />

      {hasTrack && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
            Export
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => exportTrackCSV(mmsi, trackFrom ?? undefined, trackTo ?? undefined)}
              className="flex-1 rounded-lg border border-sea-500/30 bg-sea-500/10 px-2 py-1 text-[10px] font-medium text-sea-300 transition-all hover:bg-sea-500/20"
            >
              CSV
            </button>
            <button
              onClick={() =>
                downloadKml(
                  trackData.points,
                  mmsi,
                  trackData.points[0]?.ts ?? '',
                  trackData.points[trackData.points.length - 1]?.ts ?? '',
                )
              }
              className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300 transition-all hover:bg-amber-500/20"
            >
              KML
            </button>
            <button
              onClick={() =>
                downloadGpx(
                  trackData.points,
                  mmsi,
                  trackData.points[0]?.ts ?? '',
                  trackData.points[trackData.points.length - 1]?.ts ?? '',
                )
              }
              className="flex-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] font-medium text-purple-300 transition-all hover:bg-purple-500/20"
            >
              GPX
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const TrackTools = memo(TrackToolsComponent)
