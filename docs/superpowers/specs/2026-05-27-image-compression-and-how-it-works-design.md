# Design: Image Compression + How It Works Explanation

**Date:** 2026-05-27  
**Branch:** feat/image-compression-and-how-it-works  
**Scope:** Two frontend additions for the LinkedIn launch

---

## 1. Client-Side Image Compression

### Problem

The backend enforces a 5 MB limit on character image uploads (`[RequestSizeLimit(5_242_880)]` in `CharactersController.cs`). The frontend accepts any file without validation or feedback, so oversized uploads fail silently with a 413 error.

### Goal

Accept any image the user provides and automatically compress it client-side to fit under 5 MB before upload. Show a subtle notice when compression occurs.

### Implementation

**New file:** `apps/web/src/utils/imageCompression.ts`

Exports a single async function:

```ts
compressImageIfNeeded(file: File): Promise<{ file: File; wasCompressed: boolean }>
```

Algorithm:
1. If `file.size <= 5_242_880`, return `{ file, wasCompressed: false }` immediately.
2. Load the file into an `<img>` element via `URL.createObjectURL`.
3. Draw onto a `<canvas>` at the image's natural dimensions.
4. Loop: call `canvas.toBlob('image/jpeg', quality)` starting at `quality = 0.85`, stepping down by `0.1` each iteration.
5. If the resulting blob is under 5 MB, stop.
6. If `quality` reaches `0.1` and still over limit, halve canvas width and height and restart the quality loop from `0.85`.
7. Wrap the final blob in `new File([blob], file.name, { type: 'image/jpeg' })`.
8. Revoke the object URL.
9. Return `{ file: compressedFile, wasCompressed: true }`.
10. If any step throws, re-throw — the caller will surface an error message.

**Modified file:** `apps/web/src/components/character-wizard/IdentityStep.tsx`

- `handleFileChange` becomes `async`.
- After reading the file, calls `compressImageIfNeeded`.
- Stores result via `onChange({ imageFile, imageUrl: '' })` as before.
- Tracks `compressedNotice: boolean` in local state (reset to `false` when a new file is selected, set to `true` when `wasCompressed` is true).
- Renders a notice beneath the upload button when `compressedNotice` is true:
  ```
  Image was resized to fit the 5 MB limit
  ```
  Styled with existing `text-xs font-mono text-muted` classes — matches the form's design language.
- If compression throws, sets a local `imageError` string and renders it in the same style as other form errors (no file is stored).

### Non-goals

- No server-side changes needed.
- No additional npm packages — uses only Canvas API (universally supported).
- GIF animation is not preserved (acceptable; character images are static portraits).

---

## 2. Landing Page — 5-Step "How It Works" Section

### Problem

The current landing page has a 3-column grid ("Build your character / Swipe on players / Form your party") that is generic and omits the key differentiator: the platform handle privacy reveal mechanic.

### Goal

Replace the 3-column grid with a numbered 5-step flow that tells the full user journey and explicitly calls out that the platform handle is private until a match occurs.

### Implementation

**Modified file:** `apps/web/src/pages/LandingPage.tsx`

Replace the existing `<section>` (the 3-column grid) with a new section. Layout:

- Section eyebrow label: `"How it works"` (same mono/muted/uppercase/tracking-widest style).
- On mobile: vertical numbered list, each step stacked.
- On `md+`: horizontal connected flow — five columns, each with a large step number, title, and body. An `→` connector or thin horizontal line between columns.

**Five steps:**

| # | Title | Body |
|---|-------|------|
| 1 | Find your game | Search from thousands of titles and add it to your account. |
| 2 | Build your character | Set your role, rank, playstyle, and availability. |
| 3 | Set your platform handle | Your handle stays private — it's only revealed after a match. |
| 4 | Swipe on players | Discover other characters in your game and like the ones you want to party with. |
| 5 | Match and connect | A mutual like reveals both platform handles so you can link up directly. |

Step 3 and step 5 are where the privacy/reveal mechanic is made explicit.

---

## 3. Authenticated Home Page — Onboarding Callout

### Problem

When a logged-in user has no games yet, they see only `<EmptyState message="No realms yet — search for a game below" />`. There's no explanation of what to do next or how the system works.

### Goal

Show a compact "how it works" callout above the empty state, only when `games.length === 0`. It disappears automatically once the user adds their first game — no dismiss button, no extra state.

### Implementation

**Modified file:** `apps/web/src/components/UserRealmsSection.tsx`

When `games.length === 0`, render a callout card **above** the existing empty state. The callout presents the same 5-step flow in a compact vertical list:

- Card styled with `bg-surface border border-border rounded-lg px-5 py-4` (matches existing modal/card patterns).
- Heading: `"How PartyUp works"` in `text-xs font-mono text-muted uppercase tracking-widest`.
- Five rows, each: step number (accent color, monospaced) + bold title + muted one-line body.
- No dismiss button — disappears naturally when the user adds a game.

The existing `<EmptyState>` component and the search section remain unchanged below.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/src/utils/imageCompression.ts` | New — compression utility |
| `apps/web/src/components/character-wizard/IdentityStep.tsx` | Modified — call compressor, show notice |
| `apps/web/src/pages/LandingPage.tsx` | Modified — replace 3-col grid with 5-step flow |
| `apps/web/src/components/UserRealmsSection.tsx` | Modified — add onboarding callout when no games |
