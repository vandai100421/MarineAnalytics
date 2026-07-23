import type { BoundingBox } from '../types'

export const TILE_RESOLUTION = 0.5
export const SSE_TILE_RESOLUTION = 2.0
export const PRELOAD_MARGIN = 0.5

export function expandBbox(bbox: BoundingBox, margin: number = PRELOAD_MARGIN): BoundingBox {
  const width = bbox.maxLon - bbox.minLon
  const height = bbox.maxLat - bbox.minLat
  return {
    minLon: bbox.minLon - width * margin,
    minLat: Math.max(-90, bbox.minLat - height * margin),
    maxLon: bbox.maxLon + width * margin,
    maxLat: Math.min(90, bbox.maxLat + height * margin),
  }
}

export function quantizeBbox(bbox: BoundingBox, resolution: number = TILE_RESOLUTION): BoundingBox {
  return {
    minLon: Math.floor(bbox.minLon / resolution) * resolution,
    minLat: Math.floor(bbox.minLat / resolution) * resolution,
    maxLon: Math.ceil(bbox.maxLon / resolution) * resolution,
    maxLat: Math.ceil(bbox.maxLat / resolution) * resolution,
  }
}

export function bboxToString(bbox: BoundingBox | null): string | null {
  if (!bbox) return null
  return `${bbox.minLon.toFixed(4)},${bbox.minLat.toFixed(4)},${bbox.maxLon.toFixed(4)},${bbox.maxLat.toFixed(4)}`
}

export function bboxKey(bbox: BoundingBox | null): string {
  if (!bbox) return 'null'
  return `${bbox.minLon.toFixed(2)},${bbox.minLat.toFixed(2)},${bbox.maxLon.toFixed(2)},${bbox.maxLat.toFixed(2)}`
}

export function normalizeBbox(bbox: BoundingBox): BoundingBox {
  return {
    minLon: ((bbox.minLon + 180) % 360 + 360) % 360 - 180,
    minLat: Math.max(-90, Math.min(90, bbox.minLat)),
    maxLon: ((bbox.maxLon + 180) % 360 + 360) % 360 - 180,
    maxLat: Math.max(-90, Math.min(90, bbox.maxLat)),
  }
}
