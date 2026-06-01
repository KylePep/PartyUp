# TCG Card Standardization Design

**Date:** 2026-05-29  
**Status:** Approved

## Overview

Every component that renders an API image should use a shared TCG-card base. Three base components replace the current inconsistent card styles. Existing cards become thin data-mapping wrappers. This is the third attempt at card consistency — a skill file (`partyup-tcg-cards`) now exists to enforce this pattern in future sessions.

**Single exception:** The game image in the Realm page detail section above the match area — no card needed there.

---

## Base Components

All three live in `apps/web/src/components/cards/`.

### 1. `StandardTcgCard`

Six-zone layout. MTG creature card analog.

**Props:**
```tsx
interface StandardTcgCardProps {
  name: string;
  platform?: string;       // right side of header ("element" slot)
  region?: string;
  language?: string;
  activeTimes?: string;
  voiceChat?: boolean;
  bio?: string;            // collapses zone if empty
  imageUrl?: string;       // fallback: first initial on surface-raised bg
  rankLevel?: string;      // conditional bottom stat, omit zone if absent
  className?: string;
  children?: React.ReactNode; // action buttons (edit/delete), rendered below card
}
```

**Zone layout:**
```
┌──────────────────────────────────┐  4px solid black outer border
│ [Name]              [Platform]   │  header: surface-raised bg, border-bottom, Cinzel
├──────────────────────────────────┤
│ [Region] · [Language]            │  subtitle: muted text, no border, italic
├──────────────────────────────────┤
│                                  │
│           [Image]                │  image: border-top + border-bottom, object-cover
│                                  │
├──────────────────────────────────┤
│ [Active Times]  [Voice Chat ✓]   │  stats bar: surface-raised bg, mono font
├──────────────────────────────────┤
│ [Bio]                            │  text body: collapses if no bio
└──────────────── [Rank/Level] ────┘  bottom stat: right-aligned, mono, conditional
```

**Styling:**
- Outer: `border-[4px] border-black rounded-xl overflow-hidden`
- Background: `bg-[--color-surface]`
- Header + stats bar: `bg-[--color-surface-raised]`
- Section dividers: `border-t border-[--color-border]`
- Name: `font-display text-lg`
- Stats/bottom: `font-mono text-sm text-[--color-muted]`

---

### 2. `FullArtTcgCard`

Image fills the card. Header overlaid at top. MTG full-art land analog.

**Props:**
```tsx
interface FullArtTcgCardProps {
  name: string;
  platform?: string;
  imageUrl?: string;
  className?: string;
  children?: React.ReactNode; // action buttons, like/pass overlays
}
```

**Layout:**
```
┌──────────────────────────────────┐  4px solid black border
│ [Name]          [Platform icon]  │  absolute overlay: gradient from-black/80
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│▒▒▒▒▒▒▒▒ IMAGE FILLS CARD ▒▒▒▒▒▒│  object-cover, 100% width + height
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
└──────────────────────────────────┘
```

**Styling:**
- Outer: `relative border-[4px] border-black rounded-xl overflow-hidden`
- Image: `w-full h-full object-cover absolute inset-0`
- Header overlay: `absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent px-3 py-2`
- Name: `font-display text-white text-sm`

---

### 3. `LandCard`

Image dominant with name header and player count footer. MTG land analog.

**Props:**
```tsx
interface LandCardProps {
  name: string;
  imageUrl?: string;
  playerCount?: number;
  className?: string;
  children?: React.ReactNode; // Enter button, link wrappers, etc.
}
```

**Layout:**
```
┌──────────────────────────────────┐  4px solid black border
│ [Game Name]                      │  header: surface-raised bg, Cinzel, border-bottom
├──────────────────────────────────┤
│▒▒▒▒▒▒▒▒▒▒ GAME IMAGE ▒▒▒▒▒▒▒▒▒▒│  aspect-video, object-cover, border-bottom
└──────────── [N players] ─────────┘  footer: surface-raised, right-aligned, mono
```

**Styling:**
- Outer: `border-[4px] border-black rounded-xl overflow-hidden`
- Header + footer: `bg-[--color-surface-raised]`
- Footer: `font-mono text-sm text-[--color-muted] text-right px-3 py-2`

---

## Wrapper Updates

Each existing card becomes a thin wrapper. No styling in the wrapper — data mapping only.

| Existing Card | Base | Notes |
|---|---|---|
| `CharacterCard` | `StandardTcgCard` | Maps character fields; action buttons via `children` |
| `MatchCard` (front) | `StandardTcgCard` | Front only; FlippableCard back stays unchanged |
| `SwipeCard` (front) | `FullArtTcgCard` | Front only; FlippableCard back stays unchanged |
| `CharacterMiniCard` | `FullArtTcgCard` | Already close to this layout |
| `PendingLikeCard` | `FullArtTcgCard` | Like/pass buttons via `children` |
| `GameCard` | `LandCard` | `onSelect` becomes wrapper behavior |
| `RealmCard` | `LandCard` | "Enter" button via `children` |

**Field mapping for CharacterCard → StandardTcgCard:**  
Verify exact field names against the `Character` type in `apps/web/src/api/endpoints/characters.ts`. The character object likely stores platform, region, language, activeTimes, voiceChat as top-level or game-fields properties. Map accordingly in the wrapper.

---

## Scrollbar

Add minimal scrollbar styles to `apps/web/src/index.css`. Card backs scroll heavily and the default scrollbar overlaps text.

```css
/* Minimal scrollbar — card backs and scrollable panels */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
* { scrollbar-width: thin; scrollbar-color: var(--color-border) transparent; }
```

---

## Characters Page: Use CharacterDetailCard

The left panel (`leftContent`, lines 47–159 in `CharacterPage.tsx`) is a hand-rolled duplicate of `CharacterDetailCard`. Replace it with `<CharacterDetailCard character={selectedCharacter} />`.

`CharacterDetailCard` accepts a single `character: Character` prop. It already handles its own internal layout (hero, stats, game fields, bio, back button).

**Overflow fix:** The characters page left panel uses `h-full min-h-0 overflow-y-auto` but `h-full` can't resolve correctly without an explicit ancestor height. Apply the same fix as `CreateCharacterWizard.tsx` line 128: add `style={{ height: 'calc(100vh - 6rem)' }}` to the outer flex container on the page (adjust the offset to match the characters page nav height).

---

## Files Changed

- `apps/web/src/components/cards/StandardTcgCard.tsx` — new
- `apps/web/src/components/cards/FullArtTcgCard.tsx` — new
- `apps/web/src/components/cards/LandCard.tsx` — new
- `apps/web/src/components/cards/CharacterCard.tsx` — wrap StandardTcgCard
- `apps/web/src/components/cards/MatchCard.tsx` — front wraps StandardTcgCard
- `apps/web/src/components/cards/SwipeCard.tsx` — front wraps FullArtTcgCard
- `apps/web/src/components/cards/CharacterMiniCard.tsx` — wrap FullArtTcgCard
- `apps/web/src/components/cards/PendingLikeCard.tsx` — wrap FullArtTcgCard
- `apps/web/src/components/cards/GameCard.tsx` — wrap LandCard
- `apps/web/src/components/cards/RealmCard.tsx` — wrap LandCard
- `apps/web/src/pages/CharacterPage.tsx` — use CharacterDetailCard, fix overflow
- `apps/web/src/index.css` — minimal scrollbar

---

## Out of Scope

- EVA `commonField` mapping — separate spec/session
- CharacterDetailCard restyling — it stays as-is, just wired up on CharacterPage
- FlippableCard mechanics — unchanged
- Card (UI component) — unchanged generic wrapper
