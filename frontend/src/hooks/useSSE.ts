import { useEffect, useRef, useState, useCallback } from 'react'
import type { VesselPosition } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const RECONNECT_DELAY = 3000

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
  const onPositionsRef = useRef(onPositions)

  onPositionsRef.current = onPositions

  const connect = useCallback(() => {
    const params = new URLSearchParams()
    if (bbox) params.set('bbox', bbox)
    if (minSog && minSog > 0) params.set('min_sog', String(minSog))
    const query = params.toString()

    const url = `${API_BASE_URL}/sse/positions${query ? `?${query}` : ''}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      setIsConnected(true)
      setError(null)
    })

    es.addEventListener('positions', (event) => {
      try {
        const data = JSON.parse(event.data) as VesselPosition[]
        onPositionsRef.current?.(data)
      } catch {
        // ignore parse errors
      }
    })

    es.addEventListener('error', () => {
      setIsConnected(false)
      setError('Connection lost, reconnecting...')
      es.close()

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(() => connect(), RECONNECT_DELAY)
    })
  }, [bbox, minSog])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [connect])

  return { isConnected, error }
}
