# Characters Page Inline Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline edit flow to the Characters page that swaps the left panel to the character wizard (pre-filled), then restores the detail card on cancel or successful save.

**Architecture:** Two files change. `CharacterDetailCard` gains an `onEdit` prop and button. `CharactersPage` pre-fetches user games on mount, holds `editingUserGame` state, and conditionally renders the wizard in place of the detail card.

**Tech Stack:** React, TypeScript, Vite — no new dependencies.

---

## File Map

| File | Change |
|------|--------|
| `apps/web/src/components/cards/CharacterDetailCard.tsx` | Add `onEdit?: () => void` prop; add Edit button in action bar |
| `apps/web/src/pages/CharacterPage.tsx` | Parallel fetch user games; add edit state + handlers; conditional left panel render |

---

### Task 1: Add `onEdit` prop and Edit button to `CharacterDetailCard`

**Files:**
- Modify: `apps/web/src/components/cards/CharacterDetailCard.tsx`

- [ ] **Step 1: Update the props interface**

Replace the existing interface:

```tsx
interface CharacterDetailCardProps {
  character: Character
  onDelete?: () => void
  deleting?: boolean
}
```

With:

```tsx
interface CharacterDetailCardProps {
  character: Character
  onDelete?: () => void
  onEdit?: () => void
  deleting?: boolean
}
```

- [ ] **Step 2: Destructure `onEdit` in the component signature**

Replace:

```tsx
export function CharacterDetailCard({ character, onDelete, deleting }: CharacterDetailCardProps) {
```

With:

```tsx
export function CharacterDetailCard({ character, onDelete, onEdit, deleting }: CharacterDetailCardProps) {
```

- [ ] **Step 3: Add Edit button to the action bar**

Replace the existing action bar (the `div` with `borderTop` near the bottom of the component):

```tsx
      {/* Action bar — pinned */}
      <div
        className="flex items-center justify-end px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {onDelete && (
          <Button variant="danger" size="sm" disabled={deleting} onClick={onDelete}>
            {deleting ? 'Deleting...' : 'Delete Character'}
          </Button>
        )}
      </div>
```

With:

```tsx
      {/* Action bar — pinned */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit Character
            </Button>
          )}
        </div>
        <div>
          {onDelete && (
            <Button variant="danger" size="sm" disabled={deleting} onClick={onDelete}>
              {deleting ? 'Deleting...' : 'Delete Character'}
            </Button>
          )}
        </div>
      </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/cards/CharacterDetailCard.tsx
git commit -m "feat: add onEdit prop and Edit button to CharacterDetailCard"
```

---

### Task 2: Update `CharactersPage` with user-games fetch, edit state, and inline wizard

**Files:**
- Modify: `apps/web/src/pages/CharacterPage.tsx`

- [ ] **Step 1: Add imports**

Replace the existing import block at the top of the file:

```tsx
import { useEffect, useState } from 'react'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { CharacterGallery } from '../components/CharacterGallery'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
```

With:

```tsx
import { useEffect, useState } from 'react'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { getUserGames, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { CharacterGallery } from '../components/CharacterGallery'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
import { CreateCharacterWizard } from '../components/character-wizard/CreateCharacterWizard'
import type { CharacterFormData } from '../components/character-wizard/types'
```

- [ ] **Step 2: Add `toFormData` helper above the component**

Insert this function between the imports and the `export default function CharactersPage()` line:

```tsx
function toFormData(c: Character): Partial<CharacterFormData> {
  return {
    platform: c.platform ?? '',
    platformHandle: c.platformHandle ?? '',
    name: c.name ?? '',
    imageUrl: c.imageUrl ?? '',
    imageFile: null,
    bio: c.bio ?? '',
    mainRole: c.mainRole ?? '',
    secondaryRole: c.secondaryRole ?? '',
    preferredModes: c.preferredModes ?? [],
    playstyle: c.playstyle ?? '',
    rank: c.rank ?? '',
    region: c.region ?? '',
    timeZone: c.timeZone ?? '',
    activeTimes: c.activeTimes ?? [],
    usesVoiceChat: c.usesVoiceChat,
    languages: c.languages ?? [],
    gameFields: Object.fromEntries((c.gameFields ?? []).map(f => [f.fieldDefinitionId, f.value])),
  }
}
```

- [ ] **Step 3: Add new state variables inside the component**

After the existing state declarations:

```tsx
  const [characters, setCharacters] = useState<Character[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<Character | null>(null)
  const [deleting, setDeleting] = useState(false)
```

Add:

```tsx
  const [userGames, setUserGames] = useState<UserGame[]>([])
  const [editingUserGame, setEditingUserGame] = useState<UserGameDetail | null>(null)
```

- [ ] **Step 4: Replace the `useEffect` to fetch both characters and user games in parallel**

Replace:

```tsx
  useEffect(() => {
    getCharacters()
      .then(chars => {
        setCharacters(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])
```

With:

```tsx
  useEffect(() => {
    Promise.all([getCharacters(), getUserGames()])
      .then(([chars, ug]) => {
        setCharacters(chars)
        setUserGames(ug)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])
```

- [ ] **Step 5: Add edit, cancel, and success handlers**

Insert these three functions after the existing `handleDelete` function:

```tsx
  async function handleEdit() {
    if (!selected?.userGameId) return
    const userGame = userGames.find(ug => ug.id === selected.userGameId)
    if (!userGame) return
    const detail = await getUserGameByGameId(userGame.gameId)
    setEditingUserGame(detail)
  }

  function handleEditCancel() {
    setEditingUserGame(null)
  }

  async function handleEditSuccess() {
    const updatedChars = await getCharacters()
    const updated = updatedChars.find(c => c.id === selected?.id) ?? null
    setCharacters(updatedChars)
    setStatus(updatedChars.length === 0 ? 'empty' : 'ready')
    setSelected(updated)
    setEditingUserGame(null)
  }
```

- [ ] **Step 6: Replace the `leftContent` block with the conditional render**

Replace the existing `leftContent` declaration:

```tsx
  const leftContent = selected ? (
    <div className="flex flex-col flex-1 min-h-0 p-4">
      <CharacterDetailCard
        character={selected}
        onDelete={selected.userGameId ? handleDelete : undefined}
        deleting={deleting}
      />
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a character</p>
    </div>
  )
```

With:

```tsx
  const leftContent = (() => {
    if (editingUserGame && selected) {
      return (
        <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
          <button
            type="button"
            onClick={handleEditCancel}
            className="text-xs font-mono text-muted hover:text-text mb-4 self-start"
          >
            ← Cancel
          </button>
          <CreateCharacterWizard
            userGameId={editingUserGame.id}
            gameId={editingUserGame.gameId}
            platforms={editingUserGame.platforms}
            mode="edit"
            characterId={selected.id}
            initialData={toFormData(selected)}
            onSuccess={handleEditSuccess}
          />
        </div>
      )
    }
    if (selected) {
      return (
        <div className="flex flex-col flex-1 min-h-0 p-4">
          <CharacterDetailCard
            character={selected}
            onDelete={selected.userGameId ? handleDelete : undefined}
            onEdit={selected.userGameId ? handleEdit : undefined}
            deleting={deleting}
          />
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted font-mono text-sm">Select a character</p>
      </div>
    )
  })()
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no TypeScript errors. Fix any that appear before proceeding.

- [ ] **Step 8: Manual verification — start the app**

```bash
docker compose up -d
npm run dev
```

Navigate to `http://localhost:5173/characters`.

Verify:
1. Characters load in the right panel gallery
2. Selecting a character shows `CharacterDetailCard` in the left panel with both **Edit Character** and **Delete Character** buttons
3. Clicking **Edit Character** swaps the left panel to the wizard, pre-filled with the character's existing values (name, platform, bio, etc.)
4. All wizard steps are accessible via the step indicator
5. Clicking **← Cancel** restores the detail card view with the original character data unchanged
6. Completing the wizard (clicking **Save Changes** on the last step) returns to the detail card showing the updated values

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/pages/CharacterPage.tsx
git commit -m "feat: inline character edit on CharactersPage"
```
