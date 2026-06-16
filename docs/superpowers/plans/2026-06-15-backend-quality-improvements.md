# Backend Quality Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all backend quality issues surfaced by the June 2026 review — covering runtime safety, performance, architecture layering, security, and cleanup — ordered from most to least critical.

**Architecture:** The intended pattern is thin controllers (HTTP concerns only) → services (all business logic) → EF Core DbContext → PostgreSQL. No controller should reference DbContext, IConfiguration, or contain mapping logic. All external resources must be properly lifecycle-managed via DI.

**Tech Stack:** ASP.NET Core 8, EF Core 8 with Npgsql, xUnit integration tests hitting a real PostgreSQL database (`partyup_test`), FluentAssertions.

---

## Phase 1 — Critical Runtime Safety

### Task 1: Add global exception handler middleware

**Files:**
- Modify: `apps/api/Program.cs`

Unhandled exceptions (RAWG timeouts, EF `DbUpdateException`, etc.) currently return a raw ASP.NET 500 with no JSON body. Any call to an endpoint that throws an uncaught exception gives the frontend no actionable error.

- [ ] **Step 1: Add UseExceptionHandler before UseAuthentication in Program.cs**

In `apps/api/Program.cs`, replace the middleware section (`#region Middleware`) with:

```csharp
#region Middleware

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "PartyUp API v1"));

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        var logger = context.RequestServices
            .GetRequiredService<ILogger<Program>>();
        var exceptionFeature = context.Features
            .Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        if (exceptionFeature != null)
            logger.LogError(exceptionFeature.Error, "Unhandled exception");

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
            title = "An unexpected error occurred.",
            status = 500
        });
    });
});

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
#endregion
```

- [ ] **Step 2: Run all tests to confirm nothing breaks**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add apps/api/Program.cs
git commit -m "feat: add global exception handler middleware returning ProblemDetails"
```

---

### Task 2: Fix FirstAsync → FirstOrDefaultAsync in CharacterInteractionService

**Files:**
- Modify: `apps/api/Services/CharacterInteractionService.cs`
- Test: `apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/CharacterInteractionTests.cs`

Line 40 of `CharacterInteractionService.cs` uses `FirstAsync` when fetching `toChar`. A deleted or invalid `ToCharacterId` causes `InvalidOperationException: Sequence contains no elements` — which surfaces as a 500.

- [ ] **Step 1: Write the failing test**

Add to `apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/CharacterInteractionTests.cs`:

```csharp
[Fact]
public async Task RecordInteraction_WithInvalidToCharacterId_Returns404()
{
    var authClient = await CreateAuthenticatedClientAsync();

    // Create a game and character for the authenticated user
    var gameResponse = await authClient.PostAsJsonAsync("/api/user-games",
        new { rawgId = 1, name = "Test Game", imageUrl = (string?)null, skipParentRedirect = true });
    var gameBody = await gameResponse.Content.ReadFromJsonAsync<JsonElement>();
    var userGameId = gameBody.GetProperty("userGame").GetProperty("id").GetString();

    var charResponse = await authClient.PostAsJsonAsync("/api/characters",
        new { userGameId, name = "MyChar", platform = "PC", platformHandle = "handle1" });
    var charBody = await charResponse.Content.ReadFromJsonAsync<JsonElement>();
    var fromId = charBody.GetProperty("id").GetString();

    var response = await authClient.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = fromId,
        toCharacterId = Guid.NewGuid(), // does not exist
        type = "Like"
    });

    response.StatusCode.Should().Be(HttpStatusCode.NotFound);
}
```

- [ ] **Step 2: Run test to confirm it fails**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "RecordInteraction_WithInvalidToCharacterId_Returns404"
```

Expected: FAIL (500 instead of 404).

- [ ] **Step 3: Fix CharacterInteractionService.cs line 40**

In `apps/api/Services/CharacterInteractionService.cs`, change:

```csharp
var toChar = await _db.Characters
    .Include(c => c.UserGame)
    .FirstAsync(c => c.Id == request.ToCharacterId);

var recipientUserId = toChar.UserGame.UserId;
```

To:

```csharp
var toChar = await _db.Characters
    .Include(c => c.UserGame)
    .FirstOrDefaultAsync(c => c.Id == request.ToCharacterId);

if (toChar == null)
    throw new KeyNotFoundException($"Character {request.ToCharacterId} not found");

var recipientUserId = toChar.UserGame.UserId;
```

- [ ] **Step 4: Handle KeyNotFoundException in CharacterInteractionController**

Open `apps/api/Controllers/CharacterInteractionController.cs` and add a catch for `KeyNotFoundException` alongside the existing `UnauthorizedAccessException` catch:

```csharp
catch (KeyNotFoundException)
{
    return NotFound();
}
```

- [ ] **Step 5: Run test to confirm it passes**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "RecordInteraction_WithInvalidToCharacterId_Returns404"
```

Expected: PASS.

- [ ] **Step 6: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 7: Commit**

```
git add apps/api/Services/CharacterInteractionService.cs apps/api/Controllers/CharacterInteractionController.cs apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/CharacterInteractionTests.cs
git commit -m "fix: return 404 instead of 500 for unknown ToCharacterId in interactions"
```

---

### Task 3: Null-safe Guid.Parse on JWT claims across all controllers

**Files:**
- Modify: `apps/api/Controllers/AuthController.cs`
- Modify: `apps/api/Controllers/UserGamesController.cs`
- Search for additional occurrences: `CharactersController.cs`, `ProfileController.cs`, `CharacterInteractionController.cs`, `CharacterMatchesController.cs`, `MatchNotificationsController.cs`

`Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)` uses the null-forgiving operator. If a JWT lacks the claim (misconfigured environment, test harness), `Guid.Parse(null!)` throws `ArgumentNullException` → 500. `Me()` in `AuthController` already demonstrates the safe pattern.

- [ ] **Step 1: Create a shared helper extension method**

Create `apps/api/Controllers/ControllerExtensions.cs`:

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

public static class ControllerExtensions
{
    public static Guid? GetUserId(this ControllerBase controller)
    {
        var claim = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim) : null;
    }
}
```

- [ ] **Step 2: Update AuthController.ChangePassword**

In `apps/api/Controllers/AuthController.cs`, change line 63:

```csharp
// Before
var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

// After
var userId = this.GetUserId();
if (userId == null) return Unauthorized();
```

And update the `await _auth.ChangePasswordAsync` call:

```csharp
var success = await _auth.ChangePasswordAsync(userId.Value, request.CurrentPassword, request.NewPassword);
```

- [ ] **Step 3: Find all remaining unsafe usages**

Run a search across all controllers for the unsafe pattern:

```
grep -rn "FindFirstValue.*NameIdentifier)!" apps/api/Controllers/
```

For each file found, replace the pattern with:

```csharp
var userId = this.GetUserId();
if (userId == null) return Unauthorized();
```

Then use `userId.Value` wherever the Guid is needed. Common files to update:
- `apps/api/Controllers/UserGamesController.cs` (lines 26, 49, 61, 71)
- `apps/api/Controllers/CharactersController.cs`
- `apps/api/Controllers/ProfileController.cs`
- `apps/api/Controllers/CharacterInteractionController.cs`
- `apps/api/Controllers/CharacterMatchesController.cs`

- [ ] **Step 4: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 5: Commit**

```
git add apps/api/Controllers/
git commit -m "fix: null-safe JWT claim extraction across all controllers"
```

---

## Phase 2 — Performance

### Task 4: Add missing FK indexes via EF migration

**Files:**
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`
- Create: new EF migration

No FK indexes exist on `CharacterInteraction`, `CharacterMatch`, or `CharacterFieldValue`. The swipe/discover flow queries these tables by FK columns on every request — without indexes these are full table scans.

- [ ] **Step 1: Add HasIndex calls in DbContext.OnModelCreating**

In `apps/api/Infrastructure/Data/DbContext.cs`, inside `OnModelCreating`, add after the existing entity configurations:

```csharp
modelBuilder.Entity<CharacterInteraction>(e =>
{
    e.HasIndex(i => i.FromCharacterId);
    e.HasIndex(i => i.ToCharacterId);
    e.HasIndex(i => new { i.ToCharacterId, i.Type });
});

modelBuilder.Entity<CharacterMatch>(e =>
{
    e.HasIndex(m => m.CharacterAId);
    e.HasIndex(m => m.CharacterBId);
    e.HasIndex(m => new { m.CharacterAId, m.CharacterBId }).IsUnique();
});

modelBuilder.Entity<CharacterFieldValue>(e =>
{
    e.HasIndex(fv => fv.CharacterId);
    e.HasIndex(fv => fv.FieldDefinitionId);
});
```

- [ ] **Step 2: Add a migration**

```
dotnet ef migrations add AddForeignKeyIndexes --project apps/api
```

Expected: a new migration file appears in `apps/api/Migrations/`.

- [ ] **Step 3: Apply the migration locally**

```
dotnet ef database update --project apps/api
```

Expected: migration applies without errors.

- [ ] **Step 4: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass (tests run against `partyup_test` DB; migration is applied automatically via `Database.Migrate()` in `Program.cs`).

- [ ] **Step 5: Commit**

```
git add apps/api/Infrastructure/Data/DbContext.cs apps/api/Migrations/
git commit -m "perf: add indexes on FK columns for CharacterInteraction, CharacterMatch, CharacterFieldValue"
```

---

### Task 5: Fix GcsStorageService DI lifetime

**Files:**
- Modify: `apps/api/Program.cs`

`GcsStorageService` is registered as `AddScoped` but calls `StorageClient.Create()` in its constructor, creating a new Google `HttpClient`-backed connection per request. Under concurrent uploads this exhausts the socket pool.

- [ ] **Step 1: Change registration from Scoped to Singleton**

In `apps/api/Program.cs`, change line 44:

```csharp
// Before
builder.Services.AddScoped<IGcsStorageService, GcsStorageService>();

// After
builder.Services.AddSingleton<IGcsStorageService, GcsStorageService>();
```

- [ ] **Step 2: Verify GcsStorageService has no scoped dependencies**

Open `apps/api/Services/GcsStorageService.cs`. The constructor takes only `IConfiguration` (a singleton) — no scoped services. This is safe to register as singleton.

- [ ] **Step 3: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass (tests use `FakeGcsService` which the factory overrides to Scoped — no conflict).

- [ ] **Step 4: Commit**

```
git add apps/api/Program.cs
git commit -m "fix: register GcsStorageService as Singleton to prevent StorageClient-per-request"
```

---

## Phase 3 — Architecture Violations

### Task 6: Move IConfiguration out of AuthService method signature

**Files:**
- Modify: `apps/api/Services/AuthService.cs`
- Modify: `apps/api/Services/Interfaces/IAuthService.cs`
- Modify: `apps/api/Controllers/AuthController.cs`

`IAuthService.Login` takes `IConfiguration` as a method argument, so every controller that calls it must acquire and forward a live config instance. `IConfiguration` is a singleton and belongs in the constructor.

- [ ] **Step 1: Update IAuthService.cs**

Replace `apps/api/Services/Interfaces/IAuthService.cs` with:

```csharp
using PartyUp.Api.Models;

public interface IAuthService
{
    Task<User?> Register(string email, string password);
    Task<string?> Login(string email, string password);
    Task<User?> GetByIdAsync(Guid userId);
    Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
}
```

- [ ] **Step 2: Update AuthService.cs**

In `apps/api/Services/AuthService.cs`:

1. Add `IConfiguration` to the constructor:

```csharp
private readonly AppDbContext _context;
private readonly IConfiguration _config;

public AuthService(AppDbContext context, IConfiguration config)
{
    _context = context;
    _config = config;
}
```

2. Remove the `IConfiguration config` parameter from `Login`:

```csharp
public async Task<string?> Login(string email, string password)
{
    var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == email);
    if (user == null) return null;

    var valid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
    if (!valid) return null;

    return GenerateJwt(user);
}
```

3. Remove the `IConfiguration config` parameter from `GenerateJwt` and use `_config`:

```csharp
private string GenerateJwt(User user)
{
    var key = new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Email)
    };

    var token = new JwtSecurityToken(
        issuer: _config["Jwt:Issuer"],
        audience: _config["Jwt:Audience"],
        claims: claims,
        expires: DateTime.UtcNow.AddHours(2),
        signingCredentials: creds);

    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

- [ ] **Step 3: Update AuthController.cs**

Remove `IConfiguration config` from both action-method parameters and update the Login calls:

```csharp
[EnableRateLimiting("auth")]
[HttpPost("register")]
public async Task<IActionResult> Register(RegisterRequest request)
{
    var user = await _auth.Register(request.Email, request.Password);
    if (user == null)
        return BadRequest("Email already registered");

    var token = await _auth.Login(request.Email, request.Password);
    return Ok(new AuthResponse { Token = token!, Email = user.Email });
}

[EnableRateLimiting("auth")]
[HttpPost("login")]
public async Task<IActionResult> Login(LoginRequest request)
{
    var token = await _auth.Login(request.Email, request.Password);
    if (token == null)
        return Unauthorized();

    return Ok(new AuthResponse { Token = token, Email = request.Email });
}
```

- [ ] **Step 4: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass (auth tests cover login and register paths end-to-end).

- [ ] **Step 5: Commit**

```
git add apps/api/Services/AuthService.cs apps/api/Services/Interfaces/IAuthService.cs apps/api/Controllers/AuthController.cs
git commit -m "refactor: inject IConfiguration into AuthService constructor, remove from method signatures"
```

---

### Task 7: Move DTO mapping from UserGamesController into UserGameService

**Files:**
- Modify: `apps/api/Services/Interfaces/IUserGameService.cs`
- Modify: `apps/api/Services/UserGameService.cs`
- Modify: `apps/api/Controllers/UserGamesController.cs`

`IUserGameService.GetUserGames` returns `PagedResult<UserGame>` (a raw EF entity). The controller contains private `ToResponse`/`ToDetailResponse` helpers. If a second call site ever skips the mapper, the raw entity — including `UserId`, all nav properties, and future sensitive fields — is serialized to JSON.

The complication: `GetUserGames` in the controller also calls `_matchNotifications.GetNewMatchCountsByUserGameAsync`. This notification count is controller-level orchestration between two services and should stay in the controller. The fix is to have the service return DTOs (without notification count), and the controller populates `NewMatchCount` after getting them.

- [ ] **Step 1: Update IUserGameService to return DTOs**

In `apps/api/Services/Interfaces/IUserGameService.cs`:

```csharp
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.UserGame;

public interface IUserGameService
{
    Task<AddGameResult> AddGameToUser(Guid userId, AddUserGameRequest request);
    Task<PagedResult<UserGameResponse>> GetUserGames(Guid userId, int page, int pageSize);
    Task<UserGameDetailResponse?> GetUserGameByGameId(Guid userId, Guid gameId);
    Task<bool> DeleteUserGame(Guid id, Guid userId);
}
```

- [ ] **Step 2: Update UserGameService.cs to return DTOs**

Open `apps/api/Services/UserGameService.cs`. In `GetUserGames`, replace the return type and project to DTO before returning:

```csharp
public async Task<PagedResult<UserGameResponse>> GetUserGames(Guid userId, int page, int pageSize)
{
    var query = _db.UserGames
        .Include(ug => ug.Game)
        .Where(ug => ug.UserId == userId)
        .OrderByDescending(ug => ug.CreatedAt);

    var total = await query.CountAsync();
    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(ug => new UserGameResponse
        {
            Id = ug.Id,
            UserId = ug.UserId,
            GameId = ug.GameId,
            GameName = ug.Game.Name,
            GameImageUrl = ug.Game.ImageUrl,
            CreatedAt = ug.CreatedAt,
            NewMatchCount = 0
        })
        .ToListAsync();

    return new PagedResult<UserGameResponse>(items, total, page, pageSize);
}
```

In `GetUserGameByGameId`, return `UserGameDetailResponse?` instead of `UserGame?`:

```csharp
public async Task<UserGameDetailResponse?> GetUserGameByGameId(Guid userId, Guid gameId)
{
    var ug = await _db.UserGames
        .Include(ug => ug.Game)
        .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);

    if (ug == null) return null;

    return new UserGameDetailResponse
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

- [ ] **Step 3: Update UserGamesController.cs**

Remove the private `ToResponse` and `ToDetailResponse` helpers. Update `GetUserGames` to enrich notification counts after getting DTOs, and update `GetUserGameByGameId`:

```csharp
[HttpGet]
public async Task<IActionResult> GetUserGames([FromQuery] int page = 1, [FromQuery] int pageSize = 12)
{
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 50) pageSize = 12;

    var userId = this.GetUserId();
    if (userId == null) return Unauthorized();

    var result = await _service.GetUserGames(userId.Value, page, pageSize);
    var ids = result.Items.Select(g => g.Id).ToList();
    var counts = await _matchNotifications.GetNewMatchCountsByUserGameAsync(userId.Value, ids);

    var items = result.Items.Select(g =>
    {
        g.NewMatchCount = counts.GetValueOrDefault(g.Id, 0);
        return g;
    });
    return Ok(new PagedResult<UserGameResponse>(items, result.TotalCount, result.Page, result.PageSize));
}

[HttpGet("{gameId}/game")]
public async Task<IActionResult> GetUserGameByGameId(Guid gameId)
{
    var userId = this.GetUserId();
    if (userId == null) return Unauthorized();

    var userGame = await _service.GetUserGameByGameId(userId.Value, gameId);
    if (userGame == null) return NotFound();
    return Ok(userGame);
}
```

- [ ] **Step 4: Check AddGame still compiles**

`AddGame` calls `_service.AddGameToUser` which returns `AddGameResult` containing a `UserGame`. The controller maps it with `ToResponse` which we're removing. Update `AddGame` to construct the response inline or add a helper in the service:

```csharp
[HttpPost]
public async Task<IActionResult> AddGame([FromBody] AddUserGameRequest request)
{
    var userId = this.GetUserId();
    if (userId == null) return Unauthorized();

    try
    {
        var result = await _service.AddGameToUser(userId.Value, request);
        var ug = result.UserGame;
        return Ok(new
        {
            userGame = new UserGameResponse
            {
                Id = ug.Id,
                UserId = ug.UserId,
                GameId = ug.GameId,
                GameName = ug.Game.Name,
                GameImageUrl = ug.Game.ImageUrl,
                CreatedAt = ug.CreatedAt,
                NewMatchCount = 0
            },
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

- [ ] **Step 5: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 6: Commit**

```
git add apps/api/Services/Interfaces/IUserGameService.cs apps/api/Services/UserGameService.cs apps/api/Controllers/UserGamesController.cs
git commit -m "refactor: move DTO projection from UserGamesController into UserGameService"
```

---

### Task 8: Extract schema error handling from GamesController into GameSchemaGenerationService

**Files:**
- Modify: `apps/api/Services/GameSchemaGenerationService.cs`
- Modify: `apps/api/Controllers/GamesController.cs`

`GamesController.RegenerateSchema` contains a catch block that resolves `AppDbContext` directly and marks `SchemaStatus.Failed`. But `GameSchemaGenerationService.GenerateForGameAsync` already has its own try/catch that sets `SchemaStatus.Failed`. The controller's catch only fires if the service's outer `SaveChangesAsync` (line 50) throws — but that means the status never gets saved. Moving all error handling into the service makes it self-contained and removes the controller's DbContext dependency.

- [ ] **Step 1: Update GameSchemaGenerationService to handle the final SaveChangesAsync failure**

In `apps/api/Services/GameSchemaGenerationService.cs`, move `SaveChangesAsync` inside the try/catch to ensure status is always persisted:

```csharp
public async Task GenerateForGameAsync(Guid gameId, bool force = false)
{
    var game = await _db.Games.FindAsync(gameId);
    if (game == null) return;
    if (!force && game.SchemaStatus != SchemaStatus.Pending) return;

    game.SchemaStatus = SchemaStatus.Generating;
    var stale = _db.GameFieldDefinitions.Where(d => d.GameId == gameId);
    _db.GameFieldDefinitions.RemoveRange(stale);
    await _db.SaveChangesAsync();

    try
    {
        var dtos = await _anthropic.GenerateFieldDefinitionsAsync(game);
        await _fieldDefinitions.SaveDefinitionsAsync(gameId, dtos);
        game.SchemaStatus = SchemaStatus.Generated;
        await _db.SaveChangesAsync();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to generate schema for game {GameId} ({GameName})", gameId, game.Name);
        game.SchemaStatus = SchemaStatus.Failed;
        await _db.SaveChangesAsync();
    }
}
```

- [ ] **Step 2: Simplify GamesController.RegenerateSchema**

In `apps/api/Controllers/GamesController.cs`, remove the try/catch and DbContext usage from the fire-and-forget task:

```csharp
[EnableRateLimiting("ai-schema")]
[Authorize]
[HttpPost("{id:guid}/regenerate-schema")]
public async Task<IActionResult> RegenerateSchema(Guid id, [FromServices] IServiceScopeFactory scopeFactory)
{
    var game = await _service.GetGameByDbId(id);
    if (game == null)
        return NotFound();

    _ = Task.Run(async () =>
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var generator = scope.ServiceProvider.GetRequiredService<IGameSchemaGenerationService>();
        await generator.GenerateForGameAsync(id, force: true);
    });

    return Accepted();
}
```

Also remove `using PartyUp.Api.Infrastructure.Data;` from the controller's using list if it's no longer referenced.

- [ ] **Step 3: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 4: Commit**

```
git add apps/api/Services/GameSchemaGenerationService.cs apps/api/Controllers/GamesController.cs
git commit -m "refactor: move schema error handling into GameSchemaGenerationService, remove DbContext from controller"
```

---

## Phase 4 — Security & Configuration

### Task 9: Add [Authorize] to GET /api/games/popular

**Files:**
- Modify: `apps/api/Controllers/GamesController.cs`
- Test: `apps/tests/PartyUp.Api.Tests/Features/Games/GameSecurityTests.cs`

Every other `GamesController` endpoint is protected with `[Authorize]`. `GetPopular` is missing it, exposing per-game player counts to anonymous callers.

- [ ] **Step 1: Write the failing test**

Add to `apps/tests/PartyUp.Api.Tests/Features/Games/GameSecurityTests.cs`:

```csharp
[Fact]
public async Task PopularGames_WithoutAuth_Returns401()
{
    var response = await Client.GetAsync("/api/games/popular");
    response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
}
```

- [ ] **Step 2: Run test to confirm it fails**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "PopularGames_WithoutAuth_Returns401"
```

Expected: FAIL (200 instead of 401).

- [ ] **Step 3: Add [Authorize] to GetPopular**

In `apps/api/Controllers/GamesController.cs`, add `[Authorize]` to the `GetPopular` action:

```csharp
[Authorize]
[HttpGet("popular")]
public async Task<IActionResult> GetPopular([FromQuery] int limit = 6)
{
    if (limit < 1 || limit > 20) limit = 6;
    var result = await _service.GetPopularGames(limit);
    return Ok(result);
}
```

- [ ] **Step 4: Run test to confirm it passes**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "PopularGames_WithoutAuth_Returns401"
```

Expected: PASS.

- [ ] **Step 5: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 6: Commit**

```
git add apps/api/Controllers/GamesController.cs apps/tests/PartyUp.Api.Tests/Features/Games/GameSecurityTests.cs
git commit -m "fix: require auth on GET /api/games/popular"
```

---

### Task 10: Fix CORS configuration — add startup guard for empty origins

**Files:**
- Modify: `apps/api/Program.cs`

If `AllowedOrigins` is missing from config, `WithOrigins([])` silently produces a policy that blocks all cross-origin requests. There's no error logged and no startup failure — the API boots but the frontend can't talk to it.

- [ ] **Step 1: Add a startup guard in Program.cs**

In `apps/api/Program.cs`, replace the `#region CORS` block:

```csharp
#region CORS

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            var origins = builder.Configuration
                .GetSection("AllowedOrigins")
                .Get<string[]>() ?? [];

            if (origins.Length == 0)
                throw new InvalidOperationException(
                    "AllowedOrigins configuration is missing or empty. " +
                    "Add it to appsettings or environment variables.");

            policy.WithOrigins(origins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
});

#endregion
```

- [ ] **Step 2: Add AllowedOrigins to appsettings.Development.json**

Check `apps/api/appsettings.Development.json`. If `AllowedOrigins` is not present, add it:

```json
"AllowedOrigins": [ "http://localhost:5173" ]
```

- [ ] **Step 3: Update ApiFactory to include AllowedOrigins in test config**

In `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs`, add `AllowedOrigins:0` to the in-memory config:

```csharp
config.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["Rawg:ApiKey"] = "ci-test-fake-rawg-key",
    ["Anthropic:ApiKey"] = "ci-test-fake-anthropic-key",
    ["GoogleCloudStorage:BucketName"] = "test-bucket",
    ["Jwt:Issuer"] = "partyup-api",
    ["Jwt:Audience"] = "partyup-client",
    ["RateLimit:AuthPermitLimit"] = "1000",
    ["AllowedOrigins:0"] = "http://localhost:5173"
});
```

- [ ] **Step 4: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 5: Commit**

```
git add apps/api/Program.cs apps/api/appsettings.Development.json apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs
git commit -m "fix: throw on empty AllowedOrigins at startup; add AllowCredentials for SignalR"
```

---

## Phase 5 — Data Integrity

### Task 11: Fix Character.CreatedAt to use a DB-level default

**Files:**
- Modify: `apps/api/Models/Character.cs`
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`
- Create: new EF migration

`Character.CreatedAt` is set by C# property initializer (`= DateTime.UtcNow`) rather than the database clock. The value is the time the object is constructed, not the time of DB commit — which can differ for objects held in memory before saving. There's also no `HasDefaultValueSql`, so raw SQL inserts that omit the column will fail on a `NOT NULL` constraint.

- [ ] **Step 1: Remove the C# initializer from Character.cs**

In `apps/api/Models/Character.cs`, change line 44:

```csharp
// Before
public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

// After
public DateTime CreatedAt { get; set; }
```

- [ ] **Step 2: Add HasDefaultValueSql in DbContext.cs**

In `apps/api/Infrastructure/Data/DbContext.cs`, add a `Character` entity configuration inside `OnModelCreating`:

```csharp
modelBuilder.Entity<Character>(e =>
{
    e.Property(c => c.CreatedAt).HasDefaultValueSql("NOW()");
});
```

- [ ] **Step 3: Add the migration**

```
dotnet ef migrations add CharacterCreatedAtDbDefault --project apps/api
```

Expected: a migration that alters the `CreatedAt` column to have a database default.

- [ ] **Step 4: Apply migration**

```
dotnet ef database update --project apps/api
```

- [ ] **Step 5: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 6: Commit**

```
git add apps/api/Models/Character.cs apps/api/Infrastructure/Data/DbContext.cs apps/api/Migrations/
git commit -m "fix: set Character.CreatedAt via HasDefaultValueSql instead of C# initializer"
```

---

### Task 12: Fix RawgClient — null guard on GetGames and exclude_additions serialization

**Files:**
- Modify: `apps/api/Infrastructure/Clients/RawgClient.cs`

Two bugs in `RawgClient.GetGames`:
1. No null guard on `_config["Rawg:ApiKey"]` — sibling methods throw a clear exception; `GetGames` silently sends a keyless request and gets a RAWG 401.
2. `exclude_additions` is a `bool?`. `string.Join(",", exclude_additions)` serializes it as `"True"` (C# default). RAWG requires `"true"` (lowercase). The filter silently never fires.

- [ ] **Step 1: Fix both bugs in RawgClient.cs**

In `apps/api/Infrastructure/Clients/RawgClient.cs`, update `GetGames`:

```csharp
public async Task<RawgResponse> GetGames(
    string q, int page, List<int>? genres, bool? exclude_additions, List<string>? tags)
{
    var key = _config["Rawg:ApiKey"];
    if (string.IsNullOrEmpty(key))
        throw new InvalidOperationException("RAWG API key missing");

    var qs = HttpUtility.ParseQueryString(string.Empty);

    qs["key"] = key;
    qs["page"] = page.ToString();
    qs["page_size"] = PageSize.ToString();

    if (!string.IsNullOrWhiteSpace(q))
        qs["search"] = q;

    if (tags?.Any() == true)
        qs["tags"] = string.Join(",", tags);

    if (genres?.Any() == true)
        qs["genres"] = string.Join(",", genres);

    if (exclude_additions == true)
        qs["exclude_additions"] = "true";

    var url = $"https://api.rawg.io/api/games?{qs}";

    return await _http.GetFromJsonAsync<RawgResponse>(url) ?? new RawgResponse();
}
```

- [ ] **Step 2: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 3: Commit**

```
git add apps/api/Infrastructure/Clients/RawgClient.cs
git commit -m "fix: add null guard on RAWG API key in GetGames; fix exclude_additions serialization to lowercase"
```

---

## Phase 6 — Cleanup

### Task 13: Add Characters navigation property to UserGame

**Files:**
- Modify: `apps/api/Models/UserGame.cs`
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`

`UserGame` has no `Characters` collection nav property. Any query needing characters for a user-game must do a secondary DB round-trip (`Characters.Where(c => c.UserGameId == ug.Id)`) instead of `.Include(ug => ug.Characters)`.

- [ ] **Step 1: Add the navigation property to UserGame.cs**

In `apps/api/Models/UserGame.cs`:

```csharp
namespace PartyUp.Api.Models;

public class UserGame
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public Guid GameId { get; set; }

    public DateTime CreatedAt { get; set; }

    public Game Game { get; set; } = null!;
    public List<Character> Characters { get; set; } = [];
}
```

- [ ] **Step 2: Verify DbContext — no migration needed**

This is a navigation property only (the FK already exists on `Character`). EF Core does not require a migration for adding a nav property to the principal end. Confirm by running:

```
dotnet ef migrations add CheckCharactersNavProp --project apps/api
```

If the migration is empty, drop it:

```
dotnet ef migrations remove --project apps/api
```

- [ ] **Step 3: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 4: Commit**

```
git add apps/api/Models/UserGame.cs
git commit -m "refactor: add Characters nav property to UserGame to enable Include-based loading"
```

---

### Task 14: Move InteractionType enum to Models/Enums/

**Files:**
- Create: `apps/api/Models/Enums/InteractionType.cs`
- Modify: `apps/api/Models/CharacterInteraction.cs`

`InteractionType` is defined inline at the bottom of `CharacterInteraction.cs`. Every other enum lives in `Models/Enums/`. This breaks discoverability.

- [ ] **Step 1: Create the enum file**

Create `apps/api/Models/Enums/InteractionType.cs`:

```csharp
namespace PartyUp.Api.Models.Enums;

public enum InteractionType
{
    Like = 1,
    Dislike = 2
}
```

- [ ] **Step 2: Remove the enum from CharacterInteraction.cs and update the using**

In `apps/api/Models/CharacterInteraction.cs`:

```csharp
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Models;

public class CharacterInteraction
{
    public Guid Id { get; set; }

    public Guid FromCharacterId { get; set; }
    public Character FromCharacter { get; set; }

    public Guid ToCharacterId { get; set; }
    public Character ToCharacter { get; set; }

    public InteractionType Type { get; set; }

    public DateTime CreatedAt { get; set; }
}
```

- [ ] **Step 3: Find any other files that reference InteractionType without the Enums namespace**

```
grep -rn "InteractionType" apps/api/
```

For any file using `InteractionType` that doesn't already have `using PartyUp.Api.Models.Enums;`, add the using.

- [ ] **Step 4: Build to confirm no compile errors**

```
dotnet build apps/api
```

Expected: build succeeds.

- [ ] **Step 5: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 6: Commit**

```
git add apps/api/Models/Enums/InteractionType.cs apps/api/Models/CharacterInteraction.cs
git commit -m "refactor: move InteractionType enum to Models/Enums/ for consistency"
```

---

### Task 15: Make AnthropicService model ID configurable

**Files:**
- Modify: `apps/api/Services/AnthropicService.cs`

The Anthropic model `"claude-haiku-4-5-20251001"` is hardcoded on line 73. When this model is deprecated, the only fix is a code change and redeployment — no operator can rotate it via config.

- [ ] **Step 1: Read model ID from config with a fallback**

In `apps/api/Services/AnthropicService.cs`, add a `_model` field and update the constructor:

```csharp
private readonly HttpClient _http;
private readonly string _apiKey;
private readonly string _model;
private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

public AnthropicService(IHttpClientFactory httpClientFactory, IConfiguration config)
{
    _http = httpClientFactory.CreateClient("anthropic");
    _apiKey = config["Anthropic:ApiKey"]
        ?? throw new InvalidOperationException("Anthropic:ApiKey is not configured.");
    _model = config["Anthropic:Model"] ?? "claude-haiku-4-5-20251001";
}
```

Then in `GenerateFieldDefinitionsAsync`, replace the hardcoded string:

```csharp
var body = new
{
    model = _model,
    max_tokens = 4096,
    system = systemPrompt,
    messages = new[] { new { role = "user", content = userPrompt } }
};
```

- [ ] **Step 2: Run all tests**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all pass.

- [ ] **Step 3: Commit**

```
git add apps/api/Services/AnthropicService.cs
git commit -m "refactor: read Anthropic model ID from config with hardcoded fallback"
```

---

## Self-Review

### Spec coverage

| Issue from review | Task |
|---|---|
| No global exception handler | Task 1 |
| FirstAsync → 500 for bad ToCharacterId | Task 2 |
| Null-forgiving Guid.Parse across controllers | Task 3 |
| Missing FK indexes (CharacterInteraction, CharacterMatch, CharacterFieldValue) | Task 4 |
| GcsStorageService Scoped lifetime | Task 5 |
| IConfiguration as method parameter in AuthService | Task 6 |
| Entity returned from service, DTO mapping in controller | Task 7 |
| DbContext in GamesController (RegenerateSchema catch block) | Task 8 |
| Unauthenticated GET /api/games/popular | Task 9 |
| CORS empty origins silent failure | Task 10 |
| Character.CreatedAt C# initializer instead of DB default | Task 11 |
| RawgClient null guard + exclude_additions "True"→"true" | Task 12 |
| UserGame missing Characters nav property | Task 13 |
| InteractionType enum in wrong file | Task 14 |
| AnthropicService hardcoded model ID | Task 15 |

All 15 issues have corresponding tasks. ✓

### Placeholder scan

No TBD, TODO, or vague steps present. ✓

### Type consistency

- `UserGameResponse` and `UserGameDetailResponse` are used in Tasks 7 — these DTOs already exist in `Models/DTOs/UserGame/`.
- `this.GetUserId()` extension is defined in Task 3 and used in Tasks 6, 7, 9.
- `InteractionType` namespace change in Task 14 is propagated with a grep step. ✓
