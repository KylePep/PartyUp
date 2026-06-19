# Sticker Messaging Feature — Design Spec
Date: 2026-06-19

## Overview

Add a sticker-only messaging channel between matched characters. From the Collections/Matches page, when a character match is selected, a button in the left panel header lets the user toggle between the existing character detail view and a new sticker chat view. Stickers are emoji-only (gaming and positivity themed). Messages are delivered in real-time via the existing SignalR hub and persisted in the database. A lightweight toast notification alerts the recipient when a sticker arrives.

---

## Scope and Constraints

- Stickers are emoji only — no free-text messages.
- Each sticker conversation is scoped to a specific `CharacterMatch` — two users with multiple matches across different games have separate threads per match.
- No read receipts beyond the existing `MatchNotification` viewed-tracking already in place.
- No message deletion, editing, or reactions.
- Conflict resolution for out-of-order messages (due to latency) is handled by a page refresh — no deduplication logic required.

---

## Backend

### Data Model

New EF Core entity and `DbSet`:

```csharp
public class StickerMessage
{
    public Guid Id { get; set; }
    public Guid MatchId { get; set; }
    public CharacterMatch Match { get; set; }
    public Guid SenderCharacterId { get; set; }
    public Character SenderCharacter { get; set; }
    public string Emoji { get; set; }
    public DateTime SentAt { get; set; }
}
```

- `MatchId` is indexed for efficient history queries.
- `SenderCharacterId` FK to `Characters` — allows the frontend to determine alignment (mine vs theirs) by comparing against the current user's character in the match.

EF migration required to add the `StickerMessages` table.

### Service: `IStickerMessageService` / `StickerMessageService`

**`GetByMatchAsync(Guid matchId, Guid userId)`**
Verifies the requesting user is a participant in the match (via CharacterA or CharacterB → UserGame → UserId). Returns all messages for that match ordered by `SentAt` ascending as `StickerMessageDto`.

**`SendAsync(Guid matchId, Guid senderCharacterId, string emoji)`**
Saves the new `StickerMessage`, identifies the recipient user ID from the match, and fires the `"NewSticker"` SignalR event to the recipient via `IHubContext<NotificationHub>`.

### DTO

```csharp
public class StickerMessageDto
{
    public Guid Id { get; set; }
    public Guid MatchId { get; set; }
    public Guid SenderCharacterId { get; set; }
    public string Emoji { get; set; }
    public DateTime SentAt { get; set; }
}
```

### Controller: `StickerMessagesController`

Both endpoints require authentication.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sticker-messages/{matchId}` | Returns `StickerMessageDto[]` for the match, ordered ascending by `SentAt`. Returns 403 if the user is not a participant. |
| POST | `/api/sticker-messages/{matchId}` | Body: `{ "emoji": "🎮" }`. Saves message, fires SignalR event to recipient, returns the new `StickerMessageDto`. |

### SignalR Event

Event name: `"NewSticker"`

Fired via the **existing** `NotificationHub` — no new hub. Sent to the recipient user only (not the sender, who already has the DTO from the POST response).

Payload shape (matches `StickerMessageDto` plus `matchId`):
```json
{
  "matchId": "...",
  "id": "...",
  "senderCharacterId": "...",
  "emoji": "🎮",
  "sentAt": "2026-06-19T12:00:00Z"
}
```

---

## Frontend

### State Architecture

**`StickerContext`** (new, follows `NotificationContext` pattern)
- Stores incoming real-time sticker payloads keyed by `matchId`.
- Exposes `pushSticker(payload)` called by `AuthContext` when `"NewSticker"` SignalR event fires.
- Exposes `incomingStickers: StickerMessageDto[]` — a flat list of all real-time stickers received this session. The sticker chat hook filters this by `matchId` reactively via `useEffect`.

**`AuthContext` change**
Register a `"NewSticker"` handler alongside the existing `"NewMatch"` handler:
- Calls `pushSticker(payload)` on `StickerContext`.
- Calls the small toast notification (see below).

### API Endpoints

New file: `apps/web/src/api/endpoints/stickerMessages.ts`

```ts
getByMatch(matchId: string): Promise<StickerMessageDto[]>
send(matchId: string, emoji: string): Promise<StickerMessageDto>
```

### Hook: `useStickerMessages(matchId)`

- On mount: fetches history via `getByMatch`.
- Watches `StickerContext.incomingStickers` via `useEffect`; when a new entry arrives for this `matchId`, appends it to local message state.
- `send(emoji)`: calls `stickerMessages.send()`, appends the returned DTO to local state on success.
- Returns `{ messages, send, loading }`.

### MatchesPage Changes

- Add `view: 'detail' | 'chat'` state (default `'detail'`).
- Selecting a different match resets `view` to `'detail'`.
- When `selected !== null`, the left panel header renders a small icon button (speech bubble) that toggles `view`.
- Left panel renders `CharacterDetailCard` when `view === 'detail'`, or `StickerChatView` when `view === 'chat'`.

### New Components

**`StickerChatView`**
The left panel content when in chat mode. Three vertically stacked zones:
- Scrollable message history (grows to fill available space, auto-scrolls to bottom on new message).
- `StickerPalette` fixed at the bottom.

**Sticker bubble alignment:** `senderCharacterId === myCharacter.id` → right-aligned. Otherwise → left-aligned. Each bubble shows the emoji large with a small timestamp below.

**`StickerPalette`**
Fixed grid of 24 emoji buttons. Clicking a button calls `send(emoji)`. Palette is disabled while a send is in-flight.

Emoji set:
```
🎮 🕹️ 🎯 🏆 ⚔️ 🛡️ 💥 🔥
⭐ 🌟 👑 🎉 🙌 💪 👍 🤘
💯 😄 😎 🥳 😈 🤝 👏 🫡
```

**`StickerToast`**
Small non-blocking banner notification. Separate from the existing full-screen `MatchNotificationToast`.
- Slides in from the top of the screen.
- Shows: "[SenderCharacterName] sent you a sticker: [emoji]"
- Auto-dismisses after 4 seconds. Can be manually dismissed.
- Fires whenever `"NewSticker"` is received, regardless of whether the sticker chat is currently open.
- Managed via a lightweight queue in `StickerContext` (same pattern as `NotificationContext`).

---

## Data Flow Summary

**Sending:**
1. User taps emoji in `StickerPalette`.
2. `useStickerMessages.send()` calls POST `/api/sticker-messages/{matchId}`.
3. On success: returned `StickerMessageDto` appended to sender's local message list.
4. Backend: saves `StickerMessage`, fires `"NewSticker"` SignalR event to recipient.

**Receiving:**
1. SignalR `"NewSticker"` event arrives at recipient's `AuthContext` handler.
2. `pushSticker(payload)` called on `StickerContext`.
3. If sticker chat for that `matchId` is open: `useStickerMessages` picks up the new message and appends it to the visible list.
4. `StickerToast` fires regardless (character name + emoji).

**Conflict handling:**
If messages arrive out of order due to latency, a page refresh reloads the full history in `SentAt` ascending order, resolving the display.

---

## Files Touched

### New (Backend)
- `apps/api/Models/StickerMessage.cs`
- `apps/api/Models/DTOs/StickerMessage/StickerMessageDto.cs`
- `apps/api/Services/IStickerMessageService.cs`
- `apps/api/Services/StickerMessageService.cs`
- `apps/api/Controllers/StickerMessagesController.cs`
- EF migration for `StickerMessages` table

### Modified (Backend)
- `apps/api/Infrastructure/Data/DbContext.cs` — add `DbSet<StickerMessage>`

### New (Frontend)
- `apps/web/src/api/endpoints/stickerMessages.ts`
- `apps/web/src/context/StickerContext.tsx`
- `apps/web/src/hooks/useStickerMessages.ts`
- `apps/web/src/components/stickers/StickerChatView.tsx`
- `apps/web/src/components/stickers/StickerPalette.tsx`
- `apps/web/src/components/stickers/StickerToast.tsx`

### Modified (Frontend)
- `apps/web/src/context/AuthContext.tsx` — register `"NewSticker"` handler
- `apps/web/src/pages/MatchesPage.tsx` — add `view` state, toggle button, conditional render
