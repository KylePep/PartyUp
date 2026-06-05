import { NavLink } from "react-router-dom"
import { TABS } from "../../lib/tabs"

interface BinderTabsProps {
  activeTab: string
}

export function BinderTabs({ activeTab }: BinderTabsProps) {
  const activeIndex = TABS.findIndex(tab => tab.label === activeTab)

  return (
    <section
      className="
        [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.45))]
        absolute
        left-0
        md:left-auto
        md:right-1
        bottom-2
        md:bottom-auto
        md:top-0
        origin-left
        md:translate-x-full
        gap-1
        md:gap-6
        h-8
        md:h-full
        w-full
        md:w-8
        grid
        grid-cols-5
        md:grid-cols-1
        grid-rows-1
        md:grid-rows-5
        auto-rows-0
        px-8
        md:px-0
        md:py-8
        z-10
      "
    >
      {TABS.map((tab, index) => {
        const isPassed = index < activeIndex
        const isActive = index === activeIndex

        const bgColor = isPassed || isActive ? "transparent" : tab.color
        const iconColor = isActive
          ? tab.color
          : isPassed
          ? "var(--color-muted)"
          : "var(--color-off-black)"
        const iconWeight = isActive ? "fill" : "regular"

        return (
          <NavLink
            key={tab.label}
            to={tab.to}
            aria-label={tab.label}
            className="flex justify-center items-center rounded-b md:rounded-r p-1 transition-all"
            style={{ backgroundColor: bgColor }}
          >
            <tab.Icon size={20} weight={iconWeight} color={iconColor} />
          </NavLink>
        )
      })}
    </section>
  )
}
