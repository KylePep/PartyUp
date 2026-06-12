# Popular Realms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Popular Realms" panel (top 6 games by userGame count) to the right side of HomePage and LandingPage, rendered as floating circular orbs with a count badge, matching the ScryingOrb's visual style.

**Architecture:** New public `GET /api/games/popular` endpoint backed by a new `GetPopularGames` service method. Frontend extracts the existing `GamePlanet` component into its own file with an optional count badge, then a new `PopularRealms` component consumes `usePopularGames` and renders absolutely positioned on the right side of each page.

**Tech Stack:** ASP.NET Core 8 (C#), EF Core, xUnit + FluentAssertions, React + TypeScript + Vite, Tailwind CSS

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/api/Models/DTOs/Game/PopularGameResult.cs` | Response DTO for popular games |
| Modify | `apps/api/Services/Interfaces/IGameService.cs` | Add `GetPopularGames` method signature |
| Modify | `apps/api/Services/GameService.cs` | Implement `GetPopularGames` query |
| Modify | `apps/api/Controllers/GamesController.cs` | Add `GET popular` action |
| Create | `apps/tests/PartyUp.Api.Tests/Features/Games/PopularGamesTests.cs` | Integration tests |
| Create | `apps/web/src/components/orb/GamePlanet.tsx` | Extracted + extended planet component |
| Modify | `apps/web/src/components/orb/ScryingOrb.tsx` | Import GamePlanet from new location |
| Modify | `apps/web/src/api/endpoints/games.ts` | Add `PopularGame` type + `getPopularGames` |
| Create | `apps/web/src/hooks/usePopularGames.ts` | Fetch-on-mount hook |
| Create | `apps/web/src/components/PopularRealms.tsx` | Panel component (absolutely positioned) |
| Modify | `apps/web/src/pages/HomePage.tsx` | Mount panel + add-realm modal |
| Modify | `apps/web/src/pages/LandingPage.tsx` | Mount panel + open auth modal on select |

---

### Task 1: Write failing integration tests for the popular games endpoint

**Files:**
- Create: `apps/tests/PartyUp.Api.Tests/Features/Games/PopularGamesTests.cs`

- [ ] **Step 1: Create the test file**

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Infrastructure;
using PartyUp.Api.Tests.Factories;

namespace PartyUp.Api.Tests.Features.Games;

public class PopularGamesTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 40_000;

    public PopularGamesTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Popular_IsPublic_Returns200WithoutAuth()
    {
        var response = await Client.GetAsync("/api/games/popular");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Popular_ReturnsGamesOrderedByUserGameCount()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var clientC = await CreateAuthenticatedClientAsync();
        var gameAId = Interlocked.Increment(ref _gameCounter);
        var gameBId = Interlocked.Increment(ref _gameCounter);

        // game A gets 2 users, game B gets 1
        await clientA.PostAsJsonAsync("/api/user-games", new { externalId = gameAId, name = $"Game {gameAId}", imageUrl = (string?)null });
        await clientB.PostAsJsonAsync("/api/user-games", new { externalId = gameAId, name = $"Game {gameAId}", imageUrl = (string?)null });
        await clientC.PostAsJsonAsync("/api/user-games", new { externalId = gameBId, name = $"Game {gameBId}", imageUrl = (string?)null });

        var response = await Client.GetAsync("/api/games/popular");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<List<PopularGameDto>>();
        result.Should().NotBeNull();
        result!.Should().HaveCount(2);
        result[0].UserGameCount.Should().Be(2);
        result[1].UserGameCount.Should().Be(1);
    }

    [Fact]
    public async Task Popular_LimitParam_CapsResults()
    {
        for (int i = 0; i < 8; i++)
        {
            var client = await CreateAuthenticatedClientAsync();
            var id = Interlocked.Increment(ref _gameCounter);
            await client.PostAsJsonAsync("/api/user-games", new { externalId = id, name = $"Game {id}", imageUrl = (string?)null });
        }

        var response = await Client.GetAsync("/api/games/popular?limit=6");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<List<PopularGameDto>>();
        result!.Count.Should().BeLessThanOrEqualTo(6);
    }

    private record PopularGameDto(Guid Id, int ExternalId, string Name, string? ImageUrl, int UserGameCount);
}
```

- [ ] **Step 2: Run tests to confirm they fail (endpoint doesn't exist yet)**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~PopularGamesTests" -v minimal
```

Expected: all 3 tests fail — `Popular_IsPublic` and others return 404 (no route yet).

---

### Task 2: Implement the popular games endpoint (DTO → service → controller)

**Files:**
- Create: `apps/api/Models/DTOs/Game/PopularGameResult.cs`
- Modify: `apps/api/Services/Interfaces/IGameService.cs`
- Modify: `apps/api/Services/GameService.cs`
- Modify: `apps/api/Controllers/GamesController.cs`

- [ ] **Step 1: Create the DTO**

Create `apps/api/Models/DTOs/Game/PopularGameResult.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Game;

public class PopularGameResult
{
    public Guid Id { get; set; }
    public int ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int UserGameCount { get; set; }
}
```

- [ ] **Step 2: Add the method to `IGameService`**

In `apps/api/Services/Interfaces/IGameService.cs`, add after the last method signature:

```csharp
Task<IEnumerable<PopularGameResult>> GetPopularGames(int limit);
```

Full updated file:

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
}
```

- [ ] **Step 3: Implement `GetPopularGames` in `GameService`**

Add this method to `apps/api/Services/GameService.cs` (append before the closing brace):

```csharp
  public async Task<IEnumerable<PopularGameResult>> GetPopularGames(int limit)
  {
    var topGroups = await _db.UserGames
        .GroupBy(ug => ug.GameId)
        .OrderByDescending(g => g.Count())
        .Take(limit)
        .Select(g => new { GameId = g.Key, Count = g.Count() })
        .ToListAsync();

    if (topGroups.Count == 0)
      return Enumerable.Empty<PopularGameResult>();

    var gameIds = topGroups.Select(g => g.GameId).ToList();
    var games = await _db.Games
        .Where(g => gameIds.Contains(g.Id))
        .ToListAsync();

    return topGroups
        .Join(games, t => t.GameId, g => g.Id,
            (t, g) => new PopularGameResult
            {
              Id = g.Id,
              ExternalId = g.ExternalId,
              Name = g.Name,
              ImageUrl = g.ImageUrl,
              UserGameCount = t.Count
            });
  }
```

- [ ] **Step 4: Add the controller action**

In `apps/api/Controllers/GamesController.cs`, add this action before the closing brace. It has no `[Authorize]` attribute so it is public:

```csharp
  [HttpGet("popular")]
  public async Task<IActionResult> GetPopular([FromQuery] int limit = 6)
  {
    if (limit < 1 || limit > 20) limit = 6;
    var result = await _service.GetPopularGames(limit);
    return Ok(result);
  }
```

- [ ] **Step 5: Run the tests to confirm they pass**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~PopularGamesTests" -v minimal
```

Expected: all 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Models/DTOs/Game/PopularGameResult.cs \
        apps/api/Services/Interfaces/IGameService.cs \
        apps/api/Services/GameService.cs \
        apps/api/Controllers/GamesController.cs \
        apps/tests/PartyUp.Api.Tests/Features/Games/PopularGamesTests.cs
git commit -m "feat: add GET /api/games/popular endpoint with service method and tests"
```

---

### Task 3: Extract `GamePlanet` into its own file with count badge

**Files:**
- Create: `apps/web/src/components/orb/GamePlanet.tsx`
- Modify: `apps/web/src/components/orb/ScryingOrb.tsx`

- [ ] **Step 1: Create `GamePlanet.tsx`**

Create `apps/web/src/components/orb/GamePlanet.tsx`:

```tsx
import { type CSSProperties, useId } from 'react'

export interface GamePlanetProps {
  name: string
  imageUrl?: string | null
  index: number
  imgSize: number
  onSelect: () => void
  count?: number
}

export function GamePlanet({ name, imageUrl, index, imgSize, onSelect, count }: GamePlanetProps) {
  const uid = useId()
  const svgSize = imgSize + 24
  const bobDur = 3 + (index % 3) * 0.7
  const bobDelay = Math.min(index * 0.3, 2.1)
  const appearDelay = index * 0.05

  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center gap-0 bg-transparent border-0 cursor-pointer p-0"
      aria-label={`Select ${name}`}
      style={{
        animation: `planet-appear 0.4s ${appearDelay}s ease both, planet-bob ${bobDur}s ${bobDelay}s ease-in-out infinite`,
      } as CSSProperties}
    >
      <div style={{ position: 'relative', width: svgSize, height: svgSize + 18 }}>
        <img
          src={imageUrl ?? '/placeholder-game.png'}
          alt={name}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: imgSize,
            height: imgSize,
            borderRadius: '50%',
            objectFit: 'cover',
            boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
          }}
        />
        {count !== undefined && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 4,
              background: '#00d2ff',
              color: '#010608',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'monospace',
              zIndex: 1,
            }}
          >
            {count}
          </div>
        )}
        <svg
          width={svgSize}
          height={svgSize + 18}
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
          aria-hidden
        >
          <defs>
            <path
              id={`arc-${uid}`}
              d={`M 4,${svgSize / 2} a ${imgSize / 2 + 8},${imgSize / 2 + 8} 0 0,1 ${imgSize + 16},0`}
            />
          </defs>
          <text
            fontSize="11"
            fill="#e8e8f0"
            textAnchor="middle"
            letterSpacing="0.8"
            stroke="rgba(0,0,0,0.75)"
            strokeWidth="2.5"
            paintOrder="stroke fill"
          >
            <textPath href={`#arc-${uid}`} startOffset="50%">
              {name}
            </textPath>
          </text>
        </svg>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Update `ScryingOrb.tsx` to use the extracted component**

In `apps/web/src/components/orb/ScryingOrb.tsx`:

1. Remove the `GamePlanetProps` interface and the entire `GamePlanet` function definition (lines 7–78).
2. Add this import at the top (after the existing imports):

```tsx
import { GamePlanet } from './GamePlanet'
```

3. Change the `GamePlanet` usage in the results section from:

```tsx
<GamePlanet key={game.externalId} game={game} index={i} imgSize={imgSize} onSelect={setPendingGame} />
```

to:

```tsx
<GamePlanet
  key={game.externalId}
  name={game.name}
  imageUrl={game.imageUrl}
  index={i}
  imgSize={imgSize}
  onSelect={() => setPendingGame(game)}
/>
```

- [ ] **Step 3: Verify the build passes**

```
npm run build --prefix apps/web
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/orb/GamePlanet.tsx \
        apps/web/src/components/orb/ScryingOrb.tsx
git commit -m "refactor: extract GamePlanet component with optional count badge"
```

---

### Task 4: Frontend API function and hook

**Files:**
- Modify: `apps/web/src/api/endpoints/games.ts`
- Create: `apps/web/src/hooks/usePopularGames.ts`

- [ ] **Step 1: Add `PopularGame` type and `getPopularGames` to `games.ts`**

Append to the end of `apps/web/src/api/endpoints/games.ts`:

```ts
export type PopularGame = {
  id: string;
  externalId: number;
  name: string;
  imageUrl: string | null;
  userGameCount: number;
};

export function getPopularGames(limit = 6): Promise<PopularGame[]> {
  return apiGet<PopularGame[]>(`/games/popular?limit=${limit}`);
}
```

- [ ] **Step 2: Create `usePopularGames.ts`**

Create `apps/web/src/hooks/usePopularGames.ts`:

```ts
import { useEffect, useState } from 'react'
import { getPopularGames, type PopularGame } from '../api/endpoints/games'

export function usePopularGames() {
  const [games, setGames] = useState<PopularGame[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    getPopularGames()
      .then((result) => {
        setGames(result)
        setStatus('success')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  return { games, status }
}
```

- [ ] **Step 3: Verify the build passes**

```
npm run build --prefix apps/web
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/games.ts \
        apps/web/src/hooks/usePopularGames.ts
git commit -m "feat: add PopularGame type, getPopularGames API function, and usePopularGames hook"
```

---

### Task 5: `PopularRealms` panel component

**Files:**
- Create: `apps/web/src/components/PopularRealms.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/PopularRealms.tsx`:

```tsx
import { Spinner } from './ui'
import { GamePlanet } from './orb/GamePlanet'
import { usePopularGames } from '../hooks/usePopularGames'
import { type PopularGame } from '../api/endpoints/games'

interface PopularRealmsProps {
  onSelect: (game: PopularGame) => void
}

export function PopularRealms({ onSelect }: PopularRealmsProps) {
  const { games, status } = usePopularGames()

  if (status === 'loading') {
    return (
      <div className="hidden md:flex absolute right-0 top-0 bottom-0 w-48 items-center justify-center pointer-events-none">
        <Spinner />
      </div>
    )
  }

  if (games.length === 0) return null

  return (
    <div className="hidden md:flex flex-col absolute right-0 top-0 bottom-0 w-48 items-center justify-center gap-4 py-8">
      <p className="text-xs font-mono text-muted uppercase tracking-widest">Popular Realms</p>
      <div className="flex flex-wrap gap-2 justify-center px-2">
        {games.map((game, i) => (
          <GamePlanet
            key={game.id}
            name={game.name}
            imageUrl={game.imageUrl}
            index={i}
            imgSize={60}
            onSelect={() => onSelect(game)}
            count={game.userGameCount}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build passes**

```
npm run build --prefix apps/web
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/PopularRealms.tsx
git commit -m "feat: add PopularRealms panel component"
```

---

### Task 6: Wire `PopularRealms` into `HomePage`

**Files:**
- Modify: `apps/web/src/pages/HomePage.tsx`

- [ ] **Step 1: Replace the full content of `HomePage.tsx` with the following**

```tsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { type UserGame } from '../api/endpoints/userGames'
import { type PopularGame } from '../api/endpoints/games'
import { addUserGame as apiAddUserGame } from '../api/endpoints/userGames'
import { useUserGames } from '../hooks/useUserGames'
import { ScryingOrb } from '../components/orb/ScryingOrb'
import { RealmCard } from '../components/cards/RealmCard'
import { PopularRealms } from '../components/PopularRealms'
import { Spinner, Modal, Button } from '../components/ui'
import { USER_GAME_LIMIT } from '../utils/limits'
import { BinderTabs } from '../components/layout/BinderTabs'
import { BinderShell } from '../components/layout/BinderShell'

export default function HomePage() {
  const { state: auth } = useAuth()
  const userGames = useUserGames()
  const [pendingRealm, setPendingRealm] = useState<PopularGame | null>(null)
  const [addingRealm, setAddingRealm] = useState(false)

  if (auth.status !== 'authenticated') return null

  const { email } = auth.user
  const displayName = auth.user.profile?.displayName
  const name = displayName ?? email.split('@')[0]
  const visibleRealms = userGames.games.slice(0, 4)
  const atLimit = userGames.games.length >= USER_GAME_LIMIT

  async function confirmAddRealm() {
    if (!pendingRealm) return
    setAddingRealm(true)
    try {
      const result = await apiAddUserGame({
        externalId: pendingRealm.externalId,
        name: pendingRealm.name,
        imageUrl: pendingRealm.imageUrl,
      })
      userGames.addUserGame(result.userGame)
      setPendingRealm(null)
    } finally {
      setAddingRealm(false)
    }
  }

  return (
    <main className="flex flex-1 md:items-center md:justify-center md:py-4 overflow-hidden relative">
      <section className="md:h-full w-full mx-4 md:w-1/2 relative py-4 mx-4 pb-14 md:pb-0">
        <BinderShell
          title={`${name}'s Guildoire`}
          className="relative h-full w-full z-20"
          footer={visibleRealms.length === 0 ? (
            <p className="col-span-3 text-xs font-mono text-muted text-center">
              Search above to add your first realm
            </p>
          ) : (
            visibleRealms.map(g => <RealmCard key={g.id} userGame={g} />)
          )}
          footerClassName="flex overflow-x-auto gap-x-2 p-2 h-1/3 md:h-[30%]"
        >
          {userGames.status === 'loading' ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <ScryingOrb
              onAdd={(game: UserGame) => userGames.addUserGame(game)}
              disabled={atLimit}
            />
          )}
        </BinderShell>
        <BinderTabs activeTab='' />
      </section>

      <PopularRealms onSelect={setPendingRealm} />

      <Modal isOpen={!!pendingRealm} onClose={() => setPendingRealm(null)} title="Add Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Add <strong>{pendingRealm?.name}</strong> to your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPendingRealm(null)}>Cancel</Button>
            <Button onClick={confirmAddRealm} disabled={addingRealm}>
              {addingRealm ? 'Adding…' : 'Add Realm'}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  )
}
```

- [ ] **Step 2: Verify the build passes**

```
npm run build --prefix apps/web
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/HomePage.tsx
git commit -m "feat: add PopularRealms panel to HomePage with add-realm modal"
```

---

### Task 7: Wire `PopularRealms` into `LandingPage`

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx`

- [ ] **Step 1: Replace the full content of `LandingPage.tsx` with the following**

```tsx
import { useState } from 'react'
import { NavBar } from '../components/layout/NavBar'
import { BinderShell } from '../components/layout/BinderShell'
import AuthModal from '../components/modals/AuthModal'
import { Button } from '../components/ui'
import { CrystalOrb } from '../components/orb/CrystalOrb'
import { PopularRealms } from '../components/PopularRealms'

type ModalMode = 'sign-in' | 'sign-up'

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode | null>(null)

  return (
    <div className="h-dvh text-text flex relative md:py-4">
      <NavBar variant="landing" onSignIn={() => setModal('sign-in')} onSignUp={() => setModal('sign-up')} />

      <main className="flex-1 flex flex-col items-center justify-center text-center py-4 pb-14 md:pb-0">
        <BinderShell
          title="Guildoire"
          className="h-full w-[91%] md:w-1/2 py-4"
          clasp={<>
            <div className="md:hidden flex flex-1 flex-col w-full justify-around ">
              <Button size="sm" onClick={() => setModal('sign-up')}>Get Started</Button>
              <Button size="sm" variant="secondary" onClick={() => setModal('sign-in')}>Sign In</Button>
            </div>
            <div className="hidden md:flex flex-col gap-4">
              <Button size="lg" onClick={() => setModal('sign-up')}>Get Started</Button>
              <Button size="lg" variant="secondary" onClick={() => setModal('sign-in')}>Sign In</Button>
            </div>
          </>}
          claspClassName="flex flex-1 flex-col items-center justify-center p-2 md:p-8"
          footer={<>
            <p>Find your people. <br /> PartyUp matches multiplayer gamers by the games they play, the characters they build, and the vibe they bring.</p>
          </>}
          footerClassName="flex flex-col items-center justify-center mb-20 md:mb-0 h-1/4 md:h-[30%]"
        >
          <CrystalOrb />
        </BinderShell>
      </main>

      <PopularRealms onSelect={() => setModal('sign-in')} />

      {modal && <AuthModal initialMode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify the build passes**

```
npm run build --prefix apps/web
```

Expected: exits 0.

- [ ] **Step 3: Run all backend tests to confirm nothing regressed**

```
dotnet test apps/tests/PartyUp.Api.Tests -v minimal
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/LandingPage.tsx
git commit -m "feat: add PopularRealms panel to LandingPage"
```
