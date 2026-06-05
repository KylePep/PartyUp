import { NavLink } from "react-router-dom"

const tabs = [
  { label: "Games", color: "#409cda", to: "/games", icon: "G" },
  { label: "My Cards", color: "#ee623f", to: "/characters", icon: "Car" },
  { label: "Collection", color: "#51e389", to: "/matches", icon: "Col" },
  { label: "Settings", color: "#be4fe3", to: "/settings", icon: "S" },
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
      {tabs.map((tab, index) => {
        const isPassed = index < activeIndex
        const isActive = index === activeIndex

        return (
          <NavLink
            key={tab.label}
            to={tab.to}
            className="flex justify-center md:justify-end items-center rounded-b md:rounded-r p-1 text-xs font-mono uppercase tracking-widest text-center transition-all"
            style={{
              backgroundColor: isPassed || isActive
                ? "transparent"
                : tab.color,
              color: isActive
                ? "#144b68"
                : "#000000",
            }}
          >
            <span
              className=" text-xs font-mono uppercase tracking-widest text-nowrap pointer-events-none md:[writing-mode:vertical-rl]"
            >
              <span className="hidden md:block">
                {tab.label}
              </span>
              <span className="md:hidden">
                {tab.icon}
              </span>
            </span>
          </NavLink>
        )
      })}
    </section>
  )
}
