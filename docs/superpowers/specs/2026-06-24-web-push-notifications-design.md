# Web Push Notifications — Design Spec

**Date:** 2026-06-24  
**Status:** Approved

## Overview

Add Web Push notifications to PartyUp so users receive OS-level alerts for new matches and new sticker messages even when the PWA is closed. The system must be extensible to support future notification types (e.g., re-engagement nudges). Reliability is best-effort — dropped pushes are acceptable; the DB-backed badge system already surfaces missed events on next login.

## Architecture

### Approach

Direct Web Push via VAPID (no Firebase, no third-party push service). The `.NET WebPush` NuGet package sends payloads directly to browser push services (Chrome, Firefox, Safari). VAPID keys are generated once and stored in config/User Secrets.

### Trigger Chain

```
Event occurs (match / sticker)
  → Service saves to DB
  → SignalR push to recipient (existing, in-app only)
  → IPushNotificationService.SendToUserAsync() (new, works when app closed)
      → fetch all UserPushSubscription rows for user
      → fire Web Push to each endpoint
      → delete stale subscriptions (HTTP 410 response)
      → swallow other failures (log, don't throw)
```

## Backend

### New Entity: `UserPushSubscription`

```
Id         Guid        PK
UserId     Guid        FK → User, indexed
Endpoint   string      browser-provided push URL
P256dh     string      client public key
Auth       string      client auth secret
CreatedAt  DateTime
```

A user may have multiple rows (one per device/browser). Add `DbSet<UserPushSubscription>` to `AppDbContext` and create an EF migration.

### Config: VAPID Keys

Added to `appsettings.Development.json` / User Secrets. Never committed.

```json
"Vapid": {
  "PublicKey": "<base64url>",
  "PrivateKey": "<base64url>",
  "Subject": "mailto:kylepcodes@gmail.com"
}
```

Generate with `VapidHelper.GenerateVapidKeys()` from the WebPush package (one-time, done during setup).

### `IPushNotificationService`

```csharp
public interface IPushNotificationService
{
    Task SendToUserAsync(Guid userId, string title, string body, object? data = null);
    Task RegisterAsync(Guid userId, RegisterPushSubscriptionRequest request);
    Task UnregisterAsync(Guid userId, string endpoint);
    string GetVapidPublicKey();
}
```

**`SendToUserAsync`** — fetches all subscriptions for `userId`, serializes `{ title, body, data }` as JSON, calls `webPushClient.SendNotificationAsync()` for each. A `WebPushException` with HTTP 410 removes the subscription; all other exceptions are logged and swallowed. The method is `async` and awaited by callers — no fire-and-forget to keep DI scopes clean.

**`RegisterAsync`** — upserts by endpoint: if a row with the same `Endpoint` already exists for the user, update `P256dh`/`Auth`; otherwise insert.

**`UnregisterAsync`** — deletes the row matching the endpoint for that user.

**`GetVapidPublicKey`** — returns `config["Vapid:PublicKey"]`. Called by the frontend before subscribing.

Registered as `Scoped` in DI.

### `PushSubscriptionsController`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/push-subscriptions/vapid-public-key` | None | Frontend fetches public key to subscribe |
| POST | `/api/push-subscriptions` | JWT | Register a device subscription |
| DELETE | `/api/push-subscriptions` | JWT | Unregister a device by endpoint |

Request body for POST/DELETE:
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "p256dh": "...",
  "auth": "..."
}
```

### Integration Points

**`CharacterInteractionService.RecordInteractionAsync`** — after the `NewMatch` SignalR call, add:
```csharp
await _push.SendToUserAsync(
    recipientUserId,
    "It's a Match! 🎮",
    $"{toChar.Name} matched with {fromChar.Name} in {gameName}");
```

**`StickerMessageService.SendAsync`** — after the `NewSticker` SignalR call, add:
```csharp
await _push.SendToUserAsync(
    recipientUserId,
    $"New sticker from {senderCharacterName}",
    emoji);
```

Both services already have the recipient user ID and character names available at the exact point where the push should fire.

## Frontend

### Service Worker: `apps/web/public/sw.js`

Hand-written, no `vite-plugin-pwa`. The manifest is already linked in `index.html`.

**`push` event handler:**
1. Parse `event.data.json()` to get `{ title, body, data }`
2. Call `self.clients.matchAll({ type: 'window', includeUncontrolled: true })`
3. If any client has `focused: true`, suppress the notification (user already sees the in-app SignalR toast)
4. Otherwise, call `self.registration.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', data })`

**`notificationclick` event handler:**
1. Close the notification
2. `clients.matchAll()` — if an existing PartyUp window exists, focus it
3. Otherwise, `clients.openWindow('/')`

**Registration:** `navigator.serviceWorker.register('/sw.js')` in `apps/web/src/main.tsx` after the React tree mounts. The `usePushSubscription` hook accesses the active registration via `navigator.serviceWorker.ready`, which resolves once the worker is active — no need to pass the registration around.

### `usePushSubscription` Hook

Located at `apps/web/src/hooks/usePushSubscription.ts`.

Returns `{ subscribe, unsubscribe, isSubscribed, isSupported }`.

**`isSupported`** — `'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window`

**`subscribe`:**
1. `GET /api/push-subscriptions/vapid-public-key`
2. `await Notification.requestPermission()` — abort if result is not `'granted'`
3. `await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })` — `urlBase64ToUint8Array` is a small utility (10 lines) that converts base64url strings to `Uint8Array`, required by the Push API
4. Extract `endpoint`, `p256dh`, `auth` from the subscription object
5. `POST /api/push-subscriptions`
6. Set `isSubscribed = true`

**`unsubscribe`:** Calls `subscription.unsubscribe()` then `DELETE /api/push-subscriptions`.

### `PushPermissionBanner` Component

Located at `apps/web/src/components/notifications/PushPermissionBanner.tsx`.

Rendered in `SignedInLayout` (wraps all authenticated pages).

**Visibility conditions — show if ALL are true:**
- User is authenticated
- `Notification.permission !== 'granted'`
- `localStorage.getItem('push-banner-dismissed')` is not set
- `isSupported` is true

**iOS detection:**
- iOS device: `/iPhone|iPad|iPod/.test(navigator.userAgent)`
- Installed (standalone): `window.matchMedia('(display-mode: standalone)').matches`

**Render variants:**

| Scenario | Banner content |
|----------|---------------|
| Non-iOS / Android / Desktop | "Get notified when you match or receive a sticker, even when the app is closed." + "Enable Notifications" button |
| iOS, not installed | "Install PartyUp to your Home Screen first (tap Share → Add to Home Screen), then re-open to enable match notifications." + "Got it" button |
| iOS, installed (standalone) | Same as non-iOS — proceed with normal permission flow |

**"Enable Notifications" click:** calls `subscribe()` from `usePushSubscription`. On success, banner hides.

**"Not now" / "Got it" click:** sets `localStorage.setItem('push-banner-dismissed', '1')` and hides banner. Does not re-appear.

The banner is a fixed bottom strip, non-modal, dismissible — it does not block the user from using the app.

## Error Handling

| Failure | Handling |
|---------|----------|
| Push delivery fails (non-410) | Log on server, swallow — user sees badge on next login |
| Push subscription is stale (410) | Delete subscription row automatically |
| User denies browser permission | `subscribe()` returns early, banner hides, dismissed flag set |
| Service worker registration fails | Logged to console, push silently unavailable — no user impact |
| iOS in browser (not installed) | Banner shows install instructions instead of permission flow |

## Out of Scope

- Scheduled/re-engagement pushes (future work — the `IPushNotificationService` interface supports it, but no scheduler is added now)
- Push delivery receipts or retry queues
- Notification preferences per-type (mute matches but not stickers, etc.)
- Web Push on iOS Safari without PWA install (browser limitation, not fixable)
