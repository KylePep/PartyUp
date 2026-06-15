# Parent Game Choice Modal — Design Spec

**Date:** 2026-06-15
**Status:** Approved

## Problem

When a user adds a game that has a parent on RAWG, the backend silently redirects them to the parent game. RAWG's parent data is unreliable — TFT's parent is "Gangster Theft Crime City Game" — so blind auto-assignment produces bad UX and incorrect realm groupings.

## Goal

Give the user an informed choice between their selected game and the detected parent game, with enough context (realm population, game imagery) to make a good decision. Also pitch the value of joining a shared realm to nudge users toward consolidation.

## Chosen Approach

**Option A: New "parent preview" endpoint + explicit skip flag on `addUserGame`.**

- A read-only preview endpoint resolves parent info and realm counts without committing anything.
- `addUserGame` gains a `skipParentRedirect` flag for when the user explicitly picks the child game.
- Frontend: confirm intent first (existing modal), then fetch preview, then show choice modal if parent exists.

## Backend

### New endpoint: `GET /api/games/parent-preview?externalId={id}`

Read-only. Reuses existing parent-detection logic from `GameService`. Does not write to the database.

**Response:**
```json
{
  "selectedGame": {
    "externalId": 123,
    "name": "TeamFight Tactics",
    "imageUrl": "...",
    "realmCount": 0
  },
  "parentGame": {
    "externalId": 456,
    "name": "League of Legends",
    "imageUrl": "...",
    "realmCount": 42
  }
}
```

- `parentGame` is `null` if no parent is detected.
- `realmCount` is a COUNT of `UserGames` rows matching the game's DB `Id`. If the game has never been added by any user, count is 0.
- If RAWG is unreachable, return `parentGame: null` — frontend skips the modal and proceeds directly.

**Implementation notes:**
- Add `ParentPreviewResponse` and `GamePreviewDto` DTOs.
- Add `GetParentPreview(int externalId)` to `IGameService` / `GameService`.
- Add action to `GamesController` (or a new `GameLookupController` if it doesn't exist).
- Count query: `_context.UserGames.CountAsync(ug => ug.GameId == game.Id)`.

### Modified: `POST /api/user-games`

Add optional `skipParentRedirect: bool` (default `false`) to `AddUserGameRequest`.

When `true`, `UserGameService.AddGameToUser()` skips the parent detection branch and adds the game as specified. All other behavior (duplicate check, 24-game limit, schema generation) is unchanged.

This flag is only sent when the user explicitly picks the child game. When they pick the parent, the frontend sends the parent's `externalId` directly — no parent of its own, so no flag needed.

## Frontend

### Flow change in `ScryingOrb.tsx`

`confirmAdd` becomes a two-step process:

1. Call `GET /api/games/parent-preview?externalId=X`.
2. Show a loading state while the request is in flight (spinner or disabled button on the existing confirmation modal).
3. If `parentGame` is non-null → close confirmation modal, open `ParentChoiceModal`.
4. If `parentGame` is null → call `apiAddUserGame` as before (no UX change).

If the user dismisses `ParentChoiceModal` without choosing, treat as cancellation — no game is added, user returns to search state.

### New component: `ParentChoiceModal.tsx`

Location: `apps/web/src/components/ParentChoiceModal.tsx`

**Props:**
```ts
{
  selectedGame: GamePreviewDto;
  parentGame: GamePreviewDto;
  onChoose: (choice: GamePreviewDto) => void;
  onDismiss: () => void;
}
```

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  We noticed [SelectedGame] is related to [ParentGame].  │
│  Grouping players under the same realm helps everyone   │
│  connect. Which realm would you like to join?           │
├───────────────────────┬─────────────────────────────────┤
│   FullArtTcgCard      │   FullArtTcgCard                │
│   [SelectedGame]      │   [ParentGame]                  │
│   realmCount top-right│   realmCount top-right          │
├───────────────────────┼─────────────────────────────────┤
│  [Join this realm]    │   [Join this realm]             │
└───────────────────────┴─────────────────────────────────┘
```

- Uses `FullArtTcgCard` for both game images. Game name in header top-left; realm count (`"No realm yet"` or `"X players"`) in the platform slot top-right.
- `className` on the card wrappers: layout only (`w-*`, `h-*`).
- Both "Join this realm" buttons call `onChoose(choice)`. The caller always sends `skipParentRedirect: true` since the user has made an explicit choice through the modal — no further redirect logic should run regardless of which game they pick.

### New API wrapper: `getParentPreview(externalId: number)`

Location: `apps/web/src/api/endpoints/games.ts`

```ts
export type GamePreviewDto = {
  externalId: number;
  name: string;
  imageUrl: string | null;
  realmCount: number;
};

export type ParentPreviewResponse = {
  selectedGame: GamePreviewDto;
  parentGame: GamePreviewDto | null;
};

export function getParentPreview(externalId: number): Promise<ParentPreviewResponse>
```

## Edge Cases

| Scenario | Behavior |
|---|---|
| No parent found | `parentGame: null` → skip modal, add game directly |
| RAWG unreachable | Return `parentGame: null` → skip modal, add game directly |
| User dismisses modal | No game added, return to search state |
| Selected game already in user's collection | 409 conflict caught at `addUserGame` time (unchanged) |
| Both games already in user's collection | 409 caught at `addUserGame` time (unchanged) |
| Parent game has no realm yet | Show `realmCount: 0` as `"No realm yet"` |

## Files to Change

### Backend
- `apps/api/Services/IGameService.cs` — add `GetParentPreview` method signature
- `apps/api/Services/GameService.cs` — implement `GetParentPreview`
- `apps/api/Controllers/GamesController.cs` — add `parent-preview` action
- `apps/api/Models/DTOs/` — add `ParentPreviewResponse`, `GamePreviewDto`
- `apps/api/Models/DTOs/AddUserGameRequest.cs` — add `SkipParentRedirect` field
- `apps/api/Services/UserGameService.cs` — honor `SkipParentRedirect` in `AddGameToUser`

### Frontend
- `apps/web/src/api/endpoints/games.ts` — add `getParentPreview` wrapper + types
- `apps/web/src/components/orb/ScryingOrb.tsx` — two-step confirm flow
- `apps/web/src/components/ParentChoiceModal.tsx` — new component
