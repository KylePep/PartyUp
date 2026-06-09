# Character Card Background Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to pick one of 12 preset background colors for their character card, stored on the character record and rendered everywhere the card appears.

**Architecture:** Add a nullable `CardBackgroundColor` (hex string) column to `Characters`; thread it through all DTOs, the service, and two response projections; add a swatch picker to the Identity step of the character wizard; apply the color in `StandardTcgCard` and `CharacterDetailCard`, falling back to `var(--color-surface)` when null.

**Tech Stack:** ASP.NET Core 8, EF Core (PostgreSQL), React + TypeScript + Vite, Tailwind CSS

---

## File Map

**Modified — Backend**
- `apps/api/Models/Character.cs` — add `CardBackgroundColor` property
- `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs` — add field
- `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs` — add field
- `apps/api/Models/DTOs/Character/CharacterResponse.cs` — add field
- `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs` — add field
- `apps/api/Services/CharacterService.cs` — pass field through create, update, `ToProjection()`, discover
- New EF migration file (auto-generated)

**Modified — Tests**
- `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs` — 3 new tests

**Modified — Frontend**
- `apps/web/src/api/endpoints/characters.ts` — add field to 4 types
- `apps/web/src/components/character-wizard/types.ts` — add to `CharacterFormData`, defaults, mapper
- `apps/web/src/components/character-wizard/IdentityStep.tsx` — add color swatch picker
- `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx` — include color in payload
- `apps/web/src/components/cards/StandardTcgCard.tsx` — add `cardBackgroundColor` prop
- `apps/web/src/components/cards/CharacterCard.tsx` — pass color to `StandardTcgCard`
- `apps/web/src/components/cards/CharacterDetailCard.tsx` — use color on outer container

---

## Task 1: Write Failing Backend Tests

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`

- [ ] **Step 1: Add three new tests to `CharacterTests.cs`**

Add these tests and the supporting private records at the bottom of the class (before the closing brace), alongside the existing private record declarations:

```csharp
[Fact]
public async Task CreateCharacter_WithCardBackgroundColor_RoundtripsValue()
{
    var client = await CreateAuthenticatedClientAsync();
    var userGame = await AddGameAsync(client);

    var response = await client.PostAsJsonAsync("/api/characters", new
    {
        name = "Color Character",
        platform = "PC",
        platformHandle = "ColorHandle",
        userGameId = userGame.Id,
        cardBackgroundColor = "#1a1a2e"
    });

    response.StatusCode.Should().Be(HttpStatusCode.Created);

    var all = await client.GetFromJsonAsync<List<CharacterWithColorDto>>("/api/characters");
    all!.Should().ContainSingle(c =>
        c.Name == "Color Character" &&
        c.CardBackgroundColor == "#1a1a2e");
}

[Fact]
public async Task UpdateCharacter_WithCardBackgroundColor_PersistsChange()
{
    var client = await CreateAuthenticatedClientAsync();
    var userGame = await AddGameAsync(client);
    var charResponse = await client.PostAsJsonAsync("/api/characters", new
    {
        name = "Color Char",
        platform = "PC",
        platformHandle = "ColorHandle2",
        userGameId = userGame.Id
    });
    var character = (await charResponse.Content.ReadFromJsonAsync<CharacterDto>())!;

    await client.PutAsJsonAsync(
        $"/api/characters/{userGame.Id}/{character.Id}",
        new { name = "Color Char", cardBackgroundColor = "#1b4332" });

    var all = await client.GetFromJsonAsync<List<CharacterWithColorDto>>("/api/characters");
    all!.Should().ContainSingle(c =>
        c.Name == "Color Char" &&
        c.CardBackgroundColor == "#1b4332");
}

[Fact]
public async Task Discover_ReturnsCardBackgroundColor()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();

    var sharedExternalId = Interlocked.Increment(ref _gameCounter);
    var userGameA = await AddGameAsync(clientA, sharedExternalId);
    var userGameB = await AddGameAsync(clientB, sharedExternalId);

    await clientA.PostAsJsonAsync("/api/characters", new
    {
        name = "Discoverer",
        platform = "PC",
        platformHandle = "DiscovererHandle",
        userGameId = userGameA.Id
    });

    await clientB.PostAsJsonAsync("/api/characters", new
    {
        name = "Colorful",
        platform = "PC",
        platformHandle = "ColorfulHandle",
        userGameId = userGameB.Id,
        cardBackgroundColor = "#3d0a14"
    });

    var response = await clientA.GetAsync($"/api/characters/discover?gameId={userGameA.GameId}");
    var paged = await response.Content.ReadFromJsonAsync<PagedDiscoverWithColorDto>();
    paged!.Items.Should().ContainSingle(c =>
        c.Name == "Colorful" &&
        c.CardBackgroundColor == "#3d0a14");
}
```

Add these records alongside the existing private records at the bottom of `CharacterTests.cs`:

```csharp
private record CharacterWithColorDto(Guid Id, string Name, string? CardBackgroundColor);
private record DiscoveredWithColorDto(string Name, string? CardBackgroundColor);
private record PagedDiscoverWithColorDto(List<DiscoveredWithColorDto> Items, bool HasMore, int TotalCount);
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CreateCharacter_WithCardBackgroundColor|UpdateCharacter_WithCardBackgroundColor|Discover_ReturnsCardBackgroundColor" --no-build
```

Expected: build error or test failures — `CardBackgroundColor` doesn't exist yet.

---

## Task 2: Add `CardBackgroundColor` to the Backend Model and DTOs

**Files:**
- Modify: `apps/api/Models/Character.cs`
- Modify: `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs`
- Modify: `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs`
- Modify: `apps/api/Models/DTOs/Character/CharacterResponse.cs`
- Modify: `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs`

- [ ] **Step 1: Add the property to `Character.cs`**

After the `AdditionalNotes` property (line 39), add:

```csharp
[MaxLength(7)]
public string? CardBackgroundColor { get; set; }
```

- [ ] **Step 2: Add to `CreateCharacterRequest.cs`**

After the `AdditionalNotes` property, add:

```csharp
[MaxLength(7)]
public string? CardBackgroundColor { get; set; }
```

- [ ] **Step 3: Add to `UpdateCharacterRequest.cs`**

After the `AdditionalNotes` property, add:

```csharp
[MaxLength(7)]
public string? CardBackgroundColor { get; set; }
```

- [ ] **Step 4: Add to `CharacterResponse.cs`**

After `AdditionalNotes`, add:

```csharp
public string? CardBackgroundColor { get; set; }
```

- [ ] **Step 5: Add to `DiscoverCharacterResponse.cs`**

After `AdditionalNotes`, add:

```csharp
public string? CardBackgroundColor { get; set; }
```

---

## Task 3: Update `CharacterService` to Pass the Field Through

**Files:**
- Modify: `apps/api/Services/CharacterService.cs`

- [ ] **Step 1: Pass through in `CreateCharacterAsync`**

In the `new Character { ... }` initializer (around line 37–51), add after `AdditionalNotes`:

```csharp
CardBackgroundColor = request.CardBackgroundColor,
```

- [ ] **Step 2: Pass through in `UpdateCharacterAsync`**

After the `character.AdditionalNotes = request.AdditionalNotes;` line (around line 233), add:

```csharp
character.CardBackgroundColor = request.CardBackgroundColor;
```

- [ ] **Step 3: Add to `ToProjection()`**

In the `ToProjection()` expression (around line 276–303), after `AdditionalNotes = c.AdditionalNotes,` add:

```csharp
CardBackgroundColor = c.CardBackgroundColor,
```

- [ ] **Step 4: Add to the discover projection in `DiscoverCharactersAsync`**

In the inline `new DiscoverCharacterResponse { ... }` inside `DiscoverCharactersAsync` (around line 174–194), after `AdditionalNotes = c.AdditionalNotes,` add:

```csharp
CardBackgroundColor = c.CardBackgroundColor,
```

---

## Task 4: Generate and Apply the EF Core Migration

- [ ] **Step 1: Add the migration**

```
dotnet ef migrations add AddCharacterCardBackgroundColor --project apps/api
```

Expected: A new file appears in `apps/api/Migrations/` named something like `20260608XXXXXX_AddCharacterCardBackgroundColor.cs`. Open it and verify the `Up` method contains something like:

```csharp
migrationBuilder.AddColumn<string>(
    name: "card_background_color",
    table: "characters",
    type: "character varying(7)",
    maxLength: 7,
    nullable: true);
```

- [ ] **Step 2: Apply the migration to the local database**

Make sure the Docker database is running first (`docker compose up -d` from the repo root), then:

```
dotnet ef database update --project apps/api
```

Expected: `Done.`

---

## Task 5: Run Backend Tests and Commit

- [ ] **Step 1: Run the three new tests**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~CreateCharacter_WithCardBackgroundColor|UpdateCharacter_WithCardBackgroundColor|Discover_ReturnsCardBackgroundColor"
```

Expected: all 3 pass.

- [ ] **Step 2: Run the full test suite to check for regressions**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/Models/Character.cs \
        apps/api/Models/DTOs/Character/CreateCharacterRequest.cs \
        apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs \
        apps/api/Models/DTOs/Character/CharacterResponse.cs \
        apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs \
        apps/api/Services/CharacterService.cs \
        apps/api/Migrations/ \
        apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs
git commit -m "feat: add CardBackgroundColor to character model and API"
```

---

## Task 6: Update Frontend Types

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`
- Modify: `apps/web/src/components/character-wizard/types.ts`

- [ ] **Step 1: Add `cardBackgroundColor` to the four types in `characters.ts`**

In `Character`, after `gameImageUrl?`:
```ts
cardBackgroundColor?: string;
```

In `CharacterCreate`, after `additionalNotes?`:
```ts
cardBackgroundColor?: string;
```

In `CharacterUpdate`, after `additionalNotes?`:
```ts
cardBackgroundColor?: string;
```

In `DiscoverCharacter`, after `additionalNotes?`:
```ts
cardBackgroundColor?: string;
```

- [ ] **Step 2: Update `CharacterFormData` in `types.ts`**

In the `CharacterFormData` interface, after `gameFields`:
```ts
cardBackgroundColor: string
```

In `defaultFormData`, after `gameFields`:
```ts
cardBackgroundColor: '',
```

In `characterToFormData`, after the `gameFields` line:
```ts
cardBackgroundColor: c.cardBackgroundColor ?? '',
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts \
        apps/web/src/components/character-wizard/types.ts
git commit -m "feat: add cardBackgroundColor to frontend character types"
```

---

## Task 7: Add Color Swatch Picker to IdentityStep

**Files:**
- Modify: `apps/web/src/components/character-wizard/IdentityStep.tsx`

- [ ] **Step 1: Add the `CARD_COLORS` constant and the swatch picker section**

At the top of the file, after the existing imports, add the constant:

```ts
const CARD_COLORS = [
  '#1a1a2e', // deep navy
  '#0f3460', // sapphire
  '#1b4332', // forest green
  '#3d0a14', // crimson
  '#2d1b69', // deep violet
  '#0d2b2b', // teal
  '#3d2800', // bronze
  '#2b0d2b', // dark magenta
  '#1a1a1a', // near black
  '#0a2a1a', // emerald
  '#3a1a00', // dark rust
  '#1a2a3a', // slate blue
]
```

In the returned JSX, add a new section after the character image `<div>` block (after the `<input ref={fileRef} ... />` closing tag and before the closing `</div>` of the outer `flex flex-col gap-6`):

```tsx
<div>
  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Card Color</p>
  <div className="flex flex-wrap gap-2">
    {CARD_COLORS.map(color => (
      <button
        key={color}
        type="button"
        onClick={() => onChange({ cardBackgroundColor: data.cardBackgroundColor === color ? '' : color })}
        className={`w-8 h-8 rounded transition-all ${
          data.cardBackgroundColor === color
            ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110'
            : 'hover:scale-105'
        }`}
        style={{ backgroundColor: color }}
        title={color}
      />
    ))}
  </div>
</div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npm run build --prefix apps/web
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/character-wizard/IdentityStep.tsx
git commit -m "feat: add card color swatch picker to identity step"
```

---

## Task 8: Include Card Color in Wizard Payload

**Files:**
- Modify: `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`

- [ ] **Step 1: Add `cardBackgroundColor` to the payload object**

In `handleNext`, in the `payload` object (around line 67–78), after `languages`:

```ts
cardBackgroundColor: data.cardBackgroundColor || undefined,
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npm run build --prefix apps/web
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/character-wizard/CreateCharacterWizard.tsx
git commit -m "feat: include cardBackgroundColor in create/update character payload"
```

---

## Task 9: Add `cardBackgroundColor` Prop to `StandardTcgCard`

**Files:**
- Modify: `apps/web/src/components/cards/StandardTcgCard.tsx`

- [ ] **Step 1: Add the prop and apply it**

In the `StandardTcgCardProps` interface, after `onClick?`:
```ts
cardBackgroundColor?: string
```

In the destructured parameters of the function, after `onClick`:
```ts
cardBackgroundColor,
```

In the outer `<div>`'s `style`, change:
```ts
style={{ border: '8px solid black', backgroundColor: 'var(--color-surface)' }}
```
to:
```ts
style={{ border: '8px solid black', backgroundColor: cardBackgroundColor || 'var(--color-surface)' }}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npm run build --prefix apps/web
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/StandardTcgCard.tsx
git commit -m "feat: StandardTcgCard accepts optional cardBackgroundColor prop"
```

---

## Task 10: Thread Color Through Card Components

**Files:**
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`
- Modify: `apps/web/src/components/cards/CharacterDetailCard.tsx`

- [ ] **Step 1: Pass color through `CharacterCard`**

In the `<StandardTcgCard ...>` call, add the prop:
```tsx
cardBackgroundColor={character.cardBackgroundColor}
```

- [ ] **Step 2: Apply color in `CharacterDetailCard`**

`CharacterDetailCard` has its own card background (it's not a `StandardTcgCard`). Find the outer container `<div>` that has `backgroundColor: 'var(--color-surface)'` in its `style` (around line 29–35). Change that style entry:

```ts
backgroundColor: character.cardBackgroundColor || 'var(--color-surface)',
```

- [ ] **Step 3: Verify TypeScript compiles**

```
npm run build --prefix apps/web
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/cards/CharacterCard.tsx \
        apps/web/src/components/cards/CharacterDetailCard.tsx
git commit -m "feat: apply cardBackgroundColor in CharacterCard and CharacterDetailCard"
```

---

## Task 11: Smoke Test the Feature End-to-End

- [ ] **Step 1: Start the dev environment**

Make sure Docker is running, then:
```
npm run dev
```

Open http://localhost:5173 in a browser.

- [ ] **Step 2: Create a new character and verify color appears**

1. Log in, navigate to a game, open the character creation wizard
2. On the Identity step, scroll to "Card Color" — verify 12 colored swatches are visible
3. Click a swatch — verify it gets a ring/highlight
4. Click the same swatch again — verify it deselects (no ring)
5. Select a color and complete the wizard
6. Verify the created character card uses the selected background color
7. Verify text boxes on the card (header, stats, bio) still have their own darker backgrounds

- [ ] **Step 3: Edit an existing character and verify color persists**

1. Open an existing character's detail page
2. Click "Edit Character"
3. Verify the Identity step pre-selects the previously chosen color
4. Change to a different color, save
5. Verify the card now shows the new color

- [ ] **Step 4: Verify null-safety (no color selected)**

1. Create or edit a character without selecting any color (or deselect the active swatch)
2. Verify the card renders with the default dark background — no errors, no blank/white card

- [ ] **Step 5: Run the full backend test suite one more time**

```
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.
