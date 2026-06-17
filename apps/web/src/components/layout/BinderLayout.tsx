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
    <div className="relative flex flex-col md:w-full mx-4 md:mx-9 pb-14 md:pb-4 py-4 h-screen">
      {/* Binder frame */}
      <main
        className="binder-frame grid grid-cols-1 md:grid-cols-2 grid-rows-1 border-black/20 border-10 rounded w-full h-full relative z-20"
      >
        {/* Left page — hidden on mobile when right is active */}
        <div
          className={`${activeSide === 'left' ? 'flex' : 'hidden md:flex'} flex-col md:flex-row md:border-r-8 border-black/20 h-full`}
          style={{ boxShadow: 'inset -12px 0 20px -8px rgba(0,0,0,0.1)' }}
        >
          {/* Spine bar */}
          <div
            className="relative min-w-50  min-h-34  shrink-0 md:h-full p-1 rounded-t-sm md:rounded-t-none  md:rounded-l shadow ring-2 ring-black/25 ring-inset"
            style={{
              backgroundColor: barColor

            }}
          >
            <div className='w-full h-full px-4 py-1 md:pt-18 flex md:flex-col items-center md:justify-end md:justify-start gap-4'
              style={{
                border: '1px dashed rgba(25, 24, 24, 0.5)',
                borderRadius: '2px',
              }}
            >

              <div
                className="absolute inset-0 pointer-events-none rounded-t-sm md:rounded-t-none md:rounded-l"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 30%, transparent 70%, rgba(0,0,0,0.25))' }}
              />
              {barContent}
            </div>
          </div>

          {/* Left content area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto md:overflow-hidden ring-2 ring-black/25 ring-inset md:border-l-4 border-black/20">
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

      {/* Corner caps */}
      <span className="absolute rounded top-3 md:top-3 -left-1 md:-left-1 w-10 md:w-20 h-10 md:h-20 border-t-10 md:border-t-20 border-l-10 md:border-l-20 border-amber-600 pointer-events-none" />
      <span className="absolute rounded top-3 md:top-3 -right-1 md:-right-1 w-10 md:w-20 h-10 md:h-20 border-t-10 md:border-t-20 border-r-10 md:border-r-20 border-amber-600 pointer-events-none" />
      <span className="absolute rounded bottom-13 md:bottom-3 -left-1 md:-left-1 w-10 md:w-20 h-10 md:h-20 border-b-10 md:border-b-20 border-l-10 md:border-l-20 border-amber-600 pointer-events-none" />
      <span className="absolute rounded bottom-13 md:bottom-3 -right-1 md:-right-1 w-10 md:w-20 h-10 md:h-20 border-b-10 md:border-b-20 border-r-10 md:border-r-20 border-amber-600 pointer-events-none" />

      {/* Mobile-only toggle button */}
      {onToggleSide && (
        <div className="pointer-events-none grid grid-cols-5 grid-rows-1 gap-1 md:hidden absolute bottom-2 left-0 right-0 w-full h-12 px-8 z-10">
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
