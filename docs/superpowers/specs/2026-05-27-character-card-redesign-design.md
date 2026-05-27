# Character Card Redesign — Design Spec

**Date:** 2026-05-27  
**Approach:** Sleek TCG (Approach B)

---

## Overview

Redesign all character-facing cards to use a trading card game (TCG) aesthetic: structured layout with a top bar, framed art box, and bottom info panel. Existing images become the focus of the card. Two cards gain a 3D flip mechanic that reveals full character detail on a dark back face. A new CharacterDetailCard component is added for the character detail page, styled as a D&D stat sheet.

**Cards in scope:**
1. **SwipeCard** — TCG card, flip mechanic (discovery/swiping)
2. **MatchCard** — TCG card, flip mechanic, green border, platform handle prominent
3. **CharacterCard** — Compact TCG card, no flip, navigates to character detail page
4. **CharacterDetailCard** — New component, D&D stat sheet layout, full detail, back-to-realm button

---

## Card System Architecture

- `SwipeCard.tsx` and `MatchCard.tsx` are rewritten in place.
- `CharacterCard.tsx` is rewritten in place.
- `CharacterDetailCard.tsx` is created in `apps/web/src/components/cards/`.
- A `FlippableCard.tsx` wrapper component is created in `apps/web/src/components/cards/` to own the 3D flip state and animation shared by SwipeCard and MatchCard. It accepts `front` and `back` as `ReactNode` props.
- A new route `/characters/:characterId` is added to `App.tsx`, served by a new `CharacterDetailPage.tsx`.
- All cards use existing CSS custom properties — no new color tokens.

### FlippableCard wrapper

`FlippableCard` accepts `front: ReactNode` and `back: ReactNode` props plus any className/style for sizing. It maintains a `flipped: boolean` state. Clicking the bottom third of the front face sets `flipped = true`. Clicking anywhere on the back sets `flipped = false`. The animation is a CSS `rotateY` 3D transform on a perspective container — front face `rotateY(0deg)`, back face `rotateY(180deg)`, the container transitions between them. Both faces use `backface-visibility: hidden`.

```
perspective container (3D context)
  ├── front face (rotateY 0deg when not flipped)
  └── back face  (rotateY 180deg → 0deg when flipped)
```

The bottom-third click zone on the front face is a transparent `div` absolutely positioned over the lower portion of the card, with a subtle "tap for more" hint (small chevron icon or text).

---

## SwipeCard

**Type:** `DiscoverCharacter`  
**Border:** `--color-accent` (`#7c6fcd`) with faint glow  
**Aspect ratio:** ~2:3 portrait, 520px height (unchanged from current)

### Front Face Layout (top → bottom)

| Section | Content |
|---|---|
| **Top bar** | Character name (bold, left) · Platform badge (right) |
| **Art box** | Character image, `object-cover`, thin inset border framing it. Placeholder: first initial if no image. |
| **Bottom panel** | Main role, secondary role, rank, region, playstyle badges · Bio (2–3 line clamp) · Tap-to-flip hint at bottom edge |

The art box gets the majority of vertical space (~55% of card height). Top bar and bottom panel are compact fixed-height sections. The card background is `--color-surface`. All sections use solid backgrounds — no frosted glass.

### Back Face Layout

- Solid `#000` background, same accent border
- Character name at top as heading
- Two-column grid of all fields: main role, secondary role, rank, region, playstyle, voice chat, preferred modes, languages, game-specific fields
- Full bio below the grid (no clamp)
- Tap anywhere to flip back to front

### Swipe Actions

Like/Pass buttons remain below the card, unchanged. The flip zone and swipe buttons do not conflict — flip is triggered by tapping the bottom panel of the front face, not by button interactions.

---

## MatchCard

**Type:** `CharacterSummary` + `gameName` + `matchedAt`  
**Border:** `--color-success` (`#52c77a`, green) with faint glow — signals a positive relationship  
**Aspect ratio:** Same ~2:3 portrait as SwipeCard

### Front Face Layout (top → bottom)

| Section | Content |
|---|---|
| **Top bar** | Platform handle (large, primary) · Character name (smaller, secondary beneath it) |
| **Art box** | Same as SwipeCard |
| **Bottom panel** | Main role, secondary role, rank, region, playstyle badges · Bio (2–3 line clamp) · Match date (small, muted, bottom edge) · Tap-to-flip hint |

### Back Face Layout

- Solid `#000` background, same green border
- Platform handle as top heading (primary identity)
- Character name below it
- Two-column field grid: rank, role, region, playstyle, game-specific fields
- Full bio at bottom
- Tap anywhere to flip back

**Note:** `CharacterSummary` does not include `platform` or `usesVoiceChat`/`languages`/`preferredModes` — back face only renders fields present on the type.

---

## CharacterCard

**Type:** `Character`  
**Border:** `--color-border` (neutral) — visually distinct from discovery/match cards so it reads as "mine"  
**Size:** Compact — smaller than SwipeCard to leave room on the realm page

### Layout (top → bottom)

| Section | Content |
|---|---|
| **Top bar** | Character name (bold, left) · Platform handle (right, muted mono font) |
| **Art box** | Shorter than SwipeCard; same `object-cover` with inset border |
| **Bottom panel** | Main role badge · Rank badge (the two most identifying fields) |

No flip mechanic. Clicking anywhere on the card navigates to `/characters/:characterId`.

**Edit/Delete:** The existing `onEdit`/`onDelete` callback props are retained for use in the CharacterGallery context. When provided, small Edit/Delete buttons appear overlaid on the top bar (icon buttons, not full buttons) so they don't break the card layout.

---

## CharacterDetailCard

**Type:** `Character`  
**File:** `apps/web/src/components/cards/CharacterDetailCard.tsx`  
**Style:** D&D stat sheet aesthetic — ruled sections, muted uppercase section headers, field-label rows with dividers. Dark surface background, accent border.

### Layout

```
┌─────────────────────────────────────────────┐
│  [Back to Realm]                    [Edit]  │  ← action bar
├──────────────┬──────────────────────────────┤
│              │  Name (large)                │
│  Portrait    │  Platform Handle (mono)      │  ← hero section
│  Image       │  Game Name                   │
│  (tall)      │  [Role] [Role] [Rank]        │
│              │  [Region] [Platform]         │
├──────────────┴──────────────────────────────┤
│  STATS                                      │  ← stats section
│  ─────────────────────────────────────────  │
│  Playstyle      │  Voice Chat               │
│  ─────────────────────────────────────────  │
│  Preferred Modes│  Languages                │
│  ─────────────────────────────────────────  │
│  Time Zone      │  Active Times             │
├─────────────────────────────────────────────┤
│  GAME FIELDS                                │  ← adaptive section
│  ─────────────────────────────────────────  │
│  [label]        │  [value]                  │
│  ... repeats for each gameField ...         │
├─────────────────────────────────────────────┤
│  BIO                                        │  ← bio section
│  Full bio text, no truncation               │
└─────────────────────────────────────────────┘
```

- Section headers are small uppercase muted labels (`text-xs text-muted uppercase tracking-widest`)
- Field rows use a two-column layout: label (muted) left, value (text) right
- `gameFields` renders dynamically — if empty, the Game Fields section is omitted
- Fields with no value are omitted (no blank rows)
- **Back to Realm button:** top-left, navigates back using `useNavigate(-1)` (browser history back). This works correctly because CharacterCard always navigates to this page from within the app.
- **Edit button:** top-right, navigates to the existing edit character route

### New Route

`/characters/:characterId` → `CharacterDetailPage.tsx`

- Fetches character by ID via a new `GET /api/characters/:id` backend endpoint (returns the same `CharacterResponse` shape as the existing list endpoint, scoped to the requesting user)
- The backend endpoint is added to `CharactersController` and `ICharacterService`
- The frontend adds a corresponding `getCharacterById(id)` function in `characters.ts`
- Renders `CharacterDetailCard` with the fetched character
- Handles loading and not-found states

---

## Data Type Notes

- `DiscoverCharacter` has `platform` (not `platformHandle`) — SwipeCard top bar shows `platform`
- `CharacterSummary` has `platformHandle` (not `platform`) — MatchCard top bar shows `platformHandle`
- `Character` has both `platform` and `platformHandle`
- `CharacterSummary` omits `usesVoiceChat`, `languages`, `preferredModes`, `timeZone`, `activeTimes` — MatchCard back face skips these fields

---

## CSS / Animation

The 3D flip uses Tailwind arbitrary values and inline styles on a perspective container. The transition is `transform 0.5s ease`. Both card faces use `backface-visibility: hidden`. Existing slide-in/slide-out animations on SwipeCard are preserved — the flip state is orthogonal to the swipe exit animation.

No new global CSS is required beyond what Tailwind provides. The accent glow effect uses `box-shadow` with the color token values.
