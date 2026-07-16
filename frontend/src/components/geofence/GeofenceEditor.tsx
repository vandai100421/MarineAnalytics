import { useState, useCallback } from 'react'
import { apiFetch } from '../../api/client'

interface GeofenceEditorProps {
  isActive: boolean
  onToggle: () => void
  onCreated: () => void
}

interface GeofenceResponse {
  id: number
  name: string
  type: string
  coordinates: number[][]
  description: string | null
  created_at: string
}

export function GeofenceEditor({ isActive, onToggle, onCreated }: GeofenceEditorProps) {
  const [points, setPoints] = useState<Array<[number, number]>>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('restricted')
  const [error, setError] = useState<string | null>(null)

  const handleMapClick = useCallback(
    (lng: number, lat: number) => {
      if (!isActive) return
      setPoints((prev) => [...prev, [lng, lat]])
    },
    [isActive],
  )

  const handleSave = useCallback(async () => {
    if (points.length < 3) {
      setError('Need at least 3 points to create a polygon')
      return
    }
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const closed = [...points]
    if (
      closed[0][0] !== closed[closed.length - 1][0] ||
      closed[0][1] !== closed[closed.length - 1][1]
    ) {
      closed.push(closed[0])
    }

    try {
      await apiFetch<GeofenceResponse>('/api/v1/geofences', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          type,
          coordinates: closed,
        }),
      })
      setPoints([])
      setName('')
      setError(null)
      onToggle()
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create geofence')
    }
  }, [points, name, type, onToggle, onCreated])

  const handleClear = useCallback(() => {
    setPoints([])
    setError(null)
  }, [])

  void handleMapClick

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ocean-400">
          Geofence Editor
        </h3>
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            isActive
              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
              : 'bg-sea-500 text-white hover:bg-sea-600'
          }`}
        >
          {isActive ? (
            <>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
              Stop Drawing
            </>
          ) : (
            <>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Draw Polygon
            </>
          )}
        </button>
      </div>

      {isActive && (
        <div className="space-y-3 rounded-xl border border-ocean-700/40 bg-ocean-900/40 p-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ocean-400">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Restricted Zone..."
              className="w-full rounded-lg border border-ocean-700/50 bg-ocean-950/50 px-2.5 py-1.5 text-sm text-white placeholder:text-ocean-600 focus:border-sea-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ocean-400">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-ocean-700/50 bg-ocean-950/50 px-2.5 py-1.5 text-sm text-white focus:border-sea-500 focus:outline-none"
            >
              <option value="restricted">Restricted</option>
              <option value="warning">Warning</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-ocean-950/50 px-2.5 py-1.5">
            <svg className="h-3.5 w-3.5 text-sea-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] text-ocean-300">
              Click on map to add points
            </span>
            <span className="ml-auto rounded-md bg-sea-500/20 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-sea-300">
              {points.length} pts
            </span>
          </div>
          {error && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300">
              <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-green-500"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Save
            </button>
            <button
              onClick={handleClear}
              className="flex-1 rounded-lg border border-ocean-700/50 bg-ocean-800/50 px-3 py-1.5 text-xs text-ocean-300 transition-all hover:bg-ocean-700/50"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
