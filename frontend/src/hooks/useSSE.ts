import { useEffect, useRef, useState, useCallback } from 'react'
import type { VesselPosition } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const MIN_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 60000
const HEARTBEAT_TIMEOUT_MS = 45000

interface UseSSEOptions {
  bbox: string | null
  minSog?: number
  onPositions?: (positions: VesselPosition[]) => void
}

export function useSSE({ bbox, minSog, onPositions }: UseSSEOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const bboxRef = useRef(bbox)
  const minSogRef = useRef(minSog)
  const onPositionsRef = useRef(onPositions)
  const mountedRef = useRef(true)

  bboxRef.current = bbox
  minSogRef.current = minSog
  onPositionsRef.current = onPositions

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return
    clearTimers()
    const attempt = retryCountRef.current
    const delay = Math.min(MIN_RECONNECT_DELAY * 2 ** attempt, MAX_RECONNECT_DELAY)
    retryCountRef.current = attempt + 1
    reconnectTimerRef.current = setTimeout(() => connect(), delay)
  }, [clearTimers])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    clearTimers()

    const currentBbox = bboxRef.current
    if (!currentBbox) {
      setIsConnected(false)
      return
    }

    const params = new URLSearchParams()
    params.set('bbox', currentBbox)
    if (minSogRef.current && minSogRef.current > 0) {
      params.set('min_sog', String(minSogRef.current))
    }

    const url = `${API_BASE_URL}/sse/positions?${params.toString()}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    const resetHeartbeat = () => {
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current)
      heartbeatTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          es.close()
          scheduleReconnect()
        }
      }, HEARTBEAT_TIMEOUT_MS)
    }

    es.addEventListener('connected', () => {
      retryCountRef.current = 0
      setIsConnected(true)
      setError(null)
      resetHeartbeat()
    })

    es.addEventListener('positions', (event) => {
      try {
        const data = JSON.parse(event.data) as VesselPosition[]
        onPositionsRef.current?.(data)
      } catch {
        // ignore parse errors
      }
      resetHeartbeat()
    })

    es.addEventListener('heartbeat', () => {
      resetHeartbeat()
    })

    es.addEventListener('open', () => {
      setIsConnected(true)
      setError(null)
      retryCountRef.current = 0
      resetHeartbeat()
    })

    es.addEventListener('error', () => {
      setIsConnected(false)
      setError('Connection lost, reconnecting...')
      es.close()
      scheduleReconnect()
    })
  }, [clearTimers, scheduleReconnect])

  useEffect(() => {
    mountedRef.current = true
    if (bbox) {
      connect()
    } else {
      setIsConnected(false)
    }
    return () => {
      mountedRef.current = false
      clearTimers()
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox])

  return { isConnected, error }
}
