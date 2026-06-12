# Matches & Characters Pagination Design

**Date:** 2026-06-11
**Branch:** new branch off `main` (feat/matches-characters-pagination)

## Summary

Apply the established `PagedResult<T>` pagination pattern (already live on `GET /api/user-games`) to the characters and matches endpoints. Three frontend locations are affected: `CharacterPage`, `MatchesPage`, and `RealmRightPage`. The `PagedResult<T>` DTO, `PaginationControls` component, and `Gallery stickyRows` are all already in place — this work is purely applying the pattern.

---

## Backend

### Characters endpoint

`GET /api/characters?page=1&pageSize=12`

- `page`: 1-based, defaults to 1, clamped to ≥ 1
- `pageSize`: defaults to 12, clamped to 1–50

`ICharacterService.GetAllCharactersForUserAsync(Guid userId, int page, int pageSize)` returns `Task<PagedResult<CharacterResponse>>`.

Implementation: apply `.CountAsync()` first, then `.Skip((page-1)*pageSize).Take(pageSize)`. Existing ordering and match-notification enrichment are preserved and applied only to the current page's items.

> Note: characters are capped at 3/user today. Pagination won't fire in practice, but the endpoint is correct and tests verify it.

### Matches endpoint

`GET /api/character-matches?page=1&pageSize=12&gameId=<optional-guid>`

- Same `page`/`pageSize` defaults and clamping as above
- Optional `gameId` filter preserved — applied before Count and Skip/Take

`ICharacterMatchService.GetMatchesAsync(Guid userId, Guid? gameId, int page, int pageSize)` returns `Task<PagedResult<CharacterMatchDto>>`.

---

## Frontend

### API layer

`getCharacters(page: number, pageSize: number): Promise<PagedResult<Character>>`

`getMatches(page: number, pageSize: number, gameId?: string): Promise<PagedResult<CharacterMatchDto>>`

`PagedResult<T>` TypeScript type is already exported from `src/api/endpoints/userGames.ts`. Both `characters.ts` and `matches.ts` import it directly: `import type { PagedResult } from './userGames'`.

### CharacterPage

- Add `page`, `totalCount` state; `PAGE_SIZE = 12` constant
- The existing `Promise.all([getCharacters(), getUserGames(1, 12)])` becomes `Promise.all([getCharacters(page, PAGE_SIZE), getUserGames(1, 12)])`
- Effect re-runs on `[targetId, page]`
- `totalCount` set from `result.totalCount`; `characters` set from `result.items`
- `PaginationControls` placed in existing header div (right-aligned, only shown when `totalCount > 0`)
- `<Gallery key={page} stickyRows>` — `key={page}` resets scroll on page change
- Selected character persists across page changes (cleared only on explicit selection of a different character or deletion)
- After delete: same page-decrement logic as GamesPage

### MatchesPage

- Add `page`, `totalCount` state; `PAGE_SIZE = 12` constant
- `getMatches(page, PAGE_SIZE)` replaces `getMatches()`
- Remove existing `.slice(0, 6)` — server-side pagination takes over
- Effect re-runs on `page`
- `PaginationControls` in existing header div
- `<Gallery key={page} stickyRows>`
- Selected match persists across page changes

### RealmRightPage

- Component receives `gameId` as a prop
- Add `page`, `totalCount` state; `PAGE_SIZE = 12` constant
- `getMatches(page, PAGE_SIZE, gameId)` replaces `getMatches(gameId)`
- Remove existing `.slice(0, 6)`
- A dedicated `useEffect` on `gameId` calls `setPage(1)` when the selected game changes, so the gallery resets to the first page on game switch
- Main effect re-runs on `[gameId, page]`
- `PaginationControls` in existing header div
- `<Gallery key={page} stickyRows>`

---

## File Checklist

**Backend:**
- `apps/api/Services/Interfaces/ICharacterService.cs` — update `GetAllCharactersForUserAsync` signature
- `apps/api/Services/CharacterService.cs` — update implementation with Count + Skip/Take
- `apps/api/Controllers/CharactersController.cs` — add `[FromQuery] int page`, `[FromQuery] int pageSize`; return `PagedResult<CharacterResponse>`
- `apps/api/Services/Interfaces/ICharacterMatchService.cs` — update `GetMatchesAsync` signature
- `apps/api/Services/CharacterMatchService.cs` — update implementation with Count + Skip/Take
- `apps/api/Controllers/CharacterMatchesController.cs` — add `[FromQuery] int page`, `[FromQuery] int pageSize`; return `PagedResult<CharacterMatchDto>`
- `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs` — update response deserialization + add pagination tests
- `apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs` — update response deserialization + add pagination tests

**Frontend:**
- `apps/web/src/api/endpoints/characters.ts` — update `getCharacters` signature + add `PagedResult<T>` type
- `apps/web/src/api/endpoints/matches.ts` — update `getMatches` signature + add `PagedResult<T>` type
- `apps/web/src/pages/CharacterPage.tsx` — add pagination state, update effect, update header
- `apps/web/src/pages/MatchesPage.tsx` — add pagination state, remove `.slice(0, 6)`, update header
- `apps/web/src/components/RealmRightPage.tsx` — add pagination state, remove `.slice(0, 6)`, reset on gameId change, update header

---

## Out of Scope

- Discovery panel (left side of realm) — already fully paginated
- URL-synced `?page=` param
- Infinite scroll
