import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import type { VesselPosition } from '../../types'

export interface FleetLayerEntry {
  mmsi: number
  color: [number, number, number]
}

interface FleetLayerProps {
  data: VesselPosition[]
  fleetColors: Map<number, [number, number, number]>
  onSelect: (mmsi: number) => void
}

export function createFleetLayer({ data, fleetColors, onSelect }: FleetLayerProps): Layer[] {
  const fleetData = data.filter((v) => fleetColors.has(v.mmsi))
  if (fleetData.length === 0) return []

  return [
    new ScatterplotLayer<VesselPosition>({
      id: 'fleet-marker',
      data: fleetData,
      getPosition: (d: VesselPosition) => [d.lon, d.lat],
      getRadius: 600,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getFillColor: (d: any) => {
        const c = fleetColors.get(d.mmsi)
        return c ? [c[0], c[1], c[2], 220] : [59, 130, 246, 220]
      },
      getLineColor: [255, 255, 255, 255],
      lineWidthMinPixels: 2,
      stroked: true,
      pickable: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onClick: (info: any) => {
        const vessel = info.object as VesselPosition
        if (vessel) {
          onSelect(vessel.mmsi)
        }
      },
    }),
    new TextLayer<VesselPosition>({
      id: 'fleet-label',
      data: fleetData,
      getPosition: (d: VesselPosition) => [d.lon, d.lat],
      getText: (d: VesselPosition) => `FLEET ${d.mmsi}`,
      getSize: 9,
      getColor: [255, 255, 255, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      getPixelOffset: [0, -12],
      fontWeight: 700,
      fontFamily: 'Inter, sans-serif',
    }),
  ]
}
