import { NavLink } from "react-router-dom"

export type BinderTabDef = {
  label: string
  color: string
  active?: boolean
  to: string
}

interface BinderTabsProps {
  tabs: BinderTabDef[]
}

export function BinderTabs({ tabs }: BinderTabsProps) {
  return (
    <section className="flex rotate-90 origin-bottom-right absolute right-0 top-3/4 gap-12 z-10">
      {tabs.map(tab => (
        <NavLink
          key={tab.label}
          to={tab.to}
          className="w-32 rounded-t border-white border-b-2 py-1 text-xs font-mono text-white uppercase tracking-widest text-center"
          style={{ backgroundColor: tab.color }}
        >
          {tab.label}
        </NavLink>
      ))}
    </section>
  )
}

