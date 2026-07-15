import { useCallback } from 'react'
import type { ViewState } from 'react-map-gl'
import type { BoundingBox } from '../types'
import { useMapStore } from '../store/mapStore'

export function useViewport() {
  const setBbox = useMapStore((state) => state.setBbox)

  const onMove = useCallback(
    (viewState: ViewState) => {
      const { longitude, latitude, zoom } = viewState
      const bbox = computeBbox(longitude, latitude, zoom)
      setBbox(bbox)
    },
    [setBbox],
  )

  return { onMove }
}

function computeBbox(
  lon: number,
  lat: number,
  zoom: number,
): BoundingBox {
  const span = 360 / Math.pow(2, zoom)
  const halfSpan = span / 2
  return {
    minLon: lon - halfSpan,
    minLat: Math.max(-90, lat - halfSpan),
    maxLon: lon + halfSpan,
    maxLat: Math.min(90, lat + halfSpan),
  }
}
