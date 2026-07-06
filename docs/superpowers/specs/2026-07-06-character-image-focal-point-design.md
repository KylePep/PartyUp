# Character Image Focal Point — Design

## Problem

Character card images are always rendered with `object-cover` and an implicit center crop. When a character's photo has its subject off-center (e.g. face near the top of the frame), the crop reliably cuts it off. Cropping itself is out of scope — this only lets the user choose *where* the crop centers.

## Data model

Add two nullable percentage fields to `Character`:

- `ImageFocalX` (`int?`, 0–100)
- `ImageFocalY` (`int?`, 0–100)

`null` on either field means "center" (50/50) — existing characters render exactly as they do today with no backfill/migration of data required, only a schema migration to add the columns.

These map directly to CSS `object-position: {x}% {y}%`, so no translation layer is needed between stored value and render.

The UI only exposes 9 discrete combinations (a 3×3 grid: `{0, 50, 100} × {0, 50, 100}`), but storing raw x/y percentages (rather than a 9-value enum) leaves room for finer-grained control later without another schema change.

## Backend changes

- `Models/Character.cs` — add `ImageFocalX`, `ImageFocalY` (`int?`)
- `Models/DTOs/Character/CreateCharacterRequest.cs` — add `ImageFocalX`, `ImageFocalY` (`int?`, `[Range(0,100)]`)
- `Models/DTOs/Character/UpdateCharacterRequest.cs` — same two fields
- `Models/DTOs/Character/CharacterResponse.cs` — add the two fields
- `Models/DTOs/Character/DiscoverCharacterResponse.cs` — add the two fields
- `Services/CharacterService.cs` — map the two fields through on create, update, and both response projections (the character-detail projection and the discover-feed projection)
- New EF Core migration: `AddCharacterImageFocalPoint`

## Frontend changes

### Types
- `api/endpoints/characters.ts` — add `imageFocalX?: number`, `imageFocalY?: number` to `Character`, `CharacterCreate`, `CharacterUpdate`, `DiscoverCharacter`
- `character-wizard/types.ts` — `CharacterFormData` gets `imageFocalX: number`, `imageFocalY: number` (default `50`); `characterToFormData` maps `c.imageFocalX ?? 50` / `c.imageFocalY ?? 50`

### New component: `ImageOriginPicker`
Location: `components/character-wizard/ImageOriginPicker.tsx`.

Props: current preview image URL (or none), current `focalX`/`focalY`, `onChange(x, y)`.

Layout: preview box on the left, 3×3 button grid on the right (matches the layout described by the user: preview underneath the upload button/URL field, grid next to the preview).

- Preview box: `aspect-4/2`, same crop shape as the card's image zone, `object-cover` + `object-position` driven by the current `focalX/focalY`. Empty state (no image yet) matches the existing dark placeholder styling used elsewhere in the app.
- Grid: 9 small square buttons in a 3×3 layout, each bound to one `{x, y}` pair. The active button gets the same `ring-2 ring-white ring-offset-2 ring-offset-surface` highlight style already used by the card-color swatches in `IdentityStep.tsx`. Center is selected by default.

### `IdentityStep.tsx`
Replace the current inline `<img>` preview under the upload/URL controls with `ImageOriginPicker`, wired to `onChange({ imageFocalX, imageFocalY })`.

### `CreateCharacterWizard.tsx`
Include `imageFocalX`/`imageFocalY` in both the create and update payloads.

### Card rendering
- `components/cards/StandardTcgCard.tsx` — accept `imageFocalX?`, `imageFocalY?` props (default 50/50 if omitted), apply as inline `style={{ objectPosition: '${x}% ${y}%' }}` on the image-zone `<img>`
- `components/cards/FullArtTcgCard.tsx` — same two props, same style application on its background `<img>`
- Wrapper cards that forward a `Character` into one of the two bases — `CharacterCard`, `MatchCard`, `SwipeCard`, `PendingLikeCard`, `CharacterMiniCard`, `CollectionCard` — pass `imageFocalX={character.imageFocalX}` / `imageFocalY={character.imageFocalY}` through
- `CharacterDetailCard.tsx` and `MatchCharacterDetail.tsx` render character images via a raw `<img className="object-cover">` outside the shared card-base system (a pre-existing deviation from the TCG card design system, not something this change fixes). Apply the same inline `objectPosition` style directly to these two so the focal point isn't silently ignored on detail views.

## Out of scope

- Actual cropping/resizing of the uploaded image file
- Free-form (drag-to-position) focal point selection — only the 9-point grid
- Fixing the `CharacterDetailCard`/`MatchCharacterDetail` deviation from the shared card-base components
