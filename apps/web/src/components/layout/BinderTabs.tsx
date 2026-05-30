import { NavLink } from "react-router-dom"

const tabs = [
  { label: "My Cards", color: "#991b1b", to: "/characters" },
  { label: "Games", color: "#1e40af", to: "/games" },
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
        top-1/2
        translate-x-1/2
        -translate-y-1/2
        origin-bottom
        rotate-90
        flex
        gap-12
        z-10
      "
    >
      {tabs.map((tab, index) => {
        const isPassed = index < activeIndex
        const isActive = index === activeIndex

        return (
          <NavLink
            key={tab.label}
            to={tab.to}
            className="w-32 rounded-t py-1 text-xs font-mono uppercase tracking-widest text-center transition-all"
            style={{
              backgroundColor: isPassed || isActive
                ? "transparent"
                : tab.color,

              color: isActive
                ? "#facc15"
                : "#ffffff",
            }}
          >
            {tab.label}
          </NavLink>
        )
      })}
    </section>
  )
}