import type { ReactNode } from 'react'
import { BinderTabs, type BinderTabDef } from './BinderTabs'

interface BinderLayoutProps {
  barColor: string
  barContent?: ReactNode
  leftContent: ReactNode
  rightContent: ReactNode
  tabs?: BinderTabDef[]
}

export function BinderLayout({ barColor, barContent, leftContent, rightContent, tabs }: BinderLayoutProps) {
  return (
    <main className="grid grid-cols-2 border-white border-2 m-4 me-8 w-full relative overflow-y-hidden" style={{ height: 'calc(100vh - 2rem)' }}>
      {/* Left page */}
      <div className="flex border-r border-border min-h-0">
        {/* Spine bar */}
        <div
          className="min-w-48 flex flex-col items-center pt-16 shrink-0"
          style={{ backgroundColor: barColor }}
        >
          {barContent}
        </div>
        {/* Left content area */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {leftContent}
        </div>
      </div>

      {/* Right page */}
      <div className="flex flex-col min-h-0 overflow-hidden">
        {rightContent}
      </div>

      {tabs && tabs.length > 0 && <BinderTabs tabs={tabs} />}
    </main>
  )
}
