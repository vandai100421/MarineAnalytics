import { useMemo } from 'react'
import { ScatterplotLayer } from 'deck.gl'
import type { AircraftPosition } from '../../types'

interface AircraftLayerProps {
  data: AircraftPosition[]
  onSelect: (hex: string) => void
  selectedHex: string | null
}

export function AircraftLayer({ data, onSelect, selectedHex }: AircraftLayerProps) {
  const layer = new ScatterplotLayer({
    id: 'aircraft-layer',
    data,
    getPosition: (d: AircraftPosition) => [d.lon, d.lat],
    getRadius: 300,
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    getFillColor: (d: AircraftPosition) => {
      if (d.hex === selectedHex) return [251, 191, 36]
      return [168, 85, 247]
    },
    stroked: true,
    getLineColor: [255, 255, 255],
    lineWidthMinPixels: 1,
    pickable: true,
    onClick: (info: { object?: AircraftPosition }) => {
      if (info.object?.hex) {
        onSelect(info.object.hex)
      }
    },
  })

  void useMemo

  return layer
}
