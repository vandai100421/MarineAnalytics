import type { VesselFilters } from '../../types'
import { SHIP_TYPE_OPTIONS } from '../../types'

interface FiltersProps {
  filters: VesselFilters
  onChange: (filters: VesselFilters) => void
}

export function Filters({ filters, onChange }: FiltersProps) {
  const toggleShipType = (value: number) => {
    const current = filters.shipTypes ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onChange({ ...filters, shipTypes: next.length > 0 ? next : undefined })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          Min Speed (knots): {filters.minSog ?? 0}
        </label>
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
          className="w-full accent-sea-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Ship Type
        </label>
        <div className="grid grid-cols-2 gap-1">
          {SHIP_TYPE_OPTIONS.map((opt) => {
            const active = filters.shipTypes?.includes(opt.value) ?? false
            return (
              <button
                key={opt.value}
                onClick={() => toggleShipType(opt.value)}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  active
                    ? 'bg-sea-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {(filters.shipTypes || filters.minSog) && (
        <button
          onClick={() => onChange({})}
          className="w-full rounded bg-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600"
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}
