# Design: Resource Limits (Characters & Realms)

**Date:** 2026-05-27  
**Branch:** feat/resource-limits (to be created)  
**Scope:** Enforce per-user limits of 3 characters and 10 UserGames (realms); surface counts and blocking messages in the UI.

---

## Problem

There is no cap on how many characters or UserGame connections a user can create. A power user could create thousands of each, which is undesirable for the platform at this stage.

---

## Goals

- Hard limit: 3 characters per user (globally, across all UserGames)
- Hard limit: 10 UserGames per user
- Backend enforces both limits and returns 409 Conflict if exceeded
- Frontend shows live usage counts (e.g. `2 / 3 characters`) and replaces create/add controls with a friendly blocking message when at the limit
- Limits are defined in one place on the frontend so they're easy to change

---

## Backend Changes

### `apps/api/Services/CharacterService.cs` — `CreateCharacterAsync`

Add a count check before inserting, using the existing `_db` context. Count all characters where the UserGame belongs to the requesting user:

```csharp
var count = await _db.Characters.CountAsync(c => c.UserGame.UserId == userId);
if (count >= 3)
    throw new InvalidOperationException("Character limit reached.");
```

This throws before the UserGame ownership check so the error is surfaced early.

### `apps/api/Controllers/CharactersController.cs` — `CreateCharacter`

Wrap the `_characterService.CreateCharacterAsync` call in try/catch:

```csharp
try
{
    var result = await _characterService.CreateCharacterAsync(userId, request.UserGameId, request);
    if (result == null)
        return NotFound("UserGame not found or does not belong to you.");
    return CreatedAtAction(nameof(GetMyCharacters), result);
}
catch (InvalidOperationException ex)
{
    return Conflict(new { message = ex.Message });
}
```

### `apps/api/Services/UserGameService.cs` — `AddGameToUser`

Add a realm count check at the top of the method, before the "already added" check:

```csharp
var gameCount = await _db.UserGames.CountAsync(ug => ug.UserId == userId);
if (gameCount >= 10)
    throw new InvalidOperationException("Realm limit of 10 reached.");
```

The `UserGamesController` already catches `InvalidOperationException` and returns 409 Conflict, so no controller change is needed here.

---

## Frontend Changes

### New: `apps/web/src/utils/limits.ts`

```ts
export const CHARACTER_LIMIT = 3
export const USER_GAME_LIMIT = 10
```

Single source of truth for both limits on the frontend.

### `apps/web/src/components/CharacterGallery.tsx`

After characters load, render a usage label above the grid:

```
2 / 3 characters
```

- Styled `text-xs font-mono text-muted mb-4`
- Shown in all non-loading states (empty, ready) — so a new user sees `0 / 3 characters`

### `apps/web/src/components/CharacterPanel.tsx`

When `status === 'empty'` (no character for the current game), make one additional `getCharacters()` call to determine the user's global character count.

- **`totalCount < CHARACTER_LIMIT`**: show the existing "Create Character" `<Link>` button unchanged
- **`totalCount >= CHARACTER_LIMIT`**: replace the button with an inline muted message:  
  `"3 / 3 characters — delete one to create a new one"`  
  styled `text-xs font-mono text-muted text-center`

The `getCharacters()` call is only made when `status === 'empty'` (no local character), so it does not fire for users who already have a character for the current game.

### `apps/web/src/components/UserRealmsSection.tsx`

The component already receives `games: UserGame[]`. When `games.length >= USER_GAME_LIMIT`, replace the search input and button in the "Add a Realm" section with:

```
10 / 10 realms — remove one to add a new game
```

styled `text-xs font-mono text-muted`. The realm grid and remove-confirmation modal remain fully functional.

---

## Tests

Two new integration test cases in `apps/tests/PartyUp.Api.Tests/`:

### Character limit test

In the characters test class (following existing `xUnit` + `WebApplicationFactory` patterns):
1. Seed a user with 3 characters across 3 separate UserGames
2. POST `/api/characters` for a 4th character
3. Assert HTTP 409 and `message` contains `"Character limit reached."`

### Realm limit test

In the user-games test class:
1. Seed a user with 10 UserGames
2. POST `/api/user-games` for an 11th game
3. Assert HTTP 409 and `message` contains `"Realm limit"`

---

## Files Changed

| File | Action |
|------|--------|
| `apps/api/Services/CharacterService.cs` | Modify — add count check before create |
| `apps/api/Controllers/CharactersController.cs` | Modify — add try/catch for InvalidOperationException |
| `apps/api/Services/UserGameService.cs` | Modify — add count check before add |
| `apps/web/src/utils/limits.ts` | Create — CHARACTER_LIMIT and USER_GAME_LIMIT constants |
| `apps/web/src/components/CharacterGallery.tsx` | Modify — add usage label |
| `apps/web/src/components/CharacterPanel.tsx` | Modify — fetch global count, show blocking message |
| `apps/web/src/components/UserRealmsSection.tsx` | Modify — show blocking message when at realm limit |
| `apps/tests/PartyUp.Api.Tests/` | Modify — two new integration tests |
