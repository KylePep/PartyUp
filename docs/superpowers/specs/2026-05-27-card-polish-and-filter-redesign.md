# Card Polish & Filter Redesign — Design Spec

**Date:** 2026-05-27  
**Follows:** `2026-05-27-character-card-redesign-design.md`

---

## Overview

Unify all character-displaying cards to a single portrait TCG format with identical fixed section heights, so images crop identically everywhere. Move discovery filters into a dropdown (desktop) / bottom-sheet modal (mobile) that overlays content instead of pushing it down. Default platform filter to all platforms. On mobile, the filters button moves above the character panel.

---

## Card Dimensions — Unified Standard

All three cards (SwipeCard, CharacterCard, MatchCard) share these **fixed pixel heights** for every section:

| Section | Height | Notes |
|---|---|---|
| Top bar | 52px | `h-[52px]`, `flex-shrink-0` |
| Art box | 300px | `h-[300px]`, `flex-shrink-0`, `object-cover` |
| Bottom panel | 120px | `h-[120px]`, `flex-shrink-0`, `overflow-hidden` |
| **Card total** | **472px** | SwipeCard adds Like/Pass buttons (48px) outside the card for 520px total |

The Like/Pass buttons for SwipeCard remain **outside** the card div, rendered below it in the `absolute inset-0` container — they are not part of the 472px card height.

### More Card-Like Appearance

- Top bar: `background: var(--color-surface-raised)`, `border-bottom: 1px solid var(--color-border)` — visually distinct nameplate section
- Art box: sits between two solid-color sections; `border-top` and `border-bottom` on the art box div (not the card) for crisp band separation; no outer margin (`mx-0`, full card width)
- Card border: `3px` solid (up from 2px), glow slightly more prominent
- Result: three distinct horizontal bands — nameplate / art / info — matching the visual grammar of a TCG card

### CharacterCard bottom panel content (120px)

- Main role badge + rank badge (top row)
- Bio truncated to 2 lines (`line-clamp-2`)
- Edit/Delete buttons at bottom (when `onEdit`/`onDelete` provided), using `e.stopPropagation()`

### SwipeCard bottom panel content (120px, front face)

- Main role, secondary role, rank, region, playstyle badges
- Bio `line-clamp-2`
- "↑ tap for more" hint at bottom edge

### MatchCard bottom panel content (120px, front face)

- Main role, secondary role, rank, region, playstyle badges  
- Bio `line-clamp-2`
- Game name + match date at bottom edge, "↑ tap for more" hint

### MatchCard top bar (52px)

- Platform handle (primary, bold, full row)
- Character name (secondary, smaller, below handle, `line-clamp-1`)

---

## Discovery Filters Redesign

### State Lift

Filter state (`filters`, `activePlatforms`) moves from `DiscoveryPanel` up to `RealmPage`. `RealmPage` passes filter state and callbacks down to both the filter button/panel and `DiscoveryPanel`.

`DiscoveryPanel` props change:
- Remove: internal filter state, `DiscoveryFilters` rendering
- Add: `filters: Record<string, string>`, `activePlatforms: string[]`

### Platform Default Change

`activePlatforms` initializes as `[]` (empty array = no filter = all platforms). The RAWG platform list is no longer used to pre-seed active platforms. Platform buttons in the filter panel still display the game's RAWG platforms for quick selection, but none start checked.

### Filter Trigger Button

A `<FilterButton>` component (new, in `components/`) renders a compact button:
- Label: "Filters" when no filters active; "Filters · N" when filters are applied, where N = `Object.keys(filters).length + (activePlatforms.length > 0 ? 1 : 0)`
- Active state: accent-colored border when N > 0
- Clicking toggles `filtersOpen` boolean state

### Desktop Dropdown (≥ `lg`)

- The filter panel renders as `position: absolute; z-index: 50` below the Filters button, inside a `position: relative` wrapper
- Width: matches the DiscoveryPanel column width
- Clicking outside the panel (click-away listener via `useEffect` + `ref`) closes it
- Pressing Escape closes it
- The card stack below is NOT displaced — the dropdown overlays it

### Mobile Bottom Sheet (< `lg`)

- The filter panel renders as a fixed bottom sheet: `position: fixed; bottom: 0; left: 0; right: 0; z-index: 50`
- A semi-transparent backdrop (`position: fixed; inset: 0`) sits behind it; clicking the backdrop closes the sheet
- The sheet slides up via CSS transition (`translateY`)
- Max height: 70vh with internal scroll if content overflows

### Mobile Layout — Filters Button Position

On mobile, the Filters button is rendered **above `CharacterPanel`** in `RealmPage`, not inside `DiscoveryPanel`. On desktop, the Filters button is rendered inside `DiscoveryPanel` above the card stack.

RealmPage discover tab structure (mobile):
```
[Filters button]        ← rendered by RealmPage, only visible on mobile (lg:hidden)
[CharacterPanel]
[DiscoveryPanel]        ← card stack only, no filter button
```

RealmPage discover tab structure (desktop):
```
[CharacterPanel] | [Filters button + card stack]   ← filter button rendered inside DiscoveryPanel, hidden on mobile (hidden lg:block)
```

This is achieved by rendering the `FilterButton` twice — once in `RealmPage` with `lg:hidden`, and once inside `DiscoveryPanel` with `hidden lg:block`. Both reference the same lifted state from `RealmPage`.

---

## Files Changed

| Action | Path |
|---|---|
| Modify | `apps/web/src/components/cards/SwipeCard.tsx` |
| Modify | `apps/web/src/components/cards/CharacterCard.tsx` |
| Modify | `apps/web/src/components/cards/MatchCard.tsx` |
| Modify | `apps/web/src/components/DiscoveryPanel.tsx` |
| Modify | `apps/web/src/pages/RealmPage.tsx` |
| Create | `apps/web/src/components/FilterButton.tsx` |
| Modify | `apps/web/src/components/DiscoveryFilters.tsx` (wrap in dropdown/sheet container) |

---

## Out of Scope

- CharacterDetailCard (detail page) — not a discovery/swiping card, different layout context, unchanged
- MatchGallery grid layout — unchanged
- RealmPage tab structure — unchanged
- Any backend changes
