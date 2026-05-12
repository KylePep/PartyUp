# API Cleanup & Consistency Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead code, align `Character` entity field names with DTOs, add missing response DTOs, close the unauthenticated swipe gap, and rename the `CharacterMatch` service/controller to reflect the domain (`CharacterInteraction`).

**Architecture:** Controller → Service (interface) → EF Core → PostgreSQL. No new endpoints, no behavior changes. All changes are structural — renaming, deleting, and adding DTOs.

**Tech Stack:** ASP.NET Core 8, EF Core 8, Npgsql (PostgreSQL), xUnit integration tests.

---

## File Map

| Action | File |
|---|---|
| Delete | `Controllers/CharacterController.cs` |
| Delete | `Controllers/UsersController.cs` |
| Delete | `Services/UserService.cs` |
| Delete | `Services/Interfaces/IUserService.cs` |
| Delete | `Services/CharacterMatchService.cs` |
| Delete | `Services/Interfaces/ICharacterMatchService.cs` |
| Delete | `Controllers/SwipeController.cs` |
| Delete | `Models/GameDetails.cs` |
| Delete | `Models/PagedGamesResult.cs` |
| Rename file | `Models/CharacterInteractions.cs` → `CharacterInteraction.cs` |
| Rename file | `Models/DTOs/CharacterInteraction/SwipeRequest.cs` → `CharacterInteractionRequest.cs` |
| Modify | `Models/Character.cs` |
| Modify | `Services/CharacterService.cs` |
| Modify | `Services/AuthService.cs` |
| Modify | `Services/Interfaces/IGameService.cs` |
| Modify | `Services/GameService.cs` |
| Modify | `Models/DTOs/Rawg/RawgGameDetailed.cs` |
| Modify | `Controllers/AuthController.cs` |
| Modify | `Controllers/UserGamesController.cs` |
| Modify | `Program.cs` |
| Create | `Models/DTOs/Auth/AuthResponse.cs` |
| Create | `Models/DTOs/UserGame/UserGameResponse.cs` |
| Create | `Models/DTOs/Game/GameDetails.cs` |
| Create | `Models/DTOs/Game/PagedGamesResult.cs` |
| Create | `Services/Interfaces/IAuthService.cs` |
| Create | `Services/CharacterInteractionService.cs` |
| Create | `Services/Interfaces/ICharacterInteractionService.cs` |
| Create | `Controllers/CharacterInteractionController.cs` |
| Create (migration) | `Migrations/YYYYMMDD_RenameCharacterFields.cs` |

All paths are relative to `apps/api/`.

---

## Task 1: Establish baseline

**Files:** none modified

- [ ] **Step 1: Run the full test suite to confirm a clean baseline**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass. If any fail, note them — they are pre-existing failures, not caused by this refactor.

---

## Task 2: Delete dead code

**Files:**
- Delete: `apps/api/Controllers/CharacterController.cs`
- Delete: `apps/api/Controllers/UsersController.cs`
- Delete: `apps/api/Services/UserService.cs`
- Delete: `apps/api/Services/Interfaces/IUserService.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Delete the four dead files**

```powershell
Remove-Item apps/api/Controllers/CharacterController.cs
Remove-Item apps/api/Controllers/UsersController.cs
Remove-Item apps/api/Services/UserService.cs
Remove-Item apps/api/Services/Interfaces/IUserService.cs
```

- [ ] **Step 2: Remove the IUserService registration from Program.cs**

In [apps/api/Program.cs](apps/api/Program.cs), remove line 22:
```csharp
builder.Services.AddScoped<IUserService, UserService>();
```

Also remove the unused using at the top — run a build first to see what the compiler flags.

- [ ] **Step 3: Build to verify**

```
dotnet build apps/api
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```
git add apps/api/Controllers/CharacterController.cs apps/api/Controllers/UsersController.cs apps/api/Services/UserService.cs apps/api/Services/Interfaces/IUserService.cs apps/api/Program.cs
git commit -m "refactor: delete dead UserService, UsersController, and nested CharacterController"
```

---

## Task 3: Rename Character entity fields + fix CharacterInteraction filename

**Files:**
- Modify: `apps/api/Models/Character.cs`
- Rename: `apps/api/Models/CharacterInteractions.cs` → `CharacterInteraction.cs`
- Modify: `apps/api/Services/CharacterService.cs`

- [ ] **Step 1: Rename the CharacterInteractions.cs file**

```powershell
git mv apps/api/Models/CharacterInteractions.cs apps/api/Models/CharacterInteraction.cs
```

No code changes needed — the class inside was already named `CharacterInteraction`.

- [ ] **Step 2: Replace Character.cs with renamed fields**

Full replacement for [apps/api/Models/Character.cs](apps/api/Models/Character.cs):

```csharp
namespace PartyUp.Api.Models;

public class Character
{
  public Guid Id { get; set; }
  public Guid UserGameId { get; set; }
  public UserGame UserGame { get; set; } = default!;

  public string Name { get; set; } = default!;
  public string? Nickname { get; set; }
  public string? Bio { get; set; }
  public string? Playstyle { get; set; }
  public string? Rank { get; set; }
  public string? Region { get; set; }

  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 3: Update CharacterService.cs to remove all mapping shims**

The service currently maps `Description ↔ Bio`, `PlayStyle ↔ Playstyle`, `CreateAt → CreatedAt` in four places. Now the fields match the DTOs directly.

Full replacement for [apps/api/Services/CharacterService.cs](apps/api/Services/CharacterService.cs):

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Character;

namespace PartyUp.Api.Services;

public class CharacterService : ICharacterService
{
  private readonly AppDbContext _db;

  public CharacterService(AppDbContext db)
  {
    _db = db;
  }

  public async Task<CharacterResponse?> CreateCharacterAsync(
    Guid userId,
    Guid userGameId,
    CreateCharacterRequest request)
  {
    var userGame = await _db.UserGames
      .FirstOrDefaultAsync(x => x.Id == userGameId && x.UserId == userId);

    if (userGame == null)
      return null;

    var character = new Character
    {
      Id = Guid.NewGuid(),
      UserGameId = userGameId,
      Name = request.Name,
      Nickname = request.Nickname,
      Bio = request.Bio,
      Playstyle = request.Playstyle,
      Rank = request.Rank,
      Region = request.Region,
    };

    _db.Characters.Add(character);
    await _db.SaveChangesAsync();

    return ToResponse(character);
  }

  public async Task<List<CharacterResponse>> GetCharactersForUserGameAsync(
    Guid userId,
    Guid userGameId)
  {
    var userGameExists = await _db.UserGames
      .AnyAsync(x => x.Id == userGameId && x.UserId == userId);

    if (!userGameExists)
      return [];

    return await _db.Characters
      .Where(x => x.UserGameId == userGameId)
      .Select(x => ToResponse(x))
      .ToListAsync();
  }

  public async Task<List<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId)
  {
    return await _db.Characters
      .Include(c => c.UserGame)
      .Where(c => c.UserGame.UserId == userId)
      .Select(c => ToResponse(c))
      .ToListAsync();
  }

  public async Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(Guid userId, Guid gameId)
  {
    var myUserGame = await _db.UserGames
      .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);

    if (myUserGame == null)
      return [];

    var myCharacterIds = await _db.Characters
      .Where(c => c.UserGameId == myUserGame.Id)
      .Select(c => c.Id)
      .ToListAsync();

    if (myCharacterIds.Count == 0)
      return [];

    var alreadySeenIds = await _db.CharacterInteractions
      .Where(i => myCharacterIds.Contains(i.FromCharacterId))
      .Select(i => i.ToCharacterId)
      .ToListAsync();

    return await _db.Characters
      .Include(c => c.UserGame)
        .ThenInclude(ug => ug.Game)
      .Where(c =>
        c.UserGame.GameId == gameId &&
        c.UserGame.UserId != userId &&
        !alreadySeenIds.Contains(c.Id))
      .Select(c => new DiscoverCharacterResponse
      {
        Id = c.Id,
        Name = c.Name,
        Bio = c.Bio,
        Playstyle = c.Playstyle,
        Rank = c.Rank,
        Region = c.Region,
        GameName = c.UserGame.Game.Name,
        GameImageUrl = c.UserGame.Game.ImageUrl,
      })
      .ToListAsync();
  }

  public async Task<bool> UpdateCharacterAsync(
    Guid userId,
    Guid userGameId,
    Guid characterId,
    UpdateCharacterRequest request)
  {
    var character = await _db.Characters
      .Include(c => c.UserGame)
      .FirstOrDefaultAsync(c =>
        c.Id == characterId &&
        c.UserGameId == userGameId &&
        c.UserGame.UserId == userId);

    if (character == null)
      return false;

    character.Name = request.Name;
    character.Nickname = request.Nickname;
    character.Bio = request.Bio;
    character.Playstyle = request.Playstyle;
    character.Rank = request.Rank;
    character.Region = request.Region;

    await _db.SaveChangesAsync();
    return true;
  }

  public async Task<bool> DeleteCharacterAsync(
    Guid userId,
    Guid userGameId,
    Guid characterId)
  {
    var character = await _db.Characters
      .Include(c => c.UserGame)
      .FirstOrDefaultAsync(c =>
        c.Id == characterId &&
        c.UserGameId == userGameId &&
        c.UserGame.UserId == userId);

    if (character == null)
      return false;

    _db.Characters.Remove(character);
    await _db.SaveChangesAsync();
    return true;
  }

  private static CharacterResponse ToResponse(Character c) => new()
  {
    Id = c.Id,
    UserGameId = c.UserGameId,
    Name = c.Name,
    Nickname = c.Nickname,
    Bio = c.Bio,
    Playstyle = c.Playstyle,
    Rank = c.Rank,
    Region = c.Region,
    CreatedAt = c.CreatedAt,
  };
}
```

- [ ] **Step 4: Build to verify**

```
dotnet build apps/api
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```
git add apps/api/Models/CharacterInteraction.cs apps/api/Models/CharacterInteractions.cs apps/api/Models/Character.cs apps/api/Services/CharacterService.cs
git commit -m "refactor: rename Character fields to Bio/Playstyle/CreatedAt, rename CharacterInteractions.cs"
```

---

## Task 4: Add EF Core migration for Character field renames

**Files:**
- Create: `apps/api/Migrations/YYYYMMDD_RenameCharacterFields.cs` (generated)

- [ ] **Step 1: Generate the migration**

```
dotnet ef migrations add RenameCharacterFields --project apps/api
```

- [ ] **Step 2: Open the generated migration and replace drop/add with RenameColumn**

EF Core cannot detect renames — it generates `DropColumn` + `AddColumn`, which would destroy existing data. Find the generated `Up` method and replace it with `RenameColumn` calls:

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.RenameColumn(
        name: "Description",
        table: "Characters",
        newName: "Bio");

    migrationBuilder.RenameColumn(
        name: "PlayStyle",
        table: "Characters",
        newName: "Playstyle");

    migrationBuilder.RenameColumn(
        name: "CreateAt",
        table: "Characters",
        newName: "CreatedAt");
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.RenameColumn(
        name: "Bio",
        table: "Characters",
        newName: "Description");

    migrationBuilder.RenameColumn(
        name: "Playstyle",
        table: "Characters",
        newName: "PlayStyle");

    migrationBuilder.RenameColumn(
        name: "CreatedAt",
        table: "Characters",
        newName: "CreateAt");
}
```

> **Important:** Delete all other generated content in `Up` and `Down` (the drop/add blocks). Keep only the three `RenameColumn` calls in each.

- [ ] **Step 3: Apply the migration**

```
dotnet ef database update --project apps/api
```

Expected: `Done.`

- [ ] **Step 4: Commit**

```
git add apps/api/Migrations/
git commit -m "refactor: add migration to rename Character columns Bio/Playstyle/CreatedAt"
```

---

## Task 5: Add AuthResponse DTO + update AuthController

**Files:**
- Create: `apps/api/Models/DTOs/Auth/AuthResponse.cs`
- Modify: `apps/api/Controllers/AuthController.cs`

- [ ] **Step 1: Create AuthResponse.cs**

```csharp
namespace PartyUp.Api.Models.DTOs.Auth;

public class AuthResponse
{
  public string Token { get; set; } = string.Empty;
  public string Username { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Update AuthController.cs**

`Register` now generates a token by calling `Login` after successful registration (eliminates the `PasswordHash` exposure). `Login` returns `AuthResponse` instead of an anonymous object.

Full replacement for [apps/api/Controllers/AuthController.cs](apps/api/Controllers/AuthController.cs):

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.Auth;
using System.Security.Claims;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
  private readonly AuthService _auth;

  public AuthController(AuthService auth)
  {
    _auth = auth;
  }

  [HttpPost("register")]
  public async Task<IActionResult> Register(RegisterRequest request, IConfiguration config)
  {
    var user = await _auth.Register(request.Username, request.Password);
    if (user == null)
      return BadRequest("Username already exists");

    var token = await _auth.Login(request.Username, request.Password, config);
    return Ok(new AuthResponse { Token = token!, Username = user.Username });
  }

  [HttpPost("login")]
  public async Task<IActionResult> Login(LoginRequest request, IConfiguration config)
  {
    var token = await _auth.Login(request.Username, request.Password, config);
    if (token == null)
      return Unauthorized();

    return Ok(new AuthResponse { Token = token, Username = request.Username });
  }

  [Authorize]
  [HttpGet("me")]
  public IActionResult Me()
  {
    var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
    var username = User.FindFirstValue(ClaimTypes.Name);

    if (id == null || username == null)
      return Unauthorized();

    return Ok(new { id, username });
  }
}
```

- [ ] **Step 3: Build to verify**

```
dotnet build apps/api
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```
git add apps/api/Models/DTOs/Auth/AuthResponse.cs apps/api/Controllers/AuthController.cs
git commit -m "refactor: add AuthResponse DTO, stop exposing raw User entity from auth endpoints"
```

---

## Task 6: Add UserGameResponse DTO + update UserGamesController

**Files:**
- Create: `apps/api/Models/DTOs/UserGame/UserGameResponse.cs`
- Modify: `apps/api/Controllers/UserGamesController.cs`

- [ ] **Step 1: Create UserGameResponse.cs**

```csharp
namespace PartyUp.Api.Models.DTOs.UserGame;

public class UserGameResponse
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public Guid GameId { get; set; }
  public string GameName { get; set; } = string.Empty;
  public string? GameImageUrl { get; set; }
}
```

- [ ] **Step 2: Update UserGamesController.cs**

Full replacement for [apps/api/Controllers/UserGamesController.cs](apps/api/Controllers/UserGamesController.cs):

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
    var userGame = await _service.AddGameToUser(userId, request);
    return Ok(ToResponse(userGame));
  }

  [HttpGet]
  public async Task<IActionResult> GetUserGames()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var games = await _service.GetUserGames(userId);
    return Ok(games.Select(ToResponse));
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
}
```

- [ ] **Step 3: Build to verify**

```
dotnet build apps/api
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```
git add apps/api/Models/DTOs/UserGame/UserGameResponse.cs apps/api/Controllers/UserGamesController.cs
git commit -m "refactor: add UserGameResponse DTO, stop exposing raw UserGame entity"
```

---

## Task 7: Move GameDetails + PagedGamesResult to DTOs/Game/ + trim RawgGameDetailed

**Files:**
- Create: `apps/api/Models/DTOs/Game/GameDetails.cs`
- Create: `apps/api/Models/DTOs/Game/PagedGamesResult.cs`
- Delete: `apps/api/Models/GameDetails.cs`
- Delete: `apps/api/Models/PagedGamesResult.cs`
- Modify: `apps/api/Services/Interfaces/IGameService.cs`
- Modify: `apps/api/Services/GameService.cs`
- Modify: `apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs`

- [ ] **Step 1: Create Models/DTOs/Game/GameDetails.cs**

```csharp
using System.Text.Json.Serialization;

namespace PartyUp.Api.Models.DTOs.Game;

public class GameDetails
{
  public int ExternalId { get; set; }
  public string Name { get; set; } = string.Empty;

  [JsonPropertyName("description")]
  public string Description { get; set; } = string.Empty;

  public string? ImageUrl { get; set; }
  public string? Website { get; set; }
  public double Rating { get; set; }
  public List<string> Platforms { get; set; } = [];
}
```

- [ ] **Step 2: Create Models/DTOs/Game/PagedGamesResult.cs**

```csharp
using PartyUp.Api.Models;

namespace PartyUp.Api.Models.DTOs.Game;

public class PagedGamesResult
{
  public List<Game> Games { get; set; } = new();
  public int TotalCount { get; set; }
  public int Page { get; set; }
  public int TotalPages { get; set; }
}
```

- [ ] **Step 3: Delete the old files**

```powershell
Remove-Item apps/api/Models/GameDetails.cs
Remove-Item apps/api/Models/PagedGamesResult.cs
```

- [ ] **Step 4: Update IGameService.cs**

Replace `using PartyUp.Api.Models;` with `using PartyUp.Api.Models.DTOs.Game;`:

Full replacement for [apps/api/Services/Interfaces/IGameService.cs](apps/api/Services/Interfaces/IGameService.cs):

```csharp
using PartyUp.Api.Models.DTOs.Game;

public interface IGameService
{
  Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, List<string>? tags);
  Task<GameDetails?> GetGameById(int id);
}
```

- [ ] **Step 5: Update GameService.cs to add the new using**

Add `using PartyUp.Api.Models.DTOs.Game;` to [apps/api/Services/GameService.cs](apps/api/Services/GameService.cs). Keep `using PartyUp.Api.Models;` — it's still needed for `new Game { ... }`.

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;
using PartyUp.Api.Infrastructure.Clients;

namespace PartyUp.Api.Services;

public class GameService : IGameService
{
  private readonly RawgClient _rawg;
  private const int PageSize = 20;

  public GameService(RawgClient rawg)
  {
    _rawg = rawg;
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
}
```

- [ ] **Step 6: Trim RawgGameDetailed.cs to only used fields**

Full replacement for [apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs](apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs):

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

- [ ] **Step 7: Build to verify**

```
dotnet build apps/api
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```
git add apps/api/Models/DTOs/Game/ apps/api/Models/GameDetails.cs apps/api/Models/PagedGamesResult.cs apps/api/Services/Interfaces/IGameService.cs apps/api/Services/GameService.cs apps/api/Models/DTOs/Rawg/RawgGameDetailed.cs
git commit -m "refactor: move GameDetails/PagedGamesResult to DTOs/Game, trim RawgGameDetailed"
```

---

## Task 8: Add IAuthService

**Files:**
- Create: `apps/api/Services/Interfaces/IAuthService.cs`
- Modify: `apps/api/Services/AuthService.cs`
- Modify: `apps/api/Program.cs`
- Modify: `apps/api/Controllers/AuthController.cs`

- [ ] **Step 1: Create IAuthService.cs**

```csharp
using PartyUp.Api.Models;

public interface IAuthService
{
  Task<User?> Register(string username, string password);
  Task<string?> Login(string username, string password, IConfiguration config);
}
```

- [ ] **Step 2: Add IAuthService to AuthService.cs**

In [apps/api/Services/AuthService.cs](apps/api/Services/AuthService.cs), change the class declaration to implement the interface:

```csharp
public class AuthService : IAuthService
```

- [ ] **Step 3: Update Program.cs**

In [apps/api/Program.cs](apps/api/Program.cs), replace:
```csharp
builder.Services.AddScoped<AuthService>();
```
with:
```csharp
builder.Services.AddScoped<IAuthService, AuthService>();
```

- [ ] **Step 4: Update AuthController.cs to inject IAuthService**

In [apps/api/Controllers/AuthController.cs](apps/api/Controllers/AuthController.cs), replace the field and constructor:

```csharp
private readonly IAuthService _auth;

public AuthController(IAuthService auth)
{
  _auth = auth;
}
```

- [ ] **Step 5: Build to verify**

```
dotnet build apps/api
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```
git add apps/api/Services/Interfaces/IAuthService.cs apps/api/Services/AuthService.cs apps/api/Program.cs apps/api/Controllers/AuthController.cs
git commit -m "refactor: add IAuthService interface, register via DI"
```

---

## Task 9: Rename SwipeRequest → CharacterInteractionRequest + rename service and interface

**Files:**
- Rename: `apps/api/Models/DTOs/CharacterInteraction/SwipeRequest.cs` → `CharacterInteractionRequest.cs`
- Create: `apps/api/Services/Interfaces/ICharacterInteractionService.cs`
- Delete: `apps/api/Services/Interfaces/ICharacterMatchService.cs`
- Create: `apps/api/Services/CharacterInteractionService.cs`
- Delete: `apps/api/Services/CharacterMatchService.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Rename SwipeRequest.cs**

```powershell
git mv apps/api/Models/DTOs/CharacterInteraction/SwipeRequest.cs apps/api/Models/DTOs/CharacterInteraction/CharacterInteractionRequest.cs
```

Update the class name inside the file. Full replacement:

```csharp
public class CharacterInteractionRequest
{
  public Guid FromCharacterId { get; set; }
  public Guid ToCharacterId { get; set; }
  public bool IsLike { get; set; }
}
```

- [ ] **Step 2: Create ICharacterInteractionService.cs**

```csharp
public interface ICharacterInteractionService
{
  Task<MatchResponse> RecordInteractionAsync(CharacterInteractionRequest request);
}
```

- [ ] **Step 3: Create CharacterInteractionService.cs**

Full content — same logic as `CharacterMatchService`, method renamed to `RecordInteractionAsync`, parameter type updated to `CharacterInteractionRequest`:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;

public class CharacterInteractionService : ICharacterInteractionService
{
  private readonly AppDbContext _db;

  public CharacterInteractionService(AppDbContext db)
  {
    _db = db;
  }

  public async Task<MatchResponse> RecordInteractionAsync(CharacterInteractionRequest request)
  {
    if (request.FromCharacterId == request.ToCharacterId)
      throw new InvalidOperationException("Cannot interact with self");

    var interaction = new CharacterInteraction
    {
      Id = Guid.NewGuid(),
      FromCharacterId = request.FromCharacterId,
      ToCharacterId = request.ToCharacterId,
      Type = request.IsLike ? InteractionType.Like : InteractionType.Dislike,
      CreatedAt = DateTime.UtcNow
    };

    _db.CharacterInteractions.Add(interaction);
    await _db.SaveChangesAsync();

    if (!request.IsLike)
      return new MatchResponse { IsMatch = false };

    var reverseLikeExists = await _db.CharacterInteractions
      .AnyAsync(x =>
        x.FromCharacterId == request.ToCharacterId &&
        x.ToCharacterId == request.FromCharacterId &&
        x.Type == InteractionType.Like);

    if (!reverseLikeExists)
      return new MatchResponse { IsMatch = false };

    var (aId, bId) = Order(request.FromCharacterId, request.ToCharacterId);

    var existingMatch = await _db.CharacterMatches
      .FirstOrDefaultAsync(m =>
        m.CharacterAId == aId &&
        m.CharacterBId == bId);

    if (existingMatch != null)
    {
      return new MatchResponse
      {
        IsMatch = true,
        MatchId = existingMatch.Id,
        CharacterAId = aId,
        CharacterBId = bId,
        MatchedAt = existingMatch.MatchedAt
      };
    }

    var match = new CharacterMatch
    {
      Id = Guid.NewGuid(),
      CharacterAId = aId,
      CharacterBId = bId,
      MatchedAt = DateTime.UtcNow
    };

    _db.CharacterMatches.Add(match);
    await _db.SaveChangesAsync();

    return new MatchResponse
    {
      IsMatch = true,
      MatchId = match.Id,
      CharacterAId = aId,
      CharacterBId = bId,
      MatchedAt = match.MatchedAt
    };
  }

  private static (Guid, Guid) Order(Guid a, Guid b)
    => a.CompareTo(b) < 0 ? (a, b) : (b, a);
}
```

- [ ] **Step 4: Delete the old files**

```powershell
Remove-Item apps/api/Services/CharacterMatchService.cs
Remove-Item apps/api/Services/Interfaces/ICharacterMatchService.cs
```

- [ ] **Step 5: Update Program.cs DI registration**

In [apps/api/Program.cs](apps/api/Program.cs), replace:
```csharp
builder.Services.AddScoped<ICharacterMatchService, CharacterMatchService>();
```
with:
```csharp
builder.Services.AddScoped<ICharacterInteractionService, CharacterInteractionService>();
```

- [ ] **Step 6: Build to verify**

```
dotnet build apps/api
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```
git add apps/api/Models/DTOs/CharacterInteraction/ apps/api/Services/CharacterInteractionService.cs apps/api/Services/CharacterMatchService.cs apps/api/Services/Interfaces/ICharacterInteractionService.cs apps/api/Services/Interfaces/ICharacterMatchService.cs apps/api/Program.cs
git commit -m "refactor: rename CharacterMatchService to CharacterInteractionService, SwipeRequest to CharacterInteractionRequest"
```

---

## Task 10: Rename SwipeController → CharacterInteractionController

**Files:**
- Create: `apps/api/Controllers/CharacterInteractionController.cs`
- Delete: `apps/api/Controllers/SwipeController.cs`

- [ ] **Step 1: Create CharacterInteractionController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/character-interactions")]
[Authorize]
public class CharacterInteractionController : ControllerBase
{
  private readonly ICharacterInteractionService _service;

  public CharacterInteractionController(ICharacterInteractionService service)
  {
    _service = service;
  }

  [HttpPost]
  public async Task<ActionResult<MatchResponse>> RecordInteraction(CharacterInteractionRequest request)
  {
    var result = await _service.RecordInteractionAsync(request);
    return Ok(result);
  }
}
```

- [ ] **Step 2: Delete SwipeController.cs**

```powershell
Remove-Item apps/api/Controllers/SwipeController.cs
```

- [ ] **Step 3: Build to verify**

```
dotnet build apps/api
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```
git add apps/api/Controllers/CharacterInteractionController.cs apps/api/Controllers/SwipeController.cs
git commit -m "refactor: rename SwipeController to CharacterInteractionController, route api/swipes -> api/character-interactions, add [Authorize]"
```

---

## Task 11: Final build and test run

- [ ] **Step 1: Full build**

```
dotnet build
```

Expected: 0 errors, 0 warnings related to this refactor.

- [ ] **Step 2: Run integration tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: same pass/fail as the baseline from Task 1.

- [ ] **Step 3: Note frontend route change**

The frontend currently calls `api/swipes` (POST). That route no longer exists — it is now `api/character-interactions`. This is a **separate frontend task** and is out of scope for this plan. The frontend will receive 404s on the swipe action until that update is made.
