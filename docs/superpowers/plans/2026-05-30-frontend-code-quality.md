# Frontend Code Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix code quality issues across the PartyUp React frontend: silent error handling, missing debounce, timer leaks, race conditions, and duplicated boilerplate.

**Architecture:** Work from foundational utility hooks outward — create shared hooks first (Tasks 1), then apply high-priority fixes that depend on them (Tasks 2–6), then apply the shared hooks to replace duplicated event-listener boilerplate (Task 7), then structural improvements (Tasks 8–12).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, React Router v6. No frontend test suite — verify by running `npm run dev --prefix apps/web` after each section.

---

## File Map

**New files:**
- `apps/web/src/hooks/useDebounce.ts` — generic debounce hook
- `apps/web/src/hooks/useClickOutside.ts` — click-outside detection hook
- `apps/web/src/hooks/useEscapeKey.ts` — Escape key handler hook
- `apps/web/src/components/cards/MatchCharacterDetail.tsx` — extracted from MatchesPage

**Modified files:**
- `apps/web/src/components/DiscoveryPanel.tsx` — silent error fix + debounced filters
- `apps/web/src/components/PendingLikesBar.tsx` — silent error fix + double-click guard
- `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx` — canAdvance validates required game fields
- `apps/web/src/hooks/useFieldDefinitions.ts` — store timeout ID, isMounted guard
- `apps/web/src/components/OrbSearch.tsx` — generation counter prevents stale results
- `apps/web/src/components/ui/Modal.tsx` — use useEscapeKey
- `apps/web/src/components/layout/NavBar.tsx` — use useClickOutside
- `apps/web/src/components/DiscoveryFilterMenu.tsx` — use useClickOutside + useEscapeKey
- `apps/web/src/components/character-wizard/types.ts` — export characterToFormData
- `apps/web/src/pages/CharacterPage.tsx` — import characterToFormData, remove local toFormData
- `apps/web/src/pages/MatchesPage.tsx` — import extracted MatchCharacterDetail
- `apps/web/src/components/CharacterGallery.tsx` — delete commented-out block
- `apps/web/src/components/RealmRightPage.tsx` — delete commented-out block + remove unused DOMPurify import
- `apps/web/src/pages/LandingPage.tsx` — add aria-labels to nav buttons
- `apps/web/src/components/ui/PlatformIcon.tsx` — add aria-label
- `apps/web/src/hooks/useUserGame.ts` → rename to `useUserGames.ts`
- `apps/web/src/pages/HomePage.tsx` — update import path after rename

---

## Task 1: Create utility hooks

**Files:**
- Create: `apps/web/src/hooks/useDebounce.ts`
- Create: `apps/web/src/hooks/useClickOutside.ts`
- Create: `apps/web/src/hooks/useEscapeKey.ts`

- [ ] **Step 1: Create useDebounce**

```typescript
// apps/web/src/hooks/useDebounce.ts
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
```

- [ ] **Step 2: Create useClickOutside**

```typescript
// apps/web/src/hooks/useClickOutside.ts
import { useEffect, type RefObject } from 'react'

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, onClose, enabled])
}
```

- [ ] **Step 3: Create useEscapeKey**

```typescript
// apps/web/src/hooks/useEscapeKey.ts
import { useEffect } from 'react'

export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') onEscape()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onEscape, enabled])
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useDebounce.ts apps/web/src/hooks/useClickOutside.ts apps/web/src/hooks/useEscapeKey.ts
git commit -m "feat: add useDebounce, useClickOutside, useEscapeKey utility hooks"
```

---

## Task 2: Fix DiscoveryPanel — silent error + debounced filters

**Files:**
- Modify: `apps/web/src/components/DiscoveryPanel.tsx`

Current problems: `catch { /* fail silently */ }` on like/dislike; no debounce on filter changes so every platform toggle fires a full API refetch.

- [ ] **Step 1: Replace DiscoveryPanel**

```typescript
// apps/web/src/components/DiscoveryPanel.tsx
import { useEffect, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { useDebounce } from '../hooks/useDebounce'
import { SwipeCard } from './cards/SwipeCard'
import { Spinner, EmptyState } from './ui'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character
  onMatch: () => void
  filters: Record<string, string>
  activePlatforms: string[]
}

export function DiscoveryPanel({
  gameId,
  myCharacter,
  onMatch,
  filters,
  activePlatforms,
}: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')

  const debouncedFilters = useDebounce(filters, 400)
  const debouncedPlatforms = useDebounce(activePlatforms, 400)

  useEffect(() => {
    setStatus('loading')
    const activeFilters = Object.fromEntries(
      Object.entries(debouncedFilters).filter(([, v]) => v !== '')
    )
    discoverCharacters(
      gameId,
      activeFilters,
      debouncedPlatforms.length > 0 ? debouncedPlatforms : undefined
    )
      .then(chars => {
        setQueue(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId, debouncedFilters, debouncedPlatforms])

  async function handleInteract(type: 'Like' | 'Dislike') {
    const current = queue[0]
    if (!current) return
    try {
      const res = await interactWithCharacter(myCharacter.id, current.id, type)
      if (res.isMatch) onMatch()
    } catch (err) {
      console.error(`Failed to ${type.toLowerCase()} character:`, err)
    }
    setQueue(q => {
      const next = q.slice(1)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full gap-4">
      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner label="Scanning the realm..." /></div>
      )}

      {(status === 'empty' || status === 'error') && (
        <EmptyState
          message={status === 'empty' ? 'All caught up — check back later.' : 'Could not load players.'}
        />
      )}

      {status === 'ready' && (
        <div className="relative mx-auto w-full h-full min-h-0">
          {queue.slice(0, 2).map((char, i) => (
            <SwipeCard
              key={char.id}
              character={char}
              onLike={() => handleInteract('Like')}
              onDislike={() => handleInteract('Dislike')}
              isTop={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/DiscoveryPanel.tsx
git commit -m "fix: debounce discovery filters and log interaction errors"
```

---

## Task 3: Fix PendingLikesBar — silent error + double-click guard

**Files:**
- Modify: `apps/web/src/components/PendingLikesBar.tsx`

Current problems: `catch { /* fail silently */ }` on interact; no guard against double-clicking like/pass before the first request resolves.

- [ ] **Step 1: Replace PendingLikesBar**

```typescript
// apps/web/src/components/PendingLikesBar.tsx
import { useEffect, useState } from 'react'
import {
  getPendingLikes,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
} from '../api/endpoints/characters'
import { PendingLikeCard } from './cards/PendingLikeCard'

interface PendingLikesBarProps {
  character: Character
  onMatch: () => void
}

export function PendingLikesBar({ character, onMatch }: PendingLikesBarProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<DiscoverCharacter[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    getPendingLikes(character.id).then(setPending).catch(() => {})
  }, [character.id])

  async function handleInteract(toCharacterId: string, type: 'Like' | 'Dislike') {
    if (processing === toCharacterId) return
    setProcessing(toCharacterId)
    try {
      const res = await interactWithCharacter(character.id, toCharacterId, type)
      if (res.isMatch) onMatch()
    } catch (err) {
      console.error(`Failed to ${type.toLowerCase()} pending character:`, err)
    }
    setPending(p => p.filter(c => c.id !== toCharacterId))
    setProcessing(null)
  }

  if (pending.length === 0) return null

  return (
    <div className="relative border-t border-border">
      {open && (
        <div className="absolute bottom-full left-0 right-0 z-50 bg-surface border-t border-border px-4 pt-4 pb-2 shadow-lg">
          <div className="flex gap-3">
            {pending.slice(0, 3).map(c => (
              <PendingLikeCard
                key={c.id}
                character={c}
                onLike={() => handleInteract(c.id, 'Like')}
                onDislike={() => handleInteract(c.id, 'Dislike')}
              />
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-2.5 text-xs font-mono text-muted uppercase tracking-widest hover:text-text transition-colors flex items-center justify-between"
      >
        <span>{pending.length} pending {pending.length === 1 ? 'like' : 'likes'}</span>
        <span>{open ? '▼' : '▲'}</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/PendingLikesBar.tsx
git commit -m "fix: log pending like errors and guard against double-click interactions"
```

---

## Task 4: Fix CreateCharacterWizard — validate required game fields

**Files:**
- Modify: `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx:42-46`

`canAdvance()` currently returns `true` for all steps past step 0. Step 1 (Gameplay) should block advancement if any required field (per `GameFieldDefinition.isRequired`) is empty.

- [ ] **Step 1: Replace the canAdvance function**

Find this block in `CreateCharacterWizard.tsx`:
```typescript
  function canAdvance() {
    if (step === 0)
      return data.platform.trim() !== '' && data.platformHandle.trim() !== '' && data.name.trim() !== ''
    return true
  }
```

Replace with:
```typescript
  function canAdvance() {
    if (step === 0)
      return data.platform.trim() !== '' && data.platformHandle.trim() !== '' && data.name.trim() !== ''
    if (step === 1) {
      const required = fieldDefs?.fields.filter(f => f.isRequired) ?? []
      return required.every(f => (data.gameFields[f.id] ?? '').trim() !== '')
    }
    return true
  }
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/character-wizard/CreateCharacterWizard.tsx
git commit -m "fix: block wizard advancement when required game fields are empty"
```

---

## Task 5: Fix useFieldDefinitions — store timeout ID and isMounted guard

**Files:**
- Modify: `apps/web/src/hooks/useFieldDefinitions.ts`

Current problem: `setTimeout` return value is never stored, so the cleanup function (`pollCount.current = MAX_POLLS`) cannot actually cancel a timer that has already fired. Additionally, `setData` / `setLoading` can update state after the component unmounts.

- [ ] **Step 1: Replace useFieldDefinitions**

```typescript
// apps/web/src/hooks/useFieldDefinitions.ts
import { useEffect, useRef, useState } from "react";
import { getFieldDefinitions, type FieldDefinitionsResponse } from "../api/endpoints/games";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export function useFieldDefinitions(gameId: string | null) {
  const [data, setData] = useState<FieldDefinitionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const pollCount = useRef(0);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!gameId) return;

    isMounted.current = true;
    setLoading(true);
    pollCount.current = 0;

    async function fetchOnce() {
      try {
        const result = await getFieldDefinitions(gameId!);
        if (!isMounted.current) return;
        setData(result);

        if (result.schemaStatus === "Pending" || result.schemaStatus === "Generating") {
          if (pollCount.current < MAX_POLLS) {
            pollCount.current++;
            timeoutId.current = setTimeout(fetchOnce, POLL_INTERVAL_MS);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch {
        if (isMounted.current) setLoading(false);
      }
    }

    fetchOnce();

    return () => {
      isMounted.current = false;
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [gameId]);

  return { data, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/useFieldDefinitions.ts
git commit -m "fix: cancel polling timeout and guard setState on unmount in useFieldDefinitions"
```

---

## Task 6: Fix OrbSearch — prevent stale search results

**Files:**
- Modify: `apps/web/src/components/OrbSearch.tsx:20-27`

If the user triggers two searches in quick succession, whichever resolves last wins and may display stale results. A generation counter makes later-resolving responses discard themselves.

- [ ] **Step 1: Add the searchGen ref and update handleSearch**

At the top of the `OrbSearch` function body, after the existing `useState` declarations, add:
```typescript
  const searchGen = useRef(0)
```

Then replace `handleSearch`:
```typescript
  async function handleSearch() {
    if (!query.trim() || disabled) return
    setExpanded(true)
    setSearchStatus('loading')
    const gen = ++searchGen.current
    try {
      const data = await getGames({ q: query })
      if (gen !== searchGen.current) return
      setResults(data.games)
      setSearchStatus('done')
    } catch {
      if (gen === searchGen.current) setSearchStatus('done')
    }
  }
```

Also add `useRef` to the import at line 1:
```typescript
import { useRef, useState } from 'react'
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/OrbSearch.tsx
git commit -m "fix: discard stale OrbSearch results using a generation counter"
```

---

## Task 7: Apply useClickOutside and useEscapeKey to Modal, NavBar, DiscoveryFilterMenu

**Files:**
- Modify: `apps/web/src/components/ui/Modal.tsx`
- Modify: `apps/web/src/components/layout/NavBar.tsx`
- Modify: `apps/web/src/components/DiscoveryFilterMenu.tsx`

Replaces three hand-rolled `document.addEventListener` patterns with the shared hooks.

- [ ] **Step 1: Update Modal**

Replace the entire file:
```typescript
// apps/web/src/components/ui/Modal.tsx
import { useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  useEscapeKey(onClose, isOpen)

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 bg-surface border border-border rounded-lg w-full max-w-md shadow-xl">
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-display font-semibold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-text transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 2: Update NavBar**

Replace the `useEffect` block in NavBar (lines 19–27) with the hook. The full updated file:

```typescript
// apps/web/src/components/layout/NavBar.tsx
import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import { Avatar } from '../ui'

type Variant = 'landing' | 'app'

interface NavBarProps {
  variant: Variant
  onSignIn?: () => void
  onSignUp?: () => void
}

export function NavBar({ variant }: NavBarProps) {
  const { state, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const closeDropdown = useCallback(() => setDropdownOpen(false), [])
  useClickOutside(dropdownRef, closeDropdown)

  const username = state.status === 'authenticated' ? state.user.username : ''

  return (
    <nav
      className={`pointer-events-none z-40 flex w-full h-16 px-6 absolute md:w-52 md:h-screen md:flex-col md:justify-between md:py-8 md:ps-8 md:top-0
 ${variant === 'landing'
          ? ''
          : ''
        }`}
    >
      <Link to="/home" className="pointer-events-auto font-display font-bold text-text text-lg tracking-wide">
        PartyUp
      </Link>

      {variant === 'app' && username && (
        <div className="pointer-events-auto relative" ref={dropdownRef}>
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

- [ ] **Step 3: Update DiscoveryFilterMenu**

Replace the entire file:
```typescript
// apps/web/src/components/DiscoveryFilterMenu.tsx
import { useState, useRef, useCallback } from 'react'
import { DiscoveryFilters } from './DiscoveryFilters'
import { useClickOutside } from '../hooks/useClickOutside'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { GameFieldDefinition } from '../api/endpoints/games'

interface DiscoveryFilterMenuProps {
  fields: GameFieldDefinition[]
  gamePlatforms: string[]
  filters: Record<string, string>
  activePlatforms: string[]
  onChange: (key: string, value: string) => void
  onPlatformChange: (platforms: string[]) => void
  className?: string
}

export function DiscoveryFilterMenu({
  fields,
  gamePlatforms,
  filters,
  activePlatforms,
  onChange,
  onPlatformChange,
  className = '',
}: DiscoveryFilterMenuProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setOpen(false), [])
  useClickOutside(dropdownRef, closeMenu, open)
  useEscapeKey(closeMenu, open)

  const hasFilterableFields = fields.some(f => f.isFilterable && f.type === 'Select')
  const showMenu = hasFilterableFields || gamePlatforms.length > 0
  const activeCount = Object.keys(filters).length + (activePlatforms.length > 0 ? 1 : 0)

  if (!showMenu) return null

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
          activeCount > 0
            ? 'border-accent text-accent bg-accent/10'
            : 'border-border text-muted hover:border-accent hover:text-text'
        }`}
      >
        {activeCount > 0 ? `Filters · ${activeCount}` : 'Filters'}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-lg p-4 shadow-xl"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            minWidth: '280px',
          }}
        >
          <DiscoveryFilters
            fields={fields}
            activeFilters={filters}
            onChange={onChange}
            gamePlatforms={gamePlatforms}
            activePlatforms={activePlatforms}
            onPlatformChange={onPlatformChange}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/Modal.tsx apps/web/src/components/layout/NavBar.tsx apps/web/src/components/DiscoveryFilterMenu.tsx
git commit -m "refactor: replace inline event listeners with useClickOutside and useEscapeKey hooks"
```

---

## Task 8: Extract MatchCharacterDetail component

**Files:**
- Create: `apps/web/src/components/cards/MatchCharacterDetail.tsx`
- Modify: `apps/web/src/pages/MatchesPage.tsx`

The `MatchCharacterDetail` function currently lives inline inside `MatchesPage.tsx`, making it invisible to the rest of the codebase.

- [ ] **Step 1: Create the component file**

```typescript
// apps/web/src/components/cards/MatchCharacterDetail.tsx
import type { CharacterSummary } from '../../api/endpoints/matches'

interface MatchCharacterDetailProps {
  character: CharacterSummary
}

export function MatchCharacterDetail({ character }: MatchCharacterDetailProps) {
  return (
    <div className="flex gap-3">
      <div
        className="w-20 h-24 rounded-lg overflow-hidden flex-shrink-0"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-2xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-text text-sm">{character.platformHandle}</p>
        <p className="text-xs text-muted mb-2">{character.name}</p>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-3 leading-relaxed mb-2">{character.bio}</p>
        )}
        {character.additionalNotes && (
          <p className="text-xs text-muted line-clamp-2 leading-relaxed">{character.additionalNotes}</p>
        )}
        {character.gameFields.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {character.gameFields.map(f => (
              <p key={f.key} className="text-xs">
                <span className="text-muted">{f.label}: </span>
                <span className="text-text">{f.value}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update MatchesPage to import it**

Remove the inline `MatchCharacterDetail` function (lines 10–50 of the current file) and add the import. The top of `MatchesPage.tsx` should become:

```typescript
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { BinderLayout } from '../components/layout/BinderLayout'
import { EmptyState, Spinner } from '../components/ui'
import { MatchGallery } from '../components/MatchGallery'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { MatchCharacterDetail } from '../components/cards/MatchCharacterDetail'
```

(The `CharacterSummary` type import is no longer needed in this file since it moved to the component.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/MatchCharacterDetail.tsx apps/web/src/pages/MatchesPage.tsx
git commit -m "refactor: extract MatchCharacterDetail into its own component"
```

---

## Task 9: Move characterToFormData to wizard types

**Files:**
- Modify: `apps/web/src/components/character-wizard/types.ts`
- Modify: `apps/web/src/pages/CharacterPage.tsx`

The `toFormData` helper lives locally in `CharacterPage.tsx`. Moving it alongside `CharacterFormData` makes it reusable and co-located with its type.

- [ ] **Step 1: Add characterToFormData to types.ts**

Add this import and function at the end of `apps/web/src/components/character-wizard/types.ts`:

```typescript
import type { Character } from '../../api/endpoints/characters'

export function characterToFormData(c: Character): Partial<CharacterFormData> {
  return {
    platform: c.platform ?? '',
    platformHandle: c.platformHandle ?? '',
    name: c.name ?? '',
    imageUrl: c.imageUrl ?? '',
    imageFile: null,
    bio: c.bio ?? '',
    additionalNotes: c.additionalNotes ?? '',
    timeZone: c.timeZone ?? '',
    activeTimes: c.activeTimes ?? [],
    usesVoiceChat: c.usesVoiceChat,
    languages: c.languages ?? [],
    gameFields: Object.fromEntries((c.gameFields ?? []).map(f => [f.fieldDefinitionId, f.value])),
  }
}
```

- [ ] **Step 2: Update CharacterPage to use the import**

In `apps/web/src/pages/CharacterPage.tsx`:

1. Remove the local `toFormData` function (lines 13–28).
2. Update the import from character-wizard/types to include `characterToFormData`:

```typescript
import type { CharacterFormData } from '../components/character-wizard/types'
import { characterToFormData } from '../components/character-wizard/types'
```

3. Update the one call site (line 107) from `toFormData(selected)` to `characterToFormData(selected)`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/character-wizard/types.ts apps/web/src/pages/CharacterPage.tsx
git commit -m "refactor: move characterToFormData to wizard types module"
```

---

## Task 10: Rename useUserGame.ts to useUserGames.ts

**Files:**
- Rename: `apps/web/src/hooks/useUserGame.ts` → `apps/web/src/hooks/useUserGames.ts`
- Modify: `apps/web/src/pages/HomePage.tsx` (update import path)

The filename is singular but the export and function are plural. The file already has a comment on line 1 saying `// hooks/useUserGames.ts`.

- [ ] **Step 1: Rename the file**

```bash
git mv apps/web/src/hooks/useUserGame.ts apps/web/src/hooks/useUserGames.ts
```

- [ ] **Step 2: Remove the stale comment from the renamed file**

In `apps/web/src/hooks/useUserGames.ts`, delete line 1 (`// hooks/useUserGames.ts`) — it was a reminder to rename and is no longer needed.

- [ ] **Step 3: Update the import in HomePage.tsx**

In `apps/web/src/pages/HomePage.tsx`, change:
```typescript
import { useUserGames } from '../hooks/useUserGame'
```
to:
```typescript
import { useUserGames } from '../hooks/useUserGames'
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useUserGames.ts apps/web/src/pages/HomePage.tsx
git commit -m "refactor: rename useUserGame.ts to useUserGames.ts to match export name"
```

---

## Task 11: Remove commented-out code

**Files:**
- Modify: `apps/web/src/components/CharacterGallery.tsx:22-24`
- Modify: `apps/web/src/components/RealmRightPage.tsx:14-31`

Dead code blocks that are not referenced anywhere. Also: `RealmRightPage` imports `DOMPurify` which is only used inside the commented block — that import also needs removing.

- [ ] **Step 1: Remove commented block in CharacterGallery**

Delete lines 22–24 of `CharacterGallery.tsx`:
```tsx
      {/* <p className="text-xs font-mono text-muted mb-4">
        {characters.length} / {CHARACTER_LIMIT} characters
      </p> */}
```

Also remove the now-unused import on line 3:
```typescript
import { CHARACTER_LIMIT } from '../utils/limits'
```

- [ ] **Step 2: Remove commented block and DOMPurify import in RealmRightPage**

Delete lines 1 (`import DOMPurify from 'dompurify'`) and lines 14–31 (the commented `<div>` block with game details).

The resulting file should look like:
```typescript
// apps/web/src/components/RealmRightPage.tsx
import type { UserGameDetail } from '../api/endpoints/userGames'
import { MatchGallery } from './MatchGallery'

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
}

export function RealmRightPage({ userGame: _userGame, gameId }: RealmRightPageProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-[5] px-6 overflow-hidden">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4 mt-2">Matches</h2>
        <MatchGallery gameId={gameId} limit={6} />
      </div>
    </div>
  )
}
```

Note: `userGame` prop is still in the interface in case it's used by callers — prefix with `_userGame` to satisfy the TypeScript `noUnusedLocals` rule while keeping the prop signature stable.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/CharacterGallery.tsx apps/web/src/components/RealmRightPage.tsx
git commit -m "chore: remove commented-out code and unused imports"
```

---

## Task 12: Add aria-labels to LandingPage and PlatformIcon

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx:86-94`
- Modify: `apps/web/src/components/ui/PlatformIcon.tsx:11-17`

Screen readers cannot interpret the raw arrow HTML entities or `title` attributes reliably.

- [ ] **Step 1: Add aria-labels in LandingPage**

In `LandingPage.tsx`, find the three control buttons (lines 86–94) and add `aria-label` attributes:

```tsx
              <button
                onClick={goPrev}
                aria-label="Previous step"
                className="text-muted hover:text-black transition-colors text-lg leading-none"
              >
                &#8592;
              </button>
              <button
                onClick={() => setPaused(p => !p)}
                aria-label={paused ? 'Resume' : 'Pause'}
                className="text-muted hover:text-black transition-colors text-lg leading-none"
              >
                {paused ? '▶' : '⏸'}
              </button>
              <button
                onClick={goNext}
                aria-label="Next step"
                className="text-muted hover:text-black transition-colors text-lg leading-none"
              >
                &#8594;
              </button>
```

- [ ] **Step 2: Add aria-label in PlatformIcon**

In `PlatformIcon.tsx`, change the `div` attributes:
```tsx
    <div
      className="rounded-full border-1 border-black flex items-center justify-center shrink-0"
      style={{ width: size, height: size, backgroundColor: bg }}
      aria-label={`${platform} platform`}
      title={platform}
    >
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/LandingPage.tsx apps/web/src/components/ui/PlatformIcon.tsx
git commit -m "fix: add aria-labels to LandingPage controls and PlatformIcon"
```

---

## Self-Review

**Spec coverage check:**

| Issue | Task |
|---|---|
| Silent errors — DiscoveryPanel | Task 2 |
| Silent errors — PendingLikesBar | Task 3 |
| Discovery filter debounce | Task 2 |
| canAdvance validation gap | Task 4 |
| useFieldDefinitions timer/isMounted | Task 5 |
| OrbSearch stale results | Task 6 |
| useClickOutside/useEscapeKey duplication | Tasks 1 + 7 |
| MatchCharacterDetail inline component | Task 8 |
| characterToFormData inline function | Task 9 |
| useUserGame.ts filename mismatch | Task 10 |
| Commented-out code | Task 11 |
| Accessibility aria-labels | Task 12 |
| PendingLikesBar double-click | Task 3 |

**Placeholder scan:** No TBDs, no "add appropriate" language, all code is complete.

**Type consistency:**
- `characterToFormData` defined in Task 9 Step 1, used in Step 2 — matches.
- `MatchCharacterDetail` props use `CharacterSummary` from `'../../api/endpoints/matches'` — this type exists in the file already (MatchesPage imports it).
- `useDebounce<T>` is generic — usage in DiscoveryPanel with `Record<string,string>` and `string[]` is valid.
- `useClickOutside` takes `RefObject<HTMLElement | null>` — NavBar uses `useRef<HTMLDivElement>(null)` which is assignable.
