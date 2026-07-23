import { IconLayer, LineLayer } from 'deck.gl'
import type { VesselPosition, VesselFilters } from '../../types'

const VESSEL_SVG = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.5"/>
      </filter>
    </defs>
    <path d="M32 6 L46 50 L32 42 L18 50 Z" fill="${color}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" filter="url(#s)"/>
  </svg>`

export const VESSEL_ICON_URL = `data:image/svg+xml;base64,${btoa(VESSEL_SVG('#0ea5e9'))}`
const TRACK_ICON_URL = `data:image/svg+xml;base64,${btoa(VESSEL_SVG('#fbbf24'))}`
export { TRACK_ICON_URL }

interface VesselLayerProps {
  data: VesselPosition[]
  filters: VesselFilters
  onSelect: (mmsi: number) => void
  selectedMmsi: number | null
}

export function createVesselLayer({ data, filters, onSelect, selectedMmsi }: VesselLayerProps) {
  const filtered = data.filter((v) => {
    if (filters.minSog !== undefined && v.sog < filters.minSog) return false
    if (filters.maxSog !== undefined && v.sog > filters.maxSog) return false
    return true
  })

  const iconMapping = {
    vessel: { x: 0, y: 0, width: 64, height: 64, anchorY: 32, mask: false },
  }

  const headingLayer = new LineLayer({
    id: 'vessel-heading-layer',
    data: filtered.filter((v) => v.sog > 0.5),
    getSourcePosition: (d: VesselPosition) => [d.lon, d.lat],
    getTargetPosition: (d: VesselPosition) => {
      const headingRad = ((d.heading || d.cog || 0) * Math.PI) / 180
      const sogFactor = Math.min(d.sog * 0.003, 0.05)
      return [d.lon + Math.sin(headingRad) * sogFactor, d.lat + Math.cos(headingRad) * sogFactor]
    },
    getColor: (d: VesselPosition) => {
      if (d.mmsi === selectedMmsi) return [251, 191, 36, 200]
      return [56, 189, 248, 120]
    },
    getWidth: 2,
    widthMinPixels: 1,
    widthMaxPixels: 3,
    pickable: false,
  })

  const vesselLayer = new IconLayer({
    id: 'vessel-layer',
    data: filtered,
    iconAtlas: VESSEL_ICON_URL,
    iconMapping,
    getIcon: () => 'vessel',
    getPosition: (d: VesselPosition) => [d.lon, d.lat],
    getSize: (d: VesselPosition) => (d.mmsi === selectedMmsi ? 1.4 : 0.9),
    sizeScale: 24,
    sizeMinPixels: 18,
    sizeMaxPixels: 48,
    getAngle: (d: VesselPosition) => -(d.heading || d.cog || 0),
    getColor: (d: VesselPosition) => {
      if (d.mmsi === selectedMmsi) return [251, 191, 36]
      return [255, 255, 255]
    },
    pickable: true,
    onClick: (info: { object?: VesselPosition }) => {
      if (info.object?.mmsi) {
        onSelect(info.object.mmsi)
      }
    },
  })

  return [headingLayer, vesselLayer]
}
