import { NavLink } from "react-router-dom"

const tabs = [
  { label: "Games", color: "#2851d8", to: "/games" },
  { label: "My Cards", color: "#be1717", to: "/characters" },
  { label: "Collection", color: "#1ac75c", to: "/matches" },
  { label: "Settings", color: "#b95c0c", to: "/settings" },
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
        right-1
        top-0
        origin-left
        translate-x-full
        gap-2
        md:gap-6
        h-full
        grid
        grid-cols-1
        grid-rows-5
        auto-rows-0
        w-8
        py-8
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
            className="flex justify-end rounded-r p-1 text-xs font-mono uppercase tracking-widest text-center transition-all border-black/50 border-1
          .5"
            style={{
              backgroundColor: isPassed || isActive
                ? "transparent"
                : tab.color,
              color: isActive
                ? "#facc15"
                : "#ffffff",
            }}
          >
            <span
              className=" text-xs font-mono uppercase tracking-widest text-nowrap pointer-events-none"
              style={{ writingMode: 'vertical-lr' }}
            >
              {tab.label}
            </span>
          </NavLink>
        )
      })}
    </section>
  )
}
