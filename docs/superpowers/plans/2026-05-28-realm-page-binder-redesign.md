# RealmPage Binder Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign RealmPage into a binder motif with a reusable `BinderLayout` shell, left/right page split, inline character wizard, and a pending likes tray backed by a new backend endpoint.

**Architecture:** `RealmPage` becomes a thin data loader that assembles `BinderLayout` with `RealmLeftPage` and `RealmRightPage` as slot content. A new `GET /api/character-interactions/pending` endpoint feeds the `PendingLikesBar` component. All binder chrome (`BinderLayout`, `BinderTabs`) is reusable across other pages.

**Tech Stack:** ASP.NET Core 8 / EF Core (backend), React + TypeScript + Vite + Tailwind (frontend), xUnit + WebApplicationFactory (backend tests)

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `apps/web/src/components/layout/BinderTabs.tsx` | Rotated side tabs, data-driven |
| `apps/web/src/components/layout/BinderLayout.tsx` | Reusable two-column binder shell |
| `apps/web/src/components/cards/CharacterMiniCard.tsx` | Avatar + name for the spine bar |
| `apps/web/src/components/PendingLikesBar.tsx` | Collapsible pending likes tray |
| `apps/web/src/components/RealmLeftPage.tsx` | Left content area with state machine |
| `apps/web/src/components/RealmRightPage.tsx` | Game info + matches grid |
| `apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/PendingLikesTests.cs` | Integration tests for pending likes |

### Modified files
| File | Change |
|------|--------|
| `apps/api/Services/Interfaces/ICharacterInteractionService.cs` | Add `GetPendingLikesAsync` |
| `apps/api/Services/CharacterInteractionService.cs` | Implement `GetPendingLikesAsync` |
| `apps/api/Controllers/CharacterInteractionController.cs` | Add `GET pending` action |
| `apps/web/src/api/endpoints/characters.ts` | Add `getPendingLikes` function |
| `apps/web/src/components/DiscoveryPanel.tsx` | Remove internal filter menu rendering |
| `apps/web/src/components/MatchGallery.tsx` | Add `limit` prop |
| `apps/web/src/pages/RealmPage.tsx` | Refactor to thin data loader |

---

## Task 1: Backend — Add `GetPendingLikesAsync` to service interface and implementation

**Files:**
- Modify: `apps/api/Services/Interfaces/ICharacterInteractionService.cs`
- Modify: `apps/api/Services/CharacterInteractionService.cs`

- [ ] **Step 1: Add the method to the interface**

Open `apps/api/Services/Interfaces/ICharacterInteractionService.cs` and replace the entire file:

```csharp
using PartyUp.Api.Models.DTOs.Character;

public interface ICharacterInteractionService
{
    Task<MatchResponse> RecordInteractionAsync(CharacterInteractionRequest request, Guid userId);
    Task<List<DiscoverCharacterResponse>> GetPendingLikesAsync(Guid characterId, Guid userId);
}
```

- [ ] **Step 2: Implement `GetPendingLikesAsync` in the service**

Open `apps/api/Services/CharacterInteractionService.cs` and add the following method inside the class (before the closing `}`):

```csharp
public async Task<List<DiscoverCharacterResponse>> GetPendingLikesAsync(Guid characterId, Guid userId)
{
    var ownsCharacter = await _db.Characters
        .Include(c => c.UserGame)
        .AnyAsync(c => c.Id == characterId && c.UserGame.UserId == userId);

    if (!ownsCharacter)
        throw new UnauthorizedAccessException("Character does not belong to the authenticated user");

    var iAlreadyRespondedTo = await _db.CharacterInteractions
        .Where(i => i.FromCharacterId == characterId)
        .Select(i => i.ToCharacterId)
        .ToListAsync();

    var pendingLikerIds = await _db.CharacterInteractions
        .Where(i =>
            i.ToCharacterId == characterId &&
            i.Type == InteractionType.Like &&
            !iAlreadyRespondedTo.Contains(i.FromCharacterId))
        .Select(i => i.FromCharacterId)
        .ToListAsync();

    return await _db.Characters
        .Include(c => c.UserGame)
            .ThenInclude(ug => ug.Game)
        .Include(c => c.FieldValues)
            .ThenInclude(fv => fv.FieldDefinition)
        .Where(c => pendingLikerIds.Contains(c.Id))
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
                FieldDefinitionId = fv.FieldDefinitionId,
                Key = fv.FieldDefinition.Key,
                Label = fv.FieldDefinition.Label,
                Value = fv.Value,
                Type = fv.FieldDefinition.Type.ToString()
            }).ToList(),
        })
        .ToListAsync();
}
```

Also add the using at the top of `CharacterInteractionService.cs`:

```csharp
using PartyUp.Api.Models.DTOs.Character;
```

- [ ] **Step 3: Verify it builds**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/Services/Interfaces/ICharacterInteractionService.cs apps/api/Services/CharacterInteractionService.cs
git commit -m "feat: add GetPendingLikesAsync to character interaction service"
```

---

## Task 2: Backend — Add `GET /api/character-interactions/pending` controller action

**Files:**
- Modify: `apps/api/Controllers/CharacterInteractionController.cs`

- [ ] **Step 1: Add the GET action**

Open `apps/api/Controllers/CharacterInteractionController.cs` and replace the entire file:

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.Character;

[ApiController]
[Route("api/character-interactions")]
[Authorize]
public class CharacterInteractionController : ControllerBase
{
    private readonly ICharacterInteractionService _service;

    public CharacterInteractionController(ICharacterInteractionService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<ActionResult<MatchResponse>> RecordInteraction([FromBody] CharacterInteractionRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var result = await _service.RecordInteractionAsync(request, userId);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("pending")]
    public async Task<ActionResult<List<DiscoverCharacterResponse>>> GetPendingLikes([FromQuery] Guid characterId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var result = await _service.GetPendingLikesAsync(characterId, userId);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
```

- [ ] **Step 2: Build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/Controllers/CharacterInteractionController.cs
git commit -m "feat: add GET /api/character-interactions/pending endpoint"
```

---

## Task 3: Backend — Integration tests for pending likes

**Files:**
- Create: `apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/PendingLikesTests.cs`

- [ ] **Step 1: Write the tests**

Create `apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/PendingLikesTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Models;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.CharacterInteractions;

public class PendingLikesTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 30_000;

    public PendingLikesTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetPendingLikes_WhenOtherUserLikedMe_ReturnsTheirCharacter()
    {
        var (charA, charB, clientA, clientB) = await SetupTwoUsersWithCharactersAsync();

        // charA likes charB
        await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = InteractionType.Like
        });

        // charB queries pending likes — should see charA
        var response = await clientB.GetAsync($"/api/character-interactions/pending?characterId={charB}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pending = await response.Content.ReadFromJsonAsync<List<PendingCharacterDto>>();
        pending.Should().HaveCount(1);
        pending![0].Id.Should().Be(charA);
    }

    [Fact]
    public async Task GetPendingLikes_WhenIAlreadyRespondedWithLike_ReturnsEmpty()
    {
        var (charA, charB, clientA, clientB) = await SetupTwoUsersWithCharactersAsync();

        await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = InteractionType.Like
        });

        // charB responds — mutual match
        await clientB.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charB,
            toCharacterId = charA,
            type = InteractionType.Like
        });

        var response = await clientB.GetAsync($"/api/character-interactions/pending?characterId={charB}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pending = await response.Content.ReadFromJsonAsync<List<PendingCharacterDto>>();
        pending.Should().BeEmpty();
    }

    [Fact]
    public async Task GetPendingLikes_WhenIAlreadyRespondedWithDislike_ReturnsEmpty()
    {
        var (charA, charB, clientA, clientB) = await SetupTwoUsersWithCharactersAsync();

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
            type = InteractionType.Dislike
        });

        var response = await clientB.GetAsync($"/api/character-interactions/pending?characterId={charB}");
        var pending = await response.Content.ReadFromJsonAsync<List<PendingCharacterDto>>();
        pending.Should().BeEmpty();
    }

    [Fact]
    public async Task GetPendingLikes_WithAnotherUsersCharacterId_ReturnsForbidden()
    {
        var (charA, _, _, clientB) = await SetupTwoUsersWithCharactersAsync();

        // clientB tries to query pending likes for charA (which belongs to clientA)
        var response = await clientB.GetAsync($"/api/character-interactions/pending?characterId={charA}");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetPendingLikes_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync($"/api/character-interactions/pending?characterId={Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<(Guid CharA, Guid CharB, HttpClient ClientA, HttpClient ClientB)>
        SetupTwoUsersWithCharactersAsync()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var sharedExternalId = Interlocked.Increment(ref _gameCounter);
        var ugA = await AddGameAsync(clientA, sharedExternalId);
        var ugB = await AddGameAsync(clientB, sharedExternalId);

        var charA = await CreateCharacterAsync(clientA, ugA.Id);
        var charB = await CreateCharacterAsync(clientB, ugB.Id);

        return (charA, charB, clientA, clientB);
    }

    private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId)
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Character",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterIdDto>())!.Id;
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
        return (await response.Content.ReadFromJsonAsync<AddGameResultDto>())!.UserGame;
    }

    private record UserGameDto(Guid Id, Guid GameId);
    private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
    private record CharacterIdDto(Guid Id);
    private record PendingCharacterDto(Guid Id, string Name);
}
```

- [ ] **Step 2: Run the tests — expect them to pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~PendingLikesTests" --logger "console;verbosity=normal"
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/PendingLikesTests.cs
git commit -m "test: add integration tests for GET /api/character-interactions/pending"
```

---

## Task 4: Frontend — Add `getPendingLikes` API function

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`

- [ ] **Step 1: Add the function**

Open `apps/web/src/api/endpoints/characters.ts` and add this function at the bottom of the file:

```ts
export function getPendingLikes(characterId: string) {
  return apiGet<DiscoverCharacter[]>(`/character-interactions/pending?characterId=${characterId}`)
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts
git commit -m "feat: add getPendingLikes API function"
```

---

## Task 5: Frontend — `BinderTabs` component

**Files:**
- Create: `apps/web/src/components/layout/BinderTabs.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/layout/BinderTabs.tsx`:

```tsx
export type BinderTabDef = {
  label: string
  color: string
  active?: boolean
  onClick: () => void
}

interface BinderTabsProps {
  tabs: BinderTabDef[]
}

export function BinderTabs({ tabs }: BinderTabsProps) {
  return (
    <section className="flex rotate-90 origin-bottom-right absolute right-0 top-3/4 gap-12 z-10">
      {tabs.map(tab => (
        <button
          key={tab.label}
          onClick={tab.onClick}
          className="w-32 rounded-t border-white border-b-2 py-1 text-xs font-mono text-white uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ backgroundColor: tab.color }}
        >
          {tab.label}
        </button>
      ))}
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/BinderTabs.tsx
git commit -m "feat: add BinderTabs component"
```

---

## Task 6: Frontend — `BinderLayout` component

**Files:**
- Create: `apps/web/src/components/layout/BinderLayout.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/layout/BinderLayout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { BinderTabs, type BinderTabDef } from './BinderTabs'

interface BinderLayoutProps {
  barColor: string
  barContent?: ReactNode
  leftContent: ReactNode
  rightContent: ReactNode
  tabs?: BinderTabDef[]
}

export function BinderLayout({ barColor, barContent, leftContent, rightContent, tabs }: BinderLayoutProps) {
  return (
    <main className="grid grid-cols-2 border-white border-2 m-4 me-8 w-full relative min-h-0">
      {/* Left page */}
      <div className="flex border-r border-border min-h-0">
        {/* Spine bar */}
        <div
          className="min-w-48 flex flex-col items-center pt-16 shrink-0"
          style={{ backgroundColor: barColor }}
        >
          {barContent}
        </div>
        {/* Left content area */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {leftContent}
        </div>
      </div>

      {/* Right page */}
      <div className="flex flex-col min-h-0 overflow-hidden">
        {rightContent}
      </div>

      {tabs && tabs.length > 0 && <BinderTabs tabs={tabs} />}
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/BinderLayout.tsx
git commit -m "feat: add BinderLayout component"
```

---

## Task 7: Frontend — `CharacterMiniCard` component

**Files:**
- Create: `apps/web/src/components/cards/CharacterMiniCard.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/cards/CharacterMiniCard.tsx`:

```tsx
import type { Character } from '../../api/endpoints/characters'

interface CharacterMiniCardProps {
  character: Character
}

export function CharacterMiniCard({ character }: CharacterMiniCardProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-2 w-full">
      {character.imageUrl ? (
        <img
          src={character.imageUrl}
          alt={character.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-black/20 border-2 border-white/20 flex items-center justify-center">
          <span className="text-sm font-mono text-white font-bold">
            {character.name[0].toUpperCase()}
          </span>
        </div>
      )}
      <span className="text-xs font-mono text-white text-center leading-tight break-all px-1">
        {character.name}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/CharacterMiniCard.tsx
git commit -m "feat: add CharacterMiniCard component"
```

---

## Task 8: Frontend — Update `MatchGallery` to accept a `limit` prop

**Files:**
- Modify: `apps/web/src/components/MatchGallery.tsx`

- [ ] **Step 1: Add the `limit` prop**

Open `apps/web/src/components/MatchGallery.tsx` and replace the entire file:

```tsx
import { useEffect, useState } from 'react'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { MatchCard } from './cards/MatchCard'
import { EmptyState, Spinner } from './ui'

interface MatchGalleryProps {
  gameId?: string
  limit?: number
}

export function MatchGallery({ gameId, limit }: MatchGalleryProps) {
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

  const displayed = limit !== undefined ? matches.slice(0, limit) : matches

  return (
    <div className="grid grid-cols-3 gap-4">
      {displayed.map(m => (
        <MatchCard
          key={m.matchId}
          character={m.theirCharacter}
          gameName={m.gameName}
          matchedAt={m.matchedAt}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/MatchGallery.tsx
git commit -m "feat: add limit prop to MatchGallery"
```

---

## Task 9: Frontend — `PendingLikesBar` component

**Files:**
- Create: `apps/web/src/components/PendingLikesBar.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/PendingLikesBar.tsx`:

```tsx
import { useEffect, useState } from 'react'
import {
  getPendingLikes,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
} from '../api/endpoints/characters'

interface PendingLikesBarProps {
  character: Character
  onMatch: () => void
}

export function PendingLikesBar({ character, onMatch }: PendingLikesBarProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<DiscoverCharacter[]>([])

  useEffect(() => {
    getPendingLikes(character.id).then(setPending).catch(() => {})
  }, [character.id])

  async function handleInteract(toCharacterId: string, type: 'Like' | 'Dislike') {
    try {
      const res = await interactWithCharacter(character.id, toCharacterId, type)
      if (res.isMatch) onMatch()
    } catch { /* fail silently */ }
    setPending(p => p.filter(c => c.id !== toCharacterId))
  }

  if (pending.length === 0) return null

  return (
    <div className="relative border-t border-border">
      {open && (
        <div className="absolute bottom-full left-0 right-0 z-50 bg-surface border-t border-border p-4 shadow-lg">
          <div className="flex gap-6">
            {pending.slice(0, 3).map(c => (
              <div key={c.id} className="flex flex-col items-center gap-1.5">
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center">
                    <span className="text-xs font-mono text-muted font-bold">
                      {c.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xs font-mono text-text text-center max-w-16 truncate">
                  {c.name}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInteract(c.id, 'Like')}
                    className="text-success text-base leading-none hover:scale-125 transition-transform"
                    aria-label={`Like ${c.name}`}
                  >
                    ♥
                  </button>
                  <button
                    onClick={() => handleInteract(c.id, 'Dislike')}
                    className="text-danger text-base leading-none hover:scale-125 transition-transform"
                    aria-label={`Pass on ${c.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-2.5 text-xs font-mono text-muted uppercase tracking-widest hover:text-text transition-colors flex items-center justify-between"
      >
        <span>{pending.length} pending {pending.length === 1 ? 'like' : 'likes'}</span>
        <span className="text-muted">{open ? '▼' : '▲'}</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/PendingLikesBar.tsx
git commit -m "feat: add PendingLikesBar component"
```

---

## Task 10: Frontend — `RealmRightPage` component

**Files:**
- Create: `apps/web/src/components/RealmRightPage.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/RealmRightPage.tsx`:

```tsx
import DOMPurify from 'dompurify'
import type { UserGameDetail } from '../api/endpoints/userGames'
import { MatchGallery } from './MatchGallery'

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
}

export function RealmRightPage({ userGame, gameId }: RealmRightPageProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Game details — top 1/3 */}
      <div className="flex-[1] p-6 border-b border-border flex gap-4 items-start overflow-hidden">
        {userGame.gameImageUrl && (
          <img
            src={userGame.gameImageUrl}
            alt={userGame.gameName}
            className="w-16 h-16 object-cover rounded shrink-0"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-display font-bold text-2xl text-text">{userGame.gameName}</h1>
          {userGame.description && (
            <div
              className="mt-2 text-sm text-muted line-clamp-4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userGame.description) }}
            />
          )}
        </div>
      </div>

      {/* Matches grid — bottom 2/3 */}
      <div className="flex-[2] p-6 overflow-hidden">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Matches</h2>
        <MatchGallery gameId={gameId} limit={6} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/RealmRightPage.tsx
git commit -m "feat: add RealmRightPage component"
```

---

## Task 11: Frontend — `DiscoveryPanel` — remove internal filter rendering

The filter bar is now managed by `RealmLeftPage`. `DiscoveryPanel` still receives filter props for the API call but should not render `DiscoveryFilterMenu` itself.

**Files:**
- Modify: `apps/web/src/components/DiscoveryPanel.tsx`

- [ ] **Step 1: Remove the filter menu block and unused imports**

Open `apps/web/src/components/DiscoveryPanel.tsx` and replace the entire file:

```tsx
import { useEffect, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { SwipeCard } from './cards/SwipeCard'
import { Spinner, EmptyState } from './ui'
import type { GameFieldDefinition } from '../api/endpoints/games'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character | null | 'loading'
  onMatch: () => void
  gamePlatforms?: string[]
  filters: Record<string, string>
  activePlatforms: string[]
  onFiltersChange: (key: string, value: string) => void
  onPlatformChange: (platforms: string[]) => void
  fields: GameFieldDefinition[]
}

export function DiscoveryPanel({
  gameId,
  myCharacter,
  onMatch,
  gamePlatforms = [],
  filters,
  activePlatforms,
  onFiltersChange,
  onPlatformChange,
  fields,
}: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')

  useEffect(() => {
    setStatus('loading')
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '')
    )
    discoverCharacters(
      gameId,
      activeFilters,
      activePlatforms.length > 0 ? activePlatforms : undefined
    )
      .then(chars => {
        setQueue(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId, filters, activePlatforms])

  async function handleInteract(type: 'Like' | 'Dislike') {
    const current = queue[0]
    if (!current || !myCharacter || myCharacter === 'loading') return
    try {
      const res = await interactWithCharacter(myCharacter.id, current.id, type)
      if (res.isMatch) onMatch()
    } catch { /* fail silently */ }
    setQueue(q => {
      const next = q.slice(1)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }

  if (!myCharacter || myCharacter === 'loading') {
    return <EmptyState message="Create a character to start matching" />
  }

  return (
    <div className="flex flex-col gap-4">
      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner label="Scanning the realm..." /></div>
      )}

      {(status === 'empty' || status === 'error') && (
        <EmptyState
          message={status === 'empty' ? 'All caught up — check back later.' : 'Could not load players.'}
        />
      )}

      {status === 'ready' && (
        <div className="relative" style={{ height: '520px' }}>
          {queue.slice(0, 2).map((char, i) => (
            <SwipeCard
              key={char.id}
              character={char}
              onLike={() => handleInteract('Like')}
              onDislike={() => handleInteract('Dislike')}
              isTop={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/DiscoveryPanel.tsx
git commit -m "refactor: remove internal filter menu from DiscoveryPanel"
```

---

## Task 12: Frontend — `RealmLeftPage` component

**Files:**
- Create: `apps/web/src/components/RealmLeftPage.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/RealmLeftPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { Character } from '../api/endpoints/characters'
import type { UserGameDetail } from '../api/endpoints/userGames'
import { CreateCharacterWizard } from './character-wizard/CreateCharacterWizard'
import { DiscoveryPanel } from './DiscoveryPanel'
import { DiscoveryFilterMenu } from './DiscoveryFilterMenu'
import { PendingLikesBar } from './PendingLikesBar'
import { useFieldDefinitions } from '../hooks/useFieldDefinitions'
import { Button } from './ui'

type Zone = 'prompt' | 'wizard' | 'discovery'

interface RealmLeftPageProps {
  gameId: string
  userGame: UserGameDetail
  character: Character | null
  onCharacterCreated: () => void
  onMatch: () => void
}

export function RealmLeftPage({ gameId, userGame, character, onCharacterCreated, onMatch }: RealmLeftPageProps) {
  const [zone, setZone] = useState<Zone>(character ? 'discovery' : 'prompt')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [activePlatforms, setActivePlatforms] = useState<string[]>([])

  const { data: fieldDefs } = useFieldDefinitions(gameId)
  const fields = fieldDefs?.schemaStatus === 'Generated' ? fieldDefs.fields : []
  const gamePlatforms = userGame.platforms ?? []

  // Transition to discovery when character arrives after wizard completion
  useEffect(() => {
    if (character && zone === 'wizard') {
      setZone('discovery')
    }
  }, [character, zone])

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (value === '') delete next[key]
      else next[key] = value
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar — only in discovery mode */}
      {zone === 'discovery' && (
        <div className="px-4 py-3 border-b border-border">
          <DiscoveryFilterMenu
            fields={fields}
            gamePlatforms={gamePlatforms}
            filters={filters}
            activePlatforms={activePlatforms}
            onChange={handleFilterChange}
            onPlatformChange={setActivePlatforms}
          />
        </div>
      )}

      {/* Main zone — grows to fill available space */}
      <div className="flex-1 p-6 overflow-y-auto">
        {zone === 'prompt' && (
          <div className="flex flex-col items-start gap-3">
            <Button onClick={() => setZone('wizard')}>Create Character</Button>
          </div>
        )}

        {zone === 'wizard' && (
          <CreateCharacterWizard
            userGameId={userGame.id}
            gameId={gameId}
            platforms={gamePlatforms}
            onSuccess={onCharacterCreated}
          />
        )}

        {zone === 'discovery' && character && (
          <DiscoveryPanel
            gameId={gameId}
            myCharacter={character}
            gamePlatforms={gamePlatforms}
            filters={filters}
            activePlatforms={activePlatforms}
            onFiltersChange={handleFilterChange}
            onPlatformChange={setActivePlatforms}
            fields={fields}
            onMatch={onMatch}
          />
        )}
      </div>

      {/* Pending likes tray — pinned to bottom in discovery mode */}
      {zone === 'discovery' && character && (
        <PendingLikesBar character={character} onMatch={onMatch} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/RealmLeftPage.tsx
git commit -m "feat: add RealmLeftPage component with prompt/wizard/discovery state machine"
```

---

## Task 13: Frontend — Refactor `RealmPage` into a thin data loader

**Files:**
- Modify: `apps/web/src/pages/RealmPage.tsx`

- [ ] **Step 1: Replace the file**

Open `apps/web/src/pages/RealmPage.tsx` and replace the entire file:

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { RealmLeftPage } from '../components/RealmLeftPage'
import { RealmRightPage } from '../components/RealmRightPage'
import { Spinner } from '../components/ui'

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [matchBanner, setMatchBanner] = useState(false)

  useEffect(() => {
    if (!gameId) return
    getUserGameByGameId(gameId)
      .then(ug => {
        setUserGame(ug)
        return getUserGameCharacters(ug.id)
      })
      .then(chars => {
        setCharacter(chars.find(c => c.userGameId) ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gameId])

  async function handleCharacterCreated() {
    if (!userGame) return
    const chars = await getUserGameCharacters(userGame.id)
    setCharacter(chars.find(c => c.userGameId) ?? null)
  }

  function handleMatch() {
    setMatchBanner(true)
    setTimeout(() => setMatchBanner(false), 2500)
  }

  if (loading) {
    return <div className="flex w-screen justify-center py-24"><Spinner /></div>
  }

  if (!userGame) return null

  return (
    <>
      {matchBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-white px-6 py-3 rounded-lg font-mono text-sm shadow-lg">
          It's a match!
        </div>
      )}
      <BinderLayout
        barColor="#991b1b"
        barContent={character ? <CharacterMiniCard character={character} /> : undefined}
        leftContent={
          <RealmLeftPage
            gameId={gameId!}
            userGame={userGame}
            character={character}
            onCharacterCreated={handleCharacterCreated}
            onMatch={handleMatch}
          />
        }
        rightContent={
          <RealmRightPage
            userGame={userGame}
            gameId={gameId!}
          />
        }
      />
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Run all backend tests to check nothing regressed**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --logger "console;verbosity=normal"
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/RealmPage.tsx
git commit -m "feat: refactor RealmPage into thin data loader using BinderLayout"
```

---

## Self-Review Checklist

- [x] **Spec coverage**
  - ✅ Binder layout with colored spine bar → `BinderLayout` (Task 6)
  - ✅ Bar color as variable → `barColor` prop (Task 6)
  - ✅ Character mini card in bar → `CharacterMiniCard` (Task 7)
  - ✅ Create character button → inline wizard → discovery state machine → `RealmLeftPage` (Task 12)
  - ✅ Filter bar overlays at top of left page → `DiscoveryFilterMenu` in `RealmLeftPage` (Task 12)
  - ✅ Right page: game details top 1/3 + matches grid 2/3, max 6 → `RealmRightPage` + `MatchGallery limit` (Tasks 8, 10)
  - ✅ Pending likes tray at bottom with heart/X → `PendingLikesBar` (Task 9)
  - ✅ Pending likes backend endpoint → Tasks 1–3
  - ✅ Tabs as a component → `BinderTabs` (Task 5)
  - ✅ No discover/matches toggle (removed)
  - ✅ Mobile: explicitly deferred

- [x] **No placeholders** — all steps contain complete code

- [x] **Type consistency**
  - `DiscoverCharacter` used in `PendingLikesBar`, `getPendingLikes`, and backend `DiscoverCharacterResponse` — consistent
  - `Character` (not `DiscoverCharacter`) used for `CharacterMiniCard` and `PendingLikesBar` props — correct, the user's own character is a full `Character`
  - `onCharacterCreated: () => void` in `RealmLeftPage` — matches the callback in `RealmPage.handleCharacterCreated`
  - `CreateCharacterWizard.onSuccess: () => void` — unchanged, still matches
