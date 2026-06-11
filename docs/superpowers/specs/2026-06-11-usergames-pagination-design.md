# UserGames Pagination Design

**Date:** 2026-06-11
**Branch:** feat-Demo-seeder (to be continued on a new feature branch)

## Summary

Add server-side pagination to the userGames endpoint and a sticky-row stacking gallery layout to the frontend. All galleries will eventually share this pattern — the Gallery component becomes the standard vehicle.

---

## Backend

### Endpoint

`GET /api/user-games?page=1&pageSize=12`

- `page`: 1-based, defaults to 1, must be ≥ 1
- `pageSize`: defaults to 12, clamped to 1–50

### Shared DTO

New generic `PagedResult<T>` record placed in `Models/DTOs/`:

```csharp
public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
```

### Service

`IUserGameService.GetUserGames(Guid userId, int page, int pageSize)` returns `Task<PagedResult<UserGame>>`.

Implementation applies:
1. `COUNT(*)` query for `TotalCount`
2. `.Skip((page - 1) * pageSize).Take(pageSize)` for `Items`

Existing ordering (`CreatedAt DESC`) is preserved.

### Controller

`GetUserGames()` reads `page` and `pageSize` from query string, passes them to the service, and returns `Ok(PagedResult<UserGameResponse>)`. The `ToResponse` mapping and `GetNewMatchCountsByUserGameAsync` call apply only to the current page's items.

---

## Frontend

### API Layer

`getUserGames({ page, pageSize }: { page: number; pageSize: number })` returns `Promise<PagedResult<UserGame>>`.

`PagedResult<T>` TypeScript type:
```typescript
interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}
```

### Gallery Component

`Gallery<T>` gains one new optional prop:

```typescript
stickyRows?: boolean  // default false
```

**When `stickyRows` is false (default):** current flat-grid layout unchanged.

**When `stickyRows` is true:**
- Items are chunked into groups of 3 (desktop column count)
- Each chunk renders as a row div with `lg:sticky lg:top-0` and `zIndex: rowIndex + 1`
- Row inner layout: `grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 py-2`
- On mobile: no sticky, rows are normal divs in a single-column scroll
- On desktop: rows accumulate at top as user scrolls — later rows slide over earlier ones via incrementing z-index
- Outer scroll container retains `overflow-y-auto`

No `columns` prop. Column count is always CSS-driven (1 on mobile, 3 on desktop at `lg:` breakpoint).

### PaginationControls Component

New shared component at `src/components/ui/PaginationControls.tsx`.

Props:
```typescript
interface PaginationControlsProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}
```

Renders inside the page's header bar (caller decides placement). Displays:
- Range label: `1–12 of 100` (or `13–24 of 100` etc.)
- Prev `‹` button — disabled on page 1
- Next `›` button — disabled on last page

Styling matches the existing monospace/uppercase aesthetic of the header bar.

### GamesPage Changes

**New state:**
```typescript
const [page, setPage] = useState(1)
const [totalCount, setTotalCount] = useState(0)
const pageSize = 12
```

**Effect:** re-runs on `[targetId, page]`. On each fetch, sets `games` from `result.items` and `totalCount` from `result.totalCount`.

**Scroll reset on page change:** pass `key={page}` to `<Gallery>` — React remounts the component on page change, which naturally resets its internal scroll position to 0. No ref management needed.

**Selected game:** persists across page changes. A game selected on page 1 stays visible in the left panel while the user browses page 2, 3, etc. Selection only changes when the user explicitly clicks a different card or deletes the selected game.

**After delete:**
- Re-fetch the current page
- If the deleted game was selected, clear `selected`
- If current page is now empty and `page > 1`, decrement `page` by 1 (triggers re-fetch via effect)

**Header div:** `PaginationControls` added alongside the existing title `h2`. Layout: title on the left, controls on the right (flex row, space-between).

**Gallery call:** `<Gallery ... stickyRows />` (stickyRows enabled for the games gallery).

---

## File Checklist

**Backend:**
- `Models/DTOs/PagedResult.cs` — new
- `Services/Interfaces/IUserGameService.cs` — update `GetUserGames` signature
- `Services/UserGameService.cs` — update `GetUserGames` implementation
- `Controllers/UserGamesController.cs` — update `GetUserGames` action

**Frontend:**
- `src/api/endpoints/userGames.ts` — update `getUserGames` function + add `PagedResult` type
- `src/components/Gallery.tsx` — add `stickyRows` prop + chunked sticky-row layout
- `src/components/ui/PaginationControls.tsx` — new component
- `src/components/ui/index.ts` — export `PaginationControls`
- `src/pages/GamesPage.tsx` — add pagination state, update effect, update header, pass `stickyRows`

---

## Out of Scope

- Other gallery pages (characters, matches) — pagination can be added to those separately using the same Gallery pattern once validated here
- Infinite scroll / virtual windowing
- URL-synced page param (the `?id=` param already exists; `?page=` can be added later)
