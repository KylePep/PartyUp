# Matches & Characters Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the `PagedResult<T>` pagination pattern (already live on `GET /api/user-games`) to the characters and matches endpoints, wiring up `PaginationControls` + `Gallery stickyRows` in `CharacterPage`, `MatchesPage`, and `RealmRightPage`.

**Architecture:** Backend services receive `page`/`pageSize` params and return `PagedResult<T>` (CountAsync + OrderBy + Skip/Take); controllers expose `[FromQuery]` params with defaults and clamping. The three frontend pages add `page`/`totalCount` state and `PaginationControls` in the header bar, with `key={page} stickyRows` on the Gallery. The `PagedResult<T>` DTO and `PaginationControls` component are already in place from the userGames work.

**Tech Stack:** ASP.NET Core 8, EF Core 8, C# records, xUnit integration tests (real DB — no mocking), React + TypeScript + Vite.

---

## File Map

**Backend — modified:**
- `apps/api/Services/Interfaces/ICharacterService.cs` — add `using PartyUp.Api.Models.DTOs`; change `GetAllCharactersForUserAsync` return type and add `page`/`pageSize` params
- `apps/api/Services/CharacterService.cs` — add `using PartyUp.Api.Models.DTOs`; add OrderBy + CountAsync + Skip/Take; return `PagedResult<CharacterResponse>`
- `apps/api/Controllers/CharactersController.cs` — add `using PartyUp.Api.Models.DTOs`; add `[FromQuery] int page/pageSize`; return `ActionResult<PagedResult<CharacterResponse>>`
- `apps/api/Services/Interfaces/ICharacterMatchService.cs` — add `using PartyUp.Api.Models.DTOs`; update `GetMatchesAsync` with `page`/`pageSize` params; return `Task<PagedResult<CharacterMatchDto>>`
- `apps/api/Services/CharacterMatchService.cs` — add `using PartyUp.Api.Models.DTOs`; add CountAsync + OrderBy + Skip/Take; return `PagedResult<CharacterMatchDto>`
- `apps/api/Controllers/CharacterMatchesController.cs` — add `using PartyUp.Api.Models.DTOs`; add `[FromQuery] int page/pageSize`; return `ActionResult<PagedResult<CharacterMatchDto>>`
- `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs` — update 2 tests that call `GET /api/characters` to deserialize `PagedResultDto`; add pagination test; add `PagedResultDto<T>` record
- `apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs` — update 4 tests to deserialize `PagedResultDto`; add pagination test; add `PagedResultDto<T>` record

**Frontend — modified:**
- `apps/web/src/api/endpoints/characters.ts` — add `import type { PagedResult } from './userGames'`; update `getCharacters(page, pageSize)` to return `Promise<PagedResult<Character>>`
- `apps/web/src/api/endpoints/matches.ts` — add same import; update `getMatches(page, pageSize, gameId?)` to return `Promise<PagedResult<CharacterMatchDto>>`
- `apps/web/src/pages/CharacterPage.tsx` — add `PAGE_SIZE`/`page`/`totalCount` state; update effect deps to `[targetId, page]`; update `handleDelete` with page-decrement; update `handleEditSuccess`; PaginationControls in header; `key={page} stickyRows` on Gallery
- `apps/web/src/pages/MatchesPage.tsx` — add `PAGE_SIZE`/`page`/`totalCount` state; update effect deps to `[targetId, page]`; remove `.slice(0, 6)`; PaginationControls in header; `key={page} stickyRows` on Gallery
- `apps/web/src/components/RealmRightPage.tsx` — add `PAGE_SIZE`/`page`/`totalCount` state; add gameId-reset effect; update main effect deps to `[gameId, page]`; remove `.slice(0, 6)`; PaginationControls in header; `key={page} stickyRows` on Gallery

---

### Task 1: Characters endpoint — tests, service, interface, controller

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`
- Modify: `apps/api/Services/Interfaces/ICharacterService.cs`
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/api/Controllers/CharactersController.cs`

- [ ] **Step 1: Update CharacterTests.cs — test deserialization + add pagination test**

Three changes to `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`:

**a) Add `PagedResultDto<T>` record** alongside the other private records at the bottom of the class:
```csharp
private record PagedResultDto<T>(List<T> Items, int TotalCount, int Page, int PageSize);
```

**b) Replace `GetMyCharacters_ReturnsCharacters`** (currently around line 33):
```csharp
[Fact]
public async Task GetMyCharacters_ReturnsCharacters()
{
    var client = await CreateAuthenticatedClientAsync();
    var userGame = await AddGameAsync(client);

    await client.PostAsJsonAsync("/api/characters", new
    {
        name = "My Character",
        platform = "PC",
        platformHandle = "TestHandle",
        userGameId = userGame.Id
    });

    var response = await client.GetAsync("/api/characters");
    response.StatusCode.Should().Be(HttpStatusCode.OK);

    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<CharacterDto>>();
    result!.Items.Should().ContainSingle(c => c.Name == "My Character");
}
```

**c) Update `GetCharacters_AfterMutualMatch_HasNewMatchTrue`** — replace the last two lines (currently reads `List<CharWithFlagDto>`):
```csharp
var result = await (await clientA.GetAsync("/api/characters"))
    .Content.ReadFromJsonAsync<PagedResultDto<CharWithFlagDto>>();
result!.Items.Should().ContainSingle(c => c.Id == charA && c.HasNewMatch);
```

**d) Add `GetMyCharacters_Pagination_ReturnsTotalCountAndPage`** before the private records section:
```csharp
[Fact]
public async Task GetMyCharacters_Pagination_ReturnsTotalCountAndPage()
{
    var client = await CreateAuthenticatedClientAsync();

    // Create 3 characters (user cap) across 3 separate games
    for (int i = 0; i < 3; i++)
    {
        var game = await AddGameAsync(client);
        await client.PostAsJsonAsync("/api/characters", new
        {
            name = $"Paged Character {i}",
            platform = "PC",
            platformHandle = $"Handle{i}",
            userGameId = game.Id
        });
    }

    var page1Response = await client.GetAsync("/api/characters?page=1&pageSize=2");
    page1Response.StatusCode.Should().Be(HttpStatusCode.OK);

    var page1 = await page1Response.Content.ReadFromJsonAsync<PagedResultDto<CharacterDto>>();
    page1!.TotalCount.Should().Be(3);
    page1.Items.Should().HaveCount(2);
    page1.Page.Should().Be(1);
    page1.PageSize.Should().Be(2);

    var page2Response = await client.GetAsync("/api/characters?page=2&pageSize=2");
    var page2 = await page2Response.Content.ReadFromJsonAsync<PagedResultDto<CharacterDto>>();
    page2!.Items.Should().HaveCount(1);
    page2.TotalCount.Should().Be(3);
}
```

- [ ] **Step 2: Run character tests to confirm failures**

```bash
dotnet test --filter "FullyQualifiedName~CharacterTests.GetMyCharacters" --project apps/tests/PartyUp.Api.Tests
```

Expected: FAIL — tests can't deserialize `List<CharacterResponse>` into `PagedResultDto`. The endpoint still returns a list.

- [ ] **Step 3: Update ICharacterService.cs**

Full new content of `apps/api/Services/Interfaces/ICharacterService.cs`:
```csharp
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.Character;

public interface ICharacterService
{
  Task<CharacterResponse?> CreateCharacterAsync(Guid userId, Guid userGameId, CreateCharacterRequest request);
  Task<List<CharacterResponse>> GetCharactersForUserGameAsync(Guid userId, Guid userGameId);
  Task<PagedResult<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId, int page, int pageSize);
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

- [ ] **Step 4: Update CharacterService.GetAllCharactersForUserAsync**

Add `using PartyUp.Api.Models.DTOs;` to the using block at the top of `apps/api/Services/CharacterService.cs`.

Then replace the `GetAllCharactersForUserAsync` method (currently lines 90–104) with:
```csharp
public async Task<PagedResult<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId, int page, int pageSize)
{
  page = Math.Max(1, page);
  pageSize = Math.Clamp(pageSize, 1, 50);

  var query = _db.Characters
    .Where(c => c.UserGame.UserId == userId)
    .OrderByDescending(c => c.CreatedAt);

  var totalCount = await query.CountAsync();
  var characters = await query
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .Select(ToProjection())
    .ToListAsync();

  var characterIds = characters.Select(c => c.Id).ToList();
  var newMatchIds = await _notifications.GetCharacterIdsWithNewMatchAsync(userId, characterIds);

  foreach (var c in characters)
    c.HasNewMatch = newMatchIds.Contains(c.Id);

  return new PagedResult<CharacterResponse>(characters, totalCount, page, pageSize);
}
```

- [ ] **Step 5: Update CharactersController.GetMyCharacters**

Add `using PartyUp.Api.Models.DTOs;` to the using block at the top of `apps/api/Controllers/CharactersController.cs`.

Replace the `GetMyCharacters` action (currently lines 21–27) with:
```csharp
[HttpGet]
public async Task<ActionResult<PagedResult<CharacterResponse>>> GetMyCharacters(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 12)
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _characterService.GetAllCharactersForUserAsync(userId, page, pageSize);
    return Ok(result);
}
```

- [ ] **Step 6: Run character tests to confirm all pass**

```bash
dotnet test --filter "FullyQualifiedName~CharacterTests" --project apps/tests/PartyUp.Api.Tests
```

Expected: all character tests pass, including the new pagination test.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Services/Interfaces/ICharacterService.cs apps/api/Services/CharacterService.cs apps/api/Controllers/CharactersController.cs apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs
git commit -m "feat: paginate GET /api/characters endpoint with PagedResult"
```

---

### Task 2: Matches endpoint — tests, service, interface, controller

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs`
- Modify: `apps/api/Services/Interfaces/ICharacterMatchService.cs`
- Modify: `apps/api/Services/CharacterMatchService.cs`
- Modify: `apps/api/Controllers/CharacterMatchesController.cs`

- [ ] **Step 1: Update CharacterMatchTests.cs**

**a) Add `PagedResultDto<T>` record** at the bottom of the class alongside the other records:
```csharp
private record PagedResultDto<T>(List<T> Items, int TotalCount, int Page, int PageSize);
```

**b) Replace `GetMatches_WithMutualLike_ReturnsMatch`:**
```csharp
[Fact]
public async Task GetMatches_WithMutualLike_ReturnsMatch()
{
    var (charA, charB, clientA, _, gameId) = await SetupMutualMatchAsync();

    var response = await clientA.GetAsync("/api/character-matches");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
    result!.Items.Should().HaveCount(1);
    result.Items[0].MyCharacter.Id.Should().Be(charA);
    result.Items[0].TheirCharacter.Id.Should().Be(charB);
    result.Items[0].GameId.Should().Be(gameId);
    result.Items[0].GameName.Should().NotBeNullOrEmpty();
    result.Items[0].MatchedAt.Should().NotBe(default);
}
```

**c) Replace `GetMatches_WithGameIdFilter_ReturnsMatchForThatGame`:**
```csharp
[Fact]
public async Task GetMatches_WithGameIdFilter_ReturnsMatchForThatGame()
{
    var (_, _, clientA, _, gameId) = await SetupMutualMatchAsync();

    var response = await clientA.GetAsync($"/api/character-matches?gameId={gameId}");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
    result!.Items.Should().HaveCount(1);
}
```

**d) Replace `GetMatches_WithWrongGameIdFilter_ReturnsEmpty`:**
```csharp
[Fact]
public async Task GetMatches_WithWrongGameIdFilter_ReturnsEmpty()
{
    var (_, _, clientA, _, _) = await SetupMutualMatchAsync();

    var response = await clientA.GetAsync($"/api/character-matches?gameId={Guid.NewGuid()}");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
    result!.Items.Should().BeEmpty();
}
```

**e) Replace `GetMatches_WithNoMatches_ReturnsEmpty`:**
```csharp
[Fact]
public async Task GetMatches_WithNoMatches_ReturnsEmpty()
{
    var client = await CreateAuthenticatedClientAsync();

    var response = await client.GetAsync("/api/character-matches");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
    result!.Items.Should().BeEmpty();
}
```

**f) Add `GetMatches_Pagination_ReturnsTotalCountAndPage`** before the helpers section:
```csharp
[Fact]
public async Task GetMatches_Pagination_ReturnsTotalCountAndPage()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();

    // Create 3 mutual matches across 3 separate games
    for (int i = 0; i < 3; i++)
    {
        var externalId = Interlocked.Increment(ref _gameCounter);
        var ugA = await AddGameAsync(clientA, externalId);
        var ugB = await AddGameAsync(clientB, externalId);
        var charA = await CreateCharacterAsync(clientA, ugA.Id);
        var charB = await CreateCharacterAsync(clientB, ugB.Id);

        await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = InteractionType.Like
        });
        await clientB.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charB,
            toCharacterId = charA,
            type = InteractionType.Like
        });
    }

    var page1Response = await clientA.GetAsync("/api/character-matches?page=1&pageSize=2");
    page1Response.StatusCode.Should().Be(HttpStatusCode.OK);

    var page1 = await page1Response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
    page1!.TotalCount.Should().Be(3);
    page1.Items.Should().HaveCount(2);
    page1.Page.Should().Be(1);
    page1.PageSize.Should().Be(2);

    var page2Response = await clientA.GetAsync("/api/character-matches?page=2&pageSize=2");
    var page2 = await page2Response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
    page2!.Items.Should().HaveCount(1);
    page2.TotalCount.Should().Be(3);
}
```

- [ ] **Step 2: Run match tests to confirm failures**

```bash
dotnet test --filter "FullyQualifiedName~CharacterMatchTests" --project apps/tests/PartyUp.Api.Tests
```

Expected: all 4 existing match tests fail (deserializing `List<T>` from what will become a paged response).

- [ ] **Step 3: Update ICharacterMatchService.cs**

Full new content of `apps/api/Services/Interfaces/ICharacterMatchService.cs`:
```csharp
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.CharacterMatch;

public interface ICharacterMatchService
{
    Task<PagedResult<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId, int page, int pageSize);
}
```

- [ ] **Step 4: Update CharacterMatchService.GetMatchesAsync**

Add `using PartyUp.Api.Models.DTOs;` to the using block at the top of `apps/api/Services/CharacterMatchService.cs`.

Replace the `GetMatchesAsync` method (currently lines 21–60) with:
```csharp
public async Task<PagedResult<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId, int page, int pageSize)
{
    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 50);

    var query = _db.CharacterMatches
        .Include(m => m.CharacterA).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
        .Include(m => m.CharacterA).ThenInclude(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
        .Include(m => m.CharacterB).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
        .Include(m => m.CharacterB).ThenInclude(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
        .Where(m =>
            m.CharacterA.UserGame.UserId == userId ||
            m.CharacterB.UserGame.UserId == userId);

    if (gameId.HasValue)
        query = query.Where(m =>
            (m.CharacterA.UserGame.UserId == userId && m.CharacterA.UserGame.GameId == gameId.Value) ||
            (m.CharacterB.UserGame.UserId == userId && m.CharacterB.UserGame.GameId == gameId.Value));

    var totalCount = await query.CountAsync();
    var matches = await query
        .OrderByDescending(m => m.MatchedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    var matchIds = matches.Select(m => m.Id).ToList();
    var newMatchIds = await _notifications.GetNewMatchIdsAsync(userId, matchIds);

    var items = matches.Select(m =>
    {
        var isMineA = m.CharacterA.UserGame.UserId == userId;
        var mine = isMineA ? m.CharacterA : m.CharacterB;
        var theirs = isMineA ? m.CharacterB : m.CharacterA;

        return new CharacterMatchDto
        {
            MatchId = m.Id,
            MatchedAt = m.MatchedAt,
            MyCharacter = ToSummary(mine),
            TheirCharacter = ToProjection(theirs),
            GameId = mine.UserGame.GameId,
            GameName = mine.UserGame.Game.Name,
            GameImageUrl = mine.UserGame.Game.ImageUrl,
            IsNew = newMatchIds.Contains(m.Id)
        };
    }).ToList();

    return new PagedResult<CharacterMatchDto>(items, totalCount, page, pageSize);
}
```

- [ ] **Step 5: Update CharacterMatchesController.GetMatches**

Add `using PartyUp.Api.Models.DTOs;` to the using block at the top of `apps/api/Controllers/CharacterMatchesController.cs`.

Replace the `GetMatches` action with:
```csharp
[HttpGet]
public async Task<ActionResult<PagedResult<CharacterMatchDto>>> GetMatches(
    [FromQuery] Guid? gameId,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 12)
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _service.GetMatchesAsync(userId, gameId, page, pageSize);
    return Ok(result);
}
```

- [ ] **Step 6: Run match tests to confirm all pass**

```bash
dotnet test --filter "FullyQualifiedName~CharacterMatchTests" --project apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass, including the new pagination test.

- [ ] **Step 7: Run full backend test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass with no regressions.

- [ ] **Step 8: Commit**

```bash
git add apps/api/Services/Interfaces/ICharacterMatchService.cs apps/api/Services/CharacterMatchService.cs apps/api/Controllers/CharacterMatchesController.cs apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs
git commit -m "feat: paginate GET /api/character-matches endpoint with PagedResult"
```

---

### Task 3: Frontend API layer — characters.ts and matches.ts

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`
- Modify: `apps/web/src/api/endpoints/matches.ts`

> After this task, `CharacterPage.tsx`, `MatchesPage.tsx`, and `RealmRightPage.tsx` will have TypeScript errors because they still call the old zero-arg signatures. Tasks 4–6 resolve those.

- [ ] **Step 1: Update characters.ts**

Add the import on line 2 (after the existing client import):
```typescript
import type { PagedResult } from './userGames';
```

Replace the `getCharacters` function (currently line 95–97):
```typescript
export function getCharacters(page: number, pageSize: number): Promise<PagedResult<Character>> {
  return apiGet<PagedResult<Character>>(`/characters?page=${page}&pageSize=${pageSize}`)
}
```

- [ ] **Step 2: Update matches.ts**

Full new content of `apps/web/src/api/endpoints/matches.ts`:
```typescript
import { apiGet } from "../client";
import type { Character, CharacterGameField } from "./characters";
import type { PagedResult } from './userGames';

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
  isNew: boolean;
};

export function getMatches(page: number, pageSize: number, gameId?: string): Promise<PagedResult<CharacterMatchDto>> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (gameId) qs.set('gameId', gameId);
  return apiGet<PagedResult<CharacterMatchDto>>(`/character-matches?${qs.toString()}`);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts apps/web/src/api/endpoints/matches.ts
git commit -m "feat: update characters and matches API functions to accept page/pageSize"
```

---

### Task 4: CharacterPage — pagination wiring

**Files:**
- Modify: `apps/web/src/pages/CharacterPage.tsx`

Key changes from current code:
- Import `PaginationControls` from `../components/ui`
- Add `const PAGE_SIZE = 12` constant
- Add `page` and `totalCount` state
- Effect changes: `getCharacters(page, PAGE_SIZE)` → extract `.items`/`.totalCount`; deps become `[targetId, page]`; targetId match only on `page === 1`
- `handleDelete`: add page-decrement logic (mirrors GamesPage exactly)
- `handleEditSuccess`: `getCharacters(page, PAGE_SIZE)` → extract `.items`/`.totalCount`
- Right-panel header: add `flex items-center justify-between`; add `PaginationControls` (shown when `totalCount > 0`)
- Gallery: add `key={page}` and `stickyRows`

- [ ] **Step 1: Write the updated CharacterPage.tsx**

Full new content of `apps/web/src/pages/CharacterPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { getUserGames, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { Gallery } from '../components/Gallery'
import { CharacterCard } from '../components/cards/CharacterCard'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
import { CreateCharacterWizard } from '../components/character-wizard/CreateCharacterWizard'
import { characterToFormData } from '../components/character-wizard/types'
import { TABS } from '../lib/tabs'
import { PlanetIcon, UserSquareIcon } from '@phosphor-icons/react'
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal'
import { PaginationControls } from '../components/ui'

const PAGE_SIZE = 12

export default function CharactersPage() {
  const TAB = TABS.find(t => t.label === 'My Cards')!
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')
  const [characters, setCharacters] = useState<Character[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected] = useState<Character | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [userGames, setUserGames] = useState<UserGame[]>([])
  const [editingUserGame, setEditingUserGame] = useState<UserGameDetail | null>(null)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')

  useEffect(() => {
    Promise.all([getCharacters(page, PAGE_SIZE), getUserGames(1, 12)])
      .then(([charsResult, ugResult]) => {
        setCharacters(charsResult.items)
        setTotalCount(charsResult.totalCount)
        setUserGames(ugResult.items)
        setStatus(charsResult.totalCount === 0 ? 'empty' : 'ready')
        if (targetId && page === 1) {
          const match = charsResult.items.find(c => c.id === targetId) ?? null
          setSelected(match)
          if (match) setActiveSide('left')
        }
      })
      .catch(() => setStatus('error'))
  }, [targetId, page])

  function handleSelect(character: Character) {
    setSelected(character)
    setActiveSide('left')
  }

  async function handleDelete() {
    if (!selected?.userGameId) return
    setDeleting(true)
    try {
      await deleteCharacter(selected.userGameId, selected.id)
      const newTotal = totalCount - 1
      setTotalCount(newTotal)
      setSelected(null)
      setConfirmOpen(false)
      const totalPages = Math.ceil(newTotal / PAGE_SIZE)
      if (page > totalPages && page > 1) {
        setPage(p => p - 1)
      } else {
        setCharacters(prev => {
          const next = prev.filter(c => c.id !== selected.id)
          if (newTotal === 0) setStatus('empty')
          return next
        })
      }
    } finally {
      setDeleting(false)
    }
  }

  async function handleEdit() {
    if (!selected?.userGameId) return
    const userGame = userGames.find(ug => ug.id === selected.userGameId)
    if (!userGame) return
    const detail = await getUserGameByGameId(userGame.gameId)
    setEditingUserGame(detail)
  }

  function handleEditCancel() {
    setEditingUserGame(null)
  }

  async function handleEditSuccess() {
    const result = await getCharacters(page, PAGE_SIZE)
    const updated = result.items.find(c => c.id === selected?.id) ?? null
    setCharacters(result.items)
    setTotalCount(result.totalCount)
    setStatus(result.totalCount === 0 ? 'empty' : 'ready')
    setSelected(updated)
    setEditingUserGame(null)
  }

  const leftContent = (() => {
    if (editingUserGame && selected) {
      return (
        <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
          <button
            type="button"
            onClick={handleEditCancel}
            className="text-xs font-mono text-muted hover:text-text mb-4 self-start"
          >
            ← Cancel
          </button>
          <CreateCharacterWizard
            userGameId={editingUserGame.id}
            gameId={editingUserGame.gameId}
            platforms={editingUserGame.platforms}
            mode="edit"
            characterId={selected.id}
            initialData={characterToFormData(selected)}
            onSuccess={handleEditSuccess}
          />
        </div>
      )
    }
    if (selected) {
      return (
        <div className="flex flex-col md:min-h-0">
          <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
            <h2 className="text-xs font-mono uppercase tracking-widest">Character Card Details</h2>
          </div>
          <div className='p-2 md:px-4 flex flex-col min-h-0 overflow-y-auto'>
            <CharacterDetailCard
              character={selected}
              onDelete={selected.userGameId ? () => setConfirmOpen(true) : undefined}
              onEdit={selected.userGameId ? handleEdit : undefined}
              deleting={deleting}
            />
          </div>
          <ConfirmDeleteModal
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleDelete}
            itemName={selected.name}
            loading={deleting}
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col md:min-h-0">
        <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
          <h2 className="text-xs font-mono uppercase tracking-widest">Select A Character</h2>
        </div>
      </div>
    )
  })()

  const rightContent = (
    <>
      <div className="relative flex flex-col flex-1 min-h-0">
        <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent flex items-center justify-between'>
          <h2 className="text-xs font-mono uppercase tracking-widest">My Character Cards</h2>
          {totalCount > 0 && (
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          )}
        </div>
        <Gallery
          key={page}
          items={characters}
          status={status}
          getKey={c => c.id}
          emptyMessage="You haven't created any characters yet"
          errorMessage="Could not load characters"
          stickyRows
          renderItem={c => (
            <div
              className="flex flex-col rounded-xl"
              style={{
                outline: selected?.id === c.id ? '2px solid #991b1b' : '2px solid transparent',
                outlineOffset: '2px',
              }}
            >
              <CharacterCard character={c} onSelect={handleSelect} className="" />
            </div>
          )}
        />
      </div>
    </>
  )

  return (
    <BinderLayout
      barColor={TAB.color}
      barContent={selected ? (
        <>
          <CharacterMiniCard character={selected} platform={<UserSquareIcon />} />
          {selected.gameName &&
            <GameMiniCard
              game={{ name: selected.gameName, imageUrl: selected.gameImageUrl }}
              gameId={selected.gameId}
              platform={<PlanetIcon />} />
          }
        </>
      ) : undefined}
      activeTab={"My Cards"}
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/CharacterPage.tsx
git commit -m "feat: add pagination to CharacterPage"
```

---

### Task 5: MatchesPage — pagination wiring

**Files:**
- Modify: `apps/web/src/pages/MatchesPage.tsx`

Key changes from current code:
- Import `PaginationControls` from `../components/ui`
- Add `const PAGE_SIZE = 12` constant
- Add `page` and `totalCount` state
- Effect: `getMatches(page, PAGE_SIZE)` → extract `.items`/`.totalCount`; deps become `[targetId, page]`; targetId match only on `page === 1`
- Remove `.slice(0, 6)` from Gallery `items` prop
- Right-panel header div: add `flex items-center justify-between`; add `PaginationControls`
- Gallery: add `key={page}` and `stickyRows`

- [ ] **Step 1: Write the updated MatchesPage.tsx**

Full new content of `apps/web/src/pages/MatchesPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { markMatchViewed } from '../api/endpoints/matchNotifications'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { Gallery } from '../components/Gallery'
import { CollectionCard } from '../components/cards/CollectionCard'
import { TABS } from '../lib/tabs'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
import { PlanetIcon, UserSquareIcon } from '@phosphor-icons/react'
import { PaginationControls } from '../components/ui'

const PAGE_SIZE = 12

export default function MatchesPage() {
  const TAB = TABS.find(t => t.label === 'Collection')!
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected] = useState<CharacterMatchDto | null>(null)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')

  useEffect(() => {
    getMatches(page, PAGE_SIZE)
      .then(result => {
        setMatches(result.items)
        setTotalCount(result.totalCount)
        setStatus(result.totalCount === 0 ? 'empty' : 'ready')
        if (targetId && page === 1) {
          const match = result.items.find(m => m.matchId === targetId) ?? null
          setSelected(match)
          if (match) {
            setActiveSide('left')
            if (match.isNew) {
              markMatchViewed(match.matchId).then(() => {
                setMatches(prev =>
                  prev.map(m => m.matchId === match.matchId ? { ...m, isNew: false } : m)
                )
              })
            }
          }
        }
      })
      .catch(() => setStatus('error'))
  }, [targetId, page])

  function handleSelect(match: CharacterMatchDto) {
    setSelected(match)
    setActiveSide('left')
    if (match.isNew) {
      markMatchViewed(match.matchId).then(() => {
        setMatches(prev =>
          prev.map(m => m.matchId === match.matchId ? { ...m, isNew: false } : m)
        )
      })
    }
  }

  const leftContent = selected ? (
    <div className="flex flex-col md:flex-1 md:min-h-0">
      <div className="px-4 py-3 h-[64px] border-b-4 border-cyan-950/50">
        <div className='flex gap-4'>
          <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Match</p>
          <p className="text-xs text-muted">
            - {new Date(selected.matchedAt).toLocaleDateString()}
          </p>
        </div>
        <p className="font-display font-bold text-text">{selected.gameName}</p>
      </div>
      <div className="p-2 md:px-4 flex flex-col min-h-0 overflow-y-auto">
        <CharacterDetailCard character={selected.theirCharacter} />
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a match</p>
    </div>
  )

  const rightContent = (
    <div className="md:h-full flex flex-col w-full min-h-0">
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent flex items-center justify-between'>
        <h2 className="text-xs font-mono uppercase tracking-widest">My Collection</h2>
        {totalCount > 0 && (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>
      <Gallery
        key={page}
        items={matches}
        status={status}
        getKey={m => m.matchId}
        emptyMessage="No matches yet — keep swiping!"
        errorMessage="Could not load matches"
        stickyRows
        renderItem={m => (
          <div className={`flex flex-col ${selected?.matchId === m.matchId ? 'ring-2 ring-green-700 rounded-xl' : m.isNew ? 'ring-2 ring-green-500 rounded-xl' : ''}`}>
            <CollectionCard
              matchId={m.matchId}
              character={m.theirCharacter}
              gameName={m.gameName}
              matchedAt={m.matchedAt}
              onSelect={() => handleSelect(m)}
            />
          </div>
        )}
      />
    </div>
  )

  return (
    <BinderLayout
      barColor={TAB.color}
      barContent={selected ? (
        <>
          <CharacterMiniCard
            character={selected.myCharacter}
            characterId={selected.myCharacter.id}
            platform={<UserSquareIcon />}
          />
          <GameMiniCard
            game={{ name: selected.gameName, imageUrl: selected.gameImageUrl }}
            gameId={selected.gameId}
            platform={<PlanetIcon />}
          />
        </>
      ) : undefined}
      activeTab={"Collection"}
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/MatchesPage.tsx
git commit -m "feat: add pagination to MatchesPage"
```

---

### Task 6: RealmRightPage — pagination wiring

**Files:**
- Modify: `apps/web/src/components/RealmRightPage.tsx`

Key changes from current code:
- Import `PaginationControls` from `./ui`
- Add `const PAGE_SIZE = 12` constant
- Add `page` and `totalCount` state
- Add gameId-reset `useEffect` on `[gameId]` that calls `setPage(1)` — this ensures the gallery returns to page 1 whenever the selected game changes
- Update main effect deps to `[gameId, page]`; call `getMatches(page, PAGE_SIZE, gameId)`
- Remove `.slice(0, 6)` from Gallery `items` prop
- Header: add `flex items-center justify-between`; add `PaginationControls`
- Gallery: add `key={page}` and `stickyRows`

- [ ] **Step 1: Write the updated RealmRightPage.tsx**

Full new content of `apps/web/src/components/RealmRightPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import type { UserGameDetail } from '../api/endpoints/userGames'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { Gallery } from './Gallery'
import { MatchCard } from './cards/MatchCard'
import { PaginationControls } from './ui'

const PAGE_SIZE = 12

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
}

export function RealmRightPage({ gameId }: RealmRightPageProps) {
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Reset to page 1 whenever the selected game changes
  useEffect(() => {
    setPage(1)
  }, [gameId])

  useEffect(() => {
    getMatches(page, PAGE_SIZE, gameId)
      .then(result => {
        setMatches(result.items)
        setTotalCount(result.totalCount)
        setStatus(result.totalCount === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId, page])

  return (
    <div className='flex flex-col h-full overflow-x-hidden'>
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 flex items-center justify-between'>
        <h2 className="text-xs font-mono uppercase tracking-widest">Matches</h2>
        {totalCount > 0 && (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>
      <Gallery
        key={page}
        items={matches}
        status={status}
        getKey={m => m.matchId}
        emptyMessage="No matches yet — keep swiping!"
        errorMessage="Could not load matches"
        stickyRows
        renderItem={m => (
          <div className="flex flex-col flex-1">
            <MatchCard
              matchId={m.matchId}
              character={m.theirCharacter}
              gameName={m.gameName}
              matchedAt={m.matchedAt}
              isNew={m.isNew}
            />
          </div>
        )}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/RealmRightPage.tsx
git commit -m "feat: add pagination to RealmRightPage"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `GET /api/characters?page&pageSize` — Task 1
- ✅ `GET /api/character-matches?page&pageSize&gameId` — Task 2
- ✅ `getCharacters(page, pageSize)` → `PagedResult<Character>` — Task 3
- ✅ `getMatches(page, pageSize, gameId?)` → `PagedResult<CharacterMatchDto>` — Task 3
- ✅ `CharacterPage`: page/totalCount state, PaginationControls, `key={page} stickyRows`, persist selection, page-decrement on delete — Task 4
- ✅ `MatchesPage`: page/totalCount state, remove `.slice(0, 6)`, PaginationControls, `key={page} stickyRows` — Task 5
- ✅ `RealmRightPage`: page/totalCount state, remove `.slice(0, 6)`, gameId-reset effect, PaginationControls, `key={page} stickyRows` — Task 6
- ✅ Integration tests for both endpoints — Tasks 1 and 2

**Placeholder scan:** None found — all steps include complete code.

**Type consistency:**
- `PagedResult<CharacterResponse>` (backend) → `PagedResult<Character>` (frontend) — `Character` is the TS type for `CharacterResponse`; consistent
- `PagedResult<CharacterMatchDto>` — same name backend and frontend; consistent
- `PagedResultDto<T>` in test files — private record matching the JSON shape of `PagedResult<T>` from the backend
- `getCharacters(page, pageSize)` — called with `(page, PAGE_SIZE)` in CharacterPage (Task 4) ✅
- `getMatches(page, pageSize, gameId?)` — called with `(page, PAGE_SIZE)` in MatchesPage (Task 5) and `(page, PAGE_SIZE, gameId)` in RealmRightPage (Task 6) ✅
