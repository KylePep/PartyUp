# EVA commonField Mapping — Design Spec

**Date:** 2026-05-29  
**Status:** Approved  
**Related:** [TCG Card Standardization](2026-05-29-tcg-card-standardization-design.md)

---

## Problem

EVA (the Anthropic-powered field definition generator) produces game-accurate field labels — "Job" for FFXIV, "Class" for ESO, "Free Company" for guild affiliation. These names are correct and must be preserved. The problem is the frontend card system can't use them predictably: it can't know that "Job" and "Class" both belong in the same card slot.

`commonField` solves this by adding a normalized slot identifier to each field definition — a backend hint the frontend uses to find the right card zone without touching the display label.

---

## Canonical commonField Identifiers

These seven values are the complete, closed list. Claude assigns one only where the mapping is unambiguous.

| Identifier | Maps from |
|---|---|
| `class_slot` | class, job, spec, profession, archetype |
| `level_slot` | level, item level, gear score, power level, rank |
| `faction_slot` | faction, alliance, free company, guild type, clan |
| `role_slot` | role, position, party role, main role |
| `build_slot` | build, spec, playstyle focus, loadout style |
| `server_slot` | server, realm, world, data center |
| `playstyle_slot` | playstyle, game mode preference, PvE/PvP focus |

The `_slot` suffix is intentional: it marks these as card rendering containers, not game vocabulary. No game ships a player profile field called "class_slot."

---

## Design

### 1. Data Model

**`GameFieldDefinition` entity** (`apps/api/Models/GameFieldDefinition.cs`):
- Add `public string? CommonField { get; set; }` — nullable; most fields will not have one.

**`GameFieldDefinitionDto`** (`apps/api/Models/DTOs/Game/GameFieldDefinitionDto.cs`):
- Add `string? CommonField` — exposed to the frontend as-is.

**Database**: New nullable `text` column `CommonField` on the `GameFieldDefinitions` table via EF Core migration. No database-level enum constraint — unexpected values store cleanly.

---

### 2. Prompt Changes

#### System Prompt — new rule (appended to existing Rules list)

> `commonField` values are card rendering slot identifiers — never use them as a `key` or `label`. Game-specific terminology always takes precedence in those fields.

This guard rule works because the `_slot` identifiers are not game vocabulary and will never appear naturally as field labels.

#### User Prompt — two-phase structure

The existing field generation instructions become **Phase 1**, unchanged. **Phase 2** is appended after the JSON schema description:

> **Phase 2:** After finalizing the fields above, optionally annotate each with a `commonField` from this exact list: `class_slot`, `level_slot`, `faction_slot`, `role_slot`, `build_slot`, `server_slot`, `playstyle_slot`. Assign one only where the mapping is unambiguous. Omit `commonField` entirely if no slot fits — do not force a mapping. The `commonField` is a backend normalization hint only and must not influence the `label` or `key` chosen in Phase 1.

#### JSON schema in user prompt — updated field list

Add `commonField` as an optional property to the return schema description:

```
key (string, camelCase), label (string, display name),
type (one of: Select, MultiSelect, Text), options (string array, empty for Text),
isFilterable (bool), isRequired (bool), sortOrder (int starting at 1),
commonField (string or null — omit if no slot applies, must be one of the seven identifiers above)
```

---

### 3. Service & Parsing

**`AnthropicService.cs`**: The anonymous deserialization target for the Claude JSON response gains `string? CommonField`. No extra parsing logic — if Claude omits the property, it deserializes as null.

**`GameFieldDefinitionService.SaveDefinitionsAsync`**: Maps `CommonField` through in the existing field→entity mapping pass. No validation or filtering — unexpected values store without error.

---

## Out of Scope

- Frontend card slot rendering driven by `commonField` — separate task, depends on this data being available.
- Enforcement of the closed identifier list at the API or database layer.
- Retroactive re-generation of field definitions for existing games (users can trigger `/regenerate-schema` manually if desired).
