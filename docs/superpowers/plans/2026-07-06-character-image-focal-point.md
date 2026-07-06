# Character Image Focal Point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick which part of their character image (9-point grid: top/center/bottom × left/center/right) stays in frame when the image is cropped by `object-cover` on cards, and apply that choice everywhere a character image renders.

**Architecture:** Two nullable percentage columns (`ImageFocalX`, `ImageFocalY`, 0–100) on `Character`, threaded through every DTO/projection that carries `ImageUrl`, then applied client-side as CSS `object-position`. A new `ImageOriginPicker` component (preview + 3×3 button grid) replaces the static image preview in the character wizard's Identity step.

**Tech Stack:** ASP.NET Core 8 / EF Core / PostgreSQL (backend), React + TypeScript + Vite + Tailwind (frontend), xUnit + WebApplicationFactory (integration tests).

## Global Constraints

- Null `ImageFocalX`/`ImageFocalY` means center (50/50) — do not backfill existing rows; render-time fallback only.
- Only 9 discrete values are exposed in the UI: `x, y ∈ {0, 50, 100}`. Store as raw percentages, not an enum.
- `docker compose up -d` must be running before `dotnet ef database update` or `dotnet test` (tests hit a real Postgres DB, no mocking — see CLAUDE.md).
- Do not touch `MatchCharacterDetail.tsx` / `CharacterSummary` (matches.ts) — grep confirms this component has no import sites anywhere in `apps/web/src`; it's dead code and wiring focal data through it is unnecessary scope.
- Follow the PartyUp TCG card rules: `StandardTcgCard` and `FullArtTcgCard` own their own styling; wrapper components only pass data through, never override card visuals via `className`.

---

### Task 1: Add focal point columns to the `Character` entity

**Files:**
- Modify: `apps/api/Models/Character.cs`
- Create: EF migration (generated, path determined by `dotnet ef migrations add`)

**Interfaces:**
- Produces: `Character.ImageFocalX` (`int?`), `Character.ImageFocalY` (`int?`) — consumed by Task 2's DTOs and Task 3's service mapping.

- [ ] **Step 1: Add the two properties to the entity**

In `apps/api/Models/Character.cs`, add after the existing `CardBackgroundColor` property (currently line 42):

```csharp
  [MaxLength(7)]
  public string? CardBackgroundColor { get; set; }

  public int? ImageFocalX { get; set; }
  public int? ImageFocalY { get; set; }
```

- [ ] **Step 2: Generate the EF Core migration**

Run:
```bash
dotnet ef migrations add AddCharacterImageFocalPoint --project apps/api
```
Expected: two new files appear under `apps/api/Migrations/` (e.g. `<timestamp>_AddCharacterImageFocalPoint.cs` and `.Designer.cs`), and `AppDbContextModelSnapshot.cs` is updated to include `ImageFocalX`/`ImageFocalY` on the `Character` entity.

- [ ] **Step 3: Apply the migration to the local dev database**

Run (make sure `docker compose up -d` has been run first so Postgres is reachable):
```bash
dotnet ef database update --project apps/api
```
Expected: command completes with `Done.` and no errors.

- [ ] **Step 4: Verify the API still builds**

Run:
```bash
dotnet build apps/api
```
Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```bash
git add apps/api/Models/Character.cs apps/api/Migrations/
git commit -m "feat: add ImageFocalX/ImageFocalY columns to Character"
```

---

### Task 2: Thread focal point fields through backend DTOs

**Files:**
- Modify: `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs`
- Modify: `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs`
- Modify: `apps/api/Models/DTOs/Character/CharacterResponse.cs`
- Modify: `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs`
- Modify: `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs`

**Interfaces:**
- Consumes: `Character.ImageFocalX`/`ImageFocalY` from Task 1.
- Produces: `ImageFocalX`/`ImageFocalY` (`int?`) on `CreateCharacterRequest`, `UpdateCharacterRequest`, `CharacterResponse`, `DiscoverCharacterResponse`, `CharacterSummaryDto` — consumed by Task 3's service mapping.

- [ ] **Step 1: Add fields to `CreateCharacterRequest`**

In `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs`, add after `CardBackgroundColor` (currently line 41):

```csharp
    [StringLength(7)]
    public string? CardBackgroundColor { get; set; }

    [Range(0, 100)]
    public int? ImageFocalX { get; set; }

    [Range(0, 100)]
    public int? ImageFocalY { get; set; }
```

- [ ] **Step 2: Add fields to `UpdateCharacterRequest`**

In `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs`, add after `CardBackgroundColor` (currently line 36):

```csharp
  [StringLength(7)]
  public string? CardBackgroundColor { get; set; }

  [Range(0, 100)]
  public int? ImageFocalX { get; set; }

  [Range(0, 100)]
  public int? ImageFocalY { get; set; }
```

- [ ] **Step 3: Add fields to `CharacterResponse`**

In `apps/api/Models/DTOs/Character/CharacterResponse.cs`, add after `CardBackgroundColor` (currently line 19):

```csharp
  public string? CardBackgroundColor { get; set; }
  public int? ImageFocalX { get; set; }
  public int? ImageFocalY { get; set; }
```

- [ ] **Step 4: Add fields to `DiscoverCharacterResponse`**

In `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs`, add after `CardBackgroundColor` (currently line 13):

```csharp
  public string? CardBackgroundColor { get; set; }
  public int? ImageFocalX { get; set; }
  public int? ImageFocalY { get; set; }
```

- [ ] **Step 5: Add fields to `CharacterSummaryDto`**

In `apps/api/Models/DTOs/CharacterMatch/CharacterMatchDto.cs`, `CharacterSummaryDto` is used for the "my character" side of a match (rendered by `CharacterMiniCard`, which needs the focal point too). Update the class (currently lines 18–23):

```csharp
public class CharacterSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? ImageUrl { get; set; }
    public int? ImageFocalX { get; set; }
    public int? ImageFocalY { get; set; }
}
```

- [ ] **Step 6: Verify the API builds**

Run:
```bash
dotnet build apps/api
```
Expected: `Build succeeded.` (new properties are unused so far — this just confirms no syntax errors.)

- [ ] **Step 7: Commit**

```bash
git add apps/api/Models/DTOs/
git commit -m "feat: add ImageFocalX/ImageFocalY to character DTOs"
```

---

### Task 3: Map focal point through services and cover with integration tests

**Files:**
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/api/Services/CharacterMatchService.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterUpdateDeleteTests.cs`

**Interfaces:**
- Consumes: DTO fields from Task 2.
- Produces: working create/update/read round-trip for `ImageFocalX`/`ImageFocalY` via `/api/characters`, `/api/characters/discover`, and `/api/character-matches` — this is what the frontend (Tasks 4–6) will call.

- [ ] **Step 1: Map the fields in `CharacterService.CreateCharacterAsync`**

In `apps/api/Services/CharacterService.cs`, in the `character` object built inside `CreateCharacterAsync` (currently lines 34–49), add after `CardBackgroundColor = request.CardBackgroundColor,`:

```csharp
      CardBackgroundColor = request.CardBackgroundColor,
      ImageFocalX = request.ImageFocalX,
      ImageFocalY = request.ImageFocalY,
```

- [ ] **Step 2: Map the fields in `CharacterService.UpdateCharacterAsync`**

In the same file, in `UpdateCharacterAsync` (currently lines 231–241), add after `character.CardBackgroundColor = request.CardBackgroundColor;`:

```csharp
    character.CardBackgroundColor = request.CardBackgroundColor;
    character.ImageFocalX = request.ImageFocalX;
    character.ImageFocalY = request.ImageFocalY;
```

- [ ] **Step 3: Map the fields in the `DiscoverCharactersAsync` projection**

In the same file, inside the `DiscoverCharacterResponse` projection in `DiscoverCharactersAsync` (currently around line 191), add after `CardBackgroundColor = c.CardBackgroundColor,`:

```csharp
        CardBackgroundColor = c.CardBackgroundColor,
        ImageFocalX = c.ImageFocalX,
        ImageFocalY = c.ImageFocalY,
```

- [ ] **Step 4: Map the fields in `ToProjection()` (the shared `CharacterResponse` projection)**

In the same file, in the private `ToProjection()` expression (currently around line 300), add after `CardBackgroundColor = c.CardBackgroundColor,`:

```csharp
      CardBackgroundColor = c.CardBackgroundColor,
      ImageFocalX = c.ImageFocalX,
      ImageFocalY = c.ImageFocalY,
```

- [ ] **Step 5: Map the fields in `CharacterMatchService`**

In `apps/api/Services/CharacterMatchService.cs`, update both mapping helpers (currently lines 137–171):

```csharp
    private static CharacterSummaryDto ToSummary(Character c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        ImageUrl = c.ImageUrl,
        ImageFocalX = c.ImageFocalX,
        ImageFocalY = c.ImageFocalY,
    };

    private static CharacterResponse ToProjection(Character c) => new()
    {
        Id = c.Id,
        UserGameId = c.UserGameId,
        Platform = c.Platform,
        PlatformHandle = c.PlatformHandle,
        Name = c.Name,
        ImageUrl = c.ImageUrl,
        Bio = c.Bio,
        TimeZone = c.TimeZone,
        ActiveTimes = c.ActiveTimes,
        UsesVoiceChat = c.UsesVoiceChat,
        Languages = c.Languages,
        AdditionalNotes = c.AdditionalNotes,
        CardBackgroundColor = c.CardBackgroundColor,
        ImageFocalX = c.ImageFocalX,
        ImageFocalY = c.ImageFocalY,
        GameName = c.UserGame.Game.Name,
        GameImageUrl = c.UserGame.Game.ImageUrl,
        CreatedAt = c.CreatedAt,
        GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
        {
            FieldDefinitionId = fv.FieldDefinitionId,
            Key = fv.FieldDefinition.Key,
            Label = fv.FieldDefinition.Label,
            Value = fv.Value,
            Type = fv.FieldDefinition.Type.ToString(),
            CommonField = fv.FieldDefinition.CommonField
        }).ToList(),
    };
```

- [ ] **Step 6: Write the failing create/update round-trip test**

Add to `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`, alongside the existing `CreateCharacter_WithCardBackgroundColor_RoundtripsValue` test (near line 311), add:

```csharp
    [Fact]
    public async Task CreateCharacter_WithImageFocalPoint_RoundtripsValue()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Focal Character",
            platform = "PC",
            platformHandle = "FocalHandle",
            userGameId = userGame.Id,
            imageFocalX = 0,
            imageFocalY = 100
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterWithFocalDto>>("/api/characters");
        all!.Items.Should().ContainSingle(c =>
            c.Name == "Focal Character" &&
            c.ImageFocalX == 0 &&
            c.ImageFocalY == 100);
    }

    [Fact]
    public async Task CreateCharacter_WithoutImageFocalPoint_ReturnsNull()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Default Focal Character",
            platform = "PC",
            platformHandle = "DefaultFocalHandle",
            userGameId = userGame.Id
        });

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterWithFocalDto>>("/api/characters");
        all!.Items.Should().ContainSingle(c =>
            c.Name == "Default Focal Character" &&
            c.ImageFocalX == null &&
            c.ImageFocalY == null);
    }
```

Add the matching record near the other `private record` declarations at the bottom of the file (near line 400):

```csharp
    private record CharacterWithFocalDto(Guid Id, string Name, int? ImageFocalX, int? ImageFocalY);
```

- [ ] **Step 7: Run the new tests and confirm they pass**

Ensure Postgres is up (`docker compose up -d`), then run:
```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CreateCharacter_WithImageFocalPoint_RoundtripsValue|FullyQualifiedName~CreateCharacter_WithoutImageFocalPoint_ReturnsNull"
```
Expected: both tests pass (they exercise code already wired in Steps 1–4, so this confirms the mapping works rather than a red/green TDD cycle).

- [ ] **Step 8: Write the update round-trip test**

Add to `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterUpdateDeleteTests.cs`, alongside `UpdateCharacter_PersistsChanges` (near line 30):

```csharp
    [Fact]
    public async Task UpdateCharacter_WithImageFocalPoint_PersistsChange()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var character = await CreateCharacterAsync(client, userGame.Id);

        await client.PutAsJsonAsync(
            $"/api/characters/{userGame.Id}/{character.Id}",
            new { name = "Focal Update", imageFocalX = 100, imageFocalY = 0 });

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterWithFocalDto>>("/api/characters");
        all!.Items.Should().ContainSingle(c =>
            c.Name == "Focal Update" &&
            c.ImageFocalX == 100 &&
            c.ImageFocalY == 0);
    }
```

Add the matching record near the other `private record` declarations at the bottom of the file (near line 169):

```csharp
    private record CharacterWithFocalDto(Guid Id, string Name, int? ImageFocalX, int? ImageFocalY);
```

- [ ] **Step 9: Run the full character test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~Characters"
```
Expected: all tests pass, including the 3 new ones.

- [ ] **Step 10: Commit**

```bash
git add apps/api/Services/ apps/tests/PartyUp.Api.Tests/Features/Characters/
git commit -m "feat: map ImageFocalX/ImageFocalY through character services with test coverage"
```

---

### Task 4: Frontend type definitions

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`
- Modify: `apps/web/src/api/endpoints/matches.ts`
- Modify: `apps/web/src/components/character-wizard/types.ts`

**Interfaces:**
- Consumes: backend response shape from Task 3 (fields are additive/optional, so no runtime break even before this task ships).
- Produces: `imageFocalX?: number`, `imageFocalY?: number` on `Character`, `CharacterCreate`, `CharacterUpdate`, `DiscoverCharacter`, `MyCharacterSummary`; `imageFocalX: number`, `imageFocalY: number` (non-optional, defaulted to `50`) on `CharacterFormData` — consumed by Task 5 and Task 6.

- [ ] **Step 1: Add fields to `characters.ts` types**

In `apps/web/src/api/endpoints/characters.ts`, add `imageFocalX?: number;` and `imageFocalY?: number;` after every `cardBackgroundColor?: string;` line in the `Character`, `CharacterCreate`, `CharacterUpdate`, and `DiscoverCharacter` type definitions (4 occurrences total, currently lines 29, 47, 67, 82). Example for `Character` (currently lines 13–33):

```typescript
export type Character = {
  id: string;
  userGameId?: string;
  gameId?: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  additionalNotes?: string;
  gameName?: string;
  gameImageUrl?: string;
  cardBackgroundColor?: string;
  imageFocalX?: number;
  imageFocalY?: number;
  gameFields: CharacterGameField[];
  hasNewMatch?: boolean;
  createdAt?: string;
};
```

Apply the same `imageFocalX?: number; imageFocalY?: number;` addition (right after `cardBackgroundColor?: string;`) to `CharacterCreate`, `CharacterUpdate`, and `DiscoverCharacter`.

- [ ] **Step 2: Add fields to `matches.ts`**

In `apps/web/src/api/endpoints/matches.ts`, update `MyCharacterSummary` (currently lines 5–9):

```typescript
export type MyCharacterSummary = {
  id: string;
  name: string;
  imageUrl?: string;
  imageFocalX?: number;
  imageFocalY?: number;
};
```

Do not modify `CharacterSummary` — it backs the unused `MatchCharacterDetail` component (see Global Constraints).

- [ ] **Step 3: Add fields to `CharacterFormData`**

In `apps/web/src/components/character-wizard/types.ts`, update the `CharacterFormData` interface (currently lines 18–32) — add after `cardBackgroundColor: string`:

```typescript
export interface CharacterFormData {
  platform: string
  platformHandle: string
  name: string
  imageUrl: string
  imageFile: File | null
  bio: string
  additionalNotes: string
  timeZone: string
  activeTimes: string[]
  usesVoiceChat: boolean | undefined
  languages: string[]
  gameFields: Record<string, string>
  cardBackgroundColor: string
  imageFocalX: number
  imageFocalY: number
}
```

Update `defaultFormData` (currently lines 34–48) — add after `cardBackgroundColor: '',`:

```typescript
export const defaultFormData: CharacterFormData = {
  platform: '',
  platformHandle: '',
  name: '',
  imageUrl: '',
  imageFile: null,
  bio: '',
  additionalNotes: '',
  timeZone: '',
  activeTimes: [],
  usesVoiceChat: undefined,
  languages: [],
  gameFields: {},
  cardBackgroundColor: '',
  imageFocalX: 50,
  imageFocalY: 50,
}
```

Update `characterToFormData` (currently lines 50–66) — add after `cardBackgroundColor: c.cardBackgroundColor ?? '',`:

```typescript
export function characterToFormData(c: Character): Partial<CharacterFormData> {
  return {
    platform: c.platform ?? '',
    platformHandle: c.platformHandle ?? '',
    name: c.name ?? '',
    imageUrl: c.imageUrl ?? '',
    imageFile: null,
    bio: c.bio ?? '',
    additionalNotes: c.additionalNotes ?? '',
    timeZone: c.timeZone ?? '',
    activeTimes: c.activeTimes ?? [],
    usesVoiceChat: c.usesVoiceChat,
    languages: c.languages ?? [],
    gameFields: Object.fromEntries((c.gameFields ?? []).map(f => [f.fieldDefinitionId, f.value])),
    cardBackgroundColor: c.cardBackgroundColor ?? '',
    imageFocalX: c.imageFocalX ?? 50,
    imageFocalY: c.imageFocalY ?? 50,
  }
}
```

- [ ] **Step 4: Verify the frontend still typechecks**

```bash
npm run build --prefix apps/web
```
Expected: build succeeds (these are purely additive optional/defaulted fields, so nothing downstream breaks yet).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts apps/web/src/api/endpoints/matches.ts apps/web/src/components/character-wizard/types.ts
git commit -m "feat: add imageFocalX/imageFocalY to frontend character types"
```

---

### Task 5: Build `ImageOriginPicker` and wire it into the character wizard

**Files:**
- Create: `apps/web/src/components/character-wizard/ImageOriginPicker.tsx`
- Modify: `apps/web/src/components/character-wizard/IdentityStep.tsx`
- Modify: `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`

**Interfaces:**
- Consumes: `CharacterFormData.imageFocalX/imageFocalY` (Task 4).
- Produces: `ImageOriginPicker` component with props `{ imageUrl?: string; focalX: number; focalY: number; onChange: (focalX: number, focalY: number) => void }` — used only within `IdentityStep`.

- [ ] **Step 1: Create the `ImageOriginPicker` component**

Create `apps/web/src/components/character-wizard/ImageOriginPicker.tsx`:

```tsx
const POINTS = [0, 50, 100] as const

const Y_LABELS: Record<number, string> = { 0: 'top', 50: 'middle', 100: 'bottom' }
const X_LABELS: Record<number, string> = { 0: 'left', 50: 'center', 100: 'right' }

interface ImageOriginPickerProps {
  imageUrl?: string
  focalX: number
  focalY: number
  onChange: (focalX: number, focalY: number) => void
}

export function ImageOriginPicker({ imageUrl, focalX, focalY, onChange }: ImageOriginPickerProps) {
  return (
    <div className="flex gap-4 items-start flex-wrap">
      <div className="relative aspect-4/2 w-48 flex-shrink-0 overflow-hidden rounded-sm border-off-black border-2 bg-off-black">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Character preview"
            className="w-full h-full object-cover"
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-xs"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            No image yet
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Image Focus</p>
        <div className="grid grid-cols-3 gap-1.5">
          {POINTS.flatMap(y =>
            POINTS.map(x => {
              const active = focalX === x && focalY === y
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  onClick={() => onChange(x, y)}
                  aria-label={`Focus image on ${Y_LABELS[y]} ${X_LABELS[x]}`}
                  aria-pressed={active}
                  className={`w-8 h-8 rounded border flex items-center justify-center transition-all ${active
                    ? 'bg-accent border-accent ring-2 ring-white ring-offset-2 ring-offset-surface'
                    : 'bg-surface border-border hover:border-accent'
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-muted'}`} />
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the inline preview in `IdentityStep.tsx` with `ImageOriginPicker`**

In `apps/web/src/components/character-wizard/IdentityStep.tsx`:

Add the import near the top (after the `compressImageIfNeeded` import, currently line 5):
```typescript
import { compressImageIfNeeded } from '../../utils/imageCompression'
import { ImageOriginPicker } from './ImageOriginPicker'
```

Replace the existing preview `<img>` block (currently lines 143–149):
```tsx
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Character preview"
            className="w-24 h-24 object-cover rounded mb-3 border border-border"
          />
        )}
```
with:
```tsx
        <div className="mb-3">
          <ImageOriginPicker
            imageUrl={previewUrl}
            focalX={data.imageFocalX}
            focalY={data.imageFocalY}
            onChange={(imageFocalX, imageFocalY) => onChange({ imageFocalX, imageFocalY })}
          />
        </div>
```

- [ ] **Step 3: Include focal point in the wizard's submit payload**

In `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`, in `handleNext` (currently lines 86–98), add to the `payload` object after `cardBackgroundColor: data.cardBackgroundColor || undefined,`:

```typescript
      const payload = {
        platform: data.platform,
        platformHandle: data.platformHandle.trim(),
        name: data.name.trim(),
        imageUrl,
        bio: data.bio.trim() || undefined,
        additionalNotes: data.additionalNotes.trim() || undefined,
        timeZone: data.timeZone.trim() || undefined,
        activeTimes: data.activeTimes.length > 0 ? data.activeTimes : undefined,
        usesVoiceChat: data.usesVoiceChat,
        languages: data.languages.length > 0 ? data.languages : undefined,
        cardBackgroundColor: data.cardBackgroundColor || undefined,
        imageFocalX: data.imageFocalX,
        imageFocalY: data.imageFocalY,
      }
```

- [ ] **Step 4: Verify the frontend typechecks and builds**

```bash
npm run build --prefix apps/web
```
Expected: build succeeds.

- [ ] **Step 5: Manually verify in the browser**

Start the stack (`npm run dev` from repo root, with `docker compose up -d` already running), open the character create wizard from a Realm page, and confirm:
- Uploading an image or pasting a URL shows a preview cropped to `aspect-4/2` matching the card's image zone.
- Clicking each of the 9 grid buttons visibly shifts the crop and highlights the active button.
- Center is highlighted by default before any button is clicked.
- Editing an existing character preloads its saved focal point (or center, if none was set) and the picker reflects it.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/character-wizard/
git commit -m "feat: add ImageOriginPicker to character create/edit wizard"
```

---

### Task 6: Apply focal point in the base card components

**Files:**
- Modify: `apps/web/src/components/cards/StandardTcgCard.tsx`
- Modify: `apps/web/src/components/cards/FullArtTcgCard.tsx`

**Interfaces:**
- Consumes: nothing new (props are supplied by callers in Task 7).
- Produces: `imageFocalX?: number`, `imageFocalY?: number` props on both base components, defaulting to `50`/`50` (center) when omitted — consumed by every wrapper card in Task 7.

- [ ] **Step 1: Add focal point props to `StandardTcgCard`**

In `apps/web/src/components/cards/StandardTcgCard.tsx`, add to `StandardTcgCardProps` (currently lines 3–18), after `imageUrl?: string;`:

```typescript
interface StandardTcgCardProps {
  name: string
  platform?: string
  subtitle?: string
  imageUrl?: string
  imageFocalX?: number
  imageFocalY?: number
  statsLine?: React.ReactNode
  textBody?: React.ReactNode
  bottomStat?: React.ReactNode
  className?: string
  onClick?: () => void
  cardBackgroundColor?: string
  children?: React.ReactNode
  isNew?: boolean
  stickerEmoji?: string
  stickerSeed?: string
}
```

Destructure the new props in the function signature (currently lines 42–57), adding `imageFocalX = 50, imageFocalY = 50,` after `imageUrl,`:

```typescript
export function StandardTcgCard({
  name,
  platform,
  subtitle,
  imageUrl,
  imageFocalX = 50,
  imageFocalY = 50,
  statsLine,
  textBody,
  bottomStat,
  className,
  onClick,
  cardBackgroundColor,
  children,
  isNew,
  stickerEmoji,
  stickerSeed = '',
}: StandardTcgCardProps) {
```

Apply the position to the image (currently lines 102–104):
```tsx
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${imageFocalX}% ${imageFocalY}%` }}
          />
        ) : (
```

- [ ] **Step 2: Add focal point props to `FullArtTcgCard`**

In `apps/web/src/components/cards/FullArtTcgCard.tsx`, add to `FullArtTcgCardProps` (currently lines 1–10), after `imageUrl?: string`:

```typescript
interface FullArtTcgCardProps {
  name?: string
  platform?: React.ReactNode
  imageUrl?: string
  imageFocalX?: number
  imageFocalY?: number
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  location?: string
  onClick?: () => void
}
```

Destructure the new props (currently line 12):
```typescript
export function FullArtTcgCard({ name, platform, imageUrl, imageFocalX = 50, imageFocalY = 50, className, style, location, children, onClick }: FullArtTcgCardProps) {
```

Apply the position to the background image (currently line 32):
```tsx
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: `${imageFocalX}% ${imageFocalY}%` }}
        />
      ) : (
```

- [ ] **Step 3: Verify the frontend builds**

```bash
npm run build --prefix apps/web
```
Expected: build succeeds. No visual change yet since no caller passes the new props (default 50/50 matches today's behavior).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/cards/StandardTcgCard.tsx apps/web/src/components/cards/FullArtTcgCard.tsx
git commit -m "feat: support imageFocalX/imageFocalY in StandardTcgCard and FullArtTcgCard"
```

---

### Task 7: Forward focal point from every character card wrapper

**Files:**
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`
- Modify: `apps/web/src/components/cards/MatchCard.tsx`
- Modify: `apps/web/src/components/cards/SwipeCard.tsx`
- Modify: `apps/web/src/components/cards/PendingLikeCard.tsx`
- Modify: `apps/web/src/components/cards/CollectionCard.tsx`
- Modify: `apps/web/src/components/cards/CharacterMiniCard.tsx`
- Modify: `apps/web/src/components/cards/CharacterDetailCard.tsx`

**Interfaces:**
- Consumes: `imageFocalX?/imageFocalY?` props from Task 6's base components; `imageFocalX?/imageFocalY?` fields from Task 4's `Character`/`DiscoverCharacter`/`MyCharacterSummary` types.
- Produces: nothing further downstream — this is the last task.

- [ ] **Step 1: Forward props in `CharacterCard.tsx`**

In `apps/web/src/components/cards/CharacterCard.tsx`, add to the `<StandardTcgCard>` call (currently lines 39–59), after `imageUrl={character.imageUrl}`:

```tsx
        imageUrl={character.imageUrl}
        imageFocalX={character.imageFocalX}
        imageFocalY={character.imageFocalY}
```

- [ ] **Step 2: Forward props in `MatchCard.tsx`**

In `apps/web/src/components/cards/MatchCard.tsx`, in `MatchFront` (currently lines 38–46), after `imageUrl={character.imageUrl}`:

```tsx
      imageUrl={character.imageUrl}
      imageFocalX={character.imageFocalX}
      imageFocalY={character.imageFocalY}
```

- [ ] **Step 3: Forward props in `SwipeCard.tsx`**

In `apps/web/src/components/cards/SwipeCard.tsx`, in `SwipeFront` (currently lines 34–39), after `imageUrl={character.imageUrl}`:

```tsx
      imageUrl={character.imageUrl}
      imageFocalX={character.imageFocalX}
      imageFocalY={character.imageFocalY}
```

- [ ] **Step 4: Forward props in `PendingLikeCard.tsx`**

In `apps/web/src/components/cards/PendingLikeCard.tsx`, in the `<FullArtTcgCard>` call (currently lines 20–25), after `imageUrl={character.imageUrl}`:

```tsx
        imageUrl={character.imageUrl}
        imageFocalX={character.imageFocalX}
        imageFocalY={character.imageFocalY}
```

- [ ] **Step 5: Forward props in `CollectionCard.tsx`**

In `apps/web/src/components/cards/CollectionCard.tsx`, in the `<StandardTcgCard>` call (currently lines 40–49), after `imageUrl={character.imageUrl}`:

```tsx
      imageUrl={character.imageUrl}
      imageFocalX={character.imageFocalX}
      imageFocalY={character.imageFocalY}
```

- [ ] **Step 6: Accept and forward props in `CharacterMiniCard.tsx`**

In `apps/web/src/components/cards/CharacterMiniCard.tsx`, update the prop type and forward the fields:

```tsx
import { useNavigate } from 'react-router-dom'
import { FullArtTcgCard } from './FullArtTcgCard'

interface CharacterMiniCardProps {
  character: { name: string; imageUrl?: string; imageFocalX?: number; imageFocalY?: number }
  characterId?: string
  platform?: React.ReactNode
}

export function CharacterMiniCard({ character, characterId, platform }: CharacterMiniCardProps) {
  const navigate = useNavigate()

  return (
    <FullArtTcgCard
      name={character.name}
      imageUrl={character.imageUrl}
      imageFocalX={character.imageFocalX}
      imageFocalY={character.imageFocalY}
      platform={platform}
      className="h-full md:h-40 shrink-0 text-xxs md:text-xs"
      style={{ aspectRatio: '3/2' }}
      location='bar'
      onClick={characterId ? () => navigate(`/characters?id=${characterId}`) : undefined}
    />
  )
}
```

- [ ] **Step 7: Apply focal point in `CharacterDetailCard.tsx`**

This component renders the image with a raw `<img>` rather than a base card (a pre-existing deviation, out of scope to restructure — see Global Constraints), but it should still respect the saved focal point. In `apps/web/src/components/cards/CharacterDetailCard.tsx`, update the image block (currently lines 72–85):

```tsx
          {character.imageUrl ? (
            <img
              src={character.imageUrl}
              alt={character.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: `${character.imageFocalX ?? 50}% ${character.imageFocalY ?? 50}%` }}
            />
          ) : (
```

- [ ] **Step 8: Verify the frontend builds**

```bash
npm run build --prefix apps/web
```
Expected: build succeeds.

- [ ] **Step 9: Manual end-to-end verification**

With `docker compose up -d`, backend (`dotnet watch run --project apps/api/PartyUp.Api.csproj`), and frontend (`npm run dev --prefix apps/web`) all running:

1. Create a character with an image whose subject is near the top of the frame; set the focal point to top-center in the wizard.
2. Confirm the character list card (`CharacterCard`), the character detail page (`CharacterDetailCard`), and — if you can generate a match in your test data — the match card (`MatchCard`) and the "my character" mini card on the Matches page all crop the image the same way (subject stays in frame, not cut off).
3. Edit the character and change the focal point to bottom-left; confirm all the same surfaces update after saving.
4. Discover/swipe on that character from a second test account and confirm `SwipeCard` and `PendingLikeCard` (if a pending like exists) also honor the focal point.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/cards/
git commit -m "feat: apply character image focal point across all card surfaces"
```

---

## Self-Review Notes

- **Spec coverage:** every file listed in the design spec's "Frontend changes" and "Backend changes" sections has a corresponding task/step above. The spec's explicit "out of scope" items (cropping, free-form placement, fixing the `CharacterDetailCard`/`MatchCharacterDetail` base-card deviation) are not touched.
- **Additional scope found during planning, not in the original spec text:** `CharacterMatchService.cs` has its own duplicate `ToProjection`/`ToSummary` mapping (separate from `CharacterService.ToProjection`), and `MyCharacterSummary` (matches.ts) backs a live `CharacterMiniCard` usage on the Matches page. Both are now covered in Tasks 2/3/7 — without them, match cards and the Matches-page mini card would silently ignore the saved focal point.
- **Dead code confirmed, deliberately excluded:** `MatchCharacterDetail.tsx` / `CharacterSummary` type have no import sites anywhere under `apps/web/src` (verified via grep) — not wired into this feature.
