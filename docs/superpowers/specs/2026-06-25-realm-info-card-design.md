# Realm Info Card — Design Spec

**Date:** 2026-06-25
**Status:** Approved

## Summary

Add a `RealmInfoCard` component to the binder bar on `RealmPage` that shows an activity snapshot for the current realm. Replaces the two existing `FullArtTcgCard` placeholder elements (the hardcoded mobile "partyUp" card and the desktop "realm" card) with a single responsive component.

## Design Principles

- **Activity snapshot, not a scorecard.** No ratios, rates, or metrics that imply success or failure — just raw counts and time context.
- **Mobile is icon-first.** Small card dimensions on mobile make labels impractical. Icons carry meaning; numbers are the content.
- **One component, no hide/show.** Responsive layout shifts via Tailwind breakpoint classes. No conditional rendering or `hidden md:block` pairs.

---

## Stats

| Stat | Source | Mobile | Desktop |
|---|---|---|---|
| Match count | `RealmRightPage.totalCount` | ✓ (icon + number) | ✓ (icon + number + label) |
| Pending likes count | `PendingLikesBar.pending.length` | ✓ (icon + number) | ✓ (icon + number + label) |
| Days in realm | `character.createdAt` (derived) | — | ✓ |
| Last match date | `RealmRightPage.matches[0].matchedAt` (derived) | — | ✓ |

---

## Component: `RealmInfoCard`

**File:** `apps/web/src/components/cards/RealmInfoCard.tsx`

### Props

```ts
interface RealmInfoCardProps {
  matchCount: number
  pendingCount: number
  characterCreatedAt: string | null  // ISO date string → derive days in realm
  lastMatchedAt: string | null       // ISO date string → derive "Xd ago" label
  gameImageUrl?: string
  gameName: string
  className?: string
  style?: React.CSSProperties
}
```

### Mobile layout (base, portrait 2:3)

The entire card face is the stat display — no background image, no bottom overlay. Two columns side by side, each taking 50% width. Each column: icon centered above, number below.

```
┌──────────┐
│  ⚔  │ ⏳  │
│  6  │  3  │
└──────────┘
```

- Icons from `@phosphor-icons/react`. Suggested: `HandshakeIcon` for matches, `ClockCountdownIcon` for pending.
- Numbers in `font-mono`, large enough to read at small card size.
- Background uses game image if available, with a dark overlay so numbers are readable.

### Desktop layout (md+, landscape 3:2)

Background image fills the card. A bottom strip holds a 2×2 grid of stats, each cell: icon + value + short label.

```
┌─────────────────────────────────┐
│           [art/bg]              │
├──────────────┬──────────────────┤
│ ⚔ 6 Matches  │ ⏳ 3 Pending     │
│ 📅 30d Realm │ 🕐 2d Last match │
└──────────────┴──────────────────┘
```

- "30d Realm" = `Math.floor((now - characterCreatedAt) / 86400000)` days, formatted as `Xd`.
- "2d Last match" = same relative format from `lastMatchedAt`. If no matches yet, show `—`.
- Labels are `text-xxs font-mono text-muted`.

### Aspect ratio

```
// mobile
style={{ aspectRatio: '2/3' }}

// md+
md:style={{ aspectRatio: '3/2' }}
```

Handled via Tailwind classes on the wrapper, not inline style conditionals.

---

## State lifting

Three pieces of state need to bubble up to `RealmPage` so both the card and the rest of the page stay in sync.

### 1. Match count + last match date

`RealmRightPage` already fetches matches. Add an `onStatsLoad` callback prop:

```ts
// RealmRightPage props addition
onStatsLoad?: (matchCount: number, lastMatchedAt: string | null) => void
```

Called once after the first successful fetch. `lastMatchedAt` is `matches[0]?.matchedAt ?? null` (matches are ordered by `matchedAt` desc in the service).

### 2. Pending likes count

`PendingLikesBar` already fetches pending likes. Add an `onCountChange` callback prop:

```ts
// PendingLikesBar props addition
onCountChange?: (count: number) => void
```

Called whenever `pending` state changes. `RealmLeftPage` threads this through to `RealmPage`.

### 3. Days in realm

Derived from `character.createdAt`, which is already on `RealmPage`'s `character` state. No lifting needed.

### RealmPage state additions

```ts
const [matchCount, setMatchCount] = useState(0)
const [lastMatchedAt, setLastMatchedAt] = useState<string | null>(null)
const [pendingCount, setPendingCount] = useState(0)
```

---

## RealmPage integration

Replace the two existing `FullArtTcgCard` elements in the bar with a single `RealmInfoCard`:

```tsx
<RealmInfoCard
  matchCount={matchCount}
  pendingCount={pendingCount}
  characterCreatedAt={character?.createdAt ?? null}
  lastMatchedAt={lastMatchedAt}
  gameImageUrl={userGame.gameImageUrl ?? undefined}
  gameName={userGame.gameName}
  className="h-full md:h-40 shrink-0 text-xxs md:text-xs"
/>
```

The aspect ratio responsive shift (2:3 → 3:2) is handled inside `RealmInfoCard` via Tailwind, so the parent doesn't need to manage it.

---

## Out of scope

- No new API endpoints.
- No swipe count, like rate, or match rate — these imply a success judgement.
- No changes to `RealmCard` (the home-page game list card).
