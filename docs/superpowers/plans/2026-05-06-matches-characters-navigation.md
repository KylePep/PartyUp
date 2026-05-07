# Matches, Characters Navigation & Realm Tabs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Matches page, Discover/Matches tabs on RealmPage, styled CharactersPage, and nav links for Characters and Matches.

**Architecture:** New `GET /api/character-matches?gameId={optional}` backend endpoint with service that resolves mine/theirs by userId. Frontend adds `matches.ts` API module, `useMatches` hook, `MatchCard` component, `MatchesPage`, RealmPage tabs, and nav links in `SignedInLayout`.

**Tech Stack:** ASP.NET Core 8 (EF Core, JWT), React + TypeScript + Vite, Tailwind CSS, xUnit + FluentAssertions (integration tests hit real DB)

---

## File Map

**New backend files:**
- `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs` — response DTO (match + both character summaries + game info)
- `apps/api/Services/Interfaces/ICharacterMatchService.cs` — service interface
- `apps/api/Services/CharacterMatchService.cs` — service implementation (EF Core query)
- `apps/api/Controllers/CharacterMatchesController.cs` — thin controller

**Modified backend files:**
- `apps/api/Program.cs` — add DI registration for `ICharacterMatchService`

**New test file:**
- `apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs`

**New frontend files:**
- `apps/web/src/api/endpoints/matches.ts` — `getMatches(gameId?)` API call
- `apps/web/src/hooks/useMatches.ts` — `useMatches(gameId?)` hook
- `apps/web/src/components/cards/MatchCard.tsx` — displays the matched character (theirs only)
- `apps/web/src/pages/MatchesPage.tsx` — all matches grouped by game → character

**Modified frontend files:**
- `apps/web/src/api/endpoints/characters.ts` — remove the existing `getMatches()` stub
- `apps/web/src/App.tsx` — add `/matches` route
- `apps/web/src/pages/RealmPage.tsx` — add Discover / Matches tab bar
- `apps/web/src/pages/CharacterPage.tsx` — apply consistent page styling
- `apps/web/src/components/layout/SignedInLayout.tsx` — add Characters + Matches nav links

---

## Task 1: Create feature branch

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b feat-matches-characters-nav
```

Expected: `Switched to a new branch 'feat-matches-characters-nav'`

---

## Task 2: Backend DTO + service interface

**Files:**
- Create: `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs`
- Create: `apps/api/Services/Interfaces/ICharacterMatchService.cs`

- [ ] **Step 1: Create DTO file**

Create `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.CharacterMatch;

public class CharacterMatchDto
{
    public Guid MatchId { get; set; }
    public DateTime MatchedAt { get; set; }
    public CharacterSummaryDto MyCharacter { get; set; } = default!;
    public CharacterSummaryDto TheirCharacter { get; set; } = default!;
    public Guid GameId { get; set; }
    public string GameName { get; set; } = default!;
}

public class CharacterSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? Bio { get; set; }
    public string? Playstyle { get; set; }
    public string? Rank { get; set; }
    public string? Region { get; set; }
}
```

- [ ] **Step 2: Create service interface**

Create `apps/api/Services/Interfaces/ICharacterMatchService.cs`:

```csharp
using PartyUp.Api.Models.DTOs.CharacterMatch;

public interface ICharacterMatchService
{
    Task<List<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId);
}
```

---

## Task 3: Write failing integration tests

**Files:**
- Create: `apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs`

- [ ] **Step 1: Create test file**

Create `apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Models;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.CharacterMatches;

public class CharacterMatchTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 30_000;

    public CharacterMatchTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetMatches_WithMutualLike_ReturnsMatch()
    {
        var (charA, charB, clientA, _, gameId) = await SetupMutualMatchAsync();

        var response = await clientA.GetAsync("/api/character-matches");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var matches = await response.Content.ReadFromJsonAsync<List<MatchItemDto>>();
        matches!.Should().HaveCount(1);
        matches[0].MyCharacter.Id.Should().Be(charA);
        matches[0].TheirCharacter.Id.Should().Be(charB);
        matches[0].GameId.Should().Be(gameId);
        matches[0].GameName.Should().NotBeNullOrEmpty();
        matches[0].MatchedAt.Should().NotBe(default);
    }

    [Fact]
    public async Task GetMatches_WithGameIdFilter_ReturnsMatchForThatGame()
    {
        var (_, _, clientA, _, gameId) = await SetupMutualMatchAsync();

        var response = await clientA.GetAsync($"/api/character-matches?gameId={gameId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var matches = await response.Content.ReadFromJsonAsync<List<MatchItemDto>>();
        matches!.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetMatches_WithWrongGameIdFilter_ReturnsEmpty()
    {
        var (_, _, clientA, _, _) = await SetupMutualMatchAsync();

        var response = await clientA.GetAsync($"/api/character-matches?gameId={Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var matches = await response.Content.ReadFromJsonAsync<List<MatchItemDto>>();
        matches!.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMatches_WithNoMatches_ReturnsEmpty()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/character-matches");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var matches = await response.Content.ReadFromJsonAsync<List<MatchItemDto>>();
        matches!.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMatches_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/character-matches");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<(Guid CharA, Guid CharB, HttpClient ClientA, HttpClient ClientB, Guid GameId)>
        SetupMutualMatchAsync()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var sharedExternalId = Interlocked.Increment(ref _gameCounter);
        var ugA = await AddGameAsync(clientA, sharedExternalId);
        var ugB = await AddGameAsync(clientB, sharedExternalId);

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

        return (charA, charB, clientA, clientB, ugA.GameId);
    }

    private async Task<UserGameDto> AddGameAsync(HttpClient client, int externalId)
    {
        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<UserGameDto>())!;
    }

    private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId)
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "TestCharacter",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterIdDto>())!.Id;
    }

    private record UserGameDto(Guid Id, Guid GameId);
    private record CharacterIdDto(Guid Id);
    private record CharacterSummaryDto(Guid Id, string Name);
    private record MatchItemDto(Guid MatchId, DateTime MatchedAt, CharacterSummaryDto MyCharacter, CharacterSummaryDto TheirCharacter, Guid GameId, string GameName);
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterMatchTests" --no-build 2>&1 | tail -20
```

Expected: build errors or 404/connection failures — the endpoint does not exist yet.

---

## Task 4: CharacterMatchService implementation

**Files:**
- Create: `apps/api/Services/CharacterMatchService.cs`

- [ ] **Step 1: Create the service**

Create `apps/api/Services/CharacterMatchService.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models.DTOs.CharacterMatch;

namespace PartyUp.Api.Services;

public class CharacterMatchService : ICharacterMatchService
{
    private readonly AppDbContext _db;

    public CharacterMatchService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId)
    {
        var query = _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Where(m =>
                m.CharacterA.UserGame.UserId == userId ||
                m.CharacterB.UserGame.UserId == userId);

        if (gameId.HasValue)
            query = query.Where(m =>
                (m.CharacterA.UserGame.UserId == userId && m.CharacterA.UserGame.GameId == gameId.Value) ||
                (m.CharacterB.UserGame.UserId == userId && m.CharacterB.UserGame.GameId == gameId.Value));

        var matches = await query.ToListAsync();

        return matches.Select(m =>
        {
            var isMineA = m.CharacterA.UserGame.UserId == userId;
            var mine = isMineA ? m.CharacterA : m.CharacterB;
            var theirs = isMineA ? m.CharacterB : m.CharacterA;

            return new CharacterMatchDto
            {
                MatchId = m.Id,
                MatchedAt = m.MatchedAt,
                MyCharacter = ToSummary(mine),
                TheirCharacter = ToSummary(theirs),
                GameId = mine.UserGame.GameId,
                GameName = mine.UserGame.Game.Name
            };
        }).ToList();
    }

    private static CharacterSummaryDto ToSummary(PartyUp.Api.Models.Character c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Bio = c.Bio,
        Playstyle = c.Playstyle,
        Rank = c.Rank,
        Region = c.Region
    };
}
```

---

## Task 5: Controller, DI registration, and backend commit

**Files:**
- Create: `apps/api/Controllers/CharacterMatchesController.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Create controller**

Create `apps/api/Controllers/CharacterMatchesController.cs`:

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.CharacterMatch;

[ApiController]
[Route("api/character-matches")]
[Authorize]
public class CharacterMatchesController : ControllerBase
{
    private readonly ICharacterMatchService _service;

    public CharacterMatchesController(ICharacterMatchService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<CharacterMatchDto>>> GetMatches([FromQuery] Guid? gameId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _service.GetMatchesAsync(userId, gameId);
        return Ok(result);
    }
}
```

- [ ] **Step 2: Register service in Program.cs**

In `apps/api/Program.cs`, add this line after the existing `AddScoped<ICharacterInteractionService, CharacterInteractionService>()` line:

```csharp
builder.Services.AddScoped<ICharacterMatchService, CharacterMatchService>();
```

The `#region Services` block should now end with:

```csharp
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddHttpClient<RawgClient>();
builder.Services.AddScoped<IGameService, GameService>();
builder.Services.AddScoped<IUserGameService, UserGameService>();
builder.Services.AddScoped<ICharacterService, CharacterService>();
builder.Services.AddScoped<ICharacterInteractionService, CharacterInteractionService>();
builder.Services.AddScoped<ICharacterMatchService, CharacterMatchService>();
```

- [ ] **Step 3: Run tests and verify they pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterMatchTests"
```

Expected: `5 passed, 0 failed`

- [ ] **Step 4: Commit backend**

```bash
git add apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs
git add apps/api/Services/Interfaces/ICharacterMatchService.cs
git add apps/api/Services/CharacterMatchService.cs
git add apps/api/Controllers/CharacterMatchesController.cs
git add apps/api/Program.cs
git add apps/tests/PartyUp.Api.Tests/Features/CharacterMatches/CharacterMatchTests.cs
git commit -m "feat: add GET /api/character-matches endpoint with optional gameId filter"
```

---

## Task 6: Frontend API layer + hook

**Files:**
- Create: `apps/web/src/api/endpoints/matches.ts`
- Create: `apps/web/src/hooks/useMatches.ts`
- Modify: `apps/web/src/api/endpoints/characters.ts`

- [ ] **Step 1: Create matches.ts API module**

Create `apps/web/src/api/endpoints/matches.ts`:

```typescript
import { apiGet } from "../client";

export type CharacterSummary = {
  id: string;
  name: string;
  bio?: string;
  playstyle?: string;
  rank?: string;
  region?: string;
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

- [ ] **Step 2: Create useMatches hook**

Create `apps/web/src/hooks/useMatches.ts`:

```typescript
import { useEffect, useState } from "react";
import { getMatches, type CharacterMatchDto } from "../api/endpoints/matches";

export function useMatches(gameId?: string) {
  const [data, setData] = useState<CharacterMatchDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMatches(gameId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [gameId]);

  return { data, loading };
}
```

- [ ] **Step 3: Remove the existing stub from characters.ts**

In `apps/web/src/api/endpoints/characters.ts`, remove the following lines (lines 54–56):

```typescript
export function getMatches() {
  return apiGet<Character[]>("/character-matches");
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/matches.ts
git add apps/web/src/hooks/useMatches.ts
git add apps/web/src/api/endpoints/characters.ts
git commit -m "feat: add matches API endpoint module and useMatches hook"
```

---

## Task 7: MatchCard component

**Files:**
- Create: `apps/web/src/components/cards/MatchCard.tsx`

- [ ] **Step 1: Create MatchCard**

Create `apps/web/src/components/cards/MatchCard.tsx`:

```tsx
import type { CharacterSummary } from "../../api/endpoints/matches";

type MatchCardProps = {
  character: CharacterSummary;
  matchedAt: string;
};

export function MatchCard({ character, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="rounded-lg p-6 border border-brand-pink/20"
      style={{ background: "rgba(13,13,30,0.8)", boxShadow: "0 0 30px rgba(255,0,128,0.05)" }}
    >
      <div className="mb-4">
        <div className="font-mono text-[10px] text-brand-pink/60 tracking-widest uppercase mb-1">
          Match
        </div>
        <h3 className="font-display font-black text-2xl text-brand-text uppercase tracking-wide">
          {character.name}
        </h3>
        <div className="font-mono text-[10px] text-brand-muted tracking-widest mt-1">
          {date}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {character.playstyle && (
          <span
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
            style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff" }}
          >
            {character.playstyle}
          </span>
        )}
        {character.rank && (
          <span
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
            style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", color: "#ffd700" }}
          >
            {character.rank}
          </span>
        )}
        {character.region && (
          <span
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
          >
            {character.region}
          </span>
        )}
      </div>

      {character.bio && (
        <p className="text-brand-muted text-sm leading-relaxed">{character.bio}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/MatchCard.tsx
git commit -m "feat: add MatchCard component for displaying matched characters"
```

---

## Task 8: MatchesPage + route

**Files:**
- Create: `apps/web/src/pages/MatchesPage.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create MatchesPage**

Create `apps/web/src/pages/MatchesPage.tsx`:

```tsx
import { useMemo } from "react";
import { useMatches } from "../hooks/useMatches";
import { CharacterCard } from "../components/cards/CharacterCard";
import { MatchCard } from "../components/cards/MatchCard";
import { FullScreenStatus } from "../components/layout/FullScreenStatus";
import type { CharacterSummary } from "../api/endpoints/matches";
import type { Character } from "../api/endpoints/characters";

export default function MatchesPage() {
  const { data, loading } = useMatches();

  const grouped = useMemo(() => {
    type GameGroup = {
      gameName: string;
      byCharacter: Record<string, {
        myCharacter: CharacterSummary;
        matches: { matchId: string; matchedAt: string; theirCharacter: CharacterSummary }[];
      }>;
    };

    const result: Record<string, GameGroup> = {};

    for (const match of data) {
      if (!result[match.gameId]) {
        result[match.gameId] = { gameName: match.gameName, byCharacter: {} };
      }
      const game = result[match.gameId];
      const charId = match.myCharacter.id;
      if (!game.byCharacter[charId]) {
        game.byCharacter[charId] = { myCharacter: match.myCharacter, matches: [] };
      }
      game.byCharacter[charId].matches.push({
        matchId: match.matchId,
        matchedAt: match.matchedAt,
        theirCharacter: match.theirCharacter,
      });
    }

    return result;
  }, [data]);

  if (loading) return <FullScreenStatus type="loading" />;

  const isEmpty = Object.keys(grouped).length === 0;

  return (
    <div className="px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
      <h1
        className="font-display font-black text-3xl uppercase tracking-widest text-brand-text mb-10"
        style={{ textShadow: "0 0 30px rgba(255,0,128,0.3)" }}
      >
        Matches
      </h1>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-mono text-brand-muted tracking-widest uppercase text-sm">
            No matches yet — start swiping in your Realms.
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([gameId, game]) => (
        <div key={gameId} className="mb-12">
          <div className="border-b border-brand-border pb-3 mb-6">
            <h2 className="font-display font-black text-2xl uppercase tracking-wide text-brand-text">
              {game.gameName}
            </h2>
          </div>

          {Object.entries(game.byCharacter).map(([charId, charGroup]) => (
            <div key={charId} className="mb-8">
              <div className="flex items-start gap-4 overflow-x-auto pb-4">
                <div className="flex-shrink-0 w-64">
                  <CharacterCard
                    gameId={gameId}
                    character={charGroup.myCharacter as Character}
                  />
                </div>
                {charGroup.matches.map((m) => (
                  <div key={m.matchId} className="flex-shrink-0 w-64">
                    <MatchCard character={m.theirCharacter} matchedAt={m.matchedAt} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

In `apps/web/src/App.tsx`, add the import and route:

Add to imports at the top:
```tsx
import MatchesPage from "./pages/MatchesPage";
```

Add inside the `<SignedInLayout />` route group, after the `/characters` route:
```tsx
<Route path="/matches" element={<MatchesPage />} />
```

The route group should now look like:
```tsx
<Route element={<SignedInLayout />}>
  <Route path="/home" element={<HomePage />} />
  <Route path="/realm/:gameId" element={<RealmPage />} />
  <Route path="/realm/:gameId/create-character" element={<CreateCharacterPage />} />
  <Route path="/characters" element={<CharactersPage />} />
  <Route path="/matches" element={<MatchesPage />} />
</Route>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/MatchesPage.tsx apps/web/src/App.tsx
git commit -m "feat: add MatchesPage at /matches route grouped by game then character"
```

---

## Task 9: RealmPage Discover/Matches tabs

**Files:**
- Modify: `apps/web/src/pages/RealmPage.tsx`

- [ ] **Step 1: Replace RealmPage with tabbed version**

Replace the full contents of `apps/web/src/pages/RealmPage.tsx` with:

```tsx
import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useSignedInLayout } from "../components/layout/SignedInLayout";
import { useUserGames } from "../hooks/useUserGame";
import { useMatches } from "../hooks/useMatches";
import {
  getCharacters,
  discoverCharacters,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
} from "../api/endpoints/characters";
import { GameBanner } from "../components/ui/GameBanner";
import { MatchBanner } from "../components/ui/MatchBanner";
import { CharacterPanel } from "../components/ui/CharacterPanel";
import { DiscoveryPanel } from "../components/ui/DiscoveryPanel";
import { CharacterCard } from "../components/cards/CharacterCard";
import { MatchCard } from "../components/cards/MatchCard";
import type { CharacterSummary } from "../api/endpoints/matches";

type Tab = "discover" | "matches";

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { setNavExtra } = useSignedInLayout();
  const userGamesHook = useUserGames();
  const { data: matchData, loading: matchesLoading } = useMatches(gameId);

  const [tab, setTab] = useState<Tab>("discover");
  const [myCharacter, setMyCharacter] = useState<Character | null | "loading">("loading");
  const [discoverQueue, setDiscoverQueue] = useState<DiscoverCharacter[]>([]);
  const [discoverStatus, setDiscoverStatus] = useState<"loading" | "ready" | "empty" | "unavailable">("loading");
  const [matchBanner, setMatchBanner] = useState(false);

  const userGame =
    userGamesHook.status === "success"
      ? userGamesHook.games.find((g) => g.gameId === gameId) ?? null
      : null;

  useEffect(() => {
    setNavExtra(
      <Link
        to="/home"
        className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
      >
        ← Hub
      </Link>
    );
    return () => setNavExtra(null);
  }, [setNavExtra]);

  useEffect(() => {
    if (!userGame) return;
    getCharacters()
      .then((chars) => {
        const mine = chars.find((c) => c.userGameId === userGame.id) ?? null;
        setMyCharacter(mine);
      })
      .catch(() => setMyCharacter(null));
  }, [userGame?.id]);

  useEffect(() => {
    if (!gameId) return;
    discoverCharacters(gameId)
      .then((chars) => {
        setDiscoverQueue(chars);
        setDiscoverStatus(chars.length === 0 ? "empty" : "ready");
      })
      .catch(() => setDiscoverStatus("unavailable"));
  }, [gameId]);

  async function handleLike() {
    const current = discoverQueue[0];
    if (!current) return;
    if (myCharacter === "loading" || myCharacter === null) return;
    try {
      const matchResponse = await interactWithCharacter(myCharacter.id, current.id, "Like");
      setMatchBanner(matchResponse.isMatch);
      setTimeout(() => setMatchBanner(false), 2500);
    } catch {
      // interaction may fail gracefully
    }
    setDiscoverQueue((q) => q.slice(1));
    if (discoverQueue.length <= 1) setDiscoverStatus("empty");
  }

  async function handleDislike() {
    const current = discoverQueue[0];
    if (!current) return;
    if (myCharacter === "loading" || myCharacter === null) return;
    try {
      await interactWithCharacter(myCharacter.id, current.id, "Dislike");
    } catch {
      // interaction may fail gracefully
    }
    setDiscoverQueue((q) => q.slice(1));
    if (discoverQueue.length <= 1) setDiscoverStatus("empty");
  }

  const matchesByCharacter = useMemo(() => {
    const result: Record<string, {
      myCharacter: CharacterSummary;
      matches: { matchId: string; matchedAt: string; theirCharacter: CharacterSummary }[];
    }> = {};
    for (const match of matchData) {
      const charId = match.myCharacter.id;
      if (!result[charId]) result[charId] = { myCharacter: match.myCharacter, matches: [] };
      result[charId].matches.push({
        matchId: match.matchId,
        matchedAt: match.matchedAt,
        theirCharacter: match.theirCharacter,
      });
    }
    return result;
  }, [matchData]);

  return (
    <>
      {matchBanner && <MatchBanner />}
      <GameBanner game={userGame} />

      <div className="px-6 md:px-10 max-w-7xl mx-auto w-full">
        <div className="flex gap-0 border-b border-brand-border mt-6">
          <button
            onClick={() => setTab("discover")}
            className={`font-mono text-xs tracking-widest uppercase px-6 py-3 transition-all duration-200 ${
              tab === "discover"
                ? "text-brand-neon border-b-2 border-brand-neon -mb-px"
                : "text-brand-muted hover:text-brand-text"
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setTab("matches")}
            className={`font-mono text-xs tracking-widest uppercase px-6 py-3 transition-all duration-200 ${
              tab === "matches"
                ? "text-brand-neon border-b-2 border-brand-neon -mb-px"
                : "text-brand-muted hover:text-brand-text"
            }`}
          >
            Matches
          </button>
        </div>
      </div>

      {tab === "discover" && (
        <main className="flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <CharacterPanel
              gameId={gameId}
              myCharacter={myCharacter}
              userGame={userGame}
              userGamesLoading={userGamesHook.status === "loading"}
            />
            <DiscoveryPanel
              myCharacter={myCharacter}
              discoverQueue={discoverQueue}
              discoverStatus={discoverStatus}
              onLike={handleLike}
              onDislike={handleDislike}
            />
          </div>
        </main>
      )}

      {tab === "matches" && (
        <main className="flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
          {matchesLoading && (
            <p className="font-mono text-brand-muted tracking-widest uppercase text-sm">Loading...</p>
          )}
          {!matchesLoading && Object.keys(matchesByCharacter).length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="font-mono text-brand-muted tracking-widest uppercase text-sm">
                No matches yet for this realm.
              </p>
            </div>
          )}
          {!matchesLoading && Object.entries(matchesByCharacter).map(([charId, charGroup]) => (
            <div key={charId} className="mb-8">
              <div className="flex items-start gap-4 overflow-x-auto pb-4">
                <div className="flex-shrink-0 w-64">
                  <CharacterCard
                    gameId={gameId}
                    character={charGroup.myCharacter as Character}
                  />
                </div>
                {charGroup.matches.map((m) => (
                  <div key={m.matchId} className="flex-shrink-0 w-64">
                    <MatchCard character={m.theirCharacter} matchedAt={m.matchedAt} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/RealmPage.tsx
git commit -m "feat: add Discover/Matches tabs to RealmPage"
```

---

## Task 10: CharactersPage styling

**Files:**
- Modify: `apps/web/src/pages/CharacterPage.tsx`

- [ ] **Step 1: Apply consistent page styling**

Replace the full contents of `apps/web/src/pages/CharacterPage.tsx` with:

```tsx
import { CharacterCard } from "../components/cards/CharacterCard";
import { useCharacters } from "../hooks/useCharacters";
import { useUserGames } from "../hooks/useUserGame";
import { FullScreenStatus } from "../components/layout/FullScreenStatus";

export default function CharactersPage() {
  const { data, loading } = useCharacters();
  const userGamesHook = useUserGames();

  const userGames =
    userGamesHook.status === "success" ? userGamesHook.games : [];

  if (loading) return <FullScreenStatus type="loading" />;

  const groupedCharacters = data.reduce((groups, character) => {
    const key = character.userGameId ?? "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(character);
    return groups;
  }, {} as Record<string, typeof data>);

  const isEmpty = Object.keys(groupedCharacters).length === 0;

  return (
    <div className="px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
      <h1
        className="font-display font-black text-3xl uppercase tracking-widest text-brand-text mb-10"
        style={{ textShadow: "0 0 30px rgba(0,229,255,0.3)" }}
      >
        Characters
      </h1>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-mono text-brand-muted tracking-widest uppercase text-sm">
            No characters yet — visit a Realm to create one.
          </p>
        </div>
      )}

      {Object.entries(groupedCharacters).map(([userGameId, characters]) => {
        const userGame = userGames.find((ug) => ug.id === userGameId);
        return (
          <div key={userGameId} className="mb-12">
            <div className="border-b border-brand-border pb-3 mb-6">
              <h2 className="font-display font-black text-2xl uppercase tracking-wide text-brand-text">
                {userGame?.gameName ?? "Unknown Game"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-4">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  gameId={userGame?.gameId}
                  character={character}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/CharacterPage.tsx
git commit -m "feat: apply consistent page styling to CharactersPage"
```

---

## Task 11: SignedInLayout nav links

**Files:**
- Modify: `apps/web/src/components/layout/SignedInLayout.tsx`

- [ ] **Step 1: Add Characters and Matches nav links**

In `apps/web/src/components/layout/SignedInLayout.tsx`, add the `Link` import and two nav links.

Add `Link` to the import at the top:

```tsx
import { Outlet, Navigate, useOutletContext, Link } from "react-router-dom";
```

In the `rightSlot` of `<NavBar>`, add the two links before `{navExtra}`:

```tsx
<NavBar
  rightSlot={
    <>
      <Link
        to="/characters"
        className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
      >
        Characters
      </Link>
      <Link
        to="/matches"
        className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
      >
        Matches
      </Link>
      {navExtra}
      <span className="font-mono text-[11px] text-brand-muted tracking-widest uppercase hidden sm:block">
        {username}
      </span>
      <SignOutButton />
    </>
  }
/>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/SignedInLayout.tsx
git commit -m "feat: add Characters and Matches nav links to SignedInLayout"
```
