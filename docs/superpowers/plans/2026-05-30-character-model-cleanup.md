# Character Model Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove six dead hardcoded character fields, add AdditionalNotes, strengthen the Anthropic voice-exclusion prompt, and consolidate the wizard's dual-path into a single GameplayStep.

**Architecture:** Backend model/DTOs/services change first (one EF migration drops 6 columns, adds 1), then frontend API types align, then wizard/cards consume the new shape. CharacterMatchService and CharacterMatchDto also carry these fields and are updated in the same backend task group.

**Tech Stack:** ASP.NET Core 8 / EF Core / PostgreSQL — `dotnet ef` for migrations. React + TypeScript + Vite — no build step required during development.

---

## File Map

### Backend
| Action | File |
|--------|------|
| Modify | `apps/api/Models/Character.cs` |
| Modify | `apps/api/Models/DTOs/Character/CharacterResponse.cs` |
| Modify | `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs` |
| Modify | `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs` |
| Modify | `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs` |
| Modify | `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs` |
| Modify | `apps/api/Services/CharacterService.cs` |
| Modify | `apps/api/Services/CharacterMatchService.cs` |
| Modify | `apps/api/Services/AnthropicService.cs` |
| Create | `apps/api/Migrations/<timestamp>_CharacterModelCleanup.cs` (generated) |

### Frontend
| Action | File |
|--------|------|
| Modify | `apps/web/src/api/endpoints/characters.ts` |
| Modify | `apps/web/src/api/endpoints/matches.ts` |
| Modify | `apps/web/src/components/character-wizard/types.ts` |
| Modify | `apps/web/src/components/character-wizard/GameplayStep.tsx` |
| Delete | `apps/web/src/components/character-wizard/DynamicGameplayStep.tsx` |
| Modify | `apps/web/src/components/character-wizard/AboutStep.tsx` |
| Modify | `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx` |
| Modify | `apps/web/src/components/cards/SwipeCard.tsx` |
| Modify | `apps/web/src/components/cards/MatchCard.tsx` |
| Modify | `apps/web/src/pages/CharacterPage.tsx` |
| Modify | `apps/web/src/pages/MatchesPage.tsx` |
| Modify | `apps/web/src/pages/LandingPage.tsx` |

### Tests
| Action | File |
|--------|------|
| Modify | `apps/tests/PartyUp.Api.Tests/Seeders/ScaleSeeder.cs` |
| Modify | `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs` |

---

## Task 1: Update Backend Model and All DTOs

**Files:**
- Modify: `apps/api/Models/Character.cs`
- Modify: `apps/api/Models/DTOs/Character/CharacterResponse.cs`
- Modify: `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs`
- Modify: `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs`
- Modify: `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs`
- Modify: `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs`

- [ ] **Step 1: Replace `Character.cs`**

```csharp
namespace PartyUp.Api.Models;

using System.ComponentModel.DataAnnotations;
using PartyUp.Api.Models;

public class Character
{
  public Guid Id { get; set; }

  public Guid UserGameId { get; set; }
  public UserGame UserGame { get; set; } = default!;

  [Required]
  [MaxLength(50)]
  public string Platform { get; set; } = default!;

  [Required]
  [MaxLength(100)]
  public string PlatformHandle { get; set; } = default!;

  [Required]
  [MaxLength(50)]
  public string Name { get; set; } = default!;

  [MaxLength(500)]
  public string? ImageUrl { get; set; }

  [MaxLength(1000)]
  public string? Bio { get; set; }

  public string? TimeZone { get; set; }
  public string[]? ActiveTimes { get; set; }

  public bool? UsesVoiceChat { get; set; }

  public string[]? Languages { get; set; }

  [MaxLength(1000)]
  public string? AdditionalNotes { get; set; }

  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
  public List<CharacterFieldValue> FieldValues { get; set; } = [];
}
```

- [ ] **Step 2: Replace `CharacterResponse.cs`**

```csharp
namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterResponse
{
  public Guid Id { get; set; }
  public Guid UserGameId { get; set; }
  public Guid GameId { get; set; }

  public string Platform { get; set; } = default!;
  public string PlatformHandle { get; set; } = default!;
  public string Name { get; set; } = default!;
  public string? ImageUrl { get; set; }
  public string? Bio { get; set; }
  public string? TimeZone { get; set; }
  public string[]? ActiveTimes { get; set; }
  public bool? UsesVoiceChat { get; set; }
  public string[]? Languages { get; set; }
  public string? AdditionalNotes { get; set; }
  public string? GameName { get; set; }
  public string? GameImageUrl { get; set; }

  public DateTime CreatedAt { get; set; }
  public List<CharacterFieldValueDto> GameFields { get; set; } = [];
}
```

- [ ] **Step 3: Replace `CreateCharacterRequest.cs`**

```csharp
using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Character;

public class CreateCharacterRequest
{
    [Required]
    public Guid UserGameId { get; set; }

    [Required]
    [StringLength(100)]
    public string Platform { get; set; } = default!;

    [Required]
    [StringLength(100)]
    public string PlatformHandle { get; set; } = default!;

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = default!;

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

    public List<CharacterFieldValueRequest> GameFields { get; set; } = [];
}
```

- [ ] **Step 4: Replace `UpdateCharacterRequest.cs`**

```csharp
namespace PartyUp.Api.Models.DTOs.Character;

public class UpdateCharacterRequest
{
  public string? Platform { get; set; }
  public string? PlatformHandle { get; set; }
  public string Name { get; set; } = string.Empty;
  public string? ImageUrl { get; set; }
  public string? Bio { get; set; }
  public string? TimeZone { get; set; }
  public string[]? ActiveTimes { get; set; }
  public bool? UsesVoiceChat { get; set; }
  public string[]? Languages { get; set; }
  public string? AdditionalNotes { get; set; }
  public List<CharacterFieldValueRequest>? GameFields { get; set; }
}
```

- [ ] **Step 5: Replace `DiscoverCharacterResponse.cs`**

```csharp
namespace PartyUp.Api.Models.DTOs.Character;

public class DiscoverCharacterResponse
{
  public Guid Id { get; set; }
  public string Name { get; set; } = default!;
  public string Platform { get; set; }
  public string? ImageUrl { get; set; }
  public string? Bio { get; set; }
  public bool? UsesVoiceChat { get; set; }
  public string[]? Languages { get; set; }
  public string? AdditionalNotes { get; set; }
  public string? GameName { get; set; }
  public string? GameImageUrl { get; set; }
  public List<CharacterFieldValueDto> GameFields { get; set; } = [];
}
```

- [ ] **Step 6: Replace `CharacterMatchDto.cs`**

```csharp
using PartyUp.Api.Models.DTOs.Character;

namespace PartyUp.Api.Models.DTOs.CharacterMatch;

public class CharacterMatchDto
{
    public Guid MatchId { get; set; }
    public DateTime MatchedAt { get; set; }
    public CharacterSummaryDto MyCharacter { get; set; } = default!;
    public CharacterResponse TheirCharacter { get; set; } = default!;
    public Guid GameId { get; set; }
    public string GameName { get; set; } = default!;
    public string? GameImageUrl { get; set; }
}

public class CharacterSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? ImageUrl { get; set; }
    public string? Bio { get; set; }
    public string? AdditionalNotes { get; set; }
    public string PlatformHandle { get; set; } = default!;
    public List<CharacterFieldValueDto> GameFields { get; set; } = [];
}
```

- [ ] **Step 7: Verify the project compiles**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: build succeeds (CharacterService and CharacterMatchService will have compile errors — fix in Task 3).

---

## Task 2: Generate and Apply EF Migration

**Files:**
- Create: `apps/api/Migrations/<timestamp>_CharacterModelCleanup.cs` (generated)

- [ ] **Step 1: Generate the migration**

```bash
dotnet ef migrations add CharacterModelCleanup --project apps/api
```

Expected: new migration file created in `apps/api/Migrations/`.

- [ ] **Step 2: Open the generated migration and verify it contains the right operations**

Open the new `*_CharacterModelCleanup.cs` file. The `Up` method must include:
- `migrationBuilder.DropColumn` for: `main_role`, `secondary_role`, `preferred_modes`, `playstyle`, `rank`, `region`
- `migrationBuilder.AddColumn<string>` for `additional_notes` (nullable, maxLength 1000)

If columns are named differently (EF uses snake_case by convention but check), adjust accordingly. The `Down` method should reverse all of these.

- [ ] **Step 3: Apply the migration**

```bash
dotnet ef database update --project apps/api
```

Expected: `Done.`

---

## Task 3: Update CharacterService and CharacterMatchService

**Files:**
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/api/Services/CharacterMatchService.cs`

- [ ] **Step 1: Replace the character creation block in `CharacterService.CreateCharacterAsync`**

In `CreateCharacterAsync`, replace the `new Character { ... }` initializer (currently lines 33–51) with:

```csharp
var character = new Character
{
  Id = Guid.NewGuid(),
  UserGameId = userGameId,
  Platform = request.Platform,
  PlatformHandle = request.PlatformHandle,
  Name = request.Name,
  ImageUrl = request.ImageUrl,
  Bio = request.Bio,
  TimeZone = request.TimeZone,
  ActiveTimes = request.ActiveTimes,
  UsesVoiceChat = request.UsesVoiceChat,
  Languages = request.Languages,
  AdditionalNotes = request.AdditionalNotes,
};
```

- [ ] **Step 2: Replace the update block in `CharacterService.UpdateCharacterAsync`**

In `UpdateCharacterAsync`, replace all the field assignments (currently lines 205–219) with:

```csharp
if (request.Platform != null) character.Platform = request.Platform;
if (request.PlatformHandle != null) character.PlatformHandle = request.PlatformHandle;
character.Name = request.Name;
character.ImageUrl = request.ImageUrl;
character.Bio = request.Bio;
character.TimeZone = request.TimeZone;
character.ActiveTimes = request.ActiveTimes;
character.UsesVoiceChat = request.UsesVoiceChat;
character.Languages = request.Languages;
character.AdditionalNotes = request.AdditionalNotes;
```

- [ ] **Step 3: Replace the discover projection in `CharacterService.DiscoverCharactersAsync`**

In `DiscoverCharactersAsync`, replace the `new DiscoverCharacterResponse { ... }` projection (currently lines 158–185) with:

```csharp
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
```

- [ ] **Step 4: Replace `ToProjection()` in `CharacterService`**

Replace the entire `ToProjection()` expression (currently lines 257–290) with:

```csharp
private static System.Linq.Expressions.Expression<Func<Character, CharacterResponse>> ToProjection() =>
  c => new CharacterResponse
  {
    Id = c.Id,
    UserGameId = c.UserGameId,
    GameId = c.UserGame.GameId,
    Platform = c.Platform,
    PlatformHandle = c.PlatformHandle,
    Name = c.Name,
    ImageUrl = c.ImageUrl,
    Bio = c.Bio,
    TimeZone = c.TimeZone,
    ActiveTimes = c.ActiveTimes,
    UsesVoiceChat = c.UsesVoiceChat,
    Languages = c.Languages,
    AdditionalNotes = c.AdditionalNotes,
    GameName = c.UserGame.Game.Name,
    GameImageUrl = c.UserGame.Game.ImageUrl,
    CreatedAt = c.CreatedAt,
    GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
    {
      FieldDefinitionId = fv.FieldDefinitionId,
      Key = fv.FieldDefinition.Key,
      Label = fv.FieldDefinition.Label,
      Value = fv.Value,
      Type = fv.FieldDefinition.Type.ToString(),
      CommonField = fv.FieldDefinition.CommonField
    }).ToList(),
  };
```

- [ ] **Step 5: Replace `ToSummary` in `CharacterMatchService`**

Replace the `ToSummary` method (currently lines 55–75) with:

```csharp
private static CharacterSummaryDto ToSummary(Character c) => new()
{
    Id = c.Id,
    Name = c.Name,
    ImageUrl = c.ImageUrl,
    Bio = c.Bio,
    AdditionalNotes = c.AdditionalNotes,
    PlatformHandle = c.PlatformHandle,
    GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
    {
        FieldDefinitionId = fv.FieldDefinitionId,
        Key = fv.FieldDefinition.Key,
        Label = fv.FieldDefinition.Label,
        Value = fv.Value,
        Type = fv.FieldDefinition.Type.ToString()
    }).ToList(),
};
```

- [ ] **Step 6: Replace `ToProjection` in `CharacterMatchService`**

Replace the `ToProjection` method (currently lines 77–107) with:

```csharp
private static CharacterResponse ToProjection(Character c) => new()
{
    Id = c.Id,
    UserGameId = c.UserGameId,
    Platform = c.Platform,
    PlatformHandle = c.PlatformHandle,
    Name = c.Name,
    ImageUrl = c.ImageUrl,
    Bio = c.Bio,
    TimeZone = c.TimeZone,
    ActiveTimes = c.ActiveTimes,
    UsesVoiceChat = c.UsesVoiceChat,
    Languages = c.Languages,
    AdditionalNotes = c.AdditionalNotes,
    GameName = c.UserGame.Game.Name,
    GameImageUrl = c.UserGame.Game.ImageUrl,
    CreatedAt = c.CreatedAt,
    GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
    {
        FieldDefinitionId = fv.FieldDefinitionId,
        Key = fv.FieldDefinition.Key,
        Label = fv.FieldDefinition.Label,
        Value = fv.Value,
        Type = fv.FieldDefinition.Type.ToString()
    }).ToList(),
};
```

- [ ] **Step 7: Verify the project compiles**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: build succeeds with zero errors.

- [ ] **Step 8: Commit**

```bash
git add apps/api/Models/ apps/api/Services/CharacterService.cs apps/api/Services/CharacterMatchService.cs apps/api/Migrations/
git commit -m "feat: remove legacy character fields, add AdditionalNotes"
```

---

## Task 4: Integration Test for AdditionalNotes

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`

- [ ] **Step 1: Add the failing test**

Add this test to `CharacterTests` (above the `// ── helpers ──` comment):

```csharp
[Fact]
public async Task CreateCharacter_WithAdditionalNotes_RoundtripsValue()
{
    var client = await CreateAuthenticatedClientAsync();
    var userGame = await AddGameAsync(client);

    var response = await client.PostAsJsonAsync("/api/characters", new
    {
        name = "Notes Character",
        platform = "PC",
        platformHandle = "NotesHandle",
        userGameId = userGame.Id,
        additionalNotes = "Looking for a chill group, play evenings EST."
    });

    response.StatusCode.Should().Be(HttpStatusCode.Created);

    var all = await client.GetFromJsonAsync<List<CharacterWithNotesDto>>("/api/characters");
    all!.Should().ContainSingle(c =>
        c.Name == "Notes Character" &&
        c.AdditionalNotes == "Looking for a chill group, play evenings EST.");
}
```

Add this record alongside the other private records at the bottom of `CharacterTests`:

```csharp
private record CharacterWithNotesDto(Guid Id, string Name, string? AdditionalNotes);
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterTests.CreateCharacter_WithAdditionalNotes"
```

Expected: FAIL — the column doesn't exist yet in the test DB (or the field returns null if migration already applied). If the migration was applied in Task 2, this may already pass — continue to Step 3 either way.

- [ ] **Step 3: Run all character tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterTests"
```

Expected: all pass, including the new test.

- [ ] **Step 4: Commit**

```bash
git add apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs
git commit -m "test: verify AdditionalNotes roundtrips through character API"
```

---

## Task 5: Strengthen Anthropic Voice-Exclusion Prompt

**Files:**
- Modify: `apps/api/Services/AnthropicService.cs`

- [ ] **Step 1: Update the exclusion line in the system prompt**

In `AnthropicService.cs`, find the system prompt exclusion list (currently line 36):

```
- Platform, Character Name, Language, Time zone, Voice chat, Play schedule / active times, Additional Notes
```

Replace it with:

```
- Platform, Character Name, Language, Time zone, Voice chat, microphone, push-to-talk, audio communication preferences, Play schedule / active times, Additional Notes
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/Services/AnthropicService.cs
git commit -m "fix: strengthen Anthropic exclusion for voice/audio fields"
```

---

## Task 6: Update Frontend API Types

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`
- Modify: `apps/web/src/api/endpoints/matches.ts`

- [ ] **Step 1: Replace `characters.ts`**

Replace the entire file with:

```typescript
import { apiDelete, apiGet, apiPost, apiPostForm, apiPut } from "../client";

export type CharacterGameField = {
  fieldDefinitionId: string;
  key: string;
  label: string;
  value: string;
  type: string;
  commonField?: string;
};

export type Character = {
  id: string;
  userGameId?: string;
  gameId?: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameName?: string;
  gameImageUrl?: string;
  gameFields: CharacterGameField[];
};

export type CharacterCreate = {
  userGameId: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameFields?: CharacterFieldValueCreate[];
};

export type CharacterFieldValueCreate = {
  fieldDefinitionId: string;
  value: string;
};

export type CharacterUpdate = {
  platform?: string;
  platformHandle?: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameFields?: CharacterFieldValueCreate[];
};

export type DiscoverCharacter = {
  id: string;
  name: string;
  platform: string;
  imageUrl?: string;
  bio?: string;
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameName?: string;
  gameImageUrl?: string;
  gameFields: CharacterGameField[];
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

export function discoverCharacters(gameId: string, filters?: Record<string, string>, platforms?: string[]) {
  const qs = new URLSearchParams({ gameId, ...filters });
  platforms?.forEach(p => qs.append('platform', p));
  return apiGet<DiscoverCharacter[]>(`/characters/discover?${qs.toString()}`);
}

export function updateCharacter(userGameId: string, characterId: string, data: CharacterUpdate) {
  return apiPut<void>(`/characters/${userGameId}/${characterId}`, data);
}

export function deleteCharacter(userGameId: string, characterId: string) {
  return apiDelete<void>(`/characters/${userGameId}/${characterId}`);
}

export function uploadCharacterImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiPostForm<{ url: string }>("/characters/image", form);
}

export function interactWithCharacter(fromCharacterId: string, toCharacterId: string, type: InteractionType) {
  return apiPost<MatchResponse>("/character-interactions", { fromCharacterId, toCharacterId, type });
}

export function getCharacterById(id: string) {
  return apiGet<Character>(`/characters/${id}`);
}

export function getPendingLikes(characterId: string) {
  return apiGet<DiscoverCharacter[]>(`/character-interactions/pending?characterId=${characterId}`);
}
```

- [ ] **Step 2: Replace `matches.ts`**

```typescript
import { apiGet } from "../client";
import type { Character, CharacterGameField } from "./characters";

export type CharacterSummary = {
  id: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  additionalNotes?: string;
  platformHandle: string;
  gameFields: CharacterGameField[];
};

export type CharacterMatchDto = {
  matchId: string;
  matchedAt: string;
  myCharacter: CharacterSummary;
  theirCharacter: Character;
  gameId: string;
  gameName: string;
  gameImageUrl?: string;
};

export function getMatches(gameId?: string): Promise<CharacterMatchDto[]> {
  const query = gameId ? `?gameId=${gameId}` : "";
  return apiGet<CharacterMatchDto[]>(`/character-matches${query}`);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts apps/web/src/api/endpoints/matches.ts
git commit -m "feat: update frontend API types to remove legacy fields and add additionalNotes"
```

---

## Task 7: Update Frontend Form Types

**Files:**
- Modify: `apps/web/src/components/character-wizard/types.ts`

- [ ] **Step 1: Replace `types.ts`**

```typescript
export const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile']

export const ALL_PLATFORMS: { group: string; platforms: string[] }[] = [
  { group: 'PC / Desktop', platforms: ['PC', 'macOS', 'Linux', 'Steam Deck'] },
  { group: 'Xbox', platforms: ['Xbox One', 'Xbox One S', 'Xbox One X', 'Xbox Series S', 'Xbox Series X'] },
  { group: 'PlayStation', platforms: ['PlayStation 4', 'PlayStation 4 Pro', 'PlayStation 5', 'PlayStation 5 Pro'] },
  { group: 'Nintendo', platforms: ['Nintendo Switch', 'Nintendo Switch Lite', 'Nintendo Switch OLED'] },
  { group: 'Mobile', platforms: ['iOS', 'Android'] },
]

export const ALL_PLATFORM_VALUES = ALL_PLATFORMS.flatMap(g => g.platforms)
export const TIME_ZONES = ['NA East', 'NA Central', 'NA West', 'EU West', 'EU East', 'Brazil', 'Asia Pacific', 'Japan / Korea', 'Oceania']
export const ACTIVE_TIMES = ['Morning', 'Afternoon', 'Evening', 'Late Night']
export const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Russian']

export interface CharacterFormData {
  platform: string
  platformHandle: string
  name: string
  imageUrl: string
  imageFile: File | null
  bio: string
  additionalNotes: string
  timeZone: string
  activeTimes: string[]
  usesVoiceChat: boolean | undefined
  languages: string[]
  gameFields: Record<string, string>
}

export const defaultFormData: CharacterFormData = {
  platform: '',
  platformHandle: '',
  name: '',
  imageUrl: '',
  imageFile: null,
  bio: '',
  additionalNotes: '',
  timeZone: '',
  activeTimes: [],
  usesVoiceChat: undefined,
  languages: [],
  gameFields: {},
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/character-wizard/types.ts
git commit -m "feat: remove legacy fields from CharacterFormData, add additionalNotes"
```

---

## Task 8: Repurpose GameplayStep and Delete DynamicGameplayStep

**Files:**
- Modify: `apps/web/src/components/character-wizard/GameplayStep.tsx`
- Delete: `apps/web/src/components/character-wizard/DynamicGameplayStep.tsx`

- [ ] **Step 1: Replace `GameplayStep.tsx`**

```tsx
import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type GameFieldDefinition } from '../../api/endpoints/games'

interface GameplayStepProps {
  fields: GameFieldDefinition[]
  values: Record<string, string>
  onChange: (fieldId: string, value: string) => void
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function GameplayStep({ fields, values, onChange }: GameplayStepProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm font-mono text-muted text-center py-8">
        No game-specific fields available yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {fields.map(field => {
        const current = values[field.id] ?? ''

        if (field.type === 'Text') {
          return (
            <Input
              key={field.id}
              label={field.label + (field.isRequired ? ' *' : '')}
              value={current}
              onChange={e => onChange(field.id, e.target.value)}
            />
          )
        }

        if (field.type === 'MultiSelect') {
          const selected = current ? current.split('|') : []
          return (
            <div key={field.id}>
              <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
                {field.label}{field.isRequired ? ' *' : ''}
              </p>
              <ToggleButtonGroup
                options={toOptions(field.options)}
                value={selected}
                multiple={true}
                onChange={vals => onChange(field.id, vals.join('|'))}
              />
            </div>
          )
        }

        return (
          <div key={field.id}>
            <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
              {field.label}{field.isRequired ? ' *' : ''}
            </p>
            <ToggleButtonGroup
              options={toOptions(field.options)}
              value={current ? [current] : []}
              multiple={false}
              onChange={vals => onChange(field.id, vals[0] ?? '')}
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Delete `DynamicGameplayStep.tsx`**

```bash
rm apps/web/src/components/character-wizard/DynamicGameplayStep.tsx
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/character-wizard/GameplayStep.tsx
git rm apps/web/src/components/character-wizard/DynamicGameplayStep.tsx
git commit -m "refactor: consolidate DynamicGameplayStep into GameplayStep"
```

---

## Task 9: Update AboutStep

**Files:**
- Modify: `apps/web/src/components/character-wizard/AboutStep.tsx`

- [ ] **Step 1: Replace `AboutStep.tsx`**

```tsx
import { Textarea } from '../ui'
import { type CharacterFormData } from './types'

interface AboutStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
}

export function AboutStep({ data, onChange }: AboutStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <Textarea
        label="Bio"
        placeholder="What kind of player are you? What are you looking for in a teammate?"
        value={data.bio}
        onChange={e => onChange({ bio: e.target.value })}
        maxLength={500}
        rows={6}
      />
      <Textarea
        label="Additional Notes"
        placeholder="Anything else you'd like teammates to know?"
        value={data.additionalNotes}
        onChange={e => onChange({ additionalNotes: e.target.value })}
        maxLength={1000}
        rows={4}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/character-wizard/AboutStep.tsx
git commit -m "feat: add AdditionalNotes textarea to AboutStep"
```

---

## Task 10: Update CreateCharacterWizard

**Files:**
- Modify: `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { useState } from 'react'
import { createCharacter, updateCharacter, uploadCharacterImage } from '../../api/endpoints/characters'
import { useFieldDefinitions } from '../../hooks/useFieldDefinitions'
import { Button } from '../ui'
import { IdentityStep } from './IdentityStep'
import { GameplayStep } from './GameplayStep'
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

const STEPS = ['Identity', 'Gameplay', 'Availability', 'About'] as const

export function CreateCharacterWizard({ userGameId, gameId, platforms, onSuccess, mode = 'create', characterId, initialData }: CreateCharacterWizardProps) {
  const { data: fieldDefs } = useFieldDefinitions(gameId)

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

      const payload = {
        platform: data.platform,
        platformHandle: data.platformHandle.trim(),
        name: data.name.trim(),
        imageUrl,
        bio: data.bio.trim() || undefined,
        additionalNotes: data.additionalNotes.trim() || undefined,
        timeZone: data.timeZone.trim() || undefined,
        activeTimes: data.activeTimes.length > 0 ? data.activeTimes : undefined,
        usesVoiceChat: data.usesVoiceChat,
        languages: data.languages.length > 0 ? data.languages : undefined,
      }

      const validIds = new Set(fieldDefs?.fields.map(f => f.id) ?? [])
      const gameFields = Object.entries(data.gameFields)
        .filter(([id, v]) => v !== '' && validIds.has(id))
        .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value }))

      if (mode === 'edit' && characterId) {
        await updateCharacter(userGameId, characterId, { ...payload, gameFields })
      } else {
        await createCharacter({ userGameId, ...payload, gameFields })
      }
      onSuccess()
    } catch {
      setError(`Failed to ${mode === 'edit' ? 'update' : 'create'} character. Please try again.`)
      setSubmitting(false)
    }
  }

  const isLast = step === STEPS.length - 1

  function renderStep() {
    const label = STEPS[step]
    if (label === 'Identity') return <IdentityStep data={data} onChange={patch} platforms={platforms} />
    if (label === 'Gameplay')
      return (
        <GameplayStep
          fields={fieldDefs?.fields ?? []}
          values={data.gameFields}
          onChange={setGameField}
        />
      )
    if (label === 'Availability') return <AvailabilityStep data={data} onChange={patch} />
    if (label === 'About') return <AboutStep data={data} onChange={patch} />
  }

  return (
    <div className="flex flex-col h-full gap-8 overflow-y-auto"
      style={{ height: 'calc(100vh - 6rem)' }}
    >
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
            ? (mode === 'edit' ? 'Saving...' : 'Creating...')
            : isLast
              ? (mode === 'edit' ? 'Save Changes' : 'Create Character')
              : 'Next'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/character-wizard/CreateCharacterWizard.tsx
git commit -m "refactor: collapse wizard to single Gameplay step, wire additionalNotes"
```

---

## Task 11: Update SwipeCard

**Files:**
- Modify: `apps/web/src/components/cards/SwipeCard.tsx`

- [ ] **Step 1: Replace `SwipeBack`**

Replace the entire `SwipeBack` function (lines 54–139 in the current file) with:

```tsx
function SwipeBack({ character }: { character: DiscoverCharacter }) {
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: '#000', border: '4px solid black' }}
    >
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <p className="font-display font-bold text-text text-lg mb-3">{character.name}</p>
        {character.usesVoiceChat != null && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-0.5">Voice</span>
            <Badge>{character.usesVoiceChat ? 'Yes' : 'No'}</Badge>
          </div>
        )}
        {character.languages && character.languages.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Languages</span>
            <div className="flex flex-wrap gap-1">
              {character.languages.map(l => <Badge key={l}>{l}</Badge>)}
            </div>
          </div>
        )}
        {character.gameFields.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Game Fields</span>
            <div className="grid grid-cols-1 gap-1">
              {character.gameFields.map(f => (
                <div key={f.key} className="text-xs">
                  <span className="text-muted">{f.label}: </span>
                  <span className="text-text break-all">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {character.bio && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Bio</span>
            <p className="text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}
        {character.additionalNotes && (
          <div>
            <span className="text-xs text-muted block mb-1">Notes</span>
            <p className="text-sm text-text leading-relaxed">{character.additionalNotes}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/SwipeCard.tsx
git commit -m "feat: remove legacy badges from SwipeBack, add additionalNotes"
```

---

## Task 12: Update MatchCard

**Files:**
- Modify: `apps/web/src/components/cards/MatchCard.tsx`

- [ ] **Step 1: Replace `MatchBack`**

Replace the entire `MatchBack` function (lines 41–114 in the current file) with:

```tsx
function MatchBack({ character, gameName, matchedAt, matchId }: MatchCardProps) {
  const navigate = useNavigate()
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden border-black border-[6px]"
    >
      <div className="px-4 py-3 flex-1 overflow-y-auto overflow-x-hidden">
        <p className="font-display font-bold text-text text-lg">{character.platformHandle}</p>
        <p className="text-sm text-muted mb-1">{character.name}</p>
        <p className="text-sm text-muted mb-1">{gameName}</p>
        <p className="text-sm text-muted mb-3">{character.platform}</p>
        {character.gameFields.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Game Fields</span>
            <div className="grid grid-cols-1 gap-1">
              {character.gameFields.map(f => (
                <div key={f.key} className="text-xs">
                  <span className="text-muted">{f.label}: </span>
                  <span className="text-text">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {character.bio && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Bio</span>
            <p className="text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}
        {character.additionalNotes && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Notes</span>
            <p className="text-sm text-text leading-relaxed">{character.additionalNotes}</p>
          </div>
        )}
        <p className="text-xs text-muted mt-3">Matched {date}</p>
      </div>
      <div className="px-4 pb-2 flex justify-end" style={{ position: 'relative', zIndex: 20 }}>
        <Button size="sm" variant="ghost" onClick={() => navigate(`/matches?id=${matchId}`)}>
          View Match →
        </Button>
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/MatchCard.tsx
git commit -m "feat: remove legacy badges from MatchBack, add additionalNotes"
```

---

## Task 13: Update CharacterPage and MatchesPage

**Files:**
- Modify: `apps/web/src/pages/CharacterPage.tsx`
- Modify: `apps/web/src/pages/MatchesPage.tsx`

- [ ] **Step 1: Replace `toFormData` in `CharacterPage.tsx`**

Replace the `toFormData` function (lines 13–33 in the current file) with:

```tsx
function toFormData(c: Character): Partial<CharacterFormData> {
  return {
    platform: c.platform ?? '',
    platformHandle: c.platformHandle ?? '',
    name: c.name ?? '',
    imageUrl: c.imageUrl ?? '',
    imageFile: null,
    bio: c.bio ?? '',
    additionalNotes: c.additionalNotes ?? '',
    timeZone: c.timeZone ?? '',
    activeTimes: c.activeTimes ?? [],
    usesVoiceChat: c.usesVoiceChat,
    languages: c.languages ?? [],
    gameFields: Object.fromEntries((c.gameFields ?? []).map(f => [f.fieldDefinitionId, f.value])),
  }
}
```

- [ ] **Step 2: Remove legacy badge block from `MatchCharacterDetail` in `MatchesPage.tsx`**

In `MatchesPage.tsx`, replace the `MatchCharacterDetail` function (lines 10–54 in the current file) with:

```tsx
function MatchCharacterDetail({ character }: { character: CharacterSummary }) {
  return (
    <div className="flex gap-3">
      <div
        className="w-20 h-24 rounded-lg overflow-hidden flex-shrink-0"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-2xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-text text-sm">{character.platformHandle}</p>
        <p className="text-xs text-muted mb-2">{character.name}</p>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-3 leading-relaxed">{character.bio}</p>
        )}
        {character.additionalNotes && (
          <p className="text-xs text-muted line-clamp-2 leading-relaxed mt-1">{character.additionalNotes}</p>
        )}
        {character.gameFields.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {character.gameFields.map(f => (
              <p key={f.key} className="text-xs">
                <span className="text-muted">{f.label}: </span>
                <span className="text-text">{f.value}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/CharacterPage.tsx apps/web/src/pages/MatchesPage.tsx
git commit -m "feat: update CharacterPage and MatchesPage for model cleanup"
```

---

## Task 14: Update LandingPage Copy

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx`

- [ ] **Step 1: Update the stale copy**

In `LandingPage.tsx`, find the steps array near the top. Replace the step 2 entry:

Current:
```tsx
{ n: 2, title: 'Build your character', body: 'Set your role, rank, playstyle, and availability.' },
```

Replace with:
```tsx
{ n: 2, title: 'Build your character', body: 'Fill out game-specific fields, set your availability, and write your bio.' },
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/LandingPage.tsx
git commit -m "chore: update landing page copy to reflect dynamic field system"
```

---

## Task 15: Update ScaleSeeder and Run Tests

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Seeders/ScaleSeeder.cs`

- [ ] **Step 1: Remove `Playstyle` and `PreferredModes` from the character seed block**

In `ScaleSeeder.cs`, replace the `new Character { ... }` block (currently lines 59–69) with:

```csharp
var character = new Character
{
    Id = Guid.NewGuid(),
    UserGameId = userGame.Id,
    Platform = Pick("PC", "PlayStation", "Xbox"),
    PlatformHandle = $"ESO_Player_{i:D3}",
    Name = $"Character_{i:D3}",
    Bio = $"Veteran ESO player #{i}.",
};
```

- [ ] **Step 2: Run all tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/tests/PartyUp.Api.Tests/Seeders/ScaleSeeder.cs
git commit -m "chore: remove legacy fields from ScaleSeeder"
```

---

## Self-Review Notes

- `CharacterSummaryDto` (`CharacterMatchDto.cs`) doesn't have `PreferredModes` — only 5 fields removed there. This matches the current backend shape.
- `HardcodedSchemas.cs` is untouched — its `rank`/`region` entries are `GameFieldDefinition` records for Valorant dynamic fields, not references to the `Character` model columns.
- `CharacterMatchService.ToProjection` returns a `CharacterResponse`, which is updated in Task 1 — covered.
- The `loadingFields` spinner in the old wizard is removed since the single-path wizard doesn't branch on field availability — fields load in the background and show in the Gameplay step naturally.
