import { HexagonLayer } from '@deck.gl/aggregation-layers'

interface HeatmapLayerProps {
  data: Array<[number, number]>
  radius?: number
}

export function createHeatmapLayer({ data, radius = 1000 }: HeatmapLayerProps) {
  return new HexagonLayer({
    id: 'heatmap-layer',
    data,
    getPosition: (d: [number, number]) => d,
    getElevationWeight: () => 1,
    elevationScale: 100,
    radius,
    extruded: false,
    colorRange: [
      [1, 152, 189],
      [73, 227, 206],
      [216, 254, 181],
      [254, 237, 177],
      [254, 173, 84],
      [209, 55, 78],
    ],
    opacity: 0.6,
    pickable: true,
  })
}
