import { memo } from 'react'
import { useMapStore, type MapMode } from '../../store/mapStore'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n/translations'

const MODES: { mode: MapMode; label: TranslationKey; icon: string }[] = [
  { mode: 'vessels', label: 'layer.vessels', icon: 'M3 6l9-3 9 3v15l-9-3-9 3V6z' },
  { mode: 'aircraft', label: 'layer.aircraft', icon: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z' },
  { mode: 'both', label: 'layer.both', icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z' },
  { mode: 'heatmap', label: 'layer.density', icon: 'M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z' },
]

const ANALYTICS_LAYERS: { key: 'ports' | 'tradeflow' | 'anchorage' | 'idle' | 'fleet' | 'weather'; label: TranslationKey; icon: string }[] = [
  { key: 'ports', label: 'layer.ports', icon: 'M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z' },
  { key: 'tradeflow', label: 'layer.tradeFlow', icon: 'M3 17l6-6 4 4 8-8M14 7h7v7' },
  { key: 'anchorage', label: 'layer.anchorage', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v4M12 16h.01' },
  { key: 'idle', label: 'layer.idle', icon: 'M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6' },
  { key: 'fleet', label: 'layer.fleet', icon: 'M3 6h18M3 12h18M3 18h18' },
  { key: 'weather', label: 'layer.weather', icon: 'M3 15h4a4 4 0 100-8 5 5 0 00-9.6 1.5M3 15v4M7 15v4M11 15v4' },
]

function BaseLayersComponent() {
  const mapMode = useMapStore((s) => s.mapMode)
  const setMapMode = useMapStore((s) => s.setMapMode)
  const t = useT()

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {MODES.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => setMapMode(mode)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
            mapMode === mode
              ? 'bg-sea-500 text-white shadow-lg shadow-sea-500/30'
              : 'border border-ocean-700/40 bg-ocean-900/40 text-ocean-300 hover:bg-ocean-800/50 hover:text-white'
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t(label)}
        </button>
      ))}
    </div>
  )
}

function AnalyticsOverlaysComponent() {
  const layerToggles = useMapStore((s) => s.layerToggles)
  const setLayerToggle = useMapStore((s) => s.setLayerToggle)
  const t = useT()

  return (
    <div className="space-y-1.5">
      {ANALYTICS_LAYERS.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => setLayerToggle(key, !layerToggles[key])}
          className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${
            layerToggles[key]
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
              : 'border-ocean-700/40 bg-ocean-900/40 text-ocean-300 hover:bg-ocean-800/50 hover:text-white'
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t(label)}
          <div className={`ml-auto h-3.5 w-3.5 rounded-full border ${layerToggles[key] ? 'bg-amber-400 border-amber-400' : 'border-ocean-600'}`}>
            {layerToggles[key] && (
              <svg className="h-full w-full text-ocean-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

export const BaseLayers = memo(BaseLayersComponent)
export const AnalyticsOverlays = memo(AnalyticsOverlaysComponent)

function LayerControlsComponent() {
  const t = useT()
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
        {t('section.baseLayers')}
      </h3>
      <BaseLayers />

      <h3 className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
        {t('section.analyticsOverlays')}
      </h3>
      <AnalyticsOverlays />
    </div>
  )
}

export const LayerControls = memo(LayerControlsComponent)
