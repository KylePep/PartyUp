# HomePage Binder Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the signed-in home page to mirror the landing page's magic binder aesthetic — a bordered binder panel with a morphing orb for game search and a row of up to 3 realm cards — while converting the navbar to a proper vertical side nav.

**Architecture:** A new `OrbSearch` component owns all orb state (circle ↔ rectangle morph, game search, add-realm modal). `SignedInLayout` switches to `flex-row` on desktop so the sidebar nav sits beside content. `HomePage` is rewritten to use the same binder shell as `LandingPage`, wiring `OrbSearch` and a slim realms strip.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, React Router v6, Vite

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `apps/web/src/components/layout/SignedInLayout.tsx` | `flex-col` → `flex-col md:flex-row` outer container |
| Modify | `apps/web/src/components/layout/NavBar.tsx` | App variant: vertical side nav on desktop, horizontal bar on mobile |
| Modify | `apps/web/src/components/cards/RealmCard.tsx` | Remove `onRemove` prop and Remove button |
| Create | `apps/web/src/components/OrbSearch.tsx` | Circle/rectangle orb with game search and add-realm modal |
| Modify | `apps/web/src/pages/HomePage.tsx` | Full rewrite: binder shell + OrbSearch + realms strip |
| Delete | `apps/web/src/components/UserRealmsSection.tsx` | No longer used after HomePage rewrite |

**Type check command** (run after each task): `npm run build --prefix apps/web`

---

## Task 1: Convert SignedInLayout to side-nav row layout

**Files:**
- Modify: `apps/web/src/components/layout/SignedInLayout.tsx`

- [ ] **Step 1: Open the file and make the change**

In `apps/web/src/components/layout/SignedInLayout.tsx`, replace the outer `div` className. The only change is `flex-col` → `flex-col md:flex-row` and moving `pb-16 md:pb-0` to stay on the outer container (the BottomTray is fixed so the outer container still needs bottom padding on mobile to prevent content overlap).

Replace the entire file with:

```tsx
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { NavBar } from './NavBar'
import { BottomTray } from './BottomTray'
import { Spinner } from '../ui'

export default function SignedInLayout() {
  const { state } = useAuth()

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner label="Loading..." />
      </div>
    )
  }

  if (state.status === 'unauthenticated' || state.status === 'unreachable') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row pb-16 md:pb-0">
      <NavBar variant="app" />
      <Outlet />
      <BottomTray />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/SignedInLayout.tsx
git commit -m "feat: convert SignedInLayout to flex-row side-nav layout on desktop"
```

---

## Task 2: Refactor NavBar to proper vertical side nav

**Files:**
- Modify: `apps/web/src/components/layout/NavBar.tsx`

**Context:** The current app-variant nav renders nav links in `hidden md:flex items-center gap-6` (horizontal row). The nav element itself uses `w-64 h-screen` but has no `flex-col` on the inner layout, so elements don't stack. This task makes the desktop layout a proper vertical column (logo → links → avatar) and makes the mobile layout a horizontal top bar (logo left, avatar right).

- [ ] **Step 1: Rewrite NavBar.tsx**

Replace the entire file with:

```tsx
import { useState, useRef, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui'

type Variant = 'landing' | 'app'

interface NavBarProps {
  variant: Variant
  onSignIn?: () => void
  onSignUp?: () => void
}

const navLinks = [
  { to: '/home', label: 'Home' },
  { to: '/characters', label: 'Characters' },
  { to: '/matches', label: 'Matches' },
]

export function NavBar({ variant, onSignIn, onSignUp }: NavBarProps) {
  const { state, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const username = state.status === 'authenticated' ? state.user.username : ''

  return (
    <nav
      className={`z-40 flex w-full h-16 px-6 items-center justify-between md:w-64 md:h-screen md:flex-col md:justify-between md:items-stretch md:py-8 md:sticky md:top-0 ${
        variant === 'landing'
          ? 'bg-black'
          : 'bg-surface/80 backdrop-blur-sm border-b border-border md:border-b-0 md:border-r'
      }`}
    >
      {/* Logo */}
      <Link to="/" className="font-display font-bold text-text text-lg tracking-wide">
        PartyUp
      </Link>

      {/* Nav links — desktop only, stacked vertically */}
      {variant === 'app' && (
        <div className="hidden md:flex flex-col gap-6">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-xs font-mono uppercase tracking-widest transition-colors ${
                  isActive ? 'text-accent' : 'text-muted hover:text-text'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Landing: sign in / sign up */}
      {variant === 'landing' && (
        <div className="flex md:flex-col gap-4 md:gap-6">
          <button
            onClick={onSignIn}
            className="text-xs font-mono uppercase tracking-widest text-muted hover:text-text transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onSignUp}
            className="text-xs font-mono uppercase tracking-widest px-4 py-2 border border-border text-text hover:border-accent hover:text-accent transition-colors rounded"
          >
            Sign Up
          </button>
        </div>
      )}

      {/* User avatar + dropdown */}
      {variant === 'app' && username && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            <Avatar fallback={username} size="sm" />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 md:right-auto md:left-0 md:bottom-full md:top-auto md:mt-0 md:mb-2 w-44 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-mono text-muted uppercase tracking-widest">Signed in as</p>
                <p className="text-sm text-text font-medium truncate">{username}</p>
              </div>
              <button
                onClick={() => { logout(); setDropdownOpen(false) }}
                className="w-full text-left px-4 py-3 text-sm text-danger hover:bg-surface-raised transition-colors font-mono"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/NavBar.tsx
git commit -m "feat: refactor NavBar app variant to vertical side nav on desktop"
```

---

## Task 3: Strip onRemove from RealmCard

**Files:**
- Modify: `apps/web/src/components/cards/RealmCard.tsx`

**Context:** `RealmCard` currently accepts `onRemove` and renders a Remove button. The home page binder will show realm cards without removal (removal will be added to the realm page later). `UserRealmsSection` (which calls `onRemove`) is being deleted in Task 6. Remove the prop before deleting the section to catch any remaining references via TypeScript.

- [ ] **Step 1: Rewrite RealmCard.tsx**

Replace the entire file with:

```tsx
import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'

interface RealmCardProps {
  userGame: UserGame
}

export function RealmCard({ userGame }: RealmCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors">
      {userGame.gameImageUrl ? (
        <div className="aspect-video w-full overflow-hidden">
          <img src={userGame.gameImageUrl} alt={userGame.gameName} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video w-full bg-surface-raised" />
      )}
      <div className="p-3 flex flex-col gap-2">
        <p className="text-sm font-mono text-text truncate">{userGame.gameName}</p>
        <Link
          to={`/realm/${userGame.gameId}`}
          className="block text-center text-xs font-mono uppercase tracking-widest py-2 border border-border text-muted hover:border-accent hover:text-accent transition-colors rounded"
        >
          Enter
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check — expect a failure**

```bash
npm run build --prefix apps/web
```

Expected: TypeScript error in `UserRealmsSection.tsx` because it still passes `onRemove` to `RealmCard`. This confirms the prop is gone and points to the next cleanup target. If any other file also errors, note it.

- [ ] **Step 3: Commit** (build is broken — that is expected and intentional, next task fixes it)

```bash
git add apps/web/src/components/cards/RealmCard.tsx
git commit -m "feat: remove onRemove prop from RealmCard"
```

---

## Task 4: Create OrbSearch component

**Files:**
- Create: `apps/web/src/components/OrbSearch.tsx`

**Context:** This component owns all orb logic. It renders a circle that morphs to a full-width rectangle when a search is executed, shows game results inside the rectangle, and resets back to a circle after the user confirms adding a realm. The morph is driven by CSS `transition` on inline `style` properties (`width`, `height`, `borderRadius`, `paddingTop`) because Tailwind arbitrary values don't animate padding-top from `calc()` values reliably.

**Orb state transitions:**
- Default: `w-80 h-80 rounded-full`, search bar hidden (fades in on hover via `group-hover`)
- After search executes: `w-full h-96 rounded-xl`, search bar locked at top, results below
- After realm confirmed: resets to default (clears query, results, and expanded state)

- [ ] **Step 1: Create the file**

Create `apps/web/src/components/OrbSearch.tsx`:

```tsx
import { useState } from 'react'
import { getGames, type Game } from '../api/endpoints/games'
import { addUserGame as apiAddUserGame, type UserGame } from '../api/endpoints/userGames'
import { GameCard } from './cards/GameCard'
import { Modal, Button, Spinner } from './ui'

interface OrbSearchProps {
  onAdd: (game: UserGame) => void
  disabled?: boolean
}

export function OrbSearch({ onAdd, disabled = false }: OrbSearchProps) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [pendingGame, setPendingGame] = useState<Game | null>(null)
  const [adding, setAdding] = useState(false)

  async function handleSearch() {
    if (!query.trim() || disabled) return
    setExpanded(true)
    setSearchStatus('loading')
    const data = await getGames({ q: query })
    setResults(data.games)
    setSearchStatus('done')
  }

  async function confirmAdd() {
    if (!pendingGame) return
    setAdding(true)
    try {
      const result = await apiAddUserGame({
        externalId: pendingGame.externalId,
        name: pendingGame.name,
        imageUrl: pendingGame.imageUrl,
      })
      onAdd(result.userGame)
      setPendingGame(null)
      setQuery('')
      setResults([])
      setSearchStatus('idle')
      setExpanded(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="w-full flex justify-center">
      {/* Orb / rectangle */}
      <div
        className="group relative bg-white border-black border-4 flex flex-col overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          width: expanded ? '100%' : '20rem',
          height: expanded ? '24rem' : '20rem',
          borderRadius: expanded ? '0.75rem' : '50%',
          paddingTop: expanded ? '1rem' : 'calc(50% - 1.25rem)',
        }}
      >
        {/* Search bar — hidden in idle, revealed on hover or when expanded */}
        <div
          className={`flex gap-2 items-center px-6 shrink-0 transition-opacity duration-300 ${
            expanded
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
          }`}
        >
          <input
            className="flex-1 bg-transparent border-b-2 border-black text-black text-sm font-mono placeholder:text-gray-400 outline-none pb-1"
            placeholder="Search games..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            disabled={disabled}
          />
          <button
            onClick={handleSearch}
            disabled={disabled || searchStatus === 'loading'}
            className="text-xs font-mono uppercase tracking-widest text-black hover:opacity-60 transition-opacity disabled:opacity-30"
          >
            Search
          </button>
        </div>

        {/* Results — only mounted when expanded */}
        {expanded && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 mt-3">
            {searchStatus === 'loading' && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
            {searchStatus === 'done' && results.length === 0 && (
              <p className="text-xs text-gray-400 font-mono text-center py-4">
                No results found.
              </p>
            )}
            {results.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {results.map(g => (
                  <GameCard key={g.externalId} game={g} onSelect={setPendingGame} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add realm confirmation modal */}
      <Modal isOpen={!!pendingGame} onClose={() => setPendingGame(null)} title="Add Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Add <strong>{pendingGame?.name}</strong> to your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPendingGame(null)}>
              Cancel
            </Button>
            <Button onClick={confirmAdd} disabled={adding}>
              {adding ? 'Adding...' : 'Add Realm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build --prefix apps/web
```

Expected: still the same error from Task 3 in `UserRealmsSection.tsx` — and no new errors from the new file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/OrbSearch.tsx
git commit -m "feat: create OrbSearch component with circle-to-rectangle morph and game search"
```

---

## Task 5: Rewrite HomePage with binder layout

**Files:**
- Modify: `apps/web/src/pages/HomePage.tsx`

**Context:** The page now mirrors the LandingPage binder shell exactly (`bg-surface border-white border-2 w-1/2 flex flex-col items-center justify-between`). The top slot is the user's binder title, the middle is `OrbSearch`, the bottom is up to 3 `RealmCard` components. `PageLayout` is no longer used here (other pages continue to use it). `UserRealmsSection` is no longer imported.

- [ ] **Step 1: Rewrite HomePage.tsx**

Replace the entire file with:

```tsx
import { useAuth } from '../context/AuthContext'
import { type UserGame } from '../api/endpoints/userGames'
import { useUserGames } from '../hooks/useUserGame'
import { OrbSearch } from '../components/OrbSearch'
import { RealmCard } from '../components/cards/RealmCard'
import { Spinner } from '../components/ui'
import { USER_GAME_LIMIT } from '../utils/limits'

export default function HomePage() {
  const { state: auth } = useAuth()
  const userGames = useUserGames()

  if (auth.status !== 'authenticated') return null

  const { username } = auth.user
  const displayName = username.split('@')[0]
  const visibleRealms = userGames.games.slice(0, 3)
  const atLimit = userGames.games.length >= USER_GAME_LIMIT

  return (
    <main className="flex-1 flex items-center justify-center py-4 overflow-hidden">
      <section className="h-full bg-surface border-white border-2 py-4 px-6 w-1/2 flex flex-col items-center justify-between overflow-hidden">

        <h1 className="font-display font-bold text-4xl text-text">
          {displayName}'s Binder
        </h1>

        {userGames.status === 'loading' ? (
          <Spinner />
        ) : (
          <OrbSearch
            onAdd={(game: UserGame) => userGames.addUserGame(game)}
            disabled={atLimit}
          />
        )}

        <div className="flex gap-4 w-3/4 justify-center items-start">
          {visibleRealms.length === 0 ? (
            <p className="text-xs font-mono text-muted text-center">
              Search above to add your first realm
            </p>
          ) : (
            visibleRealms.map(g => (
              <RealmCard key={g.id} userGame={g} />
            ))
          )}
        </div>

      </section>
    </main>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build --prefix apps/web
```

Expected: same `UserRealmsSection` error only. No errors in `HomePage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/HomePage.tsx
git commit -m "feat: rewrite HomePage with binder layout, OrbSearch, and realms strip"
```

---

## Task 6: Delete UserRealmsSection and verify clean build

**Files:**
- Delete: `apps/web/src/components/UserRealmsSection.tsx`

**Context:** `UserRealmsSection` is only imported by `HomePage`, which no longer uses it after Task 5. Deleting it resolves the TypeScript error introduced in Task 3 (it was the only file calling `RealmCard` with the now-removed `onRemove` prop).

- [ ] **Step 1: Delete the file**

```bash
rm apps/web/src/components/UserRealmsSection.tsx
```

- [ ] **Step 2: Confirm no remaining imports**

```bash
grep -r "UserRealmsSection" apps/web/src
```

Expected: no output (zero references).

- [ ] **Step 3: Type-check — expect clean build**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore: delete unused UserRealmsSection component"
```

---

## Task 7: Visual verification

**Context:** There is no frontend test suite. Verify the UI manually by running the dev server.

- [ ] **Step 1: Start services**

```bash
docker compose up -d
npm run dev
```

- [ ] **Step 2: Verify landing page (unauthenticated)**

Open `http://localhost:5173`. Check:
- [ ] Side nav visible on desktop (left column, black bg, w-64)
- [ ] Sign In and Sign Up buttons visible in the nav
- [ ] Magic Binder panel visible in the center (bordered, w-1/2)
- [ ] Orb circle visible inside the binder
- [ ] Hovering the orb reveals a search bar inside the circle

- [ ] **Step 3: Sign in and verify HomePage**

Sign in and navigate to `/home`. Check:
- [ ] Side nav is now dark surface, shows Home / Characters / Matches links stacked vertically
- [ ] Avatar visible at the bottom of the side nav; clicking opens dropdown
- [ ] Binder panel visible (bordered, w-1/2), title reads `{username}'s Binder`
- [ ] Orb circle is centered in the middle of the binder
- [ ] Hovering the orb reveals a search bar
- [ ] Typing a game name and pressing Enter expands the orb to a full-width rectangle; search bar moves to top
- [ ] Game results appear as a 2-col grid inside the rectangle
- [ ] Clicking a game card opens the Add Realm confirmation modal
- [ ] Confirming add: modal closes, orb morphs back to circle, realm card appears in the bottom strip
- [ ] With 0 realms: "Search above to add your first realm" prompt shown in the bottom strip
- [ ] Page does not scroll

- [ ] **Step 4: Verify other app pages**

Navigate to `/characters` and `/matches`. Check:
- [ ] Side nav stays fixed on the left
- [ ] Active nav link is highlighted in accent color
- [ ] Pages render their content to the right of the nav without horizontal overflow

- [ ] **Step 5: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "fix: visual tweaks from manual verification"
```
