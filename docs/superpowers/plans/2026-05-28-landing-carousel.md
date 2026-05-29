# Landing Page Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static circular div on the LandingPage with an auto-advancing carousel that cycles through the 5 "how it works" steps using an SVG circular progress ring.

**Architecture:** An SVG `<circle>` with `stroke-dashoffset` animation traces the circumference over 3 seconds, then a `useEffect` timer advances the step. The SVG gets `key={step}` so React re-mounts it on each step change, restarting the animation. Hover controls (prev/pause/next) are revealed via Tailwind's `group-hover:` pattern.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, SVG

---

## Files

| File | Change |
|---|---|
| `apps/web/src/index.css` | Add `@keyframes ring` and `@keyframes fadeIn` |
| `apps/web/src/pages/LandingPage.tsx` | Replace static circle with full carousel implementation |

---

## Task 1: Add CSS Keyframes

**Files:**
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Append two keyframes after the existing `@keyframes card-enter` block**

Open `apps/web/src/index.css` and add after the closing `}` of `@keyframes card-enter`:

```css
@keyframes ring {
  from { stroke-dashoffset: 1081; }
  to   { stroke-dashoffset: 0; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Verify no build errors**

```bash
npm run build --prefix apps/web
```

Expected: exits with code 0, no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat: add ring and fadeIn keyframes for landing carousel"
```

---

## Task 2: Implement the Carousel in LandingPage

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx`

The full circumference of the SVG ring is `2 * π * 172 ≈ 1081` — this must match the `stroke-dashoffset` values in the `ring` keyframe.

- [ ] **Step 1: Replace the entire content of `apps/web/src/pages/LandingPage.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { NavBar } from '../components/layout/NavBar'
import AuthModal from '../components/modals/AuthModal'
import { Button } from '../components/ui'

type ModalMode = 'sign-in' | 'sign-up'

const steps = [
  { n: 1, title: 'Find your game', body: 'Search from thousands of titles and add it to your account.' },
  { n: 2, title: 'Build your character', body: 'Set your role, rank, playstyle, and availability.' },
  { n: 3, title: 'Set your handle', body: 'Your platform handle stays private — only revealed after a match.' },
  { n: 4, title: 'Swipe on players', body: 'Discover characters in your game and like the ones you want to party with.' },
  { n: 5, title: 'Match and connect', body: 'A mutual like reveals both handles so you can link up directly.' },
]

const CIRCUMFERENCE = Math.round(2 * Math.PI * 172) // 1081

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode | null>(null)
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setTimeout(() => setStep(s => (s + 1) % steps.length), 3000)
    return () => clearTimeout(id)
  }, [step, paused])

  function goNext() {
    setStep(s => (s + 1) % steps.length)
    setPaused(false)
  }

  function goPrev() {
    setStep(s => (s + steps.length - 1) % steps.length)
    setPaused(false)
  }

  return (
    <div className="min-h-screen bg-bg text-text flex relative">
      <NavBar variant="landing" onSignIn={() => setModal('sign-in')} onSignUp={() => setModal('sign-up')} />

      <main className="flex-1 flex flex-col items-center justify-center text-center py-4 gap-4">
        <section className='h-full bg-surface border-white border-2 py-4 px-6 w-1/2 flex flex-col items-center justify-between'>

          <h1 className="font-display font-bold text-4xl md:text-6xl text-text leading-tight mb-6">
            Magic Binder
          </h1>

          <div className="group relative h-[352px] w-[352px] bg-white border-black border-4 rounded-full flex items-center justify-center">

            {/* SVG progress ring — key={step} causes re-mount on step change, restarting the animation */}
            <svg
              key={step}
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 352 352"
            >
              <circle
                cx="176"
                cy="176"
                r="172"
                fill="none"
                stroke="#7c6fcd"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                transform="rotate(-90 176 176)"
                className="animate-[ring_3s_linear_forwards]"
                style={{ animationPlayState: paused ? 'paused' : 'running' }}
              />
            </svg>

            {/* Step content — key causes fade-in on step change */}
            <div key={`content-${step}`} className="absolute text-center w-3/4 animate-[fadeIn_0.4s_ease]">
              <p className="font-mono text-xs text-muted mb-1">{steps[step].n} / {steps.length}</p>
              <h3 className="font-display font-semibold text-black text-sm">
                {steps[step].title}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {steps[step].body}
              </p>
            </div>

            {/* Hover controls — revealed via group-hover */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={goPrev} className="text-muted hover:text-black transition-colors text-lg leading-none">
                &#8592;
              </button>
              <button onClick={() => setPaused(p => !p)} className="text-muted hover:text-black transition-colors text-lg leading-none">
                {paused ? '▶' : '⏸'}
              </button>
              <button onClick={goNext} className="text-muted hover:text-black transition-colors text-lg leading-none">
                &#8594;
              </button>
            </div>
          </div>

          <div className="flex justify-around border-white border-2 w-3/4 py-10">
            <Button size="lg" onClick={() => setModal('sign-up')}>
              Get Started
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setModal('sign-in')}>
              Sign In
            </Button>
          </div>
        </section>
      </main>

      {modal && <AuthModal initialMode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npm run build --prefix apps/web
```

Expected: exits with code 0, no TypeScript errors.

- [ ] **Step 3: Start the dev server and manually verify the carousel**

```bash
npm run dev --prefix apps/web
```

Open `http://localhost:5173` and check:
- The ring animates from 12 o'clock, filling clockwise over 3 seconds
- After 3 seconds, the ring resets and the next step fades in
- After step 5, it loops back to step 1
- Hovering the circle reveals ← ⏸ → buttons
- Clicking ⏸ freezes the ring mid-arc; clicking ▶ resumes from that position
- Clicking ← / → jumps to the adjacent step and resets the ring
- The step counter (`1 / 5`, `2 / 5`, etc.) updates correctly

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/LandingPage.tsx
git commit -m "feat: replace static circle with animated step carousel on landing page"
```
