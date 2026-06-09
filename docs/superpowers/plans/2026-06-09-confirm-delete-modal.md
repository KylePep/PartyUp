# Confirm Delete Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `ConfirmDeleteModal` that intercepts all delete actions with a named confirmation dialog, wire it into `CharacterPage` and `GamesPage`, and remove the unused `CharacterPanel` component.

**Architecture:** A new `ConfirmDeleteModal` component wraps the existing `Modal` base and renders a danger confirmation with the item's name. Pages manage `confirmOpen` boolean state — the card's `onDelete` prop opens the modal instead of calling the API directly; the actual API call fires in the modal's `onConfirm`.

**Tech Stack:** React, TypeScript, Tailwind CSS — existing `Modal` and `Button` components from `components/ui/`.

---

## File Map

| Action | Path |
|---|---|
| Create | `apps/web/src/components/modals/ConfirmDeleteModal.tsx` |
| Modify | `apps/web/src/pages/CharacterPage.tsx` |
| Modify | `apps/web/src/pages/GamesPage.tsx` |
| Delete | `apps/web/src/components/CharacterPanel.tsx` |

---

### Task 1: Create `ConfirmDeleteModal` component

**Files:**
- Create: `apps/web/src/components/modals/ConfirmDeleteModal.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/modals/ConfirmDeleteModal.tsx` with the following content:

```tsx
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  loading?: boolean
}

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemName, loading }: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Delete ${itemName}?`}>
      <div className="px-6 py-4">
        <p className="text-sm text-muted font-mono">This action cannot be undone.</p>
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/modals/ConfirmDeleteModal.tsx
git commit -m "feat: add ConfirmDeleteModal component"
```

---

### Task 2: Wire `ConfirmDeleteModal` into `CharacterPage`

**Files:**
- Modify: `apps/web/src/pages/CharacterPage.tsx`

- [ ] **Step 1: Add `confirmOpen` state and update `handleDelete`**

In `apps/web/src/pages/CharacterPage.tsx`, make the following changes:

1. Add the import for `ConfirmDeleteModal` at the top of the file (after the existing modal/card imports):

```tsx
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal'
```

2. Add `confirmOpen` state next to the existing `deleting` state:

```tsx
const [deleting, setDeleting] = useState(false)
const [confirmOpen, setConfirmOpen] = useState(false)
```

3. Update `handleDelete` to close the modal on success. Replace the existing function:

```tsx
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
    setConfirmOpen(false)
  } finally {
    setDeleting(false)
  }
}
```

- [ ] **Step 2: Update `onDelete` prop and render modal**

In the `leftContent` block, find the `<CharacterDetailCard>` and change its `onDelete` prop from calling `handleDelete` directly to opening the confirm modal:

```tsx
<CharacterDetailCard
  character={selected}
  onDelete={selected.userGameId ? () => setConfirmOpen(true) : undefined}
  onEdit={selected.userGameId ? handleEdit : undefined}
  deleting={deleting}
/>
```

Then render the `ConfirmDeleteModal` at the end of the `leftContent` block, inside the outer `<div className="flex flex-col md:min-h-0">`:

```tsx
<ConfirmDeleteModal
  isOpen={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleDelete}
  itemName={selected.name}
  loading={deleting}
/>
```

The full updated `leftContent` for the selected-character branch should look like:

```tsx
if (selected) {
  return (
    <div className="flex flex-col md:min-h-0">
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
        <h2 className="text-xs font-mono uppercase tracking-widest">Character Card Details</h2>
      </div>
      <div className='p-2 md:px-4 flex flex-col min-h-0 overflow-y-auto'>
        <CharacterDetailCard
          character={selected}
          onDelete={selected.userGameId ? () => setConfirmOpen(true) : undefined}
          onEdit={selected.userGameId ? handleEdit : undefined}
          deleting={deleting}
        />
      </div>
      <ConfirmDeleteModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        itemName={selected.name}
        loading={deleting}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify the app compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/CharacterPage.tsx
git commit -m "feat: confirm delete on CharacterPage"
```

---

### Task 3: Wire `ConfirmDeleteModal` into `GamesPage`

**Files:**
- Modify: `apps/web/src/pages/GamesPage.tsx`

- [ ] **Step 1: Add `confirmOpen` state and update `handleDelete`**

In `apps/web/src/pages/GamesPage.tsx`, make the following changes:

1. Add the import for `ConfirmDeleteModal` at the top of the file:

```tsx
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal'
```

2. Add `confirmOpen` state next to the existing `deleting` state:

```tsx
const [deleting, setDeleting] = useState(false)
const [confirmOpen, setConfirmOpen] = useState(false)
```

3. Update `handleDelete` to close the modal on success. Replace the existing function:

```tsx
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
    setConfirmOpen(false)
  } finally {
    setDeleting(false)
  }
}
```

- [ ] **Step 2: Update `onDelete` prop and render modal**

In `leftContent`, find the `<GameDetailCard>` and change its `onDelete` prop to open the confirm modal:

```tsx
<GameDetailCard
  game={selected}
  detail={selectedDetail}
  loading={detailLoading}
  deleting={deleting}
  onDelete={() => setConfirmOpen(true)}
/>
```

Then render the `ConfirmDeleteModal` immediately after `<GameDetailCard>` inside the same fragment/div. The full updated `leftContent` for the selected-game branch:

```tsx
const leftContent = selected ? (
  <>
    <GameDetailCard
      game={selected}
      detail={selectedDetail}
      loading={detailLoading}
      deleting={deleting}
      onDelete={() => setConfirmOpen(true)}
    />
    <ConfirmDeleteModal
      isOpen={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      onConfirm={handleDelete}
      itemName={selected.gameName}
      loading={deleting}
    />
  </>
) : (
  <div className="flex items-center justify-center h-full">
    <p className="text-muted font-mono text-sm">Select a game</p>
  </div>
)
```

- [ ] **Step 3: Verify the app compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/GamesPage.tsx
git commit -m "feat: confirm delete on GamesPage"
```

---

### Task 4: Delete unused `CharacterPanel`

**Files:**
- Delete: `apps/web/src/components/CharacterPanel.tsx`

- [ ] **Step 1: Delete the file**

```bash
Remove-Item apps/web/src/components/CharacterPanel.tsx
```

- [ ] **Step 2: Verify no broken imports**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds. If any import errors appear, search for `CharacterPanel` and remove those imports.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused CharacterPanel component"
```
