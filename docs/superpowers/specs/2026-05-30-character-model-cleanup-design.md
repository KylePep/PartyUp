# Character Model Cleanup & Additional Notes

**Date:** 2026-05-30

## Problem

The `Character` model has six hardcoded fallback fields (`MainRole`, `SecondaryRole`, `PreferredModes`, `Playstyle`, `Rank`, `Region`) that exist as last-resort data when Anthropic fields aren't available. In practice these are never filled out because the app is designed around Anthropic-generated game field definitions. They clutter the model, wizard, and card views without providing value. Separately, `AdditionalNotes` was already excluded from Anthropic generation but never added to the character model. The Anthropic prompt also insufficiently excludes voice/audio variants, causing Anthropic to occasionally generate microphone or push-to-talk fields despite the dedicated `UsesVoiceChat` field.

## Goals

1. Remove the six legacy hardcoded fields end-to-end (DB, backend, frontend).
2. Add `AdditionalNotes` as a permanent character field (wizard About step; visible on card backs during discovery and in matches).
3. Strengthen the Anthropic prompt to exclude all voice/audio/microphone communication fields.
4. Consolidate the two-path wizard (`GameplayStep` / `DynamicGameplayStep`) into a single `GameplayStep` that renders dynamic game fields.

## Approach

Single PR covering all four concerns. They are cohesive (all touch the same character model layer) and share a DB migration, so doing them together avoids double migrations and double reviews.

---

## Design

### 1. Database Migration

One EF Core migration:
- **Drop columns:** `main_role`, `secondary_role`, `preferred_modes`, `playstyle`, `rank`, `region`
- **Add column:** `additional_notes` (`varchar(1000)`, nullable)

No data preservation needed — the removed fields are not populated in production.

### 2. Backend

**`Character.cs`**
- Remove: `MainRole`, `SecondaryRole`, `PreferredModes`, `Playstyle`, `Rank`, `Region`
- Add: `AdditionalNotes` (`string?`, `[MaxLength(1000)]`)

**`CharacterResponse.cs`, `CreateCharacterRequest.cs`, `UpdateCharacterRequest.cs`, `DiscoverCharacterResponse.cs`**
- Apply the same removals and addition.

**`CharacterService.cs`**
- Remove all six fields from: `CreateCharacterAsync`, `UpdateCharacterAsync`, `DiscoverCharactersAsync`, and `ToProjection()`.
- Add `AdditionalNotes` to all four.

**`AnthropicService.cs` (system prompt exclusion list)**

Current:
> `Voice chat, Play schedule / active times, Additional Notes`

Becomes:
> `Voice chat, microphone, push-to-talk, audio communication preferences, Play schedule / active times, Additional Notes`

### 3. Frontend — Wizard

**`types.ts`**
- Remove from `CharacterFormData` and `defaultFormData`: `mainRole`, `secondaryRole`, `preferredModes`, `playstyle`, `rank`, `region`
- Remove now-unused constants: `ROLES`, `PREFERRED_MODES`, `PLAYSTYLES`, `RANKS`, `REGIONS`
- Add: `additionalNotes: string` (default `''`)

**`GameplayStep.tsx`** (repurposed)
- Remove all six hardcoded field renders.
- Accept props: `fields: GameFieldDefinitionDto[]`, `values: Record<string, string>`, `onChange: (fieldId: string, value: string) => void`
- Render the dynamic game fields (the logic currently in `DynamicGameplayStep`).
- If `fields` is empty, render a subtle placeholder: "No game-specific fields for this game yet."

**`DynamicGameplayStep.tsx`** — deleted (logic merged into `GameplayStep`).

**`CreateCharacterWizard.tsx`**
- Collapse the two-path `STEPS` logic into a single path: `['Identity', 'Gameplay', 'Availability', 'About']`
- Remove the `hasDynamicFields` branch.
- Always render `GameplayStep` with `fields={fieldDefs?.fields ?? []}`.
- Remove the six legacy fields from the submit payload; add `additionalNotes`.

**`AboutStep.tsx`**
- Add a second `Textarea` below Bio for Additional Notes.
- Label: "Additional Notes"
- Placeholder: "Anything else you'd like teammates to know?"
- Max length: 1000

**`CharacterPage.tsx`**
- Remove the six fields from `initialData`; add `additionalNotes: c.additionalNotes ?? ''`.

### 4. Frontend — API Types (`characters.ts`)

Remove the six fields from `Character`, `CharacterCreate`, `CharacterUpdate`, `DiscoverCharacter`. Add `additionalNotes?: string` to all four.

### 5. Frontend — Cards

**`SwipeBack` (in `SwipeCard.tsx`)**
- Remove badge blocks for `mainRole`, `secondaryRole`, `rank`, `region`, `playstyle`, `preferredModes`.
- Add `additionalNotes` section after Bio, conditionally rendered with label "Notes".

**`MatchBack` (in `MatchCard.tsx`)**
- Same removals. Add `additionalNotes` section after Bio, conditionally rendered with label "Notes".

**`MatchesPage.tsx`**
- Remove the badge block referencing the six fields.

**`LandingPage.tsx`**
- Update copy: "Set your role, rank, playstyle, and availability" → "Build your profile, set your availability, and let us find your match."

### 6. Tests

**`ScaleSeeder.cs`**
- Remove `Playstyle` and `PreferredModes` from the character seed block.

**`HardcodedSchemas.cs`** — no change. The `rank`/`region` entries there are `GameFieldDefinition` records for a specific game's dynamic fields, not references to the removed `Character` columns.

---

## Files Changed

### Backend
- `apps/api/Models/Character.cs`
- `apps/api/Models/DTOs/Character/CharacterResponse.cs`
- `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs`
- `apps/api/Models/DTOs/Character/UpdateCharacterRequest.cs`
- `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs`
- `apps/api/Services/CharacterService.cs`
- `apps/api/Services/AnthropicService.cs`
- `apps/api/Migrations/<new>_CharacterModelCleanup.cs` (generated)

### Frontend
- `apps/web/src/api/endpoints/characters.ts`
- `apps/web/src/components/character-wizard/types.ts`
- `apps/web/src/components/character-wizard/GameplayStep.tsx` (repurposed)
- `apps/web/src/components/character-wizard/DynamicGameplayStep.tsx` (deleted)
- `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`
- `apps/web/src/components/character-wizard/AboutStep.tsx`
- `apps/web/src/components/cards/SwipeCard.tsx`
- `apps/web/src/components/cards/MatchCard.tsx`
- `apps/web/src/pages/CharacterPage.tsx`
- `apps/web/src/pages/MatchesPage.tsx`
- `apps/web/src/pages/LandingPage.tsx`

### Tests
- `apps/tests/PartyUp.Api.Tests/Seeders/ScaleSeeder.cs`
