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
    // Outer wrapper: sets position context for tabs WITHOUT overflow-hidden
    <div className="relative m-4 me-8 w-full" style={{ height: 'calc(100vh - 2rem)' }}>
      {/* Binder frame: overflow-hidden only applies here, not to the tab layer */}
      <main className="grid grid-cols-2 border-white border-2 w-full h-full relative overflow-hidden">
        {/* Left page */}
        <div className="flex border-r border-border h-full">
          {/* Spine bar */}
          <div
            className="min-w-48 flex flex-col items-center pt-16 shrink-0 h-full"
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
        <div className="flex flex-col h-full overflow-hidden">
          {rightContent}
        </div>
      </main>

      {/* Tabs sit outside the overflow-hidden main so rotation doesn't get clipped */}
      {tabs && tabs.length > 0 && <BinderTabs tabs={tabs} />}
    </div>
  )
}
