# Game Details Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist full game details (description, website, rating, platforms) from RAWG into the DB on UserGame creation, serve them from the DB on subsequent requests, and display them progressively in both modals and the Realm page.

**Architecture:** The `Game` entity gains four detail columns; `GameService` gets `AppDbContext` injected and gains a DB-first lookup path and a persist-details method; `UserGameService` calls that persist method during `AddGameToUser`. Two typed routes on `GamesController` (`{id:int}` for RAWG-backed, `{id:guid}` for DB-only) serve the two client-side fetch flows. The `UserGamesController` `{gameId}/game` endpoint returns a new combined DTO with game detail fields included.

**Tech Stack:** ASP.NET Core 8, EF Core + Npgsql (JSONB for platforms list), xUnit + FluentAssertions + Respawn (integration tests), React + TypeScript + Vite

---

## File Map

**Create:**
- `apps/api/Models/DTOs/UserGame/UserGameDetailResponse.cs`
- `apps/tests/PartyUp.Api.Tests/Features/Games/GameDetailsTests.cs`
- `apps/web/src/components/ui/GameInfoSection.tsx`
- EF Core migration (generated via CLI)

**Modify:**
- `apps/api/Models/Game.cs` — add 4 detail fields
- `apps/api/Infrastructure/Data/DbContext.cs` — add `OnModelCreating` with JSONB converter for `Platforms`
- `apps/api/Services/Interfaces/IGameService.cs` — add 2 method signatures
- `apps/api/Services/GameService.cs` — inject `AppDbContext`, add DB-first path, add new methods
- `apps/api/Services/UserGameService.cs` — inject `IGameService`, call enrich during `AddGameToUser`
- `apps/api/Controllers/GamesController.cs` — add `:int` constraint to existing route, add `{id:guid}` route
- `apps/api/Controllers/UserGamesController.cs` — `GetUserGameByGameId` returns `UserGameDetailResponse`
- `apps/web/src/api/endpoints/games.ts` — add `GameDetails` type and 2 fetch functions
- `apps/web/src/api/endpoints/userGames.ts` — add `UserGameDetail` type, update `getUserGameByGameId` return type
- `apps/web/src/components/modals/GameSelectModal.tsx` — progressive detail enrichment on mount
- `apps/web/src/components/modals/UserGameSelectModal.tsx` — progressive detail enrichment on mount
- `apps/web/src/pages/RealmPage.tsx` — use `UserGameDetail`, render `GameInfoSection`

---

## Task 1: Create Feature Branch

- [ ] **Create and switch to feature branch**

```bash
git checkout -b feature/game-details-enrichment
```

Expected: `Switched to a new branch 'feature/game-details-enrichment'`

---

## Task 2: Extend Game Entity and Configure JSONB Column

**Files:**
- Modify: `apps/api/Models/Game.cs`
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`

- [ ] **Add four detail fields to Game entity**

Replace the entire contents of `apps/api/Models/Game.cs`:

```csharp
namespace PartyUp.Api.Models;

public class Game
{
  public Guid Id { get; set; }
  public int ExternalId { get; set; }
  public string Name { get; set; } = string.Empty;
  public string? ImageUrl { get; set; }
  public string? Description { get; set; }
  public string? Website { get; set; }
  public double Rating { get; set; }
  public List<string> Platforms { get; set; } = [];
}
```

- [ ] **Add OnModelCreating to configure the Platforms JSONB column**

Replace the entire contents of `apps/api/Infrastructure/Data/DbContext.cs`:

```csharp
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;

namespace PartyUp.Api.Infrastructure.Data
{
  public class AppDbContext : DbContext
  {
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Game> Games { get; set; }
    public DbSet<UserGame> UserGames { get; set; }
    public DbSet<Character> Characters { get; set; }
    public DbSet<CharacterInteraction> CharacterInteractions { get; set; }
    public DbSet<CharacterMatch> CharacterMatches { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
      modelBuilder.Entity<Game>()
        .Property(g => g.Platforms)
        .HasConversion(
          v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
          v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
        )
        .HasColumnType("jsonb");
    }
  }
}
```

- [ ] **Generate EF Core migration**

```bash
dotnet ef migrations add AddGameDetailFields --project apps/api
```

Expected: `Build succeeded. Done. To undo this action, use 'ef migrations remove'`

- [ ] **Apply migration to dev database (Docker must be running)**

```bash
dotnet ef database update --project apps/api
```

Expected: `...Done.` with the migration listed.

- [ ] **Commit**

```bash
git add apps/api/Models/Game.cs apps/api/Infrastructure/Data/DbContext.cs apps/api/Migrations/
git commit -m "feat: add detail fields to Game entity with JSONB platforms column"
```

---

## Task 3: Update IGameService and GameService

**Files:**
- Modify: `apps/api/Services/Interfaces/IGameService.cs`
- Modify: `apps/api/Services/GameService.cs`

- [ ] **Add two new method signatures to IGameService**

Replace the entire contents of `apps/api/Services/Interfaces/IGameService.cs`:

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;

public interface IGameService
{
  Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, List<string>? tags);
  Task<GameDetails?> GetGameById(int id);
  Task<GameDetails?> GetGameByDbId(Guid id);
  Task<GameDetails?> GetAndPersistGameDetails(Game game);
}
```

- [ ] **Rewrite GameService with AppDbContext injection and new methods**

Replace the entire contents of `apps/api/Services/GameService.cs`:

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

  public async Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, List<string>? tags)
  {
    var response = await _rawg.GetGames(q, page, genres, tags);

    var games = response.Results.Select(g => new Game
    {
      Id = Guid.NewGuid(),
      ExternalId = g.Id,
      Name = g.Name,
      ImageUrl = g.Background_Image
    }).ToList();

    return new PagedGamesResult
    {
      Games = games,
      TotalCount = response.Count,
      Page = page,
      TotalPages = response.Count == 0 ? 1 : (int)Math.Ceiling(response.Count / (double)PageSize)
    };
  }

  public async Task<GameDetails?> GetGameById(int id)
  {
    var dbGame = await _db.Games
      .FirstOrDefaultAsync(g => g.ExternalId == id && g.Description != null);
    if (dbGame != null)
      return MapToDetails(dbGame);

    var rawgGame = await _rawg.GetGameById(id);
    if (rawgGame == null)
      return null;

    return new GameDetails
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

  public async Task<GameDetails?> GetGameByDbId(Guid id)
  {
    var game = await _db.Games.FindAsync(id);
    return game == null ? null : MapToDetails(game);
  }

  public async Task<GameDetails?> GetAndPersistGameDetails(Game game)
  {
    var rawgGame = await _rawg.GetGameById(game.ExternalId);
    if (rawgGame == null)
      return null;

    game.Description = rawgGame.Description;
    game.Website = rawgGame.Website;
    game.Rating = rawgGame.Rating;
    game.Platforms = rawgGame.Platforms.Select(p => p.Platform.Name).ToList();

    await _db.SaveChangesAsync();
    return MapToDetails(game);
  }

  private static GameDetails MapToDetails(Game g) => new()
  {
    ExternalId = g.ExternalId,
    Name = g.Name,
    Description = g.Description ?? string.Empty,
    ImageUrl = g.ImageUrl,
    Website = g.Website,
    Rating = g.Rating,
    Platforms = g.Platforms
  };
}
```

- [ ] **Verify the project still builds**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: `Build succeeded.`

- [ ] **Commit**

```bash
git add apps/api/Services/Interfaces/IGameService.cs apps/api/Services/GameService.cs
git commit -m "feat: add GetGameByDbId and GetAndPersistGameDetails to GameService"
```

---

## Task 4: Update UserGameService to Enrich on Add

**Files:**
- Modify: `apps/api/Services/UserGameService.cs`

- [ ] **Inject IGameService and call enrichment during AddGameToUser**

Replace the entire contents of `apps/api/Services/UserGameService.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;
using PartyUp.Api.Infrastructure.Data;

public class UserGameService : IUserGameService
{
  private readonly AppDbContext _db;
  private readonly IGameService _gameService;

  public UserGameService(AppDbContext db, IGameService gameService)
  {
    _db = db;
    _gameService = gameService;
  }

  public async Task<UserGame> AddGameToUser(Guid userId, AddUserGameRequest request)
  {
    var existingGame = await _db.Games
      .FirstOrDefaultAsync(g => g.ExternalId == request.ExternalId);

    if (existingGame == null)
    {
      existingGame = new Game
      {
        ExternalId = request.ExternalId,
        Name = request.Name,
        ImageUrl = request.ImageUrl
      };
      _db.Games.Add(existingGame);
      await _db.SaveChangesAsync();
    }

    if (existingGame.Description == null)
    {
      try { await _gameService.GetAndPersistGameDetails(existingGame); }
      catch { /* enrichment is best-effort; continue without details */ }
    }

    var alreadyAdded = await _db.UserGames
      .AnyAsync(ug => ug.UserId == userId && ug.GameId == existingGame.Id);

    if (alreadyAdded)
      throw new InvalidOperationException("Game already added.");

    var userGame = new UserGame
    {
      UserId = userId,
      GameId = existingGame.Id,
      Game = existingGame
    };

    _db.UserGames.Add(userGame);
    await _db.SaveChangesAsync();

    return userGame;
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

- [ ] **Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: `Build succeeded.`

- [ ] **Commit**

```bash
git add apps/api/Services/UserGameService.cs
git commit -m "feat: enrich game details from RAWG when user adds a game"
```

---

## Task 5: Add UserGameDetailResponse DTO and Update UserGamesController

**Files:**
- Create: `apps/api/Models/DTOs/UserGame/UserGameDetailResponse.cs`
- Modify: `apps/api/Controllers/UserGamesController.cs`

- [ ] **Create UserGameDetailResponse DTO**

Create `apps/api/Models/DTOs/UserGame/UserGameDetailResponse.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.UserGame;

public class UserGameDetailResponse
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public Guid GameId { get; set; }
  public string GameName { get; set; } = string.Empty;
  public string? GameImageUrl { get; set; }
  public string? Description { get; set; }
  public string? Website { get; set; }
  public double Rating { get; set; }
  public List<string> Platforms { get; set; } = [];
}
```

- [ ] **Update UserGamesController to return UserGameDetailResponse from the game route**

Replace the entire contents of `apps/api/Controllers/UserGamesController.cs`:

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;

[ApiController]
[Route("api/user-games")]
[Authorize]
public class UserGamesController : ControllerBase
{
  private readonly IUserGameService _service;

  public UserGamesController(IUserGameService service)
  {
    _service = service;
  }

  [HttpPost]
  public async Task<IActionResult> AddGame([FromBody] AddUserGameRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    try
    {
      var userGame = await _service.AddGameToUser(userId, request);
      return Ok(ToResponse(userGame));
    }
    catch (InvalidOperationException ex)
    {
      return Conflict(new { message = ex.Message });
    }
  }

  [HttpGet]
  public async Task<IActionResult> GetUserGames()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var games = await _service.GetUserGames(userId);
    return Ok(games.Select(ToResponse));
  }

  [HttpGet("{gameId}/game")]
  public async Task<IActionResult> GetUserGameByGameId(Guid gameId)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var userGame = await _service.GetUserGameByGameId(userId, gameId);
    if (userGame == null)
      return NotFound();
    return Ok(ToDetailResponse(userGame));
  }

  [HttpDelete("{id}")]
  public async Task<IActionResult> DeleteUserGame(Guid id)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var deleted = await _service.DeleteUserGame(id, userId);
    if (!deleted)
      return NotFound();
    return NoContent();
  }

  private static UserGameResponse ToResponse(UserGame ug) => new()
  {
    Id = ug.Id,
    UserId = ug.UserId,
    GameId = ug.GameId,
    GameName = ug.Game.Name,
    GameImageUrl = ug.Game.ImageUrl
  };

  private static UserGameDetailResponse ToDetailResponse(UserGame ug) => new()
  {
    Id = ug.Id,
    UserId = ug.UserId,
    GameId = ug.GameId,
    GameName = ug.Game.Name,
    GameImageUrl = ug.Game.ImageUrl,
    Description = ug.Game.Description,
    Website = ug.Game.Website,
    Rating = ug.Game.Rating,
    Platforms = ug.Game.Platforms
  };
}
```

- [ ] **Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: `Build succeeded.`

- [ ] **Commit**

```bash
git add apps/api/Models/DTOs/UserGame/UserGameDetailResponse.cs apps/api/Controllers/UserGamesController.cs
git commit -m "feat: return UserGameDetailResponse from GET /api/user-games/{gameId}/game"
```

---

## Task 6: Add Typed Route Constraints to GamesController

**Files:**
- Modify: `apps/api/Controllers/GamesController.cs`

- [ ] **Add int constraint to existing route, add new guid route**

Replace the entire contents of `apps/api/Controllers/GamesController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/games")]
public class GamesController : ControllerBase
{
  private readonly IGameService _service;

  public GamesController(IGameService service)
  {
    _service = service;
  }

  [HttpGet]
  public async Task<IActionResult> Search(
      [FromQuery] string q = "",
      [FromQuery] int page = 1,
      [FromQuery] List<int>? genres = null,
      [FromQuery] List<string>? tags = null)
  {
    var result = await _service.SearchGames(q, page, genres, tags);
    return Ok(result);
  }

  [HttpGet("{id:int}")]
  public async Task<IActionResult> GetById(int id)
  {
    var game = await _service.GetGameById(id);
    if (game == null)
      return NotFound();
    return Ok(game);
  }

  [HttpGet("{id:guid}")]
  public async Task<IActionResult> GetByDbId(Guid id)
  {
    var game = await _service.GetGameByDbId(id);
    if (game == null)
      return NotFound();
    return Ok(game);
  }
}
```

- [ ] **Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: `Build succeeded.`

- [ ] **Commit**

```bash
git add apps/api/Controllers/GamesController.cs
git commit -m "feat: add GET /api/games/{id:guid} route for DB-only game detail lookup"
```

---

## Task 7: Backend Integration Tests

**Files:**
- Create: `apps/tests/PartyUp.Api.Tests/Features/Games/GameDetailsTests.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`

- [ ] **Apply migration to test database**

```bash
dotnet ef database update --project apps/api -- --environment Testing
```

If the test DB uses the same connection string approach, alternatively run:

```bash
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=partyup_test;Username=partyup;Password=partyup"
dotnet ef database update --project apps/api
```

Verify the new columns exist. The test DB is `partyup_test` (see `ApiFactory.TestConnectionString`).

- [ ] **Write tests for GET /api/games/{id:guid}**

Create `apps/tests/PartyUp.Api.Tests/Features/Games/GameDetailsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Games;

public class GameDetailsTests : TestBase, IClassFixture<ApiFactory>
{
  public GameDetailsTests(ApiFactory factory) : base(factory) { }

  [Fact]
  public async Task GetByDbId_ReturnsGameDetails_WhenGameExistsWithDetails()
  {
    var game = new Game
    {
      Id = Guid.NewGuid(),
      ExternalId = 88888,
      Name = "Test Game",
      ImageUrl = null,
      Description = "An epic adventure game.",
      Website = "https://example.com",
      Rating = 4.5,
      Platforms = ["PC", "Xbox"]
    };

    using (var scope = Factory.Services.CreateScope())
    {
      var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
      db.Games.Add(game);
      await db.SaveChangesAsync();
    }

    var response = await Client.GetAsync($"/api/games/{game.Id}");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var details = await response.Content.ReadFromJsonAsync<GameDetailsDto>();
    details!.Name.Should().Be("Test Game");
    details.Description.Should().Be("An epic adventure game.");
    details.Platforms.Should().BeEquivalentTo(["PC", "Xbox"]);
    details.Rating.Should().Be(4.5);
  }

  [Fact]
  public async Task GetByDbId_Returns404_WhenGameDoesNotExist()
  {
    var response = await Client.GetAsync($"/api/games/{Guid.NewGuid()}");
    response.StatusCode.Should().Be(HttpStatusCode.NotFound);
  }

  private record GameDetailsDto(
    int ExternalId,
    string Name,
    string Description,
    string? ImageUrl,
    string? Website,
    double Rating,
    List<string> Platforms);
}
```

- [ ] **Run the new tests to verify they pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~GameDetailsTests" --logger "console;verbosity=normal"
```

Expected: Both tests pass.

- [ ] **Add GetUserGameByGameId detail test to UserGameTests**

In `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`, add the following test and update the `UserGameDto` record at the bottom. Add this test before the closing `}` of the class body (before the `private record UserGameDto` line):

```csharp
  [Fact]
  public async Task GetUserGameByGameId_ReturnsDetailResponse()
  {
    var client = await CreateAuthenticatedClientAsync();
    var id = Interlocked.Increment(ref _gameCounter);

    var addResponse = await client.PostAsJsonAsync("/api/user-games", new
    {
      externalId = id,
      name = $"Game {id}",
      imageUrl = (string?)null
    });
    addResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    var userGame = await addResponse.Content.ReadFromJsonAsync<UserGameDto>();

    var detailResponse = await client.GetAsync($"/api/user-games/{userGame!.GameId}/game");

    detailResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    var detail = await detailResponse.Content.ReadFromJsonAsync<UserGameDetailDto>();
    detail!.GameName.Should().Be($"Game {id}");
    detail.Platforms.Should().NotBeNull();
  }
```

Also add this record at the end of the `UserGameTests` class (alongside the existing `UserGameDto` record):

```csharp
  private record UserGameDetailDto(
    Guid Id,
    Guid UserId,
    Guid GameId,
    string GameName,
    string? GameImageUrl,
    string? Description,
    string? Website,
    double Rating,
    List<string> Platforms);
```

- [ ] **Run the full test suite to confirm nothing is broken**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --logger "console;verbosity=normal"
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add apps/tests/PartyUp.Api.Tests/Features/Games/ apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs
git commit -m "test: add game details endpoint and user game detail response tests"
```

---

## Task 8: Frontend — Add GameDetails Type and Fetch Functions

**Files:**
- Modify: `apps/web/src/api/endpoints/games.ts`

- [ ] **Add GameDetails type and two fetch functions**

Replace the entire contents of `apps/web/src/api/endpoints/games.ts`:

```ts
import { apiGet } from "../client";

export type Game = {
  id: string;
  externalId: number;
  name: string;
  imageUrl: string;
};

export type GameDetails = {
  externalId: number;
  name: string;
  description: string;
  imageUrl: string | null;
  website: string | null;
  rating: number;
  platforms: string[];
};

export type PagedGames = {
  games: Game[];
  totalCount: number;
  page: number;
  totalPages: number;
};

export type GamesParams = {
  q?: string;
  page?: number;
  genres?: number[];
};

export function getGames(params: GamesParams = {}): Promise<PagedGames> {
  const qs = new URLSearchParams();

  if (params.q) qs.set("q", params.q);
  if (params.page && params.page > 1) qs.set("page", params.page.toString());
  params.genres?.forEach((g) => qs.append("genres", g.toString()));

  const query = qs.toString();
  return apiGet<PagedGames>(`/games${query ? `?${query}` : ""}`);
}

export function getGameDetails(externalId: number): Promise<GameDetails> {
  return apiGet<GameDetails>(`/games/${externalId}`);
}

export function getGameDetailsByDbId(gameId: string): Promise<GameDetails> {
  return apiGet<GameDetails>(`/games/${gameId}`);
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build --prefix apps/web 2>&1 | head -30
```

Expected: No type errors related to `games.ts`.

- [ ] **Commit**

```bash
git add apps/web/src/api/endpoints/games.ts
git commit -m "feat: add GameDetails type and getGameDetails/getGameDetailsByDbId fetch functions"
```

---

## Task 9: Frontend — Add UserGameDetail Type and Update getUserGameByGameId

**Files:**
- Modify: `apps/web/src/api/endpoints/userGames.ts`

- [ ] **Read the current contents of userGames.ts before editing**

Read `apps/web/src/api/endpoints/userGames.ts` to see current content.

- [ ] **Add UserGameDetail type and update getUserGameByGameId return type**

After reading the file, add the `UserGameDetail` type and update `getUserGameByGameId`. The file should contain:

```ts
import { apiDelete, apiGet, apiPost } from "../client";

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

export type AddUserGamePayload = {
  externalId: number;
  name: string;
  imageUrl: string | null;
};

export function addUserGame(payload: AddUserGamePayload): Promise<UserGame> {
  return apiPost<UserGame>("/user-games", payload);
}

export function getUserGames(): Promise<UserGame[]> {
  return apiGet<UserGame[]>("/user-games");
}

export function getUserGameByGameId(gameId: string): Promise<UserGameDetail> {
  return apiGet<UserGameDetail>(`/user-games/${gameId}/game`);
}

export function deleteUserGame(id: string): Promise<void> {
  return apiDelete(`/user-games/${id}`);
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build --prefix apps/web 2>&1 | head -30
```

Expected: No type errors.

- [ ] **Commit**

```bash
git add apps/web/src/api/endpoints/userGames.ts
git commit -m "feat: add UserGameDetail type and update getUserGameByGameId return type"
```

---

## Task 10: Frontend — GameSelectModal Progressive Enrichment

**Files:**
- Modify: `apps/web/src/components/modals/GameSelectModal.tsx`

- [ ] **Add progressive detail enrichment to GameSelectModal**

Replace the entire contents of `apps/web/src/components/modals/GameSelectModal.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { Game, GameDetails } from "../../api/endpoints/games";
import { getGameDetails } from "../../api/endpoints/games";
import { CornerAccents } from "../ui/CornerAccents";
import { Modal } from "./Modal";

export type AddState = "idle" | "loading" | "success" | "conflict" | "error";

type Props = {
  game: Game;
  addState: AddState;
  onConfirm: () => void;
  onClose: () => void;
};

export function GameSelectModal({ game, addState, onConfirm, onClose }: Props) {
  const [details, setDetails] = useState<GameDetails | null>(null);

  useEffect(() => {
    getGameDetails(game.externalId).then(setDetails).catch(() => {});
  }, [game.externalId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const done = addState === "success" || addState === "conflict";

  return (
    <Modal isOpen onClose={onClose} titleId="select-game-modal-title">
      <div className="bg-brand-surface border border-brand-border w-full overflow-hidden">
        <CornerAccents />

        {game.imageUrl && (
          <div className="relative overflow-hidden">
            <img
              src={game.imageUrl}
              alt={game.name}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-display text-brand-text text-base leading-snug">
              {game.name}
            </h2>
            <p className="text-brand-muted text-xs mt-1 font-display tracking-wide">
              Add this game to your collection?
            </p>
          </div>

          {details && (
            <div className="flex flex-col gap-2">
              {details.description && (
                <p className="text-brand-muted text-xs font-display leading-relaxed line-clamp-3">
                  {details.description}
                </p>
              )}
              {details.rating > 0 && (
                <p className="text-brand-neon text-xs font-mono tracking-widest">
                  Rating: {details.rating.toFixed(1)}
                </p>
              )}
              {details.platforms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {details.platforms.map((p) => (
                    <span
                      key={p}
                      className="text-brand-muted text-xs font-mono border border-brand-border px-2 py-0.5"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {details.website && (
                <a
                  href={details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-neon text-xs font-mono tracking-wide hover:underline"
                >
                  {details.website}
                </a>
              )}
            </div>
          )}

          {addState === "success" && (
            <p className="text-brand-gold text-xs font-display tracking-wide border border-brand-gold/30 bg-brand-gold/10 px-3 py-2">
              Added to your collection.
            </p>
          )}
          {addState === "conflict" && (
            <p className="text-brand-muted text-xs font-display tracking-wide border border-brand-border px-3 py-2">
              Already in your collection.
            </p>
          )}
          {addState === "error" && (
            <p className="text-brand-crimson text-xs font-display tracking-wide border border-brand-crimson/30 bg-brand-crimson/10 px-3 py-2">
              Something went wrong. Try again.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-brand-border text-brand-muted text-sm px-4 py-2 hover:border-brand-gold/40 hover:text-brand-text transition-colors duration-200 font-display tracking-wider"
            >
              {done ? "Close" : "Cancel"}
            </button>

            {!done && (
              <button
                onClick={onConfirm}
                disabled={addState === "loading"}
                className="flex-1 border border-brand-gold/60 bg-brand-gold/10 text-brand-gold text-sm px-4 py-2 hover:bg-brand-gold/20 transition-colors duration-200 font-display tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addState === "loading" ? "Adding..." : "Add Game"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build --prefix apps/web 2>&1 | head -30
```

Expected: No type errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/modals/GameSelectModal.tsx
git commit -m "feat: add progressive game detail enrichment to GameSelectModal"
```

---

## Task 11: Frontend — UserGameSelectModal Progressive Enrichment

**Files:**
- Modify: `apps/web/src/components/modals/UserGameSelectModal.tsx`

- [ ] **Add progressive detail enrichment to UserGameSelectModal**

Replace the entire contents of `apps/web/src/components/modals/UserGameSelectModal.tsx`:

```tsx
import { useEffect, useState } from "react";
import { CornerAccents } from "../ui/CornerAccents";
import { Modal } from "./Modal";
import type { UserGame, UserGameDetail } from "../../api/endpoints/userGames";
import { getUserGameByGameId } from "../../api/endpoints/userGames";

export type DeleteState = "idle" | "loading" | "success" | "conflict" | "error";

type Props = {
  userGame: UserGame;
  deleteState: DeleteState;
  onConfirm: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function UserGameSelectModal({ userGame, deleteState, onConfirm, onDelete, onClose }: Props) {
  const [details, setDetails] = useState<UserGameDetail | null>(null);

  useEffect(() => {
    getUserGameByGameId(userGame.gameId).then(setDetails).catch(() => {});
  }, [userGame.gameId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const done = deleteState === "success" || deleteState === "conflict";

  function handleDeleteClick() {
    const confirmed = window.confirm("Are you sure you want to delete this realm?");
    if (!confirmed) return;
    onDelete();
  }

  return (
    <Modal isOpen onClose={onClose} titleId="select-game-modal-title">
      <div className="bg-brand-surface border border-brand-border w-full overflow-hidden">
        <CornerAccents />

        {userGame.gameImageUrl && (
          <div className="relative overflow-hidden">
            <img
              src={userGame.gameImageUrl}
              alt={userGame.gameName}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-display text-brand-text text-base leading-snug">
              {userGame.gameName}
            </h2>
            <p className="text-brand-muted text-xs mt-1 font-display tracking-wide">
              Proceed with this realm?
            </p>
          </div>

          {details && (
            <div className="flex flex-col gap-2">
              {details.description && (
                <p className="text-brand-muted text-xs font-display leading-relaxed line-clamp-3">
                  {details.description}
                </p>
              )}
              {details.rating > 0 && (
                <p className="text-brand-neon text-xs font-mono tracking-widest">
                  Rating: {details.rating.toFixed(1)}
                </p>
              )}
              {details.platforms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {details.platforms.map((p) => (
                    <span
                      key={p}
                      className="text-brand-muted text-xs font-mono border border-brand-border px-2 py-0.5"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {details.website && (
                <a
                  href={details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-neon text-xs font-mono tracking-wide hover:underline"
                >
                  {details.website}
                </a>
              )}
            </div>
          )}

          {deleteState === "success" && (
            <p className="text-brand-gold text-xs font-display tracking-wide border border-brand-gold/30 bg-brand-gold/10 px-3 py-2">
              Realm Deleted.
            </p>
          )}
          {deleteState === "conflict" && (
            <p className="text-brand-muted text-xs font-display tracking-wide border border-brand-border px-3 py-2">
              Realm already deleted.
            </p>
          )}
          {deleteState === "error" && (
            <p className="text-brand-crimson text-xs font-display tracking-wide border border-brand-crimson/30 bg-brand-crimson/10 px-3 py-2">
              Something went wrong. Try again.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDeleteClick}
              className="flex-1 border border-brand-border bg-brand-crimson/10 text-brand-muted text-sm px-4 py-2 hover:bg-brand-crimson/20 hover:border-brand-crimson/40 hover:text-brand-text transition-colors duration-200 font-display tracking-wider"
            >
              {done ? "Realm Deleted" : "Delete Realm"}
            </button>

            <button
              onClick={onClose}
              className="flex-1 border border-brand-border text-brand-muted text-sm px-4 py-2 hover:border-brand-gold/40 hover:text-brand-text transition-colors duration-200 font-display tracking-wider"
            >
              {done ? "Close" : "Cancel"}
            </button>

            {!done && (
              <button
                onClick={onConfirm}
                disabled={deleteState === "loading"}
                className="flex-1 border border-brand-gold/60 bg-brand-gold/10 text-brand-gold text-sm px-4 py-2 hover:bg-brand-gold/20 transition-colors duration-200 font-display tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteState === "loading" ? "Adding..." : "Enter Realm"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build --prefix apps/web 2>&1 | head -30
```

Expected: No type errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/modals/UserGameSelectModal.tsx
git commit -m "feat: add progressive game detail enrichment to UserGameSelectModal"
```

---

## Task 12: Frontend — GameInfoSection Component

**Files:**
- Create: `apps/web/src/components/ui/GameInfoSection.tsx`

- [ ] **Create GameInfoSection component**

Create `apps/web/src/components/ui/GameInfoSection.tsx`:

```tsx
import type { UserGameDetail } from "../../api/endpoints/userGames";

type Props = {
  userGameDetail: UserGameDetail | null;
};

export function GameInfoSection({ userGameDetail }: Props) {
  if (!userGameDetail || !userGameDetail.description) return null;

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto w-full mt-6">
      <div className="border border-brand-border bg-brand-surface/50 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-px w-6 bg-brand-neon" />
          <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">
            About
          </span>
        </div>

        <p className="text-brand-muted text-sm font-display leading-relaxed">
          {userGameDetail.description}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {userGameDetail.rating > 0 && (
            <span className="font-mono text-brand-neon text-xs tracking-widest">
              Rating: {userGameDetail.rating.toFixed(1)}
            </span>
          )}

          {userGameDetail.platforms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {userGameDetail.platforms.map((p) => (
                <span
                  key={p}
                  className="text-brand-muted text-xs font-mono border border-brand-border px-2 py-0.5"
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          {userGameDetail.website && (
            <a
              href={userGameDetail.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-neon text-xs font-mono tracking-wide hover:underline"
            >
              {userGameDetail.website}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build --prefix apps/web 2>&1 | head -30
```

Expected: No type errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/ui/GameInfoSection.tsx
git commit -m "feat: add GameInfoSection component for realm page"
```

---

## Task 13: Frontend — Wire GameInfoSection into RealmPage

**Files:**
- Modify: `apps/web/src/pages/RealmPage.tsx`

- [ ] **Update RealmPage to use UserGameDetail and render GameInfoSection**

In `apps/web/src/pages/RealmPage.tsx`, make the following changes:

1. Add `UserGameDetail` to the `getUserGameByGameId` import and change `UserGame` import to also include `UserGameDetail`:

```tsx
import { getUserGameByGameId, type UserGameDetail } from "../api/endpoints/userGames";
```

Remove the existing `import { getUserGameByGameId, type UserGame } from "../api/endpoints/userGames";` line and replace it with the above.

2. Add `GameInfoSection` import after the `GameBanner` import:

```tsx
import { GameInfoSection } from "../components/ui/GameInfoSection";
```

3. Change the `userGame` state type from `UserGame | null` to `UserGameDetail | null`:

```tsx
const [userGame, setUserGame] = useState<UserGameDetail | null>(null);
```

4. Add `<GameInfoSection userGameDetail={userGame} />` between `<GameBanner game={userGame} />` and the tab strip `<div>`. The section between the banner and tabs should look like:

```tsx
      {matchBanner && <MatchBanner />}
      <GameBanner game={userGame} />
      <GameInfoSection userGameDetail={userGame} />

      <div className="px-6 md:px-10 max-w-7xl mx-auto w-full">
        <div className="flex gap-0 border-b border-brand-border mt-6">
```

- [ ] **Verify TypeScript compiles with no errors**

```bash
npm run build --prefix apps/web 2>&1 | head -50
```

Expected: `✓ built in` with no type errors.

- [ ] **Commit**

```bash
git add apps/web/src/pages/RealmPage.tsx
git commit -m "feat: render GameInfoSection between banner and tabs on RealmPage"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Game table updated with detail fields (Task 2)
- ✅ DB-first check in `GetGameById(int)` — no RAWG save on browse (Task 3)
- ✅ `GetGameByDbId(Guid)` — DB-only path (Task 3)
- ✅ Details saved only on `AddGameToUser` (Task 4)
- ✅ Enrichment is best-effort / graceful failure (Task 4)
- ✅ `GET /api/games/{id:guid}` route added (Task 6)
- ✅ `GET /api/user-games/{gameId}/game` returns `UserGameDetailResponse` (Task 5)
- ✅ `GameSelectModal` progressive enrichment via `getGameDetails(externalId)` (Task 10)
- ✅ `UserGameSelectModal` progressive enrichment via `getUserGameByGameId(gameId)` (Task 11)
- ✅ `GameInfoSection` between banner and tabs on RealmPage (Tasks 12–13)
- ✅ Buttons available immediately in both modals — detail loading is non-blocking (Tasks 10–11)

**Type consistency:**
- `UserGameDetail` defined in Task 9, used in Tasks 11, 12, 13 — consistent
- `GameDetails` defined in Task 8, used in Task 10 — consistent
- `GetAndPersistGameDetails(Game game)` defined in Task 3, called in Task 4 — consistent
- `MapToDetails` private helper defined and used within `GameService` only — consistent
