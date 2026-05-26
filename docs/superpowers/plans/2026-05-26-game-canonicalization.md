# Game Canonicalization & Player Population Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user adds a game that RAWG classifies as an expansion or DLC, redirect them into the canonical parent game's player pool, show a notification message, and display player population counts on game search results.

**Architecture:** RAWG's `/api/games/{id}` response includes a `parent_game` field for additions/DLCs. We store that reference as `ParentExternalId` on our `Game` entity. At UserGame creation time, `UserGameService` checks for a parent and redirects the enrollment there, returning a new `AddGameResult` DTO that includes a `Redirected` flag and message string. `SearchGames` cross-references RAWG results against our `UserGames` table to attach player counts.

**Tech Stack:** ASP.NET Core 8, EF Core + PostgreSQL, React + TypeScript + Vite, xUnit integration tests, FluentAssertions

---

## File Map

| File | Change |
|------|--------|
| `apps/api/Models/Game.cs` | Add `ParentExternalId` property |
| `apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs` | Add `RawgParentGame` class and `Parent_Game` property |
| `apps/api/Models/DTOs/Game/GameSimple.cs` | Add `PlayerCount` property |
| `apps/api/Models/DTOs/UserGame/AddGameResult.cs` | **Create** — new result DTO |
| `apps/api/Services/Interfaces/IUserGameService.cs` | Update `AddGameToUser` return type |
| `apps/api/Services/GameService.cs` | Store `ParentExternalId` in `GetAndPersistGameDetails`; join player counts in `SearchGames` |
| `apps/api/Services/UserGameService.cs` | Redirect logic in `AddGameToUser` |
| `apps/api/Controllers/UserGamesController.cs` | Return `AddGameResult` shape from POST |
| EF migration | `dotnet ef migrations add AddGameParentExternalId` |
| `apps/tests/.../Infrastructure/FakeRawgHandler.cs` | Return `parent_game` for ID 91001; return game 91000 for search query "testgame" |
| `apps/tests/.../Features/UserGames/UserGameTests.cs` | New redirect behavior tests |
| `apps/tests/.../Features/Games/GameSearchTests.cs` | **Create** — player count test |
| `apps/web/src/api/endpoints/userGames.ts` | New `AddUserGameResult` type; update `addUserGame` return type |
| `apps/web/src/api/endpoints/games.ts` | Add `playerCount` to `Game` type |
| `apps/web/src/components/UserRealmsSection.tsx` | Handle redirect response; show toast message |
| `apps/web/src/components/cards/GameCard.tsx` | Display player count badge |

---

### Task 1: Add `ParentExternalId` to `Game` entity

**Files:**
- Modify: `apps/api/Models/Game.cs`

- [ ] **Step 1: Add the property**

Open `apps/api/Models/Game.cs`. Add `ParentExternalId` after `ExternalId`:

```csharp
public class Game
{
    public Guid Id { get; set; }
    public int ExternalId { get; set; }
    public int? ParentExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }
    public string? Website { get; set; }
    public double Rating { get; set; }
    public List<string> Platforms { get; set; } = [];
    public SchemaStatus SchemaStatus { get; set; } = SchemaStatus.Pending;
    public List<GameFieldDefinition> FieldDefinitions { get; set; } = [];
}
```

- [ ] **Step 2: Generate the migration**

```bash
dotnet ef migrations add AddGameParentExternalId --project apps/api
```

Expected: a new file appears in `apps/api/Migrations/` with an `Up` method that adds the nullable `parent_external_id` column to the `Games` table.

- [ ] **Step 3: Apply the migration**

```bash
dotnet ef database update --project apps/api
```

Expected: `Done.`

- [ ] **Step 4: Commit**

```bash
git add apps/api/Models/Game.cs apps/api/Migrations/
git commit -m "feat: add ParentExternalId to Game entity"
```

---

### Task 2: Capture `parent_game` from RAWG and store it

**Files:**
- Modify: `apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs`
- Modify: `apps/api/Services/GameService.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Infrastructure/FakeRawgHandler.cs`

- [ ] **Step 1: Add `RawgParentGame` and `Parent_Game` to the RAWG DTO**

Replace the full contents of `apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs`:

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
  public RawgParentGame? Parent_Game { get; set; }
}

public class RawgParentGame
{
  public int Id { get; set; }
  public string Name { get; set; } = string.Empty;
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

- [ ] **Step 2: Store `ParentExternalId` in `GetAndPersistGameDetails`**

In `apps/api/Services/GameService.cs`, update `GetAndPersistGameDetails` to set `ParentExternalId`:

```csharp
public async Task<Game?> GetAndPersistGameDetails(int externalId)
{
    var rawgGame = await _rawg.GetGameById(externalId);
    if (rawgGame == null)
        return null;

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
        ParentExternalId = rawgGame.Parent_Game?.Id
    };

    _db.Games.Add(game);
    await _db.SaveChangesAsync();
    return game;
}
```

- [ ] **Step 3: Update `FakeRawgHandler` to support `parent_game` for ID 91001 and search results for query "testgame"**

Replace the full contents of `apps/tests/PartyUp.Api.Tests/Infrastructure/FakeRawgHandler.cs`:

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
        var segments = request.RequestUri!.AbsolutePath.TrimEnd('/').Split('/');
        string json;

        if (int.TryParse(segments[^1], out var id))
        {
            // Game 91001 is an addition of game 91000
            var parentJson = id == 91001
                ? ""","parent_game":{"id":91000,"name":"Game 91000"}"""
                : "";
            json = $$"""{"id":{{id}},"name":"Game {{id}}","description":"","background_image":null,"website":null,"rating":4.0,"platforms":[]{{parentJson}}}""";
        }
        else
        {
            var queryParams = HttpUtility.ParseQueryString(request.RequestUri.Query);
            var searchTerm = queryParams["search"];
            if (searchTerm == "testgame")
                json = """{"count":1,"results":[{"id":91000,"name":"Game 91000","background_image":null}]}""";
            else
                json = """{"count":0,"results":[]}""";
        }

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });
    }
}
```

- [ ] **Step 4: Build to verify no compile errors**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```bash
git add apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs apps/api/Services/GameService.cs apps/tests/PartyUp.Api.Tests/Infrastructure/FakeRawgHandler.cs
git commit -m "feat: capture parent_game from RAWG and persist as ParentExternalId"
```

---

### Task 3: Add `AddGameResult` DTO and update interfaces

**Files:**
- Create: `apps/api/Models/DTOs/UserGame/AddGameResult.cs`
- Modify: `apps/api/Services/Interfaces/IUserGameService.cs`

- [ ] **Step 1: Create `AddGameResult`**

Create `apps/api/Models/DTOs/UserGame/AddGameResult.cs`:

```csharp
using PartyUp.Api.Models;

namespace PartyUp.Api.Models.DTOs.UserGame;

public class AddGameResult
{
    public UserGame UserGame { get; set; } = null!;
    public bool Redirected { get; set; }
    public string? Message { get; set; }
}
```

- [ ] **Step 2: Update `IUserGameService`**

Replace the full contents of `apps/api/Services/Interfaces/IUserGameService.cs`:

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;

public interface IUserGameService
{
  Task<AddGameResult> AddGameToUser(Guid userId, AddUserGameRequest request);
  Task<List<UserGame>> GetUserGames(Guid userId);
  Task<UserGame?> GetUserGameByGameId(Guid userId, Guid gameId);
  Task<bool> DeleteUserGame(Guid id, Guid userId);
}
```

- [ ] **Step 3: Build to confirm the interface change breaks the expected places**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build errors in `UserGameService.cs` and `UserGamesController.cs` — those are fixed in the next two tasks.

- [ ] **Step 4: Commit**

```bash
git add apps/api/Models/DTOs/UserGame/AddGameResult.cs apps/api/Services/Interfaces/IUserGameService.cs
git commit -m "feat: add AddGameResult DTO and update IUserGameService interface"
```

---

### Task 4: Implement redirect logic in `UserGameService`

**Files:**
- Modify: `apps/api/Services/UserGameService.cs`
- Test: `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`

- [ ] **Step 1: Write the failing tests**

Add these tests to `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`. Add them inside the `UserGameTests` class, below the existing tests. Also add a new local record `AddGameResultDto` at the bottom of the class alongside the existing `UserGameDto` and `UserGameDetailDto` records:

```csharp
[Fact]
public async Task AddGame_Addition_RedirectsToParent()
{
    var client = await CreateAuthenticatedClientAsync();

    // 91001 is wired in FakeRawgHandler to have parent_game = 91000
    var response = await client.PostAsJsonAsync("/api/user-games", new
    {
        externalId = 91001,
        name = "Game 91001",
        imageUrl = (string?)null
    });

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<AddGameResultDto>();
    result!.Redirected.Should().BeTrue();
    result.Message.Should().Contain("Game 91001");
    result.Message.Should().Contain("Game 91000");
    result.UserGame.GameName.Should().Be("Game 91000");
}

[Fact]
public async Task AddGame_CanonicalGame_NotRedirected()
{
    var client = await CreateAuthenticatedClientAsync();
    var id = Interlocked.Increment(ref _gameCounter);

    var response = await client.PostAsJsonAsync("/api/user-games", new
    {
        externalId = id,
        name = $"Game {id}",
        imageUrl = (string?)null
    });

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<AddGameResultDto>();
    result!.Redirected.Should().BeFalse();
    result.Message.Should().BeNull();
}

[Fact]
public async Task AddGame_TwoUsersSelectDifferentEditions_BothInParentPool()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();

    // clientA selects the addition (91001), clientB selects the canonical (91000)
    var responseA = await clientA.PostAsJsonAsync("/api/user-games", new
    {
        externalId = 91001,
        name = "Game 91001",
        imageUrl = (string?)null
    });
    var responseB = await clientB.PostAsJsonAsync("/api/user-games", new
    {
        externalId = 91000,
        name = "Game 91000",
        imageUrl = (string?)null
    });

    responseA.StatusCode.Should().Be(HttpStatusCode.OK);
    responseB.StatusCode.Should().Be(HttpStatusCode.OK);

    var resultA = await responseA.Content.ReadFromJsonAsync<AddGameResultDto>();
    var resultB = await responseB.Content.ReadFromJsonAsync<AddGameResultDto>();

    // Both should be enrolled in the same game (91000)
    resultA!.UserGame.GameName.Should().Be("Game 91000");
    resultB!.UserGame.GameName.Should().Be("Game 91000");
}

// Add this alongside UserGameDto and UserGameDetailDto at the bottom of the class:
private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AddGame_Addition_RedirectsToParent|FullyQualifiedName~AddGame_CanonicalGame_NotRedirected|FullyQualifiedName~AddGame_TwoUsersSelectDifferentEditions" -v
```

Expected: all three fail — currently `AddGameToUser` returns `UserGame` not `AddGameResult`, and the interface change won't compile yet.

- [ ] **Step 3: Implement redirect logic in `UserGameService`**

Replace the full contents of `apps/api/Services/UserGameService.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Services.Interfaces;

public class UserGameService : IUserGameService
{
    private readonly AppDbContext _db;
    private readonly IGameService _gameService;
    private readonly IServiceScopeFactory _scopeFactory;

    public UserGameService(AppDbContext db, IGameService gameService, IServiceScopeFactory scopeFactory)
    {
        _db = db;
        _gameService = gameService;
        _scopeFactory = scopeFactory;
    }

    public async Task<AddGameResult> AddGameToUser(Guid userId, AddUserGameRequest request)
    {
        var existingSelected = await _gameService.getGameByExternalId(request.ExternalId);
        var isSelectedNew = existingSelected == null;
        var selectedGame = existingSelected ?? await _gameService.GetAndPersistGameDetails(request.ExternalId);

        if (selectedGame == null)
            throw new InvalidOperationException("Game not found.");

        Game canonicalGame;
        bool redirected = false;
        string? message = null;
        bool triggerSchemaGen;
        Guid schemaGenGameId;

        if (selectedGame.ParentExternalId.HasValue)
        {
            var existingParent = await _gameService.getGameByExternalId(selectedGame.ParentExternalId.Value);
            var isParentNew = existingParent == null;
            var parent = existingParent ?? await _gameService.GetAndPersistGameDetails(selectedGame.ParentExternalId.Value);

            // Fall back to selected game if RAWG is unreachable
            canonicalGame = parent ?? selectedGame;
            redirected = parent != null;

            if (redirected)
            {
                message = $"{selectedGame.Name} is an expansion — we've added you to {canonicalGame.Name} instead.";
                triggerSchemaGen = isParentNew;
                schemaGenGameId = canonicalGame.Id;
            }
            else
            {
                triggerSchemaGen = isSelectedNew;
                schemaGenGameId = selectedGame.Id;
            }
        }
        else
        {
            canonicalGame = selectedGame;
            triggerSchemaGen = isSelectedNew;
            schemaGenGameId = selectedGame.Id;
        }

        var alreadyAdded = await _db.UserGames
            .AnyAsync(ug => ug.UserId == userId && ug.GameId == canonicalGame.Id);

        if (alreadyAdded)
            throw new InvalidOperationException("Game already added.");

        var userGame = new UserGame
        {
            UserId = userId,
            GameId = canonicalGame.Id,
            Game = canonicalGame
        };

        _db.UserGames.Add(userGame);
        await _db.SaveChangesAsync();

        if (triggerSchemaGen)
        {
            var gameId = schemaGenGameId;
            _ = Task.Run(async () =>
            {
                using var scope = _scopeFactory.CreateScope();
                var generator = scope.ServiceProvider.GetRequiredService<IGameSchemaGenerationService>();
                await generator.GenerateForGameAsync(gameId);
            });
        }

        return new AddGameResult
        {
            UserGame = userGame,
            Redirected = redirected,
            Message = message
        };
    }

    public async Task<List<UserGame>> GetUserGames(Guid userId)
    {
        return await _db.UserGames
            .Where(ug => ug.UserId == userId)
            .Include(ug => ug.Game)
            .ToListAsync();
    }

    public async Task<UserGame?> GetUserGameByGameId(Guid userId, Guid gameId)
    {
        return await _db.UserGames
            .Include(ug => ug.Game)
            .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);
    }

    public async Task<bool> DeleteUserGame(Guid id, Guid userId)
    {
        var userGame = await _db.UserGames
            .FirstOrDefaultAsync(ug => ug.Id == id && ug.UserId == userId);

        if (userGame == null)
            return false;

        _db.UserGames.Remove(userGame);
        await _db.SaveChangesAsync();
        return true;
    }
}
```

- [ ] **Step 4: Update `UserGamesController` to return the new shape**

Replace the `AddGame` action in `apps/api/Controllers/UserGamesController.cs`:

```csharp
[HttpPost]
public async Task<IActionResult> AddGame([FromBody] AddUserGameRequest request)
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    try
    {
        var result = await _service.AddGameToUser(userId, request);
        return Ok(new
        {
            userGame = ToResponse(result.UserGame),
            redirected = result.Redirected,
            message = result.Message
        });
    }
    catch (InvalidOperationException ex)
    {
        return Conflict(new { message = ex.Message });
    }
}
```

- [ ] **Step 5: Build to verify no remaining compile errors**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: `Build succeeded.`

- [ ] **Step 6: Run the new tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AddGame_Addition_RedirectsToParent|FullyQualifiedName~AddGame_CanonicalGame_NotRedirected|FullyQualifiedName~AddGame_TwoUsersSelectDifferentEditions" -v
```

Expected: all three pass.

- [ ] **Step 7: Run the full test suite to check for regressions**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass. Note — existing `AddGame_ReturnsUserGame` and `GetUserGames_*` tests deserialize with `UserGameDto` which only reads `id/userId/gameId/gameName` — those fields are still present in the response under `userGame`, so those tests will now fail since the response shape changed. Fix those tests by updating `AddGame_ReturnsUserGame`, `GetUserGames_ReturnsOwnGames`, `DeleteUserGame_RemovesGame`, `GetUserGameByGameId_ReturnsDetailResponse`, and `GetUserGames_DoesNotReturnOtherUsersGames` to read `userGame` from the POST response:

In `UserGameTests.cs`, update the helper usages in tests that call `PostAsJsonAsync` and then read the result. The GET, DELETE, and detail endpoints are unchanged — only the POST response shape changed. Update just the tests that read the POST result:

In `AddGame_ReturnsUserGame`:
```csharp
var result = await response.Content.ReadFromJsonAsync<AddGameResultDto>();
result!.UserGame.Id.Should().NotBeEmpty();
```

In `GetUserGames_ReturnsOwnGames` (no change needed — doesn't read POST result).

In `DeleteUserGame_RemovesGame`:
```csharp
var result = (await addResponse.Content.ReadFromJsonAsync<AddGameResultDto>())!;
var deleteResponse = await client.DeleteAsync($"/api/user-games/{result.UserGame.Id}");
```

In `GetUserGameByGameId_ReturnsDetailResponse`:
```csharp
var result = await addResponse.Content.ReadFromJsonAsync<AddGameResultDto>();
var detailResponse = await client.GetAsync($"/api/user-games/{result!.UserGame.GameId}/game");
```

- [ ] **Step 8: Run full suite again**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/api/Services/UserGameService.cs apps/api/Controllers/UserGamesController.cs apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs
git commit -m "feat: redirect expansion games to canonical parent on UserGame creation"
```

---

### Task 5: Add player counts to search results

**Files:**
- Modify: `apps/api/Models/DTOs/Game/GameSimple.cs`
- Modify: `apps/api/Services/GameService.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Features/Games/GameSearchTests.cs`

- [ ] **Step 1: Write the failing test**

Create `apps/tests/PartyUp.Api.Tests/Features/Games/GameSearchTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Games;

public class GameSearchTests : TestBase, IClassFixture<ApiFactory>
{
    public GameSearchTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Search_ReturnsPlayerCountForGamesInDb()
    {
        var client = await CreateAuthenticatedClientAsync();

        // Enroll a user in game 91000 so it exists in the DB with 1 player
        await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = 91000,
            name = "Game 91000",
            imageUrl = (string?)null
        });

        // FakeRawgHandler returns game 91000 for search query "testgame"
        var response = await client.GetAsync("/api/games?q=testgame");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PagedGamesDto>();
        result!.Games.Should().ContainSingle();
        result.Games[0].ExternalId.Should().Be(91000);
        result.Games[0].PlayerCount.Should().Be(1);
    }

    [Fact]
    public async Task Search_ReturnsZeroPlayerCountForUnknownGames()
    {
        var client = await CreateAuthenticatedClientAsync();

        // FakeRawgHandler returns game 91000 for "testgame" — but no one has joined it
        var response = await client.GetAsync("/api/games?q=testgame");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PagedGamesDto>();
        result!.Games.Should().ContainSingle();
        result.Games[0].PlayerCount.Should().Be(0);
    }

    private record PagedGamesDto(List<GameDto> Games, int TotalCount, int Page, int TotalPages);
    private record GameDto(int ExternalId, string Name, string? ImageUrl, int PlayerCount);
}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~GameSearchTests" -v
```

Expected: fails — `PlayerCount` property does not exist yet.

- [ ] **Step 3: Add `PlayerCount` to `GameSimple`**

Replace the full contents of `apps/api/Models/DTOs/Game/GameSimple.cs`:

```csharp
using System.Text.Json.Serialization;

namespace PartyUp.Api.Models.DTOs.Game;

public class GameSimple
{
  public int ExternalId { get; set; }
  public string Name { get; set; } = string.Empty;
  public string? ImageUrl { get; set; }
  public int PlayerCount { get; set; }
}
```

- [ ] **Step 4: Update `SearchGames` in `GameService` to attach player counts**

Replace the `SearchGames` method in `apps/api/Services/GameService.cs`:

```csharp
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
```

- [ ] **Step 5: Run the player count tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~GameSearchTests" -v
```

Expected: both pass.

- [ ] **Step 6: Run the full test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Models/DTOs/Game/GameSimple.cs apps/api/Services/GameService.cs apps/tests/PartyUp.Api.Tests/Features/Games/GameSearchTests.cs
git commit -m "feat: add player counts to game search results"
```

---

### Task 6: Frontend — update types and show redirect toast

**Files:**
- Modify: `apps/web/src/api/endpoints/userGames.ts`
- Modify: `apps/web/src/components/UserRealmsSection.tsx`

- [ ] **Step 1: Update `userGames.ts` with the new response type**

Replace the full contents of `apps/web/src/api/endpoints/userGames.ts`:

```typescript
import { apiDelete, apiGet, apiPost } from "../client";

export type AddUserGamePayload = {
  externalId: number;
  name: string;
  imageUrl: string | null;
};

export type UserGame = {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  gameImageUrl: string | null;
};

export type UserGameDetail = {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  gameImageUrl: string | null;
  description: string | null;
  website: string | null;
  rating: number;
  platforms: string[];
};

export type AddUserGameResult = {
  userGame: UserGame;
  redirected: boolean;
  message: string | null;
};

export function addUserGame(payload: AddUserGamePayload): Promise<AddUserGameResult> {
  return apiPost<AddUserGameResult>("/user-games", payload);
}

export function getUserGames(): Promise<UserGame[]> {
  return apiGet<UserGame[]>("/user-games");
}

export function getUserGameByGameId(gameId: string): Promise<UserGameDetail> {
  return apiGet<UserGameDetail>(`/user-games/${gameId}/game`);
}

export function deleteUserGame(id: string): Promise<void> {
  return apiDelete<void>(`/user-games/${id}`);
}
```

- [ ] **Step 2: Update `UserRealmsSection.tsx` to handle the redirect and show a toast**

Replace the full contents of `apps/web/src/components/UserRealmsSection.tsx`:

```tsx
import { useState } from 'react'
import { type UserGame, addUserGame as apiAddUserGame, deleteUserGame } from '../api/endpoints/userGames'
import { getGames, type Game } from '../api/endpoints/games'
import { RealmCard } from './cards/RealmCard'
import { GameCard } from './cards/GameCard'
import { Modal, Button, Input, EmptyState, Spinner } from './ui'

interface UserRealmsSectionProps {
  games: UserGame[]
  onAdd: (game: UserGame) => void
  onRemove: (game: UserGame) => void
}

export function UserRealmsSection({ games, onAdd, onRemove }: UserRealmsSectionProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [pendingGame, setPendingGame] = useState<Game | null>(null)
  const [adding, setAdding] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<UserGame | null>(null)
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null)

  async function handleSearch() {
    if (!query.trim()) return
    setSearchStatus('loading')
    const result = await getGames({ q: query })
    setResults(result.games)
    setSearchStatus('done')
  }

  async function confirmAdd() {
    if (!pendingGame) return
    setAdding(true)
    try {
      const result = await apiAddUserGame({
        externalId: pendingGame.externalId,
        name: pendingGame.name,
        imageUrl: pendingGame.imageUrl,
      })
      onAdd(result.userGame)
      if (result.redirected && result.message) {
        setRedirectMessage(result.message)
      }
      setPendingGame(null)
      setQuery('')
      setResults([])
      setSearchStatus('idle')
    } finally {
      setAdding(false)
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    await deleteUserGame(removeTarget.id)
    onRemove(removeTarget)
    setRemoveTarget(null)
  }

  return (
    <div className="flex flex-col gap-10">
      {redirectMessage && (
        <div className="flex items-start justify-between gap-3 bg-surface border border-accent rounded-lg px-4 py-3">
          <p className="text-sm text-text font-mono">{redirectMessage}</p>
          <button
            onClick={() => setRedirectMessage(null)}
            className="text-muted hover:text-text text-xs font-mono shrink-0"
          >
            dismiss
          </button>
        </div>
      )}

      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">My Realms</h2>
        {games.length === 0 ? (
          <EmptyState message="No realms yet — search for a game below" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {games.map(g => (
              <RealmCard key={g.id} userGame={g} onRemove={setRemoveTarget} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Add a Realm</h2>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label=""
              placeholder="Search games..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} disabled={searchStatus === 'loading'}>
            Search
          </Button>
        </div>
        {searchStatus === 'loading' && <div className="mt-4"><Spinner /></div>}
        {searchStatus === 'done' && results.length === 0 && (
          <p className="mt-4 text-xs text-muted font-mono">No results found.</p>
        )}
        {results.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map(g => (
              <GameCard key={g.externalId} game={g} onSelect={setPendingGame} />
            ))}
          </div>
        )}
      </section>

      <Modal isOpen={!!pendingGame} onClose={() => setPendingGame(null)} title="Add Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Add <strong>{pendingGame?.name}</strong> to your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPendingGame(null)}>Cancel</Button>
            <Button onClick={confirmAdd} disabled={adding}>
              {adding ? 'Adding...' : 'Add Realm'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Remove <strong>{removeTarget?.gameName}</strong> from your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmRemove}>Remove</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 3: Build the frontend to check for type errors**

```bash
npm run build --prefix apps/web
```

Expected: `built in` — no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/userGames.ts apps/web/src/components/UserRealmsSection.tsx
git commit -m "feat: show expansion redirect notification on game add"
```

---

### Task 7: Frontend — show player count on game cards

**Files:**
- Modify: `apps/web/src/api/endpoints/games.ts`
- Modify: `apps/web/src/components/cards/GameCard.tsx`

- [ ] **Step 1: Add `playerCount` to the `Game` type in `games.ts`**

In `apps/web/src/api/endpoints/games.ts`, update the `Game` type:

```typescript
export type Game = {
  id: string;
  externalId: number;
  name: string;
  imageUrl: string;
  playerCount: number;
};
```

- [ ] **Step 2: Update `GameCard` to display the player count**

Replace the full contents of `apps/web/src/components/cards/GameCard.tsx`:

```tsx
import { type Game } from '../../api/endpoints/games'

interface GameCardProps {
  game: Game
  onSelect: (game: Game) => void
}

export function GameCard({ game, onSelect }: GameCardProps) {
  return (
    <button
      onClick={() => onSelect(game)}
      className="group w-full text-left bg-surface border border-border rounded-lg overflow-hidden hover:border-accent transition-colors"
    >
      {game.imageUrl ? (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={game.imageUrl}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-surface-raised flex items-center justify-center">
          <span className="text-muted text-xs font-mono uppercase">No image</span>
        </div>
      )}
      <div className="p-3 flex flex-col gap-1">
        <p className="text-sm font-mono text-text truncate">{game.name}</p>
        <p className="text-xs font-mono text-muted">
          {game.playerCount > 0 ? `${game.playerCount} players` : 'Be the first!'}
        </p>
      </div>
    </button>
  )
}
```

- [ ] **Step 3: Build the frontend**

```bash
npm run build --prefix apps/web
```

Expected: `built in` — no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/games.ts apps/web/src/components/cards/GameCard.tsx
git commit -m "feat: display player count on game search result cards"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run the full backend test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 2: Start the app and manually verify**

```bash
docker compose up -d
npm run dev
```

Open http://localhost:5173. Log in and search for a game. Verify:
- Player count badge appears on each game card ("X players" or "Be the first!")
- Adding a game works as before when no redirect
- (To test redirect manually: use the dev DB to insert a game with a known `ParentExternalId` and add it as a user game — the toast notification should appear)

- [ ] **Step 3: Stop the dev server**

`Ctrl+C` in the terminal running `npm run dev`.
