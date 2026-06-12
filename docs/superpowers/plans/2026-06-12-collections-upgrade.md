# Collections Page Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add character-name search (across all pages) and game filter dropdown to the Collections page header, with results sorted alphabetically by game name.

**Architecture:** Backend gains a `search` query param (filters `theirCharacter.Name` case-insensitively) and switches default ordering to `gameName ASC, matchedAt DESC`. Frontend adds two new controls to the right panel header bar alongside the existing `PaginationControls`, driven by state with a 300 ms debounce on the search input.

**Tech Stack:** ASP.NET Core 8 / EF Core / PostgreSQL (backend), React + TypeScript + Vite / Tailwind (frontend), xUnit integration tests (no mocking — tests hit a real DB).

---

## File Map

| File | Change |
|---|---|
| `apps/api/Services/Interfaces/ICharacterMatchService.cs` | Add `search` param to `GetMatchesAsync` |
| `apps/api/Services/CharacterMatchService.cs` | Add search filter + new ordering |
| `apps/api/Controllers/CharacterMatchesController.cs` | Expose `search` query param |
| `apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs` | New tests for search and ordering; update helpers |
| `apps/web/src/api/endpoints/matches.ts` | Add `search?: string` param to `getMatches` |
| `apps/web/src/hooks/useUserGames.ts` | Bump pageSize from 12 → 50 |
| `apps/web/src/pages/MatchesPage.tsx` | State, debounce, dropdown, search input, header layout |

---

### Task 1: Write failing integration tests for search and ordering

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs`

- [ ] **Step 1: Add helper overloads and new tests**

Replace the two existing private helpers at the bottom of `CharacterMatchTests` and add the new tests. The helpers gain optional parameters (existing callers keep working because the new params have defaults).

Add the `MutualLikeAsync` helper, update `AddGameAsync` and `CreateCharacterAsync` to accept optional name overrides, then add the three new test methods inside the `CharacterMatchTests` class:

```csharp
[Fact]
public async Task GetMatches_OrderedByGameNameAsc()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();

    // Create "Zebra" match first (should sort second)
    var extIdZ = Interlocked.Increment(ref _gameCounter);
    var ugAZ = await AddGameAsync(clientA, extIdZ, "Zebra");
    var ugBZ = await AddGameAsync(clientB, extIdZ, "Zebra");
    var charAZ = await CreateCharacterAsync(clientA, ugAZ.Id);
    var charBZ = await CreateCharacterAsync(clientB, ugBZ.Id);
    await MutualLikeAsync(clientA, charAZ, clientB, charBZ);

    // Create "Alpha" match second (should sort first)
    var extIdA = Interlocked.Increment(ref _gameCounter);
    var ugAA = await AddGameAsync(clientA, extIdA, "Alpha");
    var ugBA = await AddGameAsync(clientB, extIdA, "Alpha");
    var charAA = await CreateCharacterAsync(clientA, ugAA.Id);
    var charBA = await CreateCharacterAsync(clientB, ugBA.Id);
    await MutualLikeAsync(clientA, charAA, clientB, charBA);

    var response = await clientA.GetAsync("/api/character-matches");
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();

    result!.Items.Should().HaveCount(2);
    result.Items[0].GameName.Should().Be("Alpha");
    result.Items[1].GameName.Should().Be("Zebra");
}

[Fact]
public async Task GetMatches_WithSearchFilter_ReturnsByTheirCharacterName()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();
    var extId = Interlocked.Increment(ref _gameCounter);
    var ugA = await AddGameAsync(clientA, extId);
    var ugB = await AddGameAsync(clientB, extId);
    var charA = await CreateCharacterAsync(clientA, ugA.Id);
    var charB = await CreateCharacterAsync(clientB, ugB.Id, name: "Swordmaster");
    await MutualLikeAsync(clientA, charA, clientB, charB);

    var response = await clientA.GetAsync("/api/character-matches?search=sword");
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();

    result!.Items.Should().HaveCount(1);
    result.Items[0].TheirCharacter.Id.Should().Be(charB);
}

[Fact]
public async Task GetMatches_WithSearchFilter_IsCaseInsensitive()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();
    var extId = Interlocked.Increment(ref _gameCounter);
    var ugA = await AddGameAsync(clientA, extId);
    var ugB = await AddGameAsync(clientB, extId);
    var charA = await CreateCharacterAsync(clientA, ugA.Id);
    var charB = await CreateCharacterAsync(clientB, ugB.Id, name: "Swordmaster");
    await MutualLikeAsync(clientA, charA, clientB, charB);

    var response = await clientA.GetAsync("/api/character-matches?search=SWORD");
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();

    result!.Items.Should().HaveCount(1);
}

[Fact]
public async Task GetMatches_WithSearchFilter_NoMatch_ReturnsEmpty()
{
    var (_, _, clientA, _, _) = await SetupMutualMatchAsync();

    var response = await clientA.GetAsync("/api/character-matches?search=xyznomatch999");
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();

    result!.Items.Should().BeEmpty();
}
```

Replace the two existing helper methods at the bottom of the class with these updated versions (default params keep existing callers working):

```csharp
private async Task MutualLikeAsync(HttpClient clientA, Guid charA, HttpClient clientB, Guid charB)
{
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

private async Task<UserGameDto> AddGameAsync(HttpClient client, int externalId, string? gameName = null)
{
    var response = await client.PostAsJsonAsync("/api/user-games", new
    {
        externalId,
        name = gameName ?? $"Game {externalId}",
        imageUrl = (string?)null
    });
    response.EnsureSuccessStatusCode();
    return (await response.Content.ReadFromJsonAsync<AddGameResultDto>())!.UserGame;
}

private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId, string name = "TestCharacter")
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
```

Note: The existing `GetMatches_Pagination_ReturnsTotalCountAndPage` test has two inline `PostAsJsonAsync` blocks inside its loop that perform the mutual like. While you are in the file, replace those two blocks with a single `await MutualLikeAsync(clientA, charA, clientB, charB)` call.

- [ ] **Step 2: Run the new tests to confirm they fail**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~GetMatches_OrderedByGameNameAsc|GetMatches_WithSearchFilter"
```

Expected: 4 failures — the new `search` param doesn't exist yet and ordering is still `matchedAt DESC`.

---

### Task 2: Implement backend — interface, service, controller

**Files:**
- Modify: `apps/api/Services/Interfaces/ICharacterMatchService.cs`
- Modify: `apps/api/Services/CharacterMatchService.cs`
- Modify: `apps/api/Controllers/CharacterMatchesController.cs`

- [ ] **Step 1: Update the interface**

Replace the entire contents of `ICharacterMatchService.cs`:

```csharp
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.CharacterMatch;

public interface ICharacterMatchService
{
    Task<PagedResult<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId, string? search, int page, int pageSize);
}
```

- [ ] **Step 2: Update the service**

In `CharacterMatchService.cs`, replace the `GetMatchesAsync` signature and its body up to (and including) the `ToListAsync` call. The full updated method:

```csharp
public async Task<PagedResult<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId, string? search, int page, int pageSize)
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

    if (!string.IsNullOrWhiteSpace(search))
    {
        var term = search.ToLower();
        query = query.Where(m =>
            (m.CharacterA.UserGame.UserId == userId && m.CharacterB.Name.ToLower().Contains(term)) ||
            (m.CharacterB.UserGame.UserId == userId && m.CharacterA.Name.ToLower().Contains(term)));
    }

    var totalCount = await query.CountAsync();
    var matches = await query
        .OrderBy(m => m.CharacterA.UserGame.UserId == userId
            ? m.CharacterA.UserGame.Game.Name
            : m.CharacterB.UserGame.Game.Name)
        .ThenByDescending(m => m.MatchedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();
    // ... rest of method unchanged (newMatchIds, projection, return)
```

Leave everything after `ToListAsync()` (the `newMatchIds`, `items` projection, and `return`) exactly as it was.

- [ ] **Step 3: Update the controller**

Replace the `GetMatches` action in `CharacterMatchesController.cs`:

```csharp
[HttpGet]
public async Task<ActionResult<PagedResult<CharacterMatchDto>>> GetMatches(
    [FromQuery] Guid? gameId,
    [FromQuery] string? search,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 12)
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _service.GetMatchesAsync(userId, gameId, search, page, pageSize);
    return Ok(result);
}
```

- [ ] **Step 4: Run all character-match tests**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterMatch"
```

Expected: all 9 tests pass (5 existing + 4 new).

- [ ] **Step 5: Run the full test suite to check for regressions**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Services/Interfaces/ICharacterMatchService.cs \
        apps/api/Services/CharacterMatchService.cs \
        apps/api/Controllers/CharacterMatchesController.cs \
        apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs
git commit -m "feat: add search param and game-name ordering to character matches endpoint"
```

---

### Task 3: Frontend — update getMatches and useUserGames

**Files:**
- Modify: `apps/web/src/api/endpoints/matches.ts`
- Modify: `apps/web/src/hooks/useUserGames.ts`

- [ ] **Step 1: Add search param to getMatches**

Replace the entire contents of `apps/web/src/api/endpoints/matches.ts`:

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

export function getMatches(
  page: number,
  pageSize: number,
  gameId?: string,
  search?: string
): Promise<PagedResult<CharacterMatchDto>> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (gameId) qs.set('gameId', gameId);
  if (search) qs.set('search', search);
  return apiGet<PagedResult<CharacterMatchDto>>(`/character-matches?${qs.toString()}`);
}
```

- [ ] **Step 2: Bump useUserGames pageSize to 50**

In `apps/web/src/hooks/useUserGames.ts`, change line 9:

Old:
```typescript
    getUserGames(1, 12)
```

New:
```typescript
    getUserGames(1, 50)
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/endpoints/matches.ts apps/web/src/hooks/useUserGames.ts
git commit -m "feat: add search param to getMatches; bump useUserGames pageSize to 50"
```

---

### Task 4: Frontend — MatchesPage controls and header layout

**Files:**
- Modify: `apps/web/src/pages/MatchesPage.tsx`

- [ ] **Step 1: Add imports and new state**

At the top of `MatchesPage.tsx`, add `useUserGames` to the existing imports:

```typescript
import { useUserGames } from '../hooks/useUserGames'
```

Inside the `MatchesPage` function, after the existing state declarations, add:

```typescript
const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
const [searchInput, setSearchInput] = useState('')
const [debouncedSearch, setDebouncedSearch] = useState('')
const { games } = useUserGames()
```

- [ ] **Step 2: Add the debounce effect**

Add this effect directly after the new state declarations (before the existing `useEffect` that calls `getMatches`):

```typescript
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
  return () => clearTimeout(timer)
}, [searchInput])
```

- [ ] **Step 3: Update the fetch effect**

Replace the existing `useEffect` that calls `getMatches`:

```typescript
useEffect(() => {
  setStatus('loading')
  getMatches(page, PAGE_SIZE, selectedGameId ?? undefined, debouncedSearch || undefined)
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
}, [targetId, page, selectedGameId, debouncedSearch])
```

- [ ] **Step 4: Add handler functions**

After `handleSelect`, add two handlers:

```typescript
function handleGameChange(gameId: string | null) {
  setSelectedGameId(gameId)
  setPage(1)
}

function handleSearchChange(value: string) {
  setSearchInput(value)
  setPage(1)
}
```

- [ ] **Step 5: Update the right panel header**

Replace the `rightContent` header `<div>` (the one with `px-4 py-3 min-h-[64px] border-b-4 ...`):

```tsx
<div className='px-4 py-3 border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
  <div className="flex items-center justify-between min-h-[28px]">
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
  <div className="flex flex-col sm:flex-row gap-2 mt-2">
    <select
      value={selectedGameId ?? ''}
      onChange={e => handleGameChange(e.target.value || null)}
      className="sm:w-40 text-xs font-mono bg-cyan-950/30 border border-cyan-950/50 rounded px-2 py-1 text-text"
    >
      <option value="">All Games</option>
      {games.map(g => (
        <option key={g.id} value={g.gameId}>{g.gameName}</option>
      ))}
    </select>
    <input
      type="text"
      placeholder="Search by name..."
      value={searchInput}
      onChange={e => handleSearchChange(e.target.value)}
      className="flex-1 text-xs font-mono bg-cyan-950/30 border border-cyan-950/50 rounded px-2 py-1 text-text placeholder:text-muted"
    />
  </div>
</div>
```

- [ ] **Step 6: Build to confirm no TypeScript errors**

```
npm run build --prefix apps/web
```

Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/MatchesPage.tsx
git commit -m "feat: add game filter dropdown and character search to Collections page header"
```
