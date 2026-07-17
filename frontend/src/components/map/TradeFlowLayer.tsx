import { ArcLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import type { TradeFlow } from '../../types'

interface TradeFlowLayerProps {
  data: TradeFlow[]
}

export function createTradeFlowLayer({ data }: TradeFlowLayerProps): Layer[] {
  return [
    new ArcLayer<TradeFlow>({
      id: 'trade-flow-arcs',
      data,
      getSourcePosition: (d: TradeFlow) => [d.origin_lon, d.origin_lat],
      getTargetPosition: (d: TradeFlow) => [d.dest_lon, d.dest_lat],
      getSourceColor: [56, 189, 248, 200],
      getTargetColor: [251, 191, 36, 200],
      getWidth: (d: TradeFlow) => Math.min(1 + d.vessel_count * 0.8, 8),
      widthUnits: 'pixels',
      getTilt: 0,
      greatCircle: false,
      opacity: 0.7,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 100],
    }),
  ]
}
