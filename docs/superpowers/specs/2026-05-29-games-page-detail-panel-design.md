# GamesPage — Game Detail Panel

**Date:** 2026-05-29

## Overview

When the user selects a game on the GamesPage, fetch the full game record from the database and display the extra fields (description, rating, platforms, website) in the existing left-side `LandCard` children slot. The name + image render immediately (optimistic); detail fields appear once the fetch resolves.

## State

Two new state variables added to `GamesPage`:

| Variable | Type | Purpose |
|---|---|---|
| `selectedDetail` | `UserGameDetail \| null` | Rich data returned by the detail fetch |
| `detailLoading` | `boolean` | True while fetch is in flight |

## Data Flow

```
User clicks game card
  → setSelected(game)           // immediate — name + image paint now
  → setSelectedDetail(null)     // clear stale detail from prior selection
  → setDetailLoading(true)
  → getUserGameByGameId(game.gameId)   // existing API fn in userGames.ts
      .then(d => setSelectedDetail(d))
      .finally(() => setDetailLoading(false))
```

`getUserGameByGameId` hits `GET /api/user-games/{gameId}/game` which returns `UserGameDetailResponse` (description, website, rating, platforms). No backend changes required.

## Left Panel — LandCard Children Layout

Fields rendered top-to-bottom inside the `children` slot:

1. **Description** — `selectedDetail.description` as a `text-xs font-mono` paragraph. While `detailLoading && !selectedDetail`, render two shimmer lines (`animate-pulse bg-muted/30 rounded h-3`) as a placeholder. Skip entirely if description is null/empty after load.
2. **Rating** — `★ {rating}` inline if `rating > 0`, otherwise omitted.
3. **Platforms** — platform names joined with ` • ` separator in the same small mono style; omitted if empty array.
4. **Website** — `<a>` link opening in a new tab if non-null, omitted otherwise.
5. **"Added [date]"** — unchanged from current implementation.
6. **Enter Realm + Delete buttons** — unchanged from current implementation.

## Scope

- **One file changed:** `apps/web/src/pages/GamesPage.tsx`
- No new components
- No backend changes
- No changes to `LandCard`, `userGames.ts`, or any other file
