import { memo, lazy, Suspense } from 'react'
import { useMapStore } from '../../store/mapStore'
import { useT } from '../../i18n/useI18n'
import { Section } from './Section'
import { VesselPhoto } from '../panel/VesselPhoto'
import { VesselInfo } from '../panel/VesselInfo'
import { VoyageSection } from '../panel/VoyageSection'
import { PortInfo } from '../panel/PortInfo'
import { AircraftInfo } from '../panel/AircraftInfo'
import { SpeedProfile } from '../panel/SpeedProfile'
import { CourseProfile } from '../panel/CourseProfile'
import { DistanceProfile } from '../panel/DistanceProfile'
import { useAircraftPositions } from '../../api/aircraft'
import { useVesselTrack } from '../../api/vessels'
import { VesselHeader } from '../panel/VesselHeader'
import { TrackTools } from '../panel/TrackTools'
import { VesselFooterToolbar } from '../panel/VesselFooterToolbar'
import { PortCallsSection } from '../panel/PortCallsSection'
import { VesselEventsSection } from '../panel/VesselEventsSection'
import { VoyageStats } from '../panel/VoyageStats'

const TimelineScrubber = lazy(() =>
  import('../playback/TimelineScrubber').then((m) => ({ default: m.TimelineScrubber })),
)

function RightPanelComponent() {
  const selectedMmsi = useMapStore((s) => s.selectedMmsi)
  const selectedHex = useMapStore((s) => s.selectedHex)
  const selectedPortId = useMapStore((s) => s.selectedPortId)
  const bbox = useMapStore((s) => s.bbox)
  const sections = useMapStore((s) => s.rightPanelSections)
  const toggleSection = useMapStore((s) => s.toggleSection)
  const setPlaybackIndex = useMapStore((s) => s.setPlaybackIndex)
  const trackFrom = useMapStore((s) => s.trackFrom)
  const trackTo = useMapStore((s) => s.trackTo)
  const { data: trackData } = useVesselTrack(selectedMmsi, trackFrom ?? undefined, trackTo ?? undefined)
  const { data: aircraftData } = useAircraftPositions(bbox)
  const t = useT()

  if (selectedMmsi === null && selectedHex === null && selectedPortId === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ocean-800/50">
          <svg className="h-8 w-8 text-ocean-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6l9-3 9 3v15l-9-3-9 3V6z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-ocean-300">{t('panel.noVesselSelected')}</p>
        <p className="mt-1 text-xs text-ocean-500">{t('panel.clickToView')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {selectedPortId !== null && (
        <PortInfo portId={selectedPortId} />
      )}

      {selectedMmsi !== null && (
        <>
          <VesselHeader mmsi={selectedMmsi} />

          <VesselPhoto mmsi={selectedMmsi} />

          <Section
            title={t('section.realtimePosition')}
            icon="M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2"
            isOpen={sections.position}
            onToggle={() => toggleSection('position')}
            accentColor="text-green-400"
          >
            <VesselInfo mmsi={selectedMmsi} section="position" />
          </Section>

          <Section
            title={t('section.particulars')}
            icon="M9 12l2 2 4-4 M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            isOpen={sections.particulars}
            onToggle={() => toggleSection('particulars')}
            accentColor="text-sea-300"
          >
            <VesselInfo mmsi={selectedMmsi} section="particulars" />
          </Section>

          <Section
            title={t('section.voyageEta')}
            icon="M3 17l6-6 4 4 8-8 M14 7h7v7"
            isOpen={sections.voyage}
            onToggle={() => toggleSection('voyage')}
            accentColor="text-amber-400"
          >
            <div className="space-y-3">
              <VoyageSection mmsi={selectedMmsi} />
              <VoyageStats mmsi={selectedMmsi} />
            </div>
          </Section>

          <Section
            title={t('section.trackHistory')}
            icon="M3 12h4l3-8 4 16 3-8h4"
            isOpen={sections.track}
            onToggle={() => toggleSection('track')}
            accentColor="text-purple-300"
          >
            <div className="space-y-3">
              <TrackTools mmsi={selectedMmsi} />
              {trackData && trackData.points.length > 0 ? (
                <>
                  <p className="text-xs text-ocean-400">
                    {trackData.total} {t('vessel.positionReports')}
                  </p>
                  <Suspense fallback={<div className="text-center text-xs text-ocean-400">{t('panel.loading')}</div>}>
                    <TimelineScrubber
                      key={selectedMmsi}
                      total={trackData.points.length}
                      onIndexChange={setPlaybackIndex}
                    />
                  </Suspense>
                  <ProfileBlock label={t('section.speedProfile')}>
                    <SpeedProfile mmsi={selectedMmsi} />
                  </ProfileBlock>
                  <ProfileBlock label={t('section.courseProfile')}>
                    <CourseProfile mmsi={selectedMmsi} />
                  </ProfileBlock>
                  <ProfileBlock label={t('section.distanceProfile')}>
                    <DistanceProfile mmsi={selectedMmsi} />
                  </ProfileBlock>
                </>
              ) : (
                <p className="text-xs text-ocean-500">{t('vessel.noTrack')}</p>
              )}
            </div>
          </Section>

          <Section
            title={t('section.portCalls')}
            icon="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z M12 7a2 2 0 100 4 2 2 0 000-4z"
            isOpen={sections.portCalls}
            onToggle={() => toggleSection('portCalls')}
            accentColor="text-amber-300"
          >
            <PortCallsSection mmsi={selectedMmsi} />
          </Section>

          <Section
            title={t('section.eventsAnomalies')}
            icon="M12 2a10 10 0 100 20 10 10 0 000-20z M12 8v4 M12 16h.01"
            isOpen={sections.events}
            onToggle={() => toggleSection('events')}
            accentColor="text-red-300"
          >
            <VesselEventsSection mmsi={selectedMmsi} />
          </Section>
        </>
      )}

      {selectedHex !== null && (
        <div className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ocean-400">
            {t('layer.aircraft')}
          </h3>
          <AircraftInfo hex={selectedHex} positions={aircraftData} />
        </div>
      )}

      {selectedMmsi !== null && <VesselFooterToolbar mmsi={selectedMmsi} />}
    </div>
  )
}

function ProfileBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-ocean-700/40 bg-ocean-900/40 p-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ocean-400">
        {label}
      </p>
      {children}
    </div>
  )
}

export const RightPanel = memo(RightPanelComponent)
