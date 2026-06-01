# Binder Select-Resource Pattern Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "selected resource" pattern to CharacterPage and MatchesPage, and create a new GamesPage — all using the BinderLayout where the right panel is a clickable grid and the left panel shows the selected item's full detail.

**Architecture:** State is lifted into each page component. Right panel receives `onSelect` + `selectedId` props and renders a highlight ring on the active item. Left panel is an inline detail view that renders an empty prompt when nothing is selected. GamesPage is a brand-new route at `/games`.

**Tech Stack:** React 18, TypeScript, React Router v6, Tailwind CSS, existing `BinderLayout` / `BinderTabs` components, existing API endpoints (`getUserGames`, `deleteUserGame`, `getCharacters`, `deleteCharacter`, `getMatches`).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/pages/GamesPage.tsx` | **Create** | Games binder page — owns state, grid + detail panels |
| `apps/web/src/App.tsx` | **Modify** | Add `/games` route |
| `apps/web/src/pages/CharacterPage.tsx` | **Modify** | Lift state from CharacterGallery; add left detail panel |
| `apps/web/src/components/CharacterGallery.tsx` | **Modify** | Accept `onSelect`/`selectedId` props; drop internal state |
| `apps/web/src/components/cards/CharacterCard.tsx` | **Modify** | Accept optional `onSelect` prop (replaces navigate on body click) |
| `apps/web/src/pages/MatchesPage.tsx` | **Modify** | Lift state from MatchGallery; add left detail panel |
| `apps/web/src/components/MatchGallery.tsx` | **Leave untouched** | Still used by `RealmRightPage` with `gameId`/`limit` props |
| `apps/web/src/pages/RealmPage.tsx` | **Modify** | Fix "Games" tab `to` path |

---

### Task 1: Fix "Games" tab link on all pages

The Games tab currently has `to: "/characters"` — a placeholder. Update it to `/games` on all three pages that render `BinderTabs`.

**Files:**
- Modify: `apps/web/src/pages/CharacterPage.tsx`
- Modify: `apps/web/src/pages/MatchesPage.tsx`
- Modify: `apps/web/src/pages/RealmPage.tsx`

- [ ] **Step 1: Update CharacterPage.tsx**

In `apps/web/src/pages/CharacterPage.tsx`, change the tabs array so the Games entry points to `/games`:

```tsx
tabs={[
  { label: 'My Cards', color: '#991b1b', to: "/characters" },
  { label: 'Games', color: '#1e40af', to: "/games" },
  { label: 'Collection', color: '#166534', to: "/matches" },
]}
```

- [ ] **Step 2: Update MatchesPage.tsx**

Same change in `apps/web/src/pages/MatchesPage.tsx`:

```tsx
tabs={[
  { label: 'My Cards', color: '#991b1b', to: "/characters" },
  { label: 'Games', color: '#1e40af', to: "/games" },
  { label: 'Collection', color: '#166534', to: "/matches" },
]}
```

- [ ] **Step 3: Update RealmPage.tsx**

Same change in `apps/web/src/pages/RealmPage.tsx`:

```tsx
tabs={[
  { label: 'My Cards', color: '#991b1b', to: "/characters" },
  { label: 'Games', color: '#1e40af', to: "/games" },
  { label: 'Collection', color: '#166534', to: "/matches" },
]}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/CharacterPage.tsx apps/web/src/pages/MatchesPage.tsx apps/web/src/pages/RealmPage.tsx
git commit -m "fix: point Games binder tab to /games route"
```

---

### Task 2: Create GamesPage and add route

**Files:**
- Create: `apps/web/src/pages/GamesPage.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create GamesPage.tsx**

Create `apps/web/src/pages/GamesPage.tsx` with full content:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserGames, deleteUserGame, type UserGame } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Button, EmptyState, Spinner } from '../components/ui'

export default function GamesPage() {
  const [games, setGames] = useState<UserGame[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<UserGame | null>(null)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getUserGames()
      .then(gs => {
        setGames(gs)
        setStatus(gs.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteUserGame(selected.id)
      setGames(prev => {
        const next = prev.filter(g => g.id !== selected.id)
        if (next.length === 0) setStatus('empty')
        return next
      })
      setSelected(null)
    } finally {
      setDeleting(false)
    }
  }

  const leftContent = selected ? (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-4">
      <div className="w-full aspect-video rounded-lg overflow-hidden border border-border flex-shrink-0">
        {selected.gameImageUrl ? (
          <img src={selected.gameImageUrl} alt={selected.gameName} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {selected.gameName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div>
        <h1 className="font-display font-bold text-xl text-text mb-1">{selected.gameName}</h1>
        <p className="text-xs font-mono text-muted">
          Added {new Date(selected.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2 mt-auto">
        <Button onClick={() => navigate(`/realm/${selected.gameId}`)}>
          Enter Realm
        </Button>
        <Button
          variant="danger"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? 'Deleting...' : 'Delete Game'}
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a game</p>
    </div>
  )

  const rightContent = (
    <div className="p-4 overflow-y-auto h-full">
      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner /></div>
      )}
      {status === 'error' && <EmptyState message="Could not load games" />}
      {status === 'empty' && <EmptyState message="You haven't added any games yet" />}
      {status === 'ready' && (
        <div className="grid grid-cols-2 gap-3">
          {games.map(game => (
            <button
              key={game.id}
              onClick={() => setSelected(game)}
              className="rounded-lg overflow-hidden border-2 transition-all text-left"
              style={{
                borderColor: selected?.id === game.id ? '#1e40af' : 'var(--color-border)',
                boxShadow: selected?.id === game.id ? '0 0 0 2px #1e40af40' : 'none',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <div className="aspect-video overflow-hidden">
                {game.gameImageUrl ? (
                  <img src={game.gameImageUrl} alt={game.gameName} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-muted font-mono text-2xl"
                    style={{ backgroundColor: 'var(--color-surface-raised)' }}
                  >
                    {game.gameName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5">
                <p className="text-xs font-mono text-text truncate">{game.gameName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <BinderLayout
      barColor="#1e40af"
      tabs={[
        { label: 'My Cards', color: '#991b1b', to: '/characters' },
        { label: 'Games', color: '#1e40af', to: '/games' },
        { label: 'Collection', color: '#166534', to: '/matches' },
      ]}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
```

- [ ] **Step 2: Add /games route to App.tsx**

In `apps/web/src/App.tsx`, add the import and route. The full file after modification:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SignedInLayout from "./components/layout/SignedInLayout";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import RealmPage from "./pages/RealmPage";
import CreateCharacterPage from "./pages/CreateCharacterPage";
import EditCharacterPage from "./pages/EditCharacterPage";
import "./App.css";
import CharactersPage from "./pages/CharacterPage";
import CharacterDetailPage from "./pages/CharacterDetailPage";
import MatchesPage from "./pages/MatchesPage";
import GamesPage from "./pages/GamesPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<SignedInLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/realm/:gameId" element={<RealmPage />} />
            <Route path="/realm/:gameId/create-character" element={<CreateCharacterPage />} />
            <Route path="/realm/:gameId/edit-character/:characterId" element={<EditCharacterPage />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/games" element={<GamesPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Verify the app compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/GamesPage.tsx apps/web/src/App.tsx
git commit -m "feat: add GamesPage with select-resource binder layout"
```

---

### Task 3: Refactor CharacterCard to support onSelect

CharacterCard currently always navigates to `/characters/:id` on body click. Add an optional `onSelect` prop — when provided, it replaces the navigate behavior so the gallery can use it for selection.

**Files:**
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`

- [ ] **Step 1: Update CharacterCard.tsx**

Replace the full file content:

```tsx
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import type { Character } from '../../api/endpoints/characters'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
  onSelect?: (character: Character) => void
}

export function CharacterCard({ character, onEdit, onDelete, onSelect }: CharacterCardProps) {
  const navigate = useNavigate()

  function handleBodyClick() {
    if (onSelect) {
      onSelect(character)
    } else {
      navigate(`/characters/${character.id}`)
    }
  }

  return (
    <div
      className="h-[472px] rounded-xl flex flex-col overflow-hidden cursor-pointer transition-all hover:brightness-110"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
      }}
      onClick={handleBodyClick}
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

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/CharacterCard.tsx
git commit -m "feat: add onSelect prop to CharacterCard"
```

---

### Task 4: Refactor CharacterGallery and CharacterPage

Move all state management out of `CharacterGallery` into `CharacterPage`. The gallery becomes a pure grid that receives data and callbacks as props. The page adds a left detail panel with a delete button.

**Files:**
- Modify: `apps/web/src/components/CharacterGallery.tsx`
- Modify: `apps/web/src/pages/CharacterPage.tsx`

- [ ] **Step 1: Rewrite CharacterGallery.tsx**

Replace the full file with a stateless grid component:

```tsx
import { CharacterCard } from './cards/CharacterCard'
import { EmptyState, Spinner } from './ui'
import { CHARACTER_LIMIT } from '../utils/limits'
import type { Character } from '../api/endpoints/characters'

interface CharacterGalleryProps {
  characters: Character[]
  status: 'loading' | 'ready' | 'empty' | 'error'
  selectedId: string | null
  onSelect: (character: Character) => void
}

export function CharacterGallery({ characters, status, selectedId, onSelect }: CharacterGalleryProps) {
  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }
  if (status === 'error') {
    return <EmptyState message="Could not load characters" />
  }
  return (
    <>
      <p className="text-xs font-mono text-muted mb-4">
        {characters.length} / {CHARACTER_LIMIT} characters
      </p>
      {status === 'empty' ? (
        <EmptyState message="You haven't created any characters yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map(c => (
            <div
              key={c.id}
              className="rounded-xl transition-all"
              style={{
                outline: selectedId === c.id ? '2px solid #991b1b' : '2px solid transparent',
                outlineOffset: '2px',
              }}
            >
              <CharacterCard character={c} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Rewrite CharacterPage.tsx**

Replace the full file. The page owns state, handles delete, and renders both panels:

```tsx
import { useEffect, useState } from 'react'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { CharacterGallery } from '../components/CharacterGallery'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Badge, Button, Spinner } from '../components/ui'

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted uppercase tracking-widest w-24 flex-shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-text min-w-0">{children}</div>
    </div>
  )
}

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
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero */}
      <div
        className="flex gap-4 p-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-32 h-40 rounded-lg overflow-hidden flex-shrink-0"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {selected.imageUrl ? (
            <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-muted font-mono text-3xl"
              style={{ backgroundColor: 'var(--color-surface-raised)' }}
            >
              {selected.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-lg text-text mb-0.5">{selected.name}</h1>
          {selected.platformHandle && (
            <p className="font-mono text-muted text-sm mb-0.5">{selected.platformHandle}</p>
          )}
          {selected.platform && (
            <p className="text-xs text-muted mb-2">{selected.platform}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {selected.mainRole && <Badge variant="role">{selected.mainRole}</Badge>}
            {selected.secondaryRole && <Badge variant="role">{selected.secondaryRole}</Badge>}
            {selected.rank && <Badge variant="rank">{selected.rank}</Badge>}
            {selected.region && <Badge variant="region">{selected.region}</Badge>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-xs text-muted uppercase tracking-widest mb-2">Stats</p>
        {selected.playstyle && (
          <StatRow label="Playstyle">{selected.playstyle}</StatRow>
        )}
        {selected.usesVoiceChat != null && (
          <StatRow label="Voice Chat">{selected.usesVoiceChat ? 'Yes' : 'No'}</StatRow>
        )}
        {selected.preferredModes.length > 0 && (
          <StatRow label="Modes">
            <div className="flex flex-wrap gap-1">
              {selected.preferredModes.map(m => <Badge key={m}>{m}</Badge>)}
            </div>
          </StatRow>
        )}
        {selected.languages && selected.languages.length > 0 && (
          <StatRow label="Languages">
            <div className="flex flex-wrap gap-1">
              {selected.languages.map(l => <Badge key={l}>{l}</Badge>)}
            </div>
          </StatRow>
        )}
        {selected.timeZone && (
          <StatRow label="Time Zone">{selected.timeZone}</StatRow>
        )}
        {selected.activeTimes && selected.activeTimes.length > 0 && (
          <StatRow label="Active">
            <div className="flex flex-wrap gap-1">
              {selected.activeTimes.map(t => <Badge key={t}>{t}</Badge>)}
            </div>
          </StatRow>
        )}
      </div>

      {/* Game fields */}
      {selected.gameFields.length > 0 && (
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Game Fields</p>
          {selected.gameFields.map(f => (
            <StatRow key={f.key} label={f.label}>{f.value}</StatRow>
          ))}
        </div>
      )}

      {/* Bio */}
      {selected.bio && (
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Bio</p>
          <p className="text-sm text-text leading-relaxed">{selected.bio}</p>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 mt-auto">
        <Button
          variant="danger"
          size="sm"
          disabled={deleting || !selected.userGameId}
          onClick={handleDelete}
        >
          {deleting ? 'Deleting...' : 'Delete Character'}
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a character</p>
    </div>
  )

  const rightContent = (
    <div className="p-4 overflow-y-auto h-full">
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

- [ ] **Step 3: Verify build**

```bash
npm run build --prefix apps/web
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/CharacterGallery.tsx apps/web/src/pages/CharacterPage.tsx
git commit -m "feat: character page select-resource pattern with left detail panel"
```

---

### Task 5: Refactor MatchesPage with inline match grid

`MatchGallery` is also used in `RealmRightPage` with `gameId` and `limit` props — leave it untouched. MatchesPage renders its own selectable match grid inline instead of reusing that component. The page adds a left detail panel showing both characters in the match.

**Files:**
- Modify: `apps/web/src/pages/MatchesPage.tsx` only — `MatchGallery` is NOT changed.

- [ ] **Step 1: Rewrite MatchesPage.tsx**

Replace the full file. The page owns state and renders the left detail panel:

```tsx
import { useEffect, useState } from 'react'
import { getMatches, type CharacterMatchDto, type CharacterSummary } from '../api/endpoints/matches'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Badge, EmptyState, Spinner } from '../components/ui'

function MatchCharacterDetail({ character }: { character: CharacterSummary }) {
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
        <div className="flex flex-wrap gap-1 mb-2">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
        </div>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-3 leading-relaxed">{character.bio}</p>
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

export default function MatchesPage() {
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<CharacterMatchDto | null>(null)

  useEffect(() => {
    getMatches()
      .then(m => {
        setMatches(m)
        setStatus(m.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  const leftContent = selected ? (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Match header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Match</p>
        <p className="font-display font-bold text-text">{selected.gameName}</p>
        <p className="text-xs text-muted">
          Matched {new Date(selected.matchedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Their character */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-xs text-muted uppercase tracking-widest mb-3">Their Character</p>
        <MatchCharacterDetail character={selected.theirCharacter} />
      </div>

      {/* My character */}
      <div className="px-4 py-4">
        <p className="text-xs text-muted uppercase tracking-widest mb-3">Your Character</p>
        <MatchCharacterDetail character={selected.myCharacter} />
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a match</p>
    </div>
  )

  const rightContent = (
    <div className="p-4 overflow-y-auto h-full">
      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner /></div>
      )}
      {status === 'error' && <EmptyState message="Could not load matches" />}
      {status === 'empty' && <EmptyState message="No matches yet — keep swiping!" />}
      {status === 'ready' && (
        <div className="grid grid-cols-3 gap-3">
          {matches.map(m => {
            const c = m.theirCharacter
            const isSelected = selected?.matchId === m.matchId
            return (
              <button
                key={m.matchId}
                onClick={() => setSelected(m)}
                className="rounded-xl overflow-hidden border-2 transition-all text-left flex flex-col"
                style={{
                  borderColor: isSelected ? '#166534' : 'var(--color-border)',
                  boxShadow: isSelected ? '0 0 0 2px #16663440' : 'none',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <div className="h-32 overflow-hidden flex-shrink-0">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-muted font-mono text-3xl"
                      style={{ backgroundColor: 'var(--color-surface-raised)' }}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-mono font-bold text-text truncate">{c.platformHandle}</p>
                  <p className="text-xs text-muted truncate">{m.gameName}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <BinderLayout
      barColor='#166534'
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

- [ ] **Step 3: Verify build**

```bash
npm run build --prefix apps/web
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/MatchesPage.tsx
git commit -m "feat: matches page select-resource pattern with left detail panel"
```
