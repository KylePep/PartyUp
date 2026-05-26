# Feature Backfill: EAV Fields, Match Reveals, and Character Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface EAV game fields and all missing character data across discover/match/gallery cards, add platform handle reveal on match, and expose character edit and delete.

**Architecture:** Backend adds a `CharacterFieldValueDto` and updates all three character response shapes to include game fields; exposes PUT/DELETE endpoints backed by already-implemented service methods. Frontend adds an edit page (wizard in edit mode), delete buttons, and renders new fields on all cards.

**Tech Stack:** ASP.NET Core 8 / EF Core 8 / PostgreSQL; xUnit + WebApplicationFactory for integration tests; React 18 + TypeScript + Vite for the frontend.

---

## File Map

**Create:**
- `apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs` — shared response DTO for one EAV field value
- `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterUpdateDeleteTests.cs` — integration tests for PUT/DELETE endpoints
- `apps/web/src/pages/EditCharacterPage.tsx` — edit page that loads existing character and opens pre-filled wizard

**Modify:**
- `apps/api/Models/DTOs/Character/CharacterResponse.cs` — add `GameFields`
- `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs` — add `GameFields`
- `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs` — add `ImageUrl`, `MainRole`, `SecondaryRole`, `PlatformHandle`, `GameFields` to `CharacterSummaryDto`
- `apps/api/Services/CharacterService.cs` — load FieldValues in queries, map in `ToResponse` and discover projection
- `apps/api/Services/CharacterMatchService.cs` — load FieldValues, map in `ToSummary`
- `apps/api/Controllers/CharactersController.cs` — add PUT and DELETE routes
- `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterFieldValueTests.cs` — add assertions that GameFields appear in response
- `apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs` — update `MatchItemDto` record, add assertion for TheirCharacter fields
- `apps/web/src/api/endpoints/characters.ts` — add `CharacterGameField` type, `gameFields` to `Character`, `updateCharacter`, `deleteCharacter`
- `apps/web/src/api/endpoints/matches.ts` — add `platformHandle`, `gameFields` to `CharacterSummary`
- `apps/web/src/components/cards/SwipeCard.tsx` — render `secondaryRole`, `preferredModes`, `usesVoiceChat`, `languages`, `gameFields`
- `apps/web/src/components/cards/CharacterCard.tsx` — render `secondaryRole`, `playstyle`, `gameFields`; add optional `onDelete` and `onEdit`
- `apps/web/src/components/cards/MatchCard.tsx` — render `gameName`, `platformHandle`, `bio`, `imageUrl`, `mainRole`, `gameFields`; accept `gameName` prop
- `apps/web/src/components/MatchGallery.tsx` — pass `gameName` to `MatchCard`
- `apps/web/src/components/CharacterGallery.tsx` — wire `onDelete` to `CharacterCard`, handle optimistic removal
- `apps/web/src/components/CharacterPanel.tsx` — wire `onDelete` and `onEdit` to `CharacterCard`
- `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx` — accept `mode`, `characterId`, `initialData`; call `updateCharacter` when editing
- `apps/web/src/App.tsx` — add `/realm/:gameId/edit-character/:characterId` route

---

## Task 1: Add `CharacterFieldValueDto`

**Files:**
- Create: `apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs`

- [ ] **Step 1: Create the DTO**

```csharp
// apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs
namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterFieldValueDto
{
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
    public string Value { get; set; } = default!;
    public string Type { get; set; } = default!;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs
git commit -m "feat: add CharacterFieldValueDto for EAV field values in responses"
```

---

## Task 2: Add `GameFields` to `CharacterResponse` and update service

**Files:**
- Modify: `apps/api/Models/DTOs/Character/CharacterResponse.cs`
- Modify: `apps/api/Services/CharacterService.cs`

- [ ] **Step 1: Add `GameFields` to `CharacterResponse`**

In `apps/api/Models/DTOs/Character/CharacterResponse.cs`, add the property after `CreatedAt`:

```csharp
  public DateTime CreatedAt { get; set; }
  public List<CharacterFieldValueDto> GameFields { get; set; } = [];
```

- [ ] **Step 2: Update `ToResponse` to map field values**

In `apps/api/Services/CharacterService.cs`, replace the `ToResponse` method:

```csharp
  private static CharacterResponse ToResponse(Character c) => new()
  {
    Id = c.Id,
    UserGameId = c.UserGameId,
    Platform = c.Platform,
    PlatformHandle = c.PlatformHandle,
    Name = c.Name,
    ImageUrl = c.ImageUrl,
    Bio = c.Bio,
    MainRole = c.MainRole,
    SecondaryRole = c.SecondaryRole,
    PreferredModes = c.PreferredModes,
    TimeZone = c.TimeZone,
    ActiveTimes = c.ActiveTimes,
    UsesVoiceChat = c.UsesVoiceChat,
    Languages = c.Languages,
    Playstyle = c.Playstyle,
    Rank = c.Rank,
    Region = c.Region,
    CreatedAt = c.CreatedAt,
    GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
    {
      Key = fv.FieldDefinition.Key,
      Label = fv.FieldDefinition.Label,
      Value = fv.Value,
      Type = fv.FieldDefinition.Type.ToString()
    }).ToList(),
  };
```

- [ ] **Step 3: Include FieldValues in the two "own character" queries**

In `apps/api/Services/CharacterService.cs`, update `GetCharactersForUserGameAsync`:

```csharp
  public async Task<List<CharacterResponse>> GetCharactersForUserGameAsync(
    Guid userId,
    Guid userGameId)
  {
    var userGameExists = await _db.UserGames
      .AnyAsync(x => x.Id == userGameId && x.UserId == userId);

    if (!userGameExists)
      return [];

    return await _db.Characters
      .Include(c => c.FieldValues)
        .ThenInclude(fv => fv.FieldDefinition)
      .Where(x => x.UserGameId == userGameId)
      .Select(x => ToResponse(x))
      .ToListAsync();
  }
```

And `GetAllCharactersForUserAsync`:

```csharp
  public async Task<List<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId)
  {
    return await _db.Characters
      .Include(c => c.UserGame)
      .Include(c => c.FieldValues)
        .ThenInclude(fv => fv.FieldDefinition)
      .Where(c => c.UserGame.UserId == userId)
      .Select(c => ToResponse(c))
      .ToListAsync();
  }
```

- [ ] **Step 4: Run existing character field value tests to verify nothing broke**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterFieldValueTests" -v minimal
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Models/DTOs/Character/CharacterResponse.cs apps/api/Services/CharacterService.cs
git commit -m "feat: include EAV game fields in CharacterResponse"
```

---

## Task 3: Add `GameFields` to `DiscoverCharacterResponse`

**Files:**
- Modify: `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs`
- Modify: `apps/api/Services/CharacterService.cs`

- [ ] **Step 1: Add `GameFields` to `DiscoverCharacterResponse`**

In `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs`, add after `GameImageUrl`:

```csharp
  public string? GameImageUrl { get; set; }
  public List<CharacterFieldValueDto> GameFields { get; set; } = [];
```

Note: `PlatformHandle` is intentionally absent — it stays private until a match.

- [ ] **Step 2: Update the discover projection to include GameFields**

In `apps/api/Services/CharacterService.cs`, update the `.Select()` in `DiscoverCharactersAsync`. Replace the existing select block:

```csharp
    return await query
      .Select(c => new DiscoverCharacterResponse
      {
        Id = c.Id,
        Name = c.Name,
        Platform = c.Platform,
        ImageUrl = c.ImageUrl,
        Bio = c.Bio,
        MainRole = c.MainRole,
        SecondaryRole = c.SecondaryRole,
        PreferredModes = c.PreferredModes,
        UsesVoiceChat = c.UsesVoiceChat,
        Languages = c.Languages,
        Playstyle = c.Playstyle,
        Rank = c.Rank,
        Region = c.Region,
        GameName = c.UserGame.Game.Name,
        GameImageUrl = c.UserGame.Game.ImageUrl,
        GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
        {
          Key = fv.FieldDefinition.Key,
          Label = fv.FieldDefinition.Label,
          Value = fv.Value,
          Type = fv.FieldDefinition.Type.ToString()
        }).ToList(),
      })
      .ToListAsync();
```

- [ ] **Step 3: Run discover tests to verify nothing broke**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterTests|FullyQualifiedName~DiscoverFilterTests" -v minimal
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs apps/api/Services/CharacterService.cs
git commit -m "feat: include EAV game fields in DiscoverCharacterResponse"
```

---

## Task 4: Enrich `CharacterSummaryDto` for match reveals

**Files:**
- Modify: `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs`
- Modify: `apps/api/Services/CharacterMatchService.cs`

- [ ] **Step 1: Add missing fields to `CharacterSummaryDto`**

Replace the `CharacterSummaryDto` class in `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs`:

```csharp
public class CharacterSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? ImageUrl { get; set; }
    public string? Bio { get; set; }
    public string? MainRole { get; set; }
    public string? SecondaryRole { get; set; }
    public string? Playstyle { get; set; }
    public string? Rank { get; set; }
    public string? Region { get; set; }
    public string PlatformHandle { get; set; } = default!;
    public List<CharacterFieldValueDto> GameFields { get; set; } = [];
}
```

- [ ] **Step 2: Update `ToSummary` to map the new fields**

In `apps/api/Services/CharacterMatchService.cs`, replace `ToSummary`:

```csharp
    private static CharacterSummaryDto ToSummary(Character c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        ImageUrl = c.ImageUrl,
        Bio = c.Bio,
        MainRole = c.MainRole,
        SecondaryRole = c.SecondaryRole,
        Playstyle = c.Playstyle,
        Rank = c.Rank,
        Region = c.Region,
        PlatformHandle = c.PlatformHandle,
        GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
        {
            Key = fv.FieldDefinition.Key,
            Label = fv.FieldDefinition.Label,
            Value = fv.Value,
            Type = fv.FieldDefinition.Type.ToString()
        }).ToList(),
    };
```

- [ ] **Step 3: Add FieldValues includes to the match query**

In `apps/api/Services/CharacterMatchService.cs`, update `GetMatchesAsync` query to include FieldValues:

```csharp
        var query = _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(m => m.CharacterA).ThenInclude(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(m => m.CharacterB).ThenInclude(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
            .Where(m =>
                m.CharacterA.UserGame.UserId == userId ||
                m.CharacterB.UserGame.UserId == userId);
```

- [ ] **Step 4: Run match tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterMatchTests" -v minimal
```

Expected: all tests pass (the existing `MatchItemDto` record in the test only has Id and Name in `CharacterSummaryDto` — that's fine since records only bind what they declare).

- [ ] **Step 5: Commit**

```bash
git add apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs apps/api/Services/CharacterMatchService.cs
git commit -m "feat: enrich CharacterSummaryDto with image, roles, platformHandle, and game fields for match reveal"
```

---

## Task 5: Add PUT and DELETE controller endpoints

**Files:**
- Modify: `apps/api/Controllers/CharactersController.cs`

- [ ] **Step 1: Add PUT endpoint**

In `apps/api/Controllers/CharactersController.cs`, add after the `UploadImage` action and before the `Discover` action:

```csharp
  [HttpPut("{userGameId}/{id}")]
  public async Task<IActionResult> UpdateCharacter(Guid userGameId, Guid id, [FromBody] UpdateCharacterRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var updated = await _characterService.UpdateCharacterAsync(userId, userGameId, id, request);
    return updated ? NoContent() : NotFound();
  }

  [HttpDelete("{userGameId}/{id}")]
  public async Task<IActionResult> DeleteCharacter(Guid userGameId, Guid id)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var deleted = await _characterService.DeleteCharacterAsync(userId, userGameId, id);
    return deleted ? NoContent() : NotFound();
  }
```

- [ ] **Step 2: Write failing tests for update and delete**

Create `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterUpdateDeleteTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Characters;

public class CharacterUpdateDeleteTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 60_000;

    public CharacterUpdateDeleteTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task UpdateCharacter_ChangesName_ReturnsNoContent()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var characterId = await CreateCharacterAsync(client, userGame.Id, "Original Name");

        var response = await client.PutAsJsonAsync(
            $"/api/characters/{userGame.Id}/{characterId}",
            new { name = "Updated Name", platform = "Xbox" });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var characters = await client.GetFromJsonAsync<List<CharacterDto>>("/api/characters");
        characters!.Should().ContainSingle(c => c.Name == "Updated Name");
    }

    [Fact]
    public async Task UpdateCharacter_OnAnotherUsersCharacter_ReturnsNotFound()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var userGameB = await AddGameAsync(clientB);
        var charB = await CreateCharacterAsync(clientB, userGameB.Id, "B's Character");

        var response = await clientA.PutAsJsonAsync(
            $"/api/characters/{userGameB.Id}/{charB}",
            new { name = "Hijacked", platform = "PC" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateCharacter_WithoutAuth_Returns401()
    {
        var response = await Client.PutAsJsonAsync(
            $"/api/characters/{Guid.NewGuid()}/{Guid.NewGuid()}",
            new { name = "Test", platform = "PC" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DeleteCharacter_RemovesCharacter_ReturnsNoContent()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var characterId = await CreateCharacterAsync(client, userGame.Id, "To Delete");

        var deleteResponse = await client.DeleteAsync($"/api/characters/{userGame.Id}/{characterId}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var characters = await client.GetFromJsonAsync<List<CharacterDto>>("/api/characters");
        characters!.Should().NotContain(c => c.Id == characterId);
    }

    [Fact]
    public async Task DeleteCharacter_OnAnotherUsersCharacter_ReturnsNotFound()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var userGameB = await AddGameAsync(clientB);
        var charB = await CreateCharacterAsync(clientB, userGameB.Id, "B's Character");

        var response = await clientA.DeleteAsync($"/api/characters/{userGameB.Id}/{charB}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteCharacter_WithoutAuth_Returns401()
    {
        var response = await Client.DeleteAsync($"/api/characters/{Guid.NewGuid()}/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<UserGameDto> AddGameAsync(HttpClient client)
    {
        var id = Interlocked.Increment(ref _gameCounter);
        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<UserGameDto>())!;
    }

    private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId, string name)
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name,
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterIdDto>())!.Id;
    }

    private record UserGameDto(Guid Id, Guid GameId);
    private record CharacterIdDto(Guid Id);
    private record CharacterDto(Guid Id, string Name);
}
```

- [ ] **Step 3: Run the new tests — they should pass now (controller + service both present)**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterUpdateDeleteTests" -v minimal
```

Expected: all 6 tests pass.

- [ ] **Step 4: Run the full test suite to catch any regressions**

```bash
dotnet test apps/tests/PartyUp.Api.Tests -v minimal
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Controllers/CharactersController.cs apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterUpdateDeleteTests.cs
git commit -m "feat: expose PUT and DELETE character endpoints; add integration tests"
```

---

## Task 6: Test that GameFields appear in CharacterResponse

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterFieldValueTests.cs`

- [ ] **Step 1: Add test asserting GameFields returned in GET /characters**

Add this test to `CharacterFieldValueTests`:

```csharp
    [Fact]
    public async Task GetMyCharacters_ReturnsGameFields_WhenFieldDefinitionsExist()
    {
        var client = await CreateAuthenticatedClientAsync();
        var externalId = Interlocked.Increment(ref _externalIdCounter);

        var addGameResponse = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        addGameResponse.EnsureSuccessStatusCode();
        var userGame = await addGameResponse.Content.ReadFromJsonAsync<UserGameDto>();

        Guid roleFieldId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var game = await db.Games.FindAsync(userGame!.GameId);
            game!.SchemaStatus = SchemaStatus.Generated;

            var field = new GameFieldDefinition
            {
                Id = Guid.NewGuid(),
                GameId = userGame.GameId,
                Key = "faction",
                Label = "Faction",
                Type = FieldType.Select,
                Options = ["Red", "Blue"],
                IsFilterable = false,
                IsRequired = false,
                SortOrder = 1
            };
            roleFieldId = field.Id;
            db.GameFieldDefinitions.Add(field);
            await db.SaveChangesAsync();
        }

        await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Field Test Character",
            platform = "PC",
            platformHandle = "FieldPlayer",
            userGameId = userGame!.Id,
            gameFields = new[] { new { fieldDefinitionId = roleFieldId, value = "Red" } }
        });

        var response = await client.GetAsync("/api/characters");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var characters = await response.Content.ReadFromJsonAsync<List<CharacterWithFieldsDto>>();
        var character = characters!.Single(c => c.Name == "Field Test Character");
        character.GameFields.Should().ContainSingle(f => f.Key == "faction" && f.Value == "Red" && f.Label == "Faction");
    }
```

Add the required DTO record at the bottom of the file alongside the existing private records:

```csharp
    private record CharacterWithFieldsDto(Guid Id, string Name, List<GameFieldDto> GameFields);
    private record GameFieldDto(string Key, string Label, string Value, string Type);
```

- [ ] **Step 2: Run the new test**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterFieldValueTests.GetMyCharacters_ReturnsGameFields" -v minimal
```

Expected: PASS.

- [ ] **Step 3: Add the using statements needed at the top of CharacterFieldValueTests.cs (if not already present)**

Ensure the file has:
```csharp
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
```

- [ ] **Step 4: Commit**

```bash
git add apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterFieldValueTests.cs
git commit -m "test: assert GameFields returned in GET /characters response"
```

---

## Task 7: Update frontend TypeScript types

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`
- Modify: `apps/web/src/api/endpoints/matches.ts`

- [ ] **Step 1: Update `characters.ts` with new type and API functions**

Replace the contents of `apps/web/src/api/endpoints/characters.ts`:

```typescript
import { apiDelete, apiGet, apiPost, apiPostForm, apiPut } from "../client";

export type CharacterGameField = {
  key: string;
  label: string;
  value: string;
  type: string;
};

export type Character = {
  id: string;
  userGameId?: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  mainRole?: string;
  secondaryRole?: string;
  preferredModes: string[];
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  playstyle?: string;
  rank?: string;
  region?: string;
  gameFields: CharacterGameField[];
};

export type CharacterCreate = {
  userGameId: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  mainRole?: string;
  secondaryRole?: string;
  preferredModes: string[];
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  playstyle?: string;
  rank?: string;
  region?: string;
  gameFields?: CharacterFieldValueCreate[];
};

export type CharacterUpdate = {
  platform?: string;
  platformHandle?: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  mainRole?: string;
  secondaryRole?: string;
  preferredModes?: string[];
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  playstyle?: string;
  rank?: string;
  region?: string;
};

export type CharacterFieldValueCreate = {
  fieldDefinitionId: string;
  value: string;
};

export type DiscoverCharacter = Character & {
  gameName?: string;
  gameImageUrl?: string;
};

export type MatchResponse = {
  characterAId: string;
  characterBId: string;
  isMatch: false;
  matchId: string;
  matchedAt: Date;
};

export type InteractionType = "Like" | "Dislike";

export function getCharacters() {
  return apiGet<Character[]>("/characters");
}

export function getUserGameCharacters(userGameId: string) {
  return apiGet<Character[]>(`/characters/${userGameId}/userGame`);
}

export function createCharacter(data: CharacterCreate) {
  return apiPost<Character>("/characters", data);
}

export function updateCharacter(userGameId: string, characterId: string, data: CharacterUpdate) {
  return apiPut<void>(`/characters/${userGameId}/${characterId}`, data);
}

export function deleteCharacter(userGameId: string, characterId: string) {
  return apiDelete<void>(`/characters/${userGameId}/${characterId}`);
}

export function discoverCharacters(gameId: string, filters?: Record<string, string>) {
  const qs = new URLSearchParams({ gameId, ...filters });
  return apiGet<DiscoverCharacter[]>(`/characters/discover?${qs.toString()}`);
}

export function uploadCharacterImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiPostForm<{ url: string }>("/characters/image", form);
}

export function interactWithCharacter(
  fromCharacterId: string,
  toCharacterId: string,
  type: InteractionType
) {
  return apiPost<MatchResponse>("/character-interactions", {
    fromCharacterId,
    toCharacterId,
    type,
  });
}
```

- [ ] **Step 2: Update `matches.ts` to include new fields on `CharacterSummary`**

Replace the contents of `apps/web/src/api/endpoints/matches.ts`:

```typescript
import { apiGet } from "../client";
import type { CharacterGameField } from "./characters";

export type CharacterSummary = {
  id: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  mainRole?: string;
  secondaryRole?: string;
  playstyle?: string;
  rank?: string;
  region?: string;
  platformHandle: string;
  gameFields: CharacterGameField[];
};

export type CharacterMatchDto = {
  matchId: string;
  matchedAt: string;
  myCharacter: CharacterSummary;
  theirCharacter: CharacterSummary;
  gameId: string;
  gameName: string;
};

export function getMatches(gameId?: string): Promise<CharacterMatchDto[]> {
  const query = gameId ? `?gameId=${gameId}` : "";
  return apiGet<CharacterMatchDto[]>(`/character-matches${query}`);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts apps/web/src/api/endpoints/matches.ts
git commit -m "feat: update frontend types with gameFields, platformHandle, and update/delete API calls"
```

---

## Task 8: Update `SwipeCard` to show all available discover fields

**Files:**
- Modify: `apps/web/src/components/cards/SwipeCard.tsx`

- [ ] **Step 1: Replace `SwipeCard.tsx`**

```tsx
import { useState } from 'react'
import { Badge, Button, Card } from '../ui'
import { type DiscoverCharacter } from '../../api/endpoints/characters'

type ExitDirection = 'left' | 'right' | null

interface SwipeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
  isTop: boolean
}

export function SwipeCard({ character, onLike, onDislike, isTop }: SwipeCardProps) {
  const [exiting, setExiting] = useState<ExitDirection>(null)

  function handle(dir: ExitDirection, action: () => void) {
    setExiting(dir)
    setTimeout(action, 380)
  }

  const animClass = isTop
    ? exiting === 'right'
      ? '[animation:slide-out-right_0.38s_ease_forwards]'
      : exiting === 'left'
      ? '[animation:slide-out-left_0.38s_ease_forwards]'
      : '[animation:slide-in-left_0.35s_ease_forwards]'
    : '[animation:card-enter_0.35s_ease_forwards]'

  const voiceLine = [
    character.usesVoiceChat != null
      ? character.usesVoiceChat ? 'Voice chat' : 'No voice chat'
      : null,
    character.languages && character.languages.length > 0
      ? character.languages.join(' · ')
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={`absolute inset-0 ${animClass}`}
      style={{
        zIndex: isTop ? 2 : 1,
        transform: isTop ? undefined : 'scale(0.97) translateY(8px)',
      }}
    >
      <Card padding="lg" className="h-full flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-raised flex-shrink-0 overflow-hidden">
            {character.imageUrl ? (
              <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted font-mono text-lg">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-text text-lg">{character.name}</p>
            {character.gameName && <p className="text-xs text-muted mt-0.5">{character.gameName}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
          {character.preferredModes?.map(m => (
            <Badge key={m}>{m}</Badge>
          ))}
          {character.gameFields?.map(f => (
            <Badge key={f.key}>{f.label}: {f.value}</Badge>
          ))}
        </div>

        {voiceLine && (
          <p className="text-xs text-muted font-mono">{voiceLine}</p>
        )}

        {character.bio && (
          <p className="text-sm text-muted flex-1 overflow-y-auto">{character.bio}</p>
        )}

        {isTop && (
          <div className="flex gap-3 mt-auto">
            <Button
              variant="secondary"
              className="flex-1 border-danger/50 text-danger hover:bg-danger hover:text-white hover:border-danger"
              onClick={() => handle('left', onDislike)}
              disabled={!!exiting}
            >
              Pass
            </Button>
            <Button
              className="flex-1"
              onClick={() => handle('right', onLike)}
              disabled={!!exiting}
            >
              Like
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/SwipeCard.tsx
git commit -m "feat: show secondaryRole, preferredModes, languages, voice chat, and game fields on SwipeCard"
```

---

## Task 9: Update `CharacterCard` — show more fields, add delete and edit callbacks

**Files:**
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`

- [ ] **Step 1: Replace `CharacterCard.tsx`**

```tsx
import { Badge, Button, Card } from '../ui'
import type { Character } from '../../api/endpoints/characters'

interface CharacterCardProps {
  character: Character
  onDelete?: () => void
  onEdit?: () => void
}

export function CharacterCard({ character, onDelete, onEdit }: CharacterCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-raised flex-shrink-0 overflow-hidden">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-sm font-mono">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-text text-sm truncate">{character.name}</p>
          {character.platformHandle && (
            <p className="text-xs text-muted font-mono truncate">{character.platformHandle}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
        {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
        {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        {character.region && <Badge variant="region">{character.region}</Badge>}
        {character.playstyle && <Badge>{character.playstyle}</Badge>}
        {character.gameFields?.map(f => (
          <Badge key={f.key}>{f.label}: {f.value}</Badge>
        ))}
      </div>

      {character.bio && (
        <p className="text-xs text-muted line-clamp-2">{character.bio}</p>
      )}

      {(onEdit || onDelete) && (
        <div className="flex gap-2 mt-1">
          {onEdit && (
            <Button variant="ghost" className="flex-1 text-xs" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              className="flex-1 text-xs text-danger hover:bg-danger hover:text-white"
              onClick={onDelete}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no type errors. (Existing callers that don't pass `onDelete`/`onEdit` are unaffected since both are optional.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/CharacterCard.tsx
git commit -m "feat: add secondaryRole, playstyle, game fields, and edit/delete buttons to CharacterCard"
```

---

## Task 10: Wire delete and edit in `CharacterGallery` and `CharacterPanel`

**Files:**
- Modify: `apps/web/src/components/CharacterGallery.tsx`
- Modify: `apps/web/src/components/CharacterPanel.tsx`

- [ ] **Step 1: Update `CharacterGallery` to handle delete**

Replace `apps/web/src/components/CharacterGallery.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { CharacterCard } from './cards/CharacterCard'
import { EmptyState, Spinner } from './ui'

export function CharacterGallery() {
  const navigate = useNavigate()
  const [characters, setCharacters] = useState<Character[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

  useEffect(() => {
    getCharacters()
      .then(chars => {
        setCharacters(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  async function handleDelete(character: Character) {
    if (!character.userGameId) return
    await deleteCharacter(character.userGameId, character.id)
    setCharacters(prev => {
      const next = prev.filter(c => c.id !== character.id)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }

  function handleEdit(character: Character) {
    if (!character.userGameId) return
    // gameId not available on Character from /characters — navigate via userGameId param
    // The edit page will look up the userGame to get the gameId
    navigate(`/characters/${character.id}/edit?userGameId=${character.userGameId}`)
  }

  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  if (status === 'empty') {
    return <EmptyState message="You haven't created any characters yet" />
  }

  if (status === 'error') {
    return <EmptyState message="Could not load characters" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {characters.map(c => (
        <CharacterCard
          key={c.id}
          character={c}
          onDelete={() => handleDelete(c)}
          onEdit={() => handleEdit(c)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `CharacterPanel` to handle delete and navigate to edit**

Replace `apps/web/src/components/CharacterPanel.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUserGameCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { type UserGameDetail } from '../api/endpoints/userGames'
import { CharacterCard } from './cards/CharacterCard'
import { Button, EmptyState, Spinner } from './ui'

interface CharacterPanelProps {
  gameId: string
  userGame: UserGameDetail | null
}

export function CharacterPanel({ gameId, userGame }: CharacterPanelProps) {
  const navigate = useNavigate()
  const [character, setCharacter] = useState<Character | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading')

  useEffect(() => {
    if (!userGame) return
    getUserGameCharacters(userGame.id)
      .then(chars => {
        const mine = chars.find(c => c.userGameId === userGame.id) ?? null
        setCharacter(mine)
        setStatus(mine ? 'ready' : 'empty')
      })
      .catch(() => setStatus('empty'))
  }, [userGame?.id])

  async function handleDelete() {
    if (!character || !character.userGameId) return
    await deleteCharacter(character.userGameId, character.id)
    setCharacter(null)
    setStatus('empty')
  }

  function handleEdit() {
    if (!character) return
    navigate(`/realm/${gameId}/edit-character/${character.id}`)
  }

  if (!userGame || status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-mono text-muted uppercase tracking-widest">My Character</h2>
      {status === 'empty' || !character ? (
        <div className="flex flex-col gap-3">
          <EmptyState message="No character for this realm yet" />
          <Link to={`/realm/${gameId}/create-character`}>
            <Button className="w-full">Create Character</Button>
          </Link>
        </div>
      ) : (
        <CharacterCard
          character={character}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}
    </section>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/CharacterGallery.tsx apps/web/src/components/CharacterPanel.tsx
git commit -m "feat: wire delete and edit navigation in CharacterGallery and CharacterPanel"
```

---

## Task 11: Update `MatchCard` and `MatchGallery`

**Files:**
- Modify: `apps/web/src/components/cards/MatchCard.tsx`
- Modify: `apps/web/src/components/MatchGallery.tsx`

- [ ] **Step 1: Replace `MatchCard.tsx`**

```tsx
import { Badge, Card } from '../ui'
import type { CharacterSummary } from '../../api/endpoints/matches'

interface MatchCardProps {
  character: CharacterSummary
  matchedAt: string
  gameName: string
}

export function MatchCard({ character, matchedAt, gameName }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-muted">Matched {date}</p>
        <p className="text-xs font-mono text-accent">{gameName}</p>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-raised flex-shrink-0 overflow-hidden">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-sm font-mono">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-text text-sm truncate">{character.name}</p>
          <p className="text-xs text-muted font-mono truncate">{character.platformHandle}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
        {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
        {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        {character.region && <Badge variant="region">{character.region}</Badge>}
        {character.playstyle && <Badge>{character.playstyle}</Badge>}
        {character.gameFields?.map(f => (
          <Badge key={f.key}>{f.label}: {f.value}</Badge>
        ))}
      </div>

      {character.bio && (
        <p className="text-xs text-muted line-clamp-2">{character.bio}</p>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Update `MatchGallery` to pass `gameName`**

Replace `apps/web/src/components/MatchGallery.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { MatchCard } from './cards/MatchCard'
import { EmptyState, Spinner } from './ui'

interface MatchGalleryProps {
  gameId?: string
}

export function MatchGallery({ gameId }: MatchGalleryProps) {
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

  useEffect(() => {
    setStatus('loading')
    getMatches(gameId)
      .then(m => {
        setMatches(m)
        setStatus(m.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId])

  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  if (status === 'empty') {
    return <EmptyState message="No matches yet — keep swiping!" />
  }

  if (status === 'error') {
    return <EmptyState message="Could not load matches" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map(m => (
        <MatchCard
          key={m.matchId}
          character={m.theirCharacter}
          matchedAt={m.matchedAt}
          gameName={m.gameName}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/cards/MatchCard.tsx apps/web/src/components/MatchGallery.tsx
git commit -m "feat: show gameName, platformHandle reveal, image, roles, and game fields on MatchCard"
```

---

## Task 12: Edit character — wizard refactor and new page

**Files:**
- Modify: `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`
- Create: `apps/web/src/pages/EditCharacterPage.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Update `CreateCharacterWizard` to support edit mode**

Replace `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`:

```tsx
import { useState } from 'react'
import { createCharacter, updateCharacter, uploadCharacterImage } from '../../api/endpoints/characters'
import { useFieldDefinitions } from '../../hooks/useFieldDefinitions'
import { Button } from '../ui'
import { IdentityStep } from './IdentityStep'
import { GameplayStep } from './GameplayStep'
import { DynamicGameplayStep } from './DynamicGameplayStep'
import { AvailabilityStep } from './AvailabilityStep'
import { AboutStep } from './AboutStep'
import { defaultFormData, type CharacterFormData } from './types'

interface CreateCharacterWizardProps {
  userGameId: string
  gameId: string
  platforms?: string[]
  onSuccess: () => void
  mode?: 'create' | 'edit'
  characterId?: string
  initialData?: Partial<CharacterFormData>
}

export function CreateCharacterWizard({
  userGameId,
  gameId,
  platforms,
  onSuccess,
  mode = 'create',
  characterId,
  initialData,
}: CreateCharacterWizardProps) {
  const { data: fieldDefs, loading: loadingFields } = useFieldDefinitions(gameId)
  const hasDynamicFields =
    mode === 'create' &&
    fieldDefs?.schemaStatus === 'Generated' &&
    fieldDefs.fields.length > 0

  const STEPS = hasDynamicFields
    ? (['Identity', 'Game Fields', 'Availability', 'About'] as const)
    : (['Identity', 'Gameplay', 'Availability', 'About'] as const)

  const [step, setStep] = useState(0)
  const [data, setData] = useState<CharacterFormData>({ ...defaultFormData, ...initialData })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function patch(update: Partial<CharacterFormData>) {
    setData(prev => ({ ...prev, ...update }))
  }

  function setGameField(fieldId: string, value: string) {
    setData(prev => ({
      ...prev,
      gameFields: { ...prev.gameFields, [fieldId]: value },
    }))
  }

  function canAdvance() {
    if (step === 0)
      return data.platform.trim() !== '' && data.platformHandle.trim() !== '' && data.name.trim() !== ''
    return true
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      let imageUrl = data.imageUrl.trim() || undefined

      if (data.imageFile) {
        const uploaded = await uploadCharacterImage(data.imageFile)
        imageUrl = uploaded.url
      }

      if (mode === 'edit' && characterId) {
        await updateCharacter(userGameId, characterId, {
          platform: data.platform,
          platformHandle: data.platformHandle.trim(),
          name: data.name.trim(),
          imageUrl,
          bio: data.bio.trim() || undefined,
          mainRole: data.mainRole || undefined,
          secondaryRole: data.secondaryRole || undefined,
          preferredModes: data.preferredModes,
          playstyle: data.playstyle || undefined,
          rank: data.rank || undefined,
          region: data.region || undefined,
          timeZone: data.timeZone.trim() || undefined,
          activeTimes: data.activeTimes.length > 0 ? data.activeTimes : undefined,
          usesVoiceChat: data.usesVoiceChat,
          languages: data.languages.length > 0 ? data.languages : undefined,
        })
      } else {
        const gameFields = hasDynamicFields
          ? Object.entries(data.gameFields)
              .filter(([, v]) => v !== '')
              .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value }))
          : undefined

        await createCharacter({
          userGameId,
          platform: data.platform,
          platformHandle: data.platformHandle.trim(),
          name: data.name.trim(),
          imageUrl,
          bio: data.bio.trim() || undefined,
          mainRole: data.mainRole || undefined,
          secondaryRole: data.secondaryRole || undefined,
          preferredModes: data.preferredModes,
          playstyle: data.playstyle || undefined,
          rank: data.rank || undefined,
          region: data.region || undefined,
          timeZone: data.timeZone.trim() || undefined,
          activeTimes: data.activeTimes.length > 0 ? data.activeTimes : undefined,
          usesVoiceChat: data.usesVoiceChat,
          languages: data.languages.length > 0 ? data.languages : undefined,
          gameFields,
        })
      }
      onSuccess()
    } catch {
      setError(
        mode === 'edit'
          ? 'Failed to update character. Please try again.'
          : 'Failed to create character. Please try again.'
      )
      setSubmitting(false)
    }
  }

  const isLast = step === STEPS.length - 1

  function renderStep() {
    const label = STEPS[step]
    if (label === 'Identity') return <IdentityStep data={data} onChange={patch} platforms={platforms} />
    if (label === 'Game Fields')
      return (
        <DynamicGameplayStep
          fields={fieldDefs?.fields ?? []}
          values={data.gameFields}
          onChange={setGameField}
        />
      )
    if (label === 'Gameplay') return <GameplayStep data={data} onChange={patch} />
    if (label === 'Availability') return <AvailabilityStep data={data} onChange={patch} />
    if (label === 'About') return <AboutStep data={data} onChange={patch} />
  }

  return (
    <div className="flex flex-col gap-8">
      {loadingFields && mode === 'create' && (
        <p className="text-xs font-mono text-muted text-center animate-pulse">
          Loading game fields...
        </p>
      )}

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors
                ${i === step ? 'bg-accent text-white' : i < step ? 'bg-accent-dim text-accent' : 'bg-surface-raised text-muted'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-mono uppercase tracking-widest hidden sm:inline transition-colors
                ${i === step ? 'text-text' : 'text-muted'}`}>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px transition-colors ${i < step ? 'bg-accent-dim' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div>{renderStep()}</div>

      {error && (
        <p className="text-xs font-mono text-danger border border-danger/30 bg-danger/10 px-4 py-3">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canAdvance() || submitting}
        >
          {submitting
            ? mode === 'edit' ? 'Updating...' : 'Creating...'
            : isLast
              ? mode === 'edit' ? 'Update Character' : 'Create Character'
              : 'Next'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `EditCharacterPage.tsx`**

Create `apps/web/src/pages/EditCharacterPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { CreateCharacterWizard } from '../components/character-wizard/CreateCharacterWizard'
import { PageLayout } from '../components/layout/PageLayout'
import { Spinner } from '../components/ui'
import type { CharacterFormData } from '../components/character-wizard/types'

export default function EditCharacterPage() {
  const navigate = useNavigate()
  const { gameId, characterId } = useParams<{ gameId: string; characterId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!gameId || !characterId) return
    getUserGameByGameId(gameId)
      .then(ug => {
        setUserGame(ug)
        return getUserGameCharacters(ug.id)
      })
      .then(chars => {
        const found = chars.find(c => c.id === characterId) ?? null
        if (!found) setError(true)
        setCharacter(found)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [gameId, characterId])

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  if (error || !userGame || !character) {
    return (
      <PageLayout>
        <p className="text-sm text-muted font-mono">Character not found.</p>
      </PageLayout>
    )
  }

  const initialData: Partial<CharacterFormData> = {
    platform: character.platform,
    platformHandle: character.platformHandle,
    name: character.name,
    imageUrl: character.imageUrl ?? '',
    imageFile: null,
    bio: character.bio ?? '',
    mainRole: character.mainRole ?? '',
    secondaryRole: character.secondaryRole ?? '',
    preferredModes: character.preferredModes,
    playstyle: character.playstyle ?? '',
    rank: character.rank ?? '',
    region: character.region ?? '',
    timeZone: character.timeZone ?? '',
    activeTimes: character.activeTimes ?? [],
    usesVoiceChat: character.usesVoiceChat,
    languages: character.languages ?? [],
    gameFields: {},
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">{userGame.gameName}</p>
          <h1 className="font-display font-bold text-3xl text-text">Edit Character</h1>
          <p className="text-sm text-muted mt-2">Update your character profile.</p>
        </div>
        <CreateCharacterWizard
          userGameId={userGame.id}
          gameId={userGame.gameId}
          platforms={userGame.platforms}
          mode="edit"
          characterId={character.id}
          initialData={initialData}
          onSuccess={() => navigate(`/realm/${gameId}`)}
        />
      </div>
    </PageLayout>
  )
}
```

- [ ] **Step 3: Register the edit route in `App.tsx`**

In `apps/web/src/App.tsx`, add the import and route. Replace the imports section and routes:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SignedInLayout from "./components/layout/SignedInLayout";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import RealmPage from "./pages/RealmPage";
import CreateCharacterPage from "./pages/CreateCharacterPage";
import EditCharacterPage from "./pages/EditCharacterPage";
import "./App.css";
import CharactersPage from "./pages/CharacterPage";
import MatchesPage from "./pages/MatchesPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<SignedInLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/realm/:gameId" element={<RealmPage />} />
            <Route path="/realm/:gameId/create-character" element={<CreateCharacterPage />} />
            <Route path="/realm/:gameId/edit-character/:characterId" element={<EditCharacterPage />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/matches" element={<MatchesPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npm run build --prefix apps/web
```

Expected: no type errors.

- [ ] **Step 5: Run all backend tests one final time**

```bash
dotnet test apps/tests/PartyUp.Api.Tests -v minimal
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/character-wizard/CreateCharacterWizard.tsx apps/web/src/pages/EditCharacterPage.tsx apps/web/src/App.tsx
git commit -m "feat: add edit character page using pre-filled wizard; add route /realm/:gameId/edit-character/:characterId"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task(s) |
|---|---|
| CharacterFieldValueDto | Task 1 |
| GameFields in CharacterResponse | Task 2 |
| GameFields in DiscoverCharacterResponse (no PlatformHandle) | Task 3 |
| CharacterSummaryDto: ImageUrl, MainRole, SecondaryRole, PlatformHandle, GameFields | Task 4 |
| PUT /characters/{userGameId}/{id} | Task 5 |
| DELETE /characters/{userGameId}/{id} | Task 5 |
| Tests for update/delete | Task 5 |
| Test GameFields in response | Task 6 |
| Frontend type updates | Task 7 |
| SwipeCard: secondaryRole, preferredModes, languages, usesVoiceChat, gameFields | Task 8 |
| CharacterCard: secondaryRole, playstyle, gameFields, delete button, edit button | Task 9 |
| CharacterGallery/CharacterPanel delete + edit wiring | Task 10 |
| MatchCard: gameName, platformHandle reveal, imageUrl, mainRole, gameFields | Task 11 |
| MatchGallery passes gameName | Task 11 |
| Edit wizard (pre-filled, edit mode) | Task 12 |
| Edit route in App.tsx | Task 12 |

**Placeholder scan:** No TBDs, TODOs, or incomplete steps found.

**Type consistency check:**
- `CharacterFieldValueDto` defined in Task 1, referenced in Tasks 2, 3, 4 — consistent.
- `CharacterGameField` defined in Task 7 characters.ts, imported in matches.ts in same task — consistent.
- `updateCharacter(userGameId, characterId, data: CharacterUpdate)` defined in Task 7, called in Task 12 wizard — consistent.
- `deleteCharacter(userGameId, characterId)` defined in Task 7, called in Task 10 — consistent.
- `CharacterCard` new props `onDelete?` / `onEdit?` defined in Task 9, used in Task 10 — consistent.
- `MatchCard` new `gameName` prop defined in Task 11, passed in Task 11 — consistent.
- `CreateCharacterWizard` new props `mode`, `characterId`, `initialData` defined in Task 12, consumed in `EditCharacterPage` same task — consistent.

**Note on `CharacterGallery` edit navigation:** The edit route from `CharacterGallery` navigates to `/characters/${character.id}/edit?userGameId=${character.userGameId}` — this route doesn't exist. Characters from `/characters` endpoint don't include `gameId` (only `userGameId`). The edit flow from `CharacterPanel` is clean (has gameId from the realm route). For `CharacterGallery`, a lookup of userGame to get gameId is needed. Simplest fix: navigate to `/realm/${userGame.gameId}/edit-character/${character.id}` — but we don't have gameId on the Character object, only userGameId.

**Fix:** Remove the `onEdit` callback from `CharacterGallery` for now, since `CharacterGallery` is used on the global `/characters` page which doesn't have game context. Users can edit characters from the realm page (via `CharacterPanel`). Update Task 10 CharacterGallery to only pass `onDelete`, not `onEdit`:

In `CharacterGallery`, the `handleEdit` function and `onEdit` prop should be removed. Replace the gallery's CharacterCard render:

```tsx
      {characters.map(c => (
        <CharacterCard
          key={c.id}
          character={c}
          onDelete={() => handleDelete(c)}
        />
      ))}
```

And remove the `handleEdit` function entirely from `CharacterGallery`.
