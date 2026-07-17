import { IconLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import type { Port } from '../../types'

interface PortLayerProps {
  data: Port[]
  onSelect: (portId: number) => void
  selectedPortId: number | null
}

const PORT_ICON =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><circle cx="12" cy="5" r="2" fill="#fbbf24"/><path d="M12 7v4M9 11h6M12 11v4M8 15h8M5 19h14M7 19l-2 2M17 19l2 2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  )

function congestionColor(vesselCount: number): [number, number, number, number] {
  if (vesselCount === 0) return [34, 197, 94, 200]
  if (vesselCount < 5) return [34, 197, 94, 220]
  if (vesselCount < 15) return [251, 191, 36, 220]
  return [239, 68, 68, 230]
}
void congestionColor

export function createPortLayer({
  data,
  onSelect,
  selectedPortId,
}: PortLayerProps): Layer[] {
  const layers: Layer[] = []

  layers.push(
    new ScatterplotLayer({
      id: 'port-radius-ring',
      data,
      getPosition: (d: Port) => [d.lon, d.lat],
      getRadius: (d: Port) => d.radius_m,
      radiusMinPixels: 20,
      radiusMaxPixels: 200,
      getFillColor: [56, 189, 248, 15],
      getLineColor: [56, 189, 248, 80],
      lineWidthMinPixels: 1,
      stroked: true,
      pickable: false,
    }),
  )

  layers.push(
    new IconLayer({
      id: 'port-marker',
      data,
      getPosition: (d: Port) => [d.lon, d.lat],
      getIcon: () => ({
        url: PORT_ICON,
        width: 24,
        height: 24,
        anchorY: 24,
      }),
      getSize: (d: Port) => (selectedPortId === d.id ? 36 : 24),
      getColor: (d: Port) => {
        if (selectedPortId === d.id) return [251, 191, 36, 255]
        return [255, 255, 255, 255]
      },
      pickable: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onClick: (info: any) => {
        const port = info.object as Port
        if (port) {
          onSelect(port.id)
        }
      },
    }),
  )

  return layers
}
