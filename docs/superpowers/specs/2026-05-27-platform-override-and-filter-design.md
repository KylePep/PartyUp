# Platform Override & Discovery Filter Design

**Date:** 2026-05-27  
**Status:** Approved  

## Problem

Some games (e.g., The Elder Scrolls Online) only list PC and Mac as release platforms in RAWG, because those were the original platforms. However players have since joined on newer consoles (e.g., Xbox One X). The character creation form currently restricts platform selection to the game's RAWG list, making it impossible to represent a platform the user actually plays on.

Additionally, discovery filtering currently only supports AI-generated game field definitions — platform is not filterable at all.

---

## Goals

1. Let users override the platform when creating/editing a character — pick from a full list of popular platforms, not just what RAWG knows.
2. Add a platform multi-select filter in the discovery panel — pre-seeded with the game's known platforms and expandable to the full list.

---

## Shared Platform Constants

A new `ALL_PLATFORMS` constant is added to `apps/web/src/components/character-wizard/types.ts`, grouped by hardware family:

| Group | Platforms |
|---|---|
| PC / Desktop | PC (Windows), Mac, Linux, Steam Deck |
| Xbox | Xbox One, Xbox One S, Xbox One X, Xbox Series S, Xbox Series X |
| PlayStation | PS4, PS4 Pro, PS5, PS5 Pro |
| Nintendo | Nintendo Switch, Nintendo Switch Lite, Nintendo Switch OLED |
| Mobile | iOS, Android |

The existing `PLATFORMS` constant (`['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile']`) is kept as the fallback for games with no RAWG platform data.

`ALL_PLATFORMS` is used by both the character wizard and the discovery filter as a single source of truth.

---

## Part 1: Character Form — Platform Override

### Approach: Inline Expand

**File:** `apps/web/src/components/character-wizard/IdentityStep.tsx`

A local `showAllPlatforms: boolean` state defaults to `false`.

**Render order:**

1. **Primary toggle group** — game's RAWG platforms rendered as the existing single-select `ToggleButtonGroup`. For ESO this would be `["PC", "Mac"]`.

2. **Override badge** — if `data.platform` is set to a value NOT in the game's RAWG list (i.e., the user has picked an override), that platform renders as a lone selected-style button in the same row, keeping it visible even when the expander is collapsed.

3. **`+ Add platform` button** — small text button below the toggle group. Clicking toggles `showAllPlatforms`.

4. **Expanded section** (when `showAllPlatforms === true`) — a grouped inline grid of all platforms from `ALL_PLATFORMS`, excluding platforms already shown in the RAWG list above (no duplicates). Platforms are grouped under category labels (e.g., `XBOX`, `PLAYSTATION`). Clicking any button:
   - Sets it as `data.platform` (single-select; clears previous)
   - Sets `showAllPlatforms` to `false` (collapses the section)

**`canAdvance` is unchanged** — still requires `data.platform` to be non-empty.

No backend changes needed for character creation — `Platform` is already a plain string column on `Character`.

---

## Part 2: Discovery Filter — Platform Multi-Select

### State: DiscoveryPanel

**File:** `apps/web/src/components/DiscoveryPanel.tsx`

- Receives the game's RAWG platforms via its existing data path (`UserGameDetailResponse.platforms`).
- New state: `activePlatforms: string[]` — initializes to the game's RAWG platform list (e.g., `["PC", "Mac"]` for ESO). These are active from mount, so discovery starts filtered to the game's official platforms.
- `activePlatforms` is passed to `discoverCharacters` as repeated query params: `platform=PC&platform=Mac&platform=Xbox One X`.
- If `activePlatforms` is empty, no `platform` param is sent — returns all platforms.
- `activePlatforms` is included in the `useEffect` dependency array so the queue reloads on change.

### UI: DiscoveryFilters

**File:** `apps/web/src/components/DiscoveryFilters.tsx`

New props:
- `gamePlatforms: string[]` — the RAWG-known platforms, rendered as the primary toggle row
- `activePlatforms: string[]` — current active filter state
- `onPlatformChange: (platforms: string[]) => void`

**Render order in the filter panel (above AI field filters):**

1. **"PLATFORM" label** — same style as existing field labels.

2. **Game platform buttons** — one toggle button per RAWG platform, all initially active (highlighted). Clicking toggles a platform off/on in `activePlatforms`.

3. **Override badges** — any `activePlatforms` entry NOT in `gamePlatforms` renders as additional active buttons inline (so selected extras stay visible when the expander is collapsed).

4. **`Show more platforms ▾` / `Show less ▲` button** — toggles local `showAllPlatforms` state.

5. **Expanded section** (when open) — full `ALL_PLATFORMS` grouped list, excluding any platform already shown in the game row above. Each is a toggle button. Selecting adds to `activePlatforms`; deselecting removes it. Collapsing preserves selected state.

### API Call

**File:** `apps/web/src/api/endpoints/characters.ts`

`discoverCharacters` already passes filters as `URLSearchParams`. Update to append `platform` as repeated params:

```ts
function discoverCharacters(gameId: string, filters?: Record<string, string>, platforms?: string[]) {
  const qs = new URLSearchParams({ gameId, ...filters })
  platforms?.forEach(p => qs.append('platform', p))
  return apiGet<DiscoverCharacter[]>(`/characters/discover?${qs.toString()}`)
}
```

---

## Part 3: Backend — Platform Filtering

### Controller

**File:** `apps/api/Controllers/CharactersController.cs`

Extract `platform` query params separately before building the generic `filters` dictionary:

```csharp
var platformFilters = Request.Query["platform"].ToList();
var filters = Request.Query
  .Where(kv => kv.Key != "gameId" && kv.Key != "platform")
  .ToDictionary(kv => kv.Key, kv => kv.Value.ToString());
var result = await _characterService.DiscoverCharactersAsync(userId, gameId, filters, platformFilters);
```

### Service Interface

**File:** `apps/api/Services/Interfaces/ICharacterService.cs`

Add `platformFilters` param:
```csharp
Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(
  Guid userId, Guid gameId,
  Dictionary<string, string>? filters = null,
  List<string>? platformFilters = null);
```

### Service Implementation

**File:** `apps/api/Services/CharacterService.cs`

After the existing `alreadySeenIds` filter, before the AI field filters:

```csharp
if (platformFilters != null && platformFilters.Count > 0)
    query = query.Where(c => platformFilters.Contains(c.Platform));
```

This compiles to a SQL `IN` clause. **No migration needed** — `Platform` is an existing column on `Character`.

---

## Out of Scope

- No change to the `Character.Platform` data type — stays a single string.
- No platform validation on the API (any string is accepted; the frontend constrains choices).
- No platform display changes on `SwipeCard` or match views (platform is already shown there).
- No seeding changes.
