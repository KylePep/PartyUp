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
        [filter:drop-shadow(2px_2px_3px_rgba(0,0,0,0.45))]
        absolute
        left-0
        md:left-auto
        md:right-0
        bottom-2
        md:bottom-auto
        md:top-0
        origin-left
        md:translate-x-full
        gap-1
        md:gap-2
        h-12
        md:h-full
        w-full
        md:w-9
        grid
        grid-cols-5
        md:grid-cols-1
        grid-rows-1
        md:grid-rows-4
        auto-rows-0
        px-8
        md:px-0
        md:pe-1.5
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
            className="flex md:flex-col gap-2 justify-center md:justify-start pt-1 items-center rounded-b md:rounded-none md:rounded-r transition-all overflow-hidden"
            style={
              bgColor != "transparent"
                ? {
                  background: `
                    linear-gradient(
                      0deg,
                      rgba(34, 120, 195, 0.35) 10%,
                      rgba(182, 189, 94, 0.1) 35%,
                      rgba(205, 228, 233, 0.15) 80%
                    ),
                    ${bgColor}
                  `
                }
                : {}
            }
          >
            <tab.Icon size={20} weight={iconWeight} color={iconColor} />
            <span className="font-display text-xs uppercase font-black hidden md:block whitespace-nowrap [@media(max-height:600px)]:!hidden"
              style={{ writingMode: 'vertical-lr', color: iconColor }}
            >{tab.label}</span>
          </NavLink>
        )
      })}
    </section>
  )
}
