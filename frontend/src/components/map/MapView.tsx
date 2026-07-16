import { useMemo, useState } from 'react'
import MapGL from 'react-map-gl/maplibre'
import { DeckGL } from 'deck.gl'
import type { Layer } from '@deck.gl/core'
import { PathLayer } from '@deck.gl/layers'
import { useMapStore } from '../../store/mapStore'
import { useVesselPositions, useVesselTrack } from '../../api/vessels'
import { useAircraftPositions } from '../../api/aircraft'
import { useSSE } from '../../hooks/useSSE'
import { createVesselLayer } from './VesselLayer'
import { createClusterLayer } from './ClusterLayer'
import { createHeatmapLayer } from './HeatmapLayer'
import { createAircraftLayer } from './AircraftLayer'
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
  const bbox = useMapStore((state) => state.bbox)
  const filters = useMapStore((state) => state.filters)
  const selectedMmsi = useMapStore((state) => state.selectedMmsi)
  const setSelectedMmsi = useMapStore((state) => state.setSelectedMmsi)
  const selectedHex = useMapStore((state) => state.selectedHex)
  const setSelectedHex = useMapStore((state) => state.setSelectedHex)
  const realtimePositions = useMapStore((state) => state.realtimePositions)
  const updatePositions = useMapStore((state) => state.updatePositions)
  const mapMode = useMapStore((state) => state.mapMode)
  const playbackIndex = useMapStore((state) => state.playbackIndex)
  const [zoom, setZoom] = useState(INITIAL_VIEW_STATE.zoom)

  const { data: restPositions } = useVesselPositions(bbox, filters.minSog)
  const { data: aircraftData } = useAircraftPositions(bbox)

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
      result.push(createHeatmapLayer({ data: heatmapData }))
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

    const showVessels = mapMode === 'vessels' || mapMode === 'both'
    const showAircraft = mapMode === 'aircraft' || mapMode === 'both'

    if (showVessels) {
      if (zoom < CLUSTER_ZOOM_THRESHOLD && allPositions.length > 0) {
        const [, clusterText] = createClusterLayer({
          data: allPositions,
          zoom,
          bbox: bbox ?? { minLon: -180, minLat: -85, maxLon: 180, maxLat: 85 },
          onSelect: setSelectedMmsi,
        })
        result.push(clusterText)
      } else {
        result.push(
          createVesselLayer({
            data: allPositions,
            filters,
            onSelect: setSelectedMmsi,
            selectedMmsi,
          }),
        )
      }
    }

    if (showAircraft && aircraftData) {
      result.push(
        createAircraftLayer({
          data: aircraftData,
          onSelect: setSelectedHex,
          selectedHex,
        }),
      )
    }

    return result
  }, [
    allPositions,
    heatmapData,
    mapMode,
    zoom,
    filters,
    selectedMmsi,
    setSelectedMmsi,
    bbox,
    trackData,
    playbackIndex,
    aircraftData,
    selectedHex,
    setSelectedHex,
  ])

  return (
    <div className="h-full w-full">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getCursor={() => 'crosshair'}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onViewStateChange={(evt: any) => {
          const { longitude, latitude, zoom: newZoom } = evt.viewState
          setZoom(newZoom)
          const span = 360 / Math.pow(2, newZoom)
          const halfSpan = span / 2
          useMapStore.getState().setBbox({
            minLon: longitude - halfSpan,
            minLat: Math.max(-90, latitude - halfSpan),
            maxLon: longitude + halfSpan,
            maxLat: Math.min(90, latitude + halfSpan),
          })
        }}
      >
        <MapGL
          mapStyle={MAP_STYLE_URL}
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>

      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        {(['vessels', 'aircraft', 'both', 'heatmap'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => useMapStore.getState().setMapMode(mode)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              mapMode === mode
                ? 'bg-sea-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
