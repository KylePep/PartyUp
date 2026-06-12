# Popular Realms — Design Spec

**Date:** 2026-06-12

## Summary

Add a "Popular Realms" panel to the right-hand side of the HomePage and LandingPage (desktop only). It displays the top 6 games by userGame count as floating circular orbs, matching the visual style of planets inside the ScryingOrb (circular image, arc SVG name label, bobbing animation, count badge).

## Backend

### New method: `IGameService` / `GameService`

```
Task<IEnumerable<PopularGameResult>> GetPopularGames(int limit)
```

- Queries `UserGames`, groups by `GameId`, orders by count descending, takes `limit` rows.
- Includes `Game` navigation property to return name and image URL.
- Returns a new DTO: `PopularGameResult { Guid Id, string Name, string? ImageUrl, int UserGameCount }`.

### New endpoint: `GET /api/games/popular`

- On `GamesController`, no `[Authorize]` (public — needed by LandingPage).
- Query param `limit` defaults to 6.
- Calls `_service.GetPopularGames(limit)` and returns the result as JSON.

## Frontend

### New type + API function (`games.ts`)

```ts
export type PopularGame = {
  id: string;
  name: string;
  imageUrl: string | null;
  userGameCount: number;
};

export function getPopularGames(limit = 6): Promise<PopularGame[]>
// GET /api/games/popular?limit=6
```

### New hook: `usePopularGames()`

- Lives in `src/hooks/usePopularGames.ts`.
- Fetches on mount, holds `{ games: PopularGame[], status: 'loading' | 'success' | 'error' }`.
- Same pattern as `useUserGames`.

### Extracted component: `GamePlanet`

- Moved from `ScryingOrb.tsx` to `src/components/orb/GamePlanet.tsx`.
- Props: `game: { name, imageUrl }`, `index: number`, `imgSize: number`, `onSelect: (game) => void`, `count?: number`.
- When `count` is provided, renders a small circular badge (cyan bg, dark text) at the top-right of the circle.
- `ScryingOrb.tsx` imports `GamePlanet` from the new location — no behavioural change.

### New component: `PopularRealms`

- Lives at `src/components/PopularRealms.tsx`.
- Props: `onSelect: (game: PopularGame) => void`.
- Uses `usePopularGames()`. Loading → `<Spinner />`. Empty → renders nothing.
- Renders up to 6 `GamePlanet`s in a `flex flex-wrap` layout, each with `count={game.userGameCount}`.
- `imgSize` is a fixed reasonable size (e.g. 64px) — not responsive/measured like the orb.

## Layout

### Positioning

`PopularRealms` is absolutely positioned within the page `<main>`: `absolute right-0 top-0 bottom-0`, hidden on mobile (`hidden md:flex`). It does not affect the existing binder shell width or layout.

### HomePage

- Mounts `PopularRealms` inside the existing `<main>`.
- `onSelect` opens an "Add Realm" confirmation modal (same flow as selecting a planet in the ScryingOrb — show game name, confirm, call `userGames.addUserGame`).

### LandingPage

- Mounts `PopularRealms` inside the landing page `<main>` (or equivalent wrapper).
- `onSelect` opens the existing `AuthModal`.

## Out of Scope

- Clicking a popular realm on the home page does not navigate to the realm page — it only prompts adding.
- No pagination or "see more" for popular realms.
- No caching or background refresh beyond the initial mount fetch.
