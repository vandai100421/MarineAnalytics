import { ScatterplotLayer } from 'deck.gl'
import type { VesselPosition, VesselFilters } from '../../types'

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

  return new ScatterplotLayer({
    id: 'vessel-layer',
    data: filtered,
    getPosition: (d: VesselPosition) => [d.lon, d.lat],
    getRadius: 200,
    radiusMinPixels: 5,
    radiusMaxPixels: 15,
    getFillColor: (d: VesselPosition) => {
      if (d.mmsi === selectedMmsi) return [251, 191, 36]
      return DEFAULT_COLOR
    },
    stroked: true,
    getLineColor: [255, 255, 255],
    lineWidthMinPixels: 1,
    pickable: true,
    onClick: (info: { object?: VesselPosition }) => {
      if (info.object?.mmsi) {
        onSelect(info.object.mmsi)
      }
    },
  })
}
