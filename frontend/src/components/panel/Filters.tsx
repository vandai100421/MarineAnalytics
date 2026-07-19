import { memo } from 'react'
import type { VesselFilters } from '../../types'
import { SHIP_TYPE_OPTIONS } from '../../types'
import { useT } from '../../i18n/useI18n'

interface FiltersProps {
  filters: VesselFilters
  onChange: (filters: VesselFilters) => void
}

const TYPE_COLORS: Record<number, string> = {
  30: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  70: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  80: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  60: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  36: 'bg-green-500/20 text-green-300 border-green-500/30',
  37: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
}

function FiltersComponent({ filters, onChange }: FiltersProps) {
  const t = useT()

  const toggleShipType = (value: number) => {
    const current = filters.shipTypes ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onChange({ ...filters, shipTypes: next.length > 0 ? next : undefined })
  }

  const activeCount =
    (filters.shipTypes?.length ?? 0) +
    (filters.minSog ? 1 : 0) +
    (filters.maxSog ? 1 : 0) +
    (filters.name ? 1 : 0) +
    (filters.destination ? 1 : 0)

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
          {t('filter.vesselName')}
        </label>
        <input
          type="text"
          value={filters.name ?? ''}
          onChange={(e) =>
            onChange({ ...filters, name: e.target.value || undefined })
          }
          placeholder={t('filter.byName')}
          className="w-full rounded-lg border border-ocean-700/50 bg-ocean-950/50 px-2.5 py-1.5 text-xs text-white placeholder:text-ocean-600 focus:border-sea-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
          {t('filter.destination')}
        </label>
        <input
          type="text"
          value={filters.destination ?? ''}
          onChange={(e) =>
            onChange({ ...filters, destination: e.target.value || undefined })
          }
          placeholder={t('filter.byDestination')}
          className="w-full rounded-lg border border-ocean-700/50 bg-ocean-950/50 px-2.5 py-1.5 text-xs text-white placeholder:text-ocean-600 focus:border-sea-500 focus:outline-none"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
            {t('filter.minSpeed')}
          </label>
          <span className="rounded-md bg-sea-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-sea-300">
            {filters.minSog !== undefined ? `${filters.minSog} kn` : 'Any'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={filters.minSog ?? 0}
          onChange={(e) =>
            onChange({
              ...filters,
              minSog: Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
            })
          }
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[9px] text-ocean-500">
          <span>0</span>
          <span>15</span>
          <span>30</span>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
            Max Speed
          </label>
          <span className="rounded-md bg-sea-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-sea-300">
            {filters.maxSog !== undefined ? `${filters.maxSog} kn` : 'Any'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={60}
          step={1}
          value={filters.maxSog ?? 60}
          onChange={(e) =>
            onChange({
              ...filters,
              maxSog: Number(e.target.value) < 60 ? Number(e.target.value) : undefined,
            })
          }
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[9px] text-ocean-500">
          <span>0</span>
          <span>30</span>
          <span>60+</span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
          {t('filter.shipType')}
        </label>
        <div className="flex flex-wrap gap-1">
          {SHIP_TYPE_OPTIONS.map((opt) => {
            const active = filters.shipTypes?.includes(opt.value) ?? false
            const colorClass =
              TYPE_COLORS[opt.value] ?? 'bg-ocean-700/40 text-ocean-300 border-ocean-600/40'
            return (
              <button
                key={opt.value}
                onClick={() => toggleShipType(opt.value)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all ${
                  active
                    ? `${colorClass} shadow-sm`
                    : 'border-ocean-700/40 bg-ocean-900/40 text-ocean-400 hover:border-ocean-600 hover:text-ocean-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeCount > 0 && (
        <button
          onClick={() => onChange({})}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-medium text-red-300 transition-all hover:bg-red-500/20"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
          </svg>
          {t('filter.clear')} {activeCount} {t('filter.filters')}
        </button>
      )}
    </div>
  )
}

export const Filters = memo(FiltersComponent)
