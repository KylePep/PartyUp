# Character Card Game Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface game name on all character cards so any card is identifiable by game at a glance, and move platform to the subtitle zone alongside game name.

**Architecture:** Backend adds `GameName`/`GameImageUrl` to `CharacterResponse` via a navigation join in `ToProjection()`. Frontend type picks them up, and `CharacterCard`/`CharacterDetailCard` update their layout: subtitle becomes `game · platform`, and region/language move from subtitle into the stats bar.

**Tech Stack:** ASP.NET Core 8 / EF Core (backend), React + TypeScript / Vite (frontend), xUnit integration tests

---

## Files

- Modify: `apps/api/Models/DTOs/Character/CharacterResponse.cs`
- Modify: `apps/api/Services/CharacterService.cs` (lines 256–285 — `ToProjection`)
- Modify: `apps/web/src/api/endpoints/characters.ts` (lines 11–30 — `Character` type)
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`
- Modify: `apps/web/src/components/cards/CharacterDetailCard.tsx`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs` (extend `GetMyCharacters_ReturnsCharacters`)

---

### Task 1: Backend — add GameName/GameImageUrl to CharacterResponse

**Files:**
- Modify: `apps/api/Models/DTOs/Character/CharacterResponse.cs`
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`

- [ ] **Step 1: Write the failing test**

  In `CharacterTests.cs`, add this test and extend the `CharacterDto` record at the bottom of the file:

  ```csharp
  [Fact]
  public async Task GetMyCharacters_ReturnsGameName()
  {
      var client = await CreateAuthenticatedClientAsync();
      var userGame = await AddGameAsync(client);

      await client.PostAsJsonAsync("/api/characters", new
      {
          name = "Game Name Test",
          platform = "PC",
          platformHandle = "TestHandle",
          userGameId = userGame.Id
      });

      var response = await client.GetAsync("/api/characters");
      var characters = await response.Content.ReadFromJsonAsync<List<CharacterWithGameDto>>();
      characters.Should().ContainSingle(c => c.GameName == userGame.GameName);
  }
  ```

  Also add this record at the bottom of the class (alongside the existing private records):

  ```csharp
  private record CharacterWithGameDto(Guid Id, string Name, string? GameName);
  ```

  > **Note:** The game name is set to `$"Game {id}"` in `AddGameAsync` — look at line 169 where it passes `name = $"Game {id}"`. The `GameId` is on `UserGameDto` which is returned by `AddGameAsync`.

- [ ] **Step 2: Run the test to confirm it fails**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests --filter "GetMyCharacters_ReturnsGameName" -v
  ```

  Expected: FAIL — the deserialized DTO will have `GameName = null` because the field doesn't exist yet.

- [ ] **Step 3: Add properties to CharacterResponse.cs**

  In `apps/api/Models/DTOs/Character/CharacterResponse.cs`, add two properties after `Region`:

  ```csharp
  public string? Region { get; set; }
  public string? GameName { get; set; }
  public string? GameImageUrl { get; set; }

  public DateTime CreatedAt { get; set; }
  ```

- [ ] **Step 4: Update ToProjection() in CharacterService.cs**

  In `apps/api/Services/CharacterService.cs`, extend the `ToProjection()` expression to populate the new fields. The full updated expression (replace lines 256–285):

  ```csharp
  private static System.Linq.Expressions.Expression<Func<Character, CharacterResponse>> ToProjection() =>
    c => new CharacterResponse
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

  > **Note:** No `.Include()` is needed. EF Core `Select()` projections generate the JOIN automatically from navigation properties in the expression tree.

- [ ] **Step 5: Run the test to confirm it passes**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests --filter "GetMyCharacters_ReturnsGameName" -v
  ```

  Expected: PASS

- [ ] **Step 6: Run all tests**

  ```
  dotnet test apps/tests/PartyUp.Api.Tests -v
  ```

  Expected: All tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/api/Models/DTOs/Character/CharacterResponse.cs
  git add apps/api/Services/CharacterService.cs
  git add apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs
  git commit -m "feat: add GameName and GameImageUrl to CharacterResponse"
  ```

---

### Task 2: Frontend — add gameName to Character type

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`

- [ ] **Step 1: Add fields to the Character type**

  In `apps/web/src/api/endpoints/characters.ts`, update the `Character` type (lines 11–30):

  ```typescript
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
    gameName?: string;
    gameImageUrl?: string;
    gameFields: CharacterGameField[];
  };
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```
  npm run build --prefix apps/web
  ```

  Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/api/endpoints/characters.ts
  git commit -m "feat: add gameName and gameImageUrl to Character type"
  ```

---

### Task 3: CharacterCard — subtitle and stats bar

**Files:**
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`

- [ ] **Step 1: Update CharacterCard.tsx**

  Replace the full file content of `apps/web/src/components/cards/CharacterCard.tsx`:

  ```typescript
  import { useNavigate } from 'react-router-dom'
  import { Badge, Button } from '../ui'
  import type { Character } from '../../api/endpoints/characters'
  import { StandardTcgCard } from './StandardTcgCard'

  interface CharacterCardProps {
    character: Character
    onEdit?: (character: Character) => void
    onDelete?: (character: Character) => void
    onSelect?: (character: Character) => void
  }

  export function CharacterCard({ character, onEdit, onDelete, onSelect }: CharacterCardProps) {
    const navigate = useNavigate()

    function handleClick() {
      if (onSelect) onSelect(character)
      else navigate(`/characters/${character.id}`)
    }

    const subtitle = [character.gameName, character.platform].filter(Boolean).join(' · ') || undefined

    const hasStats = character.mainRole || character.rank || character.usesVoiceChat != null || character.region || character.languages?.length
    const statsLine = hasStats ? (
      <div className="flex flex-wrap gap-1.5">
        {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
        {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        {character.usesVoiceChat != null && (
          <Badge>{character.usesVoiceChat ? 'Voice ✓' : 'Voice ✗'}</Badge>
        )}
        {character.region && <Badge variant="region">{character.region}</Badge>}
        {character.languages?.[0] && <Badge>{character.languages[0]}</Badge>}
      </div>
    ) : undefined

    return (
      <StandardTcgCard
        name={character.name}
        subtitle={subtitle}
        imageUrl={character.imageUrl}
        statsLine={statsLine}
        textBody={character.bio ? <p className="text-xs text-muted line-clamp-3">{character.bio}</p> : undefined}
        onClick={handleClick}
      >
        {(onEdit || onDelete) && (
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {onEdit && (
              <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => onEdit(character)}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="secondary"
                className="text-xs px-2 py-1 text-danger border-danger/50 hover:bg-danger hover:text-white"
                onClick={() => onDelete(character)}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </StandardTcgCard>
    )
  }
  ```

  Key changes:
  - `subtitle`: now `gameName · platform`
  - `platform` prop removed from `StandardTcgCard` (header right is empty, reserved for class)
  - Stats bar: added `region` badge and first `language` badge

- [ ] **Step 2: Verify TypeScript compiles**

  ```
  npm run build --prefix apps/web
  ```

  Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/components/cards/CharacterCard.tsx
  git commit -m "feat: show game name and platform in CharacterCard subtitle"
  ```

---

### Task 4: CharacterDetailCard — add game name

**Files:**
- Modify: `apps/web/src/components/cards/CharacterDetailCard.tsx`

- [ ] **Step 1: Add game name to the hero section**

  In `apps/web/src/components/cards/CharacterDetailCard.tsx`, find the hero section (inside the `<div className="flex-1 min-w-0">` block around line 61). Update it to show game name above platform:

  ```typescript
  <div className="flex-1 min-w-0">
    <h1 className="font-display font-bold text-2xl text-text mb-1">{character.name}</h1>
    {character.platformHandle && (
      <p className="font-mono text-muted text-sm mb-1">{character.platformHandle}</p>
    )}
    {character.gameName && (
      <p className="text-xs text-accent font-display mb-0.5">{character.gameName}</p>
    )}
    <p className="text-xs text-muted mb-3">{character.platform}</p>
    <div className="flex flex-wrap gap-1.5">
      {character.usesVoiceChat && <Badge variant="role">{character.usesVoiceChat ? 'Voice Chat' : 'No Voice Chat'}</Badge>}
      {character.languages && character.languages.length > 0 && (
        <>
          {character.languages.map(l => <Badge key={l}>{l}</Badge>)}
        </>
      )}
      {character.timeZone && <Badge variant="region">{character.timeZone}</Badge>}
      {character.activeTimes && <Badge variant="region">{character.activeTimes}</Badge>}
    </div>
  </div>
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```
  npm run build --prefix apps/web
  ```

  Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/components/cards/CharacterDetailCard.tsx
  git commit -m "feat: show game name in CharacterDetailCard hero"
  ```
