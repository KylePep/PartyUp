# Game Details Enrichment Design

**Date:** 2026-05-07  
**Status:** Approved

## Overview

Enrich the `Game` table with full detail fields (description, website, rating, platforms) sourced from the RAWG API. Details are saved to the DB only when a user adds a game as a UserGame. Browsing the search modal does not persist anything. Once in the DB, details are served from the DB without hitting RAWG again. The frontend shows basic info (name, image) immediately in both modals, then progressively fills in details as a second fetch resolves.

---

## 1. Database — Game Entity

Add four new columns to the `Game` entity:

```csharp
public string? Description { get; set; }
public string? Website { get; set; }
public double Rating { get; set; }
public List<string> Platforms { get; set; } = [];
```

`Platforms` is stored as a JSONB column via an EF value converter (serialize/deserialize `List<string>` ↔ JSON text). `Description` and `Website` are nullable; existing rows stay valid. `Rating` defaults to `0`.

A new EF Core migration applies these columns. No data migration required — existing `Game` rows simply have null description/website until a user enters a realm (triggering enrichment on add, or a fresh fetch on the detail endpoint).

A "Game is enriched" predicate is `Description != null`.

---

## 2. Backend Services

### IGameService / GameService

Add one new interface method:

```csharp
Task<GameDetails?> GetGameByDbId(Guid id);
Task<GameDetails?> GetAndPersistGameDetails(Game game);
```

`GameService` gets `AppDbContext` injected alongside `RawgClient`.

**`GetGameById(int externalId)`** (existing, updated):
1. Check DB for `Game` where `ExternalId == externalId` AND `Description != null`
2. If found → map to `GameDetails` and return (no RAWG call)
3. If not found or not enriched → call RAWG and return the result **without saving**

**`GetGameByDbId(Guid id)`** (new):
1. Fetch `Game` by primary key from DB
2. Map to `GameDetails` and return; return `null` if not found

**`GetAndPersistGameDetails(Game game)`** (new):
1. Call `RawgClient.GetGameById(game.ExternalId)`
2. Update the `game` entity's detail fields (Description, Website, Rating, Platforms) in place
3. `_db.SaveChangesAsync()`
4. Return mapped `GameDetails`

This method is called by `UserGameService` during `AddGameToUser`, keeping all RAWG interaction inside `GameService`.

### IUserGameService / UserGameService

`UserGameService` injects `IGameService` (no circular dependency — `GameService` does not depend on `UserGameService`).

**`AddGameToUser`** (updated):
1. Find or create `Game` with basic info (unchanged)
2. If the game is **not yet enriched** (`Description == null`), call `_gameService.GetAndPersistGameDetails(game)` — this upserts detail fields onto the existing row
3. Create and return `UserGame` (unchanged)

---

## 3. DTOs & Controllers

### New DTO: `UserGameDetailResponse`

```csharp
public class UserGameDetailResponse
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public Guid GameId { get; set; }
  public string GameName { get; set; } = string.Empty;
  public string? GameImageUrl { get; set; }
  // detail fields
  public string? Description { get; set; }
  public string? Website { get; set; }
  public double Rating { get; set; }
  public List<string> Platforms { get; set; } = [];
}
```

### GamesController

Add a second route alongside the existing `GET /api/games/{id:int}`:

```csharp
[HttpGet("{id:guid}")]
public async Task<IActionResult> GetByDbId(Guid id)
```

Route constraints (`{id:int}` vs `{id:guid}`) let ASP.NET Core dispatch correctly. The Guid route calls `_service.GetGameByDbId(id)` and returns 404 if null.

### UserGamesController

`GET /api/user-games/{gameId}/game` returns `UserGameDetailResponse` instead of `UserGameResponse`. The `ToDetailResponse` helper maps from the included `UserGame.Game` navigation property (which includes the new detail fields).

`AddGame` response type stays `UserGameResponse` (basic info is sufficient for the add-confirmation flow).

---

## 4. Frontend API Layer

### `games.ts`

Add type and two fetch functions:

```ts
export type GameDetails = {
  externalId: number;
  name: string;
  description: string;
  imageUrl: string | null;
  website: string | null;
  rating: number;
  platforms: string[];
};

export function getGameDetails(externalId: number): Promise<GameDetails>
// → GET /api/games/{externalId}  (RAWG-backed, no DB write)

export function getGameDetailsByDbId(gameId: string): Promise<GameDetails>
// → GET /api/games/{gameId}  (DB-only)
```

### `userGames.ts`

Add `UserGameDetail` type mirroring `UserGameDetailResponse`:

```ts
export type UserGameDetail = UserGame & {
  description: string | null;
  website: string | null;
  rating: number;
  platforms: string[];
};
```

Update `getUserGameByGameId` return type to `UserGameDetail`.

---

## 5. Frontend — Modal Progressive Enrichment

### `UserGameSelectModal`

Receives `userGame: UserGame` as a prop (basic info, already available). On mount, fires `getUserGameByGameId(userGame.gameId)` — this returns `UserGameDetail` (combined DTO). While loading, the detail section renders a subtle loading state. On resolve, renders:

- Description (up to ~3 lines, no truncation needed for a modal)
- Rating (number display)
- Platforms as small inline tags
- Website as an external link (if present)

The Enter Realm and Delete buttons are available immediately — detail loading is non-blocking.

### `GameSelectModal`

Receives a RAWG `Game` as a prop. On mount, fires `getGameDetails(game.externalId)`. Same progressive pattern — basic info renders immediately, detail section fills in on resolve. **No DB write occurs here.** If details fail to load (network error, etc.), the modal remains fully functional for adding the game; the detail section shows nothing.

---

## 6. Frontend — Realm Page Game Info Section

In `RealmPage`, the existing `getUserGameByGameId(gameId)` call now returns `UserGameDetail`. A new `GameInfoSection` component renders between `GameBanner` and the Discover/Matches tab strip, inside the existing `px-6 md:px-10 max-w-7xl mx-auto` container.

`GameInfoSection` receives the `UserGameDetail` (or `null` while loading) and displays:

- Full description
- Rating
- Platform tags
- Website link (if present)

The section renders only once `userGame` is non-null. No additional API call — data comes from the same `getUserGameByGameId` call already in the page.

---

## 7. Error Handling

- If `GetAndPersistGameDetails` fails (RAWG unreachable), `AddGameToUser` should still succeed — the UserGame is created with an un-enriched game. The detail fields remain null and the modal/realm page shows nothing in the detail sections without error.
- If `GetGameByDbId` returns null (unexpected — game must exist), the modal detail section silently shows nothing; no user-visible error.
- If `getGameDetails` or `getUserGameByGameId` fails in the frontend, the detail section is hidden and the action buttons remain usable.

---

## 8. Out of Scope

- Refreshing/updating stale game details (e.g. RAWG data changed since last save)
- Displaying game details in the swipe/discovery cards
- Ratings display as a star visual (numeric display only for now)
