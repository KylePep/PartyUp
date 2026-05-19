# AI-Generated Game Schema Design

**Date:** 2026-05-18
**Branch:** feat-ai-game-schema
**Status:** Approved — pending implementation plan

## Overview

PartyUp's current `Character` model uses a one-size-fits-all set of fields (`MainRole`, `Rank`, `Region`, etc.) that have no meaningful relationship to most games. This design replaces those generic fields with AI-generated, game-specific field schemas — so ESO characters have `Alliance`, `Server`, and `CP Level`, while Halo characters have `Preferred Mode` and `Language`. These fields support filtering in the discovery queue, making matching intentional rather than random.

Additionally, this spec covers character image upload via Google Cloud Storage and a scale seeding tool for testing matching mechanics at volume.

---

## 1. Data Model

### New Table: `GameFieldDefinitions`

Stores the AI-generated schema for a game. Created once per game, ever.

| Column | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `GameId` | Guid | FK to `Games` |
| `Key` | string | Machine-readable key, e.g. `"alliance"` |
| `Label` | string | Display name, e.g. `"Alliance"` |
| `Type` | enum | `Select`, `MultiSelect`, `Text` |
| `Options` | string[] | Predefined options (JSONB). Empty for `Text` type. |
| `IsFilterable` | bool | Whether this field appears in discovery filters |
| `IsRequired` | bool | Whether character creation requires this field |
| `SortOrder` | int | Display order in the form |

### New Table: `CharacterFieldValues`

Stores a character's answers to game-specific fields. One row per field per character.

| Column | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `CharacterId` | Guid | FK to `Characters` |
| `FieldDefinitionId` | Guid | FK to `GameFieldDefinitions` |
| `Value` | string | Selected value. Pipe-separated (`\|`) for `MultiSelect`. Options must not contain the `\|` character. |

### Changes to `Game`

Add `SchemaStatus` column (enum): `Pending` → `Generating` → `Generated` or `Failed`.

- `Pending`: Game just inserted, AI generation not yet started
- `Generating`: Background task is running
- `Generated`: `GameFieldDefinitions` rows exist and are ready
- `Failed`: AI generation failed; character creation falls back to generic fields

### Changes to `Character`

The columns `MainRole`, `SecondaryRole`, `Rank`, `Region`, `PreferredModes`, `Playstyle` become the **fallback schema** — they remain in the DB but the UI only surfaces them when `SchemaStatus != Generated`. No destructive migration.

**Universal fields** (always present on every character, every game):
`Platform`, `PlatformHandle`, `Name`, `ImageUrl`, `Bio`, `Languages`, `TimeZone`, `ActiveTimes`, `UsesVoiceChat`

---

## 2. AI Generation Flow

### Trigger

Inside `UserGameService.AddUserGameAsync`, after confirming the `Game` row does not yet exist in the database and inserting it. This is the only point in the application where a new `Game` row is created — making it the single, correct trigger.

The `POST /api/user-games` response returns immediately with the created `UserGame`. The user does not wait for AI generation.

### Background Task

1. Set `Game.SchemaStatus = Generating`
2. Call Claude API (`claude-haiku-4-5` by default; `claude-sonnet-4-6` for higher quality) with the game's `Name`, `Description`, `Genres`, `Tags`, and `Platforms` already stored on the `Game` row — no additional RAWG call needed
3. Parse the structured JSON response
4. Validate each field definition (key is non-empty, options list is non-empty for Select/MultiSelect types)
5. Insert `GameFieldDefinitions` rows
6. Set `Game.SchemaStatus = Generated`

If Claude returns invalid JSON or the call fails: set `SchemaStatus = Failed`, log the error. A future admin endpoint can retry generation manually.

### Claude Prompt Contract

**System prompt:**
> You are a gaming expert helping build a multiplayer matchmaking platform. Given a game's details, return a JSON array of character field definitions that players would use to find compatible teammates. Prioritize fields with enumerable options (server region, class, role, faction) over free-text fields. Return only valid JSON — no explanation.

**User message includes:** game name, description, genres, platforms, tags.

**Expected response shape:**
```json
[
  {
    "key": "server",
    "label": "Server",
    "type": "Select",
    "options": ["NA", "EU"],
    "isFilterable": true,
    "isRequired": true,
    "sortOrder": 1
  },
  {
    "key": "alliance",
    "label": "Alliance",
    "type": "Select",
    "options": ["Ebonheart Pact", "Aldmeri Dominion", "Daggerfall Covenant"],
    "isFilterable": true,
    "isRequired": true,
    "sortOrder": 2
  }
]
```

### Anthropic API Setup

Developers and production deployments require a separate Anthropic API account — distinct from the Claude Pro ($20/month) subscription used for Claude Code.

**Setup steps:**
1. Create an account at console.anthropic.com
2. Navigate to **Settings → Billing** and add a payment method
3. Navigate to **Settings → Limits** and set a **monthly spend limit of $5** — the API returns errors rather than charging beyond this cap
4. Optionally set an email alert at $3 to get advance warning
5. Navigate to **API Keys** and create a key named `partyup-prod` (or `partyup-dev`)
6. Add the key to `apps/api/appsettings.Development.json` as `"Anthropic": { "ApiKey": "..." }` and to production secrets — never commit it

**Expected cost:** Under $0.01 per unique game added. A $5/month cap is more than sufficient for any realistic usage volume.

---

## 3. API Changes

### New Endpoint: `GET /api/games/{gameId}/field-definitions`

Returns the field schema for a game. Called by the frontend before rendering the character creation wizard.

**Response:**
```json
{
  "schemaStatus": "Generated",
  "fields": [
    {
      "key": "server",
      "label": "Server",
      "type": "Select",
      "options": ["NA", "EU"],
      "isFilterable": true,
      "isRequired": true,
      "sortOrder": 1
    }
  ]
}
```

When `schemaStatus` is `Pending` or `Generating`, `fields` is an empty array — the frontend shows a loading state. When `Failed`, `fields` is empty and the frontend renders the generic fallback form.

### Updated: `POST /api/characters`

`CreateCharacterRequest` gains a `GameFields` list for game-specific values:

```json
{
  "platformHandle": "KylePep#1234",
  "name": "Kaelan",
  "platform": "PC",
  "gameFields": [
    { "key": "server", "value": "NA" },
    { "key": "alliance", "value": "Ebonheart Pact" }
  ]
}
```

The service validates each submitted value against the allowed `Options` in the corresponding `GameFieldDefinition` before inserting `CharacterFieldValues` rows. Invalid values return `400 Bad Request`.

### Updated: `GET /api/characters/discover`

Gains optional filter query params keyed by field definition key:

```
GET /api/characters/discover?gameId=xxx&server=NA&alliance=Ebonheart+Pact
```

The service reads query params, cross-references them against `GameFieldDefinitions` for that game (ignoring unrecognized keys), and chains one `.Where()` clause per valid filter:

```csharp
foreach (var filter in validatedFilters)
{
    query = query.Where(c =>
        c.FieldValues.Any(fv =>
            fv.FieldDefinition.Key == filter.Key &&
            fv.Value == filter.Value));
}
```

No filters applied = existing behavior, all characters returned.

### New Endpoint: `POST /api/characters/image`

Accepts a multipart form upload, stores the image in Google Cloud Storage, returns the public URL.

```json
{ "url": "https://storage.googleapis.com/partyup-characters/characters/{characterId}/{timestamp}.webp" }
```

Storage path: `characters/{uploadId}/{timestamp}.{ext}` where `uploadId` is a server-generated UUID at upload time — the character does not yet exist when the image is uploaded. Bucket: `partyup-characters`, public-read ACL so URLs work directly in `<img>` tags without signed URLs.

### Updated: `POST /api/user-games`

After inserting a new `Game` row, fires the background AI generation task. No change to the response shape or timing from the caller's perspective.

---

## 4. Frontend Changes

### Dynamic Character Creation Wizard

On entering the character creation flow for a game, the wizard calls `GET /api/games/{gameId}/field-definitions` before rendering.

**`schemaStatus: Generated`** — the wizard renders dynamically:
- Universal fields always shown: `PlatformHandle`, `Name`, `ImageUrl` (now a file picker — see below), `Bio`, `Languages`, `TimeZone`, `ActiveTimes`, `UsesVoiceChat`
- Game-specific fields rendered from the `fields` array in `sortOrder` sequence
- `Select` fields → dropdown
- `MultiSelect` fields → chip/multi-select input
- `Text` fields → text input (rare fallback)

**`schemaStatus: Pending` / `Generating`** — show a loading state: *"Setting up character fields for this game…"* Poll `GET /api/games/{gameId}/field-definitions` every 3 seconds, up to 10 attempts (30 seconds total). If still not `Generated` after 10 attempts, treat as `Failed` and render the generic fallback form.

**`schemaStatus: Failed`** — render the existing 4-step generic wizard with no changes.

### Discovery Filter Bar

Above the swipe card stack in `DiscoveryPanel`, a collapsible filter bar renders one dropdown per `isFilterable` field for the current game. Selecting a value re-fetches the discovery queue with filter params appended. Clearing all filters returns to the unfiltered queue.

### Image Upload

The `ImageUrl` text input in the wizard's identity step is replaced by a file picker. On file selection:

1. Frontend calls `POST /api/characters/image` with the file as multipart form data
2. API uploads to GCS and returns the public URL
3. Frontend stores the URL in form state
4. Character creation proceeds normally with the URL as `ImageUrl`

The file picker accepts common image formats (jpg, png, webp). Client-side validation caps file size at 5MB before upload.

---

## 5. Seeding at Scale

### New Seed Command

```bash
dotnet run --project apps/tools/PartyUp.SeedRunner -- Scale --game "Elder Scrolls Online" --users 100
```

### Behavior

1. Creates N users (`testuser1` through `testuser{N}`) with a shared known password
2. Looks up the specified game in the DB — must exist with `SchemaStatus: Generated`
3. For each user, creates one character with field values randomly sampled from the real `GameFieldDefinitions` options for that game
4. Seeds `CharacterInteractions`: ~60% of characters have swiped on a random subset of others, with ~30% of those swipes being mutual likes — generating pre-existing `CharacterMatches`

### Hardcoded Fallback Schemas

The seeder ships with hardcoded field schemas for ESO and FFXIV so scale seeding works in local dev and CI without an Anthropic API key. These mirror what the AI would reasonably generate for those games.

---

## 6. Out of Scope

- Real-time match notifications (SignalR) — future feature
- Admin UI for retrying failed schema generation — console/endpoint only for now
- Character editing endpoint (service method exists; wire-up is a separate small task)
- Steam library import

