import { memo, useState, useEffect, useRef } from 'react'
import { useVesselSearch } from '../../api/vessels'
import { useMapStore } from '../../store/mapStore'
import { useT } from '../../i18n/useI18n'

function VesselSearchComponent() {
  const [input, setInput] = useState('')
  const [debounced, setDebounced] = useState('')
  const [showResults, setShowResults] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const setSelectedMmsi = useMapStore((s) => s.setSelectedMmsi)
  const setRightPanelOpen = useMapStore((s) => s.setRightPanelOpen)
  const t = useT()

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input), 300)
    return () => clearTimeout(timer)
  }, [input])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: results, isFetching } = useVesselSearch(debounced, showResults)

  const handleSelect = (mmsi: number) => {
    setSelectedMmsi(mmsi)
    setRightPanelOpen(true)
    setShowResults(false)
    setInput('')
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          placeholder={t('panel.searchVessel')}
          className="w-full rounded-lg border border-ocean-700/50 bg-ocean-950/50 py-2 pl-9 pr-3 text-sm text-white placeholder:text-ocean-600 focus:border-sea-500 focus:outline-none focus:ring-1 focus:ring-sea-500/50"
        />
        {isFetching && (
          <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
        )}
      </div>

      {showResults && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-ocean-700/50 bg-ocean-900 shadow-xl">
          {results && results.length > 0 ? (
            results.map((v) => (
              <button
                key={v.mmsi}
                onClick={() => handleSelect(v.mmsi)}
                className="flex w-full items-center gap-3 border-b border-ocean-800/50 px-3 py-2 text-left transition-colors last:border-0 hover:bg-ocean-800/50"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sea-500/20">
                  <svg className="h-4 w-4 text-sea-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6l9-3 9 3v15l-9-3-9 3V6z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {v.name ?? t('vessel.unknown')}
                  </p>
                  <p className="font-mono text-[10px] text-ocean-400">
                    MMSI {v.mmsi}
                    {v.ship_type_name && ` · ${v.ship_type_name}`}
                  </p>
                </div>
                {v.destination && (
                  <span className="flex-shrink-0 truncate text-[10px] text-ocean-500" title={v.destination}>
                    → {v.destination}
                  </span>
                )}
              </button>
            ))
          ) : (
            !isFetching && (
              <div className="px-3 py-6 text-center text-xs text-ocean-500">
                {t('panel.searchNoResult')} "{debounced}"
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

export const VesselSearch = memo(VesselSearchComponent)
