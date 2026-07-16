import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import Supercluster from 'supercluster'
import type { VesselPosition } from '../../types'

interface ClusterLayerProps {
  data: VesselPosition[]
  zoom: number
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number }
  onSelect: (mmsi: number) => void
}

interface ClusterPoint {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: { mmsi: number; cluster: boolean; point_count?: number }
}

export function createClusterLayer({ data, zoom }: ClusterLayerProps) {
  const index = new Supercluster({
    radius: 60,
    maxZoom: 14,
  })

  const points: ClusterPoint[] = data.map((v) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
    properties: { mmsi: v.mmsi, cluster: false },
  }))

  index.load(points)
  const z = Math.floor(zoom)
  const bounds: [number, number, number, number] = [-180, -85, 180, 85]
  const result = index.getClusters(bounds, z)

  const clusterData = result.map((c) => ({
    position: c.geometry.coordinates,
    count: c.properties.cluster ? c.properties.point_count ?? 1 : 1,
    isCluster: c.properties.cluster,
    mmsi: c.properties.mmsi,
  }))

  const clusterLayer = new ScatterplotLayer({
    id: 'cluster-layer',
    data: clusterData.filter((d) => d.isCluster),
    getPosition: (d: { position: [number, number] }) => d.position,
    getRadius: (d: { count: number }) => 500 + d.count * 20,
    radiusMinPixels: 20,
    radiusMaxPixels: 60,
    getFillColor: [3, 105, 161, 180],
    stroked: true,
    getLineColor: [255, 255, 255],
    lineWidthMinPixels: 2,
    pickable: true,
  })

  const textLayer = new TextLayer({
    id: 'cluster-text',
    data: clusterData.filter((d) => d.isCluster),
    getPosition: (d: { position: [number, number] }) => d.position,
    getText: (d: { count: number }) => String(d.count),
    getSize: 14,
    getColor: [255, 255, 255],
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
  })

  return [clusterLayer, textLayer] as const
}
