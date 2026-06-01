# commonField Card Rendering — Design Spec

**Date:** 2026-05-30
**Status:** Approved
**Related:** [EVA commonField Mapping](2026-05-29-eva-commonfield-mapping-design.md), [TCG Card Standardization](2026-05-29-tcg-card-standardization-design.md)

---

## Problem

`commonField` slot identifiers now exist on `GameFieldDefinition` and flow through the field-definitions API. But when a character's field values are returned (via `CharacterFieldValueDto`), `commonField` is not included — the frontend receives `key`, `label`, `value`, and `type` but has no way to identify which slot a field belongs to. As a result, `CharacterCard` cannot use game-specific fields in card rendering.

---

## Design

### 1. Backend — `CharacterFieldValueDto`

Add one nullable property:

```csharp
public string? CommonField { get; set; }
```

Map it in `CharacterService` where the `CharacterFieldValueDto` projection is built:

```csharp
GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
{
    FieldDefinitionId = fv.FieldDefinitionId,
    Key = fv.FieldDefinition.Key,
    Label = fv.FieldDefinition.Label,
    Value = fv.Value,
    Type = fv.FieldDefinition.Type.ToString(),
    CommonField = fv.FieldDefinition.CommonField      // ← new
}).ToList()
```

No route changes. `commonField` flows through the existing `GameFields` JSON array on every character response endpoint.

---

### 2. Frontend — `CharacterGameField` type

In `apps/web/src/api/endpoints/characters.ts`, add one optional property:

```typescript
export type CharacterGameField = {
  fieldDefinitionId: string;
  key: string;
  label: string;
  value: string;
  type: string;
  commonField?: string;   // ← new
};
```

---

### 3. Frontend — `CharacterCard` rendering

In `apps/web/src/components/cards/CharacterCard.tsx`, derive slot values from `character.gameFields`:

```typescript
const classField = character.gameFields.find(gf => gf.commonField === 'class_slot')
const levelField = character.gameFields.find(gf => gf.commonField === 'level_slot')
```

**`statsLine`** — game name + class slot, formatted as a single type-line:

```typescript
const statsLine = (
  <span className="text-xs text-muted font-semibold">
    {[character.gameName, classField?.value].filter(Boolean).join(' · ')}
  </span>
)
```

**`bottomStat`** — level slot value, passed as a string:

```typescript
const bottomStat = levelField?.value
```

**`subtitle`** — kept wired in `StandardTcgCard` but not populated; passes `undefined`. Reserved for future use (e.g. platform handle).

**Remaining slots** (`role_slot`, `faction_slot`, `build_slot`, `server_slot`, `playstyle_slot`) — present in the data, not rendered yet. No changes needed for them in this spec.

---

## Out of Scope

- Rendering `role_slot`, `faction_slot`, `build_slot`, `server_slot`, `playstyle_slot` on cards — future task.
- Any changes to `DiscoverCharacterResponse` projection — same `CharacterFieldValueDto` type is used, so it gets `commonField` for free.
- `StandardTcgCard` prop changes — no new props needed.
