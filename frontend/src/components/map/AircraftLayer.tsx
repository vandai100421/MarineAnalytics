import { IconLayer } from 'deck.gl'
import type { AircraftPosition } from '../../types'

const AIRCRAFT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.5"/>
    </filter>
  </defs>
  <path d="M32 6 L37 30 L60 42 L60 45 L37 38 L37 52 L45 60 L45 62 L32 58 L19 62 L19 60 L27 52 L27 38 L4 45 L4 42 L27 30 Z" fill="#ffffff" stroke="#1e293b" stroke-width="2" stroke-linejoin="round" filter="url(#s)"/>
</svg>`

const AIRCRAFT_ICON_URL = `data:image/svg+xml;base64,${btoa(AIRCRAFT_SVG)}`

interface AltitudeBand {
  max: number
  color: [number, number, number]
}

const ALTITUDE_BANDS: AltitudeBand[] = [
  { max: 1000, color: [239, 68, 68] },
  { max: 10000, color: [249, 115, 22] },
  { max: 30000, color: [234, 179, 8] },
  { max: 40000, color: [34, 197, 94] },
  { max: Number.POSITIVE_INFINITY, color: [59, 130, 246] },
]

function getAltitudeColor(alt: number | null): [number, number, number] {
  if (alt === null) return [148, 163, 184]
  for (const band of ALTITUDE_BANDS) {
    if (alt < band.max) return band.color
  }
  return [59, 130, 246]
}

interface AircraftLayerProps {
  data: AircraftPosition[]
  onSelect: (hex: string) => void
  selectedHex: string | null
}

export function createAircraftLayer({ data, onSelect, selectedHex }: AircraftLayerProps) {
  const iconMapping = {
    aircraft: { x: 0, y: 0, width: 64, height: 64, anchorY: 32, mask: true },
  }

  return new IconLayer({
    id: 'aircraft-layer',
    data,
    iconAtlas: AIRCRAFT_ICON_URL,
    iconMapping,
    getIcon: () => 'aircraft',
    getPosition: (d: AircraftPosition) => [d.lon, d.lat],
    getAngle: (d: AircraftPosition) => -(d.track ?? 0),
    getSize: (d: AircraftPosition) => (d.hex === selectedHex ? 1.5 : 0.9),
    sizeScale: 24,
    sizeMinPixels: 16,
    sizeMaxPixels: 44,
    getColor: (d: AircraftPosition) => {
      if (d.hex === selectedHex) return [251, 191, 36]
      return getAltitudeColor(d.alt)
    },
    pickable: true,
    onClick: (info: { object?: AircraftPosition }) => {
      if (info.object?.hex) {
        onSelect(info.object.hex)
      }
    },
  })
}
