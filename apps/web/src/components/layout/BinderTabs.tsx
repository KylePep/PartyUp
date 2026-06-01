import { NavLink } from "react-router-dom"

const tabs = [
  { label: "Games", color: "#1e40af", to: "/games" },
  { label: "My Cards", color: "#991b1b", to: "/characters" },
  { label: "Collection", color: "#166534", to: "/matches" },
  { label: "Settings", color: "#dcba31", to: "/settings" },
] as const

interface BinderTabsProps {
  activeTab: string
}

export function BinderTabs({ activeTab }: BinderTabsProps) {
  const activeIndex = tabs.findIndex(
    tab => tab.label === activeTab
  )

  return (
    <section
      className="
        absolute
        right-0
        top-0
        origin-left
        translate-x-full
        gap-2
        md:gap-6
        z-10
        h-full
        grid
        grid-cols-1
        grid-rows-5
        auto-rows-0
        w-6
      "
    >
      {tabs.map((tab, index) => {
        const isPassed = index < activeIndex
        const isActive = index === activeIndex

        return (
          <NavLink
            key={tab.label}
            to={tab.to}
            className="flex rounded-r py-1 text-xs font-mono uppercase tracking-widest text-center transition-all"
            style={{
              backgroundColor: isPassed || isActive
                ? "transparent"
                : tab.color,
              color: isActive
                ? "#facc15"
                : "#ffffff",
            }}
          >
            <span className="md:flex flex-col w-full leading-0 rotate-90 -translate-y-1/4 -translate-x-14 md:translate-x-0 text-center justify-center text-nowrap">
              {tab.label}
            </span>
          </NavLink>
        )
      })}
    </section>
  )
}
