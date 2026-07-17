import { memo, useState } from 'react'
import {
  useFleets,
  useFleetMembers,
  useFleetStats,
  useCreateFleet,
  useDeleteFleet,
  useAddMember,
  useRemoveMember,
} from '../../api/fleets'
import { useMapStore } from '../../store/mapStore'
import { useT } from '../../i18n/useI18n'

const FLEET_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#a855f7',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
]

function FleetManagerComponent() {
  const { data: fleets, isLoading } = useFleets()
  const [selectedFleetId, setSelectedFleetId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [newMmsi, setNewMmsi] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createFleet = useCreateFleet()
  const deleteFleet = useDeleteFleet()
  const setSelectedMmsi = useMapStore((s) => s.setSelectedMmsi)
  const setRightPanelOpen = useMapStore((s) => s.setRightPanelOpen)
  const t = useT()

  const { data: members } = useFleetMembers(selectedFleetId)
  const { data: stats } = useFleetStats(selectedFleetId)
  const addMember = useAddMember(selectedFleetId)
  const removeMember = useRemoveMember(selectedFleetId)

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError(t('geofence.needName'))
      return
    }
    const color = FLEET_COLORS[(fleets?.length ?? 0) % FLEET_COLORS.length]
    try {
      await createFleet.mutateAsync({ name: newName.trim(), color })
      setNewName('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleAddMember = async () => {
    const mmsi = parseInt(newMmsi, 10)
    if (!mmsi) {
      setError('Invalid MMSI')
      return
    }
    try {
      await addMember.mutateAsync(mmsi)
      setNewMmsi('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ocean-600 border-t-sea-400" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('fleet.namePlaceholder')}
          className="flex-1 rounded-lg border border-ocean-700/50 bg-ocean-950/50 px-2.5 py-1.5 text-xs text-white placeholder:text-ocean-600 focus:border-sea-500 focus:outline-none"
        />
        <button
          onClick={handleCreate}
          className="rounded-lg bg-sea-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-sea-600"
        >
          +
        </button>
      </div>

      {error && <p className="text-[10px] text-red-400">{error}</p>}

      {fleets && fleets.length === 0 && (
        <p className="py-3 text-center text-xs text-ocean-500">{t('fleet.noFleets')}</p>
      )}

      <div className="space-y-1.5">
        {fleets?.map((fleet) => (
          <div
            key={fleet.id}
            className={`rounded-lg border p-2 transition-all ${
              selectedFleetId === fleet.id
                ? 'border-sea-500/40 bg-sea-500/10'
                : 'border-ocean-700/40 bg-ocean-900/40'
            }`}
          >
            <button
              onClick={() => setSelectedFleetId(selectedFleetId === fleet.id ? null : fleet.id)}
              className="flex w-full items-center gap-2 text-left"
            >
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: fleet.color }}
              />
              <span className="flex-1 truncate text-xs font-medium text-white">{fleet.name}</span>
              <span className="rounded bg-ocean-700/50 px-1.5 py-0.5 text-[9px] font-mono text-ocean-300">
                {fleet.member_count}
              </span>
            </button>

            {selectedFleetId === fleet.id && (
              <div className="mt-2 space-y-2 border-t border-ocean-700/40 pt-2">
                {stats && (
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <p className="text-[9px] uppercase text-ocean-500">{t('fleet.active')}</p>
                      <p className="text-xs font-bold text-green-400">{stats.active_members}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-ocean-500">{t('stat.avgSog')}</p>
                      <p className="text-xs font-bold text-amber-400">{stats.avg_sog}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-ocean-500">{t('layer.idle')}</p>
                      <p className="text-xs font-bold text-orange-400">{stats.idle_count}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newMmsi}
                    onChange={(e) => setNewMmsi(e.target.value)}
                    placeholder="MMSI..."
                    className="flex-1 rounded border border-ocean-700/50 bg-ocean-950/50 px-2 py-1 text-[11px] text-white placeholder:text-ocean-600 focus:border-sea-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddMember}
                    className="rounded bg-sea-500/20 px-2 py-1 text-[11px] text-sea-300 hover:bg-sea-500/30"
                  >
                    +
                  </button>
                </div>

                {members && members.length > 0 && (
                  <div className="space-y-1">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5 text-[11px]">
                        <button
                          onClick={() => {
                            setSelectedMmsi(m.mmsi)
                            setRightPanelOpen(true)
                          }}
                          className="font-mono text-sea-300 hover:underline"
                        >
                          {m.mmsi}
                        </button>
                        <span className="truncate text-ocean-400">{m.vessel_name ?? '—'}</span>
                        <button
                          onClick={() => removeMember.mutate(m.mmsi)}
                          className="ml-auto text-red-400 hover:text-red-300"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    deleteFleet.mutate(fleet.id)
                    setSelectedFleetId(null)
                  }}
                  className="w-full rounded border border-red-500/30 bg-red-500/10 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
                >
                  {t('fleet.delete')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export const FleetManager = memo(FleetManagerComponent)
