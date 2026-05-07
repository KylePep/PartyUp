# Design: Matches, Characters Navigation & Realm Tabs

**Date:** 2026-05-06  
**Branch:** `feat-matches-characters-nav` (create before implementation)

---

## Overview

Five related changes that add a Matches page, surface matches on the RealmPage, style the CharactersPage, and wire up navigation to both pages.

---

## 1. Backend: `GET /api/character-matches`

### Endpoint

`GET /api/character-matches?gameId={optional}`

- Requires JWT authentication (`[Authorize]`).
- Returns all `CharacterMatch` rows where either `CharacterAId` or `CharacterBId` belongs to a character owned by the authenticated user.
- When `gameId` is supplied, filters to matches where the user's character belongs to that game (via `Character → UserGame → Game`).

### Response DTO — `CharacterMatchDto`

```csharp
public class CharacterMatchDto
{
    public Guid MatchId { get; set; }
    public DateTime MatchedAt { get; set; }
    public CharacterSummaryDto MyCharacter { get; set; }
    public CharacterSummaryDto TheirCharacter { get; set; }
    public Guid GameId { get; set; }
    public string GameName { get; set; }
}

public class CharacterSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? Bio { get; set; }
    public string? Playstyle { get; set; }
    public string? Rank { get; set; }
    public string? Region { get; set; }
}
```

The service resolves "mine vs theirs" by checking which character's `UserGame.UserId` matches the authenticated user — so the frontend always receives a consistent `myCharacter` / `theirCharacter` shape regardless of GUID ordering in the `CharacterMatch` table.

### New files

- `Controllers/CharacterMatchesController.cs` — thin controller, delegates to service
- `Services/ICharacterMatchService.cs` — interface
- `Services/CharacterMatchService.cs` — implementation (EF Core query with optional gameId filter)
- `Models/DTOs/CharacterMatchDto.cs` — response shape above

### Registration

Register `ICharacterMatchService` / `CharacterMatchService` in `Program.cs` alongside other service registrations.

---

## 2. Frontend: API layer & hook

### `src/api/endpoints/matches.ts` (new file)

```typescript
export type CharacterSummary = {
  id: string; name: string; bio?: string;
  playstyle?: string; rank?: string; region?: string;
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

Remove the existing stub `getMatches()` from `src/api/endpoints/characters.ts`.

### `src/hooks/useMatches.ts` (new file)

Same pattern as `useCharacters` — fetches on mount, returns `{ data, loading }`. Accepts an optional `gameId` parameter.

---

## 3. Frontend: New components

### `src/components/cards/MatchCard.tsx`

Displays **only** the matched (other) person's character. Styled to match the existing `CharacterCard` aesthetic (dark background, `border-brand-neon/20`, font-mono tags for playstyle/rank/region). Shows a small `MATCH` label in brand-pink at the top instead of `ACTIVE`.

No edit link — this is a read-only view of another user's character.

---

## 4. Frontend: MatchesPage

**Route:** `/matches`  
**File:** `src/pages/MatchesPage.tsx`

### Layout

Groups matches by `gameId`, then by `myCharacter.id`:

```
[Game Name — e.g. "Elder Scrolls Online"]
  [CharacterCard — your wizard]  [MatchCard]  [MatchCard]  ...
  [CharacterCard — your rogue]   [MatchCard]  ...

[Game Name — e.g. "Lost Ark"]
  [CharacterCard — your berserker]  [MatchCard]  ...
```

`CharacterCard` is reused as-is on the left (requires a `gameId` prop — derived from the match's `gameId`). `MatchCard` renders each matched character to the right in a horizontal scrolling row.

### Styling

Matches the site's dark theme:
- Page padded with `px-6 md:px-10 py-10 max-w-7xl mx-auto`
- Game section headers in `font-display font-black uppercase` with a `border-b border-brand-border` separator
- Character rows use `flex items-start gap-4 overflow-x-auto pb-4`
- Empty state: centered message "No matches yet — start swiping in your Realms."

---

## 5. Frontend: RealmPage tabs

Add a tab bar between `GameBanner` and the `<main>` content area. Two tabs: **Discover** and **Matches**.

```
[ Discover ]  [ Matches ]
```

Active tab styled with `border-b-2 border-brand-neon text-brand-neon`, inactive with `text-brand-muted`.

- **Discover tab** — existing `CharacterPanel` + `DiscoveryPanel` grid (no change to logic)
- **Matches tab** — calls `useMatches(gameId)`, groups results by `myCharacter.id`, and renders one `CharacterCard` (left) + `MatchCard` row (right) per character. No game-section header — `GameBanner` already provides that context. Empty state: "No matches yet for this realm."

State: `const [tab, setTab] = useState<"discover" | "matches">("discover")`

---

## 6. Frontend: CharactersPage styling

Apply consistent page layout to `src/pages/CharacterPage.tsx`:
- Wrap in `<div className="px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">`
- Game section headers: `font-display font-black text-2xl uppercase tracking-wide mb-4` with `border-b border-brand-border pb-2 mb-6`
- Loading state: replace bare `<div>Loading...</div>` with the existing `<FullScreenStatus type="loading" />` pattern

---

## 7. Frontend: Navigation

### `src/App.tsx`

Add `/matches` route inside the `<SignedInLayout />` wrapper:
```tsx
<Route path="/matches" element={<MatchesPage />} />
```

### `src/components/layout/SignedInLayout.tsx`

Add nav links for **Characters** (`/characters`) and **Matches** (`/matches`) to the `rightSlot` of `NavBar`, before the username span. Style to match the existing `← Hub` link pattern: `font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200`.

---

## Implementation Order

1. Create branch `feat-matches-characters-nav`
2. Backend: DTO → Service interface → Service implementation → Controller → register in Program.cs → commit
3. Frontend API layer: `matches.ts`, `useMatches.ts`, remove stub from `characters.ts` → commit
4. `MatchCard` component → commit
5. `MatchesPage` + route in `App.tsx` → commit
6. `RealmPage` tabs → commit
7. `CharactersPage` styling → commit
8. `SignedInLayout` nav links → commit
