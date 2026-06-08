# Character Card Background Color

**Date:** 2026-06-08

## Summary

Allow users to choose a background color for their character card from a curated palette of 10–12 preset swatches, set during character creation/editing in the Identity step of the wizard. The color is stored on the character record and rendered wherever a card is displayed — including the discover/swipe flow so other users see it too.

## Decisions

- **Storage format:** Hex string (e.g. `#1a2b3c`), nullable, no DB-level default.
- **Null handling:** Null/empty = use `var(--color-surface)`, the existing card background. No existing cards break.
- **Palette:** 10–12 fixed swatches defined as a frontend constant. No free-form color input.
- **Placement:** Identity step, below the character image section.
- **Deselection:** Clicking the active swatch deselects it (reverts to default).

## Backend Changes

### `Character.cs`
Add:
```csharp
[MaxLength(7)]
public string? CardBackgroundColor { get; set; }
```

### DTOs
Add `[MaxLength(7)] public string? CardBackgroundColor { get; set; }` to:
- `CreateCharacterRequest`
- `UpdateCharacterRequest`
- `CharacterResponse`
- `DiscoverCharacterResponse`

### `CharacterService.cs`
- Pass `CardBackgroundColor` through in `CreateCharacterAsync`
- Pass `CardBackgroundColor` through in `UpdateCharacterAsync`
- Include `CardBackgroundColor` in `ToProjection()`
- Include `CardBackgroundColor` in the inline `DiscoverCharacterResponse` projection inside `DiscoverCharactersAsync`

### Migration
Add a nullable `card_background_color` column (varchar 7) to the `Characters` table. No default value at DB level.

## Frontend Changes

### `characters.ts`
Add `cardBackgroundColor?: string` to:
- `Character`
- `CharacterCreate`
- `CharacterUpdate`
- `DiscoverCharacter`

### `types.ts`
- Add `cardBackgroundColor: string` to `CharacterFormData`
- Default: `''` (empty string = no selection)
- Add `cardBackgroundColor: ''` to `defaultFormData`
- Map `cardBackgroundColor: c.cardBackgroundColor ?? ''` in `characterToFormData`

### `IdentityStep.tsx`
Add a "Card Color" section below the image upload:
- Define a `CARD_COLORS` constant: array of 10–12 hex strings covering a range of dark/vibrant tones that suit the app's aesthetic
- Render swatches as small colored buttons in a flex row
- Selected swatch gets a visible ring (e.g. `ring-2 ring-white`)
- Clicking the active swatch deselects (`onChange({ cardBackgroundColor: '' })`)
- Clicking any other swatch sets it

### `CreateCharacterWizard.tsx`
- Include `cardBackgroundColor: data.cardBackgroundColor || undefined` in payload for both `createCharacter` and `updateCharacter`

### `StandardTcgCard.tsx`
- Add `cardBackgroundColor?: string` prop
- In the outer `style`, replace `backgroundColor: 'var(--color-surface)'` with `backgroundColor: cardBackgroundColor || 'var(--color-surface)'`

### `CharacterCard.tsx`
- Pass `cardBackgroundColor={character.cardBackgroundColor}` to `<StandardTcgCard>`

### Other card components
Thread `cardBackgroundColor` through in:
- `CharacterDetailCard.tsx`
- `CharacterMiniCard.tsx`
- `MatchCharacterDetail.tsx`

Each receives a `Character` or `DiscoverCharacter` object where the field will now be available.

## Out of Scope

- Free-form color input
- Per-user theme settings
- Backend validation of hex values against the allowed palette (the frontend controls the palette; max-length constraint is sufficient)
