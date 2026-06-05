import type { ReactNode } from 'react'
import { BinderTabs } from './BinderTabs'

interface BinderLayoutProps {
  barColor: string
  barContent?: ReactNode
  leftContent: ReactNode
  rightContent: ReactNode
  activeTab: string
  activeSide?: 'left' | 'right'
  onToggleSide?: () => void
}

export function BinderLayout({
  barColor,
  barContent,
  leftContent,
  rightContent,
  activeTab,
  activeSide = 'right',
  onToggleSide,
}: BinderLayoutProps) {
  return (
    // Outer wrapper: ms-8 on mobile gives room for left-side toggle button
    <div className="relative flex flex-col md:w-full mx-4 md:mx-8 pt-2 pb-10 md:py-2 h-screen">
      {/* Binder frame */}
      <main className="grid grid-cols-1 md:grid-cols-2 grid-rows-1 bg-cyan-900 border-cyan-950/50 border-10 rounded-lg md:rounded-4xl w-full h-full relative relative z-20">
        {/* Left page — hidden on mobile when right is active */}
        <div className={`${activeSide === 'left' ? 'flex' : 'hidden md:flex'} flex-col md:flex-row md:border-r-8 border-cyan-950/50 h-full`}>
          {/* Spine bar */}
          <div
            className="min-w-50 flex md:flex-col items-center md:justify-end md:justify-start min-h-34 px-4 md:pt-12 shrink-0 md:h-full gap-4 md:rounded-l-3xl border-b-8 md:border-b-0 md:border-r-8 border-black/20"
            style={{ backgroundColor: barColor }}
          >
            {barContent}
          </div>
          {/* Left content area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            {leftContent}
          </div>
        </div>

        {/* Right page — hidden on mobile when left is active */}
        <div className={`${activeSide === 'right' ? 'flex' : 'hidden md:flex'} flex-col h-full overflow-y-auto md:overflow-hidden`}>
          {rightContent}
        </div>
      </main>

      {/* Desktop tab strip — unchanged */}
      <BinderTabs activeTab={activeTab} />

      {/* Mobile-only toggle button.
          Right side (activeSide=right): z-0 so BinderTabs (z-10) covers rows 1-4;
          the empty 5th grid slot is the visible/tappable gap.
          Left side (activeSide=left): z-10, protrudes left of the binder frame. */}
      {onToggleSide && (
        <div className={`pointer-events-none grid grid-cols-5 grid-rows-1 gap-1 md:hidden absolute bottom-2 left-0 right-0 w-full h-9 px-8 z-10`}>
          <button
            onClick={onToggleSide}
            aria-label="Toggle panel"
            className={`pointer-events-auto col-start-5 block w-full h-full bg-white rounded-b ${activeSide === 'right'
              ? ''
              : ''
              }`}
          >
            <span className='text-black' >
              {activeSide === 'right' ? "<-" : "->"}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
