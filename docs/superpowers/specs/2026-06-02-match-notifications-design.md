# Match Notifications Design

**Date:** 2026-06-02  
**Scope:** Real-time match notifications, persistent "new match" unread state, and badge propagation through the UI.  
**Out of scope:** Chat (follow-on), offline/browser push notifications, email notifications.

---

## Overview

When two characters mutually like each other, both users need to know about it — immediately if online, on next visit if not. The system must surface "new match" state at every level of the UI where matches are relevant (realm cards, game cards, character cards, match collection) and clear it when the user explicitly opens the match detail.

---

## 1. Data Model

### New table: `MatchNotification`

| Column | Type | Notes |
|---|---|---|
| `Id` | `Guid` (PK) | |
| `UserId` | `Guid` (FK → `User`) | The user this notification belongs to |
| `MatchId` | `Guid` (FK → `CharacterMatch`) | |
| `Type` | `enum NotificationType` | `NewMatch` now; `NewMessage` added when chat ships |
| `ViewedAt` | `DateTime?` | `null` = unread; set to `UtcNow` when user opens match detail |
| `CreatedAt` | `DateTime` | |

When a `CharacterMatch` is created, two `MatchNotification` rows are inserted in the same transaction — one per user. Both start with `ViewedAt = null`.

The `Type` discriminator is intentional forward-planning for chat: a new chat message will insert a `NewMessage` notification for the recipient using the same table and viewed mechanic.

---

## 2. Real-Time Push (SignalR)

### Hub

A single `NotificationHub` is registered at `/hubs/notifications`. It is **push-only** — clients receive events but do not call hub methods.

### Authentication

JWT cannot be sent as a header on WebSocket connections. The token is passed via query string (`?access_token=...`). The `JwtBearer` middleware is configured via `OnMessageReceived` to read it from there. A custom `UserIdProvider` reads the `NameIdentifier` claim to map connections to user IDs, enabling `IHubContext.Clients.User(userId)` targeting.

### Match creation flow

After `CharacterInteractionService` inserts the `CharacterMatch` and both `MatchNotification` rows, it pushes to the recipient:

```csharp
await _hubContext.Clients.User(recipientUserId.ToString())
    .SendAsync("NewMatch", matchPayload);
```

The sender receives the same payload synchronously in the `POST /api/character-interactions` response. The existing `MatchResponse` DTO is replaced with a richer `MatchResultResponse` that includes character names and image URLs when `isMatch` is true — matching the hub push payload exactly. One payload shape, one notification component, two delivery paths.

### Payload shape (both sender response and hub push)

```json
{
  "matchId": "guid",
  "myCharacter": { "id": "guid", "name": "string", "imageUrl": "string?" },
  "theirCharacter": { "id": "guid", "name": "string", "imageUrl": "string?" },
  "gameName": "string",
  "matchedAt": "ISO8601"
}
```

### Connection lifecycle

The SignalR connection is created in `AuthContext` after login and stopped on logout. `withAutomaticReconnect()` handles transient disconnections. If the user is offline when a match is created, no push is sent — the unread state is recovered from the database on next load.

---

## 3. Badge Propagation

### Backend: augmented response fields

Existing API responses are extended with unread indicators computed from unviewed `MatchNotification` rows for the authenticated user:

| Endpoint | Change |
|---|---|
| `GET /api/user-games` | Each `UserGameResponse` gains `hasNewMatch: bool` — true if user has any unviewed `NewMatch` notification involving a character in that user game |
| `GET /api/characters` | Each `CharacterResponse` gains `hasNewMatch: bool` — true if user has an unviewed `NewMatch` notification for a match involving that character |
| `GET /api/character-matches` | Each `CharacterMatchDto` gains `isNew: bool` — derived from whether the user's `MatchNotification` row for that match has `ViewedAt = null` |

### New endpoint: mark as viewed

```
POST /api/match-notifications/{matchId}/viewed
```

Sets `ViewedAt = UtcNow` on the calling user's `MatchNotification` row for the given match. Returns `204 No Content`. Called by the frontend when the match detail panel opens.

### Frontend badge surfaces

1. **Realm cards (home page)** — badge on `RealmCard` when `hasNewMatch` is true  
2. **Games page** — badge on `GameCard` when `hasNewMatch` is true  
3. **Character in collection/realm** — "new match" indicator on character card  
4. **Match in collection gallery** — visual indicator (glow, badge, or highlight) on `MatchCard`

### Clearing state

When the user opens a match in the left panel of the Matches/Collection page, the frontend calls `POST /api/match-notifications/{matchId}/viewed`. On success, local state is updated to remove the `isNew` flag from that match — no full refetch. The upstream badge indicators (character, game, realm) are cleared by triggering a re-fetch of the affected endpoints (`/api/user-games`, `/api/characters`, `/api/character-matches`) or by updating the local state that holds those responses directly.

---

## 4. Notification Component

### Visual

A single `MatchNotificationToast` component used for both the sender's immediate display and the recipient's real-time push. It receives the match payload described in Section 2.

Layout: two full-art TCG cards side by side (your character left, their character right), a "It's a Match!" header, the game name, and a dismiss button. Card rendering follows the `partyup-tcg-cards` skill rules.

### Trigger paths

- **Sender:** The frontend detects `isMatch: true` in the `CharacterInteractionController` response and renders the component with the extended payload.
- **Recipient:** The SignalR `"NewMatch"` event handler renders the same component.

### State management

A `NotificationContext` holds a queue of pending match notifications. The component displays one at a time — if multiple arrive in quick succession they queue rather than stack. Dismissing one dequeues the next.

---

## 5. Error Handling

- If the `POST /api/match-notifications/{matchId}/viewed` call fails, the frontend retries once on the next open of that match detail. The badge persisting is a minor annoyance; data loss is not a concern.
- If the SignalR connection drops, `withAutomaticReconnect()` handles recovery. Missed pushes during disconnection are not replayed — the user sees correct "new" badge state from DB on next API call.
- `MatchNotification` rows are inserted in the same `SaveChangesAsync` call as the `CharacterMatch` — if the insert fails, no orphaned notifications are created.
