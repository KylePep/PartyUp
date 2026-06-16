# Admin System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin role to PartyUp, lock schema regeneration to admins, and build an `/admin` panel where an admin can view all game schema statuses and trigger regeneration.

**Architecture:** `IsAdmin` flag on `User` model baked into a JWT role claim at login; new `AdminController` at `api/admin` gated by `[Authorize(Roles = "Admin")]`; React `/admin` route nested inside `SignedInLayout` behind an `AdminRoute` guard that checks `state.user.isAdmin`.

**Tech Stack:** ASP.NET Core 8, EF Core + Npgsql, xUnit + WebApplicationFactory (integration tests, real DB), React + TypeScript + Vite, react-router-dom

**Branch:** `feature/admin-system`

---

## File Map

**Create:**
- `apps/api/Models/DTOs/Admin/AdminGameResponse.cs` — admin game list DTO
- `apps/api/Controllers/AdminController.cs` — admin-only endpoints
- `apps/tests/PartyUp.Api.Tests/Features/Admin/AdminSecurityTests.cs` — 401/403 auth tests
- `apps/tests/PartyUp.Api.Tests/Features/Admin/AdminGamesTests.cs` — game list + regenerate tests
- `apps/web/src/api/endpoints/admin.ts` — frontend admin API functions
- `apps/web/src/components/layout/AdminRoute.tsx` — admin route guard
- `apps/web/src/pages/AdminPage.tsx` — admin panel UI

**Modify:**
- `apps/api/Models/User.cs` — add `IsAdmin bool`
- `apps/api/Services/AuthService.cs` — add role claim to JWT when `IsAdmin`
- `apps/api/Controllers/AuthController.cs` — add `isAdmin` to `/me` response
- `apps/api/Controllers/GamesController.cs` — remove `RegenerateSchema` endpoint
- `apps/tests/PartyUp.Api.Tests/Infrastructure/TestBase.cs` — add `CreateAdminClientAsync`
- `apps/web/src/api/endpoints/auth.ts` — add `isAdmin` to `CurrentUser`
- `apps/web/src/api/endpoints/games.ts` — remove `regenerateSchema` function
- `apps/web/src/App.tsx` — add `/admin` route nested in `SignedInLayout`
- `apps/web/src/pages/SettingsPage.tsx` — add conditional Admin Panel button

**Migration (generated):**
- `apps/api/Migrations/<timestamp>_AddIsAdminToUser.cs` — `is_admin` column, default false

---

## Task 1: Add IsAdmin to User model and generate migration

**Files:**
- Modify: `apps/api/Models/User.cs`

- [ ] **Step 1: Add `IsAdmin` property to `User`**

  Replace the entire file content:
  ```csharp
  namespace PartyUp.Api.Models;

  public class User
  {
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
  }
  ```

- [ ] **Step 2: Generate the EF migration**

  ```
  dotnet ef migrations add AddIsAdminToUser --project apps/api
  ```

  Expected: new file created at `apps/api/Migrations/<timestamp>_AddIsAdminToUser.cs`. Open it and verify it contains `migrationBuilder.AddColumn<bool>("is_admin", ...)` with `defaultValue: false`.

- [ ] **Step 3: Apply the migration to the dev database**

  ```
  dotnet ef database update --project apps/api
  ```

  Expected: `Done.`

- [ ] **Step 4: Verify the project still builds**

  ```
  dotnet build apps/api/PartyUp.Api.csproj
  ```

  Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

  ```
  git add apps/api/Models/User.cs apps/api/Migrations/
  git commit -m "feat: add IsAdmin to User model with EF migration"
  ```

---

## Task 2: Add admin helper to TestBase

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Infrastructure/TestBase.cs`

- [ ] **Step 1: Add `CreateAdminClientAsync` to `TestBase`**

  Replace the entire file:
  ```csharp
  using System.Net.Http.Headers;
  using System.Net.Http.Json;
  using Microsoft.EntityFrameworkCore;
  using Microsoft.Extensions.DependencyInjection;
  using PartyUp.Api.Infrastructure.Data;
  using PartyUp.Api.Tests.Factories;

  namespace PartyUp.Api.Tests.Infrastructure;

  public abstract class TestBase : IAsyncLifetime
  {
      protected readonly ApiFactory Factory;
      protected readonly HttpClient Client;

      protected TestBase(ApiFactory factory)
      {
          Factory = factory;
          Client = factory.CreateClient();
      }

      public async Task InitializeAsync() => await DatabaseReset.ResetAsync();

      public Task DisposeAsync() => Task.CompletedTask;

      protected async Task<HttpClient> CreateAuthenticatedClientAsync(
          string? email = null,
          string password = "Password123!")
      {
          email ??= $"user_{Guid.NewGuid():N}@test.com";

          var client = Factory.CreateClient();
          var response = await client.PostAsJsonAsync("/api/auth/register", new
          {
              email,
              password
          });
          response.EnsureSuccessStatusCode();

          var auth = await response.Content.ReadFromJsonAsync<AuthResult>();
          client.DefaultRequestHeaders.Authorization =
              new AuthenticationHeaderValue("Bearer", auth!.Token);

          return client;
      }

      protected async Task<HttpClient> CreateAdminClientAsync(
          string? email = null,
          string password = "Password123!")
      {
          email ??= $"admin_{Guid.NewGuid():N}@test.com";

          await Client.PostAsJsonAsync("/api/auth/register", new { email, password });

          using (var scope = Factory.Services.CreateScope())
          {
              var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
              var user = await db.Users.FirstAsync(u => u.Email == email);
              user.IsAdmin = true;
              await db.SaveChangesAsync();
          }

          var client = Factory.CreateClient();
          var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
          loginResponse.EnsureSuccessStatusCode();
          var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResult>();
          client.DefaultRequestHeaders.Authorization =
              new AuthenticationHeaderValue("Bearer", auth!.Token);

          return client;
      }

      private record AuthResult(string Token, string Email);
  }
  ```

- [ ] **Step 2: Build tests to verify the change compiles**

  ```
  dotnet build apps/tests/PartyUp.Api.Tests
  ```

  Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

  ```
  git add apps/tests/PartyUp.Api.Tests/Infrastructure/TestBase.cs
  git commit -m "test: add CreateAdminClientAsync helper to TestBase"
  ```

---

## Task 3: JWT role claim + isAdmin in /me response

**Files:**
- Modify: `apps/api/Services/AuthService.cs`
- Modify: `apps/api/Controllers/AuthController.cs`

- [ ] **Step 1: Write failing tests for isAdmin in /me response**

  Create `apps/tests/PartyUp.Api.Tests/Features/Auth/MeAdminTests.cs`:
  ```csharp
  using System.Net;
  using System.Net.Http.Json;
  using FluentAssertions;
  using PartyUp.Api.Tests.Factories;
  using PartyUp.Api.Tests.Infrastructure;

  namespace PartyUp.Api.Tests.Features.Auth;

  public class MeAdminTests : TestBase, IClassFixture<ApiFactory>
  {
      public MeAdminTests(ApiFactory factory) : base(factory) { }

      [Fact]
      public async Task Me_RegularUser_ReturnsIsAdminFalse()
      {
          var client = await CreateAuthenticatedClientAsync();
          var response = await client.GetAsync("/api/auth/me");

          response.StatusCode.Should().Be(HttpStatusCode.OK);
          var body = await response.Content.ReadFromJsonAsync<MeResponse>();
          body!.IsAdmin.Should().BeFalse();
      }

      [Fact]
      public async Task Me_AdminUser_ReturnsIsAdminTrue()
      {
          var client = await CreateAdminClientAsync();
          var response = await client.GetAsync("/api/auth/me");

          response.StatusCode.Should().Be(HttpStatusCode.OK);
          var body = await response.Content.ReadFromJsonAsync<MeResponse>();
          body!.IsAdmin.Should().BeTrue();
      }

      private record MeResponse(Guid Id, string Email, bool IsAdmin);
  }
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~MeAdminTests"
  ```

  Expected: FAIL — `IsAdmin` is not in the response yet.

- [ ] **Step 3: Update `AuthService.GenerateJwt` to include role claim**

  In `apps/api/Services/AuthService.cs`, replace the `GenerateJwt` method:
  ```csharp
  private string GenerateJwt(User user)
  {
      var key = new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)
      );

      var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

      var claims = new List<Claim>
      {
          new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
          new Claim(ClaimTypes.Name, user.Email)
      };

      if (user.IsAdmin)
          claims.Add(new Claim(ClaimTypes.Role, "Admin"));

      var token = new JwtSecurityToken(
        issuer: _config["Jwt:Issuer"],
        audience: _config["Jwt:Audience"],
        claims: claims,
        expires: DateTime.UtcNow.AddHours(2),
        signingCredentials: creds
      );

      return new JwtSecurityTokenHandler().WriteToken(token);
  }
  ```

- [ ] **Step 4: Update `AuthController.Me` to include `isAdmin`**

  In `apps/api/Controllers/AuthController.cs`, update the `Me` action:
  ```csharp
  [Authorize]
  [HttpGet("me")]
  public async Task<IActionResult> Me()
  {
      if (this.GetUserId() is not Guid userId) return Unauthorized();
      var user = await _auth.GetByIdAsync(userId);
      if (user == null) return Unauthorized();

      var profile = await _profileService.GetProfileAsync(userId);
      return Ok(new { id = user.Id, email = user.Email, isAdmin = user.IsAdmin, profile });
  }
  ```

- [ ] **Step 5: Run tests to confirm they pass**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~MeAdminTests"
  ```

  Expected: PASS — both tests green.

- [ ] **Step 6: Run full test suite to check for regressions**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All tests pass.

- [ ] **Step 7: Commit**

  ```
  git add apps/api/Services/AuthService.cs apps/api/Controllers/AuthController.cs apps/tests/PartyUp.Api.Tests/Features/Auth/MeAdminTests.cs
  git commit -m "feat: add Admin role claim to JWT and isAdmin to /me response"
  ```

---

## Task 4: AdminGameResponse DTO + AdminController GET /api/admin/games

**Files:**
- Create: `apps/api/Models/DTOs/Admin/AdminGameResponse.cs`
- Create: `apps/api/Controllers/AdminController.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Features/Admin/AdminSecurityTests.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Features/Admin/AdminGamesTests.cs`

- [ ] **Step 1: Create the DTO**

  Create `apps/api/Models/DTOs/Admin/AdminGameResponse.cs`:
  ```csharp
  namespace PartyUp.Api.Models.DTOs.Admin;

  public class AdminGameResponse
  {
      public Guid Id { get; set; }
      public string Name { get; set; } = string.Empty;
      public string? ImageUrl { get; set; }
      public string SchemaStatus { get; set; } = string.Empty;
      public int FieldDefinitionCount { get; set; }
  }
  ```

- [ ] **Step 2: Write failing security tests**

  Create `apps/tests/PartyUp.Api.Tests/Features/Admin/AdminSecurityTests.cs`:
  ```csharp
  using System.Net;
  using FluentAssertions;
  using PartyUp.Api.Tests.Factories;
  using PartyUp.Api.Tests.Infrastructure;

  namespace PartyUp.Api.Tests.Features.Admin;

  public class AdminSecurityTests : TestBase, IClassFixture<ApiFactory>
  {
      public AdminSecurityTests(ApiFactory factory) : base(factory) { }

      [Fact]
      public async Task GetGames_WithoutAuth_Returns401()
      {
          var response = await Client.GetAsync("/api/admin/games");
          response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
      }

      [Fact]
      public async Task GetGames_AsRegularUser_Returns403()
      {
          var client = await CreateAuthenticatedClientAsync();
          var response = await client.GetAsync("/api/admin/games");
          response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
      }

      [Fact]
      public async Task RegenerateSchema_WithoutAuth_Returns401()
      {
          var response = await Client.PostAsync($"/api/admin/games/{Guid.NewGuid()}/regenerate-schema", null);
          response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
      }

      [Fact]
      public async Task RegenerateSchema_AsRegularUser_Returns403()
      {
          var client = await CreateAuthenticatedClientAsync();
          var response = await client.PostAsync($"/api/admin/games/{Guid.NewGuid()}/regenerate-schema", null);
          response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
      }
  }
  ```

- [ ] **Step 3: Write failing games list test**

  Create `apps/tests/PartyUp.Api.Tests/Features/Admin/AdminGamesTests.cs`:
  ```csharp
  using System.Net;
  using System.Net.Http.Json;
  using FluentAssertions;
  using Microsoft.Extensions.DependencyInjection;
  using PartyUp.Api.Infrastructure.Data;
  using PartyUp.Api.Models;
  using PartyUp.Api.Models.Enums;
  using PartyUp.Api.Tests.Factories;
  using PartyUp.Api.Tests.Infrastructure;

  namespace PartyUp.Api.Tests.Features.Admin;

  public class AdminGamesTests : TestBase, IClassFixture<ApiFactory>
  {
      public AdminGamesTests(ApiFactory factory) : base(factory) { }

      [Fact]
      public async Task GetGames_AsAdmin_ReturnsAllGames()
      {
          var game = new Game
          {
              Id = Guid.NewGuid(),
              ExternalId = 88001,
              Name = "Test Game",
              ImageUrl = "https://example.com/img.jpg",
              SchemaStatus = SchemaStatus.Failed
          };

          using (var scope = Factory.Services.CreateScope())
          {
              var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
              db.Games.Add(game);
              await db.SaveChangesAsync();
          }

          var client = await CreateAdminClientAsync();
          var response = await client.GetAsync("/api/admin/games");

          response.StatusCode.Should().Be(HttpStatusCode.OK);
          var body = await response.Content.ReadFromJsonAsync<List<AdminGameDto>>();
          body.Should().NotBeNull();
          var entry = body!.First(g => g.Id == game.Id);
          entry.Name.Should().Be("Test Game");
          entry.SchemaStatus.Should().Be("Failed");
          entry.FieldDefinitionCount.Should().Be(0);
      }

      [Fact]
      public async Task GetGames_AsAdmin_ReturnsFieldDefinitionCount()
      {
          var game = new Game
          {
              Id = Guid.NewGuid(),
              ExternalId = 88002,
              Name = "Game With Fields",
              SchemaStatus = SchemaStatus.Generated
          };
          var field = new GameFieldDefinition
          {
              Id = Guid.NewGuid(),
              GameId = game.Id,
              Key = "role",
              Label = "Role",
              Type = FieldType.Select,
              Options = ["Tank", "Healer", "DPS"],
              IsFilterable = true,
              IsRequired = true,
              SortOrder = 1
          };

          using (var scope = Factory.Services.CreateScope())
          {
              var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
              db.Games.Add(game);
              db.GameFieldDefinitions.Add(field);
              await db.SaveChangesAsync();
          }

          var client = await CreateAdminClientAsync();
          var response = await client.GetAsync("/api/admin/games");

          response.StatusCode.Should().Be(HttpStatusCode.OK);
          var body = await response.Content.ReadFromJsonAsync<List<AdminGameDto>>();
          var entry = body!.First(g => g.Id == game.Id);
          entry.FieldDefinitionCount.Should().Be(1);
      }

      private record AdminGameDto(Guid Id, string Name, string? ImageUrl, string SchemaStatus, int FieldDefinitionCount);
  }
  ```

- [ ] **Step 4: Run tests to confirm they fail**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AdminSecurityTests|FullyQualifiedName~AdminGamesTests"
  ```

  Expected: FAIL — `/api/admin/games` returns 404.

- [ ] **Step 5: Create `AdminController` with GET /api/admin/games**

  Create `apps/api/Controllers/AdminController.cs`:
  ```csharp
  using Microsoft.AspNetCore.Authorization;
  using Microsoft.AspNetCore.Mvc;
  using Microsoft.EntityFrameworkCore;
  using PartyUp.Api.Infrastructure.Data;
  using PartyUp.Api.Models.DTOs.Admin;
  using PartyUp.Api.Services.Interfaces;

  [ApiController]
  [Route("api/admin")]
  [Authorize(Roles = "Admin")]
  public class AdminController : ControllerBase
  {
      private readonly AppDbContext _db;

      public AdminController(AppDbContext db)
      {
          _db = db;
      }

      [HttpGet("games")]
      public async Task<IActionResult> GetGames()
      {
          var games = await _db.Games
              .OrderBy(g => g.Name)
              .Select(g => new AdminGameResponse
              {
                  Id = g.Id,
                  Name = g.Name,
                  ImageUrl = g.ImageUrl,
                  SchemaStatus = g.SchemaStatus.ToString(),
                  FieldDefinitionCount = g.FieldDefinitions.Count
              })
              .ToListAsync();

          return Ok(games);
      }
  }
  ```

- [ ] **Step 6: Run the tests to confirm they pass**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AdminSecurityTests|FullyQualifiedName~AdminGamesTests"
  ```

  Expected: PASS — all security and games list tests green.

- [ ] **Step 7: Commit**

  ```
  git add apps/api/Models/DTOs/Admin/ apps/api/Controllers/AdminController.cs apps/tests/PartyUp.Api.Tests/Features/Admin/
  git commit -m "feat: add AdminController with GET /api/admin/games"
  ```

---

## Task 5: AdminController POST /api/admin/games/{id}/regenerate-schema

**Files:**
- Modify: `apps/api/Controllers/AdminController.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Admin/AdminGamesTests.cs`

- [ ] **Step 1: Write failing regenerate tests**

  Add these two tests to `AdminGamesTests.cs` (inside the class, before the closing brace):
  ```csharp
  [Fact]
  public async Task RegenerateSchema_AsAdmin_Returns202()
  {
      var game = new Game
      {
          Id = Guid.NewGuid(),
          ExternalId = 88003,
          Name = "Failed Game",
          SchemaStatus = SchemaStatus.Failed
      };

      using (var scope = Factory.Services.CreateScope())
      {
          var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
          db.Games.Add(game);
          await db.SaveChangesAsync();
      }

      var client = await CreateAdminClientAsync();
      var response = await client.PostAsync($"/api/admin/games/{game.Id}/regenerate-schema", null);

      response.StatusCode.Should().Be(HttpStatusCode.Accepted);
  }

  [Fact]
  public async Task RegenerateSchema_AsAdmin_Returns404_WhenGameNotFound()
  {
      var client = await CreateAdminClientAsync();
      var response = await client.PostAsync($"/api/admin/games/{Guid.NewGuid()}/regenerate-schema", null);

      response.StatusCode.Should().Be(HttpStatusCode.NotFound);
  }
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AdminGamesTests"
  ```

  Expected: FAIL — the two new tests 404 (endpoint not implemented yet).

- [ ] **Step 3: Add regenerate endpoint to `AdminController`**

  Add this method to `AdminController.cs` (after `GetGames`):
  ```csharp
  [HttpPost("games/{id:guid}/regenerate-schema")]
  public async Task<IActionResult> RegenerateSchema(Guid id, [FromServices] IServiceScopeFactory scopeFactory)
  {
      var game = await _db.Games.FindAsync(id);
      if (game == null)
          return NotFound();

      _ = Task.Run(async () =>
      {
          await using var scope = scopeFactory.CreateAsyncScope();
          try
          {
              var generator = scope.ServiceProvider.GetRequiredService<IGameSchemaGenerationService>();
              await generator.GenerateForGameAsync(id, force: true);
          }
          catch (Exception ex)
          {
              var logger = scope.ServiceProvider.GetRequiredService<ILogger<AdminController>>();
              logger.LogError(ex, "Admin schema generation failed for game {GameId}", id);
          }
      });

      return Accepted();
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AdminGamesTests"
  ```

  Expected: PASS — all tests green.

- [ ] **Step 5: Run full test suite**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All tests pass.

- [ ] **Step 6: Commit**

  ```
  git add apps/api/Controllers/AdminController.cs apps/tests/PartyUp.Api.Tests/Features/Admin/AdminGamesTests.cs
  git commit -m "feat: add POST /api/admin/games/{id}/regenerate-schema"
  ```

---

## Task 6: Remove RegenerateSchema from GamesController

**Files:**
- Modify: `apps/api/Controllers/GamesController.cs`

- [ ] **Step 1: Remove the `RegenerateSchema` action from `GamesController`**

  Delete lines 109–134 of `apps/api/Controllers/GamesController.cs` (the entire `RegenerateSchema` method, including its attributes):
  ```csharp
  // DELETE this entire block:
  [EnableRateLimiting("ai-schema")]
  [Authorize]
  [HttpPost("{id:guid}/regenerate-schema")]
  public async Task<IActionResult> RegenerateSchema(Guid id, [FromServices] IServiceScopeFactory scopeFactory)
  {
      ...
  }
  ```

  After removal, the `IGameSchemaGenerationService` import in `GamesController` is no longer needed. Remove it from the constructor and class body. Also remove `IGameSchemaGenerationService` from the using statements if no longer needed. The final constructor signature should be:
  ```csharp
  public GamesController(IGameService service, IGameFieldDefinitionService fieldDefinitionService, ILogger<GamesController> logger)
  {
      _service = service;
      _fieldDefinitionService = fieldDefinitionService;
      _logger = logger;
  }
  ```

- [ ] **Step 2: Build to confirm no compilation errors**

  ```
  dotnet build apps/api/PartyUp.Api.csproj
  ```

  Expected: `Build succeeded.`

- [ ] **Step 3: Run the full test suite**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All tests pass.

- [ ] **Step 4: Commit**

  ```
  git add apps/api/Controllers/GamesController.cs
  git commit -m "feat: remove user-facing regenerate-schema endpoint (moved to admin)"
  ```

---

## Task 7: Frontend — CurrentUser isAdmin + admin.ts endpoints

**Files:**
- Modify: `apps/web/src/api/endpoints/auth.ts`
- Modify: `apps/web/src/api/endpoints/games.ts`
- Create: `apps/web/src/api/endpoints/admin.ts`

- [ ] **Step 1: Find all usages of `regenerateSchema` from `games.ts`**

  Search across the frontend:
  ```
  grep -r "regenerateSchema" apps/web/src --include="*.ts" --include="*.tsx"
  ```

  Note every file that imports or calls `regenerateSchema`. These will need to be updated to use `adminRegenerateSchema` from `admin.ts` instead (or removed if the call site is being replaced by the admin panel).

- [ ] **Step 2: Add `isAdmin` to `CurrentUser` in `auth.ts`**

  In `apps/web/src/api/endpoints/auth.ts`, update the `CurrentUser` type:
  ```ts
  export type CurrentUser = {
    id: string;
    email: string;
    isAdmin: boolean;
    profile: UserProfileData;
  };
  ```

- [ ] **Step 3: Remove `regenerateSchema` from `games.ts`**

  In `apps/web/src/api/endpoints/games.ts`, delete these lines:
  ```ts
  export function regenerateSchema(gameId: string): Promise<void> {
    return apiPostEmpty(`/games/${gameId}/regenerate-schema`);
  }
  ```

  Also remove the `apiPostEmpty` import if it's no longer used elsewhere in that file.

- [ ] **Step 4: Create `admin.ts`**

  Create `apps/web/src/api/endpoints/admin.ts`:
  ```ts
  import { apiGet, apiPostEmpty } from "../client";

  export type AdminGame = {
    id: string;
    name: string;
    imageUrl: string | null;
    schemaStatus: "Pending" | "Generating" | "Generated" | "Failed";
    fieldDefinitionCount: number;
  };

  export function getAdminGames(): Promise<AdminGame[]> {
    return apiGet<AdminGame[]>("/admin/games");
  }

  export function adminRegenerateSchema(gameId: string): Promise<void> {
    return apiPostEmpty(`/admin/games/${gameId}/regenerate-schema`);
  }
  ```

- [ ] **Step 5: Fix any call sites found in Step 1**

  For each file that called `regenerateSchema` from `games.ts`, update the import and call to use `adminRegenerateSchema` from `admin.ts`. If that call site is a user-facing component that should no longer trigger regeneration, remove the call entirely.

- [ ] **Step 6: Build the frontend to confirm no TypeScript errors**

  ```
  npm run build --prefix apps/web
  ```

  Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

  ```
  git add apps/web/src/api/endpoints/auth.ts apps/web/src/api/endpoints/games.ts apps/web/src/api/endpoints/admin.ts
  git commit -m "feat: add isAdmin to CurrentUser, create admin API endpoints"
  ```

---

## Task 8: AdminRoute component

**Files:**
- Create: `apps/web/src/components/layout/AdminRoute.tsx`

- [ ] **Step 1: Create `AdminRoute.tsx`**

  Create `apps/web/src/components/layout/AdminRoute.tsx`:
  ```tsx
  import { Navigate, Outlet } from "react-router-dom";
  import { useAuth } from "../../context/AuthContext";
  import { Spinner } from "../ui";

  export default function AdminRoute() {
    const { state } = useAuth();

    if (state.status === "loading") {
      return (
        <div className="min-h-screen w-full flex items-center justify-center">
          <Spinner label="Loading..." />
        </div>
      );
    }

    if (state.status !== "authenticated" || !state.user.isAdmin) {
      return <Navigate to="/home" replace />;
    }

    return <Outlet />;
  }
  ```

- [ ] **Step 2: Build to confirm no TypeScript errors**

  ```
  npm run build --prefix apps/web
  ```

  Expected: Build succeeds.

- [ ] **Step 3: Commit**

  ```
  git add apps/web/src/components/layout/AdminRoute.tsx
  git commit -m "feat: add AdminRoute guard component"
  ```

---

## Task 9: AdminPage

**Files:**
- Create: `apps/web/src/pages/AdminPage.tsx`

- [ ] **Step 1: Create `AdminPage.tsx`**

  Create `apps/web/src/pages/AdminPage.tsx`:
  ```tsx
  import { useState, useEffect } from "react";
  import { getAdminGames, adminRegenerateSchema, type AdminGame } from "../api/endpoints/admin";

  const STATUS_STYLES: Record<string, string> = {
    Failed: "text-red-400 bg-red-900/30",
    Generating: "text-yellow-400 bg-yellow-900/30",
    Generated: "text-green-400 bg-green-900/30",
    Pending: "text-gray-400 bg-gray-800/50",
  };

  export default function AdminPage() {
    const [games, setGames] = useState<AdminGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState<Set<string>>(new Set());

    useEffect(() => {
      getAdminGames()
        .then(setGames)
        .finally(() => setLoading(false));
    }, []);

    async function handleRegenerate(gameId: string) {
      setRegenerating(prev => new Set(prev).add(gameId));
      try {
        await adminRegenerateSchema(gameId);
        setGames(prev =>
          prev.map(g => g.id === gameId ? { ...g, schemaStatus: "Generating" as const } : g)
        );
      } finally {
        setRegenerating(prev => {
          const next = new Set(prev);
          next.delete(gameId);
          return next;
        });
      }
    }

    if (loading) {
      return <div className="p-8 text-text">Loading…</div>;
    }

    return (
      <div className="p-8 w-full overflow-auto">
        <h1 className="text-xl font-semibold text-text mb-6">Admin — Game Schemas</h1>
        <table className="w-full text-sm text-text border-collapse">
          <thead>
            <tr className="border-b border-border text-muted text-left">
              <th className="pb-3 pr-6 font-medium">Game</th>
              <th className="pb-3 pr-6 font-medium">Schema Status</th>
              <th className="pb-3 pr-6 font-medium">Fields</th>
              <th className="pb-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {games.map(game => {
              const isRegenerating = game.schemaStatus === "Generating" || regenerating.has(game.id);
              return (
                <tr key={game.id} className="border-b border-border/50">
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-3">
                      {game.imageUrl && (
                        <img
                          src={game.imageUrl}
                          alt=""
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                      )}
                      <span>{game.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-6">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[game.schemaStatus] ?? ""}`}>
                      {game.schemaStatus}
                    </span>
                  </td>
                  <td className="py-3 pr-6 text-muted">{game.fieldDefinitionCount}</td>
                  <td className="py-3">
                    {game.schemaStatus !== "Generated" && (
                      <button
                        onClick={() => handleRegenerate(game.id)}
                        disabled={isRegenerating}
                        className="px-3 py-1 text-xs rounded bg-surface-raised text-text hover:bg-accent hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isRegenerating ? "Generating…" : "Regenerate"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  ```

- [ ] **Step 2: Build to confirm no TypeScript errors**

  ```
  npm run build --prefix apps/web
  ```

  Expected: Build succeeds.

- [ ] **Step 3: Commit**

  ```
  git add apps/web/src/pages/AdminPage.tsx
  git commit -m "feat: add AdminPage with game schema status table"
  ```

---

## Task 10: Wire up routing + Settings page button

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add `/admin` route to `App.tsx`**

  In `apps/web/src/App.tsx`, add the imports and nest the admin route inside `SignedInLayout`:
  ```tsx
  import { BrowserRouter, Routes, Route } from "react-router-dom";
  import { NotificationProvider } from "./context/NotificationContext";
  import { AuthProvider } from "./context/AuthContext";
  import SignedInLayout from "./components/layout/SignedInLayout";
  import AdminRoute from "./components/layout/AdminRoute";
  import LandingPage from "./pages/LandingPage";
  import HomePage from "./pages/HomePage";
  import RealmPage from "./pages/RealmPage";
  import "./App.css";
  import CharactersPage from "./pages/CharacterPage";
  import MatchesPage from "./pages/MatchesPage";
  import GamesPage from "./pages/GamesPage";
  import SettingsPage from "./pages/SettingsPage";
  import NotFoundPage from "./pages/NotFoundPage";
  import AdminPage from "./pages/AdminPage";

  export default function App() {
    return (
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route element={<SignedInLayout />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/realm/:gameId" element={<RealmPage />} />
                <Route path="/characters" element={<CharactersPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/games" element={<GamesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    );
  }
  ```

- [ ] **Step 2: Add Admin Panel button to `SettingsPage.tsx`**

  In `apps/web/src/pages/SettingsPage.tsx`, add `useNavigate` to the imports:
  ```tsx
  import { useState, useEffect } from "react";
  import { useNavigate } from "react-router-dom";
  ```

  Then add this section at the bottom of `leftContent`, after the Security `</section>` closing tag and before the `</div>`:
  ```tsx
  {state.status === "authenticated" && state.user.isAdmin && (
    <section>
      <h2 className="text-lg font-semibold text-text mb-4">Admin</h2>
      <Button variant="secondary" onClick={() => navigate("/admin")}>
        Admin Panel
      </Button>
    </section>
  )}
  ```

  Add `const navigate = useNavigate();` after the `useProfile` line near the top of the component:
  ```tsx
  const { state } = useAuth();
  const navigate = useNavigate();
  const { profile, isLoading, updateProfile, updatePreferences } = useProfile();
  ```

- [ ] **Step 3: Build the frontend**

  ```
  npm run build --prefix apps/web
  ```

  Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Run all backend tests one final time**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All tests pass.

- [ ] **Step 5: Commit**

  ```
  git add apps/web/src/App.tsx apps/web/src/pages/SettingsPage.tsx
  git commit -m "feat: wire /admin route and add admin panel link in settings"
  ```

---

## Done

At this point:
- Any user with `is_admin = true` in the database can log in normally and see an **Admin Panel** button in Settings
- Navigating to `/admin` shows a table of all games with schema status badges and Regenerate buttons
- Regeneration is admin-only — regular users who previously could call the endpoint can no longer do so
- All new behavior is covered by integration tests
