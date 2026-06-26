# Realm Info Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two placeholder `FullArtTcgCard` elements in the `RealmPage` binder bar with a single `RealmInfoCard` component that shows a responsive activity snapshot (match count, pending likes, days in realm, last match date).

**Architecture:** Lift match count + last match date out of `RealmRightPage` and pending likes count out of `PendingLikesBar` via callbacks, collect them in `RealmPage` state, then pass them into a new `RealmInfoCard` component that adapts its layout at the `md` breakpoint — portrait 2-stat view on mobile, landscape 4-stat grid on desktop.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, `@phosphor-icons/react`

## Global Constraints

- No new API endpoints — all data comes from fetches already in flight on the page.
- No swipe count, like rate, or match rate — these imply a success judgement.
- One `RealmInfoCard` element in the parent bar (not two with hide/show). Internal responsive layout via Tailwind is fine.
- Phosphor icons only (`@phosphor-icons/react`).
- `text-xxs` is the project's custom Tailwind class for very small text — use it where needed.
- `font-mono` for all numeric/stat text — matches the rest of the UI.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `apps/web/src/api/endpoints/characters.ts` | Add `createdAt?: string` to `Character` type |
| Modify | `apps/web/src/components/PendingLikesBar.tsx` | Add `onCountChange?` callback prop |
| Modify | `apps/web/src/components/RealmLeftPage.tsx` | Thread `onPendingCountChange?` through to `PendingLikesBar` |
| Modify | `apps/web/src/components/RealmRightPage.tsx` | Add `onStatsLoad?` callback; track `lastMatchedAt` via ref |
| Create | `apps/web/src/components/cards/RealmInfoCard.tsx` | New responsive info card component |
| Modify | `apps/web/src/pages/RealmPage.tsx` | Add stats state, wire callbacks, replace two `FullArtTcgCard` elements |

---

## Task 1: Lift pending likes count

**Files:**
- Modify: `apps/web/src/components/PendingLikesBar.tsx`
- Modify: `apps/web/src/components/RealmLeftPage.tsx`

**Interfaces:**
- Produces: `PendingLikesBar` accepts `onCountChange?: (count: number) => void`
- Produces: `RealmLeftPage` accepts `onPendingCountChange?: (count: number) => void`

- [ ] **Step 1: Add `onCountChange` prop to `PendingLikesBar`**

In `apps/web/src/components/PendingLikesBar.tsx`, update the props interface and add a `useEffect` that fires whenever `pending` changes:

```tsx
interface PendingLikesBarProps {
  character: Character
  onMatch: () => void
  onCountChange?: (count: number) => void  // add this
}

export function PendingLikesBar({ character, onMatch, onCountChange }: PendingLikesBarProps) {
  // existing state unchanged
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<DiscoverCharacter[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    getPendingLikes(character.id).then(setPending).catch(() => { })
  }, [character.id])

  // Add this effect below the existing one:
  useEffect(() => {
    onCountChange?.(pending.length)
  }, [pending.length, onCountChange])

  // rest of component unchanged
```

- [ ] **Step 2: Thread `onPendingCountChange` through `RealmLeftPage`**

In `apps/web/src/components/RealmLeftPage.tsx`, update the props interface and pass the callback to `PendingLikesBar`:

```tsx
interface RealmLeftPageProps {
  gameId: string
  userGame: UserGameDetail
  character: Character | null
  onCharacterCreated: () => void
  onMatch: () => void
  onPendingCountChange?: (count: number) => void  // add this
}

export function RealmLeftPage({ gameId, userGame, character, onCharacterCreated, onMatch, onPendingCountChange }: RealmLeftPageProps) {
```

Then in the JSX where `PendingLikesBar` is rendered (bottom of the component), add the prop:

```tsx
<PendingLikesBar character={character} onMatch={onMatch} onCountChange={onPendingCountChange} />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no TypeScript errors. (The new props are optional so no call sites break.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/PendingLikesBar.tsx apps/web/src/components/RealmLeftPage.tsx
git commit -m "feat: lift pending likes count via callback from PendingLikesBar"
```

---

## Task 2: Lift match count + last match date

**Files:**
- Modify: `apps/web/src/components/RealmRightPage.tsx`

**Interfaces:**
- Produces: `RealmRightPage` accepts `onStatsLoad?: (matchCount: number, lastMatchedAt: string | null) => void`

- [ ] **Step 1: Add `onStatsLoad` to `RealmRightPage`**

In `apps/web/src/components/RealmRightPage.tsx`, update the props interface, add a ref to persist `lastMatchedAt` across page navigation, and call the callback after each fetch:

```tsx
import { useEffect, useRef, useState } from 'react'  // add useRef
import type { UserGameDetail } from '../api/endpoints/userGames'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { Gallery } from './Gallery'
import { MatchCard } from './cards/MatchCard'
import { PaginationControls } from './ui'
import { BinderHeader } from './layout/BinderHeader'

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
  onStatsLoad?: (matchCount: number, lastMatchedAt: string | null) => void  // add this
}

const PAGE_SIZE = 12

export function RealmRightPage({ gameId, onStatsLoad }: RealmRightPageProps) {
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const lastMatchedAtRef = useRef<string | null>(null)  // add this

  useEffect(() => {
    setPage(1)
    lastMatchedAtRef.current = null  // reset on game change
  }, [gameId])

  useEffect(() => {
    setStatus('loading')
    getMatches(page, PAGE_SIZE, gameId)
      .then(result => {
        setMatches(result.items)
        setTotalCount(result.totalCount)
        setStatus(result.totalCount === 0 ? 'empty' : 'ready')
        // Capture most-recent match only from page 1 (matches are ordered matchedAt desc)
        if (page === 1) lastMatchedAtRef.current = result.items[0]?.matchedAt ?? null
        onStatsLoad?.(result.totalCount, lastMatchedAtRef.current)
      })
      .catch(() => setStatus('error'))
  }, [gameId, page])

  // rest of JSX unchanged
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/RealmRightPage.tsx
git commit -m "feat: lift match count and last match date via callback from RealmRightPage"
```

---

## Task 3: Add `createdAt` to frontend `Character` type

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`

**Interfaces:**
- Produces: `Character.createdAt?: string` (ISO datetime string, already returned by the API's `CharacterResponse.CreatedAt`)

- [ ] **Step 1: Add `createdAt` to the `Character` type**

In `apps/web/src/api/endpoints/characters.ts`, add the field to the `Character` type:

```ts
export type Character = {
  id: string;
  userGameId?: string;
  gameId?: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameName?: string;
  gameImageUrl?: string;
  cardBackgroundColor?: string;
  gameFields: CharacterGameField[];
  hasNewMatch?: boolean;
  createdAt?: string;  // add this — ISO datetime, maps to CharacterResponse.CreatedAt
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts
git commit -m "feat: add createdAt to frontend Character type"
```

---

## Task 4: Build `RealmInfoCard` component

**Files:**
- Create: `apps/web/src/components/cards/RealmInfoCard.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (standalone component, driven entirely by props)
- Produces: `RealmInfoCard` component with the props shape below

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/cards/RealmInfoCard.tsx`:

```tsx
import { HandshakeIcon, ClockCountdownIcon, CalendarIcon, TimerIcon } from '@phosphor-icons/react'

interface RealmInfoCardProps {
  matchCount: number
  pendingCount: number
  characterCreatedAt: string | null
  lastMatchedAt: string | null
  gameImageUrl?: string
  gameName: string
  className?: string
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  return `${days}d`
}

export function RealmInfoCard({
  matchCount,
  pendingCount,
  characterCreatedAt,
  lastMatchedAt,
  gameImageUrl,
  gameName,
  className,
}: RealmInfoCardProps) {
  return (
    <div
      className={`relative overflow-hidden border-4 border-black rounded-xl shadow aspect-[2/3] md:aspect-[3/2] ${className ?? ''}`}
    >
      {/* Background */}
      {gameImageUrl ? (
        <img src={gameImageUrl} alt={gameName} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
          <span className="font-mono text-muted font-bold text-4xl">{gameName.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/50" />

      {/* Mobile: 2 stats filling the full card face */}
      <div className="absolute inset-0 flex md:hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <HandshakeIcon size={16} className="text-white" />
          <span className="font-mono font-bold text-white text-sm">{matchCount}</span>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <ClockCountdownIcon size={16} className="text-white" />
          <span className="font-mono font-bold text-white text-sm">{pendingCount}</span>
        </div>
      </div>

      {/* Desktop: 4 stats in a 2×2 bottom strip */}
      <div className="absolute bottom-0 left-0 right-0 hidden md:grid grid-cols-2 bg-black/80 p-2 gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <HandshakeIcon size={10} className="text-white shrink-0" />
          <span className="font-mono text-white text-xxs truncate">{matchCount} Matches</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <ClockCountdownIcon size={10} className="text-white shrink-0" />
          <span className="font-mono text-white text-xxs truncate">{pendingCount} Pending</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <CalendarIcon size={10} className="text-white shrink-0" />
          <span className="font-mono text-white text-xxs truncate">{daysAgo(characterCreatedAt)} Realm</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <TimerIcon size={10} className="text-white shrink-0" />
          <span className="font-mono text-white text-xxs truncate">{daysAgo(lastMatchedAt)} Last</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/RealmInfoCard.tsx
git commit -m "feat: add RealmInfoCard component with responsive activity snapshot"
```

---

## Task 5: Wire `RealmInfoCard` into `RealmPage`

**Files:**
- Modify: `apps/web/src/pages/RealmPage.tsx`

**Interfaces:**
- Consumes: `onPendingCountChange` from Task 1 (`RealmLeftPage` prop)
- Consumes: `onStatsLoad` from Task 2 (`RealmRightPage` prop)
- Consumes: `character.createdAt` from Task 3
- Consumes: `RealmInfoCard` from Task 4

- [ ] **Step 1: Add realm stats state and replace cards in `RealmPage`**

Replace the full contents of `apps/web/src/pages/RealmPage.tsx` with the following. Key changes: three new state vars (`matchCount`, `lastMatchedAt`, `pendingCount`), two callbacks wired to child components, and a single `RealmInfoCard` replacing both `FullArtTcgCard` instances:

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { RealmLeftPage } from '../components/RealmLeftPage'
import { RealmRightPage } from '../components/RealmRightPage'
import { RealmInfoCard } from '../components/cards/RealmInfoCard'
import { Spinner } from '../components/ui'
import { CubeIcon, UserSquareIcon } from '@phosphor-icons/react'

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [matchBanner, setMatchBanner] = useState(false)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left')
  const [matchCount, setMatchCount] = useState(0)
  const [lastMatchedAt, setLastMatchedAt] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!gameId) return
    getUserGameByGameId(gameId)
      .then(ug => {
        setUserGame(ug)
        return getUserGameCharacters(ug.id)
      })
      .then(chars => {
        setCharacter(chars.find(c => c.userGameId) ?? null)
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [gameId])

  // Reset stats when the realm changes
  useEffect(() => {
    setMatchCount(0)
    setLastMatchedAt(null)
    setPendingCount(0)
  }, [gameId])

  async function handleCharacterCreated() {
    if (!userGame) return
    const chars = await getUserGameCharacters(userGame.id)
    setCharacter(chars.find(c => c.userGameId) ?? null)
  }

  function handleMatch() {
    setMatchBanner(true)
    setTimeout(() => setMatchBanner(false), 2500)
  }

  function handleStatsLoad(count: number, lastDate: string | null) {
    setMatchCount(count)
    setLastMatchedAt(lastDate)
  }

  if (loading) {
    return <div className="flex w-screen justify-center py-24"><Spinner /></div>
  }

  if (!userGame) return null

  return (
    <>
      {matchBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-off-white px-6 py-3 rounded-lg font-mono text-sm shadow-lg">
          It's a match!
        </div>
      )}
      <BinderLayout
        barColor="#ea6a01"
        barContent={
          <>
            {userGame && (
              <GameMiniCard
                game={{ name: userGame.gameName, imageUrl: userGame.gameImageUrl }}
                userGameId={userGame.id}
                platform={<CubeIcon />}
              />
            )}
            <RealmInfoCard
              matchCount={matchCount}
              pendingCount={pendingCount}
              characterCreatedAt={character?.createdAt ?? null}
              lastMatchedAt={lastMatchedAt}
              gameImageUrl={userGame.gameImageUrl ?? undefined}
              gameName={userGame.gameName}
              className="h-full md:h-40 shrink-0 text-xxs md:text-xs"
            />
            {character && (
              <CharacterMiniCard
                character={character}
                characterId={character.id}
                platform={<UserSquareIcon />}
              />
            )}
          </>
        }
        activeTab=""
        activeSide={activeSide}
        onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
        leftContent={
          <RealmLeftPage
            gameId={gameId!}
            userGame={userGame}
            character={character}
            onCharacterCreated={handleCharacterCreated}
            onMatch={handleMatch}
            onPendingCountChange={setPendingCount}
          />
        }
        rightContent={
          <RealmRightPage
            userGame={userGame}
            gameId={gameId!}
            onStatsLoad={handleStatsLoad}
          />
        }
      />
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no errors.

- [ ] **Step 3: Start the dev server and verify visually**

```bash
npm run dev
```

Navigate to a realm page (`/realm/<gameId>`). Check:

1. **Mobile viewport (< 768px):** The binder bar shows a portrait card with two icon+number columns (handshake + clock countdown). Numbers update as you swipe and matches come in.
2. **Desktop viewport (≥ 768px):** The card is landscape with a bottom strip showing all 4 stats: Matches, Pending, Xd Realm, Xd Last.
3. **No character yet:** `characterCreatedAt` is null — "—" appears for Realm and Last match on desktop.
4. **No matches yet:** `matchCount` shows 0, `lastMatchedAt` is null — "—" for Last.
5. **Game with image:** Background image shows through with the dark overlay.
6. **Game without image:** Fallback shows the first letter of the game name on `surface-raised` background.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/RealmPage.tsx
git commit -m "feat: wire RealmInfoCard into RealmPage bar with live activity stats"
```
