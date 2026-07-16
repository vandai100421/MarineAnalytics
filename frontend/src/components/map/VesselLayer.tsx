import { IconLayer } from 'deck.gl'
import type { VesselPosition, VesselFilters } from '../../types'

const VESSEL_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M32 4 L48 48 L32 40 L16 48 Z" fill="#0ea5e9" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
</svg>`

const VESSEL_ICON_URL = `data:image/svg+xml;base64,${btoa(VESSEL_ICON_SVG)}`

const DEFAULT_COLOR: [number, number, number] = [14, 165, 233]

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

  return new IconLayer({
    id: 'vessel-layer',
    data: filtered,
    iconAtlas: VESSEL_ICON_URL,
    iconMapping,
    getIcon: () => 'vessel',
    getPosition: (d: VesselPosition) => [d.lon, d.lat],
    getSize: (d: VesselPosition) => (d.mmsi === selectedMmsi ? 1.5 : 1),
    sizeScale: 24,
    sizeMinPixels: 20,
    sizeMaxPixels: 50,
    getAngle: (d: VesselPosition) => -(d.heading || d.cog || 0),
    getColor: (d: VesselPosition) => {
      if (d.mmsi === selectedMmsi) return [251, 191, 36]
      return DEFAULT_COLOR
    },
    pickable: true,
    onClick: (info: { object?: VesselPosition }) => {
      if (info.object?.mmsi) {
        onSelect(info.object.mmsi)
      }
    },
  })
}
