import { useMemo, useState, useEffect, useRef } from 'react'
import MapGL from 'react-map-gl/maplibre'
import { DeckGL } from 'deck.gl'
import type { Layer } from '@deck.gl/core'
import { PathLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers'
import { useMapStore } from '../../store/mapStore'
import { useVesselPositions, useVesselTrack, useVesselCluster } from '../../api/vessels'
import { useAircraftPositions } from '../../api/aircraft'
import { useSSE } from '../../hooks/useSSE'
import { createVesselLayer } from './VesselLayer'
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

const DETAIL_ZOOM_THRESHOLD = 8

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
  const [viewState, setViewState] = useState({
    longitude: INITIAL_VIEW_STATE.longitude,
    latitude: INITIAL_VIEW_STATE.latitude,
    zoom: INITIAL_VIEW_STATE.zoom,
  })

  // Debounce bbox changes (500ms) to avoid API spam on pan/zoom
  const [debouncedBbox, setDebouncedBbox] = useState(bbox)
  const bboxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (bboxTimerRef.current) clearTimeout(bboxTimerRef.current)
    bboxTimerRef.current = setTimeout(() => setDebouncedBbox(bbox), 500)
    return () => {
      if (bboxTimerRef.current) clearTimeout(bboxTimerRef.current)
    }
  }, [bbox])

  const isDetailZoom = zoom >= DETAIL_ZOOM_THRESHOLD

  // Only fetch individual positions when zoomed in
  const { data: restPositions } = useVesselPositions(
    isDetailZoom ? debouncedBbox : null,
    filters.minSog,
  )
  // Fetch cluster data when zoomed out
  const { data: clusterData } = useVesselCluster(
    !isDetailZoom ? debouncedBbox : null,
    zoom,
  )
  const { data: aircraftData } = useAircraftPositions(debouncedBbox)

  const bboxStr = useMemo(() => {
    if (!debouncedBbox) return null
    return `${debouncedBbox.minLon},${debouncedBbox.minLat},${debouncedBbox.maxLon},${debouncedBbox.maxLat}`
  }, [debouncedBbox])

  // Only use SSE when zoomed in
  useSSE({
    bbox: isDetailZoom ? bboxStr : null,
    minSog: filters.minSog,
    onPositions: updatePositions,
  })

  const { data: trackData } = useVesselTrack(selectedMmsi)

  const allPositions = useMemo(() => {
    if (!isDetailZoom) return []
    const merged = new Map<number, VesselPosition>()
    for (const p of restPositions ?? []) {
      merged.set(p.mmsi, p)
    }
    for (const p of realtimePositions.values()) {
      merged.set(p.mmsi, p)
    }
    return Array.from(merged.values())
  }, [restPositions, realtimePositions, isDetailZoom])

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
      if (!isDetailZoom && clusterData && clusterData.length > 0) {
        // Cluster mode: show count bubbles (MarineTraffic style)
        result.push(
          new ScatterplotLayer({
            id: 'cluster-bubble',
            data: clusterData,
            getPosition: (d: VesselPosition) => [d.lon, d.lat],
            getRadius: (d: VesselPosition) => Math.min(3000 + d.mmsi * 80, 30000),
            radiusMinPixels: 12,
            radiusMaxPixels: 40,
            getFillColor: (d: VesselPosition) => {
              const intensity = Math.min(d.mmsi / 100, 1)
              return [
                Math.round(14 + intensity * 40),
                Math.round(165 - intensity * 80),
                Math.round(233 - intensity * 80),
                200,
              ]
            },
            stroked: true,
            getLineColor: [255, 255, 255, 120],
            lineWidthMinPixels: 1.5,
            pickable: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick: (info: any) => {
              if (info.coordinate && info.coordinate.length >= 2) {
                const [lon, lat] = info.coordinate
                setViewState((prev) => ({
                  ...prev,
                  longitude: lon,
                  latitude: lat,
                  zoom: Math.min(prev.zoom + 2, DETAIL_ZOOM_THRESHOLD + 1),
                }))
              }
            },
          }),
        )
        result.push(
          new TextLayer({
            id: 'cluster-text',
            data: clusterData,
            getPosition: (d: VesselPosition) => [d.lon, d.lat],
            getText: (d: VesselPosition) => String(d.mmsi),
            getSize: 12,
            getColor: [255, 255, 255],
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'center',
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
          }),
        )
      } else if (isDetailZoom && allPositions.length > 0) {
        result.push(
          ...createVesselLayer({
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
    clusterData,
    heatmapData,
    mapMode,
    isDetailZoom,
    filters,
    selectedMmsi,
    setSelectedMmsi,
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
        viewState={viewState}
        getCursor={() => 'crosshair'}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onViewStateChange={(evt: any) => {
          const { longitude, latitude, zoom: newZoom } = evt.viewState
          setZoom(newZoom)
          setViewState({ longitude, latitude, zoom: newZoom })
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

      {/* Layer mode toggle - bottom left */}
      <div className="glass absolute bottom-6 left-6 z-10 flex flex-col gap-1 rounded-xl p-1.5">
        {([
          { mode: 'vessels' as const, label: 'Vessels', icon: 'M3 6l9-3 9 3v15l-9-3-9 3V6z' },
          { mode: 'aircraft' as const, label: 'Aircraft', icon: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z' },
          { mode: 'both' as const, label: 'Both', icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z' },
          { mode: 'heatmap' as const, label: 'Heatmap', icon: 'M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z' },
        ]).map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => useMapStore.getState().setMapMode(mode)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              mapMode === mode
                ? 'bg-sea-500 text-white shadow-lg shadow-sea-500/30'
                : 'text-ocean-300 hover:bg-ocean-700/50 hover:text-white'
            }`}
            title={label}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {label}
          </button>
        ))}
      </div>

      {/* Zoom indicator - bottom right */}
      <div className="glass absolute bottom-6 right-6 z-10 rounded-lg px-3 py-1.5 text-xs font-mono text-ocean-300">
        Zoom: {zoom.toFixed(1)} {isDetailZoom ? '· Detail' : '· Cluster'}
      </div>
    </div>
  )
}
