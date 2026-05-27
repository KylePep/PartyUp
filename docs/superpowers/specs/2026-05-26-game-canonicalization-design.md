# Game Canonicalization & Player Population Design

**Date:** 2026-05-26
**Status:** Approved

## Problem

RAWG returns different editions, expansions, and DLCs of a game as separate entries. Users who select different editions of the same game (e.g. "ESO: Morrowind" vs "Elder Scrolls Online") end up in separate pools and never match. `exclude_additions` exists in the RAWG client but is imperfect — FFXIV: A Realm Reborn gets incorrectly excluded even though it is the canonical live version of the game.

## Goal

When a user selects a game that RAWG classifies as an addition/DLC, redirect them into the parent (canonical) game's player pool instead. Show player population counts on search results so users can gauge how active a game is.

## Approach

Use RAWG's `parent_game` field on the detailed game endpoint (`/api/games/{id}`) as the source of truth for canonicalization. Store the parent reference on our `Game` entity. Intercept at UserGame creation time and redirect additions to their parent. No AI involved.

## Data Model Changes

### `RawgGameDetailed` DTO

Add `Parent_Game` to capture RAWG's classification:

```csharp
public class RawgParentGame
{
  public int Id { get; set; }
  public string Name { get; set; } = string.Empty;
}

// Added to RawgGameDetailed:
public RawgParentGame? Parent_Game { get; set; }
```

### `Game` Entity

Add a nullable `ParentExternalId` column:

```csharp
public int? ParentExternalId { get; set; }
```

- `null` = this game is canonical
- non-null = this game is an addition; the value points to the canonical game's RAWG ID
- Requires one EF migration (nullable column, no default needed)

### `GameSimple` DTO

Add player count to search results:

```csharp
public int PlayerCount { get; set; }
```

### `AddGameResult` DTO (new)

Return value from UserGame creation, replacing or wrapping the existing response:

```csharp
public class AddGameResult
{
  public UserGame UserGame { get; set; } = null!;
  public bool Redirected { get; set; }
  public string? Message { get; set; }
}
```

## Game Persistence Logic

`GetAndPersistGameDetails` stores `ParentExternalId` from the RAWG response with no additional API calls:

```csharp
ParentExternalId = rawgGame.Parent_Game?.Id
```

The parent game itself is not eagerly fetched here — that happens at UserGame creation time if and when a user actually selects the addition.

## UserGame Creation Interception

When a user adds a game, `UserGameService` runs this logic before enrolling them:

1. Fetch and persist the selected game via `GetAndPersistGameDetails` (captures `ParentExternalId`)
2. If `ParentExternalId` is set:
   a. Call `GetAndPersistGameDetails` on the parent ID (no-op if already in DB, RAWG fetch if not)
   b. Enroll the user in the **parent** game instead
   c. Set `Redirected = true` and build the message: `"{selectedName} is an expansion — we've added you to {parentName} instead."`
3. If `ParentExternalId` is null, enroll normally with `Redirected = false`
4. If RAWG is unreachable when fetching the parent, fall back to enrolling in the originally selected game — no error, no redirect message

## Search Enhancement

After receiving RAWG search results, the service runs a single DB query to get player counts:

1. Collect all `ExternalId`s from the RAWG result set
2. Query `UserGames` → `Games`, grouping by canonical ID (`ParentExternalId ?? ExternalId`), filtered to the collected IDs
3. Merge counts into `GameSimple` DTOs — unmatched entries get `PlayerCount = 0`

Single `GROUP BY` query, no N+1, no extra RAWG calls.

## Frontend Changes

### Search Results

Display `PlayerCount` on each game card. Show "42 players" when count > 0, "Be the first!" when 0.

### UserGame Creation

After a successful add, check `Redirected` on the response:
- `false` — existing behavior unchanged
- `true` — display a non-blocking toast with the `Message` string from the backend

No frontend logic for building the message — the backend sends the full string.

## Out of Scope

- Filtering by DLC intent on the character (e.g. "What are you looking for a party for?") — future feature
- Admin tooling to override RAWG's `parent_game` classification
- Chaining parent lookups more than one level deep (RAWG's `parent_game` always points to the base game)
