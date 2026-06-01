# Mobile Binder Panel Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On mobile, show one binder panel at a time with a toggle tab that switches between left and right panels, while leaving desktop layout completely unchanged.

**Architecture:** Each page adds `activeSide: 'left' | 'right'` state and passes it with an `onToggleSide` callback to `BinderLayout`. `BinderLayout` conditionally hides the inactive panel on mobile using Tailwind's `hidden md:flex` pattern and renders a mobile-only toggle button. The toggle button sits behind `BinderTabs` (lower z-index) on the right side, naturally visible only through the empty 5th grid slot; it moves to the left side when `activeSide === 'left'`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Router v6

---

## File Map

| Action | File |
|--------|------|
| Modify | `apps/web/src/components/layout/BinderTabs.tsx` |
| Modify | `apps/web/src/components/layout/BinderLayout.tsx` |
| Modify | `apps/web/src/pages/GamesPage.tsx` |
| Modify | `apps/web/src/pages/CharacterPage.tsx` |
| Modify | `apps/web/src/pages/MatchesPage.tsx` |
| Modify | `apps/web/src/pages/SettingsPage.tsx` |
| Modify | `apps/web/src/pages/RealmPage.tsx` |

---

## Task 1: Update BinderTabs — remove the mobile toggle entry

The "tab" NavLink in `BinderTabs` is replaced by a real button in `BinderLayout`. Remove it from the array but **keep `grid-rows-5`** so the 5th row stays as an empty gap — the toggle button rendered by `BinderLayout` sits behind the tab strip and is visible/tappable through this gap.

**Files:**
- Modify: `apps/web/src/components/layout/BinderTabs.tsx`

- [ ] **Step 1: Edit `BinderTabs.tsx` — remove the "tab" entry**

Replace the `tabs` array (lines 3–9):

```tsx
const tabs = [
  { label: "Games", color: "#1e40af", to: "/games" },
  { label: "My Cards", color: "#991b1b", to: "/characters" },
  { label: "Collection", color: "#166534", to: "/matches" },
  { label: "Settings", color: "#dcba31", to: "/settings" },
] as const
```

Also remove the `tab.label === 'tab'` conditional in the `NavLink` className (it no longer applies):

```tsx
className="flex rounded-r py-1 text-xs font-mono uppercase tracking-widest text-center transition-all"
```

The full updated file:

```tsx
import { NavLink } from "react-router-dom"

const tabs = [
  { label: "Games", color: "#1e40af", to: "/games" },
  { label: "My Cards", color: "#991b1b", to: "/characters" },
  { label: "Collection", color: "#166534", to: "/matches" },
  { label: "Settings", color: "#dcba31", to: "/settings" },
] as const

interface BinderTabsProps {
  activeTab: string
}

export function BinderTabs({ activeTab }: BinderTabsProps) {
  const activeIndex = tabs.findIndex(
    tab => tab.label === activeTab
  )

  return (
    <section
      className="
        absolute
        right-0
        top-0
        origin-left
        translate-x-full
        gap-2
        md:gap-6
        z-10
        h-full
        grid
        grid-cols-1
        grid-rows-5
        auto-rows-0
        w-6
      "
    >
      {tabs.map((tab, index) => {
        const isPassed = index < activeIndex
        const isActive = index === activeIndex

        return (
          <NavLink
            key={tab.label}
            to={tab.to}
            className="flex rounded-r py-1 text-xs font-mono uppercase tracking-widest text-center transition-all"
            style={{
              backgroundColor: isPassed || isActive
                ? "transparent"
                : tab.color,
              color: isActive
                ? "#facc15"
                : "#ffffff",
            }}
          >
            <span className="hidden md:flex flex-col w-full leading-0 rotate-90 -translate-y-1/4 text-center justify-center text-nowrap">
              {tab.label}
            </span>
          </NavLink>
        )
      })}
    </section>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc -p apps/web/tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/BinderTabs.tsx
git commit -m "refactor: remove mobile toggle placeholder from BinderTabs"
```

---

## Task 2: Update BinderLayout — mobile panel switching and toggle button

Add `activeSide` and `onToggleSide` props. On mobile, hide the inactive panel and render a white toggle button. The button sits at `z-0` (below `BinderTabs` at `z-10`) on the right side, only visible through the empty 5th grid slot. On the left side it moves to protrude left at `z-10`.

Also add `ms-8 md:ms-4` to the outer wrapper so the left toggle button has room to protrude without clipping the viewport.

**Files:**
- Modify: `apps/web/src/components/layout/BinderLayout.tsx`

- [ ] **Step 1: Replace `BinderLayout.tsx` with the updated version**

```tsx
import type { ReactNode } from 'react'
import { BinderTabs } from './BinderTabs'

interface BinderLayoutProps {
  barColor: string
  barContent?: ReactNode
  leftContent: ReactNode
  rightContent: ReactNode
  activeTab: string
  activeSide?: 'left' | 'right'
  onToggleSide?: () => void
}

export function BinderLayout({
  barColor,
  barContent,
  leftContent,
  rightContent,
  activeTab,
  activeSide = 'right',
  onToggleSide,
}: BinderLayoutProps) {
  return (
    // Outer wrapper: ms-8 on mobile gives room for left-side toggle button
    <div className="relative m-4 ms-8 md:ms-4 me-8 w-full" style={{ height: 'calc(100vh - 2rem)' }}>
      {/* Binder frame */}
      <main className="grid grid-cols-1 md:grid-cols-2 grid-rows-1 border-white border-2 w-full h-full relative">
        {/* Left page — hidden on mobile when right is active */}
        <div className={`${activeSide === 'left' ? 'flex' : 'hidden md:flex'} border-r border-border h-full`}>
          {/* Spine bar */}
          <div
            className="min-w-48 flex flex-col items-center pt-12 shrink-0 h-full gap-4"
            style={{ backgroundColor: barColor }}
          >
            {barContent}
          </div>
          {/* Left content area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {leftContent}
          </div>
        </div>

        {/* Right page — hidden on mobile when left is active */}
        <div className={`${activeSide === 'right' ? 'flex' : 'hidden md:flex'} flex-col h-full overflow-y-auto`}>
          {rightContent}
        </div>
      </main>

      {/* Desktop tab strip — unchanged */}
      <BinderTabs activeTab={activeTab} />

      {/* Mobile-only toggle button.
          Right side (activeSide=right): z-0 so BinderTabs (z-10) covers rows 1-4;
          the empty 5th grid slot is the visible/tappable gap.
          Left side (activeSide=left): z-10, protrudes left of the binder frame. */}
      {onToggleSide && (
        <button
          onClick={onToggleSide}
          aria-label="Toggle panel"
          className={`md:hidden absolute top-0 w-6 h-full ${
            activeSide === 'right'
              ? 'right-0 translate-x-full z-0 rounded-r'
              : 'left-0 -translate-x-full z-10 rounded-l'
          }`}
          style={{ backgroundColor: '#ffffff' }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc -p apps/web/tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/BinderLayout.tsx
git commit -m "feat: add mobile panel toggle to BinderLayout"
```

---

## Task 3: Update GamesPage

Add `activeSide` state (default `'right'`). Auto-switch to left when a game is selected.

**Files:**
- Modify: `apps/web/src/pages/GamesPage.tsx`

- [ ] **Step 1: Add state and wire it up**

After the existing `useState` declarations (around line 14), add:

```tsx
const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')
```

In `handleSelect` (line 39), add `setActiveSide('left')` as the first line:

```tsx
function handleSelect(game: UserGame) {
  setActiveSide('left')
  setSelected(game)
  setSelectedDetail(null)
  setDetailLoading(true)
  getUserGameByGameId(game.gameId)
    .then(detail => setSelectedDetail(detail))
    .finally(() => setDetailLoading(false))
}
```

In the `return` statement, add the two new props to `BinderLayout`:

```tsx
return (
  <BinderLayout
    barColor="#1e40af"
    activeTab={"Games"}
    activeSide={activeSide}
    onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
    leftContent={leftContent}
    rightContent={rightContent}
  />
)
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc -p apps/web/tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/GamesPage.tsx
git commit -m "feat: add mobile panel toggle to GamesPage"
```

---

## Task 4: Update CharacterPage

Add `activeSide` state (default `'right'`). Replace `onSelect={setSelected}` with a wrapper that also calls `setActiveSide('left')`.

**Files:**
- Modify: `apps/web/src/pages/CharacterPage.tsx`

- [ ] **Step 1: Add state and handler**

After the existing `useState` declarations (around line 21), add:

```tsx
const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')
```

Add a `handleSelect` function after the existing `useEffect` (around line 34):

```tsx
function handleSelect(character: Character) {
  setSelected(character)
  setActiveSide('left')
}
```

In `rightContent`, change `onSelect={setSelected}` to `onSelect={handleSelect}`:

```tsx
const rightContent = (
  <div className="p-4 overflow-y-auto h-full min-h-0">
    <CharacterGallery
      characters={characters}
      status={status}
      selectedId={selected?.id ?? null}
      onSelect={handleSelect}
    />
  </div>
)
```

In the `return` statement, add the two new props to `BinderLayout`:

```tsx
return (
  <BinderLayout
    barColor='#991b1b'
    barContent={selected ? (
      <>
        <CharacterMiniCard character={selected} />
        {selected.gameName && <GameMiniCard game={{ name: selected.gameName, imageUrl: selected.gameImageUrl }} gameId={selected.gameId} />}
      </>
    ) : undefined}
    activeTab={"My Cards"}
    activeSide={activeSide}
    onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
    leftContent={leftContent}
    rightContent={rightContent}
  />
)
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc -p apps/web/tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/CharacterPage.tsx
git commit -m "feat: add mobile panel toggle to CharacterPage"
```

---

## Task 5: Update MatchesPage

Add `activeSide` state (default `'right'`). Add a `handleSelect` wrapper that auto-switches to left.

**Files:**
- Modify: `apps/web/src/pages/MatchesPage.tsx`

- [ ] **Step 1: Add state and handler**

After the existing `useState` declarations (around line 17), add:

```tsx
const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')
```

Add a `handleSelect` function after the `useEffect` block (around line 29):

```tsx
function handleSelect(match: CharacterMatchDto) {
  setSelected(match)
  setActiveSide('left')
}
```

In `rightContent`, change `onSelect={setSelected}` to `onSelect={handleSelect}`:

```tsx
{status === 'ready' && (
  <MatchGallery
    matches={matches}
    selectedId={selected?.matchId ?? null}
    onSelect={handleSelect}
    limit={6}
  />
)}
```

In the `return` statement, add the two new props to `BinderLayout`:

```tsx
return (
  <BinderLayout
    barColor='#166534'
    barContent={selected ? (
      <>
        <CharacterMiniCard character={selected.myCharacter} characterId={selected.myCharacter.id} />
        <GameMiniCard game={{ name: selected.gameName, imageUrl: selected.gameImageUrl }} gameId={selected.gameId} />
      </>
    ) : undefined}
    activeTab={"Collection"}
    activeSide={activeSide}
    onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
    leftContent={leftContent}
    rightContent={rightContent}
  />
)
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc -p apps/web/tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/MatchesPage.tsx
git commit -m "feat: add mobile panel toggle to MatchesPage"
```

---

## Task 6: Update SettingsPage

Add `activeSide` state (default `'right'`). No auto-switch — the user toggles manually.

**Files:**
- Modify: `apps/web/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add state and props**

After the existing `useState` declarations (around line 18), add:

```tsx
const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')
```

In the `return` statement, add the two new props to `BinderLayout`:

```tsx
return (
  <BinderLayout
    barColor="#374151"
    activeTab="Settings"
    activeSide={activeSide}
    onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
    leftContent={leftContent}
    rightContent={rightContent}
  />
)
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc -p apps/web/tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/SettingsPage.tsx
git commit -m "feat: add mobile panel toggle to SettingsPage"
```

---

## Task 7: Update RealmPage

Add `activeSide` state defaulting to `'left'` (the swiping/character view is primary on mobile). No auto-switch needed.

**Files:**
- Modify: `apps/web/src/pages/RealmPage.tsx`

- [ ] **Step 1: Add state and props**

After the existing `useState` declarations (around line 17), add:

```tsx
const [activeSide, setActiveSide] = useState<'left' | 'right'>('left')
```

In the `return` statement, add the two new props to `BinderLayout`:

```tsx
<BinderLayout
  barColor="#381b03"
  barContent={
    <>
      {character ? (
        <>
          <CharacterMiniCard character={character} characterId={character.id} />
        </>
      ) : undefined}
      {userGame ? (
        <>
          <GameMiniCard game={{ name: userGame.gameName, imageUrl: userGame.gameImageUrl }} userGameId={userGame.id} />
        </>
      ) : undefined}
    </>
  }
  activeTab=""
  activeSide={activeSide}
  onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
  leftContent={
    <RealmLeftPage
      gameId={gameId!}
      userGame={userGame}
      character={character}
      onCharacterCreated={handleCharacterCreated}
      onMatch={handleMatch}
    />
  }
  rightContent={
    <RealmRightPage
      userGame={userGame}
      gameId={gameId!}
    />
  }
/>
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc -p apps/web/tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/RealmPage.tsx
git commit -m "feat: add mobile panel toggle to RealmPage (default left)"
```

---

## Task 8: Manual verification

No frontend test suite exists — verify by running the dev server and checking mobile behavior with browser DevTools device emulation.

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev --prefix apps/web
```

Open `http://localhost:5173` in a browser.

- [ ] **Step 2: Check desktop — no regressions**

At a desktop viewport (≥768px):
- All pages show both panels side by side ✓
- The white toggle tab is not visible ✓
- Binder tabs (Games, My Cards, Collection, Settings) appear on the right ✓
- Colored tab labels are rotated and visible ✓

- [ ] **Step 3: Check mobile — Games page**

Switch DevTools to a mobile viewport (e.g., 390×844 iPhone 14).

Navigate to `/games`:
- Only the right panel (game grid) is visible ✓
- A white strip protrudes from the right side of the binder (in the 5th tab slot gap) ✓
- Tapping a game card switches to the left panel (game detail) ✓
- The white toggle tab is now on the left side of the binder ✓
- Tapping the left toggle tab returns to the right panel ✓

- [ ] **Step 4: Check mobile — Characters page**

Navigate to `/characters`:
- Right panel (character gallery) shows by default ✓
- Selecting a character switches to left panel (detail) ✓
- Toggle switches back ✓

- [ ] **Step 5: Check mobile — Matches page**

Navigate to `/matches`:
- Right panel shows by default ✓
- Selecting a match switches to left panel ✓
- Toggle switches back ✓

- [ ] **Step 6: Check mobile — Settings page**

Navigate to `/settings`:
- Right panel (Preferences) shows by default ✓
- Tapping toggle switches to left panel (Account/Security forms) ✓

- [ ] **Step 7: Check mobile — Realm page**

Navigate into a game realm (`/realm/:gameId`):
- Left panel (character/swipe view) shows by default ✓
- Toggle switches to right panel ✓
- White toggle tab starts on the left side, moves to right when toggled ✓

- [ ] **Step 8: Commit verification note**

```bash
git commit --allow-empty -m "chore: verify mobile panel toggle works across all binder pages"
```
