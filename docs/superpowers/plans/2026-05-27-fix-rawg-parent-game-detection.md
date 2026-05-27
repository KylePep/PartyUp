# Fix RAWG Parent Game Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the DLC-to-parent-game redirect so that adding an expansion (e.g., Iceborne, FFXIV Heavensward) correctly redirects the UserGame to the base game.

**Architecture:** RAWG's game-detail endpoint (`/api/games/{id}`) never populates the `parent_game` field — it only provides a `parents_count` integer. The actual parent must be fetched from a separate `/api/games/{id}/parent-games` endpoint. The fix threads this two-step lookup through `RawgClient` → `GameService.GetAndPersistGameDetails` (for new games) and a new `TryPopulateParentExternalId` helper (for stale DB records already missing the parent link). The `FakeRawgHandler` in tests is updated to mirror real RAWG behavior so tests remain meaningful.

**Tech Stack:** ASP.NET Core 8, EF Core, xUnit, `System.Text.Json` (`GetFromJsonAsync` with case-insensitive matching)

---

## Root Cause (for reference)

Real RAWG `/api/games/366889` response (Monster Hunter World: Iceborne):
```json
{
  "id": 366889,
  "name": "Monster Hunter World: Iceborne",
  "parents_count": 1,
  "parent_game": null   ← always null in the real API
}
```

The actual parent is returned by `/api/games/366889/parent-games`:
```json
{
  "count": 1,
  "results": [{ "id": 46889, "name": "Monster Hunter: World", ... }]
}
```

Our code checked `rawgGame.Parent_Game?.Id` which is always `null` → `ParentExternalId` was never set → redirect never happened.

---

## Files Changed

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs` | Modify | Remove unused `Parent_Game` / `RawgParentGame`; add `ParentsCount` |
| `apps/api/Infrastructure/Clients/RawgClient.cs` | Modify | Add `GetParentGames(int id)` method |
| `apps/api/Services/Interfaces/IGameService.cs` | Modify | Add `TryPopulateParentExternalId(Game)` to interface |
| `apps/api/Services/GameService.cs` | Modify | Use parent-games endpoint in `GetAndPersistGameDetails`; implement `TryPopulateParentExternalId` |
| `apps/api/Services/UserGameService.cs` | Modify | Call `TryPopulateParentExternalId` for stale DB records |
| `apps/tests/.../Infrastructure/FakeRawgHandler.cs` | Modify | Switch from inline `parent_game` to `parents_count` + `/parent-games` endpoint |
| `apps/tests/.../Features/UserGames/UserGameTests.cs` | Modify | Add test for stale-record redirect |

---

## Task 1: Update `RawgGameDetailed` — capture `parents_count`, drop dead `parent_game`

**Files:**
- Modify: `apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs`

- [ ] **Step 1: Replace the file content**

Replace the entire file with:

```csharp
namespace PartyUp.Api.Models.DTOs.Rawg;

public class RawgGameDetailed
{
  public int Id { get; set; }
  public string Name { get; set; } = string.Empty;
  public string Description { get; set; } = string.Empty;
  public string? Background_Image { get; set; }
  public string? Website { get; set; }
  public double Rating { get; set; }
  public List<RawgPlatformWrapper> Platforms { get; set; } = [];

  /// <summary>
  /// Number of parent games (>0 means this game is a DLC/expansion).
  /// Populated by RAWG in the game-detail response; actual parent details
  /// require a separate call to /api/games/{id}/parent-games.
  /// </summary>
  public int ParentsCount { get; set; }
}

public class RawgPlatformWrapper
{
  public RawgPlatform Platform { get; set; } = null!;
}

public class RawgPlatform
{
  public int Id { get; set; }
  public string Slug { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
}
```

Note: `RawgParentGame` is removed (it modelled a field RAWG never actually populates). The `Parents_Count` JSON key from RAWG is `parents_count`; `GetFromJsonAsync` uses case-insensitive matching, so `ParentsCount` ↔ `parents_count` resolves automatically.

- [ ] **Step 2: Build to confirm no compile errors**

```
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors. (There may be a warning about the removed `RawgParentGame` usage — that gets cleaned up in Task 3.)

- [ ] **Step 3: Commit**

```
git add apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs
git commit -m "refactor: replace Parent_Game with ParentsCount in RawgGameDetailed"
```

---

## Task 2: Add `GetParentGames` to `RawgClient`

**Files:**
- Modify: `apps/api/Infrastructure/Clients/RawgClient.cs`

- [ ] **Step 1: Add the method to `RawgClient`**

Open `apps/api/Infrastructure/Clients/RawgClient.cs`. After the existing `GetGameById` method (line 47), add:

```csharp
  public async Task<RawgResponse?> GetParentGames(int id)
  {
    var key = _config["Rawg:ApiKey"];
    if (string.IsNullOrEmpty(key))
      throw new Exception("RAWG API key missing");

    var url = $"https://api.rawg.io/api/games/{id}/parent-games?key={key}";

    return await _http.GetFromJsonAsync<RawgResponse>(url);
  }
```

`RawgResponse` already has `Count` and `Results: List<RawgGame>`, and `RawgGame` has `Id`, `Name`, `Background_Image` — exactly what the parent-games endpoint returns.

- [ ] **Step 2: Build**

```
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```
git add apps/api/Infrastructure/Clients/RawgClient.cs
git commit -m "feat: add GetParentGames endpoint to RawgClient"
```

---

## Task 3: Fix `GameService` — use parent-games in `GetAndPersistGameDetails`, add `TryPopulateParentExternalId`

**Files:**
- Modify: `apps/api/Services/Interfaces/IGameService.cs`
- Modify: `apps/api/Services/GameService.cs`

- [ ] **Step 1: Add `TryPopulateParentExternalId` to `IGameService`**

Replace the entire `apps/api/Services/Interfaces/IGameService.cs` with:

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;

public interface IGameService
{
  Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, bool? exclude_additions, List<string>? tags);
  Task<Game?> GetGameById(int id);
  Task<Game?> GetGameByDbId(Guid id);
  Task<Game?> getGameByExternalId(int id);
  Task<Game?> GetAndPersistGameDetails(int id);

  /// <summary>
  /// Calls RAWG's /parent-games endpoint and, if a parent is found, updates
  /// <paramref name="game"/>.ParentExternalId and saves to the DB.
  /// No-op if the game already has a ParentExternalId or if RAWG returns none.
  /// Used to backfill stale Game records that were persisted before this fix.
  /// </summary>
  Task TryPopulateParentExternalId(Game game);
}
```

- [ ] **Step 2: Implement the two changes in `GameService`**

Replace the entire `apps/api/Services/GameService.cs` with:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;
using PartyUp.Api.Infrastructure.Clients;
using PartyUp.Api.Infrastructure.Data;

namespace PartyUp.Api.Services;

public class GameService : IGameService
{
  private readonly RawgClient _rawg;
  private readonly AppDbContext _db;
  private const int PageSize = 20;

  public GameService(RawgClient rawg, AppDbContext db)
  {
    _rawg = rawg;
    _db = db;
  }

  public async Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, bool? exclude_additions, List<string>? tags)
  {
    var response = await _rawg.GetGames(q, page, genres, exclude_additions, tags);

    var games = response.Results.Select(g => new GameSimple
    {
      ExternalId = g.Id,
      Name = g.Name,
      ImageUrl = g.Background_Image
    }).ToList();

    if (games.Count > 0)
    {
      var externalIds = games.Select(g => g.ExternalId).ToList();

      var counts = await _db.UserGames
          .Include(ug => ug.Game)
          .Where(ug => externalIds.Contains(ug.Game.ExternalId))
          .GroupBy(ug => ug.Game.ExternalId)
          .Select(g => new { ExternalId = g.Key, Count = g.Count() })
          .ToDictionaryAsync(x => x.ExternalId, x => x.Count);

      foreach (var game in games)
      {
        if (counts.TryGetValue(game.ExternalId, out var count))
          game.PlayerCount = count;
      }
    }

    return new PagedGamesResult
    {
      Games = games,
      TotalCount = response.Count,
      Page = page,
      TotalPages = response.Count == 0 ? 1 : (int)Math.Ceiling(response.Count / (double)PageSize)
    };
  }

  public async Task<Game?> GetGameById(int id)
  {
    var dbGame = await _db.Games
      .FirstOrDefaultAsync(g => g.ExternalId == id);
    if (dbGame != null)
      return dbGame;

    var rawgGame = await _rawg.GetGameById(id);
    if (rawgGame == null)
      return null;

    return new Game
    {
      ExternalId = rawgGame.Id,
      Name = rawgGame.Name,
      Description = rawgGame.Description,
      ImageUrl = rawgGame.Background_Image,
      Website = rawgGame.Website,
      Rating = rawgGame.Rating,
      Platforms = rawgGame.Platforms.Select(p => p.Platform.Name).ToList()
    };
  }

  public async Task<Game?> GetGameByDbId(Guid id)
  {
    var game = await _db.Games.FindAsync(id);
    return game;
  }

  public async Task<Game?> getGameByExternalId(int externalId)
  {
    var game = await _db.Games
      .FirstOrDefaultAsync(g => g.ExternalId == externalId);
    return game;
  }

  public async Task<Game?> GetAndPersistGameDetails(int externalId)
  {
    var rawgGame = await _rawg.GetGameById(externalId);
    if (rawgGame == null)
      return null;

    // RAWG never populates parent_game inline — parents_count > 0 means we
    // need a second call to /api/games/{id}/parent-games to get the actual parent.
    int? parentExternalId = null;
    if (rawgGame.ParentsCount > 0)
    {
      var parentsResponse = await _rawg.GetParentGames(externalId);
      parentExternalId = parentsResponse?.Results.FirstOrDefault()?.Id;
    }

    var game = new Game
    {
      Name = rawgGame.Name,
      ExternalId = rawgGame.Id,
      ImageUrl = rawgGame.Background_Image,
      Description = rawgGame.Description,
      Website = rawgGame.Website,
      Rating = rawgGame.Rating,
      Platforms = rawgGame.Platforms.Select(p => p.Platform.Name).ToList(),
      SchemaStatus = PartyUp.Api.Models.Enums.SchemaStatus.Pending,
      ParentExternalId = parentExternalId
    };

    _db.Games.Add(game);
    await _db.SaveChangesAsync();
    return game;
  }

  public async Task TryPopulateParentExternalId(Game game)
  {
    // Already populated — nothing to do.
    if (game.ParentExternalId.HasValue)
      return;

    var parentsResponse = await _rawg.GetParentGames(game.ExternalId);
    var parentId = parentsResponse?.Results.FirstOrDefault()?.Id;

    if (parentId == null)
      return;

    game.ParentExternalId = parentId;
    await _db.SaveChangesAsync();
  }
}
```

- [ ] **Step 3: Build**

```
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```
git add apps/api/Services/Interfaces/IGameService.cs apps/api/Services/GameService.cs
git commit -m "feat: fix parent game detection — use RAWG parent-games endpoint"
```

---

## Task 4: Update `UserGameService` to handle stale DB records

**Files:**
- Modify: `apps/api/Services/UserGameService.cs`

The `UserGameService` needs to handle games that are already in the DB but have a null `ParentExternalId` (records written before this fix). When such a game is found, it calls `TryPopulateParentExternalId` before the redirect check.

- [ ] **Step 1: Add the stale-record fix in `AddGameToUser`**

In `apps/api/Services/UserGameService.cs`, replace lines 29–34 (the block that sets `selectedGame`):

**Old code:**
```csharp
        var existingSelected = await _gameService.getGameByExternalId(request.ExternalId);
        var isSelectedNew = existingSelected == null;
        var selectedGame = existingSelected ?? await _gameService.GetAndPersistGameDetails(request.ExternalId);

        if (selectedGame == null)
            throw new InvalidOperationException("Game not found.");
```

**New code:**
```csharp
        var existingSelected = await _gameService.getGameByExternalId(request.ExternalId);
        var isSelectedNew = existingSelected == null;

        // If the game is already in the DB but was persisted before the
        // parent-games fix, ParentExternalId will be null even for DLCs.
        // Re-check RAWG so the redirect logic below can work correctly.
        if (existingSelected != null && !existingSelected.ParentExternalId.HasValue)
            await _gameService.TryPopulateParentExternalId(existingSelected);

        var selectedGame = existingSelected ?? await _gameService.GetAndPersistGameDetails(request.ExternalId);

        if (selectedGame == null)
            throw new InvalidOperationException("Game not found.");
```

- [ ] **Step 2: Build**

```
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```
git add apps/api/Services/UserGameService.cs
git commit -m "feat: backfill ParentExternalId for stale DB records on add"
```

---

## Task 5: Fix `FakeRawgHandler` to mirror real RAWG behavior

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Infrastructure/FakeRawgHandler.cs`

The fake currently inlines `parent_game` in the game-detail JSON (which real RAWG never does). This made tests pass but masked that the real integration was broken. Fix the fake to use `parents_count` + a `/parent-games` route.

- [ ] **Step 1: Replace `FakeRawgHandler.cs`**

Replace the entire file with:

```csharp
using System.Net;
using System.Text;
using System.Web;

namespace PartyUp.Api.Tests.Infrastructure;

internal sealed class FakeRawgHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri!.AbsolutePath.TrimEnd('/');
        var segments = path.Split('/');
        string json;

        // /api/games/{id}/parent-games
        if (segments.Length >= 2 && segments[^1] == "parent-games"
            && int.TryParse(segments[^2], out var parentOfId))
        {
            // Game 91001 is an addition of game 91000
            json = parentOfId == 91001
                ? """{"count":1,"results":[{"id":91000,"name":"Game 91000","background_image":null}]}"""
                : """{"count":0,"results":[]}""";
        }
        // /api/games/{id}
        else if (int.TryParse(segments[^1], out var id))
        {
            // Game 91001 has parents_count=1; all others have parents_count=0.
            // Real RAWG never populates parent_game inline — parents_count is the signal.
            var parentsCount = id == 91001 ? 1 : 0;
            json = $$"""{"id":{{id}},"name":"Game {{id}}","description":"","background_image":null,"website":null,"rating":4.0,"platforms":[],"parents_count":{{parentsCount}}}""";
        }
        // /api/games  (search)
        else
        {
            var queryParams = HttpUtility.ParseQueryString(request.RequestUri.Query);
            var searchTerm = queryParams["search"];
            json = searchTerm == "testgame"
                ? """{"count":1,"results":[{"id":91000,"name":"Game 91000","background_image":null}]}"""
                : """{"count":0,"results":[]}""";
        }

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });
    }
}
```

- [ ] **Step 2: Run existing redirect tests to verify they still pass**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~UserGameTests" --logger "console;verbosity=detailed"
```

Expected: All existing UserGame tests pass (redirect tests still green, now going through the correct two-step RAWG path).

- [ ] **Step 3: Commit**

```
git add apps/tests/PartyUp.Api.Tests/Infrastructure/FakeRawgHandler.cs
git commit -m "test: update FakeRawgHandler to use parents_count + parent-games endpoint"
```

---

## Task 6: Add a test for the stale-record redirect path

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`

This test verifies that a game already in the DB with `ParentExternalId = null` (a stale record) still redirects correctly when added a second time (after the UserGame for it was deleted).

- [ ] **Step 1: Add the test**

In `UserGameTests.cs`, add this test after the existing `AddGame_Addition_RedirectsToParent` test (around line 167):

```csharp
  [Fact]
  public async Task AddGame_StaleRecord_StillRedirectsToParent()
  {
      // Arrange: two independent users so we can add 91001 twice
      var clientA = await CreateAuthenticatedClientAsync();
      var clientB = await CreateAuthenticatedClientAsync();

      // clientA adds the addition first — this persists the Game record
      // and creates a UserGame (both for game 91000 via redirect).
      var firstAdd = await clientA.PostAsJsonAsync("/api/user-games", new
      {
          externalId = 91001,
          name = "Game 91001",
          imageUrl = (string?)null
      });
      firstAdd.EnsureSuccessStatusCode();

      // clientB now adds the same DLC — the Game row for 91001 is already in the
      // DB. TryPopulateParentExternalId should re-check RAWG and redirect to 91000.
      var secondAdd = await clientB.PostAsJsonAsync("/api/user-games", new
      {
          externalId = 91001,
          name = "Game 91001",
          imageUrl = (string?)null
      });

      secondAdd.StatusCode.Should().Be(HttpStatusCode.OK);
      var result = await secondAdd.Content.ReadFromJsonAsync<AddGameResultDto>();
      result!.Redirected.Should().BeTrue();
      result.UserGame.GameName.Should().Be("Game 91000");
  }
```

- [ ] **Step 2: Run the full UserGame test suite**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~UserGameTests" --logger "console;verbosity=detailed"
```

Expected: All tests pass including the new one.

- [ ] **Step 3: Run all tests to ensure nothing is broken**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```
git add apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs
git commit -m "test: add stale-record redirect test for UserGameService"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| New DLC games get `ParentExternalId` set correctly | Task 3 (`GetAndPersistGameDetails`) |
| Stale DB records (already persisted without parent) still redirect | Task 4 (`UserGameService`) + Task 6 (test) |
| FakeRawgHandler mirrors real RAWG behavior | Task 5 |
| All existing redirect tests still pass | Task 5 step 2 |
| Unused `parent_game` / `RawgParentGame` removed | Task 1 |

### Placeholder Scan

No TBD, TODO, or vague steps. All code is complete and exact.

### Type Consistency

- `RawgClient.GetParentGames(int id)` returns `RawgResponse?` — used in `GameService` as `await _rawg.GetParentGames(externalId)` ✓
- `RawgResponse.Results` is `List<RawgGame>`, `RawgGame.Id` is `int` — used as `parentsResponse?.Results.FirstOrDefault()?.Id` ✓
- `IGameService.TryPopulateParentExternalId(Game game)` → `GameService.TryPopulateParentExternalId(Game game)` ✓
- `UserGameService` calls `_gameService.TryPopulateParentExternalId(existingSelected)` where `existingSelected` is `Game?` — only called when non-null ✓
- `RawgGameDetailed.ParentsCount` (int) — JSON field `parents_count` from RAWG, deserialized case-insensitively ✓
