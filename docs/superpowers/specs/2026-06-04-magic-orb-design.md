# Magic Orb Design Spec
**Date:** 2026-06-04
**Branch:** to be created from `main` (feature/magic-orb)

## Overview

The landing page and home page each contain a plain white circle today. These are being replaced with a magical orb — the hero visual of the PartyUp app. Both orbs share the same visual identity (`MagicOrb` shell) and represent the same object in different states: a crystal ball on the landing page (foretelling the user's future with PartyUp) and a scrying orb on the home page (used to find games/realms).

The aesthetic is Nintendo-friendly — whimsical and approachable, welcoming to adults — not dark or gritty. Color palette: deep teal interior, cyan primary glow, warm orange accent.

---

## Architecture

**New files:**
```
apps/web/src/components/orb/
  MagicOrb.tsx      — visual shell only, no logic
  CrystalOrb.tsx    — landing page orb
  ScryingOrb.tsx    — home page orb (replaces OrbSearch)
```

**Modified files:**
```
apps/web/src/pages/LandingPage.tsx   — swap white circle for <CrystalOrb>
apps/web/src/pages/HomePage.tsx      — swap <OrbSearch> for <ScryingOrb>
apps/web/src/index.css               — new keyframes
```

`OrbSearch.tsx` is superseded by `ScryingOrb.tsx` but left in place; deletion is a follow-up task.

---

## `MagicOrb` — Visual Shell

Pure presentational component. Owns no state.

```ts
interface MagicOrbProps {
  className?: string   // controls width/height; consumers size it
  focused?: boolean    // when true, atmospheric icons + stars fade out (600ms)
  children?: ReactNode // rendered above all layers, centered
}
```

### Layers (bottom to top)

| Layer | Description |
|---|---|
| `orb-bg` | Deep teal radial gradient: `#091c2a` core → `#010608` edge |
| `orb-cyan-cloud` | Soft cyan radial bloom, upper-left, slow drift animation |
| `orb-orange-cloud` | Warm orange radial bloom, lower-right, counter-drift |
| Star particles | ~12 fixed divs, 1–3px, cyan/orange/white, each with independent `star-twinkle` timing |
| Atmospheric icons | 7 Phosphor icons: GameController, Shield, Crosshair, Star, Lightning, Crown, Sword — drift upward, fade in/out on 9–14s independent loops |
| `orb-highlight` | Large soft white ellipse, top-left, `blur(3px)` — glass lens flare |
| `orb-glint` | Tiny sharp white dot inside the highlight |
| `children` | Centered above all layers |

### Outer element
`rounded-full overflow-hidden` with a `box-shadow` breathing animation — soft cyan/orange glow, subtle (approx. 18px spread max). All background layers are `position: absolute; inset: 0`.

### `focused` behavior
When `focused={true}`: star particles and atmospheric icons transition to `opacity: 0` over 600ms via CSS transition. Clouds, highlight, and glow remain. `ScryingOrb` passes `focused={results.length > 0}`.

### Palette
| Token | Value | Use |
|---|---|---|
| Core | `#010608` | Orb interior deep |
| Cyan | `#00c8f0` | Primary glow, icon stroke |
| Cyan light | `#7ee8fa` | Star particles, highlights |
| Orange | `#f97316` | Secondary glow, warm accent |
| Orange light | `#fb923c` | Icon stroke, star particles |
| Glint | `rgba(255,255,255,0.9)` | Glass highlight |

### New keyframes (added to `index.css`)
- `orb-breathe` — glow box-shadow pulse, 5s
- `cloud-drift` / `cloud-drift-rev` — slow cloud translation, 7–8s alternate
- `star-twinkle` — opacity + scale, 1.6–3.2s (each particle has its own duration)
- `icon-drift` — opacity 0→fade in→drift upward→fade out, 9–14s (each icon has its own duration + delay)
- `vision-appear` — blur(4px)→blur(0) + opacity, 0.8s (CrystalOrb step reveal)
- `planet-bob` — translateY ±4px, 3–5s ease-in-out infinite (game planets)
- `planet-appear` — scale(0.6)+opacity(0) → scale(1)+opacity(1), 0.4s, staggered per planet

---

## `CrystalOrb` — Landing Page

Wraps `MagicOrb`. Always `focused={false}`. Manages the existing 5-step carousel state (step index, pause, auto-advance at 5s).

### Sizing
Largest circle that fits the binder content area. `w-full` with an `aspect-ratio: 1` and `max-h-full` constraint so it stays circular on all screen sizes.

### Step content (children passed to MagicOrb)
Rendered centered inside the orb. Changes from the current implementation:

- **Step icon**: replace "N / 5" numeric label with a small Phosphor icon per step:
  - Step 1 — MagnifyingGlass
  - Step 2 — UserCircle
  - Step 3 — At (handle/identity)
  - Step 4 — Cards (swipe)
  - Step 5 — HandWaving (match)
  - Icon is cyan, 24px, centered above the title
- **Step reveal animation**: swap `fadeIn` for `vision-appear` — content fades in while a subtle blur clears, as if a vision is materializing
- **Progress ring**: stroke color changed from green (`#0e6e43`) to cyan (`#00c8f0`) with a CSS `filter: drop-shadow(0 0 4px #00c8f0)` for a glowing effect
- **Title and body**: unchanged content, unchanged font styles
- **Controls**: prev/next/pause remain; styled as faint cyan glyphs (same opacity/hover logic as today)

---

## `ScryingOrb` — Home Page

Wraps `MagicOrb`. Manages search state: `idle | loading | results | empty`.

### Sizing
Same rule as `CrystalOrb` — largest circle that fits the binder content area.

### States

#### Idle
`MagicOrb focused={false}`. Atmospheric icons and stars drift.

Children:
- Search input centered in upper-center of orb — transparent background, underline border only, monospace font, placeholder "Search realms…", cyan caret
- "List view" link-style button at bottom edge (small, faint)

#### Loading
`MagicOrb focused={false}`. Atmospheric icons remain.

Children:
- A slow cyan pulse animation radiates from center (single expanding ring, opacity fade)
- Search input hidden
- "List view" button hidden (no results to list yet)

#### Results
`MagicOrb focused={true}`. Stars and atmospheric icons fade out over 600ms.

Children, top to bottom:
- **Query bar**: small monospace query string + `×` button, floats at top-center of orb, ~16px from top
- **Scroll container**: `overflow-y: auto; overflow-x: hidden; height: calc(100% - 40px)` — scrolls within the circular clip
  - 2-column centered grid of game planets
  - Each planet:
    - 80px circular game image (`object-fit: cover`, `border-radius: 50%`)
    - Dark drop shadow (`box-shadow: 0 4px 16px rgba(0,0,0,0.7)`)
    - Game name arcs around the bottom of the circle using SVG `<textPath>` on a circular path — light fill (`#e8e8f0`), `font-size` ~9px, centered on the arc
    - `planet-bob` animation with independent duration (3–5s) and deterministic delay (`index × 300ms`, max 2.1s)
    - `planet-appear` on mount, staggered by index (50ms per planet)
    - Click → existing add-game confirmation modal (unchanged)
  - Soft bottom-edge fade: `::after` pseudo-element on scroll container, `background: linear-gradient(transparent, rgba(1,6,8,0.9))`, `position: sticky; bottom: 0`
- **"List view" button**: last item in scroll content, always reachable after scrolling

#### Empty
`MagicOrb focused={false}`. Atmospheric icons stay on.

Children:
- Faint "Nothing found" text at center, `vision-appear` animation
- `×` button at top to clear and return to idle
- "List view" button hidden (no results to list)

### List view modal (accessibility)
A plain `Modal` (existing component) opened by the "List view" button. Contains:
- Simple list of game results: game image (32px square), game name, "Add" button per row
- Same `confirmAdd` logic as today
- Title: "Search Results"
- No animation inside the modal

---

## Unchanged
- Add-game confirmation modal (shown on planet click) — no changes in this spec
- `OrbSearch.tsx` — left in place, not deleted
- All other pages and components

---

## Out of Scope (follow-up)
- Redesign of the add-game confirmation modal
- Delete `OrbSearch.tsx`
- Game planet icons sourcing from user's actual added games (future: idle ScryingOrb could show the user's own realms as planets)
