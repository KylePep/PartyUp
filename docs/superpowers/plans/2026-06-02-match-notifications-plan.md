# Match Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time match notifications via SignalR, persistent per-user "new match" unread state, and badge propagation across the UI.

**Architecture:** A `MatchNotification` table tracks unread state per user per match; `NotificationHub` (SignalR) pushes match payloads to recipients in real-time; existing API responses (`/user-games`, `/characters`, `/character-matches`) are augmented with `newMatchCount`/`hasNewMatch`/`isNew` fields computed from unread notifications; the frontend renders a shared toast component for both senders (via API response) and recipients (via SignalR push).

**Tech Stack:** ASP.NET Core 8 SignalR, `@microsoft/signalr` npm package, EF Core migration, React context, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-06-02-match-notifications-design.md`

---

## File Map

**Backend – new files:**
- `apps/api/Models/Enums/NotificationType.cs` — enum `NewMatch` (extensible for future `NewMessage`)
- `apps/api/Models/MatchNotification.cs` — EF entity
- `apps/api/Models/DTOs/CharacterInteraction/MatchResultResponse.cs` — richer swipe response (replaces `MatchResponse` when `IsMatch=true`)
- `apps/api/Services/Interfaces/IMatchNotificationService.cs`
- `apps/api/Services/MatchNotificationService.cs`
- `apps/api/Hubs/NotificationHub.cs`
- `apps/api/Hubs/UserIdProvider.cs`
- `apps/api/Controllers/MatchNotificationsController.cs`
- `apps/tests/PartyUp.Api.Tests/Features/MatchNotifications/MatchNotificationTests.cs`

**Backend – modified files:**
- `apps/api/Infrastructure/Data/DbContext.cs` — add `DbSet<MatchNotification>`
- `apps/api/Program.cs` — SignalR DI, hub mapping, JWT query string config, `UserIdProvider`, `MatchNotificationService`
- `apps/api/Models/DTOs/UserGame/UserGameResponse.cs` — add `NewMatchCount: int`
- `apps/api/Models/DTOs/Character/CharacterResponse.cs` — add `HasNewMatch: bool`
- `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs` — add `IsNew: bool`
- `apps/api/Services/CharacterInteractionService.cs` — insert notifications + hub push + return `MatchResultResponse`
- `apps/api/Services/Interfaces/ICharacterInteractionService.cs` — update return type
- `apps/api/Services/CharacterMatchService.cs` — inject `IMatchNotificationService`, compute `IsNew`
- `apps/api/Services/CharacterService.cs` — inject `IMatchNotificationService`, compute `HasNewMatch`
- `apps/api/Controllers/UserGamesController.cs` — inject `IMatchNotificationService`, compute `NewMatchCount`
- `apps/tests/.../Features/CharacterInteractions/CharacterInteractionTests.cs` — update `MatchDto` record for new response fields

**Frontend – new files:**
- `apps/web/src/api/endpoints/matchNotifications.ts` — `markAsViewed` API call
- `apps/web/src/context/NotificationContext.tsx` — notification queue provider
- `apps/web/src/components/notifications/MatchNotificationToast.tsx` — shared toast component
- `apps/web/src/components/ui/NewMatchBadge.tsx` — green circle with count (1–9, then `+`)
- `apps/web/src/components/ui/NewMatchDot.tsx` — green dot for character cards

**Frontend – modified files:**
- `apps/web/src/api/endpoints/matches.ts` — add `isNew` to `CharacterMatchDto`
- `apps/web/src/api/endpoints/userGames.ts` — add `newMatchCount` to `UserGame`
- `apps/web/src/api/endpoints/characters.ts` — add `hasNewMatch` to `Character`; rename `MatchResponse` → `MatchResultResponse` with character payload fields
- `apps/web/src/context/AuthContext.tsx` — SignalR connection lifecycle (create on login, stop on logout)
- `apps/web/src/App.tsx` — wrap routes with `NotificationProvider`
- `apps/web/src/components/cards/RealmCard.tsx` — `NewMatchBadge`
- `apps/web/src/pages/GamesPage.tsx` — `NewMatchBadge` on game list items
- `apps/web/src/components/cards/CharacterCard.tsx` — `NewMatchDot`
- `apps/web/src/components/cards/MatchCard.tsx` — `isNew` prop + green glow
- `apps/web/src/components/DiscoveryPanel.tsx` — push match result to `NotificationContext`
- `apps/web/src/pages/MatchesPage.tsx` — call `markAsViewed` when detail panel opens

---

## Task 1: Data model — MatchNotification entity, enum, DbContext, migration

**Files:**
- Create: `apps/api/Models/Enums/NotificationType.cs`
- Create: `apps/api/Models/MatchNotification.cs`
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`

- [ ] **Step 1: Create NotificationType enum**

`apps/api/Models/Enums/NotificationType.cs`:
```csharp
namespace PartyUp.Api.Models.Enums;

public enum NotificationType
{
    NewMatch
}
```

- [ ] **Step 2: Create MatchNotification entity**

`apps/api/Models/MatchNotification.cs`:
```csharp
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Models;

public class MatchNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;
    public Guid MatchId { get; set; }
    public CharacterMatch Match { get; set; } = default!;
    public NotificationType Type { get; set; }
    public DateTime? ViewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

- [ ] **Step 3: Add DbSet and model config to DbContext**

In `apps/api/Infrastructure/Data/DbContext.cs`, add the DbSet after `CharacterMatches`:
```csharp
public DbSet<MatchNotification> MatchNotifications { get; set; }
```

And inside `OnModelCreating`, add configuration:
```csharp
modelBuilder.Entity<MatchNotification>(e =>
{
    e.Property(n => n.Type).HasConversion<string>();
    e.HasOne(n => n.User)
        .WithMany()
        .HasForeignKey(n => n.UserId)
        .OnDelete(DeleteBehavior.Cascade);
    e.HasOne(n => n.Match)
        .WithMany()
        .HasForeignKey(n => n.MatchId)
        .OnDelete(DeleteBehavior.Cascade);
});
```

- [ ] **Step 4: Add EF migration**

```bash
dotnet ef migrations add AddMatchNotifications --project apps/api
```

Expected output: `Done. To undo this action, use 'ef migrations remove'`

Verify: a new file appears in `apps/api/Migrations/` containing `CreateTable("MatchNotifications", ...)`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Models/Enums/NotificationType.cs apps/api/Models/MatchNotification.cs apps/api/Infrastructure/Data/DbContext.cs apps/api/Migrations/
git commit -m "feat: add MatchNotification data model and migration"
```

---

## Task 2: IMatchNotificationService + MatchNotificationService

**Files:**
- Create: `apps/api/Services/Interfaces/IMatchNotificationService.cs`
- Create: `apps/api/Services/MatchNotificationService.cs`

- [ ] **Step 1: Create interface**

`apps/api/Services/Interfaces/IMatchNotificationService.cs`:
```csharp
namespace PartyUp.Api.Services.Interfaces;

public interface IMatchNotificationService
{
    Task InsertForMatchAsync(Guid matchId, Guid senderUserId, Guid recipientUserId);
    Task MarkViewedAsync(Guid matchId, Guid userId);
    Task<Dictionary<Guid, int>> GetNewMatchCountsByUserGameAsync(Guid userId, IEnumerable<Guid> userGameIds);
    Task<HashSet<Guid>> GetCharacterIdsWithNewMatchAsync(Guid userId, IEnumerable<Guid> characterIds);
    Task<HashSet<Guid>> GetNewMatchIdsAsync(Guid userId, IEnumerable<Guid> matchIds);
}
```

- [ ] **Step 2: Create implementation**

`apps/api/Services/MatchNotificationService.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class MatchNotificationService : IMatchNotificationService
{
    private readonly AppDbContext _db;

    public MatchNotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task InsertForMatchAsync(Guid matchId, Guid senderUserId, Guid recipientUserId)
    {
        _db.MatchNotifications.AddRange(
            new MatchNotification { Id = Guid.NewGuid(), UserId = senderUserId, MatchId = matchId, Type = NotificationType.NewMatch, CreatedAt = DateTime.UtcNow },
            new MatchNotification { Id = Guid.NewGuid(), UserId = recipientUserId, MatchId = matchId, Type = NotificationType.NewMatch, CreatedAt = DateTime.UtcNow }
        );
        await _db.SaveChangesAsync();
    }

    public async Task MarkViewedAsync(Guid matchId, Guid userId)
    {
        var notification = await _db.MatchNotifications
            .FirstOrDefaultAsync(n => n.MatchId == matchId && n.UserId == userId && n.ViewedAt == null);

        if (notification != null)
        {
            notification.ViewedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<Dictionary<Guid, int>> GetNewMatchCountsByUserGameAsync(Guid userId, IEnumerable<Guid> userGameIds)
    {
        var ids = userGameIds.ToList();
        var newMatchIds = await _db.MatchNotifications
            .Where(n => n.UserId == userId && n.ViewedAt == null && n.Type == NotificationType.NewMatch)
            .Select(n => n.MatchId)
            .ToListAsync();

        return await _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame)
            .Where(m =>
                newMatchIds.Contains(m.Id) &&
                (
                    (m.CharacterA.UserGame.UserId == userId && ids.Contains(m.CharacterA.UserGameId)) ||
                    (m.CharacterB.UserGame.UserId == userId && ids.Contains(m.CharacterB.UserGameId))
                ))
            .Select(m => m.CharacterA.UserGame.UserId == userId ? m.CharacterA.UserGameId : m.CharacterB.UserGameId)
            .GroupBy(id => id)
            .ToDictionaryAsync(g => g.Key, g => g.Count());
    }

    public async Task<HashSet<Guid>> GetCharacterIdsWithNewMatchAsync(Guid userId, IEnumerable<Guid> characterIds)
    {
        var ids = characterIds.ToList();
        var newMatchIds = await _db.MatchNotifications
            .Where(n => n.UserId == userId && n.ViewedAt == null && n.Type == NotificationType.NewMatch)
            .Select(n => n.MatchId)
            .ToListAsync();

        var result = await _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame)
            .Where(m =>
                newMatchIds.Contains(m.Id) &&
                (
                    (m.CharacterA.UserGame.UserId == userId && ids.Contains(m.CharacterAId)) ||
                    (m.CharacterB.UserGame.UserId == userId && ids.Contains(m.CharacterBId))
                ))
            .Select(m => m.CharacterA.UserGame.UserId == userId ? m.CharacterAId : m.CharacterBId)
            .ToListAsync();

        return result.ToHashSet();
    }

    public async Task<HashSet<Guid>> GetNewMatchIdsAsync(Guid userId, IEnumerable<Guid> matchIds)
    {
        var ids = matchIds.ToList();
        var result = await _db.MatchNotifications
            .Where(n =>
                n.UserId == userId &&
                n.ViewedAt == null &&
                n.Type == NotificationType.NewMatch &&
                ids.Contains(n.MatchId))
            .Select(n => n.MatchId)
            .ToListAsync();
        return result.ToHashSet();
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/Services/Interfaces/IMatchNotificationService.cs apps/api/Services/MatchNotificationService.cs
git commit -m "feat: add IMatchNotificationService and implementation"
```

---

## Task 3: NotificationHub + UserIdProvider

**Files:**
- Create: `apps/api/Hubs/NotificationHub.cs`
- Create: `apps/api/Hubs/UserIdProvider.cs`

- [ ] **Step 1: Create NotificationHub**

`apps/api/Hubs/NotificationHub.cs`:
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PartyUp.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    // Push-only hub — no client-callable methods.
    // Server pushes events via IHubContext<NotificationHub>.
}
```

- [ ] **Step 2: Create UserIdProvider**

`apps/api/Hubs/UserIdProvider.cs`:
```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace PartyUp.Api.Hubs;

public class UserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirstValue(ClaimTypes.NameIdentifier);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/Hubs/NotificationHub.cs apps/api/Hubs/UserIdProvider.cs
git commit -m "feat: add NotificationHub and UserIdProvider"
```

---

## Task 4: Program.cs — register SignalR, hub, services, JWT query string

**Files:**
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Add using statements at the top of Program.cs**

Add these after existing `using` lines at the top:
```csharp
using Microsoft.AspNetCore.SignalR;
using PartyUp.Api.Hubs;
```

- [ ] **Step 2: Register SignalR and services in the `#region Services` block**

After `builder.Services.AddScoped<IGcsStorageService, GcsStorageService>();`, add:
```csharp
builder.Services.AddSignalR();
builder.Services.AddScoped<IMatchNotificationService, MatchNotificationService>();
builder.Services.AddSingleton<IUserIdProvider, UserIdProvider>();
```

- [ ] **Step 3: Configure JWT to read token from query string**

Inside the `.AddJwtBearer(options => { ... })` block, add an `Events` handler after `TokenValidationParameters`:
```csharp
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];
        var path = context.HttpContext.Request.Path;
        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            context.Token = accessToken;
        return Task.CompletedTask;
    }
};
```

- [ ] **Step 4: Map the hub after `app.MapControllers()`**

```csharp
app.MapHub<NotificationHub>("/hubs/notifications");
```

- [ ] **Step 5: Verify the API still starts**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Program.cs
git commit -m "feat: register SignalR NotificationHub with JWT query string auth"
```

---

## Task 5: MatchResultResponse DTO + update interface and controller return type

**Files:**
- Create: `apps/api/Models/DTOs/CharacterInteraction/MatchResultResponse.cs`
- Modify: `apps/api/Services/Interfaces/ICharacterInteractionService.cs`
- Modify: `apps/api/Controllers/CharacterInteractionController.cs`

- [ ] **Step 1: Create MatchResultResponse**

`apps/api/Models/DTOs/CharacterInteraction/MatchResultResponse.cs`:
```csharp
namespace PartyUp.Api.Models.DTOs.CharacterInteraction;

public class MatchResultResponse
{
    public bool IsMatch { get; set; }
    public Guid? MatchId { get; set; }
    public MatchCharacterPayload? MyCharacter { get; set; }
    public MatchCharacterPayload? TheirCharacter { get; set; }
    public string? GameName { get; set; }
    public DateTime? MatchedAt { get; set; }
}

public class MatchCharacterPayload
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? ImageUrl { get; set; }
}
```

- [ ] **Step 2: Update ICharacterInteractionService**

In `apps/api/Services/Interfaces/ICharacterInteractionService.cs`, update the method signature. First read the file, then change the return type:
```csharp
using PartyUp.Api.Models.DTOs.Character;
using PartyUp.Api.Models.DTOs.CharacterInteraction;

public interface ICharacterInteractionService
{
    Task<MatchResultResponse> RecordInteractionAsync(CharacterInteractionRequest request, Guid userId);
    Task<List<DiscoverCharacterResponse>> GetPendingLikesAsync(Guid characterId, Guid userId);
}
```

- [ ] **Step 3: Update CharacterInteractionController return type**

In `apps/api/Controllers/CharacterInteractionController.cs`, change the action signature:
```csharp
[HttpPost]
public async Task<ActionResult<MatchResultResponse>> RecordInteraction([FromBody] CharacterInteractionRequest request)
```

Add using at top of file:
```csharp
using PartyUp.Api.Models.DTOs.CharacterInteraction;
```

- [ ] **Step 4: Build to verify**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build failed — `CharacterInteractionService` still returns old `MatchResponse`. That's expected; Task 6 fixes it.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Models/DTOs/CharacterInteraction/MatchResultResponse.cs apps/api/Services/Interfaces/ICharacterInteractionService.cs apps/api/Controllers/CharacterInteractionController.cs
git commit -m "feat: add MatchResultResponse DTO and update interaction service interface"
```

---

## Task 6: Update CharacterInteractionService — notifications + hub push + new response

**Files:**
- Modify: `apps/api/Services/CharacterInteractionService.cs`

- [ ] **Step 1: Write failing tests first**

In `apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/CharacterInteractionTests.cs`, add two test methods to the existing class and update two records at the bottom:

Change the existing `MatchDto` record:
```csharp
private record MatchDto(bool IsMatch, Guid? MatchId, MatchCharacterPayloadDto? MyCharacter, MatchCharacterPayloadDto? TheirCharacter, string? GameName);
private record MatchCharacterPayloadDto(Guid Id, string Name, string? ImageUrl);
```

Change the existing `MatchItemDto` record to include `IsNew`:
```csharp
private record MatchItemDto(Guid MatchId, DateTime MatchedAt, CharacterSummaryDto MyCharacter, CharacterSummaryDto TheirCharacter, Guid GameId, string GameName, bool IsNew);
```

Add two new test methods:
```csharp
[Fact]
public async Task Like_WithMutualLike_ResponseIncludesCharacterPayloads()
{
    var (charA, charB, clientA, clientB) = await SetupTwoUsersWithCharactersAsync();

    await clientA.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = charA,
        toCharacterId = charB,
        type = InteractionType.Like
    });

    var response = await clientB.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = charB,
        toCharacterId = charA,
        type = InteractionType.Like
    });

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<MatchDto>();
    result!.IsMatch.Should().BeTrue();
    result.MyCharacter.Should().NotBeNull();
    result.TheirCharacter.Should().NotBeNull();
    result.MyCharacter!.Id.Should().Be(charB);
    result.TheirCharacter!.Id.Should().Be(charA);
    result.GameName.Should().NotBeNullOrEmpty();
}

[Fact]
public async Task Like_WithMutualLike_BothUsersHaveNewMatchNotification()
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
        type = InteractionType.Like
    });

    var matchesA = await (await clientA.GetAsync("/api/character-matches"))
        .Content.ReadFromJsonAsync<List<MatchItemDto>>();
    var matchesB = await (await clientB.GetAsync("/api/character-matches"))
        .Content.ReadFromJsonAsync<List<MatchItemDto>>();

    matchesA![0].IsNew.Should().BeTrue();
    matchesB![0].IsNew.Should().BeTrue();
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterInteractionTests" -v
```

Expected: FAIL — `IsNew` property not found, `MyCharacter`/`TheirCharacter` null.

- [ ] **Step 3: Rewrite CharacterInteractionService**

Replace the full contents of `apps/api/Services/CharacterInteractionService.cs`:
```csharp
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Hubs;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Character;
using PartyUp.Api.Models.DTOs.CharacterInteraction;
using PartyUp.Api.Services.Interfaces;

public class CharacterInteractionService : ICharacterInteractionService
{
    private readonly AppDbContext _db;
    private readonly IMatchNotificationService _notifications;
    private readonly IHubContext<NotificationHub> _hub;

    public CharacterInteractionService(
        AppDbContext db,
        IMatchNotificationService notifications,
        IHubContext<NotificationHub> hub)
    {
        _db = db;
        _notifications = notifications;
        _hub = hub;
    }

    public async Task<MatchResultResponse> RecordInteractionAsync(CharacterInteractionRequest request, Guid userId)
    {
        if (request.FromCharacterId == request.ToCharacterId)
            throw new InvalidOperationException("Cannot interact with self");

        var fromChar = await _db.Characters
            .Include(c => c.UserGame).ThenInclude(ug => ug.Game)
            .FirstOrDefaultAsync(c => c.Id == request.FromCharacterId);

        if (fromChar == null || fromChar.UserGame.UserId != userId)
            throw new UnauthorizedAccessException("Character does not belong to the authenticated user");

        var toChar = await _db.Characters
            .Include(c => c.UserGame)
            .FirstAsync(c => c.Id == request.ToCharacterId);

        var recipientUserId = toChar.UserGame.UserId;

        var interaction = new CharacterInteraction
        {
            Id = Guid.NewGuid(),
            FromCharacterId = request.FromCharacterId,
            ToCharacterId = request.ToCharacterId,
            Type = request.Type,
            CreatedAt = DateTime.UtcNow
        };

        _db.CharacterInteractions.Add(interaction);
        await _db.SaveChangesAsync();

        if (request.Type == InteractionType.Dislike)
            return new MatchResultResponse { IsMatch = false };

        var reverseLikeExists = await _db.CharacterInteractions
            .AnyAsync(x =>
                x.FromCharacterId == request.ToCharacterId &&
                x.ToCharacterId == request.FromCharacterId &&
                x.Type == InteractionType.Like);

        if (!reverseLikeExists)
            return new MatchResultResponse { IsMatch = false };

        var (aId, bId) = Order(request.FromCharacterId, request.ToCharacterId);

        var existingMatch = await _db.CharacterMatches
            .FirstOrDefaultAsync(m => m.CharacterAId == aId && m.CharacterBId == bId);

        if (existingMatch != null)
        {
            return BuildSenderPayload(existingMatch.Id, fromChar, toChar, fromChar.UserGame.Game.Name, existingMatch.MatchedAt);
        }

        var match = new CharacterMatch
        {
            Id = Guid.NewGuid(),
            CharacterAId = aId,
            CharacterBId = bId,
            MatchedAt = DateTime.UtcNow
        };

        _db.CharacterMatches.Add(match);
        await _db.SaveChangesAsync();

        await _notifications.InsertForMatchAsync(match.Id, userId, recipientUserId);

        var recipientPayload = BuildRecipientPayload(match.Id, fromChar, toChar, fromChar.UserGame.Game.Name, match.MatchedAt);
        await _hub.Clients.User(recipientUserId.ToString())
            .SendAsync("NewMatch", recipientPayload);

        return BuildSenderPayload(match.Id, fromChar, toChar, fromChar.UserGame.Game.Name, match.MatchedAt);
    }

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
            .Include(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
            .Where(c => pendingLikerIds.Contains(c.Id))
            .Select(c => new DiscoverCharacterResponse
            {
                Id = c.Id,
                Name = c.Name,
                Platform = c.Platform,
                ImageUrl = c.ImageUrl,
                Bio = c.Bio,
                UsesVoiceChat = c.UsesVoiceChat,
                Languages = c.Languages,
                AdditionalNotes = c.AdditionalNotes,
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

    private static MatchResultResponse BuildSenderPayload(
        Guid matchId, Character fromChar, Character toChar, string gameName, DateTime matchedAt) => new()
    {
        IsMatch = true,
        MatchId = matchId,
        MyCharacter = new MatchCharacterPayload { Id = fromChar.Id, Name = fromChar.Name, ImageUrl = fromChar.ImageUrl },
        TheirCharacter = new MatchCharacterPayload { Id = toChar.Id, Name = toChar.Name, ImageUrl = toChar.ImageUrl },
        GameName = gameName,
        MatchedAt = matchedAt
    };

    private static MatchResultResponse BuildRecipientPayload(
        Guid matchId, Character fromChar, Character toChar, string gameName, DateTime matchedAt) => new()
    {
        IsMatch = true,
        MatchId = matchId,
        MyCharacter = new MatchCharacterPayload { Id = toChar.Id, Name = toChar.Name, ImageUrl = toChar.ImageUrl },
        TheirCharacter = new MatchCharacterPayload { Id = fromChar.Id, Name = fromChar.Name, ImageUrl = fromChar.ImageUrl },
        GameName = gameName,
        MatchedAt = matchedAt
    };

    private static (Guid, Guid) Order(Guid a, Guid b)
        => a.CompareTo(b) < 0 ? (a, b) : (b, a);
}
```

- [ ] **Step 4: Run all interaction tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterInteractionTests" -v
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Services/CharacterInteractionService.cs apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/CharacterInteractionTests.cs
git commit -m "feat: insert match notifications and push via SignalR on match creation"
```

---

## Task 7: MatchNotificationsController + test

**Files:**
- Create: `apps/api/Controllers/MatchNotificationsController.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Features/MatchNotifications/MatchNotificationTests.cs`

- [ ] **Step 1: Write the failing test**

Create `apps/tests/PartyUp.Api.Tests/Features/MatchNotifications/MatchNotificationTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Models;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.MatchNotifications;

public class MatchNotificationTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 50_000;

    public MatchNotificationTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task PostViewed_MarksMatchAsNotNew()
    {
        var (_, _, clientA, clientB) = await SetupMutualMatchAsync();

        var matchesBeforeA = await (await clientA.GetAsync("/api/character-matches"))
            .Content.ReadFromJsonAsync<List<MatchItemDto>>();
        matchesBeforeA![0].IsNew.Should().BeTrue();

        var matchId = matchesBeforeA[0].MatchId;
        var viewedResponse = await clientA.PostAsync($"/api/match-notifications/{matchId}/viewed", null);
        viewedResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var matchesAfterA = await (await clientA.GetAsync("/api/character-matches"))
            .Content.ReadFromJsonAsync<List<MatchItemDto>>();
        matchesAfterA![0].IsNew.Should().BeFalse();

        // clientB's notification should still be unread
        var matchesB = await (await clientB.GetAsync("/api/character-matches"))
            .Content.ReadFromJsonAsync<List<MatchItemDto>>();
        matchesB![0].IsNew.Should().BeTrue();
    }

    [Fact]
    public async Task PostViewed_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsync($"/api/match-notifications/{Guid.NewGuid()}/viewed", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<(Guid CharA, Guid CharB, HttpClient ClientA, HttpClient ClientB)>
        SetupMutualMatchAsync()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var sharedId = Interlocked.Increment(ref _gameCounter);

        var ugA = await AddGameAsync(clientA, sharedId);
        var ugB = await AddGameAsync(clientB, sharedId);
        var charA = await CreateCharacterAsync(clientA, ugA);
        var charB = await CreateCharacterAsync(clientB, ugB);

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

        return (charA, charB, clientA, clientB);
    }

    private async Task<Guid> AddGameAsync(HttpClient client, int externalId)
    {
        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AddGameResult>())!.UserGame.Id;
    }

    private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId)
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Tester",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterIdDto>())!.Id;
    }

    private record AddGameResult(UserGameDto UserGame, bool Redirected, string? Message);
    private record UserGameDto(Guid Id, Guid GameId);
    private record CharacterIdDto(Guid Id);
    private record MatchItemDto(Guid MatchId, DateTime MatchedAt, bool IsNew);
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~MatchNotificationTests" -v
```

Expected: FAIL — 404 on the viewed endpoint, and `IsNew` not present on matches response.

- [ ] **Step 3: Create the controller**

`apps/api/Controllers/MatchNotificationsController.cs`:
```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/match-notifications")]
[Authorize]
public class MatchNotificationsController : ControllerBase
{
    private readonly IMatchNotificationService _service;

    public MatchNotificationsController(IMatchNotificationService service)
    {
        _service = service;
    }

    [HttpPost("{matchId}/viewed")]
    public async Task<IActionResult> MarkViewed(Guid matchId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _service.MarkViewedAsync(matchId, userId);
        return NoContent();
    }
}
```

- [ ] **Step 4: Add IsNew to CharacterMatchDto**

In `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs`, add:
```csharp
public bool IsNew { get; set; }
```

- [ ] **Step 5: Inject IMatchNotificationService into CharacterMatchService and compute IsNew**

In `apps/api/Services/CharacterMatchService.cs`:

Add constructor parameter:
```csharp
private readonly IMatchNotificationService _notifications;

public CharacterMatchService(AppDbContext db, IMatchNotificationService notifications)
{
    _db = db;
    _notifications = notifications;
}
```

After building `matches`, compute the new set before projecting:
```csharp
var matchIds = matches.Select(m => m.Id).ToList();
var newMatchIds = await _notifications.GetNewMatchIdsAsync(userId, matchIds);

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
        TheirCharacter = ToProjection(theirs),
        GameId = mine.UserGame.GameId,
        GameName = mine.UserGame.Game.Name,
        GameImageUrl = mine.UserGame.Game.ImageUrl,
        IsNew = newMatchIds.Contains(m.Id)
    };
}).ToList();
```

Also add the using and interface reference at top of file:
```csharp
using PartyUp.Api.Services.Interfaces;
```

- [ ] **Step 6: Run all notification tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~MatchNotificationTests" -v
```

Expected: All pass.

- [ ] **Step 7: Run full test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/Controllers/MatchNotificationsController.cs apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs apps/api/Services/CharacterMatchService.cs apps/tests/PartyUp.Api.Tests/Features/MatchNotifications/MatchNotificationTests.cs
git commit -m "feat: add MatchNotificationsController and IsNew on character matches"
```

---

## Task 8: Add newMatchCount to UserGamesController

**Files:**
- Modify: `apps/api/Models/DTOs/UserGame/UserGameResponse.cs`
- Modify: `apps/api/Controllers/UserGamesController.cs`

- [ ] **Step 1: Write failing test**

In `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`, add:
```csharp
[Fact]
public async Task GetUserGames_AfterMutualMatch_HasNewMatchCount()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();
    var externalId = 99_001;

    var ugAResponse = await clientA.PostAsJsonAsync("/api/user-games", new
    {
        externalId,
        name = $"Game {externalId}",
        imageUrl = (string?)null
    });
    ugAResponse.EnsureSuccessStatusCode();
    var ugA = (await ugAResponse.Content.ReadFromJsonAsync<AddResultDto>())!.UserGame;

    var ugBResponse = await clientB.PostAsJsonAsync("/api/user-games", new
    {
        externalId,
        name = $"Game {externalId}",
        imageUrl = (string?)null
    });
    ugBResponse.EnsureSuccessStatusCode();
    var ugB = (await ugBResponse.Content.ReadFromJsonAsync<AddResultDto>())!.UserGame;

    var charARes = await clientA.PostAsJsonAsync("/api/characters", new
    {
        name = "A",
        platform = "PC",
        platformHandle = "HandleA",
        userGameId = ugA.Id
    });
    var charA = (await charARes.Content.ReadFromJsonAsync<CharIdDto>())!.Id;

    var charBRes = await clientB.PostAsJsonAsync("/api/characters", new
    {
        name = "B",
        platform = "PC",
        platformHandle = "HandleB",
        userGameId = ugB.Id
    });
    var charB = (await charBRes.Content.ReadFromJsonAsync<CharIdDto>())!.Id;

    await clientA.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = charA,
        toCharacterId = charB,
        type = "Like"
    });
    await clientB.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = charB,
        toCharacterId = charA,
        type = "Like"
    });

    var gamesRes = await clientA.GetAsync("/api/user-games");
    var games = await gamesRes.Content.ReadFromJsonAsync<List<UserGameWithCountDto>>();
    games!.Should().ContainSingle(g => g.Id == ugA.Id && g.NewMatchCount == 1);
}

private record AddResultDto(UserGameWithCountDto UserGame, bool Redirected, string? Message);
private record UserGameWithCountDto(Guid Id, Guid GameId, string GameName, int NewMatchCount);
private record CharIdDto(Guid Id);
```

- [ ] **Step 2: Run to confirm failure**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~UserGameTests.GetUserGames_AfterMutualMatch_HasNewMatchCount" -v
```

Expected: FAIL — `NewMatchCount` not present.

- [ ] **Step 3: Add NewMatchCount to UserGameResponse**

In `apps/api/Models/DTOs/UserGame/UserGameResponse.cs`, add:
```csharp
public int NewMatchCount { get; set; }
```

- [ ] **Step 4: Inject IMatchNotificationService into UserGamesController and compute counts**

In `apps/api/Controllers/UserGamesController.cs`:

Add constructor parameter:
```csharp
private readonly IMatchNotificationService _matchNotifications;

public UserGamesController(IUserGameService service, IMatchNotificationService matchNotifications)
{
    _service = service;
    _matchNotifications = matchNotifications;
}
```

Update `GetUserGames` action:
```csharp
[HttpGet]
public async Task<IActionResult> GetUserGames()
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var games = await _service.GetUserGames(userId);
    var ids = games.Select(g => g.Id).ToList();
    var counts = await _matchNotifications.GetNewMatchCountsByUserGameAsync(userId, ids);
    return Ok(games.Select(g => ToResponse(g, counts.GetValueOrDefault(g.Id, 0))));
}
```

Update `ToResponse` private method to accept the count:
```csharp
private static UserGameResponse ToResponse(UserGame ug, int newMatchCount = 0) => new()
{
    Id = ug.Id,
    UserId = ug.UserId,
    GameId = ug.GameId,
    GameName = ug.Game.Name,
    GameImageUrl = ug.Game.ImageUrl,
    CreatedAt = ug.CreatedAt,
    NewMatchCount = newMatchCount
};
```

Also update the `AddGame` action that returns a `userGame` response — it should pass `0` since a newly added game can't have a match yet:
```csharp
return Ok(new
{
    userGame = ToResponse(result.UserGame, 0),
    redirected = result.Redirected,
    message = result.Message
});
```

- [ ] **Step 5: Run the test**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~UserGameTests.GetUserGames_AfterMutualMatch_HasNewMatchCount" -v
```

Expected: PASS.

- [ ] **Step 6: Run full test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Models/DTOs/UserGame/UserGameResponse.cs apps/api/Controllers/UserGamesController.cs apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs
git commit -m "feat: add newMatchCount to UserGameResponse"
```

---

## Task 9: Add hasNewMatch to CharacterService

**Files:**
- Modify: `apps/api/Models/DTOs/Character/CharacterResponse.cs`
- Modify: `apps/api/Services/CharacterService.cs`

- [ ] **Step 1: Write failing test**

In `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`, add:
```csharp
[Fact]
public async Task GetCharacters_AfterMutualMatch_HasNewMatchTrue()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();
    var externalId = 88_001;

    var ugARes = await clientA.PostAsJsonAsync("/api/user-games", new
    {
        externalId,
        name = $"Game {externalId}",
        imageUrl = (string?)null
    });
    var ugA = (await ugARes.Content.ReadFromJsonAsync<UgAddDto>())!.UserGame.Id;

    var ugBRes = await clientB.PostAsJsonAsync("/api/user-games", new
    {
        externalId,
        name = $"Game {externalId}",
        imageUrl = (string?)null
    });
    var ugB = (await ugBRes.Content.ReadFromJsonAsync<UgAddDto>())!.UserGame.Id;

    var charARes = await clientA.PostAsJsonAsync("/api/characters", new
    {
        name = "CharA",
        platform = "PC",
        platformHandle = "HandleA",
        userGameId = ugA
    });
    var charA = (await charARes.Content.ReadFromJsonAsync<CharMinDto>())!.Id;

    var charBRes = await clientB.PostAsJsonAsync("/api/characters", new
    {
        name = "CharB",
        platform = "PC",
        platformHandle = "HandleB",
        userGameId = ugB
    });
    var charB = (await charBRes.Content.ReadFromJsonAsync<CharMinDto>())!.Id;

    await clientA.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = charA,
        toCharacterId = charB,
        type = "Like"
    });
    await clientB.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = charB,
        toCharacterId = charA,
        type = "Like"
    });

    var chars = await (await clientA.GetAsync("/api/characters"))
        .Content.ReadFromJsonAsync<List<CharWithFlagDto>>();
    chars!.Should().ContainSingle(c => c.Id == charA && c.HasNewMatch);
}

private record UgAddDto(UgMinDto UserGame, bool Redirected, string? Message);
private record UgMinDto(Guid Id);
private record CharMinDto(Guid Id);
private record CharWithFlagDto(Guid Id, bool HasNewMatch);
```

- [ ] **Step 2: Run to confirm failure**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterTests.GetCharacters_AfterMutualMatch_HasNewMatchTrue" -v
```

Expected: FAIL.

- [ ] **Step 3: Add HasNewMatch to CharacterResponse**

In `apps/api/Models/DTOs/Character/CharacterResponse.cs`, add:
```csharp
public bool HasNewMatch { get; set; }
```

- [ ] **Step 4: Inject IMatchNotificationService into CharacterService**

Read `apps/api/Services/CharacterService.cs` first to see the full `GetAllCharactersForUserAsync` method, then make these changes:

Add constructor parameter:
```csharp
private readonly IMatchNotificationService _notifications;

public CharacterService(AppDbContext db, IGcsStorageService gcs, IMatchNotificationService notifications)
{
    _db = db;
    _gcs = gcs;
    _notifications = notifications;
}
```

In `GetAllCharactersForUserAsync`, after fetching characters, compute the set of IDs with new matches and set the flag on each response. The method currently returns `List<CharacterResponse>` — find where it builds those objects and add `HasNewMatch`. The pattern will be:

```csharp
public async Task<List<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId)
{
    var characters = await _db.Characters
        .Include(c => c.UserGame).ThenInclude(ug => ug.Game)
        .Include(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
        .Where(c => c.UserGame.UserId == userId)
        .ToListAsync();

    var characterIds = characters.Select(c => c.Id).ToList();
    var newMatchIds = await _notifications.GetCharacterIdsWithNewMatchAsync(userId, characterIds);

    return characters.Select(c => ToResponse(c, newMatchIds.Contains(c.Id))).ToList();
}
```

Add a `hasNewMatch` parameter to the private `ToResponse` helper (or wherever the projection is done in that service) and set `HasNewMatch = hasNewMatch` in the `CharacterResponse` object.

Also add:
```csharp
using PartyUp.Api.Services.Interfaces;
```

- [ ] **Step 5: Run the test**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterTests.GetCharacters_AfterMutualMatch_HasNewMatchTrue" -v
```

Expected: PASS.

- [ ] **Step 6: Run full test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Models/DTOs/Character/CharacterResponse.cs apps/api/Services/CharacterService.cs apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs
git commit -m "feat: add hasNewMatch to CharacterResponse"
```

---

## Task 10: Frontend — install @microsoft/signalr + matchNotifications API endpoint

**Files:**
- Create: `apps/web/src/api/endpoints/matchNotifications.ts`

- [ ] **Step 1: Install the SignalR client package**

```bash
npm install @microsoft/signalr --prefix apps/web
```

Expected: package added to `apps/web/package.json`.

- [ ] **Step 2: Create matchNotifications endpoint file**

`apps/web/src/api/endpoints/matchNotifications.ts`:
```typescript
import { API_BASE } from "../client";

export async function markMatchViewed(matchId: string): Promise<void> {
  const token = localStorage.getItem("token");
  await fetch(`${API_BASE}/match-notifications/${matchId}/viewed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token ?? ""}`,
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/api/endpoints/matchNotifications.ts
git commit -m "feat: add @microsoft/signalr and matchNotifications API endpoint"
```

---

## Task 11: Frontend — NotificationContext

**Files:**
- Create: `apps/web/src/context/NotificationContext.tsx`

- [ ] **Step 1: Create NotificationContext**

`apps/web/src/context/NotificationContext.tsx`:
```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type MatchNotificationPayload = {
  matchId: string;
  myCharacter: { id: string; name: string; imageUrl?: string };
  theirCharacter: { id: string; name: string; imageUrl?: string };
  gameName: string;
  matchedAt: string;
};

type NotificationContextValue = {
  queue: MatchNotificationPayload[];
  push: (n: MatchNotificationPayload) => void;
  dismiss: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<MatchNotificationPayload[]>([]);

  const push = useCallback((n: MatchNotificationPayload) => {
    setQueue(q => [...q, n]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue(q => q.slice(1));
  }, []);

  return (
    <NotificationContext.Provider value={{ queue, push, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/context/NotificationContext.tsx
git commit -m "feat: add NotificationContext for match notification queue"
```

---

## Task 12: Frontend — AuthContext SignalR connection lifecycle

**Files:**
- Modify: `apps/web/src/context/AuthContext.tsx`

- [ ] **Step 1: Update AuthContext to manage SignalR connection**

Replace the full contents of `apps/web/src/context/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as signalR from "@microsoft/signalr";
import { getMe, type CurrentUser } from "../api/endpoints/auth";
import { UnauthorizedError, API_BASE } from "../api/client";
import { useNotifications, type MatchNotificationPayload } from "./NotificationContext";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unreachable" }
  | { status: "unauthenticated" };

type AuthContextValue = {
  state: AuthState;
  login: (email: string, token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const HUB_URL = API_BASE.replace("/api", "") + "/hubs/notifications";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    localStorage.getItem("token") ? { status: "loading" } : { status: "unauthenticated" }
  );
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const { push } = useNotifications();

  function startConnection(token: string) {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    connection.on("NewMatch", (payload: MatchNotificationPayload) => {
      push(payload);
    });

    connection.start().catch(() => {
      // SignalR connection failure is non-fatal — badges still populate from DB on next load
    });

    connectionRef.current = connection;
  }

  function stopConnection() {
    connectionRef.current?.stop();
    connectionRef.current = null;
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    getMe()
      .then((user) => {
        setState({ status: "authenticated", user });
        startConnection(token);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          setState({ status: "unauthenticated" });
        } else {
          setState({ status: "unreachable" });
        }
      });

    return () => stopConnection();
  }, []);

  async function login(_email: string, token: string) {
    localStorage.setItem("token", token);
    try {
      const user = await getMe();
      setState({ status: "authenticated", user });
      startConnection(token);
    } catch (err) {
      localStorage.removeItem("token");
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setState({ status: "unauthenticated" });
    stopConnection();
  }

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Wrap AuthProvider with NotificationProvider in App.tsx**

In `apps/web/src/App.tsx`, update to:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "./context/NotificationContext";
import { AuthProvider } from "./context/AuthContext";
import SignedInLayout from "./components/layout/SignedInLayout";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import RealmPage from "./pages/RealmPage";
import "./App.css";
import CharactersPage from "./pages/CharacterPage";
import MatchesPage from "./pages/MatchesPage";
import GamesPage from "./pages/GamesPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<SignedInLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/realm/:gameId" element={<RealmPage />} />
              <Route path="/characters" element={<CharactersPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Check the API_BASE export in client.ts**

Read `apps/web/src/api/client.ts` and verify `API_BASE` is exported. If it is not, add `export` to the `const API_BASE` declaration.

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeded. Fix any TypeScript errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/context/AuthContext.tsx apps/web/src/App.tsx
git commit -m "feat: establish SignalR connection on login, push to NotificationContext on NewMatch event"
```

---

## Task 13: Frontend — MatchNotificationToast component

**Files:**
- Create: `apps/web/src/components/notifications/MatchNotificationToast.tsx`

- [ ] **Step 1: Create the toast component**

`apps/web/src/components/notifications/MatchNotificationToast.tsx`:
```tsx
import { useNotifications } from "../../context/NotificationContext";
import { FullArtTcgCard } from "../cards/FullArtTcgCard";

export function MatchNotificationToast() {
  const { queue, dismiss } = useNotifications();
  const notification = queue[0];

  if (!notification) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={dismiss}
    >
      <div
        className="flex flex-col items-center gap-4 p-6 rounded-xl max-w-sm w-full mx-4"
        style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)" }}
        onClick={e => e.stopPropagation()}
      >
        <p className="font-display font-bold text-2xl text-text tracking-wide">It's a Match!</p>
        <p className="text-sm text-muted">{notification.gameName}</p>
        <div className="flex gap-3 w-full">
          <div className="flex-1 aspect-3/4">
            <FullArtTcgCard
              name={notification.myCharacter.name}
              imageUrl={notification.myCharacter.imageUrl}
              className="h-full w-full"
            />
          </div>
          <div className="flex-1 aspect-3/4">
            <FullArtTcgCard
              name={notification.theirCharacter.name}
              imageUrl={notification.theirCharacter.imageUrl}
              className="h-full w-full"
            />
          </div>
        </div>
        <button
          className="text-sm text-muted underline mt-1"
          onClick={dismiss}
        >
          Dismiss
        </button>
        {queue.length > 1 && (
          <p className="text-xs text-muted">{queue.length - 1} more match{queue.length > 2 ? "es" : ""} waiting</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render the toast in SignedInLayout**

Read `apps/web/src/components/layout/SignedInLayout.tsx`, then import and place `<MatchNotificationToast />` at the root of the layout:

```tsx
import { MatchNotificationToast } from "../notifications/MatchNotificationToast";

// Inside the component's return, wrap or append at top level:
<>
  <MatchNotificationToast />
  {/* existing layout content */}
</>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/notifications/MatchNotificationToast.tsx apps/web/src/components/layout/SignedInLayout.tsx
git commit -m "feat: add MatchNotificationToast component"
```

---

## Task 14: Frontend — NewMatchBadge and NewMatchDot UI components

**Files:**
- Create: `apps/web/src/components/ui/NewMatchBadge.tsx`
- Create: `apps/web/src/components/ui/NewMatchDot.tsx`

- [ ] **Step 1: Create NewMatchBadge**

`apps/web/src/components/ui/NewMatchBadge.tsx`:
```tsx
interface NewMatchBadgeProps {
  count: number;
}

export function NewMatchBadge({ count }: NewMatchBadgeProps) {
  if (count <= 0) return null;
  const label = count > 9 ? "+" : String(count);
  return (
    <span
      className="absolute top-1 left-1 z-10 flex items-center justify-center rounded-full bg-green-500 text-white font-bold text-xs"
      style={{ minWidth: "1.25rem", height: "1.25rem", padding: "0 3px" }}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Create NewMatchDot**

`apps/web/src/components/ui/NewMatchDot.tsx`:
```tsx
export function NewMatchDot() {
  return (
    <span
      className="absolute top-1 left-1 z-10 rounded-full bg-green-500"
      style={{ width: "0.625rem", height: "0.625rem" }}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/NewMatchBadge.tsx apps/web/src/components/ui/NewMatchDot.tsx
git commit -m "feat: add NewMatchBadge and NewMatchDot UI components"
```

---

## Task 15: Frontend — Update TypeScript types for augmented API responses

**Files:**
- Modify: `apps/web/src/api/endpoints/userGames.ts`
- Modify: `apps/web/src/api/endpoints/characters.ts`
- Modify: `apps/web/src/api/endpoints/matches.ts`

- [ ] **Step 1: Add newMatchCount to UserGame type**

In `apps/web/src/api/endpoints/userGames.ts`, add `newMatchCount: number` to the `UserGame` type:
```typescript
export type UserGame = {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  gameImageUrl: string | null;
  createdAt: string;
  newMatchCount: number;
};
```

- [ ] **Step 2: Add hasNewMatch to Character and update MatchResponse**

In `apps/web/src/api/endpoints/characters.ts`:

Add `hasNewMatch?: boolean` to the `Character` type:
```typescript
export type Character = {
  // ... existing fields
  hasNewMatch?: boolean;
};
```

Replace the `MatchResponse` type with `MatchResultResponse`:
```typescript
export type MatchResultResponse = {
  isMatch: boolean;
  matchId?: string;
  myCharacter?: { id: string; name: string; imageUrl?: string };
  theirCharacter?: { id: string; name: string; imageUrl?: string };
  gameName?: string;
  matchedAt?: string;
};
```

Update `interactWithCharacter` return type:
```typescript
export function interactWithCharacter(fromCharacterId: string, toCharacterId: string, type: InteractionType) {
  return apiPost<MatchResultResponse>("/character-interactions", { fromCharacterId, toCharacterId, type });
}
```

- [ ] **Step 3: Add isNew to CharacterMatchDto**

In `apps/web/src/api/endpoints/matches.ts`, add `isNew: boolean` to `CharacterMatchDto`:
```typescript
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
```

- [ ] **Step 4: Build to catch type errors**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeded. Fix any type errors (likely in `DiscoveryPanel` where `MatchResponse` was referenced).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/endpoints/userGames.ts apps/web/src/api/endpoints/characters.ts apps/web/src/api/endpoints/matches.ts
git commit -m "feat: update frontend types for newMatchCount, hasNewMatch, isNew, MatchResultResponse"
```

---

## Task 16: Frontend — NewMatchBadge on RealmCard

**Files:**
- Modify: `apps/web/src/components/cards/RealmCard.tsx`

- [ ] **Step 1: Update RealmCard to show the badge**

Replace the full contents of `apps/web/src/components/cards/RealmCard.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'
import { FullArtTcgCard } from './FullArtTcgCard'
import { NewMatchBadge } from '../ui/NewMatchBadge'

interface RealmCardProps {
  userGame: UserGame
}

export function RealmCard({ userGame }: RealmCardProps) {
  return (
    <Link
      to={`/realm/${userGame.gameId}`}
      className="block text-center text-xs font-mono uppercase tracking-widest text-muted hover:border-accent hover:text-accent transition-colors rounded md:w-full relative"
      onClick={e => e.stopPropagation()}
    >
      <NewMatchBadge count={userGame.newMatchCount} />
      <FullArtTcgCard
        name={userGame.gameName}
        className='h-full aspect-3/4'
        imageUrl={userGame.gameImageUrl ?? undefined}
      />
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/RealmCard.tsx
git commit -m "feat: add new match count badge to RealmCard"
```

---

## Task 17: Frontend — NewMatchBadge on GamesPage items

**Files:**
- Modify: `apps/web/src/pages/GamesPage.tsx`

- [ ] **Step 1: Read GamesPage to find where UserGame items are rendered in the list**

Read `apps/web/src/pages/GamesPage.tsx` to find the section that renders the game list on the right side.

- [ ] **Step 2: Wrap each game list item with a relative container and add NewMatchBadge**

Find the section where games are listed (the right panel, iterating over `games`). Wrap each item's container in `relative` positioning and add the badge. The exact code depends on what you find in Step 1, but the pattern is:

```tsx
import { NewMatchBadge } from '../components/ui/NewMatchBadge'

// In the map over games:
<div key={game.id} className="relative cursor-pointer ..." onClick={() => handleSelect(game)}>
  <NewMatchBadge count={game.newMatchCount} />
  <LandCard ... />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/GamesPage.tsx
git commit -m "feat: add new match count badge to GamesPage items"
```

---

## Task 18: Frontend — NewMatchDot on CharacterCard

**Files:**
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`

- [ ] **Step 1: Update CharacterCard**

Replace the full contents of `apps/web/src/components/cards/CharacterCard.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import type { Character } from '../../api/endpoints/characters'
import { StandardTcgCard } from './StandardTcgCard'
import { NewMatchDot } from '../ui/NewMatchDot'

interface CharacterCardProps {
  character: Character
  className: string
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
  onSelect?: (character: Character) => void
}

export function CharacterCard({ character, onSelect, className }: CharacterCardProps) {
  const navigate = useNavigate()

  function handleClick() {
    if (onSelect) onSelect(character)
    else navigate(`/characters/${character.id}`)
  }

  const classField = character.gameFields.find(gf => gf.commonField === 'class_slot')
  const levelField = character.gameFields.find(gf => gf.commonField === 'level_slot')
  const roleField = character.gameFields.find(gf => gf.commonField === 'role_slot')
  const factionField = character.gameFields.find(gf => gf.commonField === 'faction_slot')
  const buildField = character.gameFields.find(gf => gf.commonField === 'build_slot')
  const serverField = character.gameFields.find(gf => gf.commonField === 'server_slot')
  const playstyleField = character.gameFields.find(gf => gf.commonField === 'playstyle_slot')

  const statsContent = [character.gameName, classField?.value].filter(Boolean).join(' · ')
  const statsLine = statsContent ? (
    <span className="text-xs text-muted font-semibold">{statsContent}</span>
  ) : undefined

  const topBioContent = [roleField?.value, factionField?.value, buildField?.value, serverField?.value, playstyleField?.value].filter(Boolean).join(' · ')

  return (
    <div className="relative">
      {character.hasNewMatch && <NewMatchDot />}
      <StandardTcgCard
        className={className}
        name={character.name}
        platform={character.platform}
        imageUrl={character.imageUrl}
        statsLine={statsLine}
        textBody={
          <>
            <p className="text-xs text-muted mb-2">{topBioContent}</p>
            {character.bio ? <p className="text-xs text-muted line-clamp-3">{character.bio}</p> : undefined}
          </>
        }
        bottomStat={levelField?.value}
        onClick={handleClick}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/CharacterCard.tsx
git commit -m "feat: add new match dot indicator to CharacterCard"
```

---

## Task 19: Frontend — isNew indicator on MatchCard

**Files:**
- Modify: `apps/web/src/components/cards/MatchCard.tsx`
- Modify: `apps/web/src/components/CollectionGallery.tsx` (or wherever MatchCard is called with match data)

- [ ] **Step 1: Add isNew prop to MatchCard**

In `apps/web/src/components/cards/MatchCard.tsx`, add `isNew?: boolean` to `MatchCardProps` and apply a green ring when true:

```tsx
interface MatchCardProps {
  character: Character
  gameName: string
  matchedAt: string
  matchId: string
  isNew?: boolean
  onSelect?: (character: Character) => void
}
```

Wrap `FlippableCard` in a relative div with conditional ring styling:
```tsx
export function MatchCard({ character, gameName, matchedAt, matchId, isNew, onSelect }: MatchCardProps) {
  return (
    <div className={`relative ${isNew ? 'ring-2 ring-green-500 rounded-xl' : ''}`}>
      <FlippableCard
        front={<MatchFront character={character} gameName={gameName} matchedAt={matchedAt} matchId={matchId} />}
        back={<MatchBack character={character} gameName={gameName} matchedAt={matchedAt} matchId={matchId} />}
        onFrontClick={onSelect ? () => onSelect(character) : undefined}
        className="h-min md:h-full w-full aspect-2/3 md:aspect-auto"
      />
    </div>
  )
}
```

- [ ] **Step 2: Pass isNew from CollectionGallery**

Read `apps/web/src/components/CollectionGallery.tsx` to find where `MatchCard` is rendered, then pass `isNew={match.isNew}` to it.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/MatchCard.tsx apps/web/src/components/CollectionGallery.tsx
git commit -m "feat: add green ring to MatchCard when isNew"
```

---

## Task 20: Frontend — DiscoveryPanel pushes match to NotificationContext

**Files:**
- Modify: `apps/web/src/components/DiscoveryPanel.tsx`

- [ ] **Step 1: Update DiscoveryPanel to push to notification queue**

In `apps/web/src/components/DiscoveryPanel.tsx`:

Add the import:
```typescript
import { useNotifications } from '../context/NotificationContext'
import type { MatchResultResponse } from '../api/endpoints/characters'
```

Add the hook call inside the component:
```typescript
const { push } = useNotifications()
```

Update `handleInteract` to push when there's a match:
```typescript
async function handleInteract(type: 'Like' | 'Dislike') {
  const current = queue[0]
  if (!current) return
  try {
    const res = await interactWithCharacter(myCharacter.id, current.id, type)
    if (res.isMatch && res.myCharacter && res.theirCharacter) {
      push({
        matchId: res.matchId!,
        myCharacter: res.myCharacter,
        theirCharacter: res.theirCharacter,
        gameName: res.gameName ?? '',
        matchedAt: res.matchedAt ?? new Date().toISOString(),
      })
    }
    if (res.isMatch) onMatch()
  } catch (err) {
    console.error(`Failed to ${type.toLowerCase()} character:`, err)
  }
  setQueue(q => {
    const next = q.slice(1)
    if (next.length === 0 && !hasMore) setStatus('empty')
    return next
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/DiscoveryPanel.tsx
git commit -m "feat: push match notification to context from DiscoveryPanel on match"
```

---

## Task 21: Frontend — MatchesPage calls markAsViewed when detail panel opens

**Files:**
- Modify: `apps/web/src/pages/MatchesPage.tsx`

- [ ] **Step 1: Update MatchesPage to call markAsViewed and clear local isNew state**

In `apps/web/src/pages/MatchesPage.tsx`:

Add import:
```typescript
import { markMatchViewed } from '../api/endpoints/matchNotifications'
```

Update `handleSelect`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/MatchesPage.tsx
git commit -m "feat: mark match as viewed and clear isNew badge when opening match detail"
```

---

## Task 22: End-to-end manual verification

- [ ] **Step 1: Start the full stack**

```bash
docker compose up -d
npm run dev
```

- [ ] **Step 2: Test sender notification**

1. Log in as User A in one browser window
2. Log in as User B in a second browser window  
3. User A navigates to a realm and swipes right on User B's character
4. User B navigates to the same realm and swipes right on User A's character
5. Verify: User B's window shows the "It's a Match!" toast with both full-art cards
6. Verify: User A's window shows the same toast immediately after their swipe completes

- [ ] **Step 3: Test badge propagation**

1. Navigate to the home page — verify realm card(s) show a green badge with count `1`
2. Navigate to the games page — verify the game shows a green badge with count `1`
3. Navigate to the matches collection — verify the match card has a green ring
4. Click the match — verify the left panel opens and the green ring disappears
5. Navigate back to home — verify the realm badge is gone

- [ ] **Step 4: Verify offline recovery**

1. Log out
2. Have another user create a match while logged out
3. Log back in — verify badges appear on home/games/matches from DB state (no toast, just badges)

- [ ] **Step 5: Run full backend test suite one final time**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All pass.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: match notifications — real-time push, unread state, badge propagation"
```
