# Sticker Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sticker-only (emoji) messaging channel between matched characters, with real-time SignalR delivery, persisted history, and a lightweight banner toast notification.

**Architecture:** New `StickerMessage` DB table scoped to `CharacterMatch`. REST endpoints for history (GET) and sending (POST). Backend fires `"NewSticker"` through the existing `NotificationHub` to the recipient only. Frontend uses `StickerContext` for real-time state; `AuthContext` routes the SignalR event to it. `MatchesPage` gets a view toggle button in the left panel header to switch between character detail and sticker chat.

**Tech Stack:** ASP.NET Core 8, Entity Framework Core / PostgreSQL, SignalR, React 18, TypeScript, Tailwind CSS, `@microsoft/signalr` v10, `@phosphor-icons/react`

## Global Constraints

- Stickers are emoji strings only — no content validation beyond non-empty.
- Conversations scoped to a specific `CharacterMatch` — one thread per match, not per user pair.
- No read receipts, deletion, or reactions.
- Conflict resolution (out-of-order display) handled by page refresh — no deduplication logic.
- Backend tests hit real Postgres at `partyup_test` DB — no mocking.
- All backend tests extend `TestBase`, implement `IClassFixture<ApiFactory>`.
- Follow existing controller pattern: thin controller, `this.GetUserId()` for auth, service handles logic.
- `StickerProvider` must be an ancestor of `AuthProvider` in the React tree (so `AuthContext` can call into it).

---

## File Map

**New (Backend):**
- `apps/api/Models/StickerMessage.cs`
- `apps/api/Models/DTOs/StickerMessage/StickerMessageDto.cs`
- `apps/api/Services/Interfaces/IStickerMessageService.cs`
- `apps/api/Services/StickerMessageService.cs`
- `apps/api/Controllers/StickerMessagesController.cs`
- EF Core migration (auto-generated name `AddStickerMessages`)

**Modified (Backend):**
- `apps/api/Infrastructure/Data/DbContext.cs` — add `DbSet<StickerMessage>` + model config
- `apps/api/Program.cs` — register `IStickerMessageService`

**New (Tests):**
- `apps/tests/PartyUp.Api.Tests/Features/StickerMessages/StickerMessageTests.cs`

**New (Frontend):**
- `apps/web/src/api/endpoints/stickerMessages.ts`
- `apps/web/src/context/StickerContext.tsx`
- `apps/web/src/hooks/useStickerMessages.ts`
- `apps/web/src/components/stickers/StickerPalette.tsx`
- `apps/web/src/components/stickers/StickerChatView.tsx`
- `apps/web/src/components/stickers/StickerToast.tsx`

**Modified (Frontend):**
- `apps/web/src/App.tsx` — add `StickerProvider` wrapping `AuthProvider`
- `apps/web/src/context/AuthContext.tsx` — register `"NewSticker"` SignalR handler
- `apps/web/src/components/layout/SignedInLayout.tsx` — render `<StickerToast />`
- `apps/web/src/pages/MatchesPage.tsx` — view toggle + conditional render

---

## Task 1: Backend Data Layer

**Files:**
- Create: `apps/api/Models/StickerMessage.cs`
- Create: `apps/api/Models/DTOs/StickerMessage/StickerMessageDto.cs`
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`
- EF migrations (dev DB + test DB)

**Interfaces:**
- Produces: `StickerMessage` entity, `StickerMessageDto` class — consumed by Tasks 2 onward

- [ ] **Step 1: Create `StickerMessage` entity**

Create `apps/api/Models/StickerMessage.cs`:
```csharp
namespace PartyUp.Api.Models;

public class StickerMessage
{
    public Guid Id { get; set; }
    public Guid MatchId { get; set; }
    public CharacterMatch Match { get; set; } = default!;
    public Guid SenderCharacterId { get; set; }
    public Character SenderCharacter { get; set; } = default!;
    public string Emoji { get; set; } = default!;
    public DateTime SentAt { get; set; }
}
```

- [ ] **Step 2: Create `StickerMessageDto`**

Create `apps/api/Models/DTOs/StickerMessage/StickerMessageDto.cs`:
```csharp
namespace PartyUp.Api.Models.DTOs.StickerMessage;

public class StickerMessageDto
{
    public Guid Id { get; set; }
    public Guid MatchId { get; set; }
    public Guid SenderCharacterId { get; set; }
    public string Emoji { get; set; } = default!;
    public DateTime SentAt { get; set; }
}
```

- [ ] **Step 3: Add `DbSet` and model config to `DbContext.cs`**

In `apps/api/Infrastructure/Data/DbContext.cs`, add after the last existing `DbSet` line (after `CharacterFieldValues`):
```csharp
public DbSet<StickerMessage> StickerMessages { get; set; }
```

In `OnModelCreating`, add after the `CharacterMatch` entity block (after the closing `});` of that block):
```csharp
modelBuilder.Entity<StickerMessage>(e =>
{
    e.HasIndex(s => s.MatchId);
    e.HasOne(s => s.Match)
        .WithMany()
        .HasForeignKey(s => s.MatchId)
        .OnDelete(DeleteBehavior.Cascade);
    e.HasOne(s => s.SenderCharacter)
        .WithMany()
        .HasForeignKey(s => s.SenderCharacterId)
        .OnDelete(DeleteBehavior.Cascade);
});
```

- [ ] **Step 4: Generate EF migration**

Run from repo root:
```bash
dotnet ef migrations add AddStickerMessages --project apps/api
```

Expected: a new file in `apps/api/Migrations/` with `Up()` creating `StickerMessages` table with columns `Id`, `MatchId`, `SenderCharacterId`, `Emoji`, `SentAt`, and a `FK_StickerMessages_CharacterMatches_MatchId` foreign key.

- [ ] **Step 5: Apply migration to dev DB and test DB**

```bash
dotnet ef database update --project apps/api
dotnet ef database update --project apps/api --connection "Host=localhost;Port=5432;Database=partyup_test;Username=partyup;Password=partyup"
```

Expected: `Done.` for both — no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Models/StickerMessage.cs apps/api/Models/DTOs/StickerMessage/StickerMessageDto.cs apps/api/Infrastructure/Data/DbContext.cs apps/api/Migrations/
git commit -m "feat: add StickerMessage entity, DTO, and EF migration"
```

---

## Task 2: Backend Service, Controller, DI, and Integration Tests

**Files:**
- Create: `apps/api/Services/Interfaces/IStickerMessageService.cs`
- Create: `apps/api/Services/StickerMessageService.cs`
- Create: `apps/api/Controllers/StickerMessagesController.cs`
- Modify: `apps/api/Program.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Features/StickerMessages/StickerMessageTests.cs`

**Interfaces:**
- Consumes: `StickerMessage`, `StickerMessageDto`, `AppDbContext`, `IHubContext<NotificationHub>`, `ControllerExtensions.GetUserId()`
- Produces:
  - `GET /api/sticker-messages/{matchId}` → `List<StickerMessageDto>` (403 if non-participant)
  - `POST /api/sticker-messages/{matchId}` body `{ emoji }` → `StickerMessageDto` (403 non-participant, 404 unknown match)
  - SignalR `"NewSticker"` event to recipient with fields `{ id, matchId, senderCharacterId, senderCharacterName, emoji, sentAt }`

- [ ] **Step 1: Create `IStickerMessageService`**

Create `apps/api/Services/Interfaces/IStickerMessageService.cs`:
```csharp
using PartyUp.Api.Models.DTOs.StickerMessage;

namespace PartyUp.Api.Services.Interfaces;

public interface IStickerMessageService
{
    Task<List<StickerMessageDto>> GetByMatchAsync(Guid matchId, Guid userId);
    Task<StickerMessageDto> SendAsync(Guid matchId, Guid userId, string emoji);
}
```

- [ ] **Step 2: Write failing integration tests**

Create directory `apps/tests/PartyUp.Api.Tests/Features/StickerMessages/`.

Create `apps/tests/PartyUp.Api.Tests/Features/StickerMessages/StickerMessageTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.StickerMessages;

public class StickerMessageTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 60_000;

    public StickerMessageTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task PostSticker_ReturnsDto()
    {
        var (matchId, clientA, _, charA, _) = await SetupMatchAsync();

        var response = await clientA.PostAsJsonAsync(
            $"/api/sticker-messages/{matchId}", new { emoji = "🏆" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<StickerDto>();
        dto!.Emoji.Should().Be("🏆");
        dto.MatchId.Should().Be(matchId);
        dto.SenderCharacterId.Should().Be(charA);
        dto.SentAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task GetStickers_ReturnsSentMessages()
    {
        var (matchId, clientA, clientB, charA, charB) = await SetupMatchAsync();

        await clientA.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "🎮" });
        await clientB.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "🏆" });

        var response = await clientA.GetAsync($"/api/sticker-messages/{matchId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var messages = await response.Content.ReadFromJsonAsync<List<StickerDto>>();
        messages.Should().HaveCount(2);
        messages![0].Emoji.Should().Be("🎮");
        messages[0].SenderCharacterId.Should().Be(charA);
        messages[1].Emoji.Should().Be("🏆");
        messages[1].SenderCharacterId.Should().Be(charB);
    }

    [Fact]
    public async Task GetStickers_OrderedBySentAt()
    {
        var (matchId, clientA, clientB, _, _) = await SetupMatchAsync();

        await clientA.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "🎮" });
        await clientB.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "🏆" });
        await clientA.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "⭐" });

        var response = await clientA.GetAsync($"/api/sticker-messages/{matchId}");
        var messages = await response.Content.ReadFromJsonAsync<List<StickerDto>>();

        messages.Should().HaveCount(3);
        messages![0].Emoji.Should().Be("🎮");
        messages[1].Emoji.Should().Be("🏆");
        messages[2].Emoji.Should().Be("⭐");
    }

    [Fact]
    public async Task GetStickers_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync($"/api/sticker-messages/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PostSticker_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync(
            $"/api/sticker-messages/{Guid.NewGuid()}", new { emoji = "🎮" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetStickers_NonParticipant_Returns403()
    {
        var (matchId, _, _, _, _) = await SetupMatchAsync();
        var outsider = await CreateAuthenticatedClientAsync();

        var response = await outsider.GetAsync($"/api/sticker-messages/{matchId}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostSticker_NonParticipant_Returns403()
    {
        var (matchId, _, _, _, _) = await SetupMatchAsync();
        var outsider = await CreateAuthenticatedClientAsync();

        var response = await outsider.PostAsJsonAsync(
            $"/api/sticker-messages/{matchId}", new { emoji = "🎮" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostSticker_UnknownMatch_Returns404()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/sticker-messages/{Guid.NewGuid()}", new { emoji = "🎮" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private async Task<(Guid MatchId, HttpClient ClientA, HttpClient ClientB, Guid CharA, Guid CharB)>
        SetupMatchAsync()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var extId = Interlocked.Increment(ref _gameCounter);
        var ugA = await AddGameAsync(clientA, extId);
        var ugB = await AddGameAsync(clientB, extId);
        var charA = await CreateCharacterAsync(clientA, ugA.Id);
        var charB = await CreateCharacterAsync(clientB, ugB.Id);
        await MutualLikeAsync(clientA, charA, clientB, charB);

        var matchResponse = await clientA.GetAsync("/api/character-matches");
        var matches = await matchResponse.Content.ReadFromJsonAsync<PagedResultDto<MatchItem>>();
        var matchId = matches!.Items[0].MatchId;

        return (matchId, clientA, clientB, charA, charB);
    }

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

    private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId)
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "TestCharacter",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterIdDto>())!.Id;
    }

    private record StickerDto(Guid Id, Guid MatchId, Guid SenderCharacterId, string Emoji, DateTime SentAt);
    private record PagedResultDto<T>(List<T> Items, int TotalCount, int Page, int PageSize);
    private record MatchItem(Guid MatchId);
    private record UserGameDto(Guid Id, Guid GameId);
    private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
    private record CharacterIdDto(Guid Id);
}
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~StickerMessageTests"
```

Expected: tests fail (route does not exist yet — 404s or compilation error).

- [ ] **Step 4: Create `StickerMessageService`**

Create `apps/api/Services/StickerMessageService.cs`:
```csharp
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Hubs;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.StickerMessage;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class StickerMessageService : IStickerMessageService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;

    public StickerMessageService(AppDbContext db, IHubContext<NotificationHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task<List<StickerMessageDto>> GetByMatchAsync(Guid matchId, Guid userId)
    {
        var match = await _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match is null ||
            (match.CharacterA.UserGame.UserId != userId &&
             match.CharacterB.UserGame.UserId != userId))
            throw new UnauthorizedAccessException();

        return await _db.StickerMessages
            .Where(s => s.MatchId == matchId)
            .OrderBy(s => s.SentAt)
            .Select(s => new StickerMessageDto
            {
                Id = s.Id,
                MatchId = s.MatchId,
                SenderCharacterId = s.SenderCharacterId,
                Emoji = s.Emoji,
                SentAt = s.SentAt
            })
            .ToListAsync();
    }

    public async Task<StickerMessageDto> SendAsync(Guid matchId, Guid userId, string emoji)
    {
        var match = await _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match is null) throw new KeyNotFoundException();

        var isSenderA = match.CharacterA.UserGame.UserId == userId;
        if (!isSenderA && match.CharacterB.UserGame.UserId != userId)
            throw new UnauthorizedAccessException();

        var senderCharacterId = isSenderA ? match.CharacterAId : match.CharacterBId;
        var senderCharacterName = isSenderA ? match.CharacterA.Name : match.CharacterB.Name;
        var recipientUserId = isSenderA
            ? match.CharacterB.UserGame.UserId
            : match.CharacterA.UserGame.UserId;

        var message = new StickerMessage
        {
            Id = Guid.NewGuid(),
            MatchId = matchId,
            SenderCharacterId = senderCharacterId,
            Emoji = emoji,
            SentAt = DateTime.UtcNow
        };

        _db.StickerMessages.Add(message);
        await _db.SaveChangesAsync();

        var dto = new StickerMessageDto
        {
            Id = message.Id,
            MatchId = message.MatchId,
            SenderCharacterId = message.SenderCharacterId,
            Emoji = message.Emoji,
            SentAt = message.SentAt
        };

        await _hub.Clients.User(recipientUserId.ToString())
            .SendAsync("NewSticker", new
            {
                id = dto.Id,
                matchId = dto.MatchId,
                senderCharacterId = dto.SenderCharacterId,
                senderCharacterName,
                emoji = dto.Emoji,
                sentAt = dto.SentAt
            });

        return dto;
    }
}
```

- [ ] **Step 5: Create `StickerMessagesController`**

Create `apps/api/Controllers/StickerMessagesController.cs`:
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.StickerMessage;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/sticker-messages")]
[Authorize]
public class StickerMessagesController : ControllerBase
{
    private readonly IStickerMessageService _service;

    public StickerMessagesController(IStickerMessageService service)
    {
        _service = service;
    }

    [HttpGet("{matchId:guid}")]
    public async Task<ActionResult<List<StickerMessageDto>>> GetByMatch(Guid matchId)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        try
        {
            return Ok(await _service.GetByMatchAsync(matchId, userId));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{matchId:guid}")]
    public async Task<ActionResult<StickerMessageDto>> Send(
        Guid matchId, [FromBody] SendStickerRequest request)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        try
        {
            return Ok(await _service.SendAsync(matchId, userId, request.Emoji));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}

public record SendStickerRequest(string Emoji);
```

- [ ] **Step 6: Register service in DI**

In `apps/api/Program.cs`, add after the line `builder.Services.AddScoped<IMatchNotificationService, MatchNotificationService>();`:
```csharp
builder.Services.AddScoped<IStickerMessageService, StickerMessageService>();
```

- [ ] **Step 7: Run sticker tests — confirm they pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~StickerMessageTests"
```

Expected: all 8 tests pass.

- [ ] **Step 8: Run full test suite — confirm no regressions**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/api/Services/Interfaces/IStickerMessageService.cs apps/api/Services/StickerMessageService.cs apps/api/Controllers/StickerMessagesController.cs apps/api/Program.cs apps/tests/PartyUp.Api.Tests/Features/StickerMessages/
git commit -m "feat: add sticker message service, controller, and integration tests"
```

---

## Task 3: Frontend API Client + StickerContext

**Files:**
- Create: `apps/web/src/api/endpoints/stickerMessages.ts`
- Create: `apps/web/src/context/StickerContext.tsx`

**Interfaces:**
- Produces (consumed by Tasks 4–8):
  - `StickerMessageDto` type
  - `StickerNotificationPayload` type (`StickerMessageDto & { senderCharacterName: string }`)
  - `StickerToastPayload` type (`{ senderCharacterName: string; emoji: string }`)
  - `StickerProvider` component
  - `useStickerContext()` hook → `{ incomingStickers, pushSticker, toastQueue, pushToast, dismissToast }`
  - `getByMatch(matchId)` function
  - `send(matchId, emoji)` function

- [ ] **Step 1: Create `stickerMessages.ts`**

Create `apps/web/src/api/endpoints/stickerMessages.ts`:
```typescript
import { apiGet, apiPost } from "../client";

export type StickerMessageDto = {
  id: string;
  matchId: string;
  senderCharacterId: string;
  emoji: string;
  sentAt: string;
};

export function getByMatch(matchId: string): Promise<StickerMessageDto[]> {
  return apiGet<StickerMessageDto[]>(`/sticker-messages/${matchId}`);
}

export function send(matchId: string, emoji: string): Promise<StickerMessageDto> {
  return apiPost<StickerMessageDto>(`/sticker-messages/${matchId}`, { emoji });
}
```

- [ ] **Step 2: Create `StickerContext.tsx`**

Create `apps/web/src/context/StickerContext.tsx`:
```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { StickerMessageDto } from "../api/endpoints/stickerMessages";

export type StickerToastPayload = {
  senderCharacterName: string;
  emoji: string;
};

export type StickerNotificationPayload = StickerMessageDto & {
  senderCharacterName: string;
};

type StickerContextValue = {
  incomingStickers: StickerMessageDto[];
  pushSticker: (sticker: StickerMessageDto) => void;
  toastQueue: StickerToastPayload[];
  pushToast: (toast: StickerToastPayload) => void;
  dismissToast: () => void;
};

const StickerContext = createContext<StickerContextValue | null>(null);

export function StickerProvider({ children }: { children: ReactNode }) {
  const [incomingStickers, setIncomingStickers] = useState<StickerMessageDto[]>([]);
  const [toastQueue, setToastQueue] = useState<StickerToastPayload[]>([]);

  const pushSticker = useCallback((sticker: StickerMessageDto) => {
    setIncomingStickers(prev => [...prev, sticker]);
  }, []);

  const pushToast = useCallback((toast: StickerToastPayload) => {
    setToastQueue(prev => [...prev, toast]);
  }, []);

  const dismissToast = useCallback(() => {
    setToastQueue(prev => prev.slice(1));
  }, []);

  return (
    <StickerContext.Provider value={{ incomingStickers, pushSticker, toastQueue, pushToast, dismissToast }}>
      {children}
    </StickerContext.Provider>
  );
}

export function useStickerContext(): StickerContextValue {
  const ctx = useContext(StickerContext);
  if (!ctx) throw new Error("useStickerContext must be used within StickerProvider");
  return ctx;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds — no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/stickerMessages.ts apps/web/src/context/StickerContext.tsx
git commit -m "feat: add sticker messages API client and StickerContext"
```

---

## Task 4: Wire StickerProvider and AuthContext SignalR Handler

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/context/AuthContext.tsx`

**Interfaces:**
- Consumes: `StickerProvider`, `useStickerContext`, `StickerNotificationPayload` (from `StickerContext.tsx`)

- [ ] **Step 1: Add `StickerProvider` to `App.tsx`**

In `apps/web/src/App.tsx`, add import at the top:
```typescript
import { StickerProvider } from "./context/StickerContext";
```

Wrap `AuthProvider` with `StickerProvider` — `StickerProvider` must be the outer wrapper so `AuthContext` can call into it. The updated provider tree:
```tsx
<BrowserRouter>
  <NotificationProvider>
    <StickerProvider>
      <AuthProvider>
        <Routes>
          {/* ... existing routes unchanged ... */}
        </Routes>
      </AuthProvider>
    </StickerProvider>
  </NotificationProvider>
</BrowserRouter>
```

- [ ] **Step 2: Register `"NewSticker"` handler in `AuthContext.tsx`**

In `apps/web/src/context/AuthContext.tsx`, add imports:
```typescript
import { useStickerContext, type StickerNotificationPayload } from "./StickerContext";
```

Inside `AuthProvider`, add after the existing `const { push } = useNotifications();` line:
```typescript
const { pushSticker, pushToast } = useStickerContext();
```

Inside `startConnection`, add after the existing `connection.on("NewMatch", ...)` block:
```typescript
connection.on("NewSticker", (payload: StickerNotificationPayload) => {
  pushSticker({
    id: payload.id,
    matchId: payload.matchId,
    senderCharacterId: payload.senderCharacterId,
    emoji: payload.emoji,
    sentAt: payload.sentAt,
  });
  pushToast({
    senderCharacterName: payload.senderCharacterName,
    emoji: payload.emoji,
  });
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/context/AuthContext.tsx
git commit -m "feat: wire StickerProvider and register NewSticker SignalR handler in AuthContext"
```

---

## Task 5: `useStickerMessages` Hook

**Files:**
- Create: `apps/web/src/hooks/useStickerMessages.ts`

**Interfaces:**
- Consumes: `getByMatch`, `send`, `StickerMessageDto` (from `stickerMessages.ts`); `useStickerContext` (from `StickerContext.tsx`)
- Produces: `useStickerMessages(matchId: string)` → `{ messages: StickerMessageDto[], send: (emoji: string) => Promise<void>, loading: boolean }`

- [ ] **Step 1: Create `useStickerMessages.ts`**

Create `apps/web/src/hooks/useStickerMessages.ts`:
```typescript
import { useEffect, useRef, useState } from "react";
import {
  getByMatch,
  send as sendApi,
  type StickerMessageDto,
} from "../api/endpoints/stickerMessages";
import { useStickerContext } from "../context/StickerContext";

export function useStickerMessages(matchId: string) {
  const [messages, setMessages] = useState<StickerMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { incomingStickers } = useStickerContext();
  const processedCountRef = useRef(incomingStickers.length);

  // Load history when matchId changes; reset the processed pointer to current end
  // of incomingStickers so we only pick up stickers that arrive after this mount.
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    processedCountRef.current = incomingStickers.length;
    getByMatch(matchId)
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [matchId]);

  // Append any real-time stickers for this match that arrive after mount.
  useEffect(() => {
    const newOnes = incomingStickers
      .slice(processedCountRef.current)
      .filter(s => s.matchId === matchId);
    if (newOnes.length > 0) {
      setMessages(prev => [...prev, ...newOnes]);
    }
    processedCountRef.current = incomingStickers.length;
  }, [incomingStickers, matchId]);

  async function send(emoji: string) {
    const dto = await sendApi(matchId, emoji);
    setMessages(prev => [...prev, dto]);
  }

  return { messages, send, loading };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/useStickerMessages.ts
git commit -m "feat: add useStickerMessages hook"
```

---

## Task 6: Sticker UI Components

**Files:**
- Create: `apps/web/src/components/stickers/StickerPalette.tsx`
- Create: `apps/web/src/components/stickers/StickerChatView.tsx`

**Interfaces:**
- `StickerPalette` props: `{ onSend: (emoji: string) => Promise<void>; disabled?: boolean }`
- `StickerChatView` props: `{ matchId: string; myCharacterId: string }`
- Consumes: `useStickerMessages` hook, `StickerMessageDto`

- [ ] **Step 1: Create `StickerPalette.tsx`**

Create `apps/web/src/components/stickers/StickerPalette.tsx`:
```tsx
import { useState } from "react";

const EMOJI_PALETTE = [
  "🎮", "🕹️", "🎯", "🏆", "⚔️", "🛡️", "💥", "🔥",
  "⭐", "🌟", "👑", "🎉", "🙌", "💪", "👍", "🤘",
  "💯", "😄", "😎", "🥳", "😈", "🤝", "👏", "🫡",
];

interface StickerPaletteProps {
  onSend: (emoji: string) => Promise<void>;
  disabled?: boolean;
}

export function StickerPalette({ onSend, disabled }: StickerPaletteProps) {
  const [sending, setSending] = useState(false);

  async function handleClick(emoji: string) {
    if (sending || disabled) return;
    setSending(true);
    try {
      await onSend(emoji);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-8 gap-1 p-2 border-t-2 border-black/50 bg-orange-950/30 shrink-0">
      {EMOJI_PALETTE.map(emoji => (
        <button
          key={emoji}
          onClick={() => handleClick(emoji)}
          disabled={sending || disabled}
          className="text-xl p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors"
          aria-label={`Send ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `StickerChatView.tsx`**

Create `apps/web/src/components/stickers/StickerChatView.tsx`:
```tsx
import { useEffect, useRef } from "react";
import { useStickerMessages } from "../../hooks/useStickerMessages";
import { StickerPalette } from "./StickerPalette";

interface StickerChatViewProps {
  matchId: string;
  myCharacterId: string;
}

export function StickerChatView({ matchId, myCharacterId }: StickerChatViewProps) {
  const { messages, send, loading } = useStickerMessages(matchId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <p className="text-xs text-muted text-center mt-4 font-mono uppercase tracking-widest">
            Loading...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted text-center mt-4 font-mono uppercase tracking-widest">
            No stickers yet. Say hi!
          </p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col gap-0.5 ${
                msg.senderCharacterId === myCharacterId ? "items-end" : "items-start"
              }`}
            >
              <span className="text-4xl leading-none">{msg.emoji}</span>
              <span className="text-[0.6rem] text-muted font-mono">
                {new Date(msg.sentAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <StickerPalette onSend={send} />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/stickers/StickerPalette.tsx apps/web/src/components/stickers/StickerChatView.tsx
git commit -m "feat: add StickerPalette and StickerChatView components"
```

---

## Task 7: StickerToast Banner Notification

**Files:**
- Create: `apps/web/src/components/stickers/StickerToast.tsx`
- Modify: `apps/web/src/components/layout/SignedInLayout.tsx`

**Interfaces:**
- Consumes: `useStickerContext` → `toastQueue: StickerToastPayload[]`, `dismissToast: () => void`

- [ ] **Step 1: Create `StickerToast.tsx`**

Create `apps/web/src/components/stickers/StickerToast.tsx`:
```tsx
import { useEffect } from "react";
import { useStickerContext } from "../../context/StickerContext";

export function StickerToast() {
  const { toastQueue, dismissToast } = useStickerContext();
  const current = toastQueue[0];

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismissToast, 4000);
    return () => clearTimeout(timer);
  }, [current, dismissToast]);

  if (!current) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-lg border border-orange-900/60 shadow-xl"
      style={{ background: "linear-gradient(158deg, #3f1e0b 0%, #2b1508 30%, #1e0e05 55%, #271408 78%, #321b0b 100%)" }}
    >
      <span className="font-mono text-xs text-text">
        <span className="font-bold">{current.senderCharacterName}</span>
        <span className="text-muted"> sent you a sticker:</span>
      </span>
      <span className="text-2xl leading-none">{current.emoji}</span>
      <button
        onClick={dismissToast}
        className="ml-1 text-muted hover:text-text text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Render `StickerToast` in `SignedInLayout.tsx`**

In `apps/web/src/components/layout/SignedInLayout.tsx`, add import:
```typescript
import { StickerToast } from '../stickers/StickerToast';
```

Render it alongside `<MatchNotificationToast />` in the returned JSX:
```tsx
return (
  <>
    <MatchNotificationToast />
    <StickerToast />
    <div className="min-h-screen max-h-screen flex flex-col md:flex-row relative overflow-hidden">
      <NavBar variant="app" />
      <Outlet />
    </div>
  </>
);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/stickers/StickerToast.tsx apps/web/src/components/layout/SignedInLayout.tsx
git commit -m "feat: add StickerToast banner notification"
```

---

## Task 8: MatchesPage View Toggle

**Files:**
- Modify: `apps/web/src/pages/MatchesPage.tsx`

**Interfaces:**
- Consumes: `StickerChatView` (props `matchId: string`, `myCharacterId: string`); `ChatCircle` from `@phosphor-icons/react`
- New state: `view: 'detail' | 'chat'` — reset to `'detail'` whenever selected match changes

- [ ] **Step 1: Add imports and view state**

In `apps/web/src/pages/MatchesPage.tsx`, add to the existing imports:
```typescript
import { ChatCircle } from '@phosphor-icons/react';
import { StickerChatView } from '../components/stickers/StickerChatView';
```

Add `view` state alongside existing state declarations (after `const [activeSide, ...]`):
```typescript
const [view, setView] = useState<'detail' | 'chat'>('detail');
```

- [ ] **Step 2: Reset `view` when match changes**

In `handleSelect`, add `setView('detail')` as the first line:
```typescript
function handleSelect(match: CharacterMatchDto) {
  setView('detail');
  setSelected(match);
  setActiveSide('left');
  if (match.isNew) {
    markMatchViewed(match.matchId).then(() => {
      setMatches(prev =>
        prev.map(m => m.matchId === match.matchId ? { ...m, isNew: false } : m)
      );
    });
  }
}
```

- [ ] **Step 3: Update `leftContent` with toggle and conditional render**

Replace the `leftContent` variable. The `selected !== null` branch becomes:
```tsx
const leftContent = selected ? (
  <div className="flex flex-col md:flex-1 md:min-h-0">
    <BinderHeader title='' heightClassName='md:min-h-[76px] md:h-[76px] md:max-h-[76px]' className=''>
      <div className='flex items-center justify-between'>
        <div className='flex gap-4'>
          <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Match</p>
          <p className="text-xs text-muted">
            - {new Date(selected.matchedAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => setView(v => v === 'detail' ? 'chat' : 'detail')}
          className="p-1 rounded hover:bg-white/10 transition-colors text-muted hover:text-text"
          aria-label={view === 'detail' ? 'Open sticker chat' : 'Back to character'}
          title={view === 'detail' ? 'Sticker Chat' : 'Character Detail'}
        >
          <ChatCircle size={18} weight={view === 'chat' ? 'fill' : 'regular'} />
        </button>
      </div>
      <p className="font-display font-bold text-text">{selected.gameName}</p>
    </BinderHeader>
    {view === 'detail' ? (
      <div className="p-2 md:px-4 flex flex-col min-h-0 overflow-y-auto">
        <CharacterDetailCard character={selected.theirCharacter} />
      </div>
    ) : (
      <StickerChatView
        matchId={selected.matchId}
        myCharacterId={selected.myCharacter.id}
      />
    )}
  </div>
) : (
  <div className="flex flex-col md:flex-1 md:min-h-0">
    <BinderHeader title='Select A Match' heightClassName='md:min-h-[76px] md:h-[76px] md:max-h-[76px] ' className='flex flex-col justify-center'></BinderHeader>
  </div>
);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds — no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/MatchesPage.tsx
git commit -m "feat: add sticker chat view toggle to MatchesPage"
```

---

## Self-Review Checklist

After completing all tasks, verify:

- [ ] `dotnet test apps/tests/PartyUp.Api.Tests` — all tests pass
- [ ] `npm run build --prefix apps/web` — no TypeScript errors
- [ ] Start dev environment (`docker compose up -d && npm run dev`) and manually verify:
  - Navigate to `/matches`, select a match
  - Toggle button (chat bubble icon) appears in the left header
  - Clicking switches to sticker chat view showing empty state
  - Clicking an emoji sends a sticker; it appears on the right side
  - Refreshing the page and reopening the match shows the sticker in history
  - Toggling back shows character detail
  - Selecting a different match resets to character detail view
