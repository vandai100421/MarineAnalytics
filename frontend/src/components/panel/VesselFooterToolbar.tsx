import { memo, useState } from 'react'
import { useMapStore } from '../../store/mapStore'
import { useVessel } from '../../api/vessels'
import { useT } from '../../i18n/useI18n'

interface VesselFooterToolbarProps {
  mmsi: number
}

function VesselFooterToolbarComponent({ mmsi }: VesselFooterToolbarProps) {
  const setSelectedMmsi = useMapStore((s) => s.setSelectedMmsi)
  const setRightActiveTab = useMapStore((s) => s.setRightActiveTab)
  const { data: vessel } = useVessel(mmsi)
  const t = useT()
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const handleShare = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('mmsi', String(mmsi))
    try {
      await navigator.clipboard.writeText(url.toString())
      showToast(t('vessel.linkCopied'))
    } catch {
      window.prompt('Copy link:', url.toString())
    }
  }

  const handleCenter = () => {
    const event = new CustomEvent('centerOnVessel', { detail: { mmsi } })
    window.dispatchEvent(event)
  }

  const handleScreenshot = () => {
    const event = new CustomEvent('captureScreenshot', { detail: { mmsi } })
    window.dispatchEvent(event)
  }

  const handleAddToFleet = () => {
    setSelectedMmsi(mmsi)
    setRightActiveTab('fleet')
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-ocean-700/40 bg-ocean-950/95 px-2 py-2 backdrop-blur">
      <div className="flex items-center justify-around gap-1">
        <ToolbarButton
          onClick={handleCenter}
          label={t('vessel.centerOnVessel')}
          icon="M12 8v8M8 12h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <ToolbarButton
          onClick={handleShare}
          label={t('vessel.shareLink')}
          icon="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
        />
        <ToolbarButton
          onClick={handleScreenshot}
          label={t('vessel.screenshot')}
          icon="M3 7h4l2-3h6l2 3h4v12H3V7zM9 13a3 3 0 106 0 3 3 0 000-6z"
        />
        <ToolbarButton
          onClick={handleAddToFleet}
          label={t('vessel.addToFleet')}
          icon="M12 5v14M5 12h14"
        />
      </div>
      {toast && (
        <div className="mt-1.5 rounded-md bg-green-500/15 px-2 py-1 text-center text-[10px] font-medium text-green-300">
          {toast}
        </div>
      )}
      {!vessel?.name && (
        <p className="mt-1 text-center text-[9px] text-ocean-500">MMSI {mmsi}</p>
      )}
    </div>
  )
}

function ToolbarButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void
  label: string
  icon: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="group flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-ocean-400 transition-all hover:bg-ocean-800/60 hover:text-white"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[8px] font-medium uppercase tracking-wide">{label.split(' ')[0]}</span>
    </button>
  )
}

export const VesselFooterToolbar = memo(VesselFooterToolbarComponent)
