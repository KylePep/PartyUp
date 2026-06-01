# TS Fixes + HTML Description Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three pre-existing TypeScript errors in RealmCard, NavBar, and RealmPage, and apply the DOMPurify HTML-rendering pattern to the game description in GamesPage.

**Architecture:** Four isolated one-line or two-line fixes across four files. No new dependencies — DOMPurify is already installed. No backend changes.

**Tech Stack:** React, TypeScript, Tailwind CSS, DOMPurify.

---

### Task 1: Fix TypeScript errors in RealmCard, NavBar, and RealmPage

**Files:**
- Modify: `apps/web/src/components/cards/RealmCard.tsx:18`
- Modify: `apps/web/src/components/layout/NavBar.tsx:14`
- Modify: `apps/web/src/pages/RealmPage.tsx:60-62`

> Note: No frontend test framework exists in this project. Verify by running the TypeScript build after changes.

- [ ] **Step 1: Fix RealmCard — null vs undefined on imageUrl**

In `apps/web/src/components/cards/RealmCard.tsx`, replace line 18:

```tsx
        imageUrl={userGame.gameImageUrl}
```

with:

```tsx
        imageUrl={userGame.gameImageUrl ?? undefined}
```

- [ ] **Step 2: Fix NavBar — implicit any[] on navLinks**

In `apps/web/src/components/layout/NavBar.tsx`, replace line 14:

```ts
const navLinks = [
```

with:

```ts
const navLinks: { to: string; label: string }[] = [
```

- [ ] **Step 3: Fix RealmPage — missing textColor on BinderLayout tabs**

In `apps/web/src/pages/RealmPage.tsx`, replace lines 60–62:

```tsx
          { label: 'My Cards', color: '#991b1b', to: "/characters" },
          { label: 'Games', color: '#1e40af', to: "/games" },
          { label: 'Collection', color: '#166534', to: "/matches" },
```

with:

```tsx
          { label: 'My Cards', textColor: "#ffffff", color: '#991b1b', to: "/characters" },
          { label: 'Games', textColor: "#ffffff", color: '#1e40af', to: "/games" },
          { label: 'Collection', textColor: "#ffffff", color: '#166534', to: "/matches" },
```

- [ ] **Step 4: Verify the TypeScript build reports no new errors**

```powershell
npm run build --prefix apps/web 2>&1 | Select-String "error TS"
```

Expected: output contains only the pre-existing errors in `RealmCard` (now fixed), `NavBar` (now fixed), and `RealmPage` (now fixed). The three lines mentioning those files should be gone. Any remaining output lines should not reference these three files.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/cards/RealmCard.tsx apps/web/src/components/layout/NavBar.tsx apps/web/src/pages/RealmPage.tsx
git commit -m "fix: resolve pre-existing TypeScript errors in RealmCard, NavBar, and RealmPage"
```

---

### Task 2: Apply DOMPurify HTML rendering to GamesPage description

**Files:**
- Modify: `apps/web/src/pages/GamesPage.tsx`

`DOMPurify` is already installed — it is imported and used in `apps/web/src/components/RealmRightPage.tsx`. No `npm install` needed.

The description field is already inside a `selectedDetail?.description ?` guard, so it is guaranteed to be a non-null string when rendered.

- [ ] **Step 1: Add DOMPurify import to GamesPage**

In `apps/web/src/pages/GamesPage.tsx`, add after the existing imports (after line 6):

```ts
import DOMPurify from 'dompurify'
```

- [ ] **Step 2: Replace the plain description paragraph with sanitized HTML**

In `apps/web/src/pages/GamesPage.tsx`, replace:

```tsx
        ) : selectedDetail?.description ? (
          <p className="text-xs font-mono text-muted">{selectedDetail.description}</p>
        ) : null}
```

with:

```tsx
        ) : selectedDetail?.description ? (
          <div
            className="text-xs font-mono text-muted"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedDetail.description) }}
          />
        ) : null}
```

- [ ] **Step 3: Verify the TypeScript build has no new errors**

```powershell
npm run build --prefix apps/web 2>&1 | Select-String "error TS"
```

Expected: same output as after Task 1 — no errors in `GamesPage.tsx`.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/pages/GamesPage.tsx
git commit -m "feat: render game description as sanitized HTML in GamesPage"
```
