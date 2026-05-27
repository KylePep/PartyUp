# Resource Limits (Characters & Realms) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a hard limit of 3 characters and 10 UserGames per user, with backend rejection and frontend usage counts + blocking messages.

**Architecture:** Backend service layer throws `InvalidOperationException` on limit breach (consistent with existing "already added" pattern); controller wraps in try/catch returning 409. Frontend reads existing data arrays for counts, shows `X / Y` labels, and replaces create/add controls with a muted message when at the limit. Limits live in one frontend constants file.

**Tech Stack:** ASP.NET Core 8, EF Core, xUnit + FluentAssertions (backend); React 19, TypeScript, Tailwind CSS v4 (frontend)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/api/Services/CharacterService.cs` | Modify | Count check before character create |
| `apps/api/Controllers/CharactersController.cs` | Modify | try/catch → 409 on InvalidOperationException |
| `apps/api/Services/UserGameService.cs` | Modify | Count check before realm add |
| `apps/tests/.../Features/Characters/CharacterTests.cs` | Modify | Add character limit integration test |
| `apps/tests/.../Features/UserGames/UserGameTests.cs` | Modify | Add realm limit integration test |
| `apps/web/src/utils/limits.ts` | Create | CHARACTER_LIMIT and USER_GAME_LIMIT constants |
| `apps/web/src/components/CharacterGallery.tsx` | Modify | Show X / 3 characters usage label |
| `apps/web/src/components/CharacterPanel.tsx` | Modify | Fetch global count; show blocking message at limit |
| `apps/web/src/components/UserRealmsSection.tsx` | Modify | Show blocking message when at realm limit |

---

## Task 1: Character limit — write failing test

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`

The test file uses `_gameCounter` starting at `10_000` and a private `AddGameAsync` helper. Add a new `[Fact]` to the existing `CharacterTests` class.

- [ ] **Step 1: Add the failing test to `CharacterTests.cs`**

Open `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs` and add this test **before** the closing `}` of the class (after the last `[Fact]`, before the `// ── helpers ──` comment):

```csharp
[Fact]
public async Task CreateCharacter_AtLimit_ReturnsConflict()
{
    var client = await CreateAuthenticatedClientAsync();

    // Create 3 characters across 3 separate UserGames
    for (var i = 0; i < 3; i++)
    {
        var userGame = await AddGameAsync(client);
        var charResponse = await client.PostAsJsonAsync("/api/characters", new
        {
            name = $"Character {i}",
            platform = "PC",
            platformHandle = $"Handle{i}",
            userGameId = userGame.Id
        });
        charResponse.EnsureSuccessStatusCode();
    }

    // 4th character — a different UserGame, different character
    var fourthGame = await AddGameAsync(client);
    var response = await client.PostAsJsonAsync("/api/characters", new
    {
        name = "Fourth Character",
        platform = "PC",
        platformHandle = "Handle4",
        userGameId = fourthGame.Id
    });

    response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    var body = await response.Content.ReadFromJsonAsync<LimitErrorDto>();
    body!.Message.Should().Contain("Character limit reached");
}
```

Also add this private record at the bottom of the class (alongside the other records):

```csharp
private record LimitErrorDto(string Message);
```

- [ ] **Step 2: Run the test — verify it fails**

```powershell
cd "c:\source\applications\PartyUp"
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CreateCharacter_AtLimit_ReturnsConflict" -v normal 2>&1 | Select-String -Pattern "FAIL|PASS|Error|Expected"
```

Expected: test **FAILS** — the API currently returns 201 (no limit enforced).

---

## Task 2: Character limit — implement backend

**Files:**
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/api/Controllers/CharactersController.cs`

- [ ] **Step 1: Add the count check to `CharacterService.CreateCharacterAsync`**

In `apps/api/Services/CharacterService.cs`, find the start of `CreateCharacterAsync` and add the count check **before** the UserGame ownership lookup:

**Find:**
```csharp
  public async Task<CharacterResponse?> CreateCharacterAsync(
    Guid userId,
    Guid userGameId,
    CreateCharacterRequest request)
  {
    var userGame = await _db.UserGames
      .FirstOrDefaultAsync(x => x.Id == userGameId && x.UserId == userId);
```

**Replace with:**
```csharp
  public async Task<CharacterResponse?> CreateCharacterAsync(
    Guid userId,
    Guid userGameId,
    CreateCharacterRequest request)
  {
    var count = await _db.Characters.CountAsync(c => c.UserGame.UserId == userId);
    if (count >= 3)
      throw new InvalidOperationException("Character limit reached.");

    var userGame = await _db.UserGames
      .FirstOrDefaultAsync(x => x.Id == userGameId && x.UserId == userId);
```

- [ ] **Step 2: Wrap the controller action in try/catch**

In `apps/api/Controllers/CharactersController.cs`, find the `CreateCharacter` action and replace it:

**Find:**
```csharp
  [HttpPost]
  public async Task<IActionResult> CreateCharacter([FromBody] CreateCharacterRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _characterService.CreateCharacterAsync(userId, request.UserGameId, request);

    if (result == null)
      return NotFound("UserGame not found or does not belong to you.");

    return CreatedAtAction(nameof(GetMyCharacters), result);
  }
```

**Replace with:**
```csharp
  [HttpPost]
  public async Task<IActionResult> CreateCharacter([FromBody] CreateCharacterRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    try
    {
      var result = await _characterService.CreateCharacterAsync(userId, request.UserGameId, request);

      if (result == null)
        return NotFound("UserGame not found or does not belong to you.");

      return CreatedAtAction(nameof(GetMyCharacters), result);
    }
    catch (InvalidOperationException ex)
    {
      return Conflict(new { message = ex.Message });
    }
  }
```

- [ ] **Step 3: Run the test — verify it passes**

```powershell
cd "c:\source\applications\PartyUp"
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CreateCharacter_AtLimit_ReturnsConflict" -v normal 2>&1 | Select-String -Pattern "FAIL|PASS|Error"
```

Expected: **PASS**

- [ ] **Step 4: Run the full test suite to check for regressions**

```powershell
dotnet test apps/tests/PartyUp.Api.Tests 2>&1 | tail -3
```

Expected: `Passed! - Failed: 0, Passed: 63, Skipped: 0`

- [ ] **Step 5: Commit**

```powershell
cd "c:\source\applications\PartyUp"
git add apps/api/Services/CharacterService.cs apps/api/Controllers/CharactersController.cs apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs
git commit -m "feat: enforce 3-character limit per user"
```

---

## Task 3: Realm limit — write failing test

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`

The test file uses `_gameCounter` starting at `30_000` and no `AddGameAsync` helper (games are added inline). The controller already catches `InvalidOperationException` and returns 409 — but the service has no count check yet, so the test will fail.

- [ ] **Step 1: Add the failing test to `UserGameTests.cs`**

Open `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs` and add this test before the private records at the bottom of the class:

```csharp
[Fact]
public async Task AddGame_AtLimit_ReturnsConflict()
{
    var client = await CreateAuthenticatedClientAsync();

    // Add 10 games
    for (var i = 0; i < 10; i++)
    {
        var id = Interlocked.Increment(ref _gameCounter);
        var r = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });
        r.EnsureSuccessStatusCode();
    }

    // 11th game — should be rejected
    var eleventh = Interlocked.Increment(ref _gameCounter);
    var response = await client.PostAsJsonAsync("/api/user-games", new
    {
        externalId = eleventh,
        name = $"Game {eleventh}",
        imageUrl = (string?)null
    });

    response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    var body = await response.Content.ReadFromJsonAsync<RealmLimitErrorDto>();
    body!.Message.Should().Contain("Realm limit");
}
```

Also add this private record at the bottom of the class:

```csharp
private record RealmLimitErrorDto(string Message);
```

- [ ] **Step 2: Run the test — verify it fails**

```powershell
cd "c:\source\applications\PartyUp"
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AddGame_AtLimit_ReturnsConflict" -v normal 2>&1 | Select-String -Pattern "FAIL|PASS|Error|Expected"
```

Expected: test **FAILS** — currently returns 200 for the 11th game.

---

## Task 4: Realm limit — implement backend

**Files:**
- Modify: `apps/api/Services/UserGameService.cs`

- [ ] **Step 1: Add the count check to `AddGameToUser`**

In `apps/api/Services/UserGameService.cs`, find the start of `AddGameToUser` and add the check as the very first thing in the method body:

**Find:**
```csharp
    public async Task<AddGameResult> AddGameToUser(Guid userId, AddUserGameRequest request)
    {
        var existingSelected = await _gameService.getGameByExternalId(request.ExternalId);
```

**Replace with:**
```csharp
    public async Task<AddGameResult> AddGameToUser(Guid userId, AddUserGameRequest request)
    {
        var gameCount = await _db.UserGames.CountAsync(ug => ug.UserId == userId);
        if (gameCount >= 10)
            throw new InvalidOperationException("Realm limit of 10 reached.");

        var existingSelected = await _gameService.getGameByExternalId(request.ExternalId);
```

- [ ] **Step 2: Run the realm limit test — verify it passes**

```powershell
cd "c:\source\applications\PartyUp"
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AddGame_AtLimit_ReturnsConflict" -v normal 2>&1 | Select-String -Pattern "FAIL|PASS|Error"
```

Expected: **PASS**

- [ ] **Step 3: Run the full test suite to check for regressions**

```powershell
dotnet test apps/tests/PartyUp.Api.Tests 2>&1 | tail -3
```

Expected: `Passed! - Failed: 0, Passed: 65, Skipped: 0`

- [ ] **Step 4: Commit**

```powershell
cd "c:\source\applications\PartyUp"
git add apps/api/Services/UserGameService.cs apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs
git commit -m "feat: enforce 10-realm limit per user"
```

---

## Task 5: Frontend — limits constants + CharacterGallery counter

**Files:**
- Create: `apps/web/src/utils/limits.ts`
- Modify: `apps/web/src/components/CharacterGallery.tsx`

- [ ] **Step 1: Create `limits.ts`**

Create `apps/web/src/utils/limits.ts` with this content:

```typescript
export const CHARACTER_LIMIT = 3
export const USER_GAME_LIMIT = 10
```

- [ ] **Step 2: Replace `CharacterGallery.tsx` with the updated version**

Replace the entire content of `apps/web/src/components/CharacterGallery.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { deleteCharacter, getCharacters, type Character } from '../api/endpoints/characters'
import { CharacterCard } from './cards/CharacterCard'
import { EmptyState, Spinner } from './ui'
import { CHARACTER_LIMIT } from '../utils/limits'

export function CharacterGallery() {
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

  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  if (status === 'error') {
    return <EmptyState message="Could not load characters" />
  }

  return (
    <>
      <p className="text-xs font-mono text-muted mb-4">
        {characters.length} / {CHARACTER_LIMIT} characters
      </p>
      {status === 'empty' ? (
        <EmptyState message="You haven't created any characters yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map(c => (
            <CharacterCard key={c.id} character={c} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```powershell
npm run build --prefix apps/web 2>&1 | Select-String -Pattern "error|warning|built"
```

Expected: `✓ built in ...` with no type errors.

- [ ] **Step 4: Commit**

```powershell
cd "c:\source\applications\PartyUp"
git add apps/web/src/utils/limits.ts apps/web/src/components/CharacterGallery.tsx
git commit -m "feat: show character usage count in character gallery"
```

---

## Task 6: Frontend — CharacterPanel blocking message

**Files:**
- Modify: `apps/web/src/components/CharacterPanel.tsx`

When the panel has no character for the current game, it fetches the global character count. If the user is at the limit, the "Create Character" button is replaced with a blocking message. After deleting a character, the count is refreshed so the button reappears if the user is now under the limit.

- [ ] **Step 1: Replace `CharacterPanel.tsx` with the updated version**

Replace the entire content of `apps/web/src/components/CharacterPanel.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteCharacter, getCharacters, getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { type UserGameDetail } from '../api/endpoints/userGames'
import { CharacterCard } from './cards/CharacterCard'
import { Button, EmptyState, Spinner } from './ui'
import { CHARACTER_LIMIT } from '../utils/limits'

interface CharacterPanelProps {
  gameId: string
  userGame: UserGameDetail | null
}

export function CharacterPanel({ gameId, userGame }: CharacterPanelProps) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading')
  const [totalCharacterCount, setTotalCharacterCount] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!userGame) return
    getUserGameCharacters(userGame.id)
      .then(chars => {
        const mine = chars.find(c => c.userGameId === userGame.id) ?? null
        setCharacter(mine)
        setStatus(mine ? 'ready' : 'empty')
        if (!mine) {
          getCharacters().then(all => setTotalCharacterCount(all.length))
        }
      })
      .catch(() => setStatus('empty'))
  }, [userGame?.id])

  async function handleDelete(c: Character) {
    if (!c.userGameId) return
    await deleteCharacter(c.userGameId, c.id)
    setCharacter(null)
    setStatus('empty')
    getCharacters().then(all => setTotalCharacterCount(all.length))
  }

  function handleEdit(c: Character) {
    navigate(`/realm/${gameId}/edit-character/${c.id}`)
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
          {totalCharacterCount !== null && totalCharacterCount >= CHARACTER_LIMIT ? (
            <p className="text-xs font-mono text-muted text-center">
              {CHARACTER_LIMIT} / {CHARACTER_LIMIT} characters — delete one to create a new one
            </p>
          ) : (
            <Link to={`/realm/${gameId}/create-character`}>
              <Button className="w-full">Create Character</Button>
            </Link>
          )}
        </div>
      ) : (
        <CharacterCard character={character} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```powershell
npm run build --prefix apps/web 2>&1 | Select-String -Pattern "error|warning|built"
```

Expected: `✓ built in ...` with no type errors.

- [ ] **Step 3: Commit**

```powershell
cd "c:\source\applications\PartyUp"
git add apps/web/src/components/CharacterPanel.tsx
git commit -m "feat: show character limit blocking message in realm panel"
```

---

## Task 7: Frontend — UserRealmsSection realm limit message

**Files:**
- Modify: `apps/web/src/components/UserRealmsSection.tsx`

- [ ] **Step 1: Add the `USER_GAME_LIMIT` import and replace the "Add a Realm" section**

In `apps/web/src/components/UserRealmsSection.tsx`, add the import at the top of the file (after the existing imports):

**Find:**
```tsx
import { useState } from 'react'
import { type UserGame, addUserGame as apiAddUserGame, deleteUserGame } from '../api/endpoints/userGames'
import { getGames, type Game } from '../api/endpoints/games'
import { RealmCard } from './cards/RealmCard'
import { GameCard } from './cards/GameCard'
import { Modal, Button, Input, EmptyState, Spinner } from './ui'
```

**Replace with:**
```tsx
import { useState } from 'react'
import { type UserGame, addUserGame as apiAddUserGame, deleteUserGame } from '../api/endpoints/userGames'
import { getGames, type Game } from '../api/endpoints/games'
import { RealmCard } from './cards/RealmCard'
import { GameCard } from './cards/GameCard'
import { Modal, Button, Input, EmptyState, Spinner } from './ui'
import { USER_GAME_LIMIT } from '../utils/limits'
```

Then find the "Add a Realm" section and replace it:

**Find:**
```tsx
      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Add a Realm</h2>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label=""
              placeholder="Search games..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} disabled={searchStatus === 'loading'}>
            Search
          </Button>
        </div>
        {searchStatus === 'loading' && <div className="mt-4"><Spinner /></div>}
        {searchStatus === 'done' && results.length === 0 && (
          <p className="mt-4 text-xs text-muted font-mono">No results found.</p>
        )}
        {results.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map(g => (
              <GameCard key={g.externalId} game={g} onSelect={setPendingGame} />
            ))}
          </div>
        )}
      </section>
```

**Replace with:**
```tsx
      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Add a Realm</h2>
        {games.length >= USER_GAME_LIMIT ? (
          <p className="text-xs font-mono text-muted">
            {USER_GAME_LIMIT} / {USER_GAME_LIMIT} realms — remove one to add a new game
          </p>
        ) : (
          <>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label=""
                  placeholder="Search games..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button variant="secondary" onClick={handleSearch} disabled={searchStatus === 'loading'}>
                Search
              </Button>
            </div>
            {searchStatus === 'loading' && <div className="mt-4"><Spinner /></div>}
            {searchStatus === 'done' && results.length === 0 && (
              <p className="mt-4 text-xs text-muted font-mono">No results found.</p>
            )}
            {results.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map(g => (
                  <GameCard key={g.externalId} game={g} onSelect={setPendingGame} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
```

- [ ] **Step 2: Verify TypeScript compilation**

```powershell
npm run build --prefix apps/web 2>&1 | Select-String -Pattern "error|warning|built"
```

Expected: `✓ built in ...` with no type errors.

- [ ] **Step 3: Commit**

```powershell
cd "c:\source\applications\PartyUp"
git add apps/web/src/components/UserRealmsSection.tsx
git commit -m "feat: show realm limit blocking message when user has 10 realms"
```

---

## Done

All 7 tasks complete. Branch `feat/resource-limits` is ready with:
- 2 new passing integration tests (character limit, realm limit)
- Backend enforcement via `InvalidOperationException` → 409 on both limits
- Frontend usage counter on CharacterGallery
- Frontend blocking message on CharacterPanel when global character limit reached
- Frontend blocking message on UserRealmsSection when realm limit reached
