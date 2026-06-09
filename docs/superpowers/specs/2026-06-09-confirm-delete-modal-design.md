# Confirm Delete Modal Design

**Date:** 2026-06-09  
**Status:** Approved

## Overview

Add a reusable `ConfirmDeleteModal` component that intercepts all delete actions with a named confirmation dialog before calling the API. Wire it into the two active delete locations (`CharacterPage`, `GamesPage`). Remove the unused `CharacterPanel` component.

## Component: `ConfirmDeleteModal`

**File:** `apps/web/src/components/modals/ConfirmDeleteModal.tsx`

Wraps the existing `Modal` base component from `components/ui/Modal.tsx`.

### Props

```typescript
interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string   // displayed in title: "Delete Raiden Shogun?"
  loading?: boolean  // disables buttons, shows "Deleting…" on confirm button
}
```

### Layout

- **Title** (via `Modal`'s `title` prop): `Delete ${itemName}?`
- **Body**: Paragraph — "This action cannot be undone."
- **Footer**: Two buttons right-aligned
  - Cancel — `secondary` variant, calls `onClose`, disabled when `loading`
  - Delete — `danger` variant, calls `onConfirm`, disabled + shows "Deleting…" when `loading`

Uses existing `Button` and `Modal` components — no new UI primitives.

## Page Changes

Both `CharacterPage` and `GamesPage` follow the same pattern:

### Before

```typescript
// onDelete prop passed directly to card
onDelete={selected.userGameId ? handleDelete : undefined}
```

### After

```typescript
const [confirmOpen, setConfirmOpen] = useState(false)

// onDelete opens confirm modal instead
onDelete={selected.userGameId ? () => setConfirmOpen(true) : undefined}

// handleDelete closes modal on success
async function handleDelete() {
  // ...existing logic...
  setConfirmOpen(false)  // added
}

// Modal rendered in JSX
<ConfirmDeleteModal
  isOpen={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleDelete}
  itemName={selected.name}   // character name or game name
  loading={deleting}
/>
```

### `itemName` values

| Page | `itemName` source |
|---|---|
| `CharacterPage` | `selected.name` (character name) |
| `GamesPage` | `selected.gameName` (game name) |

## Cleanup

Delete `apps/web/src/components/CharacterPanel.tsx` — confirmed unused (no imports anywhere in the codebase).

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/components/modals/ConfirmDeleteModal.tsx` | Create |
| `apps/web/src/pages/CharacterPage.tsx` | Add confirm state + modal |
| `apps/web/src/pages/GamesPage.tsx` | Add confirm state + modal |
| `apps/web/src/components/CharacterPanel.tsx` | Delete |
