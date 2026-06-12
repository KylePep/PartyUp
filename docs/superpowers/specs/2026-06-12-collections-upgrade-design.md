# Collections Page Upgrade — Design Spec
**Date:** 2026-06-12

## Overview

Upgrade the Collections (Matches) page so matched characters are sorted by game name, and the header bar gains a game filter dropdown and a character name search bar alongside the existing pagination controls.

## Requirements

1. Matches are returned sorted alphabetically by game name, then by match date descending within each game.
2. A game filter dropdown lets the user narrow results to a single game. Populated from the user's `userGames`.
3. A character name search bar lets the user search across all pages by the matched character's name (debounced, 300 ms).
4. Both controls live in the right panel's header section alongside `PaginationControls`.
5. Changing the dropdown or typing in the search bar resets pagination to page 1 and re-fetches.

## Backend

### `CharacterMatchService.GetMatchesAsync`

Add two optional parameters:

- `string? gameId` — already exists; no change.
- `string? search` — new. When provided, filters results to matches where `theirCharacter.Name` contains the search string (case-insensitive). Applied before pagination.

Add default ordering:
- Primary: `gameName ASC`
- Secondary: `matchedAt DESC`

### `CharacterMatchesController`

Add `search` as an optional query string parameter alongside the existing `gameId`, `page`, and `pageSize`. Pass it through to the service.

No new endpoint. Signature becomes:
```
GET /api/character-matches?gameId={optional}&search={optional}&page={1}&pageSize={12}
```

## Frontend

### `getMatches` (matches.ts)

Add `search?: string` parameter. Append to query string when provided.

### `MatchesPage` state additions

| State var | Type | Purpose |
|---|---|---|
| `selectedGameId` | `string \| null` | Controlled by dropdown; `null` = all games |
| `searchInput` | `string` | Raw value bound to the text input |
| `debouncedSearch` | `string` | 300 ms debounced copy of `searchInput` |

`useEffect` dependency array: `[targetId, page, selectedGameId, debouncedSearch]`

Changing `selectedGameId` or `debouncedSearch` resets `page` to 1 before (or as part of) triggering the fetch.

### `useUserGames` usage

Call `useUserGames` inside `MatchesPage` to populate the dropdown. The hook currently requests `pageSize: 12` — bump to `50` to avoid truncating the list for users with many games.

### Header layout

The right panel header expands from one row to two rows within the same bordered section:

```
Row 1:  "My Collection"                    [PaginationControls]
Row 2:  [Game dropdown ▼]  [Search by name...          ]
```

- The dropdown is approximately `w-40`, styled with the existing mono/muted aesthetic.
- The search input fills remaining space (`flex-1`).
- On mobile the two row-2 controls stack vertically.
- `PaginationControls` remains on row 1, right-aligned, and only renders when `totalCount > 0`.

## Data flow

```
User types in search / selects game
  → reset page to 1
  → (debounce 300ms for search)
  → getMatches(page=1, PAGE_SIZE, selectedGameId, debouncedSearch)
  → setMatches / setTotalCount / setStatus
  → Gallery re-renders sorted results
  → PaginationControls reflects new totalCount
```

## Out of scope

- Visual game-name section headers between groups (cards already show the game name).
- Sorting controls beyond the default game-name/date ordering.
- Persisting filter/search state in the URL (beyond the existing `?id=` param).
