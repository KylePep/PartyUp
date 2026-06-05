# Styling Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize tab/binder colors into a single source of truth, add binder depth via gradients and shadows, replace all pure white/black with off-white/off-black tokens, add Phosphor icon library with proper tab icons, and restyle SettingsPage to use the design system.

**Architecture:** Color tokens live in `index.css` `@theme` block (consumed by Tailwind utilities and `var()`). Tab metadata (label, route, color reference, icon component) lives in `src/lib/tabs.ts` and is imported by `BinderTabs` and all page components. Binder depth is achieved with a `.binder-frame` CSS class (gradient) plus inline `boxShadow` props (per-element shadows). No new state, no new routes.

**Tech Stack:** React + TypeScript + Vite, Tailwind v4, `@phosphor-icons/react` (new), React Router

> **Note on testing:** This is a pure styling change — no unit-testable logic is added. Each task ends with a visual verification step. Run `npm run dev --prefix apps/web` (starts Vite at http://localhost:5173) and log in to verify. The backend is not needed for most visual checks; if auth is required, run `docker compose up -d && npm run dev` from the repo root.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/package.json` | Modify | Add `@phosphor-icons/react` |
| `apps/web/src/index.css` | Modify | New `@theme` tokens, `.binder-frame` gradient class |
| `apps/web/src/lib/tabs.ts` | **Create** | Single source of truth for tab config |
| `apps/web/src/components/layout/BinderTabs.tsx` | Modify | Import TABS, render Phosphor icons, three visual states |
| `apps/web/src/components/layout/BinderLayout.tsx` | Modify | Gradient, page shadows, spine gradient overlay, toggle button |
| `apps/web/src/components/layout/BinderShell.tsx` | Modify | Title color tokens |
| `apps/web/src/components/layout/NavBar.tsx` | Modify | Logo off-black |
| `apps/web/src/pages/GamesPage.tsx` | Modify | barColor from TABS, header gradient, border tokens |
| `apps/web/src/pages/CharactersPage.tsx` | Modify | barColor from TABS, header gradient |
| `apps/web/src/pages/MatchesPage.tsx` | Modify | barColor from TABS, header gradient |
| `apps/web/src/pages/SettingsPage.tsx` | Modify | barColor from TABS, full theme restyle |
| `apps/web/src/pages/RealmPage.tsx` | Modify | Match banner off-white text |
| `apps/web/src/components/ui/Button.tsx` | Modify | Replace internal `text-white` with `text-off-white` |

---

## Task 1: Install Phosphor Icons

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install the package**

```powershell
npm install @phosphor-icons/react --prefix apps/web
```

Expected output ends with: `added N packages` (no errors).

- [ ] **Step 2: Verify the dependency appears**

Open `apps/web/package.json` and confirm `"@phosphor-icons/react"` is present in `dependencies`.

- [ ] **Step 3: Commit**

```powershell
cd apps/web
git add package.json package-lock.json
git commit -m "chore: add @phosphor-icons/react"
```

---

## Task 2: Color Tokens + Binder Frame CSS

**Files:**
- Modify: `apps/web/src/index.css`

The `@theme` block currently has `--color-muted: #6b6b88` which fails WCAG AA on cyan-900 surfaces. This task updates muted and adds all new tokens needed by subsequent tasks.

- [ ] **Step 1: Update `--color-muted` and add new tokens to the `@theme` block**

Open `apps/web/src/index.css`. The `@theme` block currently ends with `--color-success: #52c77a;`. Replace the entire `@theme` block with:

```css
@theme {
  --color-bg: #0a0a14;
  --color-surface: #111120;
  --color-surface-raised: #18182c;
  --color-text: #e8e8f0;
  --color-muted: oklch(70.4% 0.04 257);
  --color-border: #22223a;
  --color-accent: #7c6fcd;
  --color-accent-dim: #4a4080;
  --color-danger: #e05252;
  --color-success: #52c77a;

  --color-off-white: oklch(97.1% 0.004 56);
  --color-off-black: oklch(21% 0.034 265);

  --color-tab-games:      #409cda;
  --color-tab-cards:      #ee623f;
  --color-tab-collection: #51e389;
  --color-tab-settings:   #be4fe3;

  --color-binder-edge:  oklch(30.2% 0.056 230);
  --color-binder-page:  oklch(39.1% 0.09 241);
  --color-binder-spine: oklch(25% 0.045 230);

  --font-display: "Cinzel", serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

- [ ] **Step 2: Add `.binder-frame` utility class after the `@theme` block**

After the closing `}` of `@theme`, add:

```css
.binder-frame {
  background: linear-gradient(
    to right,
    var(--color-binder-edge),
    var(--color-binder-page) 25%,
    var(--color-binder-spine) 50%,
    var(--color-binder-page) 75%,
    var(--color-binder-edge)
  );
}
```

- [ ] **Step 3: Visual check**

Run `npm run dev --prefix apps/web`. Open http://localhost:5173. No visible change yet (tokens only), but verify the dev server starts without CSS errors.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/index.css
git commit -m "style: add color tokens and binder-frame gradient class"
```

---

## Task 3: Create Tab Constants File

**Files:**
- Create: `apps/web/src/lib/tabs.ts`

- [ ] **Step 1: Create the file**

Create `apps/web/src/lib/tabs.ts` with this exact content:

```ts
import type { Icon } from "@phosphor-icons/react"
import { GameController, Cards, BookOpen, GearSix } from "@phosphor-icons/react"

export type Tab = {
  label: string
  to: string
  color: string
  Icon: Icon
}

export const TABS: Tab[] = [
  { label: "Games",      to: "/games",      color: "var(--color-tab-games)",      Icon: GameController },
  { label: "My Cards",   to: "/characters", color: "var(--color-tab-cards)",      Icon: Cards },
  { label: "Collection", to: "/matches",    color: "var(--color-tab-collection)", Icon: BookOpen },
  { label: "Settings",   to: "/settings",   color: "var(--color-tab-settings)",   Icon: GearSix },
]
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit --project apps/web/tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/lib/tabs.ts
git commit -m "feat: add TABS constant with Phosphor icon references"
```

---

## Task 4: Restyle BinderTabs with Icons

**Files:**
- Modify: `apps/web/src/components/layout/BinderTabs.tsx`

Three visual states:
- **Future** (upcoming tab): solid `tab.color` background, `off-black` icon, `regular` weight
- **Active** (current page): transparent background, `tab.color` icon, `fill` weight
- **Passed** (already visited): transparent background, `muted` icon, `regular` weight

The `filter: drop-shadow` on the section gives tabs lift off the binder edge.

- [ ] **Step 1: Replace the entire file content**

```tsx
import { NavLink } from "react-router-dom"
import { TABS } from "../../lib/tabs"

interface BinderTabsProps {
  activeTab: string
}

export function BinderTabs({ activeTab }: BinderTabsProps) {
  const activeIndex = TABS.findIndex(tab => tab.label === activeTab)

  return (
    <section
      className="
        [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.45))]
        absolute
        left-0
        md:left-auto
        md:right-1
        bottom-2
        md:bottom-auto
        md:top-0
        origin-left
        md:translate-x-full
        gap-1
        md:gap-6
        h-8
        md:h-full
        w-full
        md:w-8
        grid
        grid-cols-5
        md:grid-cols-1
        grid-rows-1
        md:grid-rows-5
        auto-rows-0
        px-8
        md:px-0
        md:py-8
        z-10
      "
    >
      {TABS.map((tab, index) => {
        const isPassed = index < activeIndex
        const isActive = index === activeIndex

        const bgColor = isPassed || isActive ? "transparent" : tab.color
        const iconColor = isActive
          ? tab.color
          : isPassed
          ? "var(--color-muted)"
          : "var(--color-off-black)"
        const iconWeight = isActive ? "fill" : "regular"

        return (
          <NavLink
            key={tab.label}
            to={tab.to}
            aria-label={tab.label}
            className="flex justify-center items-center rounded-b md:rounded-r p-1 transition-all"
            style={{ backgroundColor: bgColor }}
          >
            <tab.Icon size={20} weight={iconWeight} color={iconColor} />
          </NavLink>
        )
      })}
    </section>
  )
}
```

- [ ] **Step 2: TypeScript check**

```powershell
npx tsc --noEmit --project apps/web/tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 3: Visual check**

Start the dev server and navigate to any page. Verify:
- Tabs show icons (not "G" / "Car" / "Col" / "S")
- The current page's tab icon is colored and filled
- Previous tabs are dimmed (muted color)
- Future tabs have a solid colored background with a dark icon
- Tabs have a visible drop shadow

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/components/layout/BinderTabs.tsx
git commit -m "feat: replace tab text abbreviations with Phosphor icons, add three-state styling"
```

---

## Task 5: Binder Depth (BinderLayout)

**Files:**
- Modify: `apps/web/src/components/layout/BinderLayout.tsx`

Changes in this task:
1. `<main>` — remove `bg-cyan-900`, add `.binder-frame`, add outer box-shadow
2. Left page div — add inward spine shadow
3. Right page div — add inward spine shadow
4. Spine bar div — add `relative`, change `border-black/20` → `border-[--color-off-black]/20`, add gradient overlay child div
5. Mobile toggle button — `bg-white text-black` → `bg-[--color-off-black]` with ArrowLeft/ArrowRight icon

- [ ] **Step 1: Replace the entire file content**

```tsx
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react"
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
    <div className="relative flex flex-col md:w-full mx-4 md:mx-8 pt-2 pb-10 md:py-2 h-screen">
      {/* Binder frame */}
      <main
        className="binder-frame grid grid-cols-1 md:grid-cols-2 grid-rows-1 border-cyan-950/50 border-10 rounded-lg md:rounded-4xl w-full h-full relative z-20"
        style={{ boxShadow: '0 32px 64px -16px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.25)' }}
      >
        {/* Left page — hidden on mobile when right is active */}
        <div
          className={`${activeSide === 'left' ? 'flex' : 'hidden md:flex'} flex-col md:flex-row md:border-r-8 border-cyan-950/50 h-full`}
          style={{ boxShadow: 'inset -12px 0 20px -8px rgba(0,0,0,0.4)' }}
        >
          {/* Spine bar */}
          <div
            className="relative min-w-50 flex md:flex-col items-center md:justify-end md:justify-start min-h-34 px-4 md:pt-12 shrink-0 md:h-full gap-4 md:rounded-l-3xl border-b-8 md:border-b-0 md:border-r-8 border-[--color-off-black]/20"
            style={{ backgroundColor: barColor }}
          >
            <div
              className="absolute inset-0 pointer-events-none md:rounded-l-3xl"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent 30%, transparent 70%, rgba(0,0,0,0.15))' }}
            />
            {barContent}
          </div>
          {/* Left content area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            {leftContent}
          </div>
        </div>

        {/* Right page — hidden on mobile when left is active */}
        <div
          className={`${activeSide === 'right' ? 'flex' : 'hidden md:flex'} flex-col h-full overflow-y-auto md:overflow-hidden`}
          style={{ boxShadow: 'inset 12px 0 20px -8px rgba(0,0,0,0.4)' }}
        >
          {rightContent}
        </div>
      </main>

      <BinderTabs activeTab={activeTab} />

      {/* Mobile-only toggle button */}
      {onToggleSide && (
        <div className="pointer-events-none grid grid-cols-5 grid-rows-1 gap-1 md:hidden absolute bottom-2 left-0 right-0 w-full h-9 px-8 z-10">
          <button
            onClick={onToggleSide}
            aria-label="Toggle panel"
            className="pointer-events-auto col-start-5 flex items-center justify-center w-full h-full bg-[--color-off-black] rounded-b"
          >
            {activeSide === 'right'
              ? <ArrowLeft size={16} color="var(--color-off-white)" />
              : <ArrowRight size={16} color="var(--color-off-white)" />
            }
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```powershell
npx tsc --noEmit --project apps/web/tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 3: Visual check**

Start the dev server and open any binder page (e.g., /games). Verify:
- Binder floats with a visible drop shadow off the warm background
- Left-to-right gradient is visible — the center spine is darker than the page areas, and outer edges are darker than center pages
- Inner page shadows create a subtle fold effect near the center spine
- The colored spine bar has a subtle top-and-bottom darkening (gradient overlay)
- On mobile: the toggle button (bottom-right) is dark with a white arrow icon

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/components/layout/BinderLayout.tsx
git commit -m "style: add open-book gradient, depth shadows, and restyled mobile toggle to BinderLayout"
```

---

## Task 6: Pages — barColor from TABS + Section Header Gradients

**Files:**
- Modify: `apps/web/src/pages/GamesPage.tsx`
- Modify: `apps/web/src/pages/CharactersPage.tsx`
- Modify: `apps/web/src/pages/MatchesPage.tsx`

Three changes per page:
1. Import `TABS` and use `TABS.find` to get the tab's color for `barColor`
2. Add `bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent` to every section header div (the ones with `px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50`)
3. For GamesPage only: replace two `border-black` instances with `border-[--color-off-black]`

- [ ] **Step 1: Update GamesPage.tsx**

At the top of the file, add the import:
```tsx
import { TABS } from '../lib/tabs'
```

Inside the component (before the `leftContent` and `rightContent` definitions), add:
```tsx
const TAB = TABS.find(t => t.label === 'Games')!
```

Replace the two occurrences of `border-black` in the LandCard detail section:

Find (line ~79):
```tsx
<div className='flex justify-between border-1 border-black px-2 py-1'>
```
Replace with:
```tsx
<div className='flex justify-between border-1 border-[--color-off-black] px-2 py-1'>
```

Find (line ~94):
```tsx
<div
  className="text-xs font-mono text-muted flex-1 min-h-0 overflow-y-auto border-1 border-black px-2 py-1"
```
Replace with:
```tsx
<div
  className="text-xs font-mono text-muted flex-1 min-h-0 overflow-y-auto border-1 border-[--color-off-black] px-2 py-1"
```

Add the gradient to both section header divs. Each currently reads:
```tsx
<div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50'>
```
Replace both occurrences with:
```tsx
<div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
```

Replace the hardcoded `barColor` in the return statement:
```tsx
// Before
barColor="#409cda"

// After
barColor={TAB.color}
```

- [ ] **Step 2: Update CharactersPage.tsx**

Add import at top:
```tsx
import { TABS } from '../lib/tabs'
```

Inside the component, add:
```tsx
const TAB = TABS.find(t => t.label === 'My Cards')!
```

Add gradient to all three section header divs (there are three: "Character Card Details", "Select A Character", "My Character Cards"). Each currently reads `className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50'`. Add `bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent` to each.

Replace the hardcoded `barColor`:
```tsx
// Before
barColor='#ee623f'

// After
barColor={TAB.color}
```

- [ ] **Step 3: Update MatchesPage.tsx**

Add import at top:
```tsx
import { TABS } from '../lib/tabs'
```

Inside the component, add:
```tsx
const TAB = TABS.find(t => t.label === 'Collection')!
```

Add gradient to both section header divs (`className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50'`):
```tsx
className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'
```

Replace the hardcoded `barColor`:
```tsx
// Before
barColor='#51e389'

// After
barColor={TAB.color}
```

- [ ] **Step 4: TypeScript check**

```powershell
npx tsc --noEmit --project apps/web/tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 5: Visual check**

Open /games, /characters, /matches. Verify:
- Spine bar colors look identical to before (colors haven't changed, just the source)
- Section header bars have a subtle fade-from-left gradient
- GamesPage game detail borders are slightly less stark than pure black

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/pages/GamesPage.tsx apps/web/src/pages/CharactersPage.tsx apps/web/src/pages/MatchesPage.tsx
git commit -m "style: pull barColor from TABS constant, add header gradient, replace border-black in pages"
```

---

## Task 7: SettingsPage Full Restyle

**Files:**
- Modify: `apps/web/src/pages/SettingsPage.tsx`

SettingsPage currently ignores the design system entirely, using raw Tailwind colors (`text-white`, `bg-gray-800`, etc.). This task migrates it to theme tokens and uses the existing `Button` component.

The `Button` component (`src/components/ui/Button.tsx`) accepts all standard `<button>` HTML attributes plus `variant` (`'primary' | 'secondary' | 'ghost' | 'danger'`) and `size` (`'sm' | 'md' | 'lg'`). Use `variant="secondary"` for the save/change buttons so they blend with the surface rather than the orange primary style.

- [ ] **Step 1: Update the import block**

At the top of the file, add these imports:
```tsx
import { TABS } from '../lib/tabs'
import { Button } from '../components/ui'
```

- [ ] **Step 2: Add TAB constant inside the component**

At the top of the `SettingsPage` function body, before the state declarations, add:
```tsx
const TAB = TABS.find(t => t.label === 'Settings')!
```

- [ ] **Step 3: Replace leftContent JSX**

Replace the entire `leftContent` variable with:

```tsx
const leftContent = (
  <div className="p-6 space-y-8">
    <section>
      <h2 className="text-lg font-semibold text-text mb-4">Account</h2>
      <form onSubmit={handleAccountSave} className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder="Optional"
            className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
          />
        </div>
        {accountError && <p className="text-danger text-sm">{accountError}</p>}
        {accountSuccess && <p className="text-success text-sm">Saved</p>}
        <Button
          type="submit"
          variant="secondary"
          disabled={accountSaving || isLoading}
        >
          {accountSaving ? "Saving…" : "Save Account"}
        </Button>
      </form>
    </section>

    <section>
      <h2 className="text-lg font-semibold text-text mb-4">Security</h2>
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
          />
        </div>
        {passwordError && <p className="text-danger text-sm">{passwordError}</p>}
        {passwordSuccess && <p className="text-success text-sm">Password changed</p>}
        <Button
          type="submit"
          variant="secondary"
          disabled={passwordSaving}
        >
          {passwordSaving ? "Changing…" : "Change Password"}
        </Button>
      </form>
    </section>
  </div>
);
```

- [ ] **Step 4: Replace rightContent JSX**

Replace the entire `rightContent` variable with:

```tsx
const rightContent = (
  <>
    <div className="p-6">
      <h2 className="text-lg font-semibold text-text mb-4">Preferences</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text">Dark Mode</p>
            <p className="text-xs text-muted">Toggle the app theme</p>
          </div>
          <button
            role="switch"
            aria-checked={profile?.preferences.darkMode ?? false}
            onClick={() =>
              updatePreferences({ darkMode: !(profile?.preferences.darkMode ?? false) })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              profile?.preferences.darkMode ? "bg-accent" : "bg-surface-raised"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-off-white transition-transform ${
                profile?.preferences.darkMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between opacity-50">
          <div>
            <p className="text-sm text-text">Notifications</p>
            <p className="text-xs text-muted">Coming soon</p>
          </div>
          <button
            role="switch"
            aria-checked={false}
            disabled
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface-raised cursor-not-allowed"
          >
            <span className="inline-block h-4 w-4 transform rounded-full bg-off-white translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  </>
);
```

- [ ] **Step 5: Update barColor in the return statement**

```tsx
// Before
barColor="#be4fe3"

// After
barColor={TAB.color}
```

- [ ] **Step 6: TypeScript check**

```powershell
npx tsc --noEmit --project apps/web/tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 7: Visual check**

Navigate to /settings. Verify:
- Form fields use dark surface backgrounds with muted borders (not gray-800)
- Labels are muted tone, not gray-300
- Save/change buttons use the secondary Button style (border, no orange)
- Error/success text uses red danger / green success tokens
- Toggle thumb is warm off-white instead of pure white

- [ ] **Step 8: Commit**

```powershell
git add apps/web/src/pages/SettingsPage.tsx
git commit -m "style: migrate SettingsPage to design system tokens and Button component"
```

---

## Task 8: Global White/Black Sweep

**Files:**
- Modify: `apps/web/src/components/layout/NavBar.tsx`
- Modify: `apps/web/src/components/layout/BinderShell.tsx`
- Modify: `apps/web/src/pages/RealmPage.tsx`
- Modify: `apps/web/src/components/ui/Button.tsx`

- [ ] **Step 1: NavBar — logo text**

In `apps/web/src/components/layout/NavBar.tsx`, find:
```tsx
<Link to="/home" className="pointer-events-auto font-display font-bold text-black text-lg tracking-wide">
```
Replace with:
```tsx
<Link to="/home" className="pointer-events-auto font-display font-bold text-[--color-off-black] text-lg tracking-wide">
```

- [ ] **Step 2: BinderShell — title colors**

In `apps/web/src/components/layout/BinderShell.tsx`, find:
```tsx
<h1 className="font-display font-bold text-xl md:text-4xl text-stone-700 bg-stone-300 px-4 py-1 rounded-md">
```
Replace with:
```tsx
<h1 className="font-display font-bold text-xl md:text-4xl text-[--color-off-black] bg-[--color-off-white] px-4 py-1 rounded-md">
```

- [ ] **Step 3: RealmPage — match banner text only**

> **Important:** `RealmPage` uses `barColor="#ea6a01"` — a realm-specific orange that is **not** a navigation tab color and must **not** be changed. Only the match banner text changes here.

In `apps/web/src/pages/RealmPage.tsx`, find:
```tsx
<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-white px-6 py-3 rounded-lg font-mono text-sm shadow-lg ">
```
Replace with:
```tsx
<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-[--color-off-white] px-6 py-3 rounded-lg font-mono text-sm shadow-lg">
```

- [ ] **Step 4: Button component — internal text-white**

In `apps/web/src/components/ui/Button.tsx`, find the `variantClasses` object:
```tsx
const variantClasses: Record<Variant, string> = {
  primary: 'bg-orange-800 border-2 border-orange-600 text-white hover:bg-accent-dim',
  secondary: 'border border-border text-text hover:border-accent hover:text-accent',
  ghost: 'text-muted hover:text-text',
  danger: 'bg-danger text-white hover:opacity-90',
}
```
Replace with:
```tsx
const variantClasses: Record<Variant, string> = {
  primary: 'bg-orange-800 border-2 border-orange-600 text-off-white hover:bg-accent-dim',
  secondary: 'border border-border text-text hover:border-accent hover:text-accent',
  ghost: 'text-muted hover:text-text',
  danger: 'bg-danger text-off-white hover:opacity-90',
}
```

- [ ] **Step 5: TypeScript check**

```powershell
npx tsc --noEmit --project apps/web/tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 6: Visual check**

- On desktop, verify the "PartyUp" logo text is dark (off-black, not jet black)
- If BinderShell is used (check if any route renders it — it may be unused currently), verify the title label uses warm off-white background
- Open /realm/:gameId and trigger a match, or temporarily change the banner condition to always show — verify the banner text is warm off-white
- Click the primary and danger buttons (e.g., Enter/Delete in GamesPage) — text should look identical to before (off-white is nearly imperceptible vs pure white)

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/components/layout/NavBar.tsx apps/web/src/components/layout/BinderShell.tsx apps/web/src/pages/RealmPage.tsx apps/web/src/components/ui/Button.tsx
git commit -m "style: replace all pure white/black with off-white/off-black tokens"
```

---

## Self-Review Checklist

- [x] **Color tokens** — `@theme` entries for muted, off-white, off-black, 4 tab colors, 3 binder colors. Covered in Task 2.
- [x] **tabs.ts** — single source of truth with Icon references. Task 3.
- [x] **BinderTabs icons** — three-state icon rendering. Task 4.
- [x] **Binder gradient** — `.binder-frame` class applied in Task 5.
- [x] **Outer shadow** — inline boxShadow on `<main>` in Task 5.
- [x] **Page inner shadows** — inline boxShadow on left/right page divs in Task 5.
- [x] **Spine bar gradient** — overlay div in Task 5.
- [x] **Mobile toggle button** — ArrowLeft/ArrowRight, off-black bg in Task 5.
- [x] **barColor from TABS** — GamesPage, CharactersPage, MatchesPage (Task 6), SettingsPage (Task 7).
- [x] **Section header gradient** — all three main pages in Task 6.
- [x] **GamesPage border-black** — two instances in Task 6.
- [x] **SettingsPage restyle** — full token migration in Task 7.
- [x] **NavBar logo** — Task 8.
- [x] **BinderShell title** — Task 8.
- [x] **RealmPage banner** — Task 8.
- [x] **Button internal text-white** — Task 8.
- [x] **Muted accessibility fix** — Token updated in Task 2.
- [x] **Tab drop-shadow** — `[filter:drop-shadow]` on section in Task 4.
