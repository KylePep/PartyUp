# Character Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all character cards to a TCG aesthetic with full-image art boxes, a 3D flip mechanic for discovery/match cards, a compact card for the user's own characters, and a new D&D stat-sheet detail page.

**Architecture:** A shared `FlippableCard` wrapper owns the 3D CSS flip animation; `SwipeCard` and `MatchCard` compose it with their own front/back faces. `CharacterCard` is rewritten as a compact TCG card that navigates to a new `/characters/:characterId` route backed by a new backend `GET /characters/:id` endpoint. `CharacterDetailCard` is a new stat-sheet component rendered on that page.

**Tech Stack:** React + TypeScript + Tailwind CSS (frontend), ASP.NET Core 8 + EF Core (backend), xUnit + WebApplicationFactory integration tests.

---

## File Map

| Action | Path |
|--------|------|
| Create | `apps/web/src/components/cards/FlippableCard.tsx` |
| Rewrite | `apps/web/src/components/cards/SwipeCard.tsx` |
| Rewrite | `apps/web/src/components/cards/MatchCard.tsx` |
| Rewrite | `apps/web/src/components/cards/CharacterCard.tsx` |
| Create | `apps/web/src/components/cards/CharacterDetailCard.tsx` |
| Create | `apps/web/src/pages/CharacterDetailPage.tsx` |
| Modify | `apps/web/src/App.tsx` |
| Modify | `apps/web/src/api/endpoints/characters.ts` |
| Modify | `apps/api/Services/Interfaces/ICharacterService.cs` |
| Modify | `apps/api/Services/CharacterService.cs` |
| Modify | `apps/api/Controllers/CharactersController.cs` |
| Create | `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterGetByIdTests.cs` |

---

## Task 1: Backend — GET /characters/:id endpoint

**Files:**
- Create: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterGetByIdTests.cs`
- Modify: `apps/api/Services/Interfaces/ICharacterService.cs`
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/api/Controllers/CharactersController.cs`

- [ ] **Step 1: Write the failing tests**

Create `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterGetByIdTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Characters;

public class CharacterGetByIdTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 50_000;

    public CharacterGetByIdTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetCharacterById_ReturnsCharacter_WhenOwned()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        var createResponse = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Solo Hero",
            platform = "PC",
            platformHandle = "SoloHandle",
            userGameId = userGame.Id,
            preferredModes = Array.Empty<string>()
        });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<CharacterIdDto>();

        var response = await client.GetAsync($"/api/characters/{created!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var character = await response.Content.ReadFromJsonAsync<CharacterNameDto>();
        character!.Name.Should().Be("Solo Hero");
    }

    [Fact]
    public async Task GetCharacterById_Returns404_WhenOwnedByOtherUser()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var userGameB = await AddGameAsync(clientB);
        var createResponse = await clientB.PostAsJsonAsync("/api/characters", new
        {
            name = "Their Hero",
            platform = "PC",
            platformHandle = "TheirHandle",
            userGameId = userGameB.Id,
            preferredModes = Array.Empty<string>()
        });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<CharacterIdDto>();

        var response = await clientA.GetAsync($"/api/characters/{created!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetCharacterById_Returns401_WhenUnauthenticated()
    {
        var response = await Client.GetAsync($"/api/characters/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<UserGameDto> AddGameAsync(HttpClient client)
    {
        var id = Interlocked.Increment(ref _gameCounter);
        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AddGameResultDto>())!.UserGame;
    }

    private record UserGameDto(Guid Id, Guid UserId, Guid GameId, string GameName);
    private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
    private record CharacterIdDto(Guid Id);
    private record CharacterNameDto(string Name);
}
```

- [ ] **Step 2: Run to confirm the tests fail**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterGetByIdTests" --no-build
```

Expected: build failure or 404 because route doesn't exist yet.

- [ ] **Step 3: Add method to ICharacterService**

In `apps/api/Services/Interfaces/ICharacterService.cs`, add the new method:

```csharp
using PartyUp.Api.Models.DTOs.Character;

public interface ICharacterService
{
  Task<CharacterResponse?> CreateCharacterAsync(Guid userId, Guid userGameId, CreateCharacterRequest request);
  Task<List<CharacterResponse>> GetCharactersForUserGameAsync(Guid userId, Guid userGameId);
  Task<List<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId);
  Task<CharacterResponse?> GetCharacterByIdAsync(Guid userId, Guid characterId);
  Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(
      Guid userId,
      Guid gameId,
      Dictionary<string, string>? filters = null,
      List<string>? platformFilters = null);
  Task<bool> UpdateCharacterAsync(Guid userId, Guid userGameId, Guid characterId, UpdateCharacterRequest request);
  Task<bool> DeleteCharacterAsync(Guid userId, Guid userGameId, Guid characterId);
}
```

- [ ] **Step 4: Implement GetCharacterByIdAsync in CharacterService**

In `apps/api/Services/CharacterService.cs`, add this method after `GetAllCharactersForUserAsync`:

```csharp
public async Task<CharacterResponse?> GetCharacterByIdAsync(Guid userId, Guid characterId)
{
  return await _db.Characters
    .Where(c => c.Id == characterId && c.UserGame.UserId == userId)
    .Select(ToProjection())
    .FirstOrDefaultAsync();
}
```

- [ ] **Step 5: Add GET {id} endpoint to CharactersController**

In `apps/api/Controllers/CharactersController.cs`, add this method after `GetMyCharacterByUserGameId`:

```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetMyCharacterById(Guid id)
{
  var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
  var result = await _characterService.GetCharacterByIdAsync(userId, id);
  return result is null ? NotFound() : Ok(result);
}
```

- [ ] **Step 6: Run the tests and confirm they pass**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterGetByIdTests"
```

Expected: 3 passing tests.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Services/Interfaces/ICharacterService.cs apps/api/Services/CharacterService.cs apps/api/Controllers/CharactersController.cs apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterGetByIdTests.cs
git commit -m "feat: add GET /characters/:id endpoint scoped to authenticated user"
```

---

## Task 2: Frontend — getCharacterById API function

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`

- [ ] **Step 1: Add getCharacterById to characters.ts**

In `apps/web/src/api/endpoints/characters.ts`, add this function at the end of the file:

```typescript
export function getCharacterById(id: string) {
  return apiGet<Character>(`/characters/${id}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts
git commit -m "feat: add getCharacterById frontend API function"
```

---

## Task 3: FlippableCard component

**Files:**
- Create: `apps/web/src/components/cards/FlippableCard.tsx`

- [ ] **Step 1: Create FlippableCard.tsx**

Create `apps/web/src/components/cards/FlippableCard.tsx`:

```tsx
import { useState } from 'react'

interface FlippableCardProps {
  front: React.ReactNode
  back: React.ReactNode
  className?: string
}

export function FlippableCard({ front, back, className = '' }: FlippableCardProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className={className} style={{ perspective: '1000px' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
          {front}
          {/* Flip trigger — covers bottom 35% of the card (the bottom info panel) */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '35%',
              cursor: 'pointer',
              zIndex: 10,
            }}
            onClick={() => setFlipped(true)}
          />
        </div>
        {/* Back face — pre-rotated so it reads correctly when the container flips */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            cursor: 'pointer',
          }}
          onClick={() => setFlipped(false)}
        >
          {back}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/FlippableCard.tsx
git commit -m "feat: add FlippableCard 3D flip wrapper component"
```

---

## Task 4: Rewrite SwipeCard

**Files:**
- Rewrite: `apps/web/src/components/cards/SwipeCard.tsx`

- [ ] **Step 1: Replace SwipeCard.tsx with the TCG design**

Overwrite `apps/web/src/components/cards/SwipeCard.tsx` with:

```tsx
import { useState } from 'react'
import { Badge, Button } from '../ui'
import { type DiscoverCharacter } from '../../api/endpoints/characters'
import { FlippableCard } from './FlippableCard'

type ExitDirection = 'left' | 'right' | null

interface SwipeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
  isTop: boolean
}

const accentBorder = {
  border: '2px solid var(--color-accent)',
  boxShadow: '0 0 20px rgba(124, 111, 205, 0.35)',
}

function SwipeFront({ character }: { character: DiscoverCharacter }) {
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', ...accentBorder }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <span className="font-display font-bold text-text text-base truncate">{character.name}</span>
        {character.platform && (
          <span className="text-xs font-mono text-muted ml-2 flex-shrink-0">{character.platform}</span>
        )}
      </div>
      {/* Art box */}
      <div
        className="mx-3 flex-1 min-h-0 overflow-hidden rounded-md"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* Bottom panel */}
      <div className="px-3 pt-2 pb-3 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
        </div>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-2 mb-2">{character.bio}</p>
        )}
        <p className="text-xs text-muted text-center" style={{ opacity: 0.5 }}>↑ tap for more</p>
      </div>
    </div>
  )
}

function SwipeBack({ character }: { character: DiscoverCharacter }) {
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: '#000', ...accentBorder }}
    >
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <p className="font-display font-bold text-text text-lg mb-3">{character.name}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
          {character.mainRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Role</span>
              <Badge variant="role">{character.mainRole}</Badge>
            </div>
          )}
          {character.secondaryRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Alt Role</span>
              <Badge variant="role">{character.secondaryRole}</Badge>
            </div>
          )}
          {character.rank && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Rank</span>
              <Badge variant="rank">{character.rank}</Badge>
            </div>
          )}
          {character.region && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Region</span>
              <Badge variant="region">{character.region}</Badge>
            </div>
          )}
          {character.playstyle && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Playstyle</span>
              <Badge>{character.playstyle}</Badge>
            </div>
          )}
          {character.usesVoiceChat != null && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Voice</span>
              <Badge>{character.usesVoiceChat ? 'Yes' : 'No'}</Badge>
            </div>
          )}
        </div>
        {character.preferredModes.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Modes</span>
            <div className="flex flex-wrap gap-1">
              {character.preferredModes.map(m => <Badge key={m}>{m}</Badge>)}
            </div>
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
            <div className="grid grid-cols-2 gap-1">
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
          <div>
            <span className="text-xs text-muted block mb-1">Bio</span>
            <p className="text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
}

export function SwipeCard({ character, onLike, onDislike, isTop }: SwipeCardProps) {
  const [exiting, setExiting] = useState<ExitDirection>(null)

  function handle(dir: ExitDirection, action: () => void) {
    setExiting(dir)
    setTimeout(action, 380)
  }

  const animClass = isTop
    ? exiting === 'right'
      ? '[animation:slide-out-right_0.38s_ease_forwards]'
      : exiting === 'left'
      ? '[animation:slide-out-left_0.38s_ease_forwards]'
      : '[animation:slide-in-left_0.35s_ease_forwards]'
    : '[animation:card-enter_0.35s_ease_forwards]'

  return (
    <div
      className={`absolute inset-0 flex flex-col gap-2 ${animClass}`}
      style={{
        zIndex: isTop ? 2 : 1,
        transform: isTop ? undefined : 'scale(0.97) translateY(8px)',
      }}
    >
      <FlippableCard
        front={<SwipeFront character={character} />}
        back={<SwipeBack character={character} />}
        className="flex-1 min-h-0"
      />
      {isTop && (
        <div className="flex gap-3 flex-shrink-0">
          <Button
            variant="secondary"
            className="flex-1 border-danger/50 text-danger hover:bg-danger hover:text-white hover:border-danger"
            onClick={() => handle('left', onDislike)}
            disabled={!!exiting}
          >
            Pass
          </Button>
          <Button
            className="flex-1"
            onClick={() => handle('right', onLike)}
            disabled={!!exiting}
          >
            Like
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/SwipeCard.tsx
git commit -m "feat: rewrite SwipeCard as TCG card with 3D flip"
```

---

## Task 5: Rewrite MatchCard

**Files:**
- Rewrite: `apps/web/src/components/cards/MatchCard.tsx`

The MatchCard is rendered in a grid (MatchGallery). Unlike SwipeCard which fills its container, MatchCard defines its own height via `h-[380px]`. The border color is `--color-success` (green) to signal a positive relationship.

- [ ] **Step 1: Replace MatchCard.tsx with the TCG design**

Overwrite `apps/web/src/components/cards/MatchCard.tsx` with:

```tsx
import { Badge } from '../ui'
import type { CharacterSummary } from '../../api/endpoints/matches'
import { FlippableCard } from './FlippableCard'

interface MatchCardProps {
  character: CharacterSummary
  gameName: string
  matchedAt: string
}

const successBorder = {
  border: '2px solid var(--color-success)',
  boxShadow: '0 0 20px rgba(82, 199, 122, 0.30)',
}

function MatchFront({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', ...successBorder }}
    >
      {/* Top bar — platform handle is primary */}
      <div className="px-3 py-2 flex-shrink-0">
        <p className="font-display font-bold text-text text-base truncate">{character.platformHandle}</p>
        <p className="text-xs text-muted truncate">{character.name}</p>
      </div>
      {/* Art box */}
      <div
        className="mx-3 flex-1 min-h-0 overflow-hidden rounded-md"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* Bottom panel */}
      <div className="px-3 pt-2 pb-3 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
        </div>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-2 mb-1">{character.bio}</p>
        )}
        <p className="text-xs text-muted" style={{ opacity: 0.5 }}>
          {gameName} · Matched {date}
        </p>
        <p className="text-xs text-muted text-center mt-1" style={{ opacity: 0.5 }}>↑ tap for more</p>
      </div>
    </div>
  )
}

function MatchBack({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: '#000', ...successBorder }}
    >
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <p className="font-display font-bold text-text text-lg">{character.platformHandle}</p>
        <p className="text-sm text-muted mb-3">{character.name} · {gameName}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
          {character.mainRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Role</span>
              <Badge variant="role">{character.mainRole}</Badge>
            </div>
          )}
          {character.secondaryRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Alt Role</span>
              <Badge variant="role">{character.secondaryRole}</Badge>
            </div>
          )}
          {character.rank && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Rank</span>
              <Badge variant="rank">{character.rank}</Badge>
            </div>
          )}
          {character.region && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Region</span>
              <Badge variant="region">{character.region}</Badge>
            </div>
          )}
          {character.playstyle && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Playstyle</span>
              <Badge>{character.playstyle}</Badge>
            </div>
          )}
        </div>
        {character.gameFields.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Game Fields</span>
            <div className="grid grid-cols-2 gap-1">
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
          <div>
            <span className="text-xs text-muted block mb-1">Bio</span>
            <p className="text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}
        <p className="text-xs text-muted mt-3">Matched {date}</p>
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
}

export function MatchCard({ character, gameName, matchedAt }: MatchCardProps) {
  return (
    <div style={{ height: '380px' }}>
      <FlippableCard
        front={<MatchFront character={character} gameName={gameName} matchedAt={matchedAt} />}
        back={<MatchBack character={character} gameName={gameName} matchedAt={matchedAt} />}
        className="h-full"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/MatchCard.tsx
git commit -m "feat: rewrite MatchCard as TCG card with green border and 3D flip"
```

---

## Task 6: Rewrite CharacterCard

**Files:**
- Rewrite: `apps/web/src/components/cards/CharacterCard.tsx`

CharacterCard is used in `CharacterGallery` (passes `onDelete`) and `CharacterPanel` (passes `onEdit` + `onDelete`). Clicking the card navigates to `/characters/:id`. Edit/Delete buttons use `e.stopPropagation()` so they don't trigger navigation.

- [ ] **Step 1: Replace CharacterCard.tsx with the compact TCG design**

Overwrite `apps/web/src/components/cards/CharacterCard.tsx` with:

```tsx
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import type { Character } from '../../api/endpoints/characters'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden cursor-pointer transition-all hover:brightness-110"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      onClick={() => navigate(`/characters/${character.id}`)}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <span className="font-display font-semibold text-text text-sm truncate">{character.name}</span>
        {character.platformHandle && (
          <span className="text-xs font-mono text-muted ml-2 flex-shrink-0 truncate max-w-[50%]">
            {character.platformHandle}
          </span>
        )}
      </div>
      {/* Art box */}
      <div
        className="mx-3 h-28 overflow-hidden rounded-md"
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
      {/* Bottom panel */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        </div>
        {(onEdit || onDelete) && (
          <div
            className="flex gap-1 flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            {onEdit && (
              <Button
                variant="secondary"
                className="text-xs px-2 py-1"
                onClick={() => onEdit(character)}
              >
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/CharacterCard.tsx
git commit -m "feat: rewrite CharacterCard as compact TCG card with navigation"
```

---

## Task 7: CharacterDetailCard component

**Files:**
- Create: `apps/web/src/components/cards/CharacterDetailCard.tsx`

- [ ] **Step 1: Create CharacterDetailCard.tsx**

Create `apps/web/src/components/cards/CharacterDetailCard.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import type { Character } from '../../api/endpoints/characters'

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-4 py-2"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <span className="text-xs text-muted uppercase tracking-widest w-28 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex flex-wrap gap-1 min-w-0">{children}</div>
    </div>
  )
}

export function CharacterDetailCard({ character }: { character: Character }) {
  const navigate = useNavigate()

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '2px solid var(--color-accent)',
        boxShadow: '0 0 24px rgba(124, 111, 205, 0.25)',
      }}
    >
      {/* Action bar */}
      <div
        className="flex items-center px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <Button variant="secondary" onClick={() => navigate(-1)}>← Back to Realm</Button>
      </div>

      {/* Hero section */}
      <div
        className="flex gap-6 p-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-40 h-52 rounded-lg overflow-hidden flex-shrink-0"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {character.imageUrl ? (
            <img
              src={character.imageUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
              style={{ backgroundColor: 'var(--color-surface-raised)' }}
            >
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl text-text mb-1">{character.name}</h1>
          {character.platformHandle && (
            <p className="font-mono text-muted text-sm mb-1">{character.platformHandle}</p>
          )}
          <p className="text-xs text-muted mb-3">{character.platform}</p>
          <div className="flex flex-wrap gap-1.5">
            {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
            {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
            {character.rank && <Badge variant="rank">{character.rank}</Badge>}
            {character.region && <Badge variant="region">{character.region}</Badge>}
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div
        className="px-4 pt-3 pb-1"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h2 className="text-xs text-muted uppercase tracking-widest mb-1">Stats</h2>
        {character.playstyle && (
          <StatRow label="Playstyle">
            <span className="text-sm text-text">{character.playstyle}</span>
          </StatRow>
        )}
        {character.usesVoiceChat != null && (
          <StatRow label="Voice Chat">
            <span className="text-sm text-text">{character.usesVoiceChat ? 'Yes' : 'No'}</span>
          </StatRow>
        )}
        {character.preferredModes.length > 0 && (
          <StatRow label="Modes">
            {character.preferredModes.map(m => <Badge key={m}>{m}</Badge>)}
          </StatRow>
        )}
        {character.languages && character.languages.length > 0 && (
          <StatRow label="Languages">
            {character.languages.map(l => <Badge key={l}>{l}</Badge>)}
          </StatRow>
        )}
        {character.timeZone && (
          <StatRow label="Time Zone">
            <span className="text-sm text-text">{character.timeZone}</span>
          </StatRow>
        )}
        {character.activeTimes && character.activeTimes.length > 0 && (
          <StatRow label="Active Times">
            {character.activeTimes.map(t => <Badge key={t}>{t}</Badge>)}
          </StatRow>
        )}
      </div>

      {/* Game Fields section */}
      {character.gameFields.length > 0 && (
        <div
          className="px-4 pt-3 pb-1"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-xs text-muted uppercase tracking-widest mb-1">Game Fields</h2>
          {character.gameFields.map(f => (
            <StatRow key={f.key} label={f.label}>
              <span className="text-sm text-text">{f.value}</span>
            </StatRow>
          ))}
        </div>
      )}

      {/* Bio section */}
      {character.bio && (
        <div className="px-4 py-3">
          <h2 className="text-xs text-muted uppercase tracking-widest mb-2">Bio</h2>
          <p className="text-sm text-text leading-relaxed">{character.bio}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/CharacterDetailCard.tsx
git commit -m "feat: add CharacterDetailCard D&D stat sheet component"
```

---

## Task 8: CharacterDetailPage and route

**Files:**
- Create: `apps/web/src/pages/CharacterDetailPage.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create CharacterDetailPage.tsx**

Create `apps/web/src/pages/CharacterDetailPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getCharacterById, type Character } from '../api/endpoints/characters'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
import { PageLayout } from '../components/layout/PageLayout'
import { EmptyState, Spinner } from '../components/ui'

export default function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>()
  const [character, setCharacter] = useState<Character | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!characterId) return
    getCharacterById(characterId)
      .then(c => {
        setCharacter(c)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [characterId])

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        {status === 'loading' && (
          <div className="flex justify-center py-10"><Spinner /></div>
        )}
        {status === 'error' && (
          <EmptyState message="Character not found" />
        )}
        {status === 'ready' && character && (
          <CharacterDetailCard character={character} />
        )}
      </div>
    </PageLayout>
  )
}
```

- [ ] **Step 2: Add the route to App.tsx**

In `apps/web/src/App.tsx`, add the import and route. The file currently ends with:

```tsx
import CharactersPage from "./pages/CharacterPage";
import MatchesPage from "./pages/MatchesPage";
import NotFoundPage from "./pages/NotFoundPage";
```

Add the import:

```tsx
import CharacterDetailPage from "./pages/CharacterDetailPage";
```

Inside the `<Route element={<SignedInLayout />}>` block, add the new route after the existing `/characters` route:

```tsx
<Route path="/characters" element={<CharactersPage />} />
<Route path="/characters/:characterId" element={<CharacterDetailPage />} />
```

- [ ] **Step 3: Run the frontend build to confirm no TypeScript errors**

```
npm run build --prefix apps/web
```

Expected: Build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/CharacterDetailPage.tsx apps/web/src/App.tsx
git commit -m "feat: add CharacterDetailPage at /characters/:characterId"
```

---

## Self-Review Checklist

- [x] **Spec: SwipeCard TCG layout** — Task 4: top bar → art box → bottom panel → flip
- [x] **Spec: SwipeCard flip mechanic** — FlippableCard (Task 3) with 35% bottom zone trigger, 3D rotateY
- [x] **Spec: MatchCard green border** — `--color-success` border + glow in Task 5
- [x] **Spec: MatchCard platform handle primary** — top bar shows platformHandle large, name small
- [x] **Spec: MatchCard flip** — uses same FlippableCard wrapper
- [x] **Spec: CharacterCard compact, no flip** — Task 6: h-28 art box, navigates to detail page
- [x] **Spec: CharacterCard edit/delete preserved** — stopPropagation on button container
- [x] **Spec: CharacterDetailCard D&D stat sheet** — Task 7: ruled sections, StatRow, adaptive game fields
- [x] **Spec: Back to Realm button** — `useNavigate(-1)` in CharacterDetailCard
- [x] **Spec: New GET /characters/:id endpoint** — Task 1 with TDD
- [x] **Spec: Bio on SwipeCard and MatchCard bottom panels** — `line-clamp-2` in both front face bottom panels
- [x] **Type consistency** — `FlippableCard` accepts `front: React.ReactNode`, `back: React.ReactNode` in all tasks; `CharacterDetailCard` receives `character: Character`; `getCharacterById` returns `Character` matching all usage in Task 8
