# UserGames Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side pagination (12/page) to the userGames API and a sticky-row stacking gallery with pagination controls to the frontend.

**Architecture:** Generic `PagedResult<T>` wraps the existing `UserGameResponse` on the backend. The `Gallery<T>` component gains a `stickyRows` prop that chunks items into rows of 3 and makes each row `lg:sticky lg:top-0` with incrementing z-index. A new `PaginationControls` shared component renders the count label and prev/next buttons; `GamesPage` places it in the existing header div and manages page state.

**Tech Stack:** ASP.NET Core 8 (EF Core), xUnit + FluentAssertions (integration tests), React + TypeScript + Tailwind CSS

---

## File Map

**Backend — create:**
- `apps/api/Models/DTOs/PagedResult.cs` — generic `PagedResult<T>` record

**Backend — modify:**
- `apps/api/Services/Interfaces/IUserGameService.cs:7` — add `page`/`pageSize` params to `GetUserGames`
- `apps/api/Services/UserGameService.cs:128-135` — add count + skip/take
- `apps/api/Controllers/UserGamesController.cs:42-50` — read query params, return `PagedResult<UserGameResponse>`

**Backend — tests (modify existing):**
- `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs` — update response deserialization + add pagination tests

**Frontend — create:**
- `apps/web/src/components/ui/PaginationControls.tsx` — prev/next buttons + count label

**Frontend — modify:**
- `apps/web/src/components/ui/index.ts` — export `PaginationControls`
- `apps/web/src/components/Gallery.tsx` — add `stickyRows` prop + chunked sticky-row layout
- `apps/web/src/api/endpoints/userGames.ts` — add `PagedResult<T>` type, update `getUserGames` signature
- `apps/web/src/hooks/useUserGames.ts` — update call to `getUserGames(1, 12)` and extract `.items`
- `apps/web/src/pages/CharacterPage.tsx:31` — update call to `getUserGames(1, 12)` and extract `.items`
- `apps/web/src/pages/GamesPage.tsx` — add `page`/`totalCount` state, update effect, update header

---

## Task 1: Add `PagedResult<T>` DTO

**Files:**
- Create: `apps/api/Models/DTOs/PagedResult.cs`

- [ ] **Step 1: Create the file**

```csharp
namespace PartyUp.Api.Models.DTOs;

public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/Models/DTOs/PagedResult.cs
git commit -m "feat: add generic PagedResult<T> DTO"
```

---

## Task 2: Update UserGameService

**Files:**
- Modify: `apps/api/Services/Interfaces/IUserGameService.cs`
- Modify: `apps/api/Services/UserGameService.cs`

- [ ] **Step 1: Update the interface**

In `apps/api/Services/Interfaces/IUserGameService.cs`, replace line 7:

```csharp
Task<List<UserGame>> GetUserGames(Guid userId);
```

with:

```csharp
Task<PagedResult<UserGame>> GetUserGames(Guid userId, int page, int pageSize);
```

The full file should look like:

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.UserGame;

public interface IUserGameService
{
  Task<AddGameResult> AddGameToUser(Guid userId, AddUserGameRequest request);
  Task<PagedResult<UserGame>> GetUserGames(Guid userId, int page, int pageSize);
  Task<UserGame?> GetUserGameByGameId(Guid userId, Guid gameId);
  Task<bool> DeleteUserGame(Guid id, Guid userId);
}
```

- [ ] **Step 2: Update the service implementation**

In `apps/api/Services/UserGameService.cs`, replace the `GetUserGames` method (lines 128–135):

```csharp
public async Task<PagedResult<UserGame>> GetUserGames(Guid userId, int page, int pageSize)
{
    var query = _db.UserGames
        .Where(ug => ug.UserId == userId)
        .Include(ug => ug.Game)
        .OrderByDescending(ug => ug.CreatedAt);

    var totalCount = await query.CountAsync();
    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return new PagedResult<UserGame>(items, totalCount, page, pageSize);
}
```

- [ ] **Step 3: Verify the project builds**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded with 0 errors.

---

## Task 3: Update Controller + Fix Tests

**Files:**
- Modify: `apps/api/Controllers/UserGamesController.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`

- [ ] **Step 1: Update the controller action**

In `apps/api/Controllers/UserGamesController.cs`, replace the `GetUserGames` action (lines 42–50):

```csharp
[HttpGet]
public async Task<IActionResult> GetUserGames([FromQuery] int page = 1, [FromQuery] int pageSize = 12)
{
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 50) pageSize = 12;

    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _service.GetUserGames(userId, page, pageSize);
    var ids = result.Items.Select(g => g.Id).ToList();
    var counts = await _matchNotifications.GetNewMatchCountsByUserGameAsync(userId, ids);

    var items = result.Items.Select(g => ToResponse(g, counts.GetValueOrDefault(g.Id, 0)));
    return Ok(new PagedResult<UserGameResponse>(items, result.TotalCount, result.Page, result.PageSize));
}
```

Add the using at the top of the file:

```csharp
using PartyUp.Api.Models.DTOs;
```

- [ ] **Step 2: Write failing pagination tests**

In `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`, add two new test methods before the closing `}` of the class (before the private records at the bottom).

> **Note:** The realm limit is 10 games per user. Use `pageSize=5` with 8 total games so both tests stay within the limit.

```csharp
[Fact]
public async Task GetUserGames_ReturnsPaginatedResult()
{
    var client = await CreateAuthenticatedClientAsync();

    // Add 8 games (within the 10-game realm limit)
    for (var i = 0; i < 8; i++)
    {
        var id = Interlocked.Increment(ref _gameCounter);
        var r = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });
        r.EnsureSuccessStatusCode();
    }

    var response = await client.GetAsync("/api/user-games?page=1&pageSize=5");
    response.StatusCode.Should().Be(HttpStatusCode.OK);

    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();
    result!.TotalCount.Should().Be(8);
    result.Page.Should().Be(1);
    result.PageSize.Should().Be(5);
    result.Items.Should().HaveCount(5);
}

[Fact]
public async Task GetUserGames_Page2_ReturnsRemainder()
{
    var client = await CreateAuthenticatedClientAsync();

    for (var i = 0; i < 8; i++)
    {
        var id = Interlocked.Increment(ref _gameCounter);
        var r = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });
        r.EnsureSuccessStatusCode();
    }

    var response = await client.GetAsync("/api/user-games?page=2&pageSize=5");
    response.StatusCode.Should().Be(HttpStatusCode.OK);

    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();
    result!.TotalCount.Should().Be(8);
    result.Page.Should().Be(2);
    result.Items.Should().HaveCount(3);
}
```

- [ ] **Step 3: Add `PagedResultDto<T>` record to the test file**

In `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs`, add to the private records section at the bottom of the class:

```csharp
private record PagedResultDto<T>(IEnumerable<T> Items, int TotalCount, int Page, int PageSize);
```

- [ ] **Step 4: Update existing tests that deserialize `List<UserGameDto>`**

The tests `GetUserGames_ReturnsOwnGames`, `DeleteUserGame_RemovesGame`, `GetUserGames_DoesNotReturnOtherUsersGames`, and `GetUserGames_AfterMutualMatch_HasNewMatchCount` all read the response as `List<UserGameDto>` or `List<UserGameWithCountDto>`. Update each one:

**`GetUserGames_ReturnsOwnGames`** — change:
```csharp
var games = await response.Content.ReadFromJsonAsync<List<UserGameDto>>();
games.Should().ContainSingle();
```
to:
```csharp
var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();
result!.Items.Should().ContainSingle();
```

**`DeleteUserGame_RemovesGame`** — change:
```csharp
var games = await response.Content.ReadFromJsonAsync<List<UserGameDto>>();
games.Should().BeEmpty();
```
to:
```csharp
var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();
result!.Items.Should().BeEmpty();
```

**`GetUserGames_DoesNotReturnOtherUsersGames`** — change:
```csharp
var games = await response.Content.ReadFromJsonAsync<List<UserGameDto>>();
games.Should().ContainSingle();
```
to:
```csharp
var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();
result!.Items.Should().ContainSingle();
```

**`GetUserGames_AfterMutualMatch_HasNewMatchCount`** — change:
```csharp
var games = await gamesRes.Content.ReadFromJsonAsync<List<UserGameWithCountDto>>();
games!.Should().ContainSingle(g => g.Id == ugA.Id && g.NewMatchCount == 1);
```
to:
```csharp
var result = await gamesRes.Content.ReadFromJsonAsync<PagedResultDto<UserGameWithCountDto>>();
result!.Items.Should().ContainSingle(g => g.Id == ugA.Id && g.NewMatchCount == 1);
```

- [ ] **Step 5: Run the tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~UserGameTests" --no-build
```

Expected: All tests pass (including the 2 new pagination tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/Services/Interfaces/IUserGameService.cs apps/api/Services/UserGameService.cs apps/api/Controllers/UserGamesController.cs apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs
git commit -m "feat: paginate GET /api/user-games (12/page, PagedResult<T>)"
```

---

## Task 4: PaginationControls Component

**Files:**
- Create: `apps/web/src/components/ui/PaginationControls.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/PaginationControls.tsx
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'

interface PaginationControlsProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function PaginationControls({ page, pageSize, totalCount, onPageChange }: PaginationControlsProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-muted tabular-nums">
        {totalCount === 0 ? '0 of 0' : `${start}–${end} of ${totalCount}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <CaretLeftIcon size={14} />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <CaretRightIcon size={14} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Export from ui/index.ts**

Add to `apps/web/src/components/ui/index.ts`:

```ts
export { PaginationControls } from './PaginationControls'
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/PaginationControls.tsx apps/web/src/components/ui/index.ts
git commit -m "feat: add PaginationControls shared component"
```

---

## Task 5: Gallery — stickyRows Layout

**Files:**
- Modify: `apps/web/src/components/Gallery.tsx`

- [ ] **Step 1: Rewrite Gallery.tsx**

Replace the entire file content:

```tsx
import React from 'react'
import { EmptyState, Spinner } from './ui'

interface GalleryProps<T> {
  items: T[]
  status: 'loading' | 'ready' | 'empty' | 'error'
  getKey: (item: T) => string
  renderItem: (item: T) => React.ReactNode
  emptyMessage?: string
  errorMessage?: string
  stickyRows?: boolean
}

export function Gallery<T>({
  items,
  status,
  getKey,
  renderItem,
  emptyMessage = 'Nothing here yet',
  errorMessage = 'Could not load items',
  stickyRows = false,
}: GalleryProps<T>) {
  if (status === 'loading') return <div className="flex justify-center py-10"><Spinner /></div>
  if (status === 'empty') return <EmptyState message={emptyMessage} />
  if (status === 'error') return <EmptyState message={errorMessage} />

  if (stickyRows) {
    const rows: T[][] = []
    for (let i = 0; i < items.length; i += 3) {
      rows.push(items.slice(i, i + 3))
    }
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="lg:sticky lg:top-0 bg-background"
            style={{ zIndex: rowIndex + 1 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 py-2">
              {row.map(item => (
                <React.Fragment key={getKey(item)}>
                  {renderItem(item)}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 grid-rows-auto lg:grid-rows-2 gap-4 flex-1 min-h-0 p-4 overflow-hidden overflow-y-auto">
      {items.map(item => (
        <React.Fragment key={getKey(item)}>
          {renderItem(item)}
        </React.Fragment>
      ))}
    </div>
  )
}
```

> **Note:** The `bg-background` class on each sticky row is required — without a background, sticky rows are transparent and the scrolling content bleeds through from behind.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Gallery.tsx
git commit -m "feat: add stickyRows prop to Gallery component"
```

---

## Task 6: Wire Pagination into GamesPage

**Files:**
- Modify: `apps/web/src/api/endpoints/userGames.ts`
- Modify: `apps/web/src/pages/GamesPage.tsx`

- [ ] **Step 1: Update the API endpoint**

In `apps/web/src/api/endpoints/userGames.ts`, add the `PagedResult` type and update `getUserGames`:

Add after the existing type definitions (after line 35):

```ts
export type PagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}
```

Replace the existing `getUserGames` function:

```ts
export function getUserGames(page: number, pageSize: number): Promise<PagedResult<UserGame>> {
  return apiGet<PagedResult<UserGame>>(`/user-games?page=${page}&pageSize=${pageSize}`)
}
```

- [ ] **Step 2: Update `useUserGames` hook**

`useUserGames` is used by `HomePage` and needs all of the user's games (not a page). Since the realm limit caps users at 10 games, calling page 1 with `pageSize=12` always returns everything.

Replace the entire file `apps/web/src/hooks/useUserGames.ts`:

```ts
import { useEffect, useState } from "react";
import { getUserGames, type UserGame } from "../api/endpoints/userGames";

export function useUserGames() {
  const [games, setGames] = useState<UserGame[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    getUserGames(1, 12)
      .then((result) => {
        setGames(result.items);
        setStatus("success");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  function addUserGame(userGame: UserGame) {
    setGames((prev) => [userGame, ...prev]);
  }

  function removeGame(userGame: UserGame) {
    setGames((prev) => prev.filter((g) => g.id !== userGame.id));
  }

  return { status, games, addUserGame, removeGame };
}
```

- [ ] **Step 3: Update `CharacterPage` getUserGames call**

In `apps/web/src/pages/CharacterPage.tsx`, line 31, update the `Promise.all` call:

Change:
```ts
Promise.all([getCharacters(), getUserGames()])
  .then(([chars, ug]) => {
    setCharacters(chars)
    setUserGames(ug)
```

To:
```ts
Promise.all([getCharacters(), getUserGames(1, 12)])
  .then(([chars, ugResult]) => {
    setCharacters(chars)
    setUserGames(ugResult.items)
```

- [ ] **Step 5: Update GamesPage.tsx**

Replace the entire file content:

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUserGames, deleteUserGame, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Gallery } from '../components/Gallery'
import { LandCard } from '../components/cards/LandCard'
import { GameDetailCard } from '../components/cards/GameDetailCard'
import { NewMatchBadge } from '../components/ui/NewMatchBadge'
import { PaginationControls } from '../components/ui'
import { TABS } from '../lib/tabs'
import { CubeIcon, PlanetIcon } from '@phosphor-icons/react'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal'

const PAGE_SIZE = 12

export default function GamesPage() {
  const TAB = TABS.find(t => t.label === 'Games')!
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')
  const [games, setGames] = useState<UserGame[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected] = useState<UserGame | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<UserGameDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')

  useEffect(() => {
    setStatus('loading')
    getUserGames(page, PAGE_SIZE)
      .then(result => {
        setGames(result.items)
        setTotalCount(result.totalCount)
        setStatus(result.totalCount === 0 ? 'empty' : 'ready')
        if (targetId && page === 1) {
          const match = result.items.find(g => g.id === targetId)
          if (match) {
            setSelected(match)
            setActiveSide('left')
            setDetailLoading(true)
            getUserGameByGameId(match.gameId)
              .then(detail => setSelectedDetail(detail))
              .finally(() => setDetailLoading(false))
          }
        }
      })
      .catch(() => setStatus('error'))
  }, [targetId, page])

  function handleSelect(game: UserGame) {
    setActiveSide('left')
    setSelected(game)
    setSelectedDetail(null)
    setDetailLoading(true)
    getUserGameByGameId(game.gameId)
      .then(detail => setSelectedDetail(detail))
      .finally(() => setDetailLoading(false))
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteUserGame(selected.id)
      const newTotal = totalCount - 1
      setTotalCount(newTotal)
      setSelected(null)
      setConfirmOpen(false)
      const totalPages = Math.ceil(newTotal / PAGE_SIZE)
      if (page > totalPages && page > 1) {
        setPage(p => p - 1)
      } else {
        setGames(prev => {
          const next = prev.filter(g => g.id !== selected.id)
          if (newTotal === 0) setStatus('empty')
          return next
        })
      }
    } finally {
      setDeleting(false)
    }
  }

  const leftContent = selected ? (
    <>
      <GameDetailCard
        game={selected}
        detail={selectedDetail}
        loading={detailLoading}
        deleting={deleting}
        onDelete={() => setConfirmOpen(true)}
      />
      <ConfirmDeleteModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        itemName={selected.gameName}
        loading={deleting}
      />
    </>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a game</p>
    </div>
  )

  const rightContent = (
    <div className="flex flex-col h-full min-h-0">
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent flex items-center justify-between'>
        <h2 className="text-xs font-mono uppercase tracking-widest">My Game Cards</h2>
        {totalCount > 0 && (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>
      <Gallery
        key={page}
        items={games}
        status={status}
        getKey={(g: UserGame) => g.id}
        emptyMessage="You haven't added any games yet"
        errorMessage="Could not load games"
        stickyRows
        renderItem={(g: UserGame) => (
          <div className={`relative h-fit md:h-full ${selected?.id === g.id ? 'ring-2 ring-blue-700 rounded-xl' : ''}`}>
            <NewMatchBadge count={g.newMatchCount} />
            <LandCard
              name={g.gameName}
              imageUrl={g.gameImageUrl ?? undefined}
              onClick={() => handleSelect(g)}
              className="h-min aspect-3/4 md:aspect-auto md:h-full hover:brightness-110 transition-all"
            >
              <div className='flex flex-1 items-center justify-center text-7xl'><CubeIcon /></div>
            </LandCard>
          </div>
        )}
      />
    </div>
  )

  return (
    <BinderLayout
      barColor={TAB.color}
      barContent={selected ? (
        <>
          <GameMiniCard game={{ name: selected.gameName, imageUrl: selected.gameImageUrl ?? undefined }} platform={<PlanetIcon />}
            gameId={selected.gameId}
          />
        </>
      ) : undefined}
      activeTab={"Games"}
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 7: Run all backend tests to confirm nothing regressed**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~UserGameTests"
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/api/endpoints/userGames.ts apps/web/src/hooks/useUserGames.ts apps/web/src/pages/CharacterPage.tsx apps/web/src/pages/GamesPage.tsx
git commit -m "feat: wire pagination into GamesPage with sticky gallery"
```

---

## Task 7: Manual Smoke Test

- [ ] **Step 1: Start the app**

```bash
docker compose up -d
npm run dev
```

- [ ] **Step 2: Verify with the demo seeder data**

The demo seeder should have loaded many games. Navigate to the Games page and verify:
1. Header shows `1–12 of N` count
2. Prev button is disabled on page 1
3. Clicking Next loads page 2 and updates the count label
4. Selecting a game on page 1, then navigating to page 2 — selected card stays highlighted in left panel
5. Scrolling down in the right panel on desktop — rows stack at the top
6. Deleting the selected game clears the left panel

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: <describe any smoke test fixes>"
```
