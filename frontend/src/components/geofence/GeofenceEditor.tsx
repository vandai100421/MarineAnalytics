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
        <h3 className="text-sm font-semibold text-gray-300">Geofence Editor</h3>
        <button
          onClick={onToggle}
          className={`rounded px-3 py-1 text-xs ${
            isActive
              ? 'bg-red-500 text-white'
              : 'bg-sea-500 text-white'
          }`}
        >
          {isActive ? 'Stop Drawing' : 'Draw Polygon'}
        </button>
      </div>

      {isActive && (
        <>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Restricted Zone..."
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white"
            >
              <option value="restricted">Restricted</option>
              <option value="warning">Warning</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">
            Click on map to add points ({points.length} points)
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-500"
            >
              Save
            </button>
            <button
              onClick={handleClear}
              className="flex-1 rounded bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-500"
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  )
}
