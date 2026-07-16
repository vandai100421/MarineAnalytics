import { useMemo, useState } from 'react'
import MapGL from 'react-map-gl'
import { DeckGL } from 'deck.gl'
import type { Layer } from '@deck.gl/core'
import { PathLayer } from '@deck.gl/layers'
import { useViewport } from '../../hooks/useViewport'
import { useMapStore } from '../../store/mapStore'
import { useVesselPositions } from '../../api/vessels'
import { useVesselTrack } from '../../api/vessels'
import { useSSE } from '../../hooks/useSSE'
import { VesselLayer } from './VesselLayer'
import { ClusterLayer } from './ClusterLayer'
import { HeatmapLayer } from './HeatmapLayer'
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
  const mapMode = useMapStore((state) => state.mapMode)
  const playbackIndex = useMapStore((state) => state.playbackIndex)
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

  const { data: trackData } = useVesselTrack(selectedMmsi)

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

  const heatmapData = useMemo(() => {
    return allPositions.map((p) => [p.lon, p.lat] as [number, number])
  }, [allPositions])

  const layers = useMemo(() => {
    const result: Layer[] = []

    if (mapMode === 'heatmap' && heatmapData.length > 0) {
      result.push(HeatmapLayer({ data: heatmapData }))
      return result
    }

    if (trackData && trackData.points.length > 0) {
      const pathData = trackData.points.slice(0, playbackIndex + 1).map((p) => [
        p.lon,
        p.lat,
      ])
      if (pathData.length > 1) {
        result.push(
          new PathLayer({
            id: 'track-path',
            data: [{ path: pathData }],
            getPath: (d: { path: number[] }) => d.path,
            getColor: [251, 191, 36],
            getWidth: 3,
            widthMinPixels: 2,
          }),
        )
      }
    }

    if (viewState.zoom < CLUSTER_ZOOM_THRESHOLD && allPositions.length > 0) {
      const [, clusterText] = ClusterLayer({
        data: allPositions,
        zoom: viewState.zoom,
        bbox: bbox ?? { minLon: -180, minLat: -85, maxLon: 180, maxLat: 85 },
        onSelect: setSelectedMmsi,
      })
      result.push(clusterText)
      return result
    }

    result.push(
      VesselLayer({
        data: allPositions,
        filters,
        onSelect: setSelectedMmsi,
        selectedMmsi,
      }),
    )
    return result
  }, [
    allPositions,
    heatmapData,
    mapMode,
    viewState.zoom,
    filters,
    selectedMmsi,
    setSelectedMmsi,
    bbox,
    trackData,
    playbackIndex,
  ])

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

      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => useMapStore.getState().setMapMode('vessels')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mapMode === 'vessels'
              ? 'bg-sea-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Vessels
        </button>
        <button
          onClick={() => useMapStore.getState().setMapMode('heatmap')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mapMode === 'heatmap'
              ? 'bg-sea-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Heatmap
        </button>
      </div>
    </div>
  )
}
