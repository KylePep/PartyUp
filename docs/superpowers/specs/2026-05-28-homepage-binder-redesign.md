# HomePage Binder Redesign + NavBar Side Layout

**Date:** 2026-05-28
**Status:** Approved

---

## Overview

After signing in, the user has "activated the magic binder." The HomePage should visually mirror the LandingPage's binder aesthetic — a bordered panel centered in the viewport — but personalized to the signed-in user. The side navbar transitions from a partially-wired layout to a fully functional vertical column.

---

## 1. Layout: SignedInLayout + NavBar

### SignedInLayout
Change the root container from `flex-col` to `flex-row` so the side nav sits beside the content area. The `BottomTray` stays for mobile (unchanged).

```
Before: flex-col  →  nav stacked above content
After:  flex-row  →  nav beside content
```

### NavBar (app variant)
The shell (`w-64 h-screen sticky top-0 bg-surface/80 backdrop-blur-sm border-r border-border`) stays. The inner layout becomes `flex flex-col justify-between py-6 px-6`:

- **Top:** `PartyUp` logo link
- **Middle:** Nav links (`Home`, `Characters`, `Matches`) stacked vertically, same mono/uppercase style as current
- **Bottom:** User avatar + dropdown (unchanged behavior)

Landing variant (`variant="landing"`) is unchanged.

---

## 2. HomePage Structure

Mirrors LandingPage exactly:

```
[side nav w-64] | [main flex-1 flex items-center justify-center]
                        [binder: h-full border-2 border-white w-1/2
                                 flex flex-col items-center justify-between py-4 px-6]
                            [top]    "{username}'s Binder"  — font-display bold
                            [mid]    Orb / OrbSearch component
                            [bottom] Realms section (max 3 cards)
```

No page scroll. The binder fills viewport height. `PageLayout` is replaced by this inline structure.

---

## 3. OrbSearch Component (`components/OrbSearch.tsx`)

A self-contained component that encapsulates the orb states, search logic, and morph animation. Accepts `onAdd(game: UserGame)` callback so HomePage can update realm state.

### States

| State | Trigger | Shape | Width | Search bar position |
|---|---|---|---|---|
| `idle` | Default | `rounded-full` | `~320px` square | Hidden |
| `hovering` | `onMouseEnter` / `onFocus` | `rounded-full` | `~320px` square | Fades in, centered |
| `expanded` | Search executed | `rounded-xl` | `w-full` of binder | Locked to top of rectangle |
| `idle` (reset) | Realm confirmed in modal | `rounded-full` | `~320px` square | Clears, hides |

### Animation
Single `div` with Tailwind transition classes on `width` and `border-radius`. The orb is centered in a full-width wrapper (`w-full flex justify-center`). The orb itself transitions:
- Idle → `w-80 h-80 rounded-full`
- Expanded → `w-full rounded-xl` (height increases minimally, e.g. `h-80` → `h-96`)

The search bar is `absolute top-4 left-4 right-4` inside the orb div. In idle/hover states it is centered via `top-1/2 -translate-y-1/2 left-4 right-4`. In expanded state it moves to `top-4`.

### Search bar appearance
Uses `group` + `group-hover` pattern (same as landing carousel controls) to reveal the input on hover. Also revealed when the orb has keyboard focus (`focus-within`).

### Game results
Rendered inside the orb div below the search bar when in `expanded` state. A compact scrollable list (`max-h` capped) of `GameCard` components using the existing `getGames` API and `GameCard` component.

### Add realm flow
Clicking a `GameCard` opens the existing confirmation modal (same as current `UserRealmsSection`). On confirm, `onAdd` fires and the orb resets to `idle` (clears query, results, and morphs back to circle).

---

## 4. Realms Section

Replaces the sign-in/sign-up button row at the bottom of the binder.

- **Layout:** `flex flex-row gap-4 w-3/4 justify-center`
- **Max 3 realm cards** displayed. Extra realms (user can have more) are not shown here — the full list lives on the realm pages.
- **RealmCard:** Remove the `Remove` button. The card shows game image, game name, and an `Enter` link to `/realm/:gameId`. Removal will be added to the realm page in a future iteration.
- **Empty state (0 realms):** Short centered prompt — `"Search above to add your first realm"` in `text-xs font-mono text-muted`.

---

## 5. Files Changed

| File | Change |
|---|---|
| `components/layout/SignedInLayout.tsx` | `flex-col` → `flex-row` |
| `components/layout/NavBar.tsx` | App variant inner layout → vertical `flex-col justify-between` |
| `components/layout/PageLayout.tsx` | Unused by HomePage after this change (other pages still use it) |
| `pages/HomePage.tsx` | Full rewrite to binder layout; uses `OrbSearch` + realms section |
| `components/OrbSearch.tsx` | New component — orb states, search, morph, add-realm modal |
| `components/cards/RealmCard.tsx` | Remove the `Remove` button and `onRemove` prop |
| `components/UserRealmsSection.tsx` | No longer used by HomePage (may be deleted or kept for future use) |
| `index.css` | Add `expand` keyframe for orb transition if CSS-only animation needed |

---

## 6. Constraints

- No page-level scroll on HomePage. Everything fits the viewport.
- Binder `w-1/2` matches LandingPage.
- Orb width expansion is `w-full` of the binder content area — not the viewport.
- Realm cards: max 3 shown, no overflow scroll.
- `UserRealmsSection`'s add-realm search is superseded by the orb — do not render `UserRealmsSection` on HomePage.
