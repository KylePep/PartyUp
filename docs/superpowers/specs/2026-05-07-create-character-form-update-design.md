# Create Character Form Update

**Date:** 2026-05-07
**Scope:** `CreateCharacterPage.tsx` + `characters.ts` API types

## Goal

Update the character creation form to cover all fields on the new `Character` model. The model added `Platform`, `PlatformHandle`, `ImageUrl`, `MainRole`, `SecondaryRole`, `PreferredModes`, `TimeZone`, `ActiveTimes`, `UsesVoiceChat`, and `Languages`, and removed `Nickname`.

## Layout

Single scrolling column. Fields grouped under five labeled section dividers using the existing neon-line + mono uppercase style from the page header.

```
// IDENTITY      Platform, PlatformHandle, Name, ImageUrl
// ABOUT         Bio
// GAMEPLAY      MainRole, SecondaryRole, PreferredModes, Playstyle, Rank, Region
// AVAILABILITY  TimeZone, ActiveTimes, UsesVoiceChat
// LANGUAGES     Languages
```

## Field Specs

### // IDENTITY
| Field | Input | Required | Notes |
|---|---|---|---|
| Platform | Single-select pills | Yes | PC, PlayStation, Xbox, Nintendo Switch, Mobile |
| PlatformHandle | Text input | Yes | e.g. "KylePep#1234" |
| Name | Text input | Yes | maxLength 50, existing field |
| ImageUrl | Text input | No | maxLength 500, plain URL paste |

### // ABOUT
| Field | Input | Required | Notes |
|---|---|---|---|
| Bio | Textarea | No | maxLength 1000, existing field (was 280 — update counter) |

### // GAMEPLAY
| Field | Input | Required | Notes |
|---|---|---|---|
| MainRole | Single-select pills | No | Tank, DPS, Support, Healer, Assassin, Marksman, Flex |
| SecondaryRole | Single-select pills | No | Same options as MainRole |
| PreferredModes | Multi-select pills | No | Ranked, Casual, Co-op, Story, PvP, PvE, Battle Royale |
| Playstyle | Single-select pills | No | Existing options |
| Rank | Single-select pills | No | Existing options |
| Region | Single-select pills | No | Existing options |

### // AVAILABILITY
| Field | Input | Required | Notes |
|---|---|---|---|
| TimeZone | Text input | No | e.g. "EST", "UTC+9" |
| ActiveTimes | Multi-select pills | No | Morning, Afternoon, Evening, Late Night |
| UsesVoiceChat | Three-state pill row | No | Yes / No / unset — maps to `bool?` |

### // LANGUAGES
| Field | Input | Required | Notes |
|---|---|---|---|
| Languages | Multi-select pills | No | English, Spanish, French, German, Portuguese, Japanese, Korean, Chinese, Arabic, Russian |

## Pill Toggle Behavior

- **Single-select:** clicking the selected pill deselects it (returns to empty/unset).
- **Multi-select:** each pill toggles independently; result is an array of selected strings.
- **UsesVoiceChat:** renders as two pills (Yes / No); clicking the active one deselects, leaving `undefined` (unset).

## Validation

Submit button is disabled when any of the three required fields (`name`, `platform`, `platformHandle`) are empty or whitespace. Existing error display is unchanged.

## Files Changed

### `apps/web/src/api/endpoints/characters.ts`
- Update `Character` type: add `platform`, `platformHandle`, `imageUrl`, `mainRole`, `secondaryRole`, `preferredModes`, `timeZone`, `activeTimes`, `usesVoiceChat`, `languages`; remove `nickname`.
- Update `CharacterCreate` type to match.

### `apps/web/src/pages/CreateCharacterPage.tsx`
- Add state variables for all new fields.
- Replace flat field list with five labeled sections.
- Expand `handleSubmit` submit guard and payload to include all new fields.
- Update Bio `maxLength` from 280 to 1000 and update the character counter accordingly.

## Out of Scope

- No file upload for `ImageUrl` — plain URL text input only.
- No changes to `UpdateCharacterPage` (does not exist yet).
- No changes to backend.
