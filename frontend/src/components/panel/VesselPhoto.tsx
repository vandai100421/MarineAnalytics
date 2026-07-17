import { memo } from 'react'
import { useVessel } from '../../api/vessels'
import { useT } from '../../i18n/useI18n'

interface VesselPhotoProps {
  mmsi: number
}

const TYPE_SILHOUETTES: Record<number, string> = {
  70: 'M3 17h18M5 17V9l3-3h8l3 3v8M9 6v3M15 6v3M7 17v2M17 17v2',
  80: 'M3 17h18M5 17V10l2-4h10l2 4v7M8 6l-1 4M16 6l1 4M9 17v2M15 17v2',
  60: 'M3 17h18M6 17V8l4-2h4l4 2v9M10 6v3M14 6v3M8 17v2M16 17v2',
  30: 'M3 17h18M8 17v-6l2-2h4l2 2v6M12 9V6M10 6h4',
  52: 'M3 17h18M8 17V10l4-3 4 3v7M12 7V4',
}

const TYPE_COLORS: Record<number, string> = {
  70: 'text-blue-400',
  80: 'text-purple-400',
  60: 'text-cyan-400',
  30: 'text-orange-400',
  52: 'text-amber-400',
}

function VesselPhotoComponent({ mmsi }: VesselPhotoProps) {
  const { data: vessel } = useVessel(mmsi)
  const t = useT()

  if (vessel?.photo_url) {
    return (
      <div className="relative h-40 w-full overflow-hidden bg-ocean-900">
        <img
          src={vessel.photo_url}
          alt={vessel.name ?? `Vessel ${mmsi}`}
          className="h-full w-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-950 to-transparent p-3">
          <h2 className="text-base font-bold text-white">
            {vessel.name ?? t('vessel.unknown')}
          </h2>
          <p className="font-mono text-[10px] text-ocean-300">MMSI {mmsi}</p>
        </div>
      </div>
    )
  }

  const shipType = vessel?.ship_type ?? 0
  const silhouette = TYPE_SILHOUETTES[shipType] ?? 'M3 17h18M8 17V8l4-3 4 3v9'
  const color = TYPE_COLORS[shipType] ?? 'text-sea-400'

  return (
    <div className="relative flex h-40 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-ocean-800/40 to-ocean-950">
      <svg
        className={`h-20 w-32 ${color} opacity-60`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d={silhouette} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-950 to-transparent p-3">
        <h2 className="text-base font-bold text-white">
          {vessel?.name ?? t('vessel.unknown')}
        </h2>
        <p className="font-mono text-[10px] text-ocean-300">MMSI {mmsi}</p>
        {vessel?.ship_type_name && (
          <span className="mt-1 inline-block rounded bg-sea-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sea-300">
            {vessel.ship_type_name}
          </span>
        )}
      </div>
    </div>
  )
}

export const VesselPhoto = memo(VesselPhotoComponent)
