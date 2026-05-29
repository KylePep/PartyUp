# RealmPage Binder Redesign

**Date:** 2026-05-28  
**Status:** Approved

## Overview

Redesign `RealmPage` around a "binder" motif: two side-by-side pages separated by a colored spine bar on the left. Extract a reusable `BinderLayout` shell and `BinderTabs` component for use across the site. Mobile is explicitly out of scope — deferred pending separate design work.

---

## Layout

The outer structure is a desktop-only two-column binder split managed by a new `BinderLayout` component. `RealmPage` becomes a thin data loader that slots content into `BinderLayout`.

```
┌──────┬────────────────────────┬────────────────────────┐
│ Bar  │   Left Content Area    │   Right Content Area   │
│(bar  │                        │                        │
│Color)│  [Filter btn — top]    │  Game details (1/3)    │
│      │  [Wizard OR Discovery] │                        │
│ Mini │                        │  Matches grid (2/3)    │
│ Card │  [Pending Likes — bot] │  3×2, max 6, no scroll │
└──────┴────────────────────────┴────────────────────────┘
       BinderTabs on right edge (rotated 90°)
```

---

## Components

### `BinderLayout` (new, reusable)

Shell used across any binder-motif page. Props:

| Prop | Type | Description |
|------|------|-------------|
| `barColor` | `string` | CSS color for the leftmost spine bar |
| `barContent` | `ReactNode?` | Content inside the bar (e.g. character mini card) |
| `leftContent` | `ReactNode` | Full left page content area |
| `rightContent` | `ReactNode` | Full right page content area |
| `tabs` | `BinderTabDef[]?` | Side tabs rendered by BinderTabs internally |

Renders `BinderTabs` internally when `tabs` is provided.

### `BinderTabs` (new, reusable)

The rotated side tabs extracted from the current hardcoded demo. Renders outside the grid, absolutely positioned on the right edge.

```ts
type BinderTabDef = {
  label: string
  color: string
  active?: boolean
  onClick: () => void
}
```

### `CharacterMiniCard` (new)

Minimal character summary for display inside the spine bar. Shows avatar image + character name only. Props: `character: Character`.

### `RealmLeftPage` (new)

Presentational component that owns the left content area. Manages:
- 3-state machine: `'prompt' | 'wizard' | 'discovery'`
  - Initial state: `'discovery'` if character prop is non-null on mount, otherwise `'prompt'`
  - `prompt`: character doesn't exist → shows "Create Character" button
  - `wizard`: user clicked create → `CreateCharacterWizard` inline; transitions to `discovery` on `onSuccess`
  - `discovery`: character exists (loaded or just created) → filter button + swipe cards
- Filter dropdown (overlay, not push) using existing `DiscoveryFilterMenu`
- `PendingLikesBar` pinned to bottom (only shown when in `discovery` state)

Props: `gameId`, `userGame`, `character: Character | null`, `onCharacterCreated: (c: Character) => void`

### `RealmRightPage` (new)

Presentational component that owns the right content area.
- Top ~1/3: game name, image, description (from `userGame`)
- Bottom ~2/3: `MatchGallery` updated to hard-cap at 6 results in a `grid-cols-3` layout, no scroll

Props: `userGame`, `gameId`

### `PendingLikesBar` (new)

Collapsible bottom tray. Manages its own open/closed state.
- Collapsed: a strip showing "N pending likes" label
- Expanded: overlay (does not push content) showing a single row of up to 3 compact character cards, each with a Heart icon button and an X icon button
- On interact: calls `interactWithCharacter`; if match triggers `onMatch`; removes card from local list
- Re-fetches `getPendingLikes` on mount when character exists

Props: `character: Character`, `onMatch: () => void`

---

## Backend

### New endpoint: `GET /api/character-interactions/pending`

Query param: `characterId` (GUID)

Returns `DiscoverCharacter[]` — same DTO shape as the discover endpoint so frontend reuses existing types.

**Logic:** Find all `CharacterInteraction` rows where:
- `ToCharacterId = characterId`
- `Type = Like`
- No reciprocal interaction exists from `characterId` to `FromCharacterId`

**Auth:** The calling user must own the character being queried (403 otherwise).

**Backend changes:**
- `ICharacterInteractionService` — add `GetPendingLikesAsync(Guid characterId, Guid userId)`
- `CharacterInteractionService` — implement above
- `CharacterInteractionController` — add `[HttpGet("pending")]` action

**Frontend changes:**
- `apps/web/src/api/endpoints/characters.ts` — add `getPendingLikes(characterId: string): Promise<DiscoverCharacter[]>`

---

## Data Flow

```
RealmPage
  → loads userGame + character
  → passes to BinderLayout:
      barContent = character ? <CharacterMiniCard> : null
      leftContent = <RealmLeftPage>
      rightContent = <RealmRightPage>
      tabs = [] (placeholder for now)
```

Match banner state stays in `RealmPage` — both left and right panels can trigger it via `onMatch` callback prop.

---

## Out of Scope

- Mobile layout — deferred; user will provide separate designs
- Pagination for matches — deferred (grid hard-capped at 6 for now)
- Navigation from pending likes card to full character profile
- Edit character flow (unchanged)
