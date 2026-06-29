# Realm Activity Sort

**Date:** 2026-06-29
**Status:** Approved

## Problem

The home page and Realms binder both show realms ordered by creation date. Users with older test data never see their active realms near the top, making the experience feel stale.

## Goal

Order realms by most recent activity everywhere they are listed, so the realm a user last interacted with always surfaces first.

## Scope

- **In:** `UserGameService.GetUserGames` — the single backend method that both the home page and Realms binder consume via `GET /api/user-games`
- **Out:** No frontend changes, no DB migration, no DTO additions, no interface signature changes

## Activity Definition

For a given `UserGame`, the `LastActivityAt` timestamp is the maximum of:

| Source | Field | Condition |
|---|---|---|
| `UserGame` | `CreatedAt` | Always present (baseline) |
| `CharacterInteraction` | `CreatedAt` | `FromCharacterId` is one of the realm's characters (user swiped on someone) |
| `CharacterMatch` | `MatchedAt` | `CharacterAId` or `CharacterBId` is one of the realm's characters |
| `StickerMessage` | `SentAt` | Message is in a match where one of the realm's characters is involved (sent or received) |

Dislikes count as activity (any swipe shows engagement). Received sticker messages count (not just sent).

## Implementation

### `UserGameService.GetUserGames` (only change)

Replace the current `Include → OrderBy(CreatedAt) → Select → Skip/Take → ToList` pipeline with a two-stage approach:

**Stage 1 — DB fetch with activity timestamps**

Project each `UserGame` to an anonymous type containing `GameName`, `GameImageUrl`, `CreatedAt`, and three nullable subquery results:

```csharp
LatestInteraction = _db.CharacterInteractions
    .Where(ci => _db.Characters
        .Where(c => c.UserGameId == ug.Id)
        .Select(c => c.Id)
        .Contains(ci.FromCharacterId))
    .Select(ci => (DateTime?)ci.CreatedAt)
    .Max(),

LatestMatch = _db.CharacterMatches
    .Where(cm =>
        _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterAId) ||
        _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterBId))
    .Select(cm => (DateTime?)cm.MatchedAt)
    .Max(),

LatestMessage = _db.StickerMessages
    .Where(sm => _db.CharacterMatches
        .Where(cm =>
            _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterAId) ||
            _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterBId))
        .Select(cm => cm.Id)
        .Contains(sm.MatchId))
    .Select(sm => (DateTime?)sm.SentAt)
    .Max()
```

EF Core translates each into a correlated SQL subquery. `.ToListAsync()` executes one DB round-trip returning ≤24 rows.

**Stage 2 — in-memory sort and pagination**

```csharp
LastActivityAt = MAX(CreatedAt, LatestInteraction ?? DateTime.MinValue,
                     LatestMatch ?? DateTime.MinValue, LatestMessage ?? DateTime.MinValue)
```

Sort descending by `LastActivityAt`, apply `Skip / Take` for the requested page, project to `UserGameResponse`.

### Files touched

| File | Change |
|---|---|
| `apps/api/Services/UserGameService.cs` | Replace query in `GetUserGames` |

### Files not touched

- `IUserGameService.cs` — signature unchanged
- `UserGamesController.cs` — unchanged
- `UserGameResponse.cs` — unchanged (callers don't need `LastActivityAt`)
- All frontend files — unchanged
- No EF migration

## Performance

Users are capped at 24 realms. The in-memory sort is trivial. The three correlated subqueries per realm are indexed by FK (`Character.UserGameId`, `CharacterInteraction.FromCharacterId`, `CharacterMatch.CharacterAId/B`, `StickerMessage.MatchId`) — acceptable for this data size.
