# Frontend Refactor Design

**Date:** 2026-05-06  
**Scope:** React frontend (`apps/web/src`) — auth context, layout wrapper, component folder structure, page component extractions

---

## Overview

Two-phase refactor. Phase 1 establishes the structural foundation (AuthContext, SignedInLayout, folder reorganization). Phase 2 extracts inline page sections into self-contained components. Each phase leaves the app in a working state.

---

## Phase 1: Auth Context + Layout + Folder Structure

### AuthContext

New file: `src/context/AuthContext.tsx`

- Exports `AuthProvider` (wraps app root) and `useAuth()` hook
- Calls `getMe()` once on mount, holds `{ status: "loading" | "authenticated" | "unreachable", user?: CurrentUser }`
- Replaces `hooks/useAuth.ts` — that file is deleted
- NavBar and any component needing user identity calls `useAuth()` directly, no prop drilling

### SignedInLayout

New file: `components/layout/SignedInLayout.tsx`

Consumes `useAuth()` and renders:
- `loading` → `FullScreenStatus` (loading variant)
- `unreachable` → `FullScreenStatus` (unreachable variant)
- no token / unauthorized → redirect to `/`
- `authenticated` → `<NavBar /> + <Outlet /> + <Footer />`

### Routing (App.tsx)

- `/` — LandingPage (public, no layout wrapper)
- All other routes nested under `SignedInLayout` via React Router `<Outlet />`:
  - `/home` — HomePage
  - `/realm/:gameId` — RealmPage
  - `/realm/:gameId/create-character` — CreateCharacterPage

`AuthProvider` wraps the entire router in `App.tsx`.

### Folder Structure

```
components/
├── layout/   NavBar, Footer, SignedInLayout, FullScreenStatus
├── modals/   Modal, AuthModal, GameSelectModal, UserGameSelectModal
├── cards/    GameCard, RealmCard, SwipeCard, StepCard
├── forms/    GameSearchControls
└── ui/       CornerAccents, SectionHeader, Pagination, GameGrid,
              GameBanner, MatchBanner, SignOutButton
```

All existing imports updated to new paths. No component logic changes in this phase.

---

## Phase 2: Page Component Extractions

Components own their own state and API calls (self-contained). Pages become thin shells.

### HomePage.tsx

Extracts:

**`GameSearchSection`** (`components/forms/`)
- Owns: search query, MMO filter, pagination state, `getGames()` calls
- Renders: `GameSearchControls`, `GameGrid`, `Pagination`, `GameSelectModal`
- Receives nothing from page — fully self-contained

**`UserRealmsSection`** (`components/ui/`)
- Owns: `useUserGames()` hook, add/delete realm logic
- Renders: realm grid of `RealmCard`s, `UserGameSelectModal`
- Receives nothing from page — fully self-contained

HomePage becomes: page title + renders `<UserRealmsSection />` + `<GameSearchSection />`

### RealmPage.tsx

Extracts:

**`CharacterPanel`** (`components/cards/`)
- Displays user's character info: name, playstyle, rank, region, bio
- Receives props: `character`, `userGame` (data already fetched at page level, shared with DiscoveryPanel)
- No internal API calls

**`DiscoveryPanel`** (`components/ui/`)
- Owns: `discoverCharacters()` fetch, swipe state, `interactWithCharacter()` calls
- Renders: `SwipeCard`, `MatchBanner`
- Receives prop: `gameId` (from route params)

RealmPage keeps: `useAuth()` for user identity, character/userGame fetch for this realm, passes results to `CharacterPanel`. Renders `GameBanner`, `CharacterPanel`, `DiscoveryPanel`.

### LandingPage.tsx

Extracts:

**`HeroSection`** (`components/ui/`)
- The animated hero with floating cards and auth modal trigger
- Owns: auth modal open/close state
- Renders: `AuthModal`

**`HowItWorksSection`** (`components/ui/`)
- The three step cards — pure display, no state

LandingPage becomes: renders `<HeroSection />` + `<HowItWorksSection />`

### CreateCharacterPage.tsx

No extraction — already a single focused form. No changes.

---

## What Does Not Change

- API client (`src/api/`) — untouched
- Hooks `useCharacters`, `useUserGames` — untouched (consumed inside components)
- All component logic, styling, and behavior — no visual changes
- Backend — not in scope
