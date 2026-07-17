import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import type { IdleEvent } from '../../types'

interface IdleLayerProps {
  data: IdleEvent[]
  onSelect: (mmsi: number) => void
}

export function createIdleLayer({ data, onSelect }: IdleLayerProps): Layer[] {
  const active = data.filter((e) => e.end_ts === null)
  if (active.length === 0) return []

  return [
    new ScatterplotLayer<IdleEvent>({
      id: 'idle-marker',
      data: active,
      getPosition: (d: IdleEvent) => [d.start_lon, d.start_lat],
      getRadius: 800,
      radiusMinPixels: 8,
      radiusMaxPixels: 30,
      getFillColor: [251, 146, 60, 200],
      getLineColor: [239, 68, 68, 255],
      lineWidthMinPixels: 2,
      stroked: true,
      pickable: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onClick: (info: any) => {
        const event = info.object as IdleEvent
        if (event) {
          onSelect(event.mmsi)
        }
      },
    }),
    new TextLayer<IdleEvent>({
      id: 'idle-label',
      data: active,
      getPosition: (d: IdleEvent) => [d.start_lon, d.start_lat],
      getText: (d: IdleEvent) => `IDLE ${d.mmsi}`,
      getSize: 10,
      getColor: [251, 146, 60, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      getPixelOffset: [0, -12],
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
    }),
  ]
}
