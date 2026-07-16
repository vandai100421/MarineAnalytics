import { useState, useCallback } from 'react'

interface TimelineScrubberProps {
  total: number
  onIndexChange: (index: number) => void
}

export function TimelineScrubber({ total, onIndexChange }: TimelineScrubberProps) {
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handlePlay = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  const handleReset = useCallback(() => {
    setCurrent(0)
    onIndexChange(0)
    setIsPlaying(false)
  }, [onIndexChange])

  const handleChange = useCallback(
    (value: number) => {
      setCurrent(value)
      onIndexChange(value)
    },
    [onIndexChange],
  )

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed)
    },
    [],
  )

  if (total === 0) return null

  if (isPlaying && current >= total - 1) {
    setIsPlaying(false)
  }

  if (isPlaying && current < total - 1) {
    setTimeout(() => {
      const next = current + 1
      setCurrent(next)
      onIndexChange(next)
    }, 1000 / speed)
  }

  return (
    <div className="space-y-2 rounded-lg bg-gray-700 p-3">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePlay}
          disabled={current >= total - 1}
          className="rounded bg-sea-500 px-3 py-1 text-sm font-medium text-white hover:bg-sea-700 disabled:opacity-50"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={handleReset}
          className="rounded bg-gray-600 px-3 py-1 text-sm text-gray-200 hover:bg-gray-500"
        >
          Reset
        </button>
        <div className="flex gap-1">
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`rounded px-2 py-1 text-xs ${
                speed === s
                  ? 'bg-sea-500 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={total - 1}
        value={current}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-full accent-sea-500"
      />

      <div className="flex justify-between text-xs text-gray-400">
        <span>Point {current + 1} / {total}</span>
        <span>Speed: {speed}x</span>
      </div>
    </div>
  )
}
