# TS Fixes + HTML Description Rendering

**Date:** 2026-05-29

## Overview

Fix three pre-existing TypeScript errors across `RealmCard`, `NavBar`, and `RealmPage`, and apply the existing `DOMPurify` HTML-rendering pattern (already used in `RealmRightPage`) to the game description in `GamesPage`.

## Fixes

### RealmCard.tsx — `string | null` vs `string | undefined`

`LandCard.imageUrl` is typed `string | undefined`. `UserGame.gameImageUrl` is `string | null`. Fix with null-coalescing:

```tsx
imageUrl={userGame.gameImageUrl ?? undefined}
```

### NavBar.tsx — implicit `any[]`

`navLinks` is an empty array literal with no type annotation. TypeScript cannot infer the element shape. Fix with an explicit type:

```ts
const navLinks: { to: string; label: string }[] = []
```

### RealmPage.tsx — missing `textColor` on tabs

`BinderTabDef` requires `textColor`. All three tab background colors are dark, so `"#ffffff"` is correct for all:

```tsx
{ label: 'My Cards',   textColor: "#ffffff", color: '#991b1b', to: "/characters" },
{ label: 'Games',      textColor: "#ffffff", color: '#1e40af', to: "/games" },
{ label: 'Collection', textColor: "#ffffff", color: '#166534', to: "/matches" },
```

### GamesPage.tsx — sanitized HTML for description

The game description from RAWG can contain HTML markup. `RealmRightPage` already uses `DOMPurify.sanitize()` + `dangerouslySetInnerHTML` for the same field. Apply the same pattern in `GamesPage`.

Add import:
```ts
import DOMPurify from 'dompurify'
```

Replace the plain `<p>` description render with:
```tsx
<div
  className="text-xs font-mono text-muted"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedDetail.description) }}
/>
```

`DOMPurify` is already installed (used by `RealmRightPage`). No new dependencies.

## Scope

| File | Change |
|---|---|
| `apps/web/src/components/cards/RealmCard.tsx` | `?? undefined` on imageUrl |
| `apps/web/src/components/layout/NavBar.tsx` | Explicit type on `navLinks` |
| `apps/web/src/pages/RealmPage.tsx` | Add `textColor` to all three tabs |
| `apps/web/src/pages/GamesPage.tsx` | Import DOMPurify, use `dangerouslySetInnerHTML` for description |
