# Styling Standardization Design

**Date:** 2026-06-04  
**Branch:** refactor-styling-update  
**Scope:** Color token system, binder depth/shadows, component restyle, global white/black elimination

---

## 1. Color Token System

### Strategy: Option C (CSS variables + TypeScript constants)

The 4 binder tab colors currently exist as hardcoded hex strings in at least 3 places each: `BinderTabs.tsx`, and as `barColor` props in every page. This change centralizes them.

### `index.css` — `@theme` additions/changes

```css
/* Replace existing muted — current #6b6b88 fails WCAG AA on cyan-900 */
--color-muted: oklch(70.4% 0.04 257);

/* New tokens */
--color-off-white: oklch(97.1% 0.004 56);   /* stone-100, warm near-white */
--color-off-black: oklch(21% 0.034 265);    /* slate-900, cool near-black */
--color-tab-games:      #409cda;
--color-tab-cards:      #ee623f;
--color-tab-collection: #51e389;
--color-tab-settings:   #be4fe3;
```

`--color-text: #e8e8f0` stays as the primary body text color — it is already correct for dark UI surfaces.  
`--color-off-white` and `--color-off-black` are specifically for replacing raw `white`/`black` usages.

### `src/lib/tabs.ts` — new file

```ts
import {
  GameController,
  Cards,
  BookOpen,
  GearSix,
} from "@phosphor-icons/react"

export const TABS = [
  { label: "Games",      to: "/games",      color: "var(--color-tab-games)",      Icon: GameController },
  { label: "My Cards",   to: "/characters", color: "var(--color-tab-cards)",      Icon: Cards },
  { label: "Collection", to: "/matches",    color: "var(--color-tab-collection)", Icon: BookOpen },
  { label: "Settings",   to: "/settings",   color: "var(--color-tab-settings)",   Icon: GearSix },
] as const
```

`BinderTabs` replaces its local `tabs` array with an import from `TABS`.  
Each page (`GamesPage`, `CharactersPage`, `MatchesPage`, `SettingsPage`) replaces its hardcoded `barColor` hex with `TABS.find(t => t.label === "...")?.color`.

---

## 2. Binder Gradient + Shadows

Three depth layers applied to `BinderLayout.tsx`.

### Layer 1 — Outer lift shadow

Applied to the `<main>` element, replacing `bg-cyan-900` which moves into the gradient:

```css
box-shadow: 0 32px 64px -16px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.25);
```

### Layer 2 — Open-book background gradient

A `.binder-frame` utility class added to `index.css`:

```css
.binder-frame {
  background: linear-gradient(
    to right,
    oklch(30.2% 0.056 230),          /* cyan-950 — outer left edge */
    oklch(39.1% 0.09 241) 25%,       /* cyan-900 — left page body */
    oklch(25% 0.045 230) 50%,        /* darker than 950 — spine fold */
    oklch(39.1% 0.09 241) 75%,       /* cyan-900 — right page body */
    oklch(30.2% 0.056 230)           /* cyan-950 — outer right edge */
  );
}
```

Applied to `<main>` in `BinderLayout` alongside the box-shadow.

### Layer 3 — Page inner shadows

Left page div:
```
box-shadow: inset -12px 0 20px -8px rgba(0,0,0,0.4)
```
Right page div:
```
box-shadow: inset 12px 0 20px -8px rgba(0,0,0,0.4)
```

Both applied via inline `style` props in `BinderLayout`.

### Spine bar gradient

The colored spine bar (currently solid `backgroundColor: barColor`) gets a subtle gradient overlay so it doesn't read as flat:

```
background: linear-gradient(to bottom, rgba(0,0,0,0.15), transparent 30%, transparent 70%, rgba(0,0,0,0.15))
```

Implemented as a semi-transparent overlay `<div>` nested inside the spine bar, absolutely positioned, with `pointer-events-none` so it doesn't block clicks. The outer div keeps `style={{ backgroundColor: barColor }}`; the inner div carries the gradient. No pseudo-elements required.

### Binder tabs

Add `filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4))` to the tab strip section element so tabs appear proud of the binder edge.

---

## 3. Component Changes

### 3a. Tab icons — Phosphor Icons

**Install:** `@phosphor-icons/react`

**Icon mapping** (from `TABS` constant):
- Games → `GameController`
- My Cards → `Cards`
- Collection → `BookOpen`
- Settings → `GearSix`

**Three visual states:**

| State | Background | Icon color | Icon weight |
|-------|-----------|------------|-------------|
| Future (upcoming) | `tab.color` (solid) | `--color-off-black` | `regular` |
| Active (current page) | transparent | `tab.color` | `fill` |
| Passed (already visited) | transparent | `--color-muted` | `regular` |

**Layout:**
- Mobile: icon only (32×32), replaces "G" / "Car" / "Col" / "S" text abbreviations
- Desktop: icon (20×20) above vertical label text

### 3b. SettingsPage restyle

Replace all raw Tailwind color utilities with theme tokens:

| Current | Replacement |
|---------|-------------|
| `text-white` | `text-text` |
| `bg-gray-800` | `bg-surface` |
| `border-gray-600` | `border-border` |
| `text-gray-300` | `text-text` |
| `text-gray-400` | `text-muted` |
| `text-red-400` | `text-danger` |
| `text-green-400` | `text-success` |
| `bg-gray-700 hover:bg-gray-600` | Use `Button` component |
| `bg-white` (toggle thumb) | `bg-[--color-off-white]` |

### 3c. Mobile toggle button

Current: `bg-white rounded-b text-black` rectangle with `"<-"` / `"->"` text.

New:
- Background: `bg-[--color-off-black]`
- Icon: Phosphor `ArrowLeft` / `ArrowRight`, color `var(--color-off-white)`
- Same grid column (col-start-5), same height/width, `rounded-b` shape retained

### 3d. Section header bars

Current: `px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50` — plain flat divider.

Add a gradient background behind the border:
```
bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent
```

Applied in: `GamesPage`, `CharactersPage`, `MatchesPage` (all three places the header bar pattern appears). No prop threading required — the gradient works universally across all tab colors.

### 3e. BinderShell title

Current: `text-stone-700 bg-stone-300 px-4 py-1 rounded-md`

New: `text-[--color-off-black] bg-[--color-off-white] px-4 py-1 rounded-md`

---

## 4. Global White/Black Sweep

Remaining scattered `black` / `white` instances not covered above:

| File | Current | Replacement |
|------|---------|-------------|
| `NavBar.tsx:54` | `text-black` (logo link) | `text-[--color-off-black]` |
| `BinderLayout.tsx:32` | `border-black/20` (spine bar border) | `border-[--color-off-black]/20` |
| `GamesPage.tsx:79` | `border-black` (platform/rating row) | `border-[--color-off-black]` |
| `GamesPage.tsx:94` | `border-black` (description box) | `border-[--color-off-black]` |

`BinderTabs.tsx` hardcoded `color: "#000000"` is eliminated as part of the Section 3a icon work.

---

## Files Changed

| File | Change type |
|------|-------------|
| `apps/web/src/index.css` | Add `@theme` tokens, add `.binder-frame` class |
| `apps/web/src/lib/tabs.ts` | New file — tab constants |
| `apps/web/src/components/layout/BinderTabs.tsx` | Import TABS, Phosphor icons, new icon rendering |
| `apps/web/src/components/layout/BinderLayout.tsx` | Gradient class, inner shadows, restyled toggle button |
| `apps/web/src/components/layout/BinderShell.tsx` | Title color tokens |
| `apps/web/src/components/layout/NavBar.tsx` | Logo text color |
| `apps/web/src/pages/GamesPage.tsx` | barColor from TABS, border token, header gradient |
| `apps/web/src/pages/CharactersPage.tsx` | barColor from TABS, header gradient |
| `apps/web/src/pages/MatchesPage.tsx` | barColor from TABS, header gradient |
| `apps/web/src/pages/SettingsPage.tsx` | barColor from TABS, full theme restyle |
| `apps/web/package.json` | Add `@phosphor-icons/react` |

---

## Non-Goals

- No changes to card components (covered by `partyup-tcg-cards` skill separately)
- No changes to the landing page
- No dark/light mode toggle implementation (Settings toggle remains a placeholder)
- No changes to animation keyframes
