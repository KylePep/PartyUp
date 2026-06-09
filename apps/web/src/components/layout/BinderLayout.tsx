import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react"
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
    <div className="relative flex flex-col md:w-full mx-4 md:mx-9 pt-2 pb-10 md:py-2 h-screen">
      {/* Binder frame */}
      <main
        className="binder-frame grid grid-cols-1 md:grid-cols-2 grid-rows-1 border-cyan-950/50 border-10 rounded-lg md:rounded-4xl w-full h-full relative z-20"
      >
        {/* Left page — hidden on mobile when right is active */}
        <div
          className={`${activeSide === 'left' ? 'flex' : 'hidden md:flex'} flex-col md:flex-row md:border-r-8 border-cyan-950/50 h-full`}
          style={{ boxShadow: 'inset -12px 0 20px -8px rgba(0,0,0,0.1)' }}
        >
          {/* Spine bar */}
          <div
            className="relative min-w-50 flex md:flex-col items-center md:justify-end md:justify-start min-h-34 px-4 md:pt-18 shrink-0 md:h-full gap-4 md:rounded-l-3xl border-b-8 md:border-b-0 md:border-r-8 border-slate-900/20 shadow"
            style={{ backgroundColor: barColor }}
          >
            <div
              className="absolute inset-0 pointer-events-none md:rounded-l-3xl"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent 30%, transparent 70%, rgba(0,0,0,0.15))' }}
            />
            {barContent}
          </div>
          {/* Left content area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            {leftContent}
          </div>
        </div>

        {/* Right page — hidden on mobile when left is active */}
        <div
          className={`${activeSide === 'right' ? 'flex' : 'hidden md:flex'} flex-col h-full overflow-y-auto md:overflow-hidden`}
          style={{ boxShadow: 'inset 12px 0 20px -8px rgba(0,0,0,0.1)' }}
        >
          {rightContent}
        </div>
      </main>

      <BinderTabs activeTab={activeTab} />

      {/* Mobile-only toggle button */}
      {onToggleSide && (
        <div className="pointer-events-none grid grid-cols-5 grid-rows-1 gap-1 md:hidden absolute bottom-2 left-0 right-0 w-full h-9 px-8 z-10">
          <button
            onClick={onToggleSide}
            aria-label="Toggle panel"
            className="pointer-events-auto col-start-5 flex items-center justify-center w-full h-full bg-off-white rounded-b"
          >
            {activeSide === 'right'
              ? <ArrowLeft size={16} color="var(--color-off-black)" />
              : <ArrowRight size={16} color="var(--color-off-black)" />
            }
          </button>
        </div>
      )}
    </div>
  )
}
