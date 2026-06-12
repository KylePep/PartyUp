import type { Icon } from "@phosphor-icons/react"
import { GameController, Cards, BookOpen, GearSix } from "@phosphor-icons/react"

export type Tab = {
  label: string
  to: string
  color: string
  Icon: Icon
}

export const TABS: Tab[] = [
  { label: "Realms",      to: "/games",      color: "var(--color-tab-games)",      Icon: GameController },
  { label: "Characters",   to: "/characters", color: "var(--color-tab-cards)",      Icon: Cards },
  { label: "Collection", to: "/matches",    color: "var(--color-tab-collection)", Icon: BookOpen },
  { label: "Settings",   to: "/settings",   color: "var(--color-tab-settings)",   Icon: GearSix },
]
