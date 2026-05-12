# Frontend Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the React frontend to use a global AuthContext (one `getMe()` call ever), a persistent `SignedInLayout` wrapper with NavBar/Footer, component folders organized by type, and self-contained page section components.

**Architecture:** Phase 1 — AuthContext at app root, `SignedInLayout` as a React Router nested route wrapper, component subfolders by type, all pages stripped of their own auth guards and nav/footer rendering. Phase 2 — inline page sections extracted into self-contained components that own their own state and API calls. Each phase leaves the app in a working state.

**Tech Stack:** React 18, TypeScript, React Router v6, Vite, Tailwind CSS

---

## File Map

**Created:**
- `src/context/AuthContext.tsx`
- `src/components/layout/SignedInLayout.tsx`
- `src/components/forms/GameSearchSection.tsx`
- `src/components/ui/UserRealmsSection.tsx`
- `src/components/cards/CharacterPanel.tsx`
- `src/components/ui/DiscoveryPanel.tsx`
- `src/components/ui/HeroSection.tsx`
- `src/components/ui/HowItWorksSection.tsx`

**Moved (import paths updated inside each file):**
- `components/NavBar.tsx` → `components/layout/NavBar.tsx`
- `components/Footer.tsx` → `components/layout/Footer.tsx`
- `components/FullScreenStatus.tsx` → `components/layout/FullScreenStatus.tsx`
- `components/Modal.tsx` → `components/modals/Modal.tsx`
- `components/AuthModal.tsx` → `components/modals/AuthModal.tsx`
- `components/GameSelectModal.tsx` → `components/modals/GameSelectModal.tsx`
- `components/UserGameSelectModal.tsx` → `components/modals/UserGameSelectModal.tsx`
- `components/GameCard.tsx` → `components/cards/GameCard.tsx`
- `components/RealmCard.tsx` → `components/cards/RealmCard.tsx`
- `components/SwipeCard.tsx` → `components/cards/SwipeCard.tsx`
- `components/StepCard.tsx` → `components/cards/StepCard.tsx`
- `components/GameSearchControls.tsx` → `components/forms/GameSearchControls.tsx`
- `components/CornerAccents.tsx` → `components/ui/CornerAccents.tsx`
- `components/SectionHeader.tsx` → `components/ui/SectionHeader.tsx`
- `components/Pagination.tsx` → `components/ui/Pagination.tsx`
- `components/GameGrid.tsx` → `components/ui/GameGrid.tsx`
- `components/GameBanner.tsx` → `components/ui/GameBanner.tsx`
- `components/MatchBanner.tsx` → `components/ui/MatchBanner.tsx`
- `components/SignOutButton.tsx` → `components/ui/SignOutButton.tsx`

**Deleted:** `src/hooks/useAuth.ts`

**Modified:** `App.tsx`, `pages/HomePage.tsx`, `pages/RealmPage.tsx`, `pages/CreateCharacterPage.tsx`, `pages/LandingPage.tsx`

---

## Phase 1: Auth Context + Layout + Folder Structure

### Task 1: Create AuthContext

**Files:**
- Create: `src/context/AuthContext.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, type CurrentUser } from "../api/endpoints/auth";
import { UnauthorizedError } from "../api/client";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unreachable" }
  | { status: "unauthenticated" };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setState({ status: "unauthenticated" });
      return;
    }
    getMe()
      .then((user) => setState({ status: "authenticated", user }))
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          setState({ status: "unauthenticated" });
        } else {
          setState({ status: "unreachable" });
        }
      });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npm run build --prefix apps/web`
Expected: Build completes (AuthContext not yet wired in — that's fine)

---

### Task 2: Reorganize Component Folders

**Files:** All existing files in `src/components/` — moved to subfolders with internal imports updated.

- [ ] **Step 1: Create the subfolders**

Run from repo root:
```
mkdir apps/web/src/components/layout
mkdir apps/web/src/components/modals
mkdir apps/web/src/components/cards
mkdir apps/web/src/components/forms
mkdir apps/web/src/components/ui
```

- [ ] **Step 2: Move layout components**

Move each file (copy content to new path, delete old file). No import changes needed inside these three files — they only import from `react-router-dom` or nothing:

- `components/NavBar.tsx` → `components/layout/NavBar.tsx`
- `components/Footer.tsx` → `components/layout/Footer.tsx`
- `components/FullScreenStatus.tsx` → `components/layout/FullScreenStatus.tsx`

- [ ] **Step 3: Move modal components**

Move and update internal imports:

**`components/modals/Modal.tsx`** — copy from `components/Modal.tsx`, no import changes.

**`components/modals/AuthModal.tsx`** — copy from `components/AuthModal.tsx`, update two imports:
```tsx
// was:
import { login, register } from "../api/endpoints/auth";
import { Modal } from "./Modal";
// becomes:
import { login, register } from "../../api/endpoints/auth";
import { Modal } from "./Modal";
```
*(The Modal import path stays `./Modal` — both are now in `modals/`.)*

**`components/modals/GameSelectModal.tsx`** — copy, update imports: any `../api/` becomes `../../api/`, any `../Modal` becomes `./Modal`.

**`components/modals/UserGameSelectModal.tsx`** — same pattern as GameSelectModal.

After creating new files, delete the originals: `Modal.tsx`, `AuthModal.tsx`, `GameSelectModal.tsx`, `UserGameSelectModal.tsx`.

- [ ] **Step 4: Move card components**

**`components/cards/GameCard.tsx`** — copy, no import changes (no custom imports).

**`components/cards/RealmCard.tsx`** — copy, update:
```tsx
// was:
import type { UserGame } from "../api/endpoints/userGames";
// becomes:
import type { UserGame } from "../../api/endpoints/userGames";
```

**`components/cards/SwipeCard.tsx`** — copy. Read the file first; update any `../api/` → `../../api/` and any `../CornerAccents` → `../ui/CornerAccents`.

**`components/cards/StepCard.tsx`** — copy, no import changes.

Delete originals: `GameCard.tsx`, `RealmCard.tsx`, `SwipeCard.tsx`, `StepCard.tsx`.

- [ ] **Step 5: Move form components**

**`components/forms/GameSearchControls.tsx`** — copy, no import changes. Delete original.

- [ ] **Step 6: Move UI components**

**`components/ui/CornerAccents.tsx`** — copy, no import changes.

**`components/ui/SectionHeader.tsx`** — copy, no import changes.

**`components/ui/Pagination.tsx`** — copy, no import changes.

**`components/ui/GameGrid.tsx`** — copy, update:
```tsx
// was:
import { GameCard } from "./GameCard";
// becomes:
import { GameCard } from "../cards/GameCard";
```

**`components/ui/GameBanner.tsx`** — copy, update:
```tsx
// was:
import type { UserGame } from "../api/endpoints/userGames";
// becomes:
import type { UserGame } from "../../api/endpoints/userGames";
```

**`components/ui/MatchBanner.tsx`** — copy, no import changes.

**`components/ui/SignOutButton.tsx`** — copy, no import changes.

Delete originals: `CornerAccents.tsx`, `SectionHeader.tsx`, `Pagination.tsx`, `GameGrid.tsx`, `GameBanner.tsx`, `MatchBanner.tsx`, `SignOutButton.tsx`.

- [ ] **Step 7: Verify no errors inside moved files**

Run: `npm run build --prefix apps/web`
Expected: TypeScript errors for pages that still import old paths — that's fine. There should be **no errors inside the moved component files themselves** (no undefined imports, no broken relative paths within components).

---

### Task 3: Create SignedInLayout

**Files:**
- Create: `src/components/layout/SignedInLayout.tsx`

`SignedInLayout` renders `NavBar + Outlet + Footer` for authenticated users. It exposes a `setNavExtra` function via Outlet context so child pages can inject page-specific content (e.g. a back link) into the NavBar's right slot.

- [ ] **Step 1: Create the file**

```tsx
// src/components/layout/SignedInLayout.tsx
import { useState, type ReactNode } from "react";
import { Outlet, Navigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";
import { FullScreenStatus } from "./FullScreenStatus";
import { SignOutButton } from "../ui/SignOutButton";

export type SignedInLayoutContext = {
  setNavExtra: (node: ReactNode) => void;
};

export default function SignedInLayout() {
  const auth = useAuth();
  const [navExtra, setNavExtra] = useState<ReactNode>(null);

  if (auth.status === "loading") return <FullScreenStatus type="loading" />;
  if (auth.status === "unauthenticated") return <Navigate to="/" replace />;
  if (auth.status === "unreachable")
    return <FullScreenStatus type="unreachable" onRetry={() => window.location.reload()} />;

  const { username } = auth.user;

  return (
    <div
      className="min-h-screen bg-brand-bg text-brand-text flex flex-col"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <NavBar
        rightSlot={
          <>
            {navExtra}
            <span className="font-mono text-[11px] text-brand-muted tracking-widest uppercase hidden sm:block">
              {username}
            </span>
            <SignOutButton />
          </>
        }
      />
      <Outlet context={{ setNavExtra } satisfies SignedInLayoutContext} />
      <Footer />
    </div>
  );
}

export function useSignedInLayout() {
  return useOutletContext<SignedInLayoutContext>();
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npm run build --prefix apps/web`
Expected: Build completes (pages not yet updated).

---

### Task 4: Update App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace App.tsx**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SignedInLayout from "./components/layout/SignedInLayout";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import RealmPage from "./pages/RealmPage";
import CreateCharacterPage from "./pages/CreateCharacterPage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<SignedInLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/realm/:gameId" element={<RealmPage />} />
            <Route path="/realm/:gameId/create-character" element={<CreateCharacterPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npm run build --prefix apps/web`
Expected: Build errors for pages still using old imports — will fix next.

---

### Task 5: Strip Auth/Nav/Footer from All Pages

Remove auth status guards, `NavBar`, `Footer`, and old `useAuth` from every protected page. Pages now render only their own content — `SignedInLayout` provides the shell.

**Files:**
- Modify: `src/pages/CreateCharacterPage.tsx`
- Modify: `src/pages/RealmPage.tsx`
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Replace CreateCharacterPage.tsx**

```tsx
// src/pages/CreateCharacterPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSignedInLayout } from "../components/layout/SignedInLayout";
import { useUserGames } from "../hooks/useUserGame";
import { createCharacter } from "../api/endpoints/characters";

const PLAYSTYLES = ["Casual", "Competitive", "Hybrid", "Hardcore", "Story-focused"];
const REGIONS = ["NA East", "NA West", "EU", "Asia", "OCE", "SA", "Global"];
const RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Legend", "Mythic"];

export default function CreateCharacterPage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { setNavExtra } = useSignedInLayout();
  const userGamesHook = useUserGames();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [playstyle, setPlaystyle] = useState("");
  const [rank, setRank] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setNavExtra(
      <Link
        to={`/realm/${gameId}`}
        className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
      >
        ← Realm
      </Link>
    );
    return () => setNavExtra(null);
  }, [setNavExtra, gameId]);

  const userGame =
    userGamesHook.status === "success"
      ? userGamesHook.games.find((g) => g.gameId === gameId) ?? null
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!userGame) { setErrorMsg("Realm not found."); setStatus("error"); return; }
    setStatus("loading");
    setErrorMsg("");
    try {
      await createCharacter({
        name: name.trim(),
        bio: bio.trim() || undefined,
        playstyle: playstyle || undefined,
        rank: rank || undefined,
        region: region || undefined,
        userGameId: userGame.id,
      });
      navigate(`/realm/${gameId}`);
    } catch {
      setErrorMsg("Failed to create character. Please try again.");
      setStatus("error");
    }
  }

  return (
    <main className="flex-1 px-6 md:px-10 py-14 max-w-2xl mx-auto w-full">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px w-6 bg-brand-neon" />
          <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">
            {userGame?.gameName ?? "Realm"}
          </span>
        </div>
        <h1 className="font-display font-black text-4xl text-brand-text uppercase tracking-wide">
          Create Your<br />
          <span style={{ color: "#00e5ff" }}>Character</span>
        </h1>
        <p className="text-brand-muted mt-3 text-sm leading-relaxed">
          This is how other players will see you. Make it count.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-2">
            Character Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. NightShade, IronFang..."
            maxLength={40}
            required
            className="w-full px-4 py-3 font-display text-brand-text placeholder:text-brand-muted/50 outline-none transition-all duration-200"
            style={{ background: "rgba(13,13,30,0.8)", border: "1px solid rgba(28,28,56,1)" }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(28,28,56,1)")}
          />
        </div>

        <div>
          <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-2">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What kind of player are you? What are you looking for in a teammate?"
            maxLength={280}
            rows={4}
            className="w-full px-4 py-3 font-body text-sm text-brand-text placeholder:text-brand-muted/50 outline-none resize-none transition-all duration-200"
            style={{ background: "rgba(13,13,30,0.8)", border: "1px solid rgba(28,28,56,1)" }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(28,28,56,1)")}
          />
          <div className="font-mono text-[10px] text-brand-muted/50 text-right mt-1">{bio.length}/280</div>
        </div>

        <div>
          <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Playstyle</label>
          <div className="flex flex-wrap gap-2">
            {PLAYSTYLES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlaystyle(playstyle === p ? "" : p)}
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
                style={{
                  background: playstyle === p ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
                  border: playstyle === p ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
                  color: playstyle === p ? "#00e5ff" : "#6e6e99",
                }}
              >{p}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Rank</label>
          <div className="flex flex-wrap gap-2">
            {RANKS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRank(rank === r ? "" : r)}
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
                style={{
                  background: rank === r ? "rgba(255,215,0,0.12)" : "rgba(13,13,30,0.6)",
                  border: rank === r ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(28,28,56,1)",
                  color: rank === r ? "#ffd700" : "#6e6e99",
                }}
              >{r}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Region</label>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(region === r ? "" : r)}
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
                style={{
                  background: region === r ? "rgba(124,58,237,0.15)" : "rgba(13,13,30,0.6)",
                  border: region === r ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(28,28,56,1)",
                  color: region === r ? "#a78bfa" : "#6e6e99",
                }}
              >{r}</button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <p className="font-mono text-brand-crimson text-xs border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3 tracking-wide">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || status === "loading"}
          className="w-full py-4 font-display font-black text-sm tracking-widest uppercase text-brand-bg transition-all duration-200 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: "linear-gradient(135deg, #00e5ff, #0088ff)",
            boxShadow: name.trim() ? "0 0 30px rgba(0,229,255,0.3)" : "none",
          }}
        >
          {status === "loading" ? "Creating..." : "Create Character →"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Replace RealmPage.tsx (Phase 1 intermediate — inline JSX kept, auth/nav/footer removed)**

```tsx
// src/pages/RealmPage.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSignedInLayout } from "../components/layout/SignedInLayout";
import { useUserGames } from "../hooks/useUserGame";
import {
  getCharacters,
  discoverCharacters,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
} from "../api/endpoints/characters";
import { GameBanner } from "../components/ui/GameBanner";
import { MatchBanner } from "../components/ui/MatchBanner";
import { SwipeCard } from "../components/cards/SwipeCard";

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { setNavExtra } = useSignedInLayout();
  const userGamesHook = useUserGames();

  const [myCharacter, setMyCharacter] = useState<Character | null | "loading">("loading");
  const [discoverQueue, setDiscoverQueue] = useState<DiscoverCharacter[]>([]);
  const [discoverStatus, setDiscoverStatus] = useState<"loading" | "ready" | "empty" | "unavailable">("loading");
  const [matchBanner, setMatchBanner] = useState(false);

  const userGame =
    userGamesHook.status === "success"
      ? userGamesHook.games.find((g) => g.gameId === gameId) ?? null
      : null;

  useEffect(() => {
    setNavExtra(
      <Link
        to="/home"
        className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
      >
        ← Hub
      </Link>
    );
    return () => setNavExtra(null);
  }, [setNavExtra]);

  useEffect(() => {
    if (!userGame) return;
    getCharacters()
      .then((chars) => {
        const mine = chars.find((c) => c.userGameId === userGame.id) ?? null;
        setMyCharacter(mine);
      })
      .catch(() => setMyCharacter(null));
  }, [userGame?.id]);

  useEffect(() => {
    if (!gameId) return;
    discoverCharacters(gameId)
      .then((chars) => {
        setDiscoverQueue(chars);
        setDiscoverStatus(chars.length === 0 ? "empty" : "ready");
      })
      .catch(() => setDiscoverStatus("unavailable"));
  }, [gameId]);

  async function handleLike() {
    const current = discoverQueue[0];
    if (!current || myCharacter === "loading" || myCharacter === null) return;
    try {
      const matchResponse = await interactWithCharacter(myCharacter.id, current.id, "Like");
      setMatchBanner(matchResponse.isMatch);
      setTimeout(() => setMatchBanner(false), 2500);
    } catch { /* interaction may fail gracefully */ }
    setDiscoverQueue((q) => q.slice(1));
    if (discoverQueue.length <= 1) setDiscoverStatus("empty");
  }

  async function handleDislike() {
    const current = discoverQueue[0];
    if (!current || myCharacter === "loading" || myCharacter === null) return;
    try {
      await interactWithCharacter(myCharacter.id, current.id, "Dislike");
    } catch { /* interaction may fail gracefully */ }
    setDiscoverQueue((q) => q.slice(1));
    if (discoverQueue.length <= 1) setDiscoverStatus("empty");
  }

  return (
    <>
      {matchBanner && <MatchBanner />}
      <GameBanner game={userGame} />
      <main className="flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          <section>
            <div className="mb-6">
              <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Your Identity</span>
              <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">Your Character</h2>
            </div>
            {myCharacter === "loading" || userGamesHook.status === "loading" ? (
              <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.6)" }}>
                <p className="font-mono text-brand-muted text-xs tracking-widest uppercase">Loading...</p>
              </div>
            ) : myCharacter ? (
              <div className="rounded-lg p-6 border border-brand-neon/20" style={{ background: "rgba(13,13,30,0.8)", boxShadow: "0 0 30px rgba(0,229,255,0.05)" }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-mono text-[10px] text-brand-neon/60 tracking-widest uppercase mb-1">Active</div>
                    <h3 className="font-display font-black text-2xl text-brand-text uppercase tracking-wide">{myCharacter.name}</h3>
                  </div>
                  <Link to={`/realm/${gameId}/create-character`} className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 text-brand-muted border border-brand-border hover:border-brand-muted transition-all duration-200">Edit</Link>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {myCharacter.playstyle && (
                    <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff" }}>{myCharacter.playstyle}</span>
                  )}
                  {myCharacter.rank && (
                    <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", color: "#ffd700" }}>{myCharacter.rank}</span>
                  )}
                  {myCharacter.region && (
                    <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>{myCharacter.region}</span>
                  )}
                </div>
                {myCharacter.bio && <p className="text-brand-muted text-sm leading-relaxed">{myCharacter.bio}</p>}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.4)" }}>
                <div className="text-4xl mb-4 text-brand-muted">◈</div>
                <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">No Character Yet</p>
                <p className="text-brand-muted text-sm mb-6">Create a character to start matching in this realm.</p>
                {userGame && (
                  <Link to={`/realm/${gameId}/create-character`} className="inline-block font-mono text-xs tracking-widest uppercase px-6 py-2.5 text-brand-neon border border-brand-neon/40 hover:border-brand-neon hover:bg-brand-neon/10 transition-all duration-200">+ Create Character</Link>
                )}
              </div>
            )}
          </section>

          <section>
            <div className="mb-6">
              <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Matchmaking</span>
              <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">
                Discover Players
                {discoverStatus === "ready" && (
                  <span className="font-mono text-xs text-brand-muted ml-3 normal-case tracking-normal">{discoverQueue.length} remaining</span>
                )}
              </h2>
            </div>
            {!myCharacter || myCharacter === "loading" ? (
              <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.4)" }}>
                <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">Create a Character First</p>
                <p className="text-brand-muted text-sm">You need a character in this realm before you can match with others.</p>
              </div>
            ) : discoverStatus === "loading" ? (
              <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.6)" }}>
                <p className="font-mono text-brand-muted text-xs tracking-widest uppercase">Scanning the realm...</p>
              </div>
            ) : discoverStatus === "empty" ? (
              <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.4)" }}>
                <div className="text-4xl mb-4 text-brand-muted">◈</div>
                <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">All Caught Up</p>
                <p className="text-brand-muted text-sm">No more characters to discover right now. Check back later.</p>
              </div>
            ) : discoverStatus === "unavailable" ? (
              <div className="rounded-lg border border-dashed border-brand-pink/30 p-10 text-center" style={{ background: "rgba(255,0,128,0.03)" }}>
                <div className="text-4xl mb-4" style={{ color: "rgba(255,0,128,0.4)" }}>◈</div>
                <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">Matchmaking Coming Soon</p>
                <p className="text-brand-muted text-sm">The discover endpoint isn't live yet — hang tight while we build it out.</p>
              </div>
            ) : (
              <div className="relative" style={{ height: "520px" }}>
                {discoverQueue.slice(0, 2).map((char, i) => (
                  <SwipeCard key={char.id} character={char} onLike={handleLike} onDislike={handleDislike} isTop={i === 0} />
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Update LandingPage.tsx imports only**

Change these three import lines (all other code stays identical):
```tsx
// Replace:
import { NavBar } from "../components/NavBar";
import { Footer } from "../components/Footer";
import AuthModal from "../components/AuthModal";

// With:
import { NavBar } from "../components/layout/NavBar";
import { Footer } from "../components/layout/Footer";
import AuthModal from "../components/modals/AuthModal";
```

- [ ] **Step 4: Replace HomePage.tsx (Phase 1 intermediate — inline JSX kept, auth/nav/footer removed)**

```tsx
// src/pages/HomePage.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getGames, type Game, type PagedGames } from "../api/endpoints/games";
import { addUserGame, deleteUserGame, type UserGame } from "../api/endpoints/userGames";
import { HttpError } from "../api/client";
import { GameGrid } from "../components/ui/GameGrid";
import { GameSearchControls } from "../components/forms/GameSearchControls";
import { Pagination } from "../components/ui/Pagination";
import { GameSelectModal, type AddState } from "../components/modals/GameSelectModal";
import { useUserGames } from "../hooks/useUserGame";
import { UserGameSelectModal } from "../components/modals/UserGameSelectModal";
import { RealmCard } from "../components/cards/RealmCard";

const MMO_GENRE_ID = 59;

type GamesState =
  | { status: "loading" }
  | { status: "success"; data: PagedGames }
  | { status: "error"; message: string };

export default function HomePage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const userGames = useUserGames();
  const userGamesData = userGames.status === "success" ? userGames.games : [];

  const [query, setQuery] = useState("");
  const [mmoOnly, setMmoOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [gamesState, setGamesState] = useState<GamesState>({ status: "loading" });
  const [showSearch, setShowSearch] = useState(false);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedUserGame, setSelectedUserGame] = useState<UserGame | null>(null);
  const [addState, setAddState] = useState<AddState>("idle");
  const [deleteState, setDeleteState] = useState<AddState>("idle");

  const prevQueryRef = useRef(query);

  useEffect(() => {
    if (!showSearch) return;
    const queryChanged = prevQueryRef.current !== query;
    prevQueryRef.current = query;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        getGames({ q: query || undefined, page, genres: mmoOnly ? [MMO_GENRE_ID] : undefined })
          .then((data) => { if (!cancelled) setGamesState({ status: "success", data }); })
          .catch(() => {
            if (!cancelled)
              setGamesState({ status: "error", message: "Could not load games. Is the API running?" });
          });
      },
      queryChanged ? 400 : 0
    );
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, page, mmoOnly, showSearch]);

  function handleQueryChange(value: string) { setQuery(value); setPage(1); }
  function handleMmoToggle() { setMmoOnly((p) => !p); setPage(1); }
  function handleGameSelect(game: Game) { setSelectedGame(game); setAddState("idle"); }
  function handleUserGameSelect(userGame: UserGame) { setSelectedUserGame(userGame); setDeleteState("idle"); }
  function handleModalClose() { setSelectedGame(null); setSelectedUserGame(null); setAddState("idle"); }

  async function handleAddConfirm() {
    if (!selectedGame) return;
    setAddState("loading");
    try {
      const userGame = await addUserGame({
        externalId: selectedGame.externalId,
        name: selectedGame.name,
        imageUrl: selectedGame.imageUrl ?? null,
      });
      userGames.addUserGame(userGame);
      setAddState("success");
    } catch (err: unknown) {
      if (err instanceof HttpError && err.status === 409) setAddState("conflict");
      else setAddState("error");
    }
  }

  async function handleDelete() {
    if (!selectedUserGame) return;
    setDeleteState("loading");
    try {
      await deleteUserGame(selectedUserGame.id);
      userGames.removeGame(selectedUserGame);
      setDeleteState("success");
    } catch (err: unknown) {
      if (err instanceof HttpError && err.status === 409) setDeleteState("conflict");
      else setDeleteState("error");
    }
  }

  const username = auth.status === "authenticated" ? auth.user.username : "";
  const successData = gamesState.status === "success" ? gamesState.data : null;

  return (
    <main className="flex-1 px-6 md:px-10 py-12 max-w-7xl mx-auto w-full">
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px w-6 bg-brand-neon" />
          <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">Welcome Back</span>
        </div>
        <h1 className="font-display font-black text-4xl md:text-5xl text-brand-text uppercase tracking-wide">
          {username}
        </h1>
      </div>

      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Your Collection</span>
            <h2 className="font-display font-bold text-2xl text-brand-text uppercase tracking-wide">Your Realms</h2>
          </div>
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="font-mono text-xs tracking-widest uppercase px-5 py-2.5 transition-all duration-200"
            style={{
              background: showSearch ? "rgba(0,229,255,0.1)" : "transparent",
              border: "1px solid",
              borderColor: showSearch ? "rgba(0,229,255,0.5)" : "rgba(110,110,153,0.4)",
              color: showSearch ? "#00e5ff" : "#6e6e99",
            }}
          >
            {showSearch ? "✕ Close" : "+ Add Realm"}
          </button>
        </div>

        {userGamesData.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {userGamesData.map((ug) => (
              <RealmCard key={ug.id} userGame={ug} onClick={handleUserGameSelect} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-brand-border p-16 text-center" style={{ background: "rgba(13,13,30,0.4)" }}>
            <div className="text-4xl mb-4 text-brand-muted">◈</div>
            <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">No Realms Yet</p>
            <p className="text-brand-muted text-sm mb-6">Add a game to start matching with other players.</p>
            <button
              onClick={() => setShowSearch(true)}
              className="font-mono text-xs tracking-widest uppercase px-6 py-2.5 text-brand-neon border border-brand-neon/40 hover:border-brand-neon hover:bg-brand-neon/10 transition-all duration-200"
            >
              Discover Games
            </button>
          </div>
        )}
      </section>

      {showSearch && (
        <section className="rounded-lg border border-brand-border p-8 mb-12" style={{ background: "rgba(13,13,30,0.6)" }}>
          <div className="mb-6">
            <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Discover</span>
            <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">Find a Game</h2>
          </div>
          <GameSearchControls query={query} onQueryChange={handleQueryChange} mmoOnly={mmoOnly} onMmoToggle={handleMmoToggle} />
          {successData && (
            <p className="font-mono text-brand-muted text-[11px] tracking-widest uppercase mt-6 mb-4">
              {successData.totalCount.toLocaleString()} game{successData.totalCount !== 1 ? "s" : ""} found
              {mmoOnly && !query && " · MMO filter active"}
            </p>
          )}
          <div className="mt-4">
            {gamesState.status === "loading" && (
              <p className="font-mono text-brand-muted text-sm py-12 text-center tracking-widest uppercase">Scanning realms...</p>
            )}
            {gamesState.status === "error" && (
              <p className="font-mono text-brand-crimson text-xs border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3 inline-block tracking-wide">{gamesState.message}</p>
            )}
            {successData && <GameGrid items={successData.games} getGame={(g) => g} onSelect={handleGameSelect} />}
          </div>
          {successData && (
            <Pagination
              page={page}
              totalPages={successData.totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(successData.totalPages, p + 1))}
            />
          )}
        </section>
      )}

      {selectedGame && (
        <GameSelectModal game={selectedGame} addState={addState} onConfirm={handleAddConfirm} onClose={handleModalClose} />
      )}
      {selectedUserGame && (
        <UserGameSelectModal
          userGame={selectedUserGame}
          deleteState={deleteState}
          onConfirm={() => navigate(`/realm/${selectedUserGame.gameId}`)}
          onDelete={handleDelete}
          onClose={handleModalClose}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 5: Full build and smoke test**

Run: `npm run build --prefix apps/web`
Expected: **Clean build with no errors.**

Then start dev server: `npm run dev --prefix apps/web` and verify:
- `/` — landing page loads normally
- Visiting `/home` without a token redirects to `/`
- Signing in navigates to `/home` with NavBar showing username + sign out
- Navigating to a realm shows "← Hub" in NavBar right slot
- Create character page shows "← Realm" in NavBar right slot

---

### Task 6: Delete useAuth.ts and Commit Phase 1

**Files:**
- Delete: `src/hooks/useAuth.ts`

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -r "hooks/useAuth" apps/web/src/`
Expected: No output.

- [ ] **Step 2: Delete the file**

Delete `apps/web/src/hooks/useAuth.ts`.

- [ ] **Step 3: Final build**

Run: `npm run build --prefix apps/web`
Expected: Clean build.

- [ ] **Step 4: Commit Phase 1**

```bash
git add apps/web/src/
git commit -m "refactor: Phase 1 — AuthContext, SignedInLayout, component folder structure"
```

---

## Phase 2: Extract Self-Contained Page Section Components

### Task 7: Create GameSearchSection

**Files:**
- Create: `src/components/forms/GameSearchSection.tsx`

Owns all game search state and API calls. Receives `onGameAdded()` callback to signal the parent after a successful realm add.

- [ ] **Step 1: Create the file**

```tsx
// src/components/forms/GameSearchSection.tsx
import { useEffect, useRef, useState } from "react";
import { getGames, type Game, type PagedGames } from "../../api/endpoints/games";
import { addUserGame } from "../../api/endpoints/userGames";
import { HttpError } from "../../api/client";
import { GameGrid } from "../ui/GameGrid";
import { GameSearchControls } from "./GameSearchControls";
import { Pagination } from "../ui/Pagination";
import { GameSelectModal, type AddState } from "../modals/GameSelectModal";

const MMO_GENRE_ID = 59;

type GamesState =
  | { status: "loading" }
  | { status: "success"; data: PagedGames }
  | { status: "error"; message: string };

type Props = {
  onGameAdded: () => void;
};

export function GameSearchSection({ onGameAdded }: Props) {
  const [query, setQuery] = useState("");
  const [mmoOnly, setMmoOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [gamesState, setGamesState] = useState<GamesState>({ status: "loading" });
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [addState, setAddState] = useState<AddState>("idle");
  const prevQueryRef = useRef(query);

  useEffect(() => {
    const queryChanged = prevQueryRef.current !== query;
    prevQueryRef.current = query;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        getGames({ q: query || undefined, page, genres: mmoOnly ? [MMO_GENRE_ID] : undefined })
          .then((data) => { if (!cancelled) setGamesState({ status: "success", data }); })
          .catch(() => {
            if (!cancelled)
              setGamesState({ status: "error", message: "Could not load games. Is the API running?" });
          });
      },
      queryChanged ? 400 : 0
    );
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, page, mmoOnly]);

  function handleQueryChange(value: string) { setQuery(value); setPage(1); }
  function handleMmoToggle() { setMmoOnly((p) => !p); setPage(1); }
  function handleGameSelect(game: Game) { setSelectedGame(game); setAddState("idle"); }
  function handleModalClose() { setSelectedGame(null); setAddState("idle"); }

  async function handleAddConfirm() {
    if (!selectedGame) return;
    setAddState("loading");
    try {
      await addUserGame({
        externalId: selectedGame.externalId,
        name: selectedGame.name,
        imageUrl: selectedGame.imageUrl ?? null,
      });
      setAddState("success");
      onGameAdded();
    } catch (err: unknown) {
      if (err instanceof HttpError && err.status === 409) setAddState("conflict");
      else setAddState("error");
    }
  }

  const successData = gamesState.status === "success" ? gamesState.data : null;

  return (
    <section
      className="rounded-lg border border-brand-border p-8 mb-12"
      style={{ background: "rgba(13,13,30,0.6)" }}
    >
      <div className="mb-6">
        <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Discover</span>
        <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">Find a Game</h2>
      </div>

      <GameSearchControls
        query={query}
        onQueryChange={handleQueryChange}
        mmoOnly={mmoOnly}
        onMmoToggle={handleMmoToggle}
      />

      {successData && (
        <p className="font-mono text-brand-muted text-[11px] tracking-widest uppercase mt-6 mb-4">
          {successData.totalCount.toLocaleString()} game{successData.totalCount !== 1 ? "s" : ""} found
          {mmoOnly && !query && " · MMO filter active"}
        </p>
      )}

      <div className="mt-4">
        {gamesState.status === "loading" && (
          <p className="font-mono text-brand-muted text-sm py-12 text-center tracking-widest uppercase">Scanning realms...</p>
        )}
        {gamesState.status === "error" && (
          <p className="font-mono text-brand-crimson text-xs border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3 inline-block tracking-wide">
            {gamesState.message}
          </p>
        )}
        {successData && <GameGrid items={successData.games} getGame={(g) => g} onSelect={handleGameSelect} />}
      </div>

      {successData && (
        <Pagination
          page={page}
          totalPages={successData.totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(successData.totalPages, p + 1))}
        />
      )}

      {selectedGame && (
        <GameSelectModal
          game={selectedGame}
          addState={addState}
          onConfirm={handleAddConfirm}
          onClose={handleModalClose}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build --prefix apps/web`
Expected: Clean build.

---

### Task 8: Create UserRealmsSection

**Files:**
- Create: `src/components/ui/UserRealmsSection.tsx`

Owns `useUserGames()` and all realm grid state. Receives `showSearch` (bool for button styling) and `onAddRealm` callback. The parent uses `key={refreshTrigger}` to remount this component after a game add, which causes a fresh `getUserGames()` fetch.

- [ ] **Step 1: Create the file**

```tsx
// src/components/ui/UserRealmsSection.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteUserGame, type UserGame } from "../../api/endpoints/userGames";
import { HttpError } from "../../api/client";
import { useUserGames } from "../../hooks/useUserGame";
import { RealmCard } from "../cards/RealmCard";
import { UserGameSelectModal } from "../modals/UserGameSelectModal";
import type { AddState } from "../modals/GameSelectModal";

type Props = {
  onAddRealm: () => void;
  showSearch: boolean;
};

export function UserRealmsSection({ onAddRealm, showSearch }: Props) {
  const navigate = useNavigate();
  const userGames = useUserGames();
  const userGamesData = userGames.status === "success" ? userGames.games : [];

  const [selectedUserGame, setSelectedUserGame] = useState<UserGame | null>(null);
  const [deleteState, setDeleteState] = useState<AddState>("idle");

  function handleUserGameSelect(userGame: UserGame) { setSelectedUserGame(userGame); setDeleteState("idle"); }
  function handleModalClose() { setSelectedUserGame(null); setDeleteState("idle"); }

  async function handleDelete() {
    if (!selectedUserGame) return;
    setDeleteState("loading");
    try {
      await deleteUserGame(selectedUserGame.id);
      userGames.removeGame(selectedUserGame);
      setDeleteState("success");
    } catch (err: unknown) {
      if (err instanceof HttpError && err.status === 409) setDeleteState("conflict");
      else setDeleteState("error");
    }
  }

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Your Collection</span>
          <h2 className="font-display font-bold text-2xl text-brand-text uppercase tracking-wide">Your Realms</h2>
        </div>
        <button
          onClick={onAddRealm}
          className="font-mono text-xs tracking-widest uppercase px-5 py-2.5 transition-all duration-200"
          style={{
            background: showSearch ? "rgba(0,229,255,0.1)" : "transparent",
            border: "1px solid",
            borderColor: showSearch ? "rgba(0,229,255,0.5)" : "rgba(110,110,153,0.4)",
            color: showSearch ? "#00e5ff" : "#6e6e99",
          }}
        >
          {showSearch ? "✕ Close" : "+ Add Realm"}
        </button>
      </div>

      {userGamesData.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {userGamesData.map((ug) => (
            <RealmCard key={ug.id} userGame={ug} onClick={handleUserGameSelect} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-brand-border p-16 text-center" style={{ background: "rgba(13,13,30,0.4)" }}>
          <div className="text-4xl mb-4 text-brand-muted">◈</div>
          <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">No Realms Yet</p>
          <p className="text-brand-muted text-sm mb-6">Add a game to start matching with other players.</p>
          <button
            onClick={onAddRealm}
            className="font-mono text-xs tracking-widest uppercase px-6 py-2.5 text-brand-neon border border-brand-neon/40 hover:border-brand-neon hover:bg-brand-neon/10 transition-all duration-200"
          >
            Discover Games
          </button>
        </div>
      )}

      {selectedUserGame && (
        <UserGameSelectModal
          userGame={selectedUserGame}
          deleteState={deleteState}
          onConfirm={() => navigate(`/realm/${selectedUserGame.gameId}`)}
          onDelete={handleDelete}
          onClose={handleModalClose}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build --prefix apps/web`
Expected: Clean build.

---

### Task 9: Simplify HomePage

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Replace HomePage.tsx with simplified version**

```tsx
// src/pages/HomePage.tsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { GameSearchSection } from "../components/forms/GameSearchSection";
import { UserRealmsSection } from "../components/ui/UserRealmsSection";

export default function HomePage() {
  const auth = useAuth();
  const username = auth.status === "authenticated" ? auth.user.username : "";
  const [showSearch, setShowSearch] = useState(false);
  const [realmsKey, setRealmsKey] = useState(0);

  function handleGameAdded() {
    setRealmsKey((k) => k + 1);
  }

  return (
    <main className="flex-1 px-6 md:px-10 py-12 max-w-7xl mx-auto w-full">
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px w-6 bg-brand-neon" />
          <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">Welcome Back</span>
        </div>
        <h1 className="font-display font-black text-4xl md:text-5xl text-brand-text uppercase tracking-wide">
          {username}
        </h1>
      </div>

      <UserRealmsSection
        key={realmsKey}
        onAddRealm={() => setShowSearch((s) => !s)}
        showSearch={showSearch}
      />

      {showSearch && <GameSearchSection onGameAdded={handleGameAdded} />}
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build --prefix apps/web`
Expected: Clean build.

- [ ] **Step 3: Smoke test**

Start dev server and verify:
- Realms grid loads on `/home`
- "+ Add Realm" toggles `GameSearchSection` open/closed
- Adding a game via `GameSelectModal` causes the realm grid to show a brief loading state then appear with the new realm
- Deleting a realm via `UserGameSelectModal` removes it from the grid

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/forms/GameSearchSection.tsx apps/web/src/components/ui/UserRealmsSection.tsx apps/web/src/pages/HomePage.tsx
git commit -m "refactor: extract GameSearchSection and UserRealmsSection from HomePage"
```

---

### Task 10: Create CharacterPanel and DiscoveryPanel

**Files:**
- Create: `src/components/cards/CharacterPanel.tsx`
- Create: `src/components/ui/DiscoveryPanel.tsx`

- [ ] **Step 1: Create CharacterPanel**

Pure display component — receives character data as props, no API calls.

```tsx
// src/components/cards/CharacterPanel.tsx
import { Link } from "react-router-dom";
import type { Character } from "../../api/endpoints/characters";
import type { UserGame } from "../../api/endpoints/userGames";

type Props = {
  gameId: string;
  character: Character | null | "loading";
  userGame: UserGame | null;
  userGameLoading: boolean;
};

export function CharacterPanel({ gameId, character, userGame, userGameLoading }: Props) {
  return (
    <section>
      <div className="mb-6">
        <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Your Identity</span>
        <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">Your Character</h2>
      </div>

      {character === "loading" || userGameLoading ? (
        <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.6)" }}>
          <p className="font-mono text-brand-muted text-xs tracking-widest uppercase">Loading...</p>
        </div>
      ) : character ? (
        <div className="rounded-lg p-6 border border-brand-neon/20" style={{ background: "rgba(13,13,30,0.8)", boxShadow: "0 0 30px rgba(0,229,255,0.05)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-mono text-[10px] text-brand-neon/60 tracking-widest uppercase mb-1">Active</div>
              <h3 className="font-display font-black text-2xl text-brand-text uppercase tracking-wide">{character.name}</h3>
            </div>
            <Link to={`/realm/${gameId}/create-character`} className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 text-brand-muted border border-brand-border hover:border-brand-muted transition-all duration-200">Edit</Link>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {character.playstyle && (
              <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff" }}>{character.playstyle}</span>
            )}
            {character.rank && (
              <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", color: "#ffd700" }}>{character.rank}</span>
            )}
            {character.region && (
              <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>{character.region}</span>
            )}
          </div>
          {character.bio && <p className="text-brand-muted text-sm leading-relaxed">{character.bio}</p>}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.4)" }}>
          <div className="text-4xl mb-4 text-brand-muted">◈</div>
          <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">No Character Yet</p>
          <p className="text-brand-muted text-sm mb-6">Create a character to start matching in this realm.</p>
          {userGame && (
            <Link to={`/realm/${gameId}/create-character`} className="inline-block font-mono text-xs tracking-widest uppercase px-6 py-2.5 text-brand-neon border border-brand-neon/40 hover:border-brand-neon hover:bg-brand-neon/10 transition-all duration-200">+ Create Character</Link>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Create DiscoveryPanel**

Owns the discover fetch, swipe queue state, and interact API calls.

```tsx
// src/components/ui/DiscoveryPanel.tsx
import { useEffect, useState } from "react";
import {
  discoverCharacters,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
} from "../../api/endpoints/characters";
import { SwipeCard } from "../cards/SwipeCard";
import { MatchBanner } from "./MatchBanner";

type Props = {
  gameId: string;
  myCharacter: Character | null | "loading";
};

export function DiscoveryPanel({ gameId, myCharacter }: Props) {
  const [discoverQueue, setDiscoverQueue] = useState<DiscoverCharacter[]>([]);
  const [discoverStatus, setDiscoverStatus] = useState<"loading" | "ready" | "empty" | "unavailable">("loading");
  const [matchBanner, setMatchBanner] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    discoverCharacters(gameId)
      .then((chars) => {
        setDiscoverQueue(chars);
        setDiscoverStatus(chars.length === 0 ? "empty" : "ready");
      })
      .catch(() => setDiscoverStatus("unavailable"));
  }, [gameId]);

  async function handleLike() {
    const current = discoverQueue[0];
    if (!current || myCharacter === "loading" || myCharacter === null) return;
    try {
      const matchResponse = await interactWithCharacter(myCharacter.id, current.id, "Like");
      setMatchBanner(matchResponse.isMatch);
      setTimeout(() => setMatchBanner(false), 2500);
    } catch { /* interaction may fail gracefully */ }
    setDiscoverQueue((q) => q.slice(1));
    if (discoverQueue.length <= 1) setDiscoverStatus("empty");
  }

  async function handleDislike() {
    const current = discoverQueue[0];
    if (!current || myCharacter === "loading" || myCharacter === null) return;
    try {
      await interactWithCharacter(myCharacter.id, current.id, "Dislike");
    } catch { /* interaction may fail gracefully */ }
    setDiscoverQueue((q) => q.slice(1));
    if (discoverQueue.length <= 1) setDiscoverStatus("empty");
  }

  return (
    <section>
      {matchBanner && <MatchBanner />}
      <div className="mb-6">
        <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Matchmaking</span>
        <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">
          Discover Players
          {discoverStatus === "ready" && (
            <span className="font-mono text-xs text-brand-muted ml-3 normal-case tracking-normal">{discoverQueue.length} remaining</span>
          )}
        </h2>
      </div>

      {!myCharacter || myCharacter === "loading" ? (
        <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.4)" }}>
          <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">Create a Character First</p>
          <p className="text-brand-muted text-sm">You need a character in this realm before you can match with others.</p>
        </div>
      ) : discoverStatus === "loading" ? (
        <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.6)" }}>
          <p className="font-mono text-brand-muted text-xs tracking-widest uppercase">Scanning the realm...</p>
        </div>
      ) : discoverStatus === "empty" ? (
        <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.4)" }}>
          <div className="text-4xl mb-4 text-brand-muted">◈</div>
          <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">All Caught Up</p>
          <p className="text-brand-muted text-sm">No more characters to discover right now. Check back later.</p>
        </div>
      ) : discoverStatus === "unavailable" ? (
        <div className="rounded-lg border border-dashed border-brand-pink/30 p-10 text-center" style={{ background: "rgba(255,0,128,0.03)" }}>
          <div className="text-4xl mb-4" style={{ color: "rgba(255,0,128,0.4)" }}>◈</div>
          <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">Matchmaking Coming Soon</p>
          <p className="text-brand-muted text-sm">The discover endpoint isn't live yet — hang tight while we build it out.</p>
        </div>
      ) : (
        <div className="relative" style={{ height: "520px" }}>
          {discoverQueue.slice(0, 2).map((char, i) => (
            <SwipeCard key={char.id} character={char} onLike={handleLike} onDislike={handleDislike} isTop={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build --prefix apps/web`
Expected: Clean build.

---

### Task 11: Simplify RealmPage

**Files:**
- Modify: `src/pages/RealmPage.tsx`

- [ ] **Step 1: Replace RealmPage.tsx**

```tsx
// src/pages/RealmPage.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSignedInLayout } from "../components/layout/SignedInLayout";
import { useUserGames } from "../hooks/useUserGame";
import { getCharacters, type Character } from "../api/endpoints/characters";
import { GameBanner } from "../components/ui/GameBanner";
import { CharacterPanel } from "../components/cards/CharacterPanel";
import { DiscoveryPanel } from "../components/ui/DiscoveryPanel";

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { setNavExtra } = useSignedInLayout();
  const userGamesHook = useUserGames();
  const [myCharacter, setMyCharacter] = useState<Character | null | "loading">("loading");

  const userGame =
    userGamesHook.status === "success"
      ? userGamesHook.games.find((g) => g.gameId === gameId) ?? null
      : null;

  useEffect(() => {
    setNavExtra(
      <Link
        to="/home"
        className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
      >
        ← Hub
      </Link>
    );
    return () => setNavExtra(null);
  }, [setNavExtra]);

  useEffect(() => {
    if (!userGame) return;
    getCharacters()
      .then((chars) => {
        const mine = chars.find((c) => c.userGameId === userGame.id) ?? null;
        setMyCharacter(mine);
      })
      .catch(() => setMyCharacter(null));
  }, [userGame?.id]);

  return (
    <>
      <GameBanner game={userGame} />
      <main className="flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <CharacterPanel
            gameId={gameId ?? ""}
            character={myCharacter}
            userGame={userGame}
            userGameLoading={userGamesHook.status === "loading"}
          />
          <DiscoveryPanel gameId={gameId ?? ""} myCharacter={myCharacter} />
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build --prefix apps/web`
Expected: Clean build.

- [ ] **Step 3: Smoke test RealmPage**

Start dev server and verify:
- Navigating to a realm shows GameBanner, CharacterPanel, DiscoveryPanel
- "← Hub" appears in the NavBar right slot
- Navigating back to `/home` removes the "← Hub" button

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/cards/CharacterPanel.tsx apps/web/src/components/ui/DiscoveryPanel.tsx apps/web/src/pages/RealmPage.tsx
git commit -m "refactor: extract CharacterPanel and DiscoveryPanel from RealmPage"
```

---

### Task 12: Extract HeroSection and HowItWorksSection, Simplify LandingPage

**Files:**
- Create: `src/components/ui/HeroSection.tsx`
- Create: `src/components/ui/HowItWorksSection.tsx`
- Modify: `src/pages/LandingPage.tsx`

`modal` state stays in `LandingPage` since both `HeroSection` and the CTA section at the bottom need to open it. `HeroSection` receives an `onOpenModal` callback. `AuthModal` stays in `LandingPage`.

- [ ] **Step 1: Create HeroSection**

```tsx
// src/components/ui/HeroSection.tsx
import { NavBar } from "../layout/NavBar";

type ModalMode = "sign-in" | "sign-up";

const floatingCards = [
  { name: "NightShade", game: "League of Legends", role: "Support", rank: "Diamond" },
  { name: "IronFang", game: "World of Warcraft", role: "Tank", rank: "Mythic" },
  { name: "VoidWalker", game: "Destiny 2", role: "Warlock", rank: "Legend" },
];

type Props = {
  onOpenModal: (mode: ModalMode) => void;
};

export function HeroSection({ onOpenModal }: Props) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden grid-bg">
      <NavBar
        variant="overlay"
        rightSlot={
          <button
            onClick={() => onOpenModal("sign-in")}
            className="font-mono text-xs tracking-widest uppercase px-5 py-2.5 text-brand-neon border border-brand-neon/40 hover:border-brand-neon hover:bg-brand-neon/10 transition-all duration-200"
          >
            Sign In
          </button>
        }
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(0,229,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,0,128,0.06) 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-bg pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col lg:flex-row items-center gap-16 py-32">
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-brand-neon" />
            <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">Gaming Matchmaking</span>
          </div>
          <h1 className="font-display font-black leading-none mb-6 uppercase" style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)" }}>
            <span className="block text-brand-text">Find Your</span>
            <span className="block" style={{ color: "#00e5ff", textShadow: "0 0 40px rgba(0,229,255,0.5)" }}>Player</span>
            <span className="block" style={{ color: "#ff0080", textShadow: "0 0 40px rgba(255,0,128,0.4)" }}>Two.</span>
          </h1>
          <p className="text-brand-muted text-lg max-w-md mb-10 leading-relaxed">
            Match with other gamers through the characters you play — not just your username. Swipe on character cards, find your squad.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => onOpenModal("sign-up")}
              className="font-display font-bold tracking-widest uppercase text-sm px-10 py-4 text-brand-bg transition-all duration-200 hover:scale-105"
              style={{ background: "linear-gradient(135deg, #00e5ff, #0088ff)", boxShadow: "0 0 30px rgba(0,229,255,0.35)" }}
            >
              Create Account
            </button>
            <button
              onClick={() => onOpenModal("sign-in")}
              className="font-display font-bold tracking-widest uppercase text-sm px-10 py-4 text-brand-text border border-brand-border hover:border-brand-muted transition-all duration-200"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center min-h-[420px] w-full max-w-sm">
          {floatingCards.map((card, i) => {
            const offsets = [
              { top: "0%", left: "10%", delay: "0s", rotate: "-6deg" },
              { top: "22%", left: "35%", delay: "1.3s", rotate: "3deg" },
              { top: "44%", left: "5%", delay: "0.7s", rotate: "-3deg" },
            ];
            const o = offsets[i];
            return (
              <div
                key={card.name}
                className="absolute w-52 neon-border rounded-lg p-4 animate-float"
                style={{ top: o.top, left: o.left, animationDelay: o.delay, background: "rgba(13,13,30,0.9)", transform: `rotate(${o.rotate})`, backdropFilter: "blur(12px)" }}
              >
                <div className="font-mono text-[10px] text-brand-neon/60 tracking-widest uppercase mb-2">{card.game}</div>
                <div className="font-display font-bold text-brand-text text-base mb-1">{card.name}</div>
                <div className="flex gap-2 flex-wrap">
                  <span className="font-mono text-[9px] px-2 py-0.5 bg-brand-neon/10 text-brand-neon border border-brand-neon/20 rounded">{card.role}</span>
                  <span className="font-mono text-[9px] px-2 py-0.5 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded">{card.rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create HowItWorksSection**

```tsx
// src/components/ui/HowItWorksSection.tsx

const steps = [
  { icon: "◈", label: "Step 01", title: "Build Your Character", desc: "Select a game you play and craft a character profile — your playstyle, rank, and what kind of teammate you're hunting for." },
  { icon: "⊞", label: "Step 02", title: "Enter the Realm", desc: "Each game is a Realm. Step in and see character cards from real players — built around the same game as you." },
  { icon: "♡", label: "Step 03", title: "Match Up", desc: "Like a character. If they like you back — that's a match. Two players, one squad." },
];

export function HowItWorksSection() {
  return (
    <section className="py-28 px-6 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.05) 0%, transparent 70%)" }}
      />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="font-mono text-brand-purple text-xs tracking-[0.4em] uppercase block mb-3">How It Works</span>
          <h2 className="font-display font-black text-4xl md:text-5xl text-brand-text uppercase">The Matchmaking Loop</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.label}
              className="relative p-7 rounded-lg border border-brand-border hover:border-brand-neon/30 transition-all duration-300 group"
              style={{ background: "rgba(13,13,30,0.6)" }}
            >
              <div className="font-mono text-[10px] text-brand-muted tracking-widest uppercase mb-5">{step.label}</div>
              <div className="text-3xl mb-4 text-brand-neon" style={{ fontFamily: "monospace" }}>{step.icon}</div>
              <h3 className="font-display font-bold text-lg text-brand-text mb-3 uppercase tracking-wide">{step.title}</h3>
              <p className="text-brand-muted text-sm leading-relaxed">{step.desc}</p>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-neon/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Replace LandingPage.tsx**

```tsx
// src/pages/LandingPage.tsx
import { useState } from "react";
import { Footer } from "../components/layout/Footer";
import AuthModal from "../components/modals/AuthModal";
import { HeroSection } from "../components/ui/HeroSection";
import { HowItWorksSection } from "../components/ui/HowItWorksSection";

type ModalMode = "sign-in" | "sign-up";

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode | null>(null);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text" style={{ fontFamily: "Inter, sans-serif" }}>
      <HeroSection onOpenModal={setModal} />
      <HowItWorksSection />

      <section className="py-24 px-6 border-t border-brand-border">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display font-black text-4xl text-brand-text uppercase mb-4">Ready to Play?</h2>
          <p className="text-brand-muted mb-10 text-lg">Your next teammate is already here. Go find them.</p>
          <button
            onClick={() => setModal("sign-up")}
            className="font-display font-bold tracking-widest uppercase text-sm px-12 py-4 text-brand-bg transition-all duration-200 hover:scale-105"
            style={{ background: "linear-gradient(135deg, #ff0080, #7c3aed)", boxShadow: "0 0 30px rgba(255,0,128,0.3)" }}
          >
            Join PartyUp
          </button>
        </div>
      </section>

      <Footer />
      {modal && <AuthModal initialMode={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build --prefix apps/web`
Expected: Clean build.

- [ ] **Step 5: Smoke test LandingPage**

Start dev server and verify:
- Landing page loads with animated floating cards
- "Sign In" and "Create Account" buttons open `AuthModal`
- "How It Works" section renders correctly
- "Join PartyUp" CTA button opens sign-up modal

- [ ] **Step 6: Commit Phase 2**

```bash
git add apps/web/src/components/ui/HeroSection.tsx apps/web/src/components/ui/HowItWorksSection.tsx apps/web/src/pages/LandingPage.tsx
git commit -m "refactor: extract HeroSection and HowItWorksSection from LandingPage"

git add apps/web/src/
git commit -m "refactor: Phase 2 complete — self-contained page section components"
```
