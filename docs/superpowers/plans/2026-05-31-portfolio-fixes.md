# Portfolio Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five portfolio-quality gaps: DTO validation, Swagger availability, frontend hook error states, Docker best practices, and discovery pagination.

**Architecture:** Backend fixes are isolated to DTOs, one service, and one controller. Frontend fixes are isolated to hooks and one API function. Dockerfile is a drop-in replacement. No DB migrations required.

**Tech Stack:** ASP.NET Core 8, EF Core, xUnit + FluentAssertions, React 19 + TypeScript, Tailwind CSS

---

## File Map

**Modified (backend):**
- `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs` — add validation attributes
- `apps/api/Models/DTOs/UserGame/AddUserGameRequest.cs` — add validation attributes
- `apps/api/Models/DTOs/Character/CharacterFieldValueRequest.cs` — add validation attributes
- `apps/api/Program.cs` — enable Swagger in all environments
- `apps/api/Services/Interfaces/ICharacterService.cs` — add page/pageSize to Discover signature
- `apps/api/Services/CharacterService.cs` — implement pagination
- `apps/api/Controllers/CharactersController.cs` — add page/pageSize query params
- `apps/api/Dockerfile` — add curl, non-root user, HEALTHCHECK

**Created (backend):**
- `apps/api/Models/DTOs/Character/PagedDiscoverResult.cs` — pagination response DTO

**Modified (frontend):**
- `apps/web/src/hooks/useCharacters.ts` — add error state
- `apps/web/src/hooks/useMatches.ts` — add error state
- `apps/web/src/hooks/useProfile.ts` — add error state for initial load
- `apps/web/src/hooks/useFieldDefinitions.ts` — add error state to return value
- `apps/web/src/api/endpoints/characters.ts` — update discoverCharacters signature and add PagedDiscoverResult type
- `apps/web/src/components/DiscoveryPanel.tsx` — consume paged results, load next page when queue runs low

**Test files (modified):**
- `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterUpdateDeleteTests.cs` — add validation test
- `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs` — add validation test
- `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs` — add pagination test

---

## Task 0: Create Feature Branch

- [ ] **Step 1: Check current branch**

```bash
git rev-parse --abbrev-ref HEAD
```

- [ ] **Step 2: Create and switch to feature branch**

```bash
git checkout -b feature/portfolio-fixes
```

---

## Task 1: Add Validation to UpdateCharacterRequest

**Files:** Modify `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs`

- [ ] **Step 1: Read the failing test to understand the expected behavior**

No existing test covers this. Identify the test file to add to: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterUpdateDeleteTests.cs` — read it now to understand helper patterns used in that file.

- [ ] **Step 2: Write the failing test in CharacterUpdateDeleteTests.cs**

Find the bottom of the test class (before the closing `}`) and add:

```csharp
[Fact]
public async Task UpdateCharacter_WithEmptyName_ReturnsBadRequest()
{
    var client = await CreateAuthenticatedClientAsync();
    var userGame = await AddGameAsync(client);

    var createRes = await client.PostAsJsonAsync("/api/characters", new
    {
        name = "Original",
        platform = "PC",
        platformHandle = "Handle",
        userGameId = userGame.Id
    });
    createRes.EnsureSuccessStatusCode();
    var character = await createRes.Content.ReadFromJsonAsync<CharDto>();

    var response = await client.PutAsJsonAsync(
        $"/api/characters/{userGame.Id}/{character!.Id}",
        new { name = "" });

    response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
}
```

If `CharDto` or `AddGameAsync` is not already defined in that file, add these private helpers at the bottom of the class (inside the class, after the last test):

```csharp
private static int _gameCounter = 90_000;

private async Task<UserGameDto> AddGameAsync(HttpClient client)
{
    var id = Interlocked.Increment(ref _gameCounter);
    var res = await client.PostAsJsonAsync("/api/user-games", new
    {
        externalId = id,
        name = $"Game {id}",
        imageUrl = (string?)null
    });
    res.EnsureSuccessStatusCode();
    return (await res.Content.ReadFromJsonAsync<AddGameResultDto>())!.UserGame;
}

private record UserGameDto(Guid Id, Guid UserId, Guid GameId, string GameName);
private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
private record CharDto(Guid Id, string Name, Guid UserGameId);
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "UpdateCharacter_WithEmptyName_ReturnsBadRequest" -v minimal
```

Expected: FAIL (the update succeeds with a 204 because there's currently no validation).

- [ ] **Step 4: Replace UpdateCharacterRequest.cs with validated version**

Overwrite `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Character;

public class UpdateCharacterRequest
{
  [StringLength(100)]
  public string? Platform { get; set; }

  [StringLength(100)]
  public string? PlatformHandle { get; set; }

  [Required]
  [StringLength(100, MinimumLength = 1)]
  public string Name { get; set; } = string.Empty;

  [StringLength(500)]
  public string? ImageUrl { get; set; }

  [StringLength(500)]
  public string? Bio { get; set; }

  [StringLength(100)]
  public string? TimeZone { get; set; }

  public string[]? ActiveTimes { get; set; }

  public bool? UsesVoiceChat { get; set; }

  public string[]? Languages { get; set; }

  [StringLength(1000)]
  public string? AdditionalNotes { get; set; }

  public List<CharacterFieldValueRequest>? GameFields { get; set; }
}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "UpdateCharacter_WithEmptyName_ReturnsBadRequest" -v minimal
```

Expected: PASS

- [ ] **Step 6: Run the full test suite to confirm no regressions**

```bash
dotnet test apps/tests/PartyUp.Api.Tests -v minimal
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs
git add apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterUpdateDeleteTests.cs
git commit -m "fix: add validation attributes to UpdateCharacterRequest"
```

---

## Task 2: Add Validation to AddUserGameRequest and CharacterFieldValueRequest

**Files:**
- Modify: `apps/api/Models/DTOs/UserGame/AddUserGameRequest.cs`
- Modify: `apps/api/Models/DTOs/Character/CharacterFieldValueRequest.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`

- [ ] **Step 1: Write the failing test in UserGameTests.cs**

Open `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`, find the bottom of the test class, and add:

```csharp
[Fact]
public async Task AddUserGame_WithEmptyName_ReturnsBadRequest()
{
    var client = await CreateAuthenticatedClientAsync();

    var response = await client.PostAsJsonAsync("/api/user-games", new
    {
        externalId = 99999,
        name = "",
        imageUrl = (string?)null
    });

    response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "AddUserGame_WithEmptyName_ReturnsBadRequest" -v minimal
```

Expected: FAIL (currently 200-series because no validation).

- [ ] **Step 3: Update AddUserGameRequest.cs**

Overwrite `apps/api/Models/DTOs/UserGame/AddUserGameRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.UserGame;

public record AddUserGameRequest(
    [Required] int ExternalId,
    [Required][StringLength(200, MinimumLength = 1)] string Name,
    [StringLength(500)] string? ImageUrl
);
```

- [ ] **Step 4: Update CharacterFieldValueRequest.cs**

Overwrite `apps/api/Models/DTOs/Character/CharacterFieldValueRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterFieldValueRequest
{
    [Required]
    public Guid FieldDefinitionId { get; set; }

    [Required]
    [StringLength(500)]
    public string Value { get; set; } = default!;
}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "AddUserGame_WithEmptyName_ReturnsBadRequest" -v minimal
```

Expected: PASS

- [ ] **Step 6: Run the full test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests -v minimal
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Models/DTOs/UserGame/AddUserGameRequest.cs
git add apps/api/Models/DTOs/Character/CharacterFieldValueRequest.cs
git add apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs
git commit -m "fix: add validation attributes to AddUserGameRequest and CharacterFieldValueRequest"
```

---

## Task 3: Enable Swagger in All Environments

**Files:** Modify `apps/api/Program.cs`

Currently Swagger is only served in development. Removing the guard makes the API self-documenting in all environments including production.

- [ ] **Step 1: Update AddSwaggerGen call to include API title**

In `apps/api/Program.cs`, find the `builder.Services.AddSwaggerGen(c =>` block (around line 122). Change it to add a `SwaggerDoc` info object as the first line inside the lambda:

```csharp
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "PartyUp API",
        Version = "v1",
        Description = "Swipe-based matchmaking for multiplayer gamers"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
```

- [ ] **Step 2: Remove the IsDevelopment guard from middleware**

Find this block in `Program.cs` (around line 181):

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
```

Replace it with:

```csharp
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "PartyUp API v1"));
```

- [ ] **Step 3: Build to confirm no compile errors**

```bash
dotnet build apps/api/PartyUp.Api.csproj -v minimal
```

Expected: Build succeeded with 0 error(s).

- [ ] **Step 4: Run the test suite to confirm no regressions**

```bash
dotnet test apps/tests/PartyUp.Api.Tests -v minimal
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Program.cs
git commit -m "feat: enable Swagger UI in all environments"
```

---

## Task 4: Add Error State to Frontend Hooks

**Files:**
- Modify: `apps/web/src/hooks/useCharacters.ts`
- Modify: `apps/web/src/hooks/useMatches.ts`
- Modify: `apps/web/src/hooks/useProfile.ts`
- Modify: `apps/web/src/hooks/useFieldDefinitions.ts`

`useCharacters` and `useMatches` are currently unused by pages (pages call the API directly), but fix them for consistency. `useProfile` is used by `SettingsPage`. `useFieldDefinitions` is used by `RealmLeftPage` and `CreateCharacterWizard` — this is the highest priority.

- [ ] **Step 1: Update useCharacters.ts**

Overwrite `apps/web/src/hooks/useCharacters.ts`:

```typescript
import { useEffect, useState } from "react";
import { getCharacters } from "../api/endpoints/characters";
import type { Character } from "../api/endpoints/characters";

export function useCharacters() {
  const [data, setData] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCharacters()
      .then(setData)
      .catch(() => setError("Failed to load characters"))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
```

- [ ] **Step 2: Update useMatches.ts**

Overwrite `apps/web/src/hooks/useMatches.ts`:

```typescript
import { useEffect, useState } from "react";
import { getMatches, type CharacterMatchDto } from "../api/endpoints/matches";

export function useMatches(gameId?: string) {
  const [data, setData] = useState<CharacterMatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMatches(gameId)
      .then(setData)
      .catch(() => setError("Failed to load matches"))
      .finally(() => setLoading(false));
  }, [gameId]);

  return { data, loading, error };
}
```

- [ ] **Step 3: Update useProfile.ts**

Overwrite `apps/web/src/hooks/useProfile.ts`:

```typescript
import { useState, useEffect } from "react";
import {
  getProfile,
  updateProfile,
  updatePreferences,
  type UpdateProfileRequest,
  type UpdatePreferencesRequest,
} from "../api/endpoints/profileEndpoints";
import type { UserProfileData } from "../api/endpoints/auth";

export function useProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setError("Failed to load profile"))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleUpdateProfile(data: UpdateProfileRequest): Promise<void> {
    const updated = await updateProfile(data);
    setProfile(updated);
  }

  async function handleUpdatePreferences(data: UpdatePreferencesRequest): Promise<void> {
    const updated = await updatePreferences(data);
    setProfile((prev) => (prev ? { ...prev, preferences: updated } : null));
  }

  return {
    profile,
    isLoading,
    error,
    updateProfile: handleUpdateProfile,
    updatePreferences: handleUpdatePreferences,
  };
}
```

- [ ] **Step 4: Update useFieldDefinitions.ts**

Overwrite `apps/web/src/hooks/useFieldDefinitions.ts`:

```typescript
import { useEffect, useRef, useState } from "react";
import { getFieldDefinitions, type FieldDefinitionsResponse } from "../api/endpoints/games";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export function useFieldDefinitions(gameId: string | null) {
  const [data, setData] = useState<FieldDefinitionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollCount = useRef(0);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!gameId) return;

    isMounted.current = true;
    setLoading(true);
    setError(null);
    pollCount.current = 0;

    async function fetchOnce() {
      try {
        const result = await getFieldDefinitions(gameId!);
        if (!isMounted.current) return;
        setData(result);

        if (result.schemaStatus === "Pending" || result.schemaStatus === "Generating") {
          if (pollCount.current < MAX_POLLS) {
            pollCount.current++;
            timeoutId.current = setTimeout(fetchOnce, POLL_INTERVAL_MS);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch {
        if (isMounted.current) {
          setError("Failed to load game schema");
          setLoading(false);
        }
      }
    }

    fetchOnce();

    return () => {
      isMounted.current = false;
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [gameId]);

  return { data, loading, error };
}
```

- [ ] **Step 5: Build the frontend to confirm no type errors**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/useCharacters.ts
git add apps/web/src/hooks/useMatches.ts
git add apps/web/src/hooks/useProfile.ts
git add apps/web/src/hooks/useFieldDefinitions.ts
git commit -m "fix: add error state to data-fetching hooks"
```

---

## Task 5: Dockerfile — Non-Root User and HEALTHCHECK

**Files:** Modify `apps/api/Dockerfile`

The aspnet runtime image doesn't include `curl` by default. We install it, add a non-root user, and wire a `HEALTHCHECK` to the existing `/api/health` endpoint.

- [ ] **Step 1: Overwrite the Dockerfile**

Overwrite `apps/api/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY apps/api/PartyUp.Api.csproj apps/api/
RUN dotnet restore apps/api/PartyUp.Api.csproj

COPY apps/api/ apps/api/
RUN dotnet publish apps/api/PartyUp.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
COPY --from=build /app/publish .
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1
ENTRYPOINT ["dotnet", "PartyUp.Api.dll"]
```

- [ ] **Step 2: Build the Docker image to confirm it works**

```bash
docker build -f apps/api/Dockerfile -t partyup-api:test .
```

Expected: Successfully built image. All layers complete.

- [ ] **Step 3: Confirm non-root user is set**

```bash
docker inspect partyup-api:test --format '{{.Config.User}}'
```

Expected: `appuser`

- [ ] **Step 4: Commit**

```bash
git add apps/api/Dockerfile
git commit -m "fix: add non-root user and HEALTHCHECK to Dockerfile"
```

---

## Task 6: Backend — Discovery Pagination

**Files:**
- Create: `apps/api/Models/DTOs/Character/PagedDiscoverResult.cs`
- Modify: `apps/api/Services/Interfaces/ICharacterService.cs`
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/api/Controllers/CharactersController.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`

- [ ] **Step 1: Write the failing test in CharacterTests.cs**

Add this test inside the `CharacterTests` class (after the existing `Discover_ReturnsOtherUsersCharactersForSameGame` test):

```csharp
[Fact]
public async Task Discover_WithPagination_ReturnsPagedResult()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();
    var clientC = await CreateAuthenticatedClientAsync();

    var sharedExternalId = Interlocked.Increment(ref _gameCounter);
    var userGameA = await AddGameAsync(clientA, sharedExternalId);
    var userGameB = await AddGameAsync(clientB, sharedExternalId);
    var userGameC = await AddGameAsync(clientC, sharedExternalId);

    await clientB.PostAsJsonAsync("/api/characters", new
    {
        name = "User B Character",
        platform = "PC",
        platformHandle = "HandleB",
        userGameId = userGameB.Id
    });

    await clientC.PostAsJsonAsync("/api/characters", new
    {
        name = "User C Character",
        platform = "PC",
        platformHandle = "HandleC",
        userGameId = userGameC.Id
    });

    // Page 1 with pageSize=1 — should return one result and indicate more exist
    var response = await clientA.GetAsync(
        $"/api/characters/discover?gameId={userGameA.GameId}&page=1&pageSize=1");
    response.StatusCode.Should().Be(HttpStatusCode.OK);

    var result = await response.Content.ReadFromJsonAsync<PagedDiscoverDto>();
    result!.Items.Should().HaveCount(1);
    result.HasMore.Should().BeTrue();
    result.TotalCount.Should().Be(2);
}

private record PagedDiscoverDto(List<DiscoveredDto> Items, bool HasMore, int TotalCount);
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "Discover_WithPagination_ReturnsPagedResult" -v minimal
```

Expected: FAIL — the current endpoint returns `DiscoverCharacterResponse[]`, not `PagedDiscoverResult`.

- [ ] **Step 3: Create PagedDiscoverResult.cs**

Create `apps/api/Models/DTOs/Character/PagedDiscoverResult.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Character;

public class PagedDiscoverResult
{
    public List<DiscoverCharacterResponse> Items { get; set; } = [];
    public bool HasMore { get; set; }
    public int TotalCount { get; set; }
}
```

- [ ] **Step 4: Update ICharacterService.cs**

Overwrite `apps/api/Services/Interfaces/ICharacterService.cs`:

```csharp
using PartyUp.Api.Models.DTOs.Character;

public interface ICharacterService
{
  Task<CharacterResponse?> CreateCharacterAsync(Guid userId, Guid userGameId, CreateCharacterRequest request);
  Task<List<CharacterResponse>> GetCharactersForUserGameAsync(Guid userId, Guid userGameId);
  Task<List<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId);
  Task<CharacterResponse?> GetCharacterByIdAsync(Guid userId, Guid characterId);
  Task<PagedDiscoverResult> DiscoverCharactersAsync(
      Guid userId,
      Guid gameId,
      Dictionary<string, string>? filters = null,
      List<string>? platformFilters = null,
      int page = 1,
      int pageSize = 20);
  Task<bool> UpdateCharacterAsync(Guid userId, Guid userGameId, Guid characterId, UpdateCharacterRequest request);
  Task<bool> DeleteCharacterAsync(Guid userId, Guid userGameId, Guid characterId);
}
```

- [ ] **Step 5: Update CharacterService.DiscoverCharactersAsync**

In `apps/api/Services/CharacterService.cs`, replace the entire `DiscoverCharactersAsync` method (lines 100–176) with:

```csharp
public async Task<PagedDiscoverResult> DiscoverCharactersAsync(
  Guid userId, Guid gameId,
  Dictionary<string, string>? filters = null,
  List<string>? platformFilters = null,
  int page = 1, int pageSize = 20)
{
  var myUserGame = await _db.UserGames
    .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);

  if (myUserGame == null)
    return new PagedDiscoverResult();

  var myCharacterIds = await _db.Characters
    .Where(c => c.UserGameId == myUserGame.Id)
    .Select(c => c.Id)
    .ToListAsync();

  if (myCharacterIds.Count == 0)
    return new PagedDiscoverResult();

  var alreadySeenIds = await _db.CharacterInteractions
    .Where(i => myCharacterIds.Contains(i.FromCharacterId))
    .Select(i => i.ToCharacterId)
    .ToListAsync();

  var query = _db.Characters
    .Include(c => c.UserGame)
      .ThenInclude(ug => ug.Game)
    .Where(c =>
      c.UserGame.GameId == gameId &&
      c.UserGame.UserId != userId &&
      !alreadySeenIds.Contains(c.Id));

  if (platformFilters != null && platformFilters.Count > 0)
    query = query.Where(c => platformFilters.Contains(c.Platform));

  if (filters != null && filters.Count > 0)
  {
    var filterableKeys = (await _db.GameFieldDefinitions
      .Where(d => d.GameId == gameId && d.IsFilterable && d.Type == PartyUp.Api.Models.Enums.FieldType.Select)
      .Select(d => d.Key)
      .ToListAsync())
      .ToHashSet();

    foreach (var (key, value) in filters)
    {
      if (!filterableKeys.Contains(key))
        continue;
      var k = key;
      var v = value;
      query = query.Where(c => c.FieldValues.Any(fv =>
        fv.FieldDefinition.Key == k &&
        fv.Value == v));
    }
  }

  var totalCount = await query.CountAsync();

  var items = await query
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .Select(c => new DiscoverCharacterResponse
    {
      Id = c.Id,
      Name = c.Name,
      Platform = c.Platform,
      ImageUrl = c.ImageUrl,
      Bio = c.Bio,
      UsesVoiceChat = c.UsesVoiceChat,
      Languages = c.Languages,
      AdditionalNotes = c.AdditionalNotes,
      GameName = c.UserGame.Game.Name,
      GameImageUrl = c.UserGame.Game.ImageUrl,
      GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
      {
        FieldDefinitionId = fv.FieldDefinitionId,
        Key = fv.FieldDefinition.Key,
        Label = fv.FieldDefinition.Label,
        Value = fv.Value,
        Type = fv.FieldDefinition.Type.ToString(),
        CommonField = fv.FieldDefinition.CommonField
      }).ToList(),
    })
    .ToListAsync();

  return new PagedDiscoverResult
  {
    Items = items,
    HasMore = page * pageSize < totalCount,
    TotalCount = totalCount
  };
}
```

- [ ] **Step 6: Update CharactersController.Discover**

In `apps/api/Controllers/CharactersController.cs`, replace the `Discover` action method (lines 103–114):

```csharp
[HttpGet("discover")]
public async Task<IActionResult> Discover(
  [FromQuery] Guid gameId,
  [FromQuery] int page = 1,
  [FromQuery] int pageSize = 20)
{
  var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
  var platformFilters = Request.Query["platform"]
    .Where(v => v != null).Select(v => v!).ToList();
  var filters = Request.Query
    .Where(kv => kv.Key != "gameId" && kv.Key != "platform" && kv.Key != "page" && kv.Key != "pageSize")
    .ToDictionary(kv => kv.Key, kv => kv.Value.ToString());
  var result = await _characterService.DiscoverCharactersAsync(userId, gameId, filters, platformFilters, page, pageSize);
  return Ok(result);
}
```

- [ ] **Step 7: Run the failing test to confirm it now passes**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "Discover_WithPagination_ReturnsPagedResult" -v minimal
```

Expected: PASS

- [ ] **Step 8: Run the full test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests -v minimal
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/api/Models/DTOs/Character/PagedDiscoverResult.cs
git add apps/api/Services/Interfaces/ICharacterService.cs
git add apps/api/Services/CharacterService.cs
git add apps/api/Controllers/CharactersController.cs
git add apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs
git commit -m "feat: add pagination to character discovery endpoint"
```

---

## Task 7: Frontend — Consume Paginated Discovery

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`
- Modify: `apps/web/src/components/DiscoveryPanel.tsx`

The `DiscoveryPanel` currently loads all results into a queue and pops one at a time. With pagination, it loads page 1 on mount and automatically fetches the next page when the queue drops to 2 or fewer cards.

- [ ] **Step 1: Add PagedDiscoverResult type and update discoverCharacters in characters.ts**

In `apps/web/src/api/endpoints/characters.ts`, add the new type after the `DiscoverCharacter` type definition (around line 77):

```typescript
export type PagedDiscoverResult = {
  items: DiscoverCharacter[];
  hasMore: boolean;
  totalCount: number;
};
```

Then replace the existing `discoverCharacters` function (lines 101–104):

```typescript
export function discoverCharacters(
  gameId: string,
  filters?: Record<string, string>,
  platforms?: string[],
  page = 1,
  pageSize = 20
) {
  const qs = new URLSearchParams({
    gameId,
    page: String(page),
    pageSize: String(pageSize),
    ...filters,
  });
  platforms?.forEach(p => qs.append('platform', p));
  return apiGet<PagedDiscoverResult>(`/characters/discover?${qs.toString()}`);
}
```

- [ ] **Step 2: Overwrite DiscoveryPanel.tsx**

Overwrite `apps/web/src/components/DiscoveryPanel.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { useDebounce } from '../hooks/useDebounce'
import { SwipeCard } from './cards/SwipeCard'
import { Spinner, EmptyState } from './ui'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character
  onMatch: () => void
  filters: Record<string, string>
  activePlatforms: string[]
}

const PAGE_SIZE = 20
const REFETCH_THRESHOLD = 2

export function DiscoveryPanel({
  gameId,
  myCharacter,
  onMatch,
  filters,
  activePlatforms,
}: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const loadingMore = useRef(false)

  const debouncedFilters = useDebounce(filters, 400)
  const debouncedPlatforms = useDebounce(activePlatforms, 400)

  const loadPage = useCallback(async (pageNum: number, replace: boolean) => {
    if (loadingMore.current) return
    loadingMore.current = true

    const activeFilters = Object.fromEntries(
      Object.entries(debouncedFilters).filter(([, v]) => v !== '')
    )

    try {
      const result = await discoverCharacters(
        gameId,
        activeFilters,
        debouncedPlatforms.length > 0 ? debouncedPlatforms : undefined,
        pageNum,
        PAGE_SIZE
      )
      setHasMore(result.hasMore)
      setPage(pageNum)
      if (replace) {
        setQueue(result.items)
        setStatus(result.items.length === 0 ? 'empty' : 'ready')
      } else {
        setQueue(prev => {
          const next = [...prev, ...result.items]
          if (next.length === 0) setStatus('empty')
          return next
        })
      }
    } catch {
      if (replace) setStatus('error')
    } finally {
      loadingMore.current = false
    }
  }, [gameId, debouncedFilters, debouncedPlatforms])

  // Reset and load page 1 when filters/game change
  useEffect(() => {
    setStatus('loading')
    setQueue([])
    setPage(1)
    setHasMore(false)
    loadingMore.current = false
    loadPage(1, true)
  }, [loadPage])

  // Prefetch next page when queue runs low
  useEffect(() => {
    if (queue.length <= REFETCH_THRESHOLD && hasMore && status === 'ready') {
      loadPage(page + 1, false)
    }
  }, [queue.length, hasMore, status, page, loadPage])

  async function handleInteract(type: 'Like' | 'Dislike') {
    const current = queue[0]
    if (!current) return
    try {
      const res = await interactWithCharacter(myCharacter.id, current.id, type)
      if (res.isMatch) onMatch()
    } catch (err) {
      console.error(`Failed to ${type.toLowerCase()} character:`, err)
    }
    setQueue(q => {
      const next = q.slice(1)
      if (next.length === 0 && !hasMore) setStatus('empty')
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full gap-4">
      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner label="Scanning the realm..." /></div>
      )}

      {(status === 'empty' || status === 'error') && (
        <EmptyState
          message={status === 'empty' ? 'All caught up — check back later.' : 'Could not load players.'}
        />
      )}

      {status === 'ready' && (
        <div className="relative mx-auto w-full h-full min-h-0">
          {queue.slice(0, 2).map((char, i) => (
            <SwipeCard
              key={char.id}
              character={char}
              onLike={() => handleInteract('Like')}
              onDislike={() => handleInteract('Dislike')}
              isTop={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build the frontend to confirm no type errors**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts
git add apps/web/src/components/DiscoveryPanel.tsx
git commit -m "feat: consume paginated discovery endpoint in DiscoveryPanel"
```

---

## Self-Review

**Spec coverage:**
- [x] DTO validation — UpdateCharacterRequest, AddUserGameRequest, CharacterFieldValueRequest covered with tests
- [x] Swagger in all environments — guard removed, title added
- [x] Frontend hook error state — all four hooks updated
- [x] Dockerfile non-root user + HEALTHCHECK — curl installed, appuser created, HEALTHCHECK wired
- [x] Discovery pagination — backend DTO, service, controller, frontend API function, DiscoveryPanel

**Placeholder scan:** No TBD, no "similar to above", all code steps contain complete file contents.

**Type consistency:**
- `PagedDiscoverResult` (C#) maps to `PagedDiscoverResult` (TS): `Items`→`items`, `HasMore`→`hasMore`, `TotalCount`→`totalCount` — camelCase JSON serialization is the default in ASP.NET Core. ✓
- `discoverCharacters` returns `PagedDiscoverResult` and `DiscoveryPanel` destructures `.items`, `.hasMore` from it. ✓
- Interface method `DiscoverCharactersAsync` returns `Task<PagedDiscoverResult>`, service implements `Task<PagedDiscoverResult>`. ✓
