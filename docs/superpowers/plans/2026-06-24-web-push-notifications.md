# Web Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Web Push notifications so users receive OS-level alerts for new matches and sticker messages when the PartyUp PWA is closed, with a soft-prompt onboarding banner that also handles the iOS install flow.

**Architecture:** The backend stores per-device push subscriptions in a new `UserPushSubscription` table and sends payloads via VAPID using the `WebPush` NuGet package. The existing `CharacterInteractionService` and `StickerMessageService` call the new `IPushNotificationService` after they already fire SignalR events. A hand-written service worker at `apps/web/public/sw.js` handles push events and suppresses OS notifications when the app is focused. A `PushPermissionBanner` rendered in `SignedInLayout` provides the opt-in flow with iOS-specific messaging.

**Tech Stack:** .NET 8, `WebPush` NuGet package, EF Core + PostgreSQL, React + TypeScript, Web Push API, Service Worker API

## Global Constraints

- VAPID keys never committed — stored in User Secrets / `appsettings.Development.json` only
- Push failures are logged and swallowed — dropped pushes are acceptable
- Service worker is hand-written at `apps/web/public/sw.js` — no `vite-plugin-pwa`
- iOS push only works when PWA is installed to home screen (iOS 16.4+) — banner handles this UX case
- Thin controllers: all logic in services
- Tests use `WebApplicationFactory<Program>` with a real PostgreSQL DB (`partyup_test`)
- Test suite replaces `IPushNotificationService` with a no-op to prevent network calls

---

## File Map

**Create:**
- `apps/api/Models/UserPushSubscription.cs` — EF entity
- `apps/api/Models/DTOs/PushSubscription/PushSubscriptionRequest.cs` — shared request DTO
- `apps/api/Services/Interfaces/IPushNotificationService.cs` — service interface
- `apps/api/Services/PushNotificationService.cs` — implementation
- `apps/api/Controllers/PushSubscriptionsController.cs` — three endpoints
- `apps/tests/PartyUp.Api.Tests/Infrastructure/NoOpPushNotificationService.cs` — test stub
- `apps/tests/PartyUp.Api.Tests/Features/PushSubscriptions/PushSubscriptionTests.cs` — integration tests
- `apps/web/public/sw.js` — service worker
- `apps/web/src/api/endpoints/pushSubscriptions.ts` — frontend API calls
- `apps/web/src/hooks/usePushSubscription.ts` — permission + subscription hook
- `apps/web/src/components/notifications/PushPermissionBanner.tsx` — onboarding banner

**Modify:**
- `apps/api/Infrastructure/Data/DbContext.cs` — add `DbSet<UserPushSubscription>` + index
- `apps/api/Program.cs` — register `VapidOptions` config + `IPushNotificationService`
- `apps/api/Services/CharacterInteractionService.cs` — inject + call push on match
- `apps/api/Services/StickerMessageService.cs` — inject + call push on sticker
- `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs` — register no-op push service
- `apps/web/src/main.tsx` — register service worker
- `apps/web/src/components/layout/SignedInLayout.tsx` — render `PushPermissionBanner`

---

## Task 1: UserPushSubscription Entity + DB Migration

**Files:**
- Create: `apps/api/Models/UserPushSubscription.cs`
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`

**Interfaces:**
- Produces: `UserPushSubscription` entity class and `AppDbContext.UserPushSubscriptions` DbSet used by Tasks 2 and beyond.

- [ ] **Step 1: Create the entity**

Create `apps/api/Models/UserPushSubscription.cs`:

```csharp
namespace PartyUp.Api.Models;

public class UserPushSubscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Endpoint { get; set; } = "";
    public string P256dh { get; set; } = "";
    public string Auth { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
```

- [ ] **Step 2: Add DbSet and index to AppDbContext**

In `apps/api/Infrastructure/Data/DbContext.cs`, add the DbSet after the existing `StickerMessages` line:

```csharp
public DbSet<StickerMessage> StickerMessages { get; set; }
public DbSet<UserPushSubscription> UserPushSubscriptions { get; set; }  // add this
```

In `OnModelCreating`, add before the closing brace:

```csharp
modelBuilder.Entity<UserPushSubscription>(e =>
{
    e.HasIndex(s => s.UserId);
});
```

- [ ] **Step 3: Add EF migration**

```bash
dotnet ef migrations add AddUserPushSubscription --project apps/api
```

Expected output: a new file under `apps/api/Migrations/` named something like `20260624_AddUserPushSubscription.cs`.

- [ ] **Step 4: Apply migration to dev database**

```bash
dotnet ef database update --project apps/api
```

Expected output ends with: `Done.`

- [ ] **Step 5: Commit**

```bash
git add apps/api/Models/UserPushSubscription.cs apps/api/Infrastructure/Data/DbContext.cs apps/api/Migrations/
git commit -m "feat: add UserPushSubscription entity and migration"
```

---

## Task 2: IPushNotificationService + PushNotificationService + Program.cs Registration

**Files:**
- Create: `apps/api/Models/DTOs/PushSubscription/PushSubscriptionRequest.cs`
- Create: `apps/api/Services/Interfaces/IPushNotificationService.cs`
- Create: `apps/api/Services/PushNotificationService.cs`
- Modify: `apps/api/Program.cs`

**Interfaces:**
- Consumes: `AppDbContext.UserPushSubscriptions` (Task 1), `UserPushSubscription` entity (Task 1)
- Produces: `IPushNotificationService` with methods `SendToUserAsync`, `RegisterAsync`, `UnregisterAsync`, `GetVapidPublicKey` — consumed by Tasks 3, 4, 5

- [ ] **Step 1: Install the WebPush NuGet package**

```bash
dotnet add apps/api/PartyUp.Api.csproj package WebPush
```

Expected: package added to `apps/api/PartyUp.Api.csproj`.

- [ ] **Step 2: Generate VAPID keys (one-time setup)**

```bash
npx web-push generate-vapid-keys
```

Copy the output — two base64url strings. You'll need them in the next step. These are permanent credentials; don't regenerate them after deployment.

- [ ] **Step 3: Store VAPID keys in User Secrets**

```bash
dotnet user-secrets set "Vapid:PublicKey" "<your-public-key>" --project apps/api
dotnet user-secrets set "Vapid:PrivateKey" "<your-private-key>" --project apps/api
dotnet user-secrets set "Vapid:Subject" "mailto:kylepcodes@gmail.com" --project apps/api
```

Or add to `apps/api/appsettings.Development.json` (already gitignored via secrets pattern):

```json
"Vapid": {
  "PublicKey": "<your-public-key>",
  "PrivateKey": "<your-private-key>",
  "Subject": "mailto:kylepcodes@gmail.com"
}
```

- [ ] **Step 4: Create the request DTO**

Create `apps/api/Models/DTOs/PushSubscription/PushSubscriptionRequest.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.PushSubscription;

public class PushSubscriptionRequest
{
    public string Endpoint { get; set; } = "";
    public string P256dh { get; set; } = "";
    public string Auth { get; set; } = "";
}
```

- [ ] **Step 5: Create the interface**

Create `apps/api/Services/Interfaces/IPushNotificationService.cs`:

```csharp
namespace PartyUp.Api.Services.Interfaces;

public interface IPushNotificationService
{
    string GetVapidPublicKey();
    Task RegisterAsync(Guid userId, string endpoint, string p256dh, string auth);
    Task UnregisterAsync(Guid userId, string endpoint);
    Task SendToUserAsync(Guid userId, string title, string body, object? data = null);
}
```

- [ ] **Step 6: Create the implementation**

Create `apps/api/Services/PushNotificationService.cs`:

```csharp
using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Services.Interfaces;
using WebPush;

namespace PartyUp.Api.Services;

public class VapidOptions
{
    public string PublicKey { get; set; } = "";
    public string PrivateKey { get; set; } = "";
    public string Subject { get; set; } = "";
}

public class PushNotificationService : IPushNotificationService
{
    private readonly AppDbContext _db;
    private readonly VapidDetails _vapidDetails;
    private readonly string _publicKey;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(
        AppDbContext db,
        IOptions<VapidOptions> options,
        ILogger<PushNotificationService> logger)
    {
        _db = db;
        var v = options.Value;
        _vapidDetails = new VapidDetails(v.Subject, v.PublicKey, v.PrivateKey);
        _publicKey = v.PublicKey;
        _logger = logger;
    }

    public string GetVapidPublicKey() => _publicKey;

    public async Task RegisterAsync(Guid userId, string endpoint, string p256dh, string auth)
    {
        var existing = await _db.UserPushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == endpoint);

        if (existing is not null)
        {
            existing.P256dh = p256dh;
            existing.Auth = auth;
        }
        else
        {
            _db.UserPushSubscriptions.Add(new UserPushSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Endpoint = endpoint,
                P256dh = p256dh,
                Auth = auth,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
    }

    public async Task UnregisterAsync(Guid userId, string endpoint)
    {
        var subscription = await _db.UserPushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == endpoint);

        if (subscription is null) return;

        _db.UserPushSubscriptions.Remove(subscription);
        await _db.SaveChangesAsync();
    }

    public async Task SendToUserAsync(Guid userId, string title, string body, object? data = null)
    {
        var subscriptions = await _db.UserPushSubscriptions
            .Where(s => s.UserId == userId)
            .ToListAsync();

        if (subscriptions.Count == 0) return;

        var payload = JsonSerializer.Serialize(new { title, body, data });
        var staleIds = new List<Guid>();

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSubscription = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                var client = new WebPushClient();
                await client.SendNotificationAsync(pushSubscription, payload, _vapidDetails);
            }
            catch (WebPushException ex) when (ex.StatusCode == HttpStatusCode.Gone)
            {
                staleIds.Add(sub.Id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Push notification failed for subscription {Id}", sub.Id);
            }
        }

        if (staleIds.Count > 0)
        {
            await _db.UserPushSubscriptions
                .Where(s => staleIds.Contains(s.Id))
                .ExecuteDeleteAsync();
        }
    }
}
```

- [ ] **Step 7: Register in Program.cs**

In `apps/api/Program.cs`, add after the `builder.Services.AddScoped<IStickerMessageService, StickerMessageService>();` line:

```csharp
builder.Services.Configure<VapidOptions>(builder.Configuration.GetSection("Vapid"));
builder.Services.AddScoped<IPushNotificationService, PushNotificationService>();
```

Add the using at the top of `Program.cs`:

```csharp
using PartyUp.Api.Services;
```

- [ ] **Step 8: Verify the API builds**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 9: Commit**

```bash
git add apps/api/ 
git commit -m "feat: add IPushNotificationService and PushNotificationService"
```

---

## Task 3: NoOpPushNotificationService + ApiFactory + PushSubscriptionsController + Tests

**Files:**
- Create: `apps/tests/PartyUp.Api.Tests/Infrastructure/NoOpPushNotificationService.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs`
- Create: `apps/api/Controllers/PushSubscriptionsController.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Features/PushSubscriptions/PushSubscriptionTests.cs`

**Interfaces:**
- Consumes: `IPushNotificationService` (Task 2)
- Produces: HTTP endpoints at `/api/push-subscriptions/*`

- [ ] **Step 1: Create the no-op test service**

Create `apps/tests/PartyUp.Api.Tests/Infrastructure/NoOpPushNotificationService.cs`:

```csharp
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Tests.Infrastructure;

public class NoOpPushNotificationService : IPushNotificationService
{
    public string GetVapidPublicKey() => "test-vapid-public-key";
    public Task RegisterAsync(Guid userId, string endpoint, string p256dh, string auth) => Task.CompletedTask;
    public Task UnregisterAsync(Guid userId, string endpoint) => Task.CompletedTask;
    public Task SendToUserAsync(Guid userId, string title, string body, object? data = null) => Task.CompletedTask;
}
```

- [ ] **Step 2: Register the no-op in ApiFactory**

In `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs`, add inside `builder.ConfigureServices`:

```csharp
// Add after existing service replacements (gcsDescriptor, schemaDescriptor blocks)
var pushDescriptor = services.SingleOrDefault(
    d => d.ServiceType == typeof(IPushNotificationService));
if (pushDescriptor != null)
    services.Remove(pushDescriptor);
services.AddScoped<IPushNotificationService, NoOpPushNotificationService>();
```

Add the using at the top of `ApiFactory.cs`:

```csharp
using PartyUp.Api.Services.Interfaces;
```

- [ ] **Step 3: Write the failing tests**

Create `apps/tests/PartyUp.Api.Tests/Features/PushSubscriptions/PushSubscriptionTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.PushSubscriptions;

public class PushSubscriptionTests : TestBase, IClassFixture<ApiFactory>
{
    public PushSubscriptionTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetVapidPublicKey_ReturnsOkWithKey()
    {
        var response = await Client.GetAsync("/api/push-subscriptions/vapid-public-key");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<VapidKeyResponse>();
        body!.PublicKey.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_Unauthenticated_ReturnsUnauthorized()
    {
        var response = await Client.PostAsJsonAsync("/api/push-subscriptions", new
        {
            endpoint = "https://fcm.example.com/test",
            p256dh = "test-p256dh",
            auth = "test-auth"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Register_Authenticated_ReturnsOk()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/push-subscriptions", new
        {
            endpoint = "https://fcm.example.com/test",
            p256dh = "test-p256dh",
            auth = "test-auth"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Unregister_Unauthenticated_ReturnsUnauthorized()
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/push-subscriptions")
        {
            Content = JsonContent.Create(new { endpoint = "https://fcm.example.com/test" })
        };
        var response = await Client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Unregister_Authenticated_ReturnsNoContent()
    {
        var client = await CreateAuthenticatedClientAsync();
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/push-subscriptions")
        {
            Content = JsonContent.Create(new { endpoint = "https://fcm.example.com/test" })
        };
        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private record VapidKeyResponse(string PublicKey);
}
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~PushSubscriptionTests" --no-build
```

Expected: compilation errors (controller doesn't exist yet) or 404s.

- [ ] **Step 5: Create the controller**

Create `apps/api/Controllers/PushSubscriptionsController.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.PushSubscription;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/push-subscriptions")]
public class PushSubscriptionsController : ControllerBase
{
    private readonly IPushNotificationService _push;

    public PushSubscriptionsController(IPushNotificationService push)
    {
        _push = push;
    }

    [HttpGet("vapid-public-key")]
    public IActionResult GetVapidPublicKey() =>
        Ok(new { publicKey = _push.GetVapidPublicKey() });

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Register([FromBody] PushSubscriptionRequest request)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        await _push.RegisterAsync(userId, request.Endpoint, request.P256dh, request.Auth);
        return Ok();
    }

    [Authorize]
    [HttpDelete]
    public async Task<IActionResult> Unregister([FromBody] PushSubscriptionRequest request)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        await _push.UnregisterAsync(userId, request.Endpoint);
        return NoContent();
    }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~PushSubscriptionTests"
```

Expected: `5 passed, 0 failed`

- [ ] **Step 7: Commit**

```bash
git add apps/api/Controllers/PushSubscriptionsController.cs apps/api/Models/DTOs/PushSubscription/ apps/tests/
git commit -m "feat: add PushSubscriptionsController and no-op test service"
```

---

## Task 4: Wire Push into CharacterInteractionService

**Files:**
- Modify: `apps/api/Services/CharacterInteractionService.cs`

**Interfaces:**
- Consumes: `IPushNotificationService.SendToUserAsync` (Task 2)

- [ ] **Step 1: Run existing interaction tests to establish baseline**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterInteractionTests"
```

Expected: all passing. Note the count — they should all still pass after this task.

- [ ] **Step 2: Inject IPushNotificationService into CharacterInteractionService**

In `apps/api/Services/CharacterInteractionService.cs`, update the class fields and constructor:

```csharp
public class CharacterInteractionService : ICharacterInteractionService
{
    private readonly AppDbContext _db;
    private readonly IMatchNotificationService _notifications;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly IPushNotificationService _push;

    public CharacterInteractionService(
        AppDbContext db,
        IMatchNotificationService notifications,
        IHubContext<NotificationHub> hub,
        IPushNotificationService push)
    {
        _db = db;
        _notifications = notifications;
        _hub = hub;
        _push = push;
    }
```

Add the using at the top of the file:

```csharp
using PartyUp.Api.Services.Interfaces;
```

- [ ] **Step 3: Call push after match creation**

In `RecordInteractionAsync`, find the block that fires the SignalR `NewMatch` event:

```csharp
await _hub.Clients.User(recipientUserId.ToString())
    .SendAsync("NewMatch", recipientPayload);
```

Add the push call immediately after it:

```csharp
await _hub.Clients.User(recipientUserId.ToString())
    .SendAsync("NewMatch", recipientPayload);

await _push.SendToUserAsync(
    recipientUserId,
    "It's a Match! 🎮",
    $"{toChar.Name} matched with {fromChar.Name} in {gameName}");
```

- [ ] **Step 4: Build and run existing interaction tests**

```bash
dotnet build apps/api/PartyUp.Api.csproj
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CharacterInteractionTests"
```

Expected: same count passing as Step 1. The no-op service means push calls are silent.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Services/CharacterInteractionService.cs
git commit -m "feat: send push notification on new match"
```

---

## Task 5: Wire Push into StickerMessageService

**Files:**
- Modify: `apps/api/Services/StickerMessageService.cs`

**Interfaces:**
- Consumes: `IPushNotificationService.SendToUserAsync` (Task 2)

- [ ] **Step 1: Run existing sticker tests to establish baseline**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~StickerMessageTests"
```

Note the passing count.

- [ ] **Step 2: Inject IPushNotificationService into StickerMessageService**

In `apps/api/Services/StickerMessageService.cs`, update the fields and constructor:

```csharp
public class StickerMessageService : IStickerMessageService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly IPushNotificationService _push;

    public StickerMessageService(AppDbContext db, IHubContext<NotificationHub> hub, IPushNotificationService push)
    {
        _db = db;
        _hub = hub;
        _push = push;
    }
```

Add the using at the top of the file:

```csharp
using PartyUp.Api.Services.Interfaces;
```

- [ ] **Step 3: Call push after sticker send**

In `SendAsync`, find the SignalR call:

```csharp
await _hub.Clients.User(recipientUserId.ToString())
    .SendAsync("NewSticker", new { ... });
```

Add the push call immediately after it:

```csharp
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

await _push.SendToUserAsync(
    recipientUserId,
    $"New sticker from {senderCharacterName}",
    dto.Emoji);
```

- [ ] **Step 4: Build and run existing sticker tests**

```bash
dotnet build apps/api/PartyUp.Api.csproj
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~StickerMessageTests"
```

Expected: same count passing as Step 1.

- [ ] **Step 5: Run the full test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Services/StickerMessageService.cs
git commit -m "feat: send push notification on new sticker message"
```

---

## Task 6: Service Worker + main.tsx Registration

**Files:**
- Create: `apps/web/public/sw.js`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**
- Produces: `/sw.js` endpoint that the browser registers as a service worker; `navigator.serviceWorker.ready` resolves to this registration and is used by `usePushSubscription` in Task 7.

- [ ] **Step 1: Create the service worker**

Create `apps/web/public/sw.js`:

```javascript
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'PartyUp';
  const options = {
    body: data.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data ?? {}
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const appFocused = clients.some(c => c.focused);
      if (appFocused) return;
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
```

- [ ] **Step 2: Register the service worker in main.tsx**

Replace the contents of `apps/web/src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // SW registration failure is non-fatal
  });
}
```

- [ ] **Step 3: Verify service worker registers in the browser**

```bash
npm run dev --prefix apps/web
```

Open `http://localhost:5173`, open DevTools → Application → Service Workers. Confirm `sw.js` shows as registered and active.

- [ ] **Step 4: Commit**

```bash
git add apps/web/public/sw.js apps/web/src/main.tsx
git commit -m "feat: add push notification service worker"
```

---

## Task 7: Frontend Push API Client + usePushSubscription Hook

**Files:**
- Create: `apps/web/src/api/endpoints/pushSubscriptions.ts`
- Create: `apps/web/src/hooks/usePushSubscription.ts`

**Interfaces:**
- Produces: `usePushSubscription()` hook returning `{ subscribe, unsubscribe, isSubscribed, isSupported }` — consumed by Task 8.

- [ ] **Step 1: Create the API endpoint file**

Create `apps/web/src/api/endpoints/pushSubscriptions.ts`:

```typescript
import { API_BASE } from '../client';

export async function getVapidPublicKey(): Promise<string> {
  const response = await fetch(`${API_BASE}/push-subscriptions/vapid-public-key`);
  const data = await response.json();
  return data.publicKey;
}

export async function registerPushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const token = localStorage.getItem('token');
  await fetch(`${API_BASE}/push-subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: JSON.stringify(sub),
  });
}

export async function unregisterPushSubscription(endpoint: string): Promise<void> {
  const token = localStorage.getItem('token');
  await fetch(`${API_BASE}/push-subscriptions`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: JSON.stringify({ endpoint }),
  });
}
```

- [ ] **Step 2: Create the hook**

Create `apps/web/src/hooks/usePushSubscription.ts`:

```typescript
import { useState, useEffect } from 'react';
import {
  getVapidPublicKey,
  registerPushSubscription,
  unregisterPushSubscription,
} from '../api/endpoints/pushSubscriptions';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export function usePushSubscription() {
  const isSupported =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(sub !== null);
      });
    });
  }, [isSupported]);

  async function subscribe(): Promise<boolean> {
    if (!isSupported) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const publicKey = await getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = subscription.toJSON();
    await registerPushSubscription({
      endpoint: json.endpoint!,
      p256dh: (json.keys as Record<string, string>).p256dh,
      auth: (json.keys as Record<string, string>).auth,
    });

    setIsSubscribed(true);
    return true;
  }

  async function unsubscribe() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const { endpoint } = subscription;
    await subscription.unsubscribe();
    await unregisterPushSubscription(endpoint);
    setIsSubscribed(false);
  }

  return { subscribe, unsubscribe, isSubscribed, isSupported };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: `built in X.XXs` with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/pushSubscriptions.ts apps/web/src/hooks/usePushSubscription.ts
git commit -m "feat: add push subscription API client and hook"
```

---

## Task 8: PushPermissionBanner + Wire into SignedInLayout

**Files:**
- Create: `apps/web/src/components/notifications/PushPermissionBanner.tsx`
- Modify: `apps/web/src/components/layout/SignedInLayout.tsx`

**Interfaces:**
- Consumes: `usePushSubscription()` (Task 7)

- [ ] **Step 1: Create the banner component**

Create `apps/web/src/components/notifications/PushPermissionBanner.tsx`:

```tsx
import { useState } from 'react';
import { usePushSubscription } from '../../hooks/usePushSubscription';

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function PushPermissionBanner() {
  const { subscribe, isSupported } = usePushSubscription();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('push-banner-dismissed') === '1'
  );

  if (
    !isSupported ||
    dismissed ||
    Notification.permission === 'granted' ||
    Notification.permission === 'denied'
  ) {
    return null;
  }

  const ios = isIos();
  const installed = isStandalone();
  const iosNotInstalled = ios && !installed;

  function dismiss() {
    localStorage.setItem('push-banner-dismissed', '1');
    setDismissed(true);
  }

  async function handleEnable() {
    const granted = await subscribe();
    if (granted) dismiss();
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 p-4 flex flex-col gap-2"
      style={{
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {iosNotInstalled ? (
        <>
          <p className="text-sm font-semibold text-text">
            Install PartyUp to enable notifications
          </p>
          <p className="text-xs text-muted">
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then reopen the app
            to turn on match alerts.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-text">Stay in the loop</p>
          <p className="text-xs text-muted">
            Get notified when you match or receive a sticker, even when the app is closed.
            {ios && ' Works best when installed to your home screen.'}
          </p>
        </>
      )}
      <div className="flex items-center gap-4 mt-1">
        {!iosNotInstalled && (
          <button
            onClick={handleEnable}
            className="text-xs font-semibold px-4 py-2 rounded-lg"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Enable Notifications
          </button>
        )}
        <button onClick={dismiss} className="text-xs text-muted underline">
          {iosNotInstalled ? 'Got it' : 'Not now'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the banner to SignedInLayout**

In `apps/web/src/components/layout/SignedInLayout.tsx`:

Add the import at the top:

```tsx
import { PushPermissionBanner } from '../notifications/PushPermissionBanner';
```

Add `<PushPermissionBanner />` after `<StickerToast />`:

```tsx
return (
  <>
    <MatchNotificationToast />
    <StickerToast />
    <PushPermissionBanner />
    <div className="min-h-screen max-h-screen flex flex-col md:flex-row relative overflow-hidden">
      <NavBar variant="app" />
      <Outlet />
    </div>
  </>
)
```

- [ ] **Step 3: Test the banner in the browser**

```bash
npm run dev --prefix apps/web
```

1. Log in as a test user
2. Confirm the banner appears at the bottom of the screen
3. Click "Not now" — confirm it disappears and does not reappear on refresh
4. Clear `localStorage` (`localStorage.removeItem('push-banner-dismissed')`) and refresh
5. Click "Enable Notifications" — confirm the browser permission dialog appears
6. Grant permission — confirm the banner disappears and `Notification.permission` is `'granted'`
7. Check DevTools → Application → Push Messaging — a subscription endpoint should appear

- [ ] **Step 4: Test push delivery end-to-end**

With the dev server and API running (`npm run dev` from project root):

1. Open the app in Chrome, enable notifications
2. Open a second incognito window and log in as a different user
3. In window 2, trigger a mutual like with window 1's character
4. Minimize window 1 (unfocus it)
5. In window 2, complete the mutual like
6. Confirm an OS notification appears for user 1

- [ ] **Step 5: Verify TypeScript build is clean**

```bash
npm run build --prefix apps/web
```

Expected: no TypeScript errors.

- [ ] **Step 6: Run all backend tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/notifications/PushPermissionBanner.tsx apps/web/src/components/layout/SignedInLayout.tsx
git commit -m "feat: add PushPermissionBanner and wire into SignedInLayout"
```
