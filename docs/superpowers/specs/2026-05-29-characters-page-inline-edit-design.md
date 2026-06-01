# Characters Page — Inline Edit Design

**Date:** 2026-05-29  
**Status:** Approved

## Overview

Add an Edit Character flow to `CharactersPage` that replaces the left panel with the existing `CreateCharacterWizard` in edit mode, pre-filled with the selected character's data. Canceling restores the detail view; completing the edit re-fetches and displays the updated character.

## Data Layer

`CharactersPage` fetches `getCharacters()` and `getUserGames()` in parallel on mount. A `userGameId → UserGame` map is derived from the user games list.

When the user clicks Edit:
1. Look up `UserGame` from the map using `character.userGameId`
2. Call `getUserGameByGameId(userGame.gameId)` to get `UserGameDetail` (needed for `platforms` by the wizard)
3. Store result in `editingUserGame` state

No backend changes required.

## State Changes — `CharactersPage`

| State | Type | Purpose |
|-------|------|---------|
| `userGames` | `UserGame[]` | Loaded on mount alongside characters |
| `editingUserGame` | `UserGameDetail \| null` | Non-null when in edit mode; drives wizard rendering |

Existing state (`characters`, `status`, `selected`, `deleting`) is unchanged.

## Left Panel Logic

```
editing && selected && editingUserGame  →  Cancel button + wizard (edit mode)
selected                                →  CharacterDetailCard
(none selected)                         →  "Select a character" placeholder
```

The wizard is wrapped in the same `<div className="flex flex-col flex-1 min-h-0 p-4">` as the detail card so layout is unchanged.

## Edit Entry Point

`CharacterDetailCard` receives a new optional `onEdit?: () => void` prop. The action bar (currently Delete-only) adds an "Edit Character" button to the left of Delete, using a secondary/ghost style variant.

## Cancel

A "← Cancel" button is rendered in `CharactersPage` above the wizard container — outside the wizard itself so it persists across all wizard steps. Clicking it sets `editingUserGame = null`, restoring the detail card view. No data is modified.

## On Wizard Success

1. Re-fetch `getCharacters()`
2. Find the updated character by `selected.id`
3. Set it as the new `selected`
4. Set `editingUserGame = null` (returns to detail card view showing updated data)

## Files Changed

| File | Change |
|------|--------|
| `apps/web/src/pages/CharacterPage.tsx` | Add `userGames` fetch, `editingUserGame` state, edit handler, cancel handler, success handler, left panel conditional render |
| `apps/web/src/components/cards/CharacterDetailCard.tsx` | Add `onEdit?: () => void` prop and Edit button in action bar |

No new files. No backend changes. `EditCharacterPage.tsx`, `CreateCharacterWizard.tsx`, and `App.tsx` are untouched.

## Out of Scope

- `EditCharacterPage` remains available at its existing route but is not navigated to from this flow
- No changes to the right panel (gallery) or binder tabs
