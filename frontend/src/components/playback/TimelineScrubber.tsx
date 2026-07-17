import { useState, useCallback, useEffect } from 'react'
import { useT } from '../../i18n/useI18n'

interface TimelineScrubberProps {
  total: number
  onIndexChange: (index: number) => void
}

export function TimelineScrubber({ total, onIndexChange }: TimelineScrubberProps) {
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const t = useT()

  const handleChange = useCallback(
    (value: number) => {
      setCurrent(value)
      onIndexChange(value)
    },
    [onIndexChange],
  )

  const handleReset = useCallback(() => {
    setCurrent(0)
    onIndexChange(0)
    setIsPlaying(false)
  }, [onIndexChange])

  useEffect(() => {
    if (!isPlaying || current >= total - 1) {
      if (current >= total - 1) setIsPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      const next = current + 1
      setCurrent(next)
      onIndexChange(next)
    }, 1000 / speed)
    return () => clearTimeout(timer)
  }, [isPlaying, current, total, speed, onIndexChange])

  if (total === 0) return null

  const progress = ((current + 1) / total) * 100

  return (
    <div className="glass rounded-xl p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={current >= total - 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-sea-500 text-white transition-all hover:bg-sea-600 disabled:cursor-not-allowed disabled:opacity-40"
            title={isPlaying ? t('playback.pause') : t('playback.play')}
          >
            {isPlaying ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean-700/50 text-ocean-300 transition-all hover:bg-ocean-700 hover:text-white"
            title={t('playback.reset')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                speed === s
                  ? 'bg-sea-500/20 text-sea-300'
                  : 'text-ocean-400 hover:bg-ocean-700/40 hover:text-ocean-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-2">
        <input
          type="range"
          min={0}
          max={total - 1}
          value={current}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-full"
          style={{
            background: `linear-gradient(to right, #0ea5e9 ${progress}%, #3d4e6b ${progress}%)`,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono text-ocean-300">
          {current + 1} / {total}
        </span>
        <span className="text-ocean-500">{t('section.trackHistory')}</span>
      </div>
    </div>
  )
}
