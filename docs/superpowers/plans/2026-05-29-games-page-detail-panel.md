# GamesPage Detail Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user selects a game on GamesPage, fetch the full game record and display description, rating, platforms, and website in the left-side LandCard — name and image appear immediately, rich fields fill in once the fetch resolves.

**Architecture:** Add two state variables (`selectedDetail`, `detailLoading`) to GamesPage. A `handleSelect` function sets the game immediately and fires `getUserGameByGameId` in the background. The LandCard children render shimmer placeholders while loading, then swap in the real data.

**Tech Stack:** React, TypeScript, Tailwind CSS. No backend changes.

---

### Task 1: Create feature branch

**Files:**
- No file changes — git only

- [ ] **Step 1: Create and check out feature branch**

```powershell
git checkout -b feature/games-page-detail-panel
```

Expected output:
```
Switched to a new branch 'feature/games-page-detail-panel'
```

---

### Task 2: Implement game detail fetch and display

**Files:**
- Modify: `apps/web/src/pages/GamesPage.tsx`

> Note: There is no frontend test framework in this project. Skip TDD; verify manually in the browser after implementing.

- [ ] **Step 1: Update the import line for `userGames`**

In [apps/web/src/pages/GamesPage.tsx](apps/web/src/pages/GamesPage.tsx), replace:

```ts
import { getUserGames, deleteUserGame, type UserGame } from '../api/endpoints/userGames'
```

with:

```ts
import { getUserGames, deleteUserGame, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
```

- [ ] **Step 2: Add `selectedDetail` and `detailLoading` state**

After the existing `const [deleting, setDeleting] = useState(false)` line, add:

```ts
const [selectedDetail, setSelectedDetail] = useState<UserGameDetail | null>(null)
const [detailLoading, setDetailLoading] = useState(false)
```

- [ ] **Step 3: Add `handleSelect` function**

After the `handleDelete` function, add:

```ts
function handleSelect(game: UserGame) {
  setSelected(game)
  setSelectedDetail(null)
  setDetailLoading(true)
  getUserGameByGameId(game.gameId)
    .then(detail => setSelectedDetail(detail))
    .finally(() => setDetailLoading(false))
}
```

- [ ] **Step 4: Update the right-panel grid's onClick to use `handleSelect`**

In the right panel grid, replace:

```tsx
onClick={() => setSelected(game)}
```

with:

```tsx
onClick={() => handleSelect(game)}
```

- [ ] **Step 5: Replace the LandCard children in `leftContent`**

Replace the entire `LandCard` JSX in `leftContent` with:

```tsx
<LandCard
  name={selected.gameName}
  imageUrl={selected.gameImageUrl}
>
  {detailLoading && !selectedDetail ? (
    <div className="flex flex-col gap-2">
      <div className="animate-pulse bg-muted/30 rounded h-3 w-full" />
      <div className="animate-pulse bg-muted/30 rounded h-3 w-3/4" />
    </div>
  ) : selectedDetail?.description ? (
    <p className="text-xs font-mono text-muted">{selectedDetail.description}</p>
  ) : null}

  {selectedDetail && selectedDetail.rating > 0 && (
    <p className="text-xs font-mono text-muted">★ {selectedDetail.rating.toFixed(1)}</p>
  )}

  {selectedDetail && selectedDetail.platforms.length > 0 && (
    <p className="text-xs font-mono text-muted">{selectedDetail.platforms.join(' • ')}</p>
  )}

  {selectedDetail?.website && (
    <a
      href={selectedDetail.website}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-mono text-blue-400 hover:underline truncate block"
    >
      {selectedDetail.website}
    </a>
  )}

  <p className="text-xs font-mono text-muted">
    Added {new Date(selected.createdAt).toLocaleDateString()}
  </p>
  <div className="flex gap-2">
    <Button onClick={() => navigate(`/realm/${selected.gameId}`)}>
      Enter Realm
    </Button>
    <Button variant="danger" disabled={deleting} onClick={handleDelete}>
      {deleting ? 'Deleting...' : 'Delete Game'}
    </Button>
  </div>
</LandCard>
```

- [ ] **Step 6: Verify the TypeScript build has no errors**

```powershell
npm run build --prefix apps/web
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Start the dev server and test manually**

```powershell
npm run dev
```

Open `http://localhost:5173/games` in a browser. Click a game card. Verify:
1. Name and image appear immediately.
2. Shimmer lines briefly appear in the detail area.
3. Description, rating (if > 0), platforms (if non-empty), and website (if present) fill in.
4. "Added [date]", Enter Realm, and Delete Game still render correctly.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/src/pages/GamesPage.tsx
git commit -m "feat: fetch and display full game detail on GamesPage selection"
```
