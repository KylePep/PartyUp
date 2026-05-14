# Frontend Rewrite Design

**Date**: 2026-05-14  
**Branch**: feat-ai-frontend-rework  
**Scope**: Full rewrite of the React frontend — component architecture, layout, styling, and mobile support. The API layer (api/, hooks/, context/) is unchanged.

---

## Motivation

The current frontend has three core problems:

1. **Visual aesthetic** — too neon/cyberpunk. The target is dark/moody with light fantasy inspiration (skeleton now, full theming later).
2. **Code quality** — components are not reused. Pages contain all their own logic. Tailwind classes are repeated inline everywhere with no abstraction.
3. **Mobile** — a few breakpoints exist but mobile was never designed with intention. There is no real mobile layout.

---

## Strategy: Foundation-First Full Rewrite

Build in three phases, bottom-up:

1. **UI Primitives** — atoms with no dependencies on feature logic
2. **Composite & Layout Components** — built from primitives, feature-aware
3. **Pages** — thin composers that own routing and hook calls only

The API layer (`api/`, `hooks/`, `context/`) is untouched.

---

## Section 1: Component Architecture

### Layer 1 — UI Primitives (`components/ui/`)

Single-responsibility components that encapsulate Tailwind classes and expose clean prop APIs. No feature logic.

| Component | Variants / Props |
|-----------|-----------------|
| `Button` | `variant`: primary, secondary, ghost, danger; `size`: sm, md, lg |
| `Input` | label, error, disabled, placeholder |
| `Textarea` | label, error, disabled, character count |
| `Select` | label, error, options array |
| `Badge` | `variant`: role, rank, region, generic; `color` override |
| `Card` | optional border, padding size |
| `Modal` | children, isOpen, onClose — handles focus trap + ESC |
| `Avatar` | src, fallback text, size |
| `Spinner` | size, optional label |
| `EmptyState` | message, optional CTA button |

### Layer 2 — Composite Components (`components/`)

Built from primitives. Feature-aware but not page-specific. Own their local UI state.

- `NavBar` — horizontal bar with logo, nav links, user avatar dropdown
- `BottomTray` — mobile tab bar (Home, Characters, Matches)
- `FormField` — wraps Input/Select/Textarea with label and inline error message
- `ToggleButtonGroup` — multi-select pill buttons (used in character wizard)
- `GameCard`, `CharacterCard`, `MatchCard`, `RealmCard`, `SwipeCard` — each built from Card + Badge + Button
- `DiscoveryPanel` — owns swipe queue state and match banner, emits `onMatch`
- `CharacterPanel` — owns character display for a given game
- `UserRealmsSection` — owns add/remove game flow internally
- `CharacterGallery` — character list grouped by game, used on `CharacterPage`
- `MatchGallery` — match list grouped by game > character, used on `MatchesPage`
- `CreateCharacterWizard` — owns all form state and step progression

### Layer 3 — Pages (`pages/`)

Thin. Each page:
- Reads route params
- Calls the relevant hook(s)
- Composes feature components
- Contains minimal styling logic

---

## Section 2: NavBar & Layout

### NavBar — two variants, one component

**`variant="landing"`**
- Absolute positioned, transparent background
- Logo left, sign-in/sign-up buttons right
- Used only on `LandingPage`

**`variant="app"`**
- Sticky, dark background with subtle blur
- Logo left, nav links center-left (Home, Characters, Matches), user avatar + dropdown right
- Dropdown contains: username display, Sign Out
- Used on all authenticated pages via `SignedInLayout`

### Mobile Layout (below `md` breakpoint)

- **Top bar**: logo + avatar/dropdown only. Nav links are hidden.
- **Bottom tray** (`BottomTray`): fixed to bottom of screen, full width. Icon + label tabs for Home, Characters, Matches. Rendered by `SignedInLayout`, hidden on `md` and up.

### Layout Wrappers

- `SignedInLayout` — renders app NavBar + BottomTray (mobile), guards route (redirects unauthenticated users to `/`), renders `children`
- `PageLayout` — max-width container with consistent horizontal padding and vertical spacing. Used inside `SignedInLayout` on every authenticated page.
- `LandingPage` — manages its own full-bleed layout, uses neither wrapper.

### Removed

- `SignOutButton` standalone component — absorbed into NavBar dropdown
- `FullScreenStatus` — replaced by inline `Spinner` and `EmptyState` primitives
- `Footer` — removed for now

---

## Section 3: Pages & Routing

Routes are unchanged.

| Route | Page | Page Owns | Delegates To |
|-------|------|-----------|-------------|
| `/` | `LandingPage` | Auth modal visibility | `HeroSection`, `HowItWorksSection`, `AuthModal` |
| `/home` | `HomePage` | Fetches user games via hook | `UserRealmsSection` (owns add/remove game flow) |
| `/realm/:gameId` | `RealmPage` | Route param, active tab state | `DiscoveryPanel` (owns swipe + match banner), `CharacterPanel` |
| `/realm/:gameId/create-character` | `CreateCharacterPage` | Route param | `CreateCharacterWizard` |
| `/characters` | `CharacterPage` | Fetches characters via hook | `CharacterGallery` |
| `/matches` | `MatchesPage` | Fetches matches via hook | `MatchGallery` |

### Logic Ownership

- **Pages own**: route params, which hooks to call, top-level layout decisions
- **Feature components own**: local UI state (modal open/closed, active tab, form state within a wizard step)
- **Hooks own**: data fetching, API mutations, derived state

### `CreateCharacterWizard` — Multi-Step Structure

Progress indicator at top. Four steps, each a focused component:

| Step | Component | Fields |
|------|-----------|--------|
| 1 | `IdentityStep` | Name, class/role, short bio |
| 2 | `GameplayStep` | Modes, rank, region, playstyle tags |
| 3 | `AvailabilityStep` | Schedule, session length |
| 4 | `AboutStep` | Personality, looking for, languages |

- Wizard owns shared form state, passes each step its slice + `onChange` handler
- Back/Next/Submit controls live in the wizard, not the steps
- Each step uses `FormField`, `ToggleButtonGroup`, and other primitives
- `CreateCharacterPage` renders `<CreateCharacterWizard gameId={gameId} />` and nothing else

---

## Section 4: Theming & Styling

### Design Tokens (`index.css`)

Minimal, intentional token set. Components reference tokens — never raw hex values.

```css
@theme {
  /* Surfaces */
  --color-bg:              #0a0a14;
  --color-surface:         #111120;
  --color-surface-raised:  #18182c;

  /* Text */
  --color-text:            #e8e8f0;
  --color-muted:           #6b6b88;

  /* Border */
  --color-border:          #22223a;

  /* Accent — single accent, swap to retheme */
  --color-accent:          #7c6fcd;
  --color-accent-dim:      #4a4080;

  /* Feedback */
  --color-danger:          #e05252;
  --color-success:         #52c77a;

  /* Typography */
  --font-display: "Cinzel", serif;
  --font-body:    "Inter", sans-serif;
  --font-mono:    "JetBrains Mono", monospace;
}
```

Swapping `--color-accent` and `--font-display` is sufficient to retheme the entire app. No component touches raw color values.

### Removed

- All neon glow utility classes (`.neon-border`, `.pink-border`, `.grid-bg`)
- `pulse-glow` and `scan-line` animations
- All inline `style={{ color: '#...' }}` hex values
- Gradient buttons — flat with hover states only (gradients are theming work)

### Kept Animations

- `float` — subtle vertical bob
- `slide-in-left`, `slide-out-right`, `slide-out-left` — swipe card transitions
- `card-enter` — scale + fade in for card stack

---

## Section 5: Mobile-First & Implementation Principles

### Breakpoints

Every component is written for mobile first, expanded upward with additive breakpoints:

- Default — mobile (no prefix)
- `md` (768px) — tablet+: BottomTray hidden, nav links visible in top bar, multi-column layouts
- `lg` (1024px) — desktop: wider grids, larger cards, more whitespace

No `sm` breakpoint complexity.

### Accessibility Baseline

- All interactive elements are keyboard-reachable
- `Modal` traps focus and closes on ESC
- `FormField` associates labels with inputs — no placeholder-as-label
- State is never communicated by color alone (errors show text, not just red borders)

### Error & Loading Patterns

| Scenario | Component |
|----------|-----------|
| Data fetching in progress | `Spinner` inline in the component that's loading |
| Empty list or gallery | `EmptyState` with message and optional CTA |
| Form field error | Inline error via `FormField` |
| Page-level fetch failure | `EmptyState` with retry button |

No full-screen loading takeovers.

### Styling Constraints

- No decorative animations beyond those listed above
- No gradients on interactive elements — flat + hover only
- Buttons are never styled with inline `style={{}}` — all variants live in the `Button` component
