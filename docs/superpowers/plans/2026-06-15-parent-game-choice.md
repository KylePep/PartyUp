# Parent Game Choice Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace silent auto-redirect to parent game with an informed user choice flow — a preview endpoint reveals both game options with realm counts, and a modal lets the user pick before the game is added.

**Architecture:** A new read-only `GET /api/games/parent-preview` endpoint resolves parent info and counts without committing anything. `addUserGame` gains a `skipParentRedirect` flag so the user's explicit choice is always respected. A new `ParentChoiceModal` component shows two `FullArtTcgCard` instances side-by-side; `ScryingOrb.confirmAdd` fetches the preview first and opens the modal when a parent is found.

**Tech Stack:** ASP.NET Core 8 (C#), React + TypeScript + Vite, xUnit integration tests hitting real DB, `FullArtTcgCard` from `apps/web/src/components/cards/`

---

## File Map

### Backend — create
- `apps/api/Models/DTOs/Game/GamePreviewDto.cs`
- `apps/api/Models/DTOs/Game/ParentPreviewResponse.cs`

### Backend — modify
- `apps/api/Models/DTOs/UserGame/AddUserGameRequest.cs` — add `SkipParentRedirect` field
- `apps/api/Services/Interfaces/IGameService.cs` — add `GetParentPreview` signature
- `apps/api/Services/GameService.cs` — implement `GetParentPreview`
- `apps/api/Services/UserGameService.cs` — honor `SkipParentRedirect` in `AddGameToUser`
- `apps/api/Controllers/GamesController.cs` — add `parent-preview` action

### Tests — create
- `apps/tests/PartyUp.Api.Tests/Features/Games/ParentPreviewTests.cs`

### Tests — modify
- `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs` — add skip-redirect test

### Frontend — modify
- `apps/web/src/api/endpoints/games.ts` — add types + `getParentPreview`
- `apps/web/src/api/endpoints/userGames.ts` — add `skipParentRedirect` to payload type
- `apps/web/src/components/orb/ScryingOrb.tsx` — two-step confirm flow

### Frontend — create
- `apps/web/src/components/ParentChoiceModal.tsx`

---

## Task 1: Backend DTOs

**Files:**
- Create: `apps/api/Models/DTOs/Game/GamePreviewDto.cs`
- Create: `apps/api/Models/DTOs/Game/ParentPreviewResponse.cs`
- Modify: `apps/api/Models/DTOs/UserGame/AddUserGameRequest.cs`

- [ ] **Step 1: Create GamePreviewDto**

Create `apps/api/Models/DTOs/Game/GamePreviewDto.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Game;

public class GamePreviewDto
{
    public int ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int RealmCount { get; set; }
}
```

- [ ] **Step 2: Create ParentPreviewResponse**

Create `apps/api/Models/DTOs/Game/ParentPreviewResponse.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Game;

public class ParentPreviewResponse
{
    public GamePreviewDto SelectedGame { get; set; } = null!;
    public GamePreviewDto? ParentGame { get; set; }
}
```

- [ ] **Step 3: Add SkipParentRedirect to AddUserGameRequest**

Replace the entire contents of `apps/api/Models/DTOs/UserGame/AddUserGameRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.UserGame;

public record AddUserGameRequest(
    [Required] int ExternalId,
    [Required][StringLength(200, MinimumLength = 1)] string Name,
    [StringLength(500)] string? ImageUrl,
    bool SkipParentRedirect = false
);
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/Models/DTOs/Game/GamePreviewDto.cs
git add apps/api/Models/DTOs/Game/ParentPreviewResponse.cs
git add apps/api/Models/DTOs/UserGame/AddUserGameRequest.cs
git commit -m "feat: add GamePreviewDto, ParentPreviewResponse DTOs and SkipParentRedirect flag"
```

---

## Task 2: IGameService + GameService.GetParentPreview

**Files:**
- Modify: `apps/api/Services/Interfaces/IGameService.cs`
- Modify: `apps/api/Services/GameService.cs`

- [ ] **Step 1: Write the failing test**

Create `apps/tests/PartyUp.Api.Tests/Features/Games/ParentPreviewTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Games;

public class ParentPreviewTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _idCounter = 92_000;

    public ParentPreviewTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task ParentPreview_GameWithParent_ReturnsBothGames()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/games/parent-preview?externalId=91001");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<ParentPreviewDto>();
        result!.SelectedGame.ExternalId.Should().Be(91001);
        result.SelectedGame.Name.Should().Be("Game 91001");
        result.ParentGame.Should().NotBeNull();
        result.ParentGame!.ExternalId.Should().Be(91000);
        result.ParentGame.Name.Should().Be("Game 91000");
    }

    [Fact]
    public async Task ParentPreview_GameWithoutParent_ReturnsNullParentGame()
    {
        var client = await CreateAuthenticatedClientAsync();
        var id = Interlocked.Increment(ref _idCounter);

        var response = await client.GetAsync($"/api/games/parent-preview?externalId={id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<ParentPreviewDto>();
        result!.SelectedGame.ExternalId.Should().Be(id);
        result.ParentGame.Should().BeNull();
    }

    [Fact]
    public async Task ParentPreview_RealmCount_ReflectsExistingUserGames()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        // clientA adds 91001 → redirected to 91000; clientB adds 91000 directly
        await clientA.PostAsJsonAsync("/api/user-games", new
        {
            externalId = 91001,
            name = "Game 91001",
            imageUrl = (string?)null
        });
        await clientB.PostAsJsonAsync("/api/user-games", new
        {
            externalId = 91000,
            name = "Game 91000",
            imageUrl = (string?)null
        });

        var client = await CreateAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/games/parent-preview?externalId=91001");
        var result = await response.Content.ReadFromJsonAsync<ParentPreviewDto>();

        result!.SelectedGame.RealmCount.Should().Be(0); // no one in 91001 directly
        result.ParentGame!.RealmCount.Should().Be(2);   // clientA + clientB in 91000
    }

    [Fact]
    public async Task ParentPreview_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/games/parent-preview?externalId=91001");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private record ParentPreviewDto(GamePreviewItemDto SelectedGame, GamePreviewItemDto? ParentGame);
    private record GamePreviewItemDto(int ExternalId, string Name, string? ImageUrl, int RealmCount);
}
```

- [ ] **Step 2: Run tests — expect failure (endpoint doesn't exist yet)**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~ParentPreviewTests" -v minimal
```

Expected: All 4 tests fail (404 or compile error because `GetParentPreview` doesn't exist).

- [ ] **Step 3: Add GetParentPreview to IGameService**

In `apps/api/Services/Interfaces/IGameService.cs`, add the new method signature after `GetPopularGames`:

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;

public interface IGameService
{
  Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, bool? exclude_additions, List<string>? tags);
  Task<Game?> GetGameById(int id);
  Task<Game?> GetGameByDbId(Guid id);
  Task<Game?> getGameByExternalId(int id);
  Task<Game?> GetAndPersistGameDetails(int id);
  Task TryPopulateParentExternalId(Game game);
  Task<IEnumerable<PopularGameResult>> GetPopularGames(int limit);
  Task<ParentPreviewResponse?> GetParentPreview(int externalId);
}
```

- [ ] **Step 4: Implement GetParentPreview in GameService**

In `apps/api/Services/GameService.cs`, add the following method at the end of the class (before the closing `}`):

```csharp
public async Task<ParentPreviewResponse?> GetParentPreview(int externalId)
{
    var existingSelected = await getGameByExternalId(externalId);
    if (existingSelected != null && !existingSelected.ParentExternalId.HasValue)
        await TryPopulateParentExternalId(existingSelected);

    var selectedGame = existingSelected ?? await GetAndPersistGameDetails(externalId);
    if (selectedGame == null)
        return null;

    var selectedCount = await _db.UserGames.CountAsync(ug => ug.GameId == selectedGame.Id);

    var selectedDto = new GamePreviewDto
    {
        ExternalId = selectedGame.ExternalId,
        Name = selectedGame.Name,
        ImageUrl = selectedGame.ImageUrl,
        RealmCount = selectedCount
    };

    if (!selectedGame.ParentExternalId.HasValue)
        return new ParentPreviewResponse { SelectedGame = selectedDto, ParentGame = null };

    var existingParent = await getGameByExternalId(selectedGame.ParentExternalId.Value);
    var parentGame = existingParent ?? await GetAndPersistGameDetails(selectedGame.ParentExternalId.Value);

    if (parentGame == null)
        return new ParentPreviewResponse { SelectedGame = selectedDto, ParentGame = null };

    var parentCount = await _db.UserGames.CountAsync(ug => ug.GameId == parentGame.Id);

    return new ParentPreviewResponse
    {
        SelectedGame = selectedDto,
        ParentGame = new GamePreviewDto
        {
            ExternalId = parentGame.ExternalId,
            Name = parentGame.Name,
            ImageUrl = parentGame.ImageUrl,
            RealmCount = parentCount
        }
    };
}
```

- [ ] **Step 5: Add the parent-preview endpoint to GamesController**

In `apps/api/Controllers/GamesController.cs`, add the following action after `GetPopular`:

```csharp
[Authorize]
[EnableRateLimiting("game-search")]
[HttpGet("parent-preview")]
public async Task<IActionResult> GetParentPreview([FromQuery] int externalId)
{
    var result = await _service.GetParentPreview(externalId);
    if (result == null)
        return NotFound();
    return Ok(result);
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~ParentPreviewTests" -v minimal
```

Expected: All 4 tests pass.

- [ ] **Step 7: Run full test suite to check for regressions**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/Services/Interfaces/IGameService.cs
git add apps/api/Services/GameService.cs
git add apps/api/Controllers/GamesController.cs
git add apps/tests/PartyUp.Api.Tests/Features/Games/ParentPreviewTests.cs
git commit -m "feat: add GET /api/games/parent-preview endpoint"
```

---

## Task 3: UserGameService — honor SkipParentRedirect

**Files:**
- Modify: `apps/api/Services/UserGameService.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`

- [ ] **Step 1: Write the failing test**

In `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`, add this test after `AddGame_CanonicalGame_NotRedirected`:

```csharp
[Fact]
public async Task AddGame_WithSkipParentRedirect_DoesNotRedirect()
{
    var client = await CreateAuthenticatedClientAsync();

    // 91001 has parent 91000, but skipParentRedirect=true means we add 91001 directly
    var response = await client.PostAsJsonAsync("/api/user-games", new
    {
        externalId = 91001,
        name = "Game 91001",
        imageUrl = (string?)null,
        skipParentRedirect = true
    });

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<AddGameResultDto>();
    result!.Redirected.Should().BeFalse();
    result.UserGame.GameName.Should().Be("Game 91001");
}
```

- [ ] **Step 2: Run test — expect failure**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AddGame_WithSkipParentRedirect_DoesNotRedirect" -v minimal
```

Expected: FAIL — `Redirected` is `true` because `SkipParentRedirect` is ignored.

- [ ] **Step 3: Honor SkipParentRedirect in UserGameService**

In `apps/api/Services/UserGameService.cs`, find the block starting at line 50:

```csharp
if (selectedGame.ParentExternalId.HasValue)
{
```

Change the condition to also check `SkipParentRedirect`:

```csharp
if (!request.SkipParentRedirect && selectedGame.ParentExternalId.HasValue)
{
```

The `else` branch already sets `canonicalGame = selectedGame`, so no other changes are needed.

- [ ] **Step 4: Run test — expect pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AddGame_WithSkipParentRedirect_DoesNotRedirect" -v minimal
```

Expected: PASS.

- [ ] **Step 5: Run full test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All tests pass (existing redirect tests still pass because `SkipParentRedirect` defaults to `false`).

- [ ] **Step 6: Commit**

```bash
git add apps/api/Services/UserGameService.cs
git add apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs
git commit -m "feat: honor SkipParentRedirect flag in AddGameToUser"
```

---

## Task 4: Frontend API types

**Files:**
- Modify: `apps/web/src/api/endpoints/games.ts`
- Modify: `apps/web/src/api/endpoints/userGames.ts`

- [ ] **Step 1: Add GamePreviewDto, ParentPreviewResponse, and getParentPreview to games.ts**

In `apps/web/src/api/endpoints/games.ts`, add at the end of the file:

```typescript
export type GamePreviewDto = {
  externalId: number;
  name: string;
  imageUrl: string | null;
  realmCount: number;
};

export type ParentPreviewResponse = {
  selectedGame: GamePreviewDto;
  parentGame: GamePreviewDto | null;
};

export function getParentPreview(externalId: number): Promise<ParentPreviewResponse> {
  return apiGet<ParentPreviewResponse>(`/games/parent-preview?externalId=${externalId}`);
}
```

- [ ] **Step 2: Add skipParentRedirect to AddUserGamePayload in userGames.ts**

In `apps/web/src/api/endpoints/userGames.ts`, change `AddUserGamePayload` to:

```typescript
export type AddUserGamePayload = {
  externalId: number;
  name: string;
  imageUrl: string | null;
  skipParentRedirect?: boolean;
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/games.ts
git add apps/web/src/api/endpoints/userGames.ts
git commit -m "feat: add getParentPreview API wrapper and skipParentRedirect payload field"
```

---

## Task 5: ParentChoiceModal component

**Files:**
- Create: `apps/web/src/components/ParentChoiceModal.tsx`

- [ ] **Step 1: Create ParentChoiceModal**

Create `apps/web/src/components/ParentChoiceModal.tsx`:

```tsx
import { FullArtTcgCard } from './cards/FullArtTcgCard'
import { Modal, Button } from './ui'
import type { GamePreviewDto } from '../api/endpoints/games'

interface ParentChoiceModalProps {
  selectedGame: GamePreviewDto
  parentGame: GamePreviewDto
  onChoose: (choice: GamePreviewDto) => void
  onDismiss: () => void
  adding?: boolean
}

export function ParentChoiceModal({ selectedGame, parentGame, onChoose, onDismiss, adding }: ParentChoiceModalProps) {
  function realmLabel(count: number) {
    return count === 0 ? 'No realm yet' : `${count} players`
  }

  return (
    <Modal isOpen onClose={onDismiss} title="Choose Your Realm">
      <div className="px-6 py-4 flex flex-col gap-6">
        <p className="text-sm text-text text-center">
          We noticed <strong>{selectedGame.name}</strong> is related to <strong>{parentGame.name}</strong>.{' '}
          Grouping players under the same realm helps everyone connect.
          Which realm would you like to join?
        </p>
        <div className="flex gap-4">
          <div className="flex flex-col gap-3 flex-1">
            <FullArtTcgCard
              name={selectedGame.name}
              imageUrl={selectedGame.imageUrl ?? undefined}
              platform={
                <span className="font-mono text-xs text-white">
                  {realmLabel(selectedGame.realmCount)}
                </span>
              }
              className="h-64"
            />
            <Button onClick={() => onChoose(selectedGame)} disabled={adding}>
              Join this realm
            </Button>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            <FullArtTcgCard
              name={parentGame.name}
              imageUrl={parentGame.imageUrl ?? undefined}
              platform={
                <span className="font-mono text-xs text-white">
                  {realmLabel(parentGame.realmCount)}
                </span>
              }
              className="h-64"
            />
            <Button onClick={() => onChoose(parentGame)} disabled={adding}>
              Join this realm
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ParentChoiceModal.tsx
git commit -m "feat: add ParentChoiceModal component"
```

---

## Task 6: ScryingOrb two-step confirm flow

**Files:**
- Modify: `apps/web/src/components/orb/ScryingOrb.tsx`

- [ ] **Step 1: Update imports**

At the top of `apps/web/src/components/orb/ScryingOrb.tsx`, change the `games` import to include the new types and function:

```typescript
import { getGames, getParentPreview, type Game, type PopularGame, type GamePreviewDto, type ParentPreviewResponse } from '../../api/endpoints/games'
```

And add the `ParentChoiceModal` import after the existing component imports:

```typescript
import { ParentChoiceModal } from '../ParentChoiceModal'
```

- [ ] **Step 2: Add parentPreview state**

Inside the `ScryingOrb` function, after the existing `const [adding, setAdding] = useState(false)` line, add:

```typescript
const [parentPreview, setParentPreview] = useState<ParentPreviewResponse | null>(null)
```

- [ ] **Step 3: Replace confirmAdd and add helpers**

Replace the existing `confirmAdd` function (lines 66–81 in the original file) with:

```typescript
async function doAddGame(externalId: number, name: string, imageUrl: string | null, skipParentRedirect: boolean) {
  const result = await apiAddUserGame({ externalId, name, imageUrl, skipParentRedirect })
  onAdd(result.userGame)
  setParentPreview(null)
  setPendingGame(null)
  handleClear()
}

async function confirmAdd() {
  if (!pendingGame) return
  setAdding(true)
  try {
    let preview: ParentPreviewResponse | null = null
    try {
      preview = await getParentPreview(pendingGame.externalId)
    } catch {
      // Preview fetch failed (RAWG unreachable) — proceed without modal
    }

    if (preview?.parentGame) {
      setPendingGame(null)
      setParentPreview(preview)
      return
    }

    await doAddGame(pendingGame.externalId, pendingGame.name, pendingGame.imageUrl, false)
  } finally {
    setAdding(false)
  }
}

async function handleParentChoice(choice: GamePreviewDto) {
  setAdding(true)
  try {
    await doAddGame(choice.externalId, choice.name, choice.imageUrl, true)
  } finally {
    setAdding(false)
  }
}
```

- [ ] **Step 4: Add ParentChoiceModal to the JSX**

At the end of the component's return, after the closing `</Modal>` of the list-view modal and before the closing `</div>`, add:

```tsx
{parentPreview?.parentGame && (
  <ParentChoiceModal
    selectedGame={parentPreview.selectedGame}
    parentGame={parentPreview.parentGame}
    onChoose={handleParentChoice}
    onDismiss={() => setParentPreview(null)}
    adding={adding}
  />
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: No type errors.

- [ ] **Step 6: Run all backend tests to confirm no regressions**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/orb/ScryingOrb.tsx
git commit -m "feat: ScryingOrb shows ParentChoiceModal when parent game is detected"
```
