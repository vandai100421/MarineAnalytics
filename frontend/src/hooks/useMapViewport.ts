import { useEffect, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import { useMapStore } from '../store/mapStore'
import {
  bboxToString,
  expandBbox,
  quantizeBbox,
  SSE_TILE_RESOLUTION,
  TILE_RESOLUTION,
} from '../utils/geo'
import type { BoundingBox } from '../types'

const REST_DEBOUNCE_MS = 500
const SSE_DEBOUNCE_MS = 1500

interface ViewportState {
  zoom: number
  viewState: { longitude: number; latitude: number; zoom: number }
  debouncedBbox: BoundingBox | null
  sseBboxStr: string | null
  restBboxStr: string | null
  setViewState: (vs: { longitude: number; latitude: number; zoom: number }) => void
  onMapMove: (ref: MapRef | null) => void
}

export function useMapViewport(): ViewportState {
  const storeBbox = useMapStore((state) => state.bbox)
  const setBbox = useMapStore((state) => state.setBbox)

  const [zoom, setZoom] = useState(6)
  const [viewState, setViewStateInternal] = useState({
    longitude: 108.2,
    latitude: 16.0,
    zoom: 6,
  })

  const [debouncedBbox, setDebouncedBbox] = useState<BoundingBox | null>(storeBbox)
  const [sseBboxStr, setSseBboxStr] = useState<string | null>(null)
  const [restBboxStr, setRestBboxStr] = useState<string | null>(null)

  const restTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSseKeyRef = useRef<string>('')

  useEffect(() => {
    if (restTimerRef.current) clearTimeout(restTimerRef.current)
    restTimerRef.current = setTimeout(() => {
      if (!storeBbox) {
        setDebouncedBbox(null)
        setRestBboxStr(null)
        return
      }
      const expanded = expandBbox(storeBbox, 0.5)
      const quantized = quantizeBbox(expanded, TILE_RESOLUTION)
      setDebouncedBbox(quantized)
      setRestBboxStr(bboxToString(quantized))
    }, REST_DEBOUNCE_MS)
    return () => {
      if (restTimerRef.current) clearTimeout(restTimerRef.current)
    }
  }, [storeBbox])

  useEffect(() => {
    if (sseTimerRef.current) clearTimeout(sseTimerRef.current)
    sseTimerRef.current = setTimeout(() => {
      if (!storeBbox) {
        setSseBboxStr(null)
        lastSseKeyRef.current = ''
        return
      }
      const expanded = expandBbox(storeBbox, 1.0)
      const quantized = quantizeBbox(expanded, SSE_TILE_RESOLUTION)
      const key = bboxToString(quantized)
      if (key === lastSseKeyRef.current) return
      lastSseKeyRef.current = key ?? ''
      setSseBboxStr(key)
    }, SSE_DEBOUNCE_MS)
    return () => {
      if (sseTimerRef.current) clearTimeout(sseTimerRef.current)
    }
  }, [storeBbox])

  const setViewState = (vs: { longitude: number; latitude: number; zoom: number }) => {
    setZoom(vs.zoom)
    setViewStateInternal(vs)
  }

  const onMapMove = (ref: MapRef | null) => {
    if (!ref) return
    const bounds = ref.getBounds()
    const newBbox: BoundingBox = {
      minLon: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLon: bounds.getEast(),
      maxLat: bounds.getNorth(),
    }
    setBbox(newBbox)
  }

  return {
    zoom,
    viewState,
    debouncedBbox,
    sseBboxStr,
    restBboxStr,
    setViewState,
    onMapMove,
  }
}
