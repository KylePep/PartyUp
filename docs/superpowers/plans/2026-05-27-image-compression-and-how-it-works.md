# Image Compression + How It Works Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-compress oversized character images client-side and add a 5-step "How it works" explanation to both the landing page and the authenticated home page.

**Architecture:** A standalone utility handles image compression via the Canvas API. The landing page's 3-column grid is replaced with a 5-step numbered flow. The authenticated home page shows the same flow as an onboarding callout only when the user has no games yet.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Canvas API (no new dependencies)

**Note on testing:** The frontend has no test framework configured. Quality gates are TypeScript compilation (`npm run build --prefix apps/web`) and manual browser verification.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/src/utils/imageCompression.ts` | Create | Pure async utility: compress a `File` to under 5 MB using Canvas API |
| `apps/web/src/components/character-wizard/IdentityStep.tsx` | Modify | Call the compressor on file pick; show resized/error notices |
| `apps/web/src/pages/LandingPage.tsx` | Modify | Replace 3-column grid with 5-step numbered flow |
| `apps/web/src/components/UserRealmsSection.tsx` | Modify | Add onboarding callout above empty state when `games.length === 0` |

---

## Task 1: Image compression utility

**Files:**
- Create: `apps/web/src/utils/imageCompression.ts`

- [ ] **Step 1: Create the utility file with the full implementation**

Create `apps/web/src/utils/imageCompression.ts` with this exact content:

```typescript
const MAX_SIZE = 5_242_880 // 5 MB

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob)
        else reject(new Error('canvas.toBlob returned null'))
      },
      type,
      quality,
    )
  })
}

/**
 * If the file is under 5 MB, returns it unchanged.
 * Otherwise compresses it to JPEG by iterating quality (0.85 → 0.1),
 * then halving dimensions up to 4 times, until under 5 MB.
 * Throws if compression still can't reach the limit.
 */
export async function compressImageIfNeeded(
  file: File,
): Promise<{ file: File; wasCompressed: boolean }> {
  if (file.size <= MAX_SIZE) return { file, wasCompressed: false }

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    let width = img.naturalWidth
    let height = img.naturalHeight
    const canvas = document.createElement('canvas')

    for (let sizePass = 0; sizePass < 4; sizePass++) {
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      ctx.drawImage(img, 0, 0, width, height)

      for (let q = 85; q >= 10; q -= 10) {
        const quality = q / 100
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
        if (blob.size <= MAX_SIZE) {
          const compressed = new File([blob], file.name, { type: 'image/jpeg' })
          return { file: compressed, wasCompressed: true }
        }
      }

      // Quality alone not enough — halve dimensions for next pass
      width = Math.max(1, Math.floor(width / 2))
      height = Math.max(1, Math.floor(height / 2))
    }

    throw new Error('Could not compress image below 5 MB')
  } finally {
    URL.revokeObjectURL(url)
  }
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```powershell
npm run build --prefix apps/web
```

Expected: build succeeds with no errors. (Unused-export warnings are fine; actual type errors are not.)

- [ ] **Step 3: Commit**

```powershell
cd "c:\source\applications\PartyUp"
git add apps/web/src/utils/imageCompression.ts
git commit -m "feat: add client-side image compression utility"
```

---

## Task 2: Wire compression into IdentityStep

**Files:**
- Modify: `apps/web/src/components/character-wizard/IdentityStep.tsx`

- [ ] **Step 1: Replace the file with the updated version**

Open `apps/web/src/components/character-wizard/IdentityStep.tsx` and replace its entire content with:

```tsx
import { useRef, useState } from 'react'
import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type CharacterFormData, PLATFORMS } from './types'
import { compressImageIfNeeded } from '../../utils/imageCompression'

interface IdentityStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
  platforms?: string[]
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function IdentityStep({ data, onChange, platforms }: IdentityStepProps) {
  const platformOptions = platforms && platforms.length > 0 ? platforms : PLATFORMS
  const fileRef = useRef<HTMLInputElement>(null)
  const [compressedNotice, setCompressedNotice] = useState(false)
  const [imageError, setImageError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0] ?? null
    if (!raw) return
    setCompressedNotice(false)
    setImageError('')
    try {
      const { file, wasCompressed } = await compressImageIfNeeded(raw)
      onChange({ imageFile: file, imageUrl: '' })
      setCompressedNotice(wasCompressed)
    } catch {
      setImageError('Could not process this image. Please try a different file.')
    }
  }

  const previewUrl = data.imageFile
    ? URL.createObjectURL(data.imageFile)
    : data.imageUrl || undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Platform *</p>
        <ToggleButtonGroup
          options={toOptions(platformOptions)}
          value={data.platform ? [data.platform] : []}
          multiple={false}
          onChange={vals => onChange({ platform: vals[0] ?? '' })}
        />
      </div>

      <Input
        label="Platform Handle *"
        placeholder="e.g. KylePep#1234, PSN_Username..."
        value={data.platformHandle}
        onChange={e => onChange({ platformHandle: e.target.value })}
        maxLength={100}
      />

      <Input
        label="Character Name *"
        placeholder="e.g. NightShade, IronFang..."
        value={data.name}
        onChange={e => onChange({ name: e.target.value })}
        maxLength={50}
      />

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Character Image</p>
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Character preview"
            className="w-24 h-24 object-cover rounded mb-3 border border-border"
          />
        )}
        <div className="flex gap-3 items-center flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded text-xs font-mono border border-border text-muted hover:border-accent hover:text-text transition-colors"
          >
            {data.imageFile ? 'Change Image' : 'Upload Image'}
          </button>
          {data.imageFile && (
            <span className="text-xs font-mono text-muted truncate max-w-[180px]">
              {data.imageFile.name}
            </span>
          )}
          {!data.imageFile && (
            <Input
              label=""
              placeholder="or paste image URL"
              value={data.imageUrl}
              onChange={e => onChange({ imageUrl: e.target.value, imageFile: null })}
              maxLength={500}
            />
          )}
        </div>
        {compressedNotice && (
          <p className="text-xs font-mono text-muted mt-2">
            Image was resized to fit the 5 MB limit.
          </p>
        )}
        {imageError && (
          <p className="text-xs font-mono text-danger mt-2">{imageError}</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```powershell
npm run build --prefix apps/web
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Manual smoke test**

Start the dev server (`npm run dev --prefix apps/web`) and navigate to a character create/edit flow.

1. Upload an image **under** 5 MB → no notice shown, image previews normally.
2. Upload an image **over** 5 MB → image previews, notice `"Image was resized to fit the 5 MB limit."` appears beneath the button.
3. After seeing the notice, upload another small image → notice disappears.

- [ ] **Step 4: Commit**

```powershell
cd "c:\source\applications\PartyUp"
git add apps/web/src/components/character-wizard/IdentityStep.tsx
git commit -m "feat: auto-compress oversized character images before upload"
```

---

## Task 3: Landing page 5-step flow

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx`

- [ ] **Step 1: Replace the existing `<section>` (the 3-column grid) with the 5-step flow**

In `apps/web/src/pages/LandingPage.tsx`, find this block and replace it entirely:

**Find (the whole section element):**
```tsx
      <section className="bg-surface border-t border-border py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            { title: 'Build your character', body: 'Create a profile for each game — your role, rank, playstyle, and availability.' },
            { title: 'Swipe on players', body: 'Discover other characters in your game and swipe right to connect.' },
            { title: 'Form your party', body: "Mutual likes create a match. Your next teammate is one swipe away." },
          ].map(item => (
            <div key={item.title} className="flex flex-col gap-3">
              <h3 className="font-display font-semibold text-text">{item.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
```

**Replace with:**
```tsx
      <section className="bg-surface border-t border-border py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-muted uppercase tracking-widest text-center mb-10">
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 text-center">
            {[
              {
                n: 1,
                title: 'Find your game',
                body: 'Search from thousands of titles and add it to your account.',
              },
              {
                n: 2,
                title: 'Build your character',
                body: 'Set your role, rank, playstyle, and availability.',
              },
              {
                n: 3,
                title: 'Set your handle',
                body: 'Your platform handle stays private — only revealed after a match.',
              },
              {
                n: 4,
                title: 'Swipe on players',
                body: 'Discover characters in your game and like the ones you want to party with.',
              },
              {
                n: 5,
                title: 'Match and connect',
                body: 'A mutual like reveals both handles so you can link up directly.',
              },
            ].map(step => (
              <div key={step.n} className="flex flex-col items-center gap-3">
                <span className="font-mono font-bold text-3xl text-accent">{step.n}</span>
                <h3 className="font-display font-semibold text-text text-sm">{step.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Verify TypeScript compilation**

```powershell
npm run build --prefix apps/web
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Manual smoke test**

Navigate to `http://localhost:5173` (not signed in) and confirm:

1. The old 3-column section ("Build your character / Swipe on players / Form your party") is gone.
2. The new section shows the eyebrow label `"How it works"` and five numbered steps.
3. Step 3 body mentions "private" and step 5 mentions "reveals both handles".
4. On a narrow browser window the steps stack vertically; on wide they sit in a row.

- [ ] **Step 4: Commit**

```powershell
cd "c:\source\applications\PartyUp"
git add apps/web/src/pages/LandingPage.tsx
git commit -m "feat: replace landing page 3-column grid with 5-step how-it-works flow"
```

---

## Task 4: Authenticated home page onboarding callout

**Files:**
- Modify: `apps/web/src/components/UserRealmsSection.tsx`

- [ ] **Step 1: Add the onboarding callout above the empty state**

In `apps/web/src/components/UserRealmsSection.tsx`, find the `<section>` that renders the "My Realms" heading and its content:

**Find:**
```tsx
      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">My Realms</h2>
        {games.length === 0 ? (
          <EmptyState message="No realms yet — search for a game below" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {games.map(g => (
              <RealmCard key={g.id} userGame={g} onRemove={setRemoveTarget} />
            ))}
          </div>
        )}
      </section>
```

**Replace with:**
```tsx
      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">My Realms</h2>
        {games.length === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="bg-surface border border-border rounded-lg px-5 py-4 flex flex-col gap-4">
              <p className="text-xs font-mono text-muted uppercase tracking-widest">How PartyUp works</p>
              <ol className="flex flex-col gap-3">
                {[
                  { n: 1, title: 'Find your game', body: 'Search for a title and add it to your account.' },
                  { n: 2, title: 'Build your character', body: 'Set your role, rank, playstyle, and availability.' },
                  { n: 3, title: 'Set your platform handle', body: 'Stays private until a match — only revealed to your new teammate.' },
                  { n: 4, title: 'Swipe on players', body: 'Like the characters you want to party with.' },
                  { n: 5, title: 'Match and connect', body: 'A mutual like reveals both handles so you can link up directly.' },
                ].map(step => (
                  <li key={step.n} className="flex items-start gap-3">
                    <span className="font-mono font-bold text-accent text-sm shrink-0">{step.n}.</span>
                    <p className="text-sm text-text leading-relaxed">
                      <span className="font-semibold">{step.title}</span>
                      {' — '}
                      <span className="text-muted">{step.body}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </div>
            <EmptyState message="No realms yet — search for a game below" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {games.map(g => (
              <RealmCard key={g.id} userGame={g} onRemove={setRemoveTarget} />
            ))}
          </div>
        )}
      </section>
```

- [ ] **Step 2: Verify TypeScript compilation**

```powershell
npm run build --prefix apps/web
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Manual smoke test**

Sign in as a user with no games (or create a fresh account):

1. The home page shows the "How PartyUp works" callout card with all 5 steps above the empty state message.
2. Add a game — the callout disappears and the realm card appears in its place.
3. Sign in as a user who already has games — the callout is not visible.

- [ ] **Step 4: Commit**

```powershell
cd "c:\source\applications\PartyUp"
git add apps/web/src/components/UserRealmsSection.tsx
git commit -m "feat: show how-it-works onboarding callout on home page for new users"
```

---

## Done

All four files changed, all committed. The branch `feat/image-compression-and-how-it-works` is ready to merge or PR into `main`.
