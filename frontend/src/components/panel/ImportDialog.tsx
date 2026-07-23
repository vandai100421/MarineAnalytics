import { useState, useCallback, useRef, type DragEvent } from 'react'
import { useImportFull, useSyncRedis } from '../../api/imports'
import { useT } from '../../i18n/useI18n'
import type { ImportSummary, SyncRedisResult } from '../../types'

type ImportMode = 'full' | 'redis'

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<ImportMode>('redis')
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<ImportSummary | SyncRedisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const importFull = useImportFull()
  const syncRedis = useSyncRedis()

  const reset = useCallback(() => {
    setFile(null)
    setResult(null)
    setErrorMsg(null)
  }, [])

  const handleFileSelect = useCallback((selected: File) => {
    if (!selected.name.endsWith('.json')) {
      setErrorMsg(t('import.invalidFile'))
      return
    }
    setFile(selected)
    setResult(null)
    setErrorMsg(null)
  }, [t])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleStart = useCallback(() => {
    if (!file) return
    setResult(null)
    setErrorMsg(null)

    const onSuccess = (data: ImportSummary | SyncRedisResult) => setResult(data)
    const onError = (err: Error) => setErrorMsg(err.message)

    if (mode === 'full') {
      importFull.mutate(file, { onSuccess, onError })
    } else {
      syncRedis.mutate(file, { onSuccess, onError })
    }
  }, [file, mode, importFull, syncRedis])

  const isLoading = importFull.isPending || syncRedis.isPending
  const hasResult = result !== null
  const hasError = errorMsg !== null

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-dark w-full max-w-lg rounded-2xl border border-ocean-700/60 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-700/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-sea-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="text-sm font-bold text-white">{t('import.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ocean-400 transition-colors hover:bg-ocean-800 hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Dropzone */}
          {!hasResult && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition-all ${
                  isDragging
                    ? 'border-sea-400 bg-sea-500/10'
                    : file
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-ocean-700/60 bg-ocean-900/30 hover:border-ocean-600 hover:bg-ocean-800/30'
                }`}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="h-8 w-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-[10px] text-ocean-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="h-8 w-8 text-ocean-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-xs text-ocean-400">{t('import.dropzone')}</p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files?.[0]
                    if (selected) handleFileSelect(selected)
                  }}
                />
              </div>

              {/* Mode selection */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
                  {t('import.mode')}
                </p>
                <div className="space-y-2">
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-all ${
                      mode === 'redis'
                        ? 'border-sea-500/50 bg-sea-500/10'
                        : 'border-ocean-700/40 bg-ocean-900/30 hover:border-ocean-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={mode === 'redis'}
                      onChange={() => setMode('redis')}
                      className="mt-0.5 accent-sea-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">{t('import.redisOnly')}</p>
                      <p className="text-[10px] text-ocean-400">{t('import.redisOnlyDesc')}</p>
                    </div>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-all ${
                      mode === 'full'
                        ? 'border-sea-500/50 bg-sea-500/10'
                        : 'border-ocean-700/40 bg-ocean-900/30 hover:border-ocean-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={mode === 'full'}
                      onChange={() => setMode('full')}
                      className="mt-0.5 accent-sea-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">{t('import.full')}</p>
                      <p className="text-[10px] text-ocean-400">{t('import.fullDesc')}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Error */}
              {hasError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {t('import.error')}: {errorMsg}
                </div>
              )}

              {/* Start button */}
              <button
                onClick={handleStart}
                disabled={!file || isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-sea-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sea-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t('import.importing')}
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t('import.start')}
                  </>
                )}
              </button>
            </>
          )}

          {/* Result */}
          {hasResult && result && (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-1 py-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
                  <svg className="h-6 w-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-green-300">{t('import.success')}</p>
              </div>

              <div className="space-y-1.5 rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-3">
                {'vessels_synced' in result && (
                  <ResultRow label={t('import.vesselsSynced')} value={result.vessels_synced} />
                )}
                {'aircraft_synced' in result && (
                  <ResultRow label={t('import.aircraftSynced')} value={result.aircraft_synced} />
                )}
                {'positions_created' in result && (
                  <ResultRow label={t('import.positionsCreated')} value={result.positions_created} />
                )}
                {'vessels_created' in result && (
                  <ResultRow label={t('import.vesselsCreated')} value={result.vessels_created} />
                )}
                {'vessels_updated' in result && (
                  <ResultRow label={t('import.vesselsUpdated')} value={result.vessels_updated} />
                )}
                {'aircraft_created' in result && (
                  <ResultRow label={t('import.aircraftCreated')} value={result.aircraft_created} />
                )}
                {'ports_created' in result && (
                  <ResultRow label={t('import.portsCreated')} value={result.ports_created} />
                )}
                {'redis_synced' in result && result.redis_synced > 0 && (
                  <ResultRow label={t('import.vesselsSynced')} value={result.redis_synced} />
                )}
                {'aircraft_redis_synced' in result && result.aircraft_redis_synced > 0 && (
                  <ResultRow label={t('import.aircraftSynced')} value={result.aircraft_redis_synced} />
                )}
                {'errors' in result && result.errors.length > 0 && (
                  <div className="border-t border-red-500/20 pt-2">
                    <p className="text-[10px] font-semibold text-red-400">
                      {t('import.errors')}: {result.errors.length}
                    </p>
                    <div className="mt-1 max-h-24 overflow-y-auto">
                      {result.errors.slice(0, 10).map((e, i) => (
                        <p key={i} className="text-[9px] text-red-400/70">• {e}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="flex-1 rounded-lg border border-ocean-700/50 bg-ocean-800/50 px-4 py-2 text-xs font-medium text-ocean-200 transition-colors hover:bg-ocean-700/50"
                >
                  {t('import.start')}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-sea-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sea-600"
                >
                  {t('import.close')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ocean-400">{label}</span>
      <span className="font-semibold text-white">{value.toLocaleString()}</span>
    </div>
  )
}
