# Landing Page Carousel — Design Spec
**Date:** 2026-05-28

## Overview

Replace the static circular div on the LandingPage with an auto-advancing carousel that cycles through the 5 "how it works" steps. A circular SVG progress ring traces the circumference of the div over 3 seconds, then the carousel advances to the next step. Users can hover to reveal prev/pause/next controls.

---

## State

Three pieces of state in `LandingPage`:

| State | Type | Purpose |
|---|---|---|
| `step` | `number` (0–4) | Currently displayed step |
| `paused` | `boolean` | Whether auto-advance is paused |

A `useEffect` keyed on `[step, paused]` sets a 3-second `setTimeout` (when not paused) that calls `setStep((s) => (s + 1) % 5)`. Cleanup runs on re-fire and unmount. Manual navigation resets `paused` to `false`, so the timer always restarts from a fresh 3 seconds after any step change.

---

## SVG Progress Ring

An `<svg>` is absolutely positioned `inset-0` over the circle (352×352). The existing `border-4 border-black` stays as the visual track.

### Circle element properties
- Center: `(176, 176)`, radius: `172`
- `strokeWidth={4}`, accent color stroke, `fill="none"`, `strokeLinecap="round"`
- `strokeDasharray`: circumference = `2 * π * 172 ≈ 1081`
- `strokeDashoffset`: animates from `1081` → `0` over 3 seconds
- `transform="rotate(-90 176 176)"` — starts fill from 12 o'clock
- `key={step}` on the SVG element — React re-mounts on each step change, restarting the animation
- `animationPlayState` toggled to `"paused"` / `"running"` via the `paused` state

### CSS keyframe (added to `index.css`)
```css
@keyframes ring {
  from { stroke-dashoffset: 1081; }
  to   { stroke-dashoffset: 0; }
}
```

Applied via Tailwind arbitrary: `animate-[ring_3s_linear_forwards]`

---

## Step Content

The circle div gets `group relative` classes.

**Content layer** — `absolute inset-0 flex flex-col items-center justify-center w-3/4 mx-auto text-center`:
- Step counter: `n / 5` in `font-mono text-xs text-muted`
- Title: `font-display font-semibold text-black text-sm`
- Body: `text-xs text-muted leading-relaxed`
- `key={step}` on this div — triggers fade-in animation on step change

### CSS keyframe (added to `index.css`)
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Applied via Tailwind arbitrary: `animate-[fadeIn_0.4s_ease]`

---

## Hover Controls

`absolute bottom-8 left-0 right-0 flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity`

Three small icon buttons:
- `←` — `setStep((s) => (s + 4) % 5)`, sets `paused` to `false`
- `⏸` / `▶` — toggles `paused`
- `→` — `setStep((s) => (s + 1) % 5)`, sets `paused` to `false`

Styled: `text-muted hover:text-text transition-colors text-lg leading-none`

---

## Steps Data

The steps array is uncommented from the bottom section and placed in the component body:

```ts
const steps = [
  { n: 1, title: 'Find your game', body: 'Search from thousands of titles and add it to your account.' },
  { n: 2, title: 'Build your character', body: 'Set your role, rank, playstyle, and availability.' },
  { n: 3, title: 'Set your handle', body: 'Your platform handle stays private — only revealed after a match.' },
  { n: 4, title: 'Swipe on players', body: 'Discover characters in your game and like the ones you want to party with.' },
  { n: 5, title: 'Match and connect', body: 'A mutual like reveals both handles so you can link up directly.' },
]
```

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/pages/LandingPage.tsx` | Replace static circle with carousel; add state and timer logic |
| `apps/web/src/index.css` | Add `@keyframes ring` and `@keyframes fadeIn` |

No new files needed.
