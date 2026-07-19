import { useMemo, useState, useEffect, type MutableRefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import { useMapStore } from '../../store/mapStore'
import { useVessel, useVesselRealtime } from '../../api/vessels'
import { useAircraftPositions } from '../../api/aircraft'
import { usePort, usePortArrivals, usePortCongestion } from '../../api/ports'
import { useT } from '../../i18n/useI18n'

interface MapPopupProps {
  onClose: () => void
  suppressClearRef: MutableRefObject<boolean>
  mapRef: MutableRefObject<MapRef | null>
}

export function MapPopup({ onClose, suppressClearRef, mapRef }: MapPopupProps) {
  const selectedMmsi = useMapStore((s) => s.selectedMmsi)
  const selectedHex = useMapStore((s) => s.selectedHex)
  const selectedPortId = useMapStore((s) => s.selectedPortId)
  const bbox = useMapStore((s) => s.bbox)

  const { data: vessel } = useVessel(selectedMmsi)
  const { data: realtime } = useVesselRealtime(selectedMmsi)
  const { data: aircraftData } = useAircraftPositions(bbox)
  const { data: port } = usePort(selectedPortId)
  const { data: portCongestion } = usePortCongestion(selectedPortId)
  const { data: portArrivals } = usePortArrivals(selectedPortId, 10)

  const aircraft = useMemo(
    () => aircraftData?.find((a) => a.hex === selectedHex),
    [aircraftData, selectedHex],
  )

  let longitude: number | null = null
  let latitude: number | null = null
  let content: React.ReactNode = null

  if (selectedMmsi !== null && realtime) {
    longitude = realtime.lon
    latitude = realtime.lat
    content = <VesselPopupContent mmsi={selectedMmsi} vessel={vessel} realtime={realtime} />
  } else if (selectedHex !== null && aircraft) {
    longitude = aircraft.lon
    latitude = aircraft.lat
    content = <AircraftPopupContent aircraft={aircraft} />
  } else if (selectedPortId !== null && port) {
    longitude = port.lon
    latitude = port.lat
    content = (
      <PortPopupContent
        port={port}
        congestion={portCongestion}
        arrivals={portArrivals?.arrivals ?? []}
      />
    )
  }

  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (longitude === null || latitude === null) {
      setScreenPos(null)
      return
    }
    const map = mapRef.current
    if (!map) return

    const update = () => {
      const p = map.project([longitude!, latitude!])
      setScreenPos({ x: p.x, y: p.y })
    }
    update()

    map.on('move', update)
    map.on('resize', update)
    return () => {
      map.off('move', update)
      map.off('resize', update)
    }
  }, [longitude, latitude, mapRef])

  if (longitude === null || latitude === null || !content || !screenPos) {
    return null
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
  const margin = 240
  const isTop = screenPos.y < margin
  const isBottom = screenPos.y > vh - margin
  const isLeft = screenPos.x < 220
  const isRight = screenPos.x > vw - 220

  let style: React.CSSProperties
  if (isTop && !isBottom) {
    style = { left: screenPos.x, top: screenPos.y + 20, transform: 'translateX(-50%)' }
  } else if (isLeft && !isRight) {
    style = { left: screenPos.x + 20, top: screenPos.y, transform: 'translateY(-50%)' }
  } else if (isRight && !isLeft) {
    style = { left: screenPos.x - 20, top: screenPos.y, transform: 'translate(-100%, -50%)' }
  } else {
    style = { left: screenPos.x, top: screenPos.y - 20, transform: 'translate(-50%, -100%)' }
  }

  return (
    <div
      className="marine-popup-overlay pointer-events-auto absolute z-[9999] max-w-[380px] min-w-[280px]"
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        suppressClearRef.current = true
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
        suppressClearRef.current = true
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        suppressClearRef.current = true
      }}
      onWheel={(e) => {
        e.stopPropagation()
        suppressClearRef.current = true
      }}
    >
      <div className="marine-popup-card relative rounded-lg border border-ocean-600/60 bg-ocean-950/85 shadow-2xl backdrop-blur-md">
        <button
          onClick={(e) => {
            e.stopPropagation()
            suppressClearRef.current = true
            onClose()
          }}
          className="absolute right-1.5 top-1.5 z-10 rounded-md bg-ocean-900/80 p-1 text-ocean-300 hover:bg-ocean-700 hover:text-white"
          aria-label="Close"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
        <div className="max-h-[50vh] overflow-y-auto">{content}</div>
      </div>
    </div>
  )
}

function VesselPopupContent({
  mmsi,
  vessel,
  realtime,
}: {
  mmsi: number
  vessel: ReturnType<typeof useVessel>['data']
  realtime: NonNullable<ReturnType<typeof useVesselRealtime>['data']>
}) {
  const t = useT()
  const name = vessel?.name ?? `${t('vessel.unknown')} ${mmsi}`
  const shipTypeCode = vessel?.ship_type ?? 0
  const shipTypeName = vessel?.ship_type_name ?? 'Unknown'
  const length = (vessel?.dim_a ?? 0) + (vessel?.dim_b ?? 0)
  const beam = (vessel?.dim_c ?? 0) + (vessel?.dim_d ?? 0)
  const navStatus = getNavStatus(realtime.heading, realtime.sog)
  const movingStatus = realtime.sog < 0.5 ? 'Stopped' : realtime.sog < 3 ? 'Slow' : 'Underway'
  const shipCategory = getShipCategory(shipTypeCode)

  return (
    <div className="min-w-[300px] max-w-[380px]">
      <div className="flex items-center gap-2 border-b border-ocean-700/40 p-2 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sea-500/10">
          <svg className="h-6 w-6 text-sea-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 6l9-3 9 3v15l-9-3-9 3V6z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white" title={name}>
            {name}
          </p>
          <p className="font-mono text-[10px] text-ocean-400">MMSI {mmsi}</p>
        </div>
        <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-green-300">
          {t('app.live')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 p-2 text-center">
        <Stat label={t('field.speed')} value={realtime.sog.toFixed(1)} unit="kn" />
        <Stat label={t('field.course')} value={realtime.cog.toFixed(0)} unit="°" />
        <Stat label={t('field.heading')} value={realtime.heading.toFixed(0)} unit="°" />
      </div>

      <div className="border-t border-ocean-700/40 p-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <Row label={t('field.latitude')} value={`${realtime.lat.toFixed(4)}°`} />
          <Row label={t('field.longitude')} value={`${realtime.lon.toFixed(4)}°`} />
          <Row label={t('field.callsign')} value={vessel?.callsign ?? '—'} />
          <Row label={t('field.imo')} value={vessel?.imo ? String(vessel.imo) : '—'} />
          <Row label={t('field.destination')} value={vessel?.destination ?? '—'} />
          <Row
            label={t('field.eta')}
            value={
              vessel?.eta
                ? new Date(vessel.eta).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                : '—'
            }
          />
          <Row label="Ship Type" value={`${shipTypeCode} · ${shipTypeName}`} />
          <Row label="Category" value={shipCategory} />
          <Row label="Nav Status" value={navStatus} />
          <Row label="Movement" value={movingStatus} />
          {vessel?.callsign && <Row label="Callsign" value={vessel.callsign} />}
        </div>

        {length > 0 && beam > 0 && (
          <div className="mt-2 rounded-md bg-ocean-900/60 px-2 py-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-ocean-400">
                {t('field.length')}: <span className="text-white">{length}m</span>
              </span>
              <span className="text-ocean-400">
                {t('field.beam')}: <span className="text-white">{beam}m</span>
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-ocean-400">A: <span className="text-white">{vessel?.dim_a}m</span></span>
              <span className="text-ocean-400">B: <span className="text-white">{vessel?.dim_b}m</span></span>
              <span className="text-ocean-400">C: <span className="text-white">{vessel?.dim_c}m</span></span>
              <span className="text-ocean-400">D: <span className="text-white">{vessel?.dim_d}m</span></span>
            </div>
          </div>
        )}

        <p className="mt-2 text-[9px] text-ocean-500">
          {t('vessel.updated')}{' '}
          {realtime.ts
            ? new Date(realtime.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '—'}
        </p>
      </div>
    </div>
  )
}

function AircraftPopupContent({
  aircraft,
}: {
  aircraft: NonNullable<ReturnType<typeof useAircraftPositions>['data']>[number]
}) {
  const t = useT()
  const altColor = getAltColor(aircraft.alt)
  const altBand = getAltBand(aircraft.alt)
  const speedCategory = getSpeedCategory(aircraft.gs)

  return (
    <div className="min-w-[280px] max-w-[360px]">
      <div className="flex items-center gap-2 border-b border-ocean-700/40 p-2 pr-6">
        <svg className="h-6 w-6" style={{ color: altColor }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">
            {aircraft.flight ?? t('aircraft.unknownFlight')}
          </p>
          <p className="font-mono text-[10px] text-ocean-400">HEX {aircraft.hex}</p>
        </div>
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
          style={{ backgroundColor: `${altColor}33`, color: altColor }}
        >
          {altBand}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 p-2 text-center">
        <Stat label={t('field.altitude')} value={aircraft.alt !== null ? String(Math.round(aircraft.alt)) : '—'} unit="ft" />
        <Stat label={t('field.groundSpeed')} value={aircraft.gs !== null ? String(Math.round(aircraft.gs)) : '—'} unit="kn" />
        <Stat label={t('field.track')} value={aircraft.track !== null ? String(Math.round(aircraft.track)) : '—'} unit="°" />
      </div>

      <div className="border-t border-ocean-700/40 p-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <Row label={t('field.latitude')} value={`${aircraft.lat.toFixed(4)}°`} />
          <Row label={t('field.longitude')} value={`${aircraft.lon.toFixed(4)}°`} />
          <Row label={t('field.registration')} value={aircraft.reg ?? '—'} />
          <Row label={t('field.type')} value={aircraft.type ?? '—'} />
          <Row label="Flight" value={aircraft.flight ?? '—'} />
          <Row label="ICAO Hex" value={aircraft.hex} />
          <Row label="Altitude Band" value={altBand} />
          <Row label="Speed Category" value={speedCategory} />
        </div>
        <div className="mt-2 flex items-center justify-between rounded-md bg-ocean-900/60 px-2 py-1 text-[10px]">
          <span className="text-ocean-400">
            Vertical: <span style={{ color: altColor }}>{altBand}</span>
          </span>
          <span className="text-ocean-400">
            Phase: <span className="text-white">{aircraft.alt !== null && aircraft.alt < 1000 ? 'Ground/Taxi' : aircraft.alt !== null && aircraft.alt < 10000 ? 'Climb/Descent' : 'Cruise'}</span>
          </span>
        </div>
        <p className="mt-2 text-[9px] text-ocean-500">
          {t('vessel.updated')}{' '}
          {aircraft.ts
            ? new Date(aircraft.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '—'}
        </p>
      </div>
    </div>
  )
}

function PortPopupContent({
  port,
  congestion,
  arrivals,
}: {
  port: NonNullable<ReturnType<typeof usePort>['data']>
  congestion: ReturnType<typeof usePortCongestion>['data']
  arrivals: NonNullable<ReturnType<typeof usePortArrivals>['data']>['arrivals']
}) {
  const t = useT()

  return (
    <div className="min-w-[260px] max-w-[340px]">
      <div className="flex items-center gap-2 border-b border-ocean-700/40 p-2 pr-6">
        <svg className="h-6 w-6 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{port.name}</p>
          <p className="text-[10px] text-ocean-400">
            {port.country_code ?? '—'} · {port.type}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 p-2 text-center">
        <Stat label={t('port.vessels')} value={String(congestion?.vessel_count ?? 0)} />
        <Stat label={t('port.avgDwell')} value={`${congestion?.avg_dwell_minutes ?? 0}m`} />
      </div>

      {arrivals.length > 0 && (
        <div className="border-t border-ocean-700/40 p-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
            {t('port.recentArrivals')}
          </p>
          <div className="space-y-1">
            {arrivals.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="font-mono text-ocean-300">{a.mmsi}</span>
                <span className="text-ocean-500">
                  {new Date(a.arrived_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-md bg-ocean-900/40 px-1 py-1">
      <p className="text-[9px] uppercase tracking-wider text-ocean-400">{label}</p>
      <p className="text-sm font-bold text-white">
        {value}
        {unit && <span className="ml-0.5 text-[10px] text-ocean-400">{unit}</span>}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ocean-400">{label}</span>
      <span className="font-medium text-ocean-100" title={value}>
        {value}
      </span>
    </div>
  )
}

function getAltColor(alt: number | null): string {
  if (alt === null) return '#94a3b8'
  if (alt < 1000) return '#ef4444'
  if (alt < 10000) return '#f97316'
  if (alt < 30000) return '#eab308'
  if (alt < 40000) return '#22c55e'
  return '#3b82f6'
}

function getAltBand(alt: number | null): string {
  if (alt === null) return 'Unknown'
  if (alt < 1000) return 'Ground'
  if (alt < 10000) return 'Low'
  if (alt < 30000) return 'Mid'
  if (alt < 40000) return 'High'
  return 'Cruise'
}

function getSpeedCategory(gs: number | null): string {
  if (gs === null) return 'Unknown'
  if (gs < 50) return 'Taxi/Slow'
  if (gs < 250) return 'Slow'
  if (gs < 450) return 'Medium'
  if (gs < 600) return 'Fast'
  return 'Very Fast'
}

function getNavStatus(heading: number, sog: number): string {
  if (sog < 0.5) return 'At Anchor/Stopped'
  if (heading === 511) return 'Underway (no heading)'
  return 'Under way'
}

function getShipCategory(shipType: number): string {
  if (shipType === 0) return 'Not available'
  if (shipType >= 20 && shipType <= 29) return 'Wing in ground'
  if (shipType >= 30 && shipType <= 39) return 'Fishing'
  if (shipType >= 40 && shipType <= 49) return 'Towing'
  if (shipType === 50) return 'Pilot Vessel'
  if (shipType === 51) return 'SAR'
  if (shipType === 52) return 'Tug'
  if (shipType === 53) return 'Port Tender'
  if (shipType === 54) return 'Anti-pollution'
  if (shipType === 55) return 'Law Enforcement'
  if (shipType >= 58 && shipType <= 59) return 'Medical'
  if (shipType === 60) return 'Passenger'
  if (shipType >= 60 && shipType <= 69) return 'Passenger'
  if (shipType === 70) return 'Cargo'
  if (shipType >= 70 && shipType <= 79) return 'Cargo'
  if (shipType === 80) return 'Tanker'
  if (shipType >= 80 && shipType <= 89) return 'Tanker'
  if (shipType >= 90 && shipType <= 99) return 'Other'
  return 'Other'
}
