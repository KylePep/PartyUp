# Card Polish & Filter Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all character cards to a single portrait TCG format with identical fixed section heights, move discovery filters into an overlay dropdown/modal, default platform filter to all platforms, and position the mobile filter button above the character panel.

**Architecture:** Card faces are restructured with fixed pixel heights — 52px nameplate top bar (surface-raised background), 300px art box (full card width, no side margins), flex-1 bottom panel — so any image crops identically across SwipeCard, CharacterCard, and MatchCard. Filter state lifts from DiscoveryPanel to RealmPage; a new `DiscoveryFilterMenu` renders as a position:absolute dropdown on desktop and reuses the existing `Modal` on mobile. The mobile filter trigger is rendered by RealmPage above CharacterPanel; the desktop trigger is rendered inside DiscoveryPanel.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + existing `Modal` component

---

## File Map

| Action | Path |
|--------|------|
| Rewrite | `apps/web/src/components/cards/SwipeCard.tsx` |
| Rewrite | `apps/web/src/components/cards/CharacterCard.tsx` |
| Rewrite | `apps/web/src/components/cards/MatchCard.tsx` |
| Create  | `apps/web/src/components/DiscoveryFilterMenu.tsx` |
| Modify  | `apps/web/src/components/DiscoveryPanel.tsx` |
| Modify  | `apps/web/src/pages/RealmPage.tsx` |

`DiscoveryFilters.tsx` is **not modified** — it stays as pure filter content, used inside DiscoveryFilterMenu.

---

## Task 1: Rewrite SwipeCard with fixed section heights

**Files:**
- Rewrite: `apps/web/src/components/cards/SwipeCard.tsx`

- [ ] **Step 1: Overwrite SwipeCard.tsx**

```tsx
import { useState } from 'react'
import { Badge, Button } from '../ui'
import { type DiscoverCharacter } from '../../api/endpoints/characters'
import { FlippableCard } from './FlippableCard'

type ExitDirection = 'left' | 'right' | null

interface SwipeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
  isTop: boolean
}

const accentBorder = {
  border: '3px solid var(--color-accent)',
  boxShadow: '0 0 28px rgba(124, 111, 205, 0.50)',
}

function SwipeFront({ character }: { character: DiscoverCharacter }) {
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', ...accentBorder }}
    >
      {/* Nameplate top bar — fixed height */}
      <div
        className="h-[52px] flex items-center justify-between px-3 flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span className="font-display font-bold text-text text-base truncate">{character.name}</span>
        {character.platform && (
          <span className="text-xs font-mono text-muted ml-2 flex-shrink-0">{character.platform}</span>
        )}
      </div>
      {/* Art box — fixed height, full card width */}
      <div
        className="h-[300px] flex-shrink-0 overflow-hidden"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* Bottom panel — takes remaining space */}
      <div className="flex-1 px-3 pt-2 pb-2 flex flex-col overflow-hidden">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
        </div>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-2 flex-1">{character.bio}</p>
        )}
        <p className="text-xs text-muted text-center mt-auto" style={{ opacity: 0.5 }}>↑ tap for more</p>
      </div>
    </div>
  )
}

function SwipeBack({ character }: { character: DiscoverCharacter }) {
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: '#000', ...accentBorder }}
    >
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <p className="font-display font-bold text-text text-lg mb-3">{character.name}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
          {character.mainRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Role</span>
              <Badge variant="role">{character.mainRole}</Badge>
            </div>
          )}
          {character.secondaryRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Alt Role</span>
              <Badge variant="role">{character.secondaryRole}</Badge>
            </div>
          )}
          {character.rank && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Rank</span>
              <Badge variant="rank">{character.rank}</Badge>
            </div>
          )}
          {character.region && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Region</span>
              <Badge variant="region">{character.region}</Badge>
            </div>
          )}
          {character.playstyle && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Playstyle</span>
              <Badge>{character.playstyle}</Badge>
            </div>
          )}
          {character.usesVoiceChat != null && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Voice</span>
              <Badge>{character.usesVoiceChat ? 'Yes' : 'No'}</Badge>
            </div>
          )}
        </div>
        {character.preferredModes.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Modes</span>
            <div className="flex flex-wrap gap-1">
              {character.preferredModes.map(m => <Badge key={m}>{m}</Badge>)}
            </div>
          </div>
        )}
        {character.languages && character.languages.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Languages</span>
            <div className="flex flex-wrap gap-1">
              {character.languages.map(l => <Badge key={l}>{l}</Badge>)}
            </div>
          </div>
        )}
        {character.gameFields.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Game Fields</span>
            <div className="grid grid-cols-2 gap-1">
              {character.gameFields.map(f => (
                <div key={f.key} className="text-xs">
                  <span className="text-muted">{f.label}: </span>
                  <span className="text-text">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {character.bio && (
          <div>
            <span className="text-xs text-muted block mb-1">Bio</span>
            <p className="text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
}

export function SwipeCard({ character, onLike, onDislike, isTop }: SwipeCardProps) {
  const [exiting, setExiting] = useState<ExitDirection>(null)

  function handle(dir: ExitDirection, action: () => void) {
    setExiting(dir)
    setTimeout(action, 380)
  }

  const animClass = isTop
    ? exiting === 'right'
      ? '[animation:slide-out-right_0.38s_ease_forwards]'
      : exiting === 'left'
      ? '[animation:slide-out-left_0.38s_ease_forwards]'
      : '[animation:slide-in-left_0.35s_ease_forwards]'
    : '[animation:card-enter_0.35s_ease_forwards]'

  return (
    <div
      className={`absolute inset-0 flex flex-col ${animClass}`}
      style={{
        zIndex: isTop ? 2 : 1,
        transform: isTop ? undefined : 'scale(0.97) translateY(8px)',
      }}
    >
      <FlippableCard
        front={<SwipeFront character={character} />}
        back={<SwipeBack character={character} />}
        className="flex-1 min-h-0"
      />
      {isTop && (
        <div className="flex gap-3 flex-shrink-0 mt-2">
          <Button
            variant="secondary"
            className="flex-1 border-danger/50 text-danger hover:bg-danger hover:text-white hover:border-danger"
            onClick={() => handle('left', onDislike)}
            disabled={!!exiting}
          >
            Pass
          </Button>
          <Button
            className="flex-1"
            onClick={() => handle('right', onLike)}
            disabled={!!exiting}
          >
            Like
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```
npm run build --prefix apps/web
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/SwipeCard.tsx
git commit -m "feat: update SwipeCard with fixed section heights and stronger TCG styling"
```

---

## Task 2: Rewrite CharacterCard with fixed section heights

**Files:**
- Rewrite: `apps/web/src/components/cards/CharacterCard.tsx`

- [ ] **Step 1: Overwrite CharacterCard.tsx**

```tsx
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import type { Character } from '../../api/endpoints/characters'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="h-[472px] rounded-xl flex flex-col overflow-hidden cursor-pointer transition-all hover:brightness-110"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
      }}
      onClick={() => navigate(`/characters/${character.id}`)}
    >
      {/* Nameplate top bar — fixed height */}
      <div
        className="h-[52px] flex items-center justify-between px-3 flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span className="font-display font-semibold text-text text-sm truncate">{character.name}</span>
        {character.platformHandle && (
          <span className="text-xs font-mono text-muted ml-2 flex-shrink-0 truncate max-w-[50%]">
            {character.platformHandle}
          </span>
        )}
      </div>
      {/* Art box — fixed height, full card width */}
      <div
        className="h-[300px] flex-shrink-0 overflow-hidden"
        style={{ borderBottom: '1px solid var(--color-border)' }}
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
      {/* Bottom panel — takes remaining space (~120px) */}
      <div className="flex-1 px-3 py-2 flex flex-col overflow-hidden">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        </div>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-2 flex-1">{character.bio}</p>
        )}
        {(onEdit || onDelete) && (
          <div
            className="flex gap-1 mt-auto flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            {onEdit && (
              <Button
                variant="secondary"
                className="text-xs px-2 py-1"
                onClick={() => onEdit(character)}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="secondary"
                className="text-xs px-2 py-1 text-danger border-danger/50 hover:bg-danger hover:text-white"
                onClick={() => onDelete(character)}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```
npm run build --prefix apps/web
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/CharacterCard.tsx
git commit -m "feat: update CharacterCard to 472px portrait TCG format with fixed section heights"
```

---

## Task 3: Rewrite MatchCard with fixed section heights

**Files:**
- Rewrite: `apps/web/src/components/cards/MatchCard.tsx`

- [ ] **Step 1: Overwrite MatchCard.tsx**

```tsx
import { Badge } from '../ui'
import type { CharacterSummary } from '../../api/endpoints/matches'
import { FlippableCard } from './FlippableCard'

interface MatchCardProps {
  character: CharacterSummary
  gameName: string
  matchedAt: string
}

const successBorder = {
  border: '3px solid var(--color-success)',
  boxShadow: '0 0 28px rgba(82, 199, 122, 0.40)',
}

function MatchFront({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', ...successBorder }}
    >
      {/* Nameplate top bar — fixed height, platform handle primary */}
      <div
        className="h-[52px] flex flex-col justify-center px-3 flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <p className="font-display font-bold text-text text-sm truncate leading-tight">{character.platformHandle}</p>
        <p className="text-xs text-muted truncate leading-tight">{character.name}</p>
      </div>
      {/* Art box — fixed height, full card width */}
      <div
        className="h-[300px] flex-shrink-0 overflow-hidden"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* Bottom panel — takes remaining space */}
      <div className="flex-1 px-3 pt-2 pb-2 flex flex-col overflow-hidden">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
        </div>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-2 flex-1">{character.bio}</p>
        )}
        <p className="text-xs text-muted mt-auto" style={{ opacity: 0.5 }}>
          {gameName} · Matched {date}
        </p>
        <p className="text-xs text-muted text-center" style={{ opacity: 0.5 }}>↑ tap for more</p>
      </div>
    </div>
  )
}

function MatchBack({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: '#000', ...successBorder }}
    >
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <p className="font-display font-bold text-text text-lg">{character.platformHandle}</p>
        <p className="text-sm text-muted mb-3">{character.name} · {gameName}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
          {character.mainRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Role</span>
              <Badge variant="role">{character.mainRole}</Badge>
            </div>
          )}
          {character.secondaryRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Alt Role</span>
              <Badge variant="role">{character.secondaryRole}</Badge>
            </div>
          )}
          {character.rank && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Rank</span>
              <Badge variant="rank">{character.rank}</Badge>
            </div>
          )}
          {character.region && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Region</span>
              <Badge variant="region">{character.region}</Badge>
            </div>
          )}
          {character.playstyle && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Playstyle</span>
              <Badge>{character.playstyle}</Badge>
            </div>
          )}
        </div>
        {character.gameFields.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Game Fields</span>
            <div className="grid grid-cols-2 gap-1">
              {character.gameFields.map(f => (
                <div key={f.key} className="text-xs">
                  <span className="text-muted">{f.label}: </span>
                  <span className="text-text">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {character.bio && (
          <div>
            <span className="text-xs text-muted block mb-1">Bio</span>
            <p className="text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}
        <p className="text-xs text-muted mt-3">Matched {date}</p>
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
}

export function MatchCard({ character, gameName, matchedAt }: MatchCardProps) {
  return (
    <div className="h-[472px]">
      <FlippableCard
        front={<MatchFront character={character} gameName={gameName} matchedAt={matchedAt} />}
        back={<MatchBack character={character} gameName={gameName} matchedAt={matchedAt} />}
        className="h-full"
      />
    </div>
  )
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```
npm run build --prefix apps/web
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/MatchCard.tsx
git commit -m "feat: update MatchCard to 472px portrait TCG format with fixed section heights"
```

---

## Task 4: Create DiscoveryFilterMenu

**Files:**
- Create: `apps/web/src/components/DiscoveryFilterMenu.tsx`

- [ ] **Step 1: Create DiscoveryFilterMenu.tsx**

```tsx
import { useState, useRef, useEffect } from 'react'
import { DiscoveryFilters } from './DiscoveryFilters'
import { Modal } from './ui'
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

  const hasFilterableFields = fields.some(f => f.isFilterable && f.type === 'Select')
  const showMenu = hasFilterableFields || gamePlatforms.length > 0
  const activeCount = Object.keys(filters).length + (activePlatforms.length > 0 ? 1 : 0)

  // Close desktop dropdown on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  if (!showMenu) return null

  const triggerButton = (
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
  )

  const filterContent = (
    <DiscoveryFilters
      fields={fields}
      activeFilters={filters}
      onChange={onChange}
      gamePlatforms={gamePlatforms}
      activePlatforms={activePlatforms}
      onPlatformChange={onPlatformChange}
    />
  )

  return (
    <div className={className}>
      {/* Desktop: dropdown */}
      <div className="hidden lg:block relative" ref={dropdownRef}>
        {triggerButton}
        {open && (
          <div
            className="absolute top-full left-0 mt-1 z-50 rounded-lg p-4 shadow-xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              minWidth: '280px',
            }}
          >
            {filterContent}
          </div>
        )}
      </div>

      {/* Mobile: modal */}
      <div className="lg:hidden">
        {triggerButton}
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Filters">
          <div className="p-4">{filterContent}</div>
        </Modal>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```
npm run build --prefix apps/web
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/DiscoveryFilterMenu.tsx
git commit -m "feat: add DiscoveryFilterMenu with dropdown (desktop) and modal (mobile)"
```

---

## Task 5: Update DiscoveryPanel to receive lifted filter state

**Files:**
- Modify: `apps/web/src/components/DiscoveryPanel.tsx`

DiscoveryPanel stops owning filter state and `useFieldDefinitions`. It receives `filters`, `activePlatforms`, `fields`, and callbacks as props. It renders the desktop `DiscoveryFilterMenu` (`hidden lg:block`).

- [ ] **Step 1: Overwrite DiscoveryPanel.tsx**

```tsx
import { useEffect, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { SwipeCard } from './cards/SwipeCard'
import { DiscoveryFilterMenu } from './DiscoveryFilterMenu'
import { Spinner, EmptyState } from './ui'
import type { GameFieldDefinition } from '../api/endpoints/games'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character | null | 'loading'
  onMatch: () => void
  gamePlatforms?: string[]
  filters: Record<string, string>
  activePlatforms: string[]
  onFiltersChange: (key: string, value: string) => void
  onPlatformChange: (platforms: string[]) => void
  fields: GameFieldDefinition[]
}

export function DiscoveryPanel({
  gameId,
  myCharacter,
  onMatch,
  gamePlatforms = [],
  filters,
  activePlatforms,
  onFiltersChange,
  onPlatformChange,
  fields,
}: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')

  useEffect(() => {
    setStatus('loading')
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '')
    )
    discoverCharacters(
      gameId,
      activeFilters,
      activePlatforms.length > 0 ? activePlatforms : undefined
    )
      .then(chars => {
        setQueue(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId, filters, activePlatforms])

  async function handleInteract(type: 'Like' | 'Dislike') {
    const current = queue[0]
    if (!current || !myCharacter || myCharacter === 'loading') return
    try {
      const res = await interactWithCharacter(myCharacter.id, current.id, type)
      if (res.isMatch) onMatch()
    } catch { /* fail silently */ }
    setQueue(q => {
      const next = q.slice(1)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }

  if (!myCharacter || myCharacter === 'loading') {
    return <EmptyState message="Create a character to start matching" />
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop filter menu — hidden on mobile (mobile version rendered by RealmPage above CharacterPanel) */}
      <div className="hidden lg:block">
        <DiscoveryFilterMenu
          fields={fields}
          gamePlatforms={gamePlatforms}
          filters={filters}
          activePlatforms={activePlatforms}
          onChange={onFiltersChange}
          onPlatformChange={onPlatformChange}
        />
      </div>

      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner label="Scanning the realm..." /></div>
      )}

      {(status === 'empty' || status === 'error') && (
        <EmptyState
          message={status === 'empty' ? 'All caught up — check back later.' : 'Could not load players.'}
        />
      )}

      {status === 'ready' && (
        <div className="relative" style={{ height: '520px' }}>
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

- [ ] **Step 2: Build to verify — this will fail until RealmPage is updated (Step 3 of this task)**

```
npm run build --prefix apps/web
```

Expected: TypeScript errors in `RealmPage.tsx` because `DiscoveryPanel` now requires new props. That's expected — continue to Step 3.

- [ ] **Step 3: Update RealmPage.tsx**

Overwrite `apps/web/src/pages/RealmPage.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { useFieldDefinitions } from '../hooks/useFieldDefinitions'
import { CharacterPanel } from '../components/CharacterPanel'
import { DiscoveryPanel } from '../components/DiscoveryPanel'
import { DiscoveryFilterMenu } from '../components/DiscoveryFilterMenu'
import { MatchGallery } from '../components/MatchGallery'
import { Spinner } from '../components/ui'
import { PageLayout } from '../components/layout/PageLayout'

type Tab = 'discover' | 'matches'

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [myCharacter, setMyCharacter] = useState<Character | null | 'loading'>('loading')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('discover')
  const [matchBanner, setMatchBanner] = useState(false)

  // Filter state — lifted from DiscoveryPanel
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [activePlatforms, setActivePlatforms] = useState<string[]>([])
  const { data: fieldDefs } = useFieldDefinitions(gameId ?? null)
  const fields = fieldDefs?.schemaStatus === 'Generated' ? fieldDefs.fields : []

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (value === '') {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

  useEffect(() => {
    if (!gameId) return

    getUserGameByGameId(gameId)
      .then(ug => {
        setUserGame(ug)
        return getUserGameCharacters(ug.id)
      })
      .then(chars => {
        const mine = chars.find(c => c.userGameId) ?? null
        setMyCharacter(mine)
      })
      .catch(() => setMyCharacter(null))
      .finally(() => setLoading(false))
  }, [gameId])

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  const gamePlatforms = userGame?.platforms ?? []

  return (
    <>
      {matchBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-white px-6 py-3 rounded-lg font-mono text-sm shadow-lg">
          It's a match!
        </div>
      )}

      <div className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between gap-4">
          <div>
            <Link to="/home" className="text-xs font-mono text-muted uppercase tracking-widest hover:text-text transition-colors">
              ← Hub
            </Link>
            <h1 className="font-display font-bold text-2xl text-text mt-1">
              {userGame?.gameName ?? 'Realm'}
            </h1>
          </div>
          {userGame?.gameImageUrl && (
            <img
              src={userGame.gameImageUrl}
              alt={userGame.gameName}
              className="w-16 h-16 object-cover rounded"
            />
          )}
        </div>
        {userGame?.description != null && (
          <div
            className="px-4 md:px-8 pb-6"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userGame.description) }}
          />
        )}
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex gap-0">
          {(['discover', 'matches'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono text-xs uppercase tracking-widest px-6 py-3 border-b-2 transition-colors ${tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-text'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <PageLayout>
        {tab === 'discover' && (
          <div className="flex flex-col gap-4">
            {/* Mobile filter button — rendered above character panel, hidden on desktop */}
            <div className="lg:hidden">
              <DiscoveryFilterMenu
                fields={fields}
                gamePlatforms={gamePlatforms}
                filters={filters}
                activePlatforms={activePlatforms}
                onChange={handleFilterChange}
                onPlatformChange={setActivePlatforms}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <CharacterPanel gameId={gameId!} userGame={userGame} />
              <DiscoveryPanel
                gameId={gameId!}
                myCharacter={myCharacter}
                gamePlatforms={gamePlatforms}
                filters={filters}
                activePlatforms={activePlatforms}
                onFiltersChange={handleFilterChange}
                onPlatformChange={setActivePlatforms}
                fields={fields}
                onMatch={() => {
                  setMatchBanner(true)
                  setTimeout(() => setMatchBanner(false), 2500)
                }}
              />
            </div>
          </div>
        )}

        {tab === 'matches' && (
          <MatchGallery gameId={gameId} />
        )}
      </PageLayout>
    </>
  )
}
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```
npm run build --prefix apps/web
```

Expected: `✓ built in ...ms`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/DiscoveryPanel.tsx apps/web/src/pages/RealmPage.tsx
git commit -m "feat: lift filter state to RealmPage, add mobile filter button above CharacterPanel"
```

---

## Self-Review

- [x] **Spec: Fixed section heights (52/300/flex-1)** — All three card rewrites (Tasks 1–3) use `h-[52px]` top bar, `h-[300px]` art box, `flex-1` bottom panel
- [x] **Spec: Card-like nameplate** — Top bar uses `backgroundColor: var(--color-surface-raised)` + `borderBottom` in all cards
- [x] **Spec: Art box full card width, no mx margin** — Art box has no horizontal margin (no `mx-3`)
- [x] **Spec: Border-bottom separator on art box** — `borderBottom: '1px solid var(--color-border)'` on art box div in all cards
- [x] **Spec: 3px accent border on SwipeCard** — `border: '3px solid var(--color-accent)'` in `accentBorder`
- [x] **Spec: 3px success border on MatchCard** — `border: '3px solid var(--color-success)'` in `successBorder`
- [x] **Spec: CharacterCard 472px explicit height** — `h-[472px]` on outer div
- [x] **Spec: MatchCard 472px** — outer wrapper `h-[472px]` (up from 380px)
- [x] **Spec: DiscoveryFilterMenu dropdown desktop** — `position: absolute; top: 100%; left: 0` panel in `hidden lg:block` branch
- [x] **Spec: DiscoveryFilterMenu modal mobile** — `Modal` component in `lg:hidden` branch
- [x] **Spec: Click-outside + Escape to close dropdown** — `useEffect` listeners in DiscoveryFilterMenu
- [x] **Spec: Platform default to []** — `useState<string[]>([])` in RealmPage (was seeded from gamePlatforms before)
- [x] **Spec: Mobile filter button above CharacterPanel** — `<div className="lg:hidden"><DiscoveryFilterMenu .../></div>` before the grid in RealmPage
- [x] **Spec: Desktop filter button inside DiscoveryPanel** — `<div className="hidden lg:block"><DiscoveryFilterMenu .../></div>` in DiscoveryPanel
- [x] **Spec: Filter state lifted to RealmPage** — `filters`, `activePlatforms`, `handleFilterChange` all in RealmPage; `useFieldDefinitions` moved to RealmPage
- [x] **Type consistency** — `DiscoveryFilterMenu` props (`fields: GameFieldDefinition[]`, `gamePlatforms: string[]`, `filters: Record<string, string>`, `activePlatforms: string[]`, `onChange`, `onPlatformChange`) used consistently in Tasks 4, 5, and 6 (RealmPage). `DiscoveryPanel` new props (`filters`, `activePlatforms`, `onFiltersChange`, `onPlatformChange`, `fields`) defined in Task 5 and satisfied in Task 5 Step 3 (RealmPage update)
