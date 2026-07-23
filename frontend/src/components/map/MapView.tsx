import { useEffect, useMemo, useRef } from 'react'
import MapGL, { type MapRef } from 'react-map-gl/maplibre'
import { DeckGL } from 'deck.gl'
import type { Layer } from '@deck.gl/core'
import { PathLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers'
import { useMapStore } from '../../store/mapStore'
import { useVesselPositions, useVesselTrack, useVesselCluster, useVesselRealtime } from '../../api/vessels'
import { useAircraftPositions } from '../../api/aircraft'
import { usePorts, usePort } from '../../api/ports'
import { useTradeFlows } from '../../api/trade_flows'
import { useIdleEvents } from '../../api/idle'
import { useFleets, useAllFleetMembers } from '../../api/fleets'
import { useWind } from '../../api/weather'
import { useSSE } from '../../hooks/useSSE'
import { useMapViewport } from '../../hooks/useMapViewport'
import { useI18n } from '../../i18n/useI18n'
import { createVesselLayer } from './VesselLayer'
import { createHeatmapLayer } from './HeatmapLayer'
import { createAircraftLayer } from './AircraftLayer'
import { createPortLayer } from './PortLayer'
import { createTradeFlowLayer } from './TradeFlowLayer'
import { createIdleLayer } from './IdleLayer'
import { createFleetLayer } from './FleetLayer'
import { createWeatherLayer } from './WeatherLayer'
import { hexToRgb } from '../../utils/colors'
import { computeForecast } from '../panel/ForecastTrackSelector'
import type { VesselPosition } from '../../types'

const MAP_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL ?? '/styles/osm-style.json'

const INITIAL_VIEW_STATE = {
  longitude: 108.2,
  latitude: 16.0,
  zoom: 6,
  pitch: 0,
  bearing: 0,
}

function sogToColor(sog: number): [number, number, number] {
  if (sog < 0.5) return [239, 68, 68]
  if (sog < 3) return [249, 115, 22]
  if (sog < 7) return [234, 179, 8]
  if (sog < 12) return [34, 197, 94]
  if (sog < 18) return [16, 185, 129]
  return [59, 130, 246]
}

const DETAIL_ZOOM_THRESHOLD = 8

export function MapView() {
  const filters = useMapStore((state) => state.filters)
  const selectedMmsi = useMapStore((state) => state.selectedMmsi)
  const setSelectedMmsi = useMapStore((state) => state.setSelectedMmsi)
  const selectedHex = useMapStore((state) => state.selectedHex)
  const setSelectedHex = useMapStore((state) => state.setSelectedHex)
  const selectedPortId = useMapStore((state) => state.selectedPortId)
  const setSelectedPortId = useMapStore((state) => state.setSelectedPortId)
  const layerToggles = useMapStore((state) => state.layerToggles)
  const realtimePositions = useMapStore((state) => state.realtimePositions)
  const updatePositions = useMapStore((state) => state.updatePositions)
  const mapMode = useMapStore((state) => state.mapMode)
  const playbackIndex = useMapStore((state) => state.playbackIndex)
  const clearSelection = useMapStore((state) => state.clearSelection)
  const { t } = useI18n()

  const {
    zoom,
    viewState,
    debouncedBbox,
    sseBboxStr,
    restBboxStr,
    setViewState,
    onMapMove,
  } = useMapViewport()

  const mapRef = useRef<MapRef | null>(null)
  const prevInteractingRef = useRef(false)
  const isDetailZoom = zoom >= DETAIL_ZOOM_THRESHOLD

  const { data: restPositions } = useVesselPositions(
    isDetailZoom ? debouncedBbox : null,
    {
      minSog: filters.minSog,
      maxSog: filters.maxSog,
      shipTypes: filters.shipTypes,
      name: filters.name,
      destination: filters.destination,
    },
  )
  const { data: clusterData } = useVesselCluster(
    !isDetailZoom ? debouncedBbox : null,
    zoom,
    {
      minSog: filters.minSog,
      maxSog: filters.maxSog,
      shipTypes: filters.shipTypes,
      name: filters.name,
      destination: filters.destination,
    },
  )
  const { data: aircraftData } = useAircraftPositions(debouncedBbox)
  const { data: portData } = usePorts(debouncedBbox, layerToggles.ports || layerToggles.tradeflow)
  const { data: tradeFlowData } = useTradeFlows(100)

  const { data: idleData } = useIdleEvents(restBboxStr, true, 200)
  const { data: fleetsData } = useFleets()
  const { data: allFleetMembers } = useAllFleetMembers()
  const { data: windData } = useWind(debouncedBbox, layerToggles.weather)

  const { data: selectedVesselRealtime } = useVesselRealtime(selectedMmsi)
  const { data: selectedPort } = usePort(selectedPortId)

  const hasVesselFilter =
    (filters.shipTypes && filters.shipTypes.length > 0) ||
    !!filters.name ||
    !!filters.destination

  useSSE({
    bbox: isDetailZoom && !hasVesselFilter ? sseBboxStr : null,
    minSog: filters.minSog,
    onPositions: updatePositions,
  })

  const trackFrom = useMapStore((state) => state.trackFrom)
  const trackTo = useMapStore((state) => state.trackTo)
  const forecastHorizon = useMapStore((state) => state.forecastHorizon)
  const { data: trackData } = useVesselTrack(selectedMmsi, trackFrom ?? undefined, trackTo ?? undefined)

  useEffect(() => {
    const handleCenterOnVessel = (e: Event) => {
      const { mmsi } = (e as CustomEvent<{ mmsi: number }>).detail
      const pos = realtimePositions.get(mmsi) ?? restPositions?.find((p) => p.mmsi === mmsi)
      if (pos) {
        setViewState({
          longitude: pos.lon,
          latitude: pos.lat,
          zoom: Math.max(zoom, 12),
        })
        setTimeout(() => onMapMove(mapRef.current), 100)
      }
    }
    const handleScreenshot = () => {
      const canvas = document.querySelector('canvas')
      if (!canvas) return
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `marinemap_${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    window.addEventListener('centerOnVessel', handleCenterOnVessel as EventListener)
    window.addEventListener('captureScreenshot', handleScreenshot as EventListener)
    return () => {
      window.removeEventListener('centerOnVessel', handleCenterOnVessel as EventListener)
      window.removeEventListener('captureScreenshot', handleScreenshot as EventListener)
    }
  }, [realtimePositions, restPositions, zoom])

  const allPositions = useMemo(() => {
    if (!isDetailZoom) return []
    const merged = new Map<number, VesselPosition>()
    for (const p of restPositions ?? []) {
      merged.set(p.mmsi, p)
    }
    if (!hasVesselFilter) {
      for (const p of realtimePositions.values()) {
        merged.set(p.mmsi, p)
      }
    }
    return Array.from(merged.values())
  }, [restPositions, realtimePositions, isDetailZoom, hasVesselFilter])

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
      const pts = trackData.points.slice(0, playbackIndex + 1)
      if (pts.length > 1) {
        const segments: { path: [number, number][]; sog: number }[] = []
        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1]
          const curr = pts[i]
          const avgSog = ((prev.sog ?? 0) + (curr.sog ?? 0)) / 2
          segments.push({
            path: [
              [prev.lon, prev.lat],
              [curr.lon, curr.lat],
            ],
            sog: avgSog,
          })
        }
        result.push(
          new PathLayer({
            id: 'track-path',
            data: segments,
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: (d: { sog: number }) => sogToColor(d.sog),
            getWidth: 3,
            widthMinPixels: 2,
            pickable: false,
            parameters: { depthTest: false },
          }),
        )
      }

      if (forecastHorizon > 0) {
        const forecast = computeForecast(
          pts.map((p) => ({
            lon: p.lon,
            lat: p.lat,
            sog: p.sog,
            cog: p.cog,
            ts: p.ts,
          })),
          forecastHorizon,
        )
        if (forecast.length > 1) {
          const lastPt = pts[pts.length - 1]
          const forecastPath: [number, number][] = [
            [lastPt.lon, lastPt.lat],
            ...forecast.map((p) => [p.lon, p.lat] as [number, number]),
          ]
          result.push(
            new PathLayer({
              id: 'forecast-path',
              data: [{ path: forecastPath }],
              getPath: (d: { path: [number, number][] }) => d.path,
              getColor: [168, 85, 247, 180],
              getWidth: 2,
              widthMinPixels: 1.5,
              dashJustified: true,
              dashArray: [6, 4],
              pickable: false,
              parameters: { depthTest: false },
            }),
          )
        }
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
                setViewState({
                  longitude: lon,
                  latitude: lat,
                  zoom: Math.min(viewState.zoom + 2, DETAIL_ZOOM_THRESHOLD + 1),
                })
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

    if (layerToggles.ports && portData && portData.length > 0) {
      result.push(
        ...createPortLayer({
          data: portData,
          onSelect: setSelectedPortId,
          selectedPortId,
        }),
      )
    }

    if (layerToggles.tradeflow && tradeFlowData && tradeFlowData.flows.length > 0) {
      result.push(...createTradeFlowLayer({ data: tradeFlowData.flows }))
    }

    if (layerToggles.idle && idleData && idleData.events.length > 0) {
      result.push(...createIdleLayer({ data: idleData.events, onSelect: setSelectedMmsi }))
    }

    if (
      layerToggles.fleet &&
      allFleetMembers &&
      allFleetMembers.length > 0 &&
      allPositions.length > 0
    ) {
      const fleetColors = new Map<number, [number, number, number]>()
      for (const m of allFleetMembers) {
        fleetColors.set(m.mmsi, hexToRgb(m.color))
      }
      result.push(
        ...createFleetLayer({
          data: allPositions,
          fleetColors,
          onSelect: setSelectedMmsi,
        }),
      )
    }

    if (layerToggles.weather && windData && windData.points.length > 0) {
      result.push(createWeatherLayer({ data: windData.points }))
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
    layerToggles,
    portData,
    tradeFlowData,
    idleData,
    fleetsData,
    allFleetMembers,
    windData,
    selectedPortId,
    setSelectedPortId,
  ])

  const hasSelection = selectedMmsi !== null || selectedHex !== null || selectedPortId !== null

  const handleLocateSelected = () => {
    let targetLon: number | null = null
    let targetLat: number | null = null

    if (selectedMmsi !== null) {
      const pos =
        selectedVesselRealtime ??
        realtimePositions.get(selectedMmsi) ??
        restPositions?.find((p) => p.mmsi === selectedMmsi)
      if (pos) {
        targetLon = pos.lon
        targetLat = pos.lat
      }
    } else if (selectedHex !== null && aircraftData) {
      const ac = aircraftData.find((a) => a.hex === selectedHex)
      if (ac) {
        targetLon = ac.lon
        targetLat = ac.lat
      }
    } else if (selectedPortId !== null) {
      const port = selectedPort ?? portData?.find((p) => p.id === selectedPortId)
      if (port) {
        targetLon = port.lon
        targetLat = port.lat
      }
    }

    if (targetLon !== null && targetLat !== null) {
      setViewState({
        longitude: targetLon,
        latitude: targetLat,
        zoom: Math.max(zoom, 12),
      })
      setTimeout(() => onMapMove(mapRef.current), 100)
    }
  }

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
          setViewState({ longitude, latitude, zoom: newZoom })

          const is = evt.interactionState || {}
          const interacting = Boolean(
            is.inTransition || is.isDragging || is.isPanning || is.isRotating || is.isZooming
          )
          const wasInteracting = prevInteractingRef.current
          prevInteractingRef.current = interacting

          if (wasInteracting && !interacting) {
            onMapMove(mapRef.current)
          }
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={(info: any) => {
          if (!info.object) {
            clearSelection()
          }
        }}
      >
        <MapGL
          ref={mapRef}
          mapStyle={MAP_STYLE_URL}
          style={{ width: '100%', height: '100%' }}
          onLoad={() => onMapMove(mapRef.current)}
        />
      </DeckGL>

      {/* Zoom controls - bottom right */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col items-center gap-2">
        {hasSelection && (
          <div className="glass flex flex-col overflow-hidden rounded-lg shadow-xl">
            <button
              onClick={handleLocateSelected}
              className="flex h-9 w-9 items-center justify-center text-sea-300 transition-colors hover:bg-ocean-700/50 hover:text-sea-200"
              aria-label={t('zoom.locate')}
              title={t('zoom.locate')}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="glass flex flex-col overflow-hidden rounded-lg shadow-xl">
          <button
            onClick={() => setViewState({ ...viewState, zoom: Math.min(zoom + 1, 20) })}
            className="flex h-9 w-9 items-center justify-center text-ocean-200 transition-colors hover:bg-ocean-700/50 hover:text-white"
            aria-label={t('zoom.in')}
            title={t('zoom.in')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          <div className="h-px w-full bg-ocean-700/50" />
          <button
            onClick={() => setViewState({ ...viewState, zoom: Math.max(zoom - 1, 1) })}
            className="flex h-9 w-9 items-center justify-center text-ocean-200 transition-colors hover:bg-ocean-700/50 hover:text-white"
            aria-label={t('zoom.out')}
            title={t('zoom.out')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="glass rounded-lg px-3 py-1.5 text-xs font-mono text-ocean-300">
          {zoom.toFixed(1)} {isDetailZoom ? `· ${t('zoom.detail')}` : `· ${t('zoom.cluster')}`}
        </div>
      </div>
    </div>
  )
}
