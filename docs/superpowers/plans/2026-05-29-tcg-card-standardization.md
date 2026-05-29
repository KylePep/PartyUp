# TCG Card Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inconsistent card styles with three TCG base components (`StandardTcgCard`, `FullArtTcgCard`, `LandCard`) and wire all existing cards through them.

**Architecture:** Three new base components own all styling; existing card components become thin data-mapping wrappers. `CharacterDetailCard` gains optional callback props so it can replace the hardcoded detail panel on the Characters page. Global scrollbar styles are added to `index.css`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, CSS custom properties (`--color-*`, `--font-*` defined in `index.css @theme`).

---

## File Map

**New:**
- `apps/web/src/components/cards/StandardTcgCard.tsx` — base for CharacterCard, MatchCard front
- `apps/web/src/components/cards/FullArtTcgCard.tsx` — base for SwipeCard front, CharacterMiniCard, PendingLikeCard
- `apps/web/src/components/cards/LandCard.tsx` — base for GameCard, RealmCard

**Modified:**
- `apps/web/src/index.css` — minimal scrollbar
- `apps/web/src/components/cards/CharacterCard.tsx` — wrap StandardTcgCard
- `apps/web/src/components/cards/MatchCard.tsx` — MatchFront wraps StandardTcgCard
- `apps/web/src/components/cards/SwipeCard.tsx` — SwipeFront wraps FullArtTcgCard
- `apps/web/src/components/cards/CharacterMiniCard.tsx` — wrap FullArtTcgCard
- `apps/web/src/components/cards/PendingLikeCard.tsx` — wrap FullArtTcgCard
- `apps/web/src/components/cards/GameCard.tsx` — wrap LandCard
- `apps/web/src/components/cards/RealmCard.tsx` — wrap LandCard
- `apps/web/src/components/cards/CharacterDetailCard.tsx` — add `onBack?`, `onDelete?`, `deleting?` props
- `apps/web/src/pages/CharacterPage.tsx` — use CharacterDetailCard, remove hardcoded panel

---

## Task 1: Minimal Scrollbar

**Files:**
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Add scrollbar styles after the `body` block**

Open `apps/web/src/index.css`. After the closing `}` of the `body { ... }` block (around line 33), add:

```css
/* Minimal scrollbar — prevents scrollbar from overlapping card content */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/index.css
git commit -m "style: minimal scrollbar to prevent overlap on card backs"
```

---

## Task 2: Create StandardTcgCard

Six-zone base component. MTG creature card analog. Used by CharacterCard and MatchCard front.

**Files:**
- Create: `apps/web/src/components/cards/StandardTcgCard.tsx`

- [ ] **Step 1: Create the file**

Create `apps/web/src/components/cards/StandardTcgCard.tsx` with this content:

```tsx
interface StandardTcgCardProps {
  name: string
  platform?: string
  subtitle?: string
  imageUrl?: string
  statsLine?: React.ReactNode
  textBody?: React.ReactNode
  bottomStat?: string
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function StandardTcgCard({
  name,
  platform,
  subtitle,
  imageUrl,
  statsLine,
  textBody,
  bottomStat,
  className,
  onClick,
  children,
}: StandardTcgCardProps) {
  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col${onClick ? ' cursor-pointer hover:brightness-110 transition-all' : ''}${className ? ' ' + className : ''}`}
      style={{ border: '4px solid black', backgroundColor: 'var(--color-surface)' }}
      onClick={onClick}
    >
      {/* Header: name (left) + platform (right) */}
      <div
        className="h-[52px] flex items-center justify-between px-3 flex-shrink-0"
        style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="font-display font-semibold text-text text-sm truncate">{name}</span>
        {platform && (
          <span className="text-xs font-mono text-muted ml-2 flex-shrink-0 truncate max-w-[45%]">{platform}</span>
        )}
      </div>

      {/* Subtitle: region · language */}
      {subtitle && (
        <div className="px-3 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <span className="text-xs text-muted italic">{subtitle}</span>
        </div>
      )}

      {/* Image */}
      <div className="h-[220px] flex-shrink-0 overflow-hidden" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Stats line: badges, key attributes */}
      {statsLine && (
        <div
          className="px-3 py-2 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
        >
          {statsLine}
        </div>
      )}

      {/* Text body: bio (flex-1 so it fills remaining space) */}
      {textBody && (
        <div className="px-3 py-2 flex-1 overflow-hidden">
          {textBody}
        </div>
      )}

      {/* Bottom stat: rank/level — right-aligned */}
      {bottomStat && (
        <div
          className="px-3 py-1.5 flex justify-end flex-shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
        >
          <span className="font-mono text-xs text-muted">{bottomStat}</span>
        </div>
      )}

      {/* Children: action buttons, extra content */}
      {children && (
        <div className="px-3 pb-2 pt-1 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/StandardTcgCard.tsx
git commit -m "feat: add StandardTcgCard base component"
```

---

## Task 3: Create FullArtTcgCard

Image fills card, gradient header overlay at top, optional children at bottom. MTG full-art land analog. Used by SwipeCard front, CharacterMiniCard, PendingLikeCard.

**Files:**
- Create: `apps/web/src/components/cards/FullArtTcgCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
interface FullArtTcgCardProps {
  name: string
  platform?: string
  imageUrl?: string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

export function FullArtTcgCard({ name, platform, imageUrl, className, style, children }: FullArtTcgCardProps) {
  return (
    <div
      className={`relative overflow-hidden border-4 border-black rounded-xl${className ? ' ' + className : ''}`}
      style={style}
    >
      {/* Background image */}
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
          <span className="font-mono text-muted font-bold text-4xl">{name.charAt(0).toUpperCase()}</span>
        </div>
      )}

      {/* Top header overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-white text-sm font-bold truncate">{name}</span>
          {platform && (
            <span className="text-xs font-mono text-white/80 ml-2 flex-shrink-0">{platform}</span>
          )}
        </div>
      </div>

      {/* Bottom overlay for children */}
      {children && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/FullArtTcgCard.tsx
git commit -m "feat: add FullArtTcgCard base component"
```

---

## Task 4: Create LandCard

Game/realm card. Image dominant with header and player count footer. MTG land analog. Used by GameCard and RealmCard.

**Files:**
- Create: `apps/web/src/components/cards/LandCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
interface LandCardProps {
  name: string
  imageUrl?: string
  playerCount?: number
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function LandCard({ name, imageUrl, playerCount, className, onClick, children }: LandCardProps) {
  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col${onClick ? ' cursor-pointer' : ''}${className ? ' ' + className : ''}`}
      style={{ border: '4px solid black', backgroundColor: 'var(--color-surface)' }}
      onClick={onClick}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex-shrink-0"
        style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="font-display font-semibold text-text text-sm truncate block">{name}</span>
      </div>

      {/* Image */}
      <div className="aspect-video w-full overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
            <span className="text-muted text-xs font-mono uppercase">No image</span>
          </div>
        )}
      </div>

      {/* Footer: player count (right) + children (Enter button etc.) */}
      <div
        className="px-3 py-2 flex flex-col gap-2 flex-1"
        style={{ backgroundColor: 'var(--color-surface-raised)', borderTop: '1px solid var(--color-border)' }}
      >
        {children}
        {playerCount !== undefined && (
          <p className="text-xs font-mono text-muted text-right">
            {playerCount > 0 ? `${playerCount} players` : 'Be the first!'}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/LandCard.tsx
git commit -m "feat: add LandCard base component"
```

---

## Task 5: Update CharacterCard

**Files:**
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import type { Character } from '../../api/endpoints/characters'
import { StandardTcgCard } from './StandardTcgCard'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
  onSelect?: (character: Character) => void
}

export function CharacterCard({ character, onEdit, onDelete, onSelect }: CharacterCardProps) {
  const navigate = useNavigate()

  function handleClick() {
    if (onSelect) onSelect(character)
    else navigate(`/characters/${character.id}`)
  }

  const subtitle = [character.region, character.languages?.[0]].filter(Boolean).join(' · ') || undefined

  const statsLine = (character.mainRole || character.rank || character.usesVoiceChat != null) ? (
    <div className="flex flex-wrap gap-1.5">
      {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
      {character.rank && <Badge variant="rank">{character.rank}</Badge>}
      {character.usesVoiceChat != null && (
        <Badge>{character.usesVoiceChat ? 'Voice ✓' : 'Voice ✗'}</Badge>
      )}
    </div>
  ) : undefined

  return (
    <StandardTcgCard
      name={character.name}
      platform={character.platform}
      subtitle={subtitle}
      imageUrl={character.imageUrl}
      statsLine={statsLine}
      textBody={character.bio ? <p className="text-xs text-muted line-clamp-3">{character.bio}</p> : undefined}
      className="h-[472px]"
      onClick={handleClick}
    >
      {(onEdit || onDelete) && (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {onEdit && (
            <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => onEdit(character)}>
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
    </StandardTcgCard>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/CharacterCard.tsx
git commit -m "feat: CharacterCard wraps StandardTcgCard"
```

---

## Task 6: Update MatchCard Front

Only `MatchFront` changes. `MatchBack` and the flip mechanic are unchanged.

**Files:**
- Modify: `apps/web/src/components/cards/MatchCard.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { Badge } from '../ui'
import type { CharacterSummary } from '../../api/endpoints/matches'
import { FlippableCard } from './FlippableCard'
import { StandardTcgCard } from './StandardTcgCard'

interface MatchCardProps {
  character: CharacterSummary
  gameName: string
  matchedAt: string
}

function MatchFront({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()

  const statsLine = (character.mainRole || character.rank || character.region || character.playstyle) ? (
    <div className="flex flex-wrap gap-1.5">
      {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
      {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
      {character.rank && <Badge variant="rank">{character.rank}</Badge>}
      {character.region && <Badge variant="region">{character.region}</Badge>}
      {character.playstyle && <Badge>{character.playstyle}</Badge>}
    </div>
  ) : undefined

  return (
    <StandardTcgCard
      name={character.platformHandle}
      platform={character.name}
      imageUrl={character.imageUrl}
      statsLine={statsLine}
      textBody={character.bio ? <p className="text-xs text-muted line-clamp-2">{character.bio}</p> : undefined}
      bottomStat={`${gameName} · ${date}`}
      className="w-full h-full"
    />
  )
}

function MatchBack({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden border-black border-[6px]"
    >
      <div className="px-4 py-3 flex-1 overflow-y-auto overflow-x-hidden">
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
    <div className="min-h-50">
      <FlippableCard
        front={<MatchFront character={character} gameName={gameName} matchedAt={matchedAt} />}
        back={<MatchBack character={character} gameName={gameName} matchedAt={matchedAt} />}
        className="h-full"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/MatchCard.tsx
git commit -m "feat: MatchCard front wraps StandardTcgCard"
```

---

## Task 7: Update SwipeCard Front

Only `SwipeFront` changes. `SwipeBack`, animations, and flip mechanic are unchanged.

**Files:**
- Modify: `apps/web/src/components/cards/SwipeCard.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useState } from 'react'
import { Badge, Button } from '../ui'
import { type DiscoverCharacter } from '../../api/endpoints/characters'
import { FlippableCard } from './FlippableCard'
import { FullArtTcgCard } from './FullArtTcgCard'

type ExitDirection = 'left' | 'right' | null

interface SwipeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
  isTop: boolean
}

function SwipeFront({ character }: { character: DiscoverCharacter }) {
  return (
    <FullArtTcgCard
      name={character.name}
      platform={character.platform}
      imageUrl={character.imageUrl}
      className="w-full h-full"
    >
      {/* Bottom overlay: badges + bio excerpt + flip hint */}
      <div className="flex flex-wrap gap-1 mb-1">
        {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
        {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
        {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        {character.region && <Badge variant="region">{character.region}</Badge>}
        {character.playstyle && <Badge>{character.playstyle}</Badge>}
      </div>
      {character.bio && (
        <p className="text-xs text-white/80 line-clamp-2 mb-1">{character.bio}</p>
      )}
      <p className="text-xs text-white/50 text-center">↑ tap for more</p>
    </FullArtTcgCard>
  )
}

function SwipeBack({ character }: { character: DiscoverCharacter }) {
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: '#000', border: '4px solid black' }}
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

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/SwipeCard.tsx
git commit -m "feat: SwipeCard front wraps FullArtTcgCard"
```

---

## Task 8: Update CharacterMiniCard

**Files:**
- Modify: `apps/web/src/components/cards/CharacterMiniCard.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import type { Character } from '../../api/endpoints/characters'
import { FullArtTcgCard } from './FullArtTcgCard'

interface CharacterMiniCardProps {
  character: Character
}

export function CharacterMiniCard({ character }: CharacterMiniCardProps) {
  return (
    <FullArtTcgCard
      name={character.name}
      imageUrl={character.imageUrl}
      className="w-36 shrink-0"
      style={{ aspectRatio: '2/3' }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/CharacterMiniCard.tsx
git commit -m "feat: CharacterMiniCard wraps FullArtTcgCard"
```

---

## Task 9: Update PendingLikeCard

**Files:**
- Modify: `apps/web/src/components/cards/PendingLikeCard.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import type { DiscoverCharacter } from '../../api/endpoints/characters'
import { FullArtTcgCard } from './FullArtTcgCard'

interface PendingLikeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
}

export function PendingLikeCard({ character, onLike, onDislike }: PendingLikeCardProps) {
  return (
    <FullArtTcgCard
      name={character.name}
      imageUrl={character.imageUrl}
      style={{ width: '80px', aspectRatio: '2/3' }}
      className="shrink-0"
    >
      <div className="flex justify-around">
        <button
          onClick={onLike}
          className="text-success text-sm leading-none hover:scale-125 transition-transform"
          aria-label={`Like ${character.name}`}
        >
          ♥
        </button>
        <button
          onClick={onDislike}
          className="text-danger text-sm leading-none hover:scale-125 transition-transform"
          aria-label={`Pass on ${character.name}`}
        >
          ✕
        </button>
      </div>
    </FullArtTcgCard>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/PendingLikeCard.tsx
git commit -m "feat: PendingLikeCard wraps FullArtTcgCard"
```

---

## Task 10: Update GameCard

**Files:**
- Modify: `apps/web/src/components/cards/GameCard.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { type Game } from '../../api/endpoints/games'
import { LandCard } from './LandCard'

interface GameCardProps {
  game: Game
  onSelect: (game: Game) => void
}

export function GameCard({ game, onSelect }: GameCardProps) {
  return (
    <LandCard
      name={game.name}
      imageUrl={game.imageUrl}
      playerCount={game.playerCount}
      onClick={() => onSelect(game)}
      className="w-full text-left hover:brightness-110 transition-all"
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/GameCard.tsx
git commit -m "feat: GameCard wraps LandCard"
```

---

## Task 11: Update RealmCard

**Files:**
- Modify: `apps/web/src/components/cards/RealmCard.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'
import { LandCard } from './LandCard'

interface RealmCardProps {
  userGame: UserGame
}

export function RealmCard({ userGame }: RealmCardProps) {
  return (
    <LandCard
      name={userGame.gameName}
      imageUrl={userGame.gameImageUrl}
      className="hover:brightness-110 transition-all"
    >
      <Link
        to={`/realm/${userGame.gameId}`}
        className="block text-center text-xs font-mono uppercase tracking-widest py-2 border border-border text-muted hover:border-accent hover:text-accent transition-colors rounded"
        onClick={e => e.stopPropagation()}
      >
        Enter
      </Link>
    </LandCard>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/RealmCard.tsx
git commit -m "feat: RealmCard wraps LandCard"
```

---

## Task 12: Update CharacterDetailCard — Add Callback Props

Add optional `onBack`, `onDelete`, and `deleting` props so the card can be reused outside of a direct navigation context.

**Files:**
- Modify: `apps/web/src/components/cards/CharacterDetailCard.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import type { Character } from '../../api/endpoints/characters'

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-4 py-2"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <span className="text-xs text-muted uppercase tracking-widest w-28 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex flex-wrap gap-1 min-w-0">{children}</div>
    </div>
  )
}

interface CharacterDetailCardProps {
  character: Character
  onBack?: () => void
  onDelete?: () => void
  deleting?: boolean
}

export function CharacterDetailCard({ character, onBack, onDelete, deleting }: CharacterDetailCardProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '2px solid var(--color-accent)',
        boxShadow: '0 0 24px rgba(124, 111, 205, 0.25)',
      }}
    >
      {/* Action bar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <Button variant="secondary" onClick={handleBack}>← Back</Button>
        {onDelete && (
          <Button variant="danger" size="sm" disabled={deleting} onClick={onDelete}>
            {deleting ? 'Deleting...' : 'Delete Character'}
          </Button>
        )}
      </div>

      {/* Hero section */}
      <div
        className="flex gap-6 p-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-40 h-52 rounded-lg overflow-hidden flex-shrink-0"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {character.imageUrl ? (
            <img
              src={character.imageUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
              style={{ backgroundColor: 'var(--color-surface-raised)' }}
            >
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl text-text mb-1">{character.name}</h1>
          {character.platformHandle && (
            <p className="font-mono text-muted text-sm mb-1">{character.platformHandle}</p>
          )}
          <p className="text-xs text-muted mb-3">{character.platform}</p>
          <div className="flex flex-wrap gap-1.5">
            {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
            {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
            {character.rank && <Badge variant="rank">{character.rank}</Badge>}
            {character.region && <Badge variant="region">{character.region}</Badge>}
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div
        className="px-4 pt-3 pb-1"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h2 className="text-xs text-muted uppercase tracking-widest mb-1">Stats</h2>
        {character.playstyle && (
          <StatRow label="Playstyle">
            <span className="text-sm text-text">{character.playstyle}</span>
          </StatRow>
        )}
        {character.usesVoiceChat != null && (
          <StatRow label="Voice Chat">
            <span className="text-sm text-text">{character.usesVoiceChat ? 'Yes' : 'No'}</span>
          </StatRow>
        )}
        {character.preferredModes.length > 0 && (
          <StatRow label="Modes">
            {character.preferredModes.map(m => <Badge key={m}>{m}</Badge>)}
          </StatRow>
        )}
        {character.languages && character.languages.length > 0 && (
          <StatRow label="Languages">
            {character.languages.map(l => <Badge key={l}>{l}</Badge>)}
          </StatRow>
        )}
        {character.timeZone && (
          <StatRow label="Time Zone">
            <span className="text-sm text-text">{character.timeZone}</span>
          </StatRow>
        )}
        {character.activeTimes && character.activeTimes.length > 0 && (
          <StatRow label="Active Times">
            {character.activeTimes.map(t => <Badge key={t}>{t}</Badge>)}
          </StatRow>
        )}
      </div>

      {/* Game Fields section */}
      {character.gameFields.length > 0 && (
        <div
          className="px-4 pt-3 pb-1"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-xs text-muted uppercase tracking-widest mb-1">Game Fields</h2>
          {character.gameFields.map(f => (
            <StatRow key={f.key} label={f.label}>
              <span className="text-sm text-text">{f.value}</span>
            </StatRow>
          ))}
        </div>
      )}

      {/* Bio section */}
      {character.bio && (
        <div className="px-4 py-3">
          <h2 className="text-xs text-muted uppercase tracking-widest mb-2">Bio</h2>
          <p className="text-sm text-text leading-relaxed">{character.bio}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/CharacterDetailCard.tsx
git commit -m "feat: CharacterDetailCard accepts onBack/onDelete/deleting props"
```

---

## Task 13: Update CharacterPage

Remove the 110-line hardcoded `leftContent` and replace with `CharacterDetailCard`. Clean up now-unused imports and the `StatRow` helper.

**Files:**
- Modify: `apps/web/src/pages/CharacterPage.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useEffect, useState } from 'react'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { CharacterGallery } from '../components/CharacterGallery'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<Character | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getCharacters()
      .then(chars => {
        setCharacters(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  async function handleDelete() {
    if (!selected?.userGameId) return
    setDeleting(true)
    try {
      await deleteCharacter(selected.userGameId, selected.id)
      setCharacters(prev => {
        const next = prev.filter(c => c.id !== selected.id)
        if (next.length === 0) setStatus('empty')
        return next
      })
      setSelected(null)
    } finally {
      setDeleting(false)
    }
  }

  const leftContent = selected ? (
    <CharacterDetailCard
      character={selected}
      onBack={() => setSelected(null)}
      onDelete={selected.userGameId ? handleDelete : undefined}
      deleting={deleting}
    />
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a character</p>
    </div>
  )

  const rightContent = (
    <div className="p-4 overflow-y-auto h-full min-h-0">
      <CharacterGallery
        characters={characters}
        status={status}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />
    </div>
  )

  return (
    <BinderLayout
      barColor='#991b1b'
      tabs={[
        { label: 'My Cards', color: '#991b1b', to: "/characters" },
        { label: 'Games', color: '#1e40af', to: "/games" },
        { label: 'Collection', color: '#166534', to: "/matches" },
      ]}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
```

Note: `BinderLayout`'s left content area already has `flex flex-col flex-1 min-h-0 overflow-y-auto` (line 28 of `BinderLayout.tsx`) and the outer wrapper has `height: calc(100vh - 2rem)`. `CharacterDetailCard` renders as a naturally-sized div inside that scrollable container — no additional height wrapper needed.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/CharacterPage.tsx
git commit -m "feat: CharacterPage uses CharacterDetailCard, remove hardcoded detail panel"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Minimal scrollbar | Task 1 |
| StandardTcgCard base | Task 2 |
| FullArtTcgCard base | Task 3 |
| LandCard base | Task 4 |
| CharacterCard → StandardTcgCard | Task 5 |
| MatchCard front → StandardTcgCard | Task 6 |
| SwipeCard front → FullArtTcgCard | Task 7 |
| CharacterMiniCard → FullArtTcgCard | Task 8 |
| PendingLikeCard → FullArtTcgCard | Task 9 |
| GameCard → LandCard | Task 10 |
| RealmCard → LandCard | Task 11 |
| CharacterDetailCard callback props | Task 12 |
| CharacterPage uses CharacterDetailCard | Task 13 |
| Overflow fix on CharacterPage | Task 13 (note: BinderLayout already handles it) |
| Flip mechanic unchanged | Tasks 6, 7 (backs preserved verbatim) |
