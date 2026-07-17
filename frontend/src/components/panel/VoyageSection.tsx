import { memo } from 'react'
import { useVessel, useVesselRealtime, useVesselEta } from '../../api/vessels'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n/translations'

interface VoyageSectionProps {
  mmsi: number
}

function VoyageSectionComponent({ mmsi }: VoyageSectionProps) {
  const { data: vessel } = useVessel(mmsi)
  const { data: realtime } = useVesselRealtime(mmsi)
  const { data: eta } = useVesselEta(mmsi)
  const t = useT()

  const destination = vessel?.destination ?? t('voyage.noDestination')
  const aisEta = vessel?.eta
  const sog = realtime?.sog ?? eta?.current_sog ?? 0

  let aisEtaDisplay = '—'
  if (aisEta) {
    const d = new Date(aisEta)
    if (d.getTime() > 0) {
      aisEtaDisplay = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }
  }

  const matchedPort = eta?.matched_port
  const confidence = eta?.match_confidence ?? 0
  const confidenceLevel: TranslationKey =
    confidence >= 0.8 ? 'confidence.high' : confidence >= 0.5 ? 'confidence.medium' : 'confidence.low'
  const confidenceColor =
    confidence >= 0.8
      ? 'bg-green-500/20 text-green-300 border-green-500/30'
      : confidence >= 0.5
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        : 'bg-red-500/20 text-red-300 border-red-500/30'

  let predictedEtaDisplay = '—'
  if (eta?.eta_time) {
    const d = new Date(eta.eta_time)
    predictedEtaDisplay = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const etaHours = eta?.eta_hours
  let etaDurationDisplay = ''
  if (etaHours !== null && etaHours !== undefined) {
    if (etaHours >= 24) {
      const days = Math.floor(etaHours / 24)
      const hrs = Math.round(etaHours % 24)
      etaDurationDisplay = `${days}${t('time.days')} ${hrs}${t('time.hours')}`
    } else {
      etaDurationDisplay = `${Math.round(etaHours)}${t('time.hours')}`
    }
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 17l6-6 4 4 8-8M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">
              {t('voyage.destination')}
            </p>
            <p className="text-sm font-semibold text-white">{destination}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{t('field.etaAis')}</p>
          <p className="text-sm font-semibold text-amber-300">{aisEtaDisplay}</p>
        </div>
        <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{t('field.currentSpeed')}</p>
          <p className="text-sm font-semibold text-green-300">
            {sog.toFixed(1)} <span className="text-[10px] text-ocean-500">kn</span>
          </p>
        </div>
      </div>

      {matchedPort && (
        <div className="rounded-lg border border-sea-500/30 bg-gradient-to-br from-sea-500/10 to-ocean-900/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-sea-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sea-300">
                {t('field.etaPredicted')}
              </span>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${confidenceColor}`}>
              {t('field.confidence')}: {t(confidenceLevel)}
            </span>
          </div>

          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-xs text-ocean-300">{matchedPort.name}</span>
            {matchedPort.country_code && (
              <span className="rounded bg-ocean-700/50 px-1 text-[9px] font-mono text-ocean-300">
                {matchedPort.country_code}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-ocean-500">{t('field.distance')}</p>
              <p className="text-sm font-semibold text-white">
                {eta?.distance_nm !== null && eta?.distance_nm !== undefined
                  ? `${eta.distance_nm}`
                  : '—'}
                {eta?.distance_nm !== null && eta?.distance_nm !== undefined && (
                  <span className="text-[10px] text-ocean-500"> nm</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ocean-500">{t('field.eta')}</p>
              <p className="text-sm font-semibold text-sea-200">{predictedEtaDisplay}</p>
              {etaDurationDisplay && (
                <p className="text-[9px] text-ocean-500">{etaDurationDisplay}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {vessel?.callsign && (
        <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{t('field.callsign')}</p>
          <p className="font-mono text-sm text-ocean-100">{vessel.callsign}</p>
        </div>
      )}

      <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ocean-400">{t('field.imo')}</p>
        <p className="font-mono text-sm text-ocean-100">
          {vessel?.imo ? vessel.imo : '—'}
        </p>
      </div>
    </div>
  )
}

export const VoyageSection = memo(VoyageSectionComponent)
