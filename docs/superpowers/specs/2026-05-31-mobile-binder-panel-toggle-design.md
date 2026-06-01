# Mobile Binder Panel Toggle — Design Spec

**Date:** 2026-05-31  
**Branch:** refactor-mobile-display

## Problem

The binder layout uses a two-column grid (`grid-cols-2`) on all screen sizes. On mobile this squishes both panels simultaneously. The goal is to show one panel at a time on mobile, with a toggle tab to switch between them and automatic switching when a resource is selected.

## Scope

Mobile only. Desktop behavior is completely unchanged — both panels always render, the toggle tab is never visible (`md:hidden`), no layout shift.

## State

Each page using `BinderLayout` gains a single state variable:

```ts
const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')
```

**Default `'right'`** (show list/grid first): GamesPage, CharacterPage, MatchesPage, SettingsPage  
**Default `'left'`** (show detail/action first): RealmPage

Auto-switch to left: any page that handles item selection calls `setActiveSide('left')` inside its select handler (e.g. `handleSelect` in GamesPage).

## BinderLayout Changes

### New props

```ts
interface BinderLayoutProps {
  // existing...
  activeSide?: 'left' | 'right'   // defaults to 'right' if omitted
  onToggleSide?: () => void
}
```

Optional so all existing callsites compile without changes before pages are updated.

### Mobile panel visibility

Replace the unconditional `grid-cols-2` with `grid-cols-1 md:grid-cols-2`. Each panel uses a conditional class expression:

- **Left panel**: `activeSide === 'left' ? 'flex' : 'hidden md:flex'`
- **Right panel**: `activeSide === 'right' ? 'flex' : 'hidden md:flex'`

`hidden` hides the panel on mobile when it's not active. `md:flex` ensures both panels always render on desktop regardless of `activeSide`.

### Toggle tab button

A `<button>` rendered inside the outer `relative` wrapper, at the same level as `BinderTabs`, `md:hidden` so desktop never sees it.

**Positioning by side:**
- `activeSide === 'right'`: `absolute right-0 translate-x-full` — protrudes right (mirrors existing tabs strip position)
- `activeSide === 'left'`: `absolute left-0 -translate-x-full` — protrudes left

**Sizing/style:** `w-6 h-full` grid with a single cell, white background (`#ffffff`). No label for now — icon support is a planned follow-on.

## BinderTabs Changes

Remove the 5th "tab" entry (`{ label: "tab", color: "#ffffff", to: "" }`) from the `tabs` array. The 4 real tabs (Games, My Cards, Collection, Settings) are untouched. No other changes.

## Pages — Summary of Changes

| Page | Default side | Auto-switch to left on |
|------|-------------|------------------------|
| GamesPage | `'right'` | `handleSelect` (game selected) |
| CharacterPage | `'right'` | item selection (when applicable) |
| MatchesPage | `'right'` | item selection (when applicable) |
| SettingsPage | `'right'` | N/A |
| RealmPage | `'left'` | N/A |

Each page passes `activeSide` and `onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}` to `BinderLayout`.

## What Does Not Change

- Desktop layout: `grid-cols-2`, both panels render, no toggle tab
- `BinderTabs` positioning, styling, or desktop behavior
- Spine bar, border, overflow behavior
- NavBar
- Any page's existing data-fetching or selection logic (only a side-effect call to `setActiveSide` is added)

## Out of Scope

- Tab icons on mobile (follow-on)
- Animation/transition between panels (not specified)
