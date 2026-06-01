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
    <div className="relative m-4 ms-8 me-8 w-full" style={{ height: 'calc(100vh - 2rem)' }}>
      {/* Binder frame */}
      <main className="grid grid-cols-1 md:grid-cols-2 grid-rows-1 border-white border-2 w-full h-full relative">
        {/* Left page — hidden on mobile when right is active */}
        <div className={`${activeSide === 'left' ? 'flex' : 'hidden md:flex'} flex-col md:flex-row border-r border-border h-full`}>
          {/* Spine bar */}
          <div
            className="min-w-48 flex md:flex-col items-center justify-end md:justify-start min-h-34 px-4 md:pt-12 shrink-0 md:h-full gap-4"
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
        <div className={`${activeSide === 'right' ? 'flex' : 'hidden md:flex'} flex-col h-full overflow-y-auto`}>
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
        <div className={`pointer-events-none grid grid-cols-1 grid-rows-5 gap-2 md:hidden absolute top-0 w-6 h-full ${activeSide === 'right'
          ? 'right-0 translate-x-full z-20 rounded-r'
          : 'left-0 -translate-x-full z-10 rounded-l'
          }`}>
          <button
            onClick={onToggleSide}
            aria-label="Toggle panel"
            className={`pointer-events-auto row-start-5 block w-full h-full bg-white
              ${activeSide === 'right'
                ? 'rounded-r'
                : 'rounded-l'
              }`}
          />
        </div>
      )}
    </div>
  )
}
