import { useMemo, useState } from 'react'
import MapGL from 'react-map-gl'
import { DeckGL } from 'deck.gl'
import { useViewport } from '../../hooks/useViewport'
import { useMapStore } from '../../store/mapStore'
import { useVesselPositions } from '../../api/vessels'
import { useSSE } from '../../hooks/useSSE'
import { VesselLayer } from './VesselLayer'
import { ClusterLayer } from './ClusterLayer'
import type { VesselPosition } from '../../types'

const MAP_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL ?? '/styles/osm-style.json'

const INITIAL_VIEW_STATE = {
  longitude: 108.2,
  latitude: 16.0,
  zoom: 6,
  pitch: 0,
  bearing: 0,
}

const CLUSTER_ZOOM_THRESHOLD = 8

export function MapView() {
  const { onMove } = useViewport()
  const bbox = useMapStore((state) => state.bbox)
  const filters = useMapStore((state) => state.filters)
  const selectedMmsi = useMapStore((state) => state.selectedMmsi)
  const setSelectedMmsi = useMapStore((state) => state.setSelectedMmsi)
  const realtimePositions = useMapStore((state) => state.realtimePositions)
  const updatePositions = useMapStore((state) => state.updatePositions)
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)

  const { data: restPositions } = useVesselPositions(bbox, filters.minSog)

  const bboxStr = useMemo(() => {
    if (!bbox) return null
    return `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`
  }, [bbox])

  useSSE({
    bbox: bboxStr,
    minSog: filters.minSog,
    onPositions: updatePositions,
  })

  const allPositions = useMemo(() => {
    const merged = new Map<number, VesselPosition>()
    for (const p of restPositions ?? []) {
      merged.set(p.mmsi, p)
    }
    for (const p of realtimePositions.values()) {
      merged.set(p.mmsi, p)
    }
    return Array.from(merged.values())
  }, [restPositions, realtimePositions])

  const layers = useMemo(() => {
    if (viewState.zoom < CLUSTER_ZOOM_THRESHOLD && allPositions.length > 0) {
      const [, clusterText] = ClusterLayer({
        data: allPositions,
        zoom: viewState.zoom,
        bbox: bbox ?? { minLon: -180, minLat: -85, maxLon: 180, maxLat: 85 },
        onSelect: setSelectedMmsi,
      })
      return [clusterText]
    }

    return [
      VesselLayer({
        data: allPositions,
        filters,
        onSelect: setSelectedMmsi,
        selectedMmsi,
      }),
    ]
  }, [allPositions, viewState.zoom, filters, selectedMmsi, setSelectedMmsi, bbox])

  return (
    <div className="h-full w-full">
      <MapGL
        mapStyle={MAP_STYLE_URL}
        initialViewState={viewState}
        onMove={(evt) => {
          setViewState(evt.viewState)
          onMove(evt.viewState)
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <DeckGL
          initialViewState={viewState}
          controller={true}
          layers={layers}
          getCursor={() => 'crosshair'}
        />
      </MapGL>
    </div>
  )
}
