# Character Card Game Name — Design Spec

**Date:** 2026-05-29
**Status:** Approved

## Problem

Character cards don't show the game they belong to. When viewing a list of cards from different games, there's no way to identify the game at a glance. Game name is critical context for the face of the card.

Additionally, the current card header zone puts platform in the top-right, but the header right is reserved for character class (a future field). Platform should move to the subtitle zone.

## Design

### StandardTcgCard zone layout (after change)

```
┌──────────────────────────────────────────────┐
│ [Character Name]              [empty→class]  │  ← header
│ [Game Name] · [Platform]                     │  ← subtitle
├──────────────────────────────────────────────┤
│           [Image]                            │
├──────────────────────────────────────────────┤
│ [Role] [Rank] [Voice] [Region] [Language]    │  ← stats bar
├──────────────────────────────────────────────┤
│ [Bio]                                        │  ← text body
└──────────────────────────── [Rank/Level] ────┘
```

Changes from current layout:
- Header right: platform removed (reserved for class, TBD)
- Subtitle: `gameName · platform` (replaces `region · language`)
- Stats bar: adds region and first language badges alongside existing role/rank/voice

### Backend

**`CharacterResponse.cs`** — add two new fields:
```csharp
public string? GameName { get; set; }
public string? GameImageUrl { get; set; }
```

**`CharacterService.cs` `ToProjection()`** — extend the character projection to join through `UserGame.Game`:
```csharp
GameName = c.UserGame.Game.Name,
GameImageUrl = c.UserGame.Game.ImageUrl,
```
Same pattern already used in the discover endpoint's projection.

### Frontend type

**`characters.ts` `Character` type** — add:
```typescript
gameName?: string
gameImageUrl?: string
```

### CharacterCard.tsx

- Subtitle string: `[gameName] · [platform]` (filter nulls, join with ` · `)
- Pass `platform={undefined}` to `StandardTcgCard` (header right left empty for future class)
- Stats bar: keep existing role/rank/voice badges; add region badge and first-language badge when present

### CharacterDetailCard.tsx

- Same subtitle change: `gameName · platform`
- Header right: remove platform (or pass undefined), class slot reserved

### StandardTcgCard.tsx

- Make the `platform` prop optional (`platform?: string`) if it isn't already
- Render nothing in the header right when platform is undefined

### CharacterMiniCard.tsx

No changes — FullArtTcgCard, shows only name and image.

## Out of Scope

- Class field in header right — placeholder only for now; implemented when EVA field mapping lands
- `GameImageUrl` is added to the response for future use but not rendered on any card yet
- DiscoverCharacterResponse — already has game name; no backend change needed there
