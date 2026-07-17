import { memo, type ReactNode } from 'react'

interface SectionProps {
  title: string
  icon?: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
  accentColor?: string
}

function SectionComponent({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  accentColor = 'text-sea-300',
}: SectionProps) {
  return (
    <div className="border-b border-ocean-700/40">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-ocean-800/30"
      >
        {icon && (
          <svg
            className={`h-4 w-4 ${accentColor}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-ocean-200">
          {title}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-ocean-500 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div className="animate-fade-in px-4 pb-4">{children}</div>
      )}
    </div>
  )
}

export const Section = memo(SectionComponent)
