# commonField Card Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface `commonField` through character field value responses and use it in `CharacterCard` to render game name + class in the stats line and level in the bottom stat.

**Architecture:** `CharacterFieldValueDto` gains a nullable `CommonField` string, mapped from the already-populated `FieldDefinition.CommonField` in both service projections. The frontend type and `CharacterCard` are updated to consume it. No new routes, no migrations, no new components.

**Tech Stack:** C# / ASP.NET Core 8, EF Core, xUnit + FluentAssertions, React + TypeScript

---

## File Map

| File | Change |
|---|---|
| `apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs` | Add `string? CommonField` |
| `apps/api/Services/CharacterService.cs:175-182` | Add `CommonField` to discover projection |
| `apps/api/Services/CharacterService.cs:279-286` | Add `CommonField` to character projection |
| `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterFieldValueTests.cs` | Update `GameFieldDto` record; add new test |
| `apps/web/src/api/endpoints/characters.ts` | Add `commonField?: string` to `CharacterGameField` |
| `apps/web/src/components/cards/CharacterCard.tsx` | Derive slots; update statsLine, bottomStat, subtitle |

---

## Task 1: Write failing backend test

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterFieldValueTests.cs`

- [ ] **Step 1: Update the `GameFieldDto` record to include `CommonField`**

At the bottom of `CharacterFieldValueTests.cs`, replace the private records:

```csharp
private record UserGameDto(Guid Id, Guid GameId);
private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
private record CharacterResponseDto(Guid Id, string Name);
private record GameFieldDto(Guid FieldDefinitionId, string Key, string Label, string Value, string Type, string? CommonField = null);
private record CharacterWithFieldsDto(Guid Id, string Name, List<GameFieldDto> GameFields);
```

- [ ] **Step 2: Add the new test**

Add this test inside the `CharacterFieldValueTests` class, after `GetMyCharacters_ReturnsGameFields_WhenFieldDefinitionsExist`:

```csharp
[Fact]
public async Task GetMyCharacters_ReturnsCommonField_WhenFieldDefinitionHasCommonField()
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
    var userGame = (await addGameResponse.Content.ReadFromJsonAsync<AddGameResultDto>())!.UserGame;

    Guid jobFieldId;
    using (var scope = Factory.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var game = await db.Games.FindAsync(userGame!.GameId);
        game!.SchemaStatus = SchemaStatus.Generated;

        var field = new GameFieldDefinition
        {
            Id = Guid.NewGuid(),
            GameId = userGame.GameId,
            Key = "job",
            Label = "Job",
            Type = FieldType.Select,
            Options = ["Paladin", "Warrior", "White Mage"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = 1,
            CommonField = "class_slot"
        };
        jobFieldId = field.Id;
        db.GameFieldDefinitions.Add(field);
        await db.SaveChangesAsync();
    }

    await client.PostAsJsonAsync("/api/characters", new
    {
        name = "FFXIV Character",
        platform = "PC",
        platformHandle = "FFPlayer",
        userGameId = userGame!.Id,
        gameFields = new[]
        {
            new { fieldDefinitionId = jobFieldId, value = "Paladin" }
        }
    });

    var response = await client.GetAsync("/api/characters");
    response.StatusCode.Should().Be(HttpStatusCode.OK);

    var characters = await response.Content.ReadFromJsonAsync<List<CharacterWithFieldsDto>>();
    var target = characters!.Single(c => c.Name == "FFXIV Character");
    var gameField = target.GameFields.Should().ContainSingle().Subject;
    gameField.Key.Should().Be("job");
    gameField.Value.Should().Be("Paladin");
    gameField.CommonField.Should().Be("class_slot");
}
```

- [ ] **Step 3: Run test to verify it fails**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~GetMyCharacters_ReturnsCommonField"
```

Expected: FAIL — `gameField.CommonField` is null (property not yet in DTO).

---

## Task 2: Add `CommonField` to `CharacterFieldValueDto` and both service projections

**Files:**
- Modify: `apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs`
- Modify: `apps/api/Services/CharacterService.cs`

- [ ] **Step 1: Add property to `CharacterFieldValueDto`**

Full file after change:

```csharp
namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterFieldValueDto
{
    public Guid FieldDefinitionId { get; set; }
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
    public string Value { get; set; } = default!;
    public string Type { get; set; } = default!;
    public string? CommonField { get; set; }
}
```

- [ ] **Step 2: Update the discover projection in `CharacterService` (~line 175)**

Find the block that looks like:

```csharp
GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
{
  FieldDefinitionId = fv.FieldDefinitionId,
  Key = fv.FieldDefinition.Key,
  Label = fv.FieldDefinition.Label,
  Value = fv.Value,
  Type = fv.FieldDefinition.Type.ToString()
}).ToList(),
```

Replace with:

```csharp
GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
{
  FieldDefinitionId = fv.FieldDefinitionId,
  Key = fv.FieldDefinition.Key,
  Label = fv.FieldDefinition.Label,
  Value = fv.Value,
  Type = fv.FieldDefinition.Type.ToString(),
  CommonField = fv.FieldDefinition.CommonField
}).ToList(),
```

- [ ] **Step 3: Update the character projection in `CharacterService` (~line 279)**

Find the second identical block:

```csharp
GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
{
  FieldDefinitionId = fv.FieldDefinitionId,
  Key = fv.FieldDefinition.Key,
  Label = fv.FieldDefinition.Label,
  Value = fv.Value,
  Type = fv.FieldDefinition.Type.ToString()
}).ToList(),
```

Replace with:

```csharp
GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
{
  FieldDefinitionId = fv.FieldDefinitionId,
  Key = fv.FieldDefinition.Key,
  Label = fv.FieldDefinition.Label,
  Value = fv.Value,
  Type = fv.FieldDefinition.Type.ToString(),
  CommonField = fv.FieldDefinition.CommonField
}).ToList(),
```

---

## Task 3: Run backend tests and commit

**Files:** none

- [ ] **Step 1: Run the new test**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~GetMyCharacters_ReturnsCommonField"
```

Expected: `Passed! - Failed: 0, Passed: 1`

- [ ] **Step 2: Run the full test suite**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs \
        apps/api/Services/CharacterService.cs \
        apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterFieldValueTests.cs
git commit -m "feat: include commonField in character field value responses"
```

---

## Task 4: Add `commonField` to frontend type

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`

- [ ] **Step 1: Add `commonField` to `CharacterGameField`**

In `apps/web/src/api/endpoints/characters.ts`, update the type:

```typescript
export type CharacterGameField = {
  fieldDefinitionId: string;
  key: string;
  label: string;
  value: string;
  type: string;
  commonField?: string;
};
```

- [ ] **Step 2: Verify the project builds without TypeScript errors**

```
npm run build --prefix apps/web
```

Expected: Build succeeds with no type errors.

---

## Task 5: Update `CharacterCard` rendering

**Files:**
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`

- [ ] **Step 1: Derive slots and update rendering**

Replace the full contents of `apps/web/src/components/cards/CharacterCard.tsx` with:

```tsx
import { useNavigate } from 'react-router-dom'
import type { Character } from '../../api/endpoints/characters'
import { StandardTcgCard } from './StandardTcgCard'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
  onSelect?: (character: Character) => void
}

export function CharacterCard({ character, onSelect }: CharacterCardProps) {
  const navigate = useNavigate()

  function handleClick() {
    if (onSelect) onSelect(character)
    else navigate(`/characters/${character.id}`)
  }

  const classField = character.gameFields.find(gf => gf.commonField === 'class_slot')
  const levelField = character.gameFields.find(gf => gf.commonField === 'level_slot')

  const statsContent = [character.gameName, classField?.value].filter(Boolean).join(' · ')
  const statsLine = statsContent ? (
    <span className="text-xs text-muted font-semibold">{statsContent}</span>
  ) : undefined

  return (
    <StandardTcgCard
      name={character.name}
      platform={character.platform}
      imageUrl={character.imageUrl}
      statsLine={statsLine}
      textBody={character.bio ? <p className="text-xs text-muted line-clamp-3">{character.bio}</p> : undefined}
      bottomStat={levelField?.value}
      onClick={handleClick}
    />
  )
}
```

Note: `subtitle` is intentionally not passed — the prop remains in `StandardTcgCard` for future use (e.g. platform handle).

- [ ] **Step 2: Verify no TypeScript errors**

```
npm run build --prefix apps/web
```

Expected: Build succeeds.

---

## Task 6: Commit frontend changes

- [ ] **Step 1: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts \
        apps/web/src/components/cards/CharacterCard.tsx
git commit -m "feat: render class and level commonField slots on CharacterCard"
```
