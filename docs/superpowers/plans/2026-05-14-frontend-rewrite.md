# Frontend Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the PartyUp web frontend with a layered component architecture, clean design tokens, and genuine mobile-first layout.

**Architecture:** Three-layer build bottom-up: UI primitives in `components/ui/` → composite and layout components → thin page composers. The API layer (`api/`, `hooks/`, `context/`) is untouched. Feature components own their local UI state; pages own routing and hook calls only.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, React Router v6, Vite

**Testing note:** No frontend test framework exists. Each task's verification step is running the Vite dev server (`npm run dev --prefix apps/web`) and visually confirming the component renders correctly. Keep the dev server running throughout.

---

## File Map

**New files:**
```
apps/web/src/components/ui/Button.tsx
apps/web/src/components/ui/Input.tsx
apps/web/src/components/ui/Textarea.tsx
apps/web/src/components/ui/Select.tsx
apps/web/src/components/ui/Badge.tsx
apps/web/src/components/ui/Card.tsx
apps/web/src/components/ui/Modal.tsx
apps/web/src/components/ui/Avatar.tsx
apps/web/src/components/ui/Spinner.tsx
apps/web/src/components/ui/EmptyState.tsx
apps/web/src/components/ui/index.ts
apps/web/src/components/layout/BottomTray.tsx
apps/web/src/components/layout/PageLayout.tsx
apps/web/src/components/forms/FormField.tsx
apps/web/src/components/forms/ToggleButtonGroup.tsx
apps/web/src/components/CharacterGallery.tsx
apps/web/src/components/MatchGallery.tsx
apps/web/src/components/character-wizard/CreateCharacterWizard.tsx
apps/web/src/components/character-wizard/IdentityStep.tsx
apps/web/src/components/character-wizard/GameplayStep.tsx
apps/web/src/components/character-wizard/AvailabilityStep.tsx
apps/web/src/components/character-wizard/AboutStep.tsx
```

**Rewritten (same path, content replaced):**
```
apps/web/index.html
apps/web/src/index.css
apps/web/src/components/layout/NavBar.tsx
apps/web/src/components/layout/SignedInLayout.tsx
apps/web/src/components/cards/GameCard.tsx
apps/web/src/components/cards/CharacterCard.tsx
apps/web/src/components/cards/MatchCard.tsx
apps/web/src/components/cards/RealmCard.tsx
apps/web/src/components/cards/SwipeCard.tsx
apps/web/src/components/modals/AuthModal.tsx
apps/web/src/pages/LandingPage.tsx
apps/web/src/pages/HomePage.tsx
apps/web/src/pages/RealmPage.tsx
apps/web/src/pages/CreateCharacterPage.tsx
apps/web/src/pages/CharacterPage.tsx
apps/web/src/pages/MatchesPage.tsx
```

**New paths for moved components:**
```
apps/web/src/components/DiscoveryPanel.tsx   (was components/ui/DiscoveryPanel.tsx)
apps/web/src/components/CharacterPanel.tsx   (was components/ui/CharacterPanel.tsx)
apps/web/src/components/UserRealmsSection.tsx (was components/ui/UserRealmsSection.tsx)
```

**Deleted at end (Task 22):**
```
apps/web/src/components/layout/SignOutButton.tsx
apps/web/src/components/layout/FullScreenStatus.tsx
apps/web/src/components/layout/Footer.tsx
apps/web/src/components/layout/CornerAccents.tsx
apps/web/src/components/ui/DiscoveryPanel.tsx
apps/web/src/components/ui/CharacterPanel.tsx
apps/web/src/components/ui/UserRealmsSection.tsx
apps/web/src/components/ui/HeroSection.tsx
apps/web/src/components/ui/GameBanner.tsx
apps/web/src/components/ui/GameGrid.tsx
apps/web/src/components/ui/GameSearchControls.tsx
apps/web/src/components/ui/GameSearchSection.tsx
apps/web/src/components/ui/GameInfoSection.tsx
apps/web/src/components/ui/MatchBanner.tsx
apps/web/src/components/ui/HowItWorksSection.tsx
apps/web/src/components/ui/SectionHeader.tsx
apps/web/src/components/ui/Pagination.tsx
apps/web/src/components/modals/Modal.tsx
apps/web/src/components/modals/GameSelectModal.tsx
apps/web/src/components/modals/UserGameSelectModal.tsx
```

---

## Task 1: Design Tokens

**Files:**
- Modify: `apps/web/index.html`
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Update Google Fonts in index.html**

Replace the existing `<link>` font tag with Cinzel (fantasy display font) + keep Inter and JetBrains Mono:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PartyUp — Find Your Party</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Replace index.css with new tokens**

```css
@import "tailwindcss";

@theme {
  --color-bg:             #0a0a14;
  --color-surface:        #111120;
  --color-surface-raised: #18182c;
  --color-text:           #e8e8f0;
  --color-muted:          #6b6b88;
  --color-border:         #22223a;
  --color-accent:         #7c6fcd;
  --color-accent-dim:     #4a4080;
  --color-danger:         #e05252;
  --color-success:        #52c77a;

  --font-display: "Cinzel", serif;
  --font-body:    "Inter", sans-serif;
  --font-mono:    "JetBrains Mono", monospace;
}

html, body, #root {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

body {
  background-color: #0a0a14;
  color: #e8e8f0;
  font-family: "Inter", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-12px); }
}

@keyframes slide-in-left {
  from { transform: translateX(-120%) rotate(-8deg); opacity: 0; }
  to   { transform: translateX(0) rotate(-8deg); opacity: 1; }
}

@keyframes slide-out-right {
  from { transform: translateX(0) rotate(0deg); opacity: 1; }
  to   { transform: translateX(140%) rotate(12deg); opacity: 0; }
}

@keyframes slide-out-left {
  from { transform: translateX(0) rotate(0deg); opacity: 1; }
  to   { transform: translateX(-140%) rotate(-12deg); opacity: 0; }
}

@keyframes card-enter {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 3: Start dev server and verify dark background loads**

```bash
npm run dev --prefix apps/web
```

Open http://localhost:5173. Background should be near-black (`#0a0a14`). Fonts may look different — Cinzel won't appear until it's used in components.

- [ ] **Step 4: Commit**

```bash
git add apps/web/index.html apps/web/src/index.css
git commit -m "feat: replace design tokens with dark skeleton theme"
```

---

## Task 2: Button Primitive

**Files:**
- Create: `apps/web/src/components/ui/Button.tsx`

- [ ] **Step 1: Create Button.tsx**

```tsx
import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:   'bg-accent text-white hover:bg-accent-dim',
  secondary: 'border border-border text-text hover:border-accent hover:text-accent',
  ghost:     'text-muted hover:text-text',
  danger:    'bg-danger text-white hover:opacity-90',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded font-mono font-medium
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/ui/Button.tsx
git commit -m "feat: add Button primitive"
```

---

## Task 3: Input, Textarea, Select Primitives

**Files:**
- Create: `apps/web/src/components/ui/Input.tsx`
- Create: `apps/web/src/components/ui/Textarea.tsx`
- Create: `apps/web/src/components/ui/Select.tsx`

- [ ] **Step 1: Create Input.tsx**

```tsx
import { type InputHTMLAttributes, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-mono text-muted uppercase tracking-widest">
        {label}
      </label>
      <input
        id={id}
        className={`bg-surface border ${error ? 'border-danger' : 'border-border'} rounded px-3 py-2
          text-sm text-text placeholder:text-muted
          focus:outline-none focus:border-accent transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create Textarea.tsx**

```tsx
import { type TextareaHTMLAttributes, useId } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function Textarea({ label, error, maxLength, className = '', value = '', ...props }: TextareaProps) {
  const id = useId()
  const charCount = typeof value === 'string' ? value.length : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs font-mono text-muted uppercase tracking-widest">
          {label}
        </label>
        {maxLength && (
          <span className="text-xs font-mono text-muted">{charCount}/{maxLength}</span>
        )}
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        className={`bg-surface border ${error ? 'border-danger' : 'border-border'} rounded px-3 py-2
          text-sm text-text placeholder:text-muted resize-none
          focus:outline-none focus:border-accent transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Create Select.tsx**

```tsx
import { type SelectHTMLAttributes, useId } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className = '', ...props }: SelectProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-mono text-muted uppercase tracking-widest">
        {label}
      </label>
      <select
        id={id}
        className={`bg-surface border ${error ? 'border-danger' : 'border-border'} rounded px-3 py-2
          text-sm text-text focus:outline-none focus:border-accent transition-colors ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/Input.tsx apps/web/src/components/ui/Textarea.tsx apps/web/src/components/ui/Select.tsx
git commit -m "feat: add Input, Textarea, Select primitives"
```

---

## Task 4: Badge, Card, Avatar, Spinner, EmptyState Primitives

**Files:**
- Create: `apps/web/src/components/ui/Badge.tsx`
- Create: `apps/web/src/components/ui/Card.tsx`
- Create: `apps/web/src/components/ui/Avatar.tsx`
- Create: `apps/web/src/components/ui/Spinner.tsx`
- Create: `apps/web/src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Create Badge.tsx**

```tsx
import { type ReactNode } from 'react'

type Variant = 'default' | 'role' | 'rank' | 'region' | 'success' | 'danger'

const variantClasses: Record<Variant, string> = {
  default: 'bg-surface-raised text-muted border-border',
  role:    'bg-accent/10 text-accent border-accent/30',
  rank:    'bg-amber-900/20 text-amber-400 border-amber-700/30',
  region:  'bg-purple-900/20 text-purple-400 border-purple-700/30',
  success: 'bg-success/10 text-success border-success/30',
  danger:  'bg-danger/10 text-danger border-danger/30',
}

interface BadgeProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 2: Create Card.tsx**

```tsx
import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
}

const paddingClasses = { sm: 'p-3', md: 'p-4', lg: 'p-6' }

export function Card({ padding = 'md', className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-lg ${paddingClasses[padding]} ${className}`}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Create Avatar.tsx**

```tsx
type Size = 'sm' | 'md' | 'lg'

const sizeClasses: Record<Size, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

interface AvatarProps {
  src?: string
  fallback: string
  size?: Size
  className?: string
}

export function Avatar({ src, fallback, size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={fallback}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    )
  }
  return (
    <div
      className={`rounded-full bg-accent-dim flex items-center justify-center font-mono font-bold text-text uppercase ${sizeClasses[size]} ${className}`}
      aria-label={fallback}
    >
      {fallback.charAt(0)}
    </div>
  )
}
```

- [ ] **Step 4: Create Spinner.tsx**

```tsx
interface SpinnerProps {
  label?: string
  size?: 'sm' | 'md'
}

export function Spinner({ label, size = 'md' }: SpinnerProps) {
  const dim = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-2'
  return (
    <div className="flex items-center gap-2">
      <div className={`${dim} border-border border-t-accent rounded-full animate-spin`} />
      {label && <span className="text-xs font-mono text-muted uppercase tracking-widest">{label}</span>}
    </div>
  )
}
```

- [ ] **Step 5: Create EmptyState.tsx**

Note: imports Button using a relative path — EmptyState lives in `components/ui/`, so Button is `./Button`.

```tsx
import { Button } from './Button'

interface EmptyStateProps {
  message: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-sm text-muted font-mono uppercase tracking-widest">{message}</p>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/Badge.tsx apps/web/src/components/ui/Card.tsx apps/web/src/components/ui/Avatar.tsx apps/web/src/components/ui/Spinner.tsx apps/web/src/components/ui/EmptyState.tsx
git commit -m "feat: add Badge, Card, Avatar, Spinner, EmptyState primitives"
```

---

## Task 5: Modal Primitive

**Files:**
- Create: `apps/web/src/components/ui/Modal.tsx`

- [ ] **Step 1: Create Modal.tsx**

Uses `createPortal` to render outside the React tree, handles ESC key, click-outside dismiss.

```tsx
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 bg-surface border border-border rounded-lg w-full max-w-md shadow-xl">
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-display font-semibold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-text transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/ui/Modal.tsx
git commit -m "feat: add Modal primitive with focus trap and ESC dismiss"
```

---

## Task 6: UI Barrel Export

**Files:**
- Create: `apps/web/src/components/ui/index.ts`

- [ ] **Step 1: Create index.ts**

```ts
export { Button } from './Button'
export { Input } from './Input'
export { Textarea } from './Textarea'
export { Select } from './Select'
export { Badge } from './Badge'
export { Card } from './Card'
export { Modal } from './Modal'
export { Avatar } from './Avatar'
export { Spinner } from './Spinner'
export { EmptyState } from './EmptyState'
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/ui/index.ts
git commit -m "feat: add ui component barrel export"
```

---

## Task 7: NavBar & BottomTray

**Files:**
- Modify: `apps/web/src/components/layout/NavBar.tsx`
- Create: `apps/web/src/components/layout/BottomTray.tsx`

- [ ] **Step 1: Rewrite NavBar.tsx**

Two variants: `landing` (transparent, sign in/up buttons) and `app` (sticky, nav links, user avatar dropdown). The old `SignedInLayout` context (`setNavExtra`) is removed — do not preserve it.

```tsx
import { useState, useRef, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui'

type Variant = 'landing' | 'app'

interface NavBarProps {
  variant: Variant
  onSignIn?: () => void
  onSignUp?: () => void
}

const navLinks = [
  { to: '/home', label: 'Home' },
  { to: '/characters', label: 'Characters' },
  { to: '/matches', label: 'Matches' },
]

export function NavBar({ variant, onSignIn, onSignUp }: NavBarProps) {
  const { state, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const username = state.status === 'authenticated' ? state.user.username : ''

  return (
    <nav
      className={`z-40 w-full flex items-center justify-between px-6 h-14 ${
        variant === 'landing'
          ? 'absolute top-0 left-0 bg-transparent'
          : 'sticky top-0 bg-surface/80 backdrop-blur-sm border-b border-border'
      }`}
    >
      <Link to="/" className="font-display font-bold text-text text-lg tracking-wide">
        PartyUp
      </Link>

      {variant === 'app' && (
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-xs font-mono uppercase tracking-widest transition-colors ${
                  isActive ? 'text-accent' : 'text-muted hover:text-text'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}

      {variant === 'landing' && (
        <div className="flex items-center gap-3">
          <button
            onClick={onSignIn}
            className="text-xs font-mono uppercase tracking-widest text-muted hover:text-text transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onSignUp}
            className="text-xs font-mono uppercase tracking-widest px-4 py-2 border border-border text-text hover:border-accent hover:text-accent transition-colors rounded"
          >
            Sign Up
          </button>
        </div>
      )}

      {variant === 'app' && username && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            <Avatar fallback={username} size="sm" />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-mono text-muted uppercase tracking-widest">Signed in as</p>
                <p className="text-sm text-text font-medium truncate">{username}</p>
              </div>
              <button
                onClick={() => { logout(); setDropdownOpen(false) }}
                className="w-full text-left px-4 py-3 text-sm text-danger hover:bg-surface-raised transition-colors font-mono"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Create BottomTray.tsx**

Fixed mobile tab bar. Hidden on `md` and up. Uses simple Unicode icons as placeholders — swap for an icon library later if desired.

```tsx
import { NavLink } from 'react-router-dom'

const navLinks = [
  { to: '/home', label: 'Home', icon: '⌂' },
  { to: '/characters', label: 'Characters', icon: '⚔' },
  { to: '/matches', label: 'Matches', icon: '♥' },
]

export function BottomTray() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border">
      <div className="flex">
        {navLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-mono uppercase tracking-widest transition-colors ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            <span className="text-lg leading-none">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Verify NavBar renders**

On http://localhost:5173 — even if the page is broken, check the browser console for TypeScript errors in the new NavBar files.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/NavBar.tsx apps/web/src/components/layout/BottomTray.tsx
git commit -m "feat: rewrite NavBar with user dropdown, add mobile BottomTray"
```

---

## Task 8: SignedInLayout & PageLayout

**Files:**
- Modify: `apps/web/src/components/layout/SignedInLayout.tsx`
- Create: `apps/web/src/components/layout/PageLayout.tsx`

- [ ] **Step 1: Rewrite SignedInLayout.tsx**

Removes the old `setNavExtra` context entirely. Uses `Outlet` from react-router-dom (matching `App.tsx`'s layout route pattern). Adds `pb-16 md:pb-0` padding so content clears the mobile bottom tray.

```tsx
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { NavBar } from './NavBar'
import { BottomTray } from './BottomTray'
import { Spinner } from '../ui'

export default function SignedInLayout() {
  const { state } = useAuth()

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner label="Loading..." />
      </div>
    )
  }

  if (state.status === 'unauthenticated' || state.status === 'unreachable') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-16 md:pb-0">
      <NavBar variant="app" />
      <Outlet />
      <BottomTray />
    </div>
  )
}
```

- [ ] **Step 2: Create PageLayout.tsx**

```tsx
import { type ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  className?: string
}

export function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <main className={`flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 ${className}`}>
      {children}
    </main>
  )
}
```

- [ ] **Step 3: Check App.tsx — no changes needed**

`App.tsx` imports `SignedInLayout` as a default export and uses it as a layout route with `<Outlet />`. The new `SignedInLayout` preserves this pattern. No changes to `App.tsx` required.

- [ ] **Step 4: Verify layout renders**

Log in at http://localhost:5173. The authenticated shell should show the NavBar and the BottomTray on mobile. Pages may have broken imports — that's expected until later tasks rebuild them.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/SignedInLayout.tsx apps/web/src/components/layout/PageLayout.tsx
git commit -m "feat: rewrite SignedInLayout, add PageLayout"
```

---

## Task 9: FormField & ToggleButtonGroup

**Files:**
- Create: `apps/web/src/components/forms/FormField.tsx`
- Create: `apps/web/src/components/forms/ToggleButtonGroup.tsx`

- [ ] **Step 1: Create FormField.tsx**

A generic label + error wrapper for custom fields that don't use Input/Textarea/Select directly (e.g., custom controls in wizard steps).

```tsx
import { type ReactNode, useId } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  children: (id: string) => ReactNode
}

export function FormField({ label, error, children }: FormFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-mono text-muted uppercase tracking-widest">
        {label}
      </label>
      {children(id)}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create ToggleButtonGroup.tsx**

Multi-select pill buttons. `multiple={false}` turns it into a single-select group (selecting one deselects others).

```tsx
interface Option {
  value: string
  label: string
}

interface ToggleButtonGroupProps {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  multiple?: boolean
}

export function ToggleButtonGroup({ options, value, onChange, multiple = true }: ToggleButtonGroupProps) {
  function toggle(v: string) {
    if (multiple) {
      onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
    } else {
      onChange(value.includes(v) ? [] : [v])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const selected = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
              selected
                ? 'bg-accent text-white border-accent'
                : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/forms/FormField.tsx apps/web/src/components/forms/ToggleButtonGroup.tsx
git commit -m "feat: add FormField and ToggleButtonGroup form components"
```

---

## Task 10: Card Components

**Files:**
- Modify: `apps/web/src/components/cards/GameCard.tsx`
- Modify: `apps/web/src/components/cards/RealmCard.tsx`
- Modify: `apps/web/src/components/cards/CharacterCard.tsx`
- Modify: `apps/web/src/components/cards/MatchCard.tsx`

- [ ] **Step 1: Rewrite GameCard.tsx**

```tsx
import { type Game } from '../../api/endpoints/games'

interface GameCardProps {
  game: Game
  onSelect: (game: Game) => void
}

export function GameCard({ game, onSelect }: GameCardProps) {
  return (
    <button
      onClick={() => onSelect(game)}
      className="group w-full text-left bg-surface border border-border rounded-lg overflow-hidden hover:border-accent transition-colors"
    >
      {game.imageUrl ? (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={game.imageUrl}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-surface-raised flex items-center justify-center">
          <span className="text-muted text-xs font-mono uppercase">No image</span>
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-mono text-text truncate">{game.name}</p>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Rewrite RealmCard.tsx**

```tsx
import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'
import { Button } from '../ui'

interface RealmCardProps {
  userGame: UserGame
  onRemove: (userGame: UserGame) => void
}

export function RealmCard({ userGame, onRemove }: RealmCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors">
      {userGame.gameImageUrl ? (
        <div className="aspect-video w-full overflow-hidden">
          <img src={userGame.gameImageUrl} alt={userGame.gameName} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video w-full bg-surface-raised" />
      )}
      <div className="p-3 flex flex-col gap-3">
        <p className="text-sm font-mono text-text truncate">{userGame.gameName}</p>
        <div className="flex gap-2">
          <Link
            to={`/realm/${userGame.gameId}`}
            className="flex-1 text-center text-xs font-mono uppercase tracking-widest py-2 border border-border text-muted hover:border-accent hover:text-accent transition-colors rounded"
          >
            Enter
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(userGame)}
            className="text-danger hover:opacity-70"
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite CharacterCard.tsx**

`CharacterSummary` (from matches) is a subset of `Character`. This component accepts either via a permissive shared interface. The `platformHandle` field is optional in display.

```tsx
import { Badge, Card } from '../ui'

interface CharacterDisplayProps {
  id: string
  name: string
  bio?: string
  playstyle?: string
  rank?: string
  region?: string
  mainRole?: string
  secondaryRole?: string
  imageUrl?: string
  platformHandle?: string
}

interface CharacterCardProps {
  character: CharacterDisplayProps
  gameId?: string
}

export function CharacterCard({ character, gameId }: CharacterCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-raised flex-shrink-0 overflow-hidden">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-sm font-mono">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-text text-sm truncate">{character.name}</p>
          {character.platformHandle && (
            <p className="text-xs text-muted font-mono truncate">{character.platformHandle}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
        {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        {character.region && <Badge variant="region">{character.region}</Badge>}
      </div>
      {character.bio && (
        <p className="text-xs text-muted line-clamp-2">{character.bio}</p>
      )}
    </Card>
  )
}
```

- [ ] **Step 4: Rewrite MatchCard.tsx**

```tsx
import { Badge, Card } from '../ui'

interface MatchCardProps {
  character: {
    name: string
    bio?: string
    rank?: string
    region?: string
    mainRole?: string
    imageUrl?: string
  }
  matchedAt: string
}

export function MatchCard({ character, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-xs font-mono text-muted">Matched {date}</p>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-raised flex-shrink-0 overflow-hidden">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-sm font-mono">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-text text-sm truncate">{character.name}</p>
          {character.mainRole && <p className="text-xs text-muted font-mono">{character.mainRole}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
        {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        {character.region && <Badge variant="region">{character.region}</Badge>}
      </div>
    </Card>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/cards/
git commit -m "feat: rewrite GameCard, RealmCard, CharacterCard, MatchCard"
```

---

## Task 11: SwipeCard

**Files:**
- Modify: `apps/web/src/components/cards/SwipeCard.tsx`

- [ ] **Step 1: Rewrite SwipeCard.tsx**

Uses the same animation keyframes from `index.css` (`slide-in-left`, `slide-out-right`, `slide-out-left`, `card-enter`). Top card is interactive; the second card in the stack is scaled back.

```tsx
import { useState } from 'react'
import { Badge, Button, Card } from '../ui'
import { type DiscoverCharacter } from '../../api/endpoints/characters'

type ExitDirection = 'left' | 'right' | null

interface SwipeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
  isTop: boolean
}

export function SwipeCard({ character, onLike, onDislike, isTop }: SwipeCardProps) {
  const [exiting, setExiting] = useState<ExitDirection>(null)

  function handle(dir: ExitDirection, action: () => void) {
    setExiting(dir)
    setTimeout(action, 380)
  }

  const animClass = isTop
    ? exiting === 'right'
      ? '[animation:slide-out-right_0.38s_ease_forwards]'
      : exiting === 'left'
      ? '[animation:slide-out-left_0.38s_ease_forwards]'
      : '[animation:slide-in-left_0.35s_ease_forwards]'
    : '[animation:card-enter_0.35s_ease_forwards]'

  return (
    <div
      className={`absolute inset-0 ${animClass}`}
      style={{
        zIndex: isTop ? 2 : 1,
        transform: isTop ? undefined : 'scale(0.97) translateY(8px)',
      }}
    >
      <Card padding="lg" className="h-full flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-raised flex-shrink-0 overflow-hidden">
            {character.imageUrl ? (
              <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted font-mono text-lg">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-text text-lg">{character.name}</p>
            <p className="text-sm text-muted font-mono">{character.platformHandle}</p>
            {character.gameName && <p className="text-xs text-muted mt-0.5">{character.gameName}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
        </div>

        {character.bio && (
          <p className="text-sm text-muted flex-1 overflow-y-auto">{character.bio}</p>
        )}

        {isTop && (
          <div className="flex gap-3 mt-auto">
            <Button
              variant="secondary"
              className="flex-1 border-danger/50 text-danger hover:bg-danger hover:text-white hover:border-danger"
              onClick={() => handle('left', onDislike)}
              disabled={!!exiting}
            >
              Pass
            </Button>
            <Button
              className="flex-1"
              onClick={() => handle('right', onLike)}
              disabled={!!exiting}
            >
              Like
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/cards/SwipeCard.tsx
git commit -m "feat: rewrite SwipeCard using new primitives"
```

---

## Task 12: DiscoveryPanel

**Files:**
- Create: `apps/web/src/components/DiscoveryPanel.tsx`

DiscoveryPanel is now self-contained: it fetches the discover queue and owns all swipe state. Props are `gameId`, `myCharacter`, and `onMatch` callback.

- [ ] **Step 1: Create DiscoveryPanel.tsx**

```tsx
import { useEffect, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { SwipeCard } from './cards/SwipeCard'
import { Spinner, EmptyState } from './ui'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character | null | 'loading'
  onMatch: () => void
}

export function DiscoveryPanel({ gameId, myCharacter, onMatch }: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')

  useEffect(() => {
    setStatus('loading')
    discoverCharacters(gameId)
      .then(chars => {
        setQueue(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId])

  async function handleInteract(type: 'Like' | 'Dislike') {
    const current = queue[0]
    if (!current || !myCharacter || myCharacter === 'loading') return
    try {
      const res = await interactWithCharacter(myCharacter.id, current.id, type)
      if (res.isMatch) onMatch()
    } catch { /* fail silently */ }
    setQueue(q => {
      const next = q.slice(1)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }

  if (!myCharacter || myCharacter === 'loading') {
    return <EmptyState message="Create a character to start matching" />
  }

  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner label="Scanning the realm..." /></div>
  }

  if (status === 'empty' || status === 'error') {
    return (
      <EmptyState
        message={status === 'empty' ? 'All caught up — check back later.' : 'Could not load players.'}
      />
    )
  }

  return (
    <div className="relative" style={{ height: '520px' }}>
      {queue.slice(0, 2).map((char, i) => (
        <SwipeCard
          key={char.id}
          character={char}
          onLike={() => handleInteract('Like')}
          onDislike={() => handleInteract('Dislike')}
          isTop={i === 0}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/DiscoveryPanel.tsx
git commit -m "feat: add self-contained DiscoveryPanel"
```

---

## Task 13: CharacterPanel

**Files:**
- Create: `apps/web/src/components/CharacterPanel.tsx`

CharacterPanel owns the character data fetch for a given userGame.

- [ ] **Step 1: Create CharacterPanel.tsx**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { type UserGameDetail } from '../api/endpoints/userGames'
import { CharacterCard } from './cards/CharacterCard'
import { Button, EmptyState, Spinner } from './ui'

interface CharacterPanelProps {
  gameId: string
  userGame: UserGameDetail | null
}

export function CharacterPanel({ gameId, userGame }: CharacterPanelProps) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading')

  useEffect(() => {
    if (!userGame) return
    getUserGameCharacters(userGame.id)
      .then(chars => {
        const mine = chars.find(c => c.userGameId === userGame.id) ?? null
        setCharacter(mine)
        setStatus(mine ? 'ready' : 'empty')
      })
      .catch(() => setStatus('empty'))
  }, [userGame?.id])

  if (!userGame || status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-mono text-muted uppercase tracking-widest">My Character</h2>
      {status === 'empty' || !character ? (
        <div className="flex flex-col gap-3">
          <EmptyState message="No character for this realm yet" />
          <Link to={`/realm/${gameId}/create-character`}>
            <Button className="w-full">Create Character</Button>
          </Link>
        </div>
      ) : (
        <CharacterCard character={character} />
      )}
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/CharacterPanel.tsx
git commit -m "feat: add CharacterPanel with self-contained character fetch"
```

---

## Task 14: UserRealmsSection

**Files:**
- Create: `apps/web/src/components/UserRealmsSection.tsx`

UserRealmsSection owns the add-game search flow and confirmation modals. It receives the current game list and mutation callbacks from `HomePage`.

- [ ] **Step 1: Create UserRealmsSection.tsx**

```tsx
import { useState } from 'react'
import { type UserGame, addUserGame as apiAddUserGame, deleteUserGame } from '../api/endpoints/userGames'
import { getGames, type Game } from '../api/endpoints/games'
import { RealmCard } from './cards/RealmCard'
import { GameCard } from './cards/GameCard'
import { Modal, Button, Input, EmptyState, Spinner } from './ui'

interface UserRealmsSectionProps {
  games: UserGame[]
  onAdd: (game: UserGame) => void
  onRemove: (game: UserGame) => void
}

export function UserRealmsSection({ games, onAdd, onRemove }: UserRealmsSectionProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [pendingGame, setPendingGame] = useState<Game | null>(null)
  const [adding, setAdding] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<UserGame | null>(null)

  async function handleSearch() {
    if (!query.trim()) return
    setSearchStatus('loading')
    const result = await getGames({ q: query })
    setResults(result.games)
    setSearchStatus('done')
  }

  async function confirmAdd() {
    if (!pendingGame) return
    setAdding(true)
    try {
      const newGame = await apiAddUserGame({
        externalId: pendingGame.externalId,
        name: pendingGame.name,
        imageUrl: pendingGame.imageUrl,
      })
      onAdd(newGame)
      setPendingGame(null)
      setQuery('')
      setResults([])
      setSearchStatus('idle')
    } finally {
      setAdding(false)
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    await deleteUserGame(removeTarget.id)
    onRemove(removeTarget)
    setRemoveTarget(null)
  }

  return (
    <div className="flex flex-col gap-10">
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

      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Add a Realm</h2>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label=""
              placeholder="Search games..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} disabled={searchStatus === 'loading'}>
            Search
          </Button>
        </div>
        {searchStatus === 'loading' && <div className="mt-4"><Spinner /></div>}
        {searchStatus === 'done' && results.length === 0 && (
          <p className="mt-4 text-xs text-muted font-mono">No results found.</p>
        )}
        {results.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map(g => (
              <GameCard key={g.id} game={g} onSelect={setPendingGame} />
            ))}
          </div>
        )}
      </section>

      <Modal isOpen={!!pendingGame} onClose={() => setPendingGame(null)} title="Add Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Add <strong>{pendingGame?.name}</strong> to your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPendingGame(null)}>Cancel</Button>
            <Button onClick={confirmAdd} disabled={adding}>
              {adding ? 'Adding...' : 'Add Realm'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Remove <strong>{removeTarget?.gameName}</strong> from your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmRemove}>Remove</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/UserRealmsSection.tsx
git commit -m "feat: add UserRealmsSection with inline add/remove flow"
```

---

## Task 15: CharacterGallery & MatchGallery

**Files:**
- Create: `apps/web/src/components/CharacterGallery.tsx`
- Create: `apps/web/src/components/MatchGallery.tsx`

- [ ] **Step 1: Create CharacterGallery.tsx**

Groups characters by game using the userGame list. `CharacterPage` will pass both `characters` and `userGames`.

```tsx
import { type Character } from '../api/endpoints/characters'
import { type UserGame } from '../api/endpoints/userGames'
import { CharacterCard } from './cards/CharacterCard'
import { EmptyState } from './ui'

interface CharacterGalleryProps {
  characters: Character[]
  userGames: UserGame[]
}

export function CharacterGallery({ characters, userGames }: CharacterGalleryProps) {
  if (characters.length === 0) {
    return <EmptyState message="No characters yet" />
  }

  const byGame: Record<string, { gameName: string; characters: Character[] }> = {}
  for (const char of characters) {
    const userGame = userGames.find(g => g.id === char.userGameId)
    if (!userGame) continue
    if (!byGame[userGame.gameId]) byGame[userGame.gameId] = { gameName: userGame.gameName, characters: [] }
    byGame[userGame.gameId].characters.push(char)
  }

  return (
    <div className="flex flex-col gap-10">
      {Object.entries(byGame).map(([gameId, group]) => (
        <section key={gameId}>
          <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">{group.gameName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.characters.map(c => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create MatchGallery.tsx**

Groups matches by game, then by myCharacter. Uses `CharacterCard` for myCharacter and `MatchCard` for their matches in a horizontal scroll row.

```tsx
import { type CharacterMatchDto } from '../api/endpoints/matches'
import { CharacterCard } from './cards/CharacterCard'
import { MatchCard } from './cards/MatchCard'
import { EmptyState } from './ui'

interface MatchGalleryProps {
  matches: CharacterMatchDto[]
}

export function MatchGallery({ matches }: MatchGalleryProps) {
  if (matches.length === 0) {
    return <EmptyState message="No matches yet — start swiping!" />
  }

  const byGame: Record<string, {
    gameName: string
    byCharacter: Record<string, { myCharacter: CharacterMatchDto['myCharacter']; matches: CharacterMatchDto[] }>
  }> = {}

  for (const m of matches) {
    if (!byGame[m.gameId]) byGame[m.gameId] = { gameName: m.gameName, byCharacter: {} }
    const charGroup = byGame[m.gameId].byCharacter
    if (!charGroup[m.myCharacter.id]) {
      charGroup[m.myCharacter.id] = { myCharacter: m.myCharacter, matches: [] }
    }
    charGroup[m.myCharacter.id].matches.push(m)
  }

  return (
    <div className="flex flex-col gap-12">
      {Object.entries(byGame).map(([gameId, gameGroup]) => (
        <section key={gameId}>
          <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-6">{gameGroup.gameName}</h2>
          {Object.entries(gameGroup.byCharacter).map(([charId, charGroup]) => (
            <div key={charId} className="mb-6 flex items-start gap-4 overflow-x-auto pb-4">
              <div className="flex-shrink-0 w-64">
                <CharacterCard character={charGroup.myCharacter} />
              </div>
              {charGroup.matches.map(m => (
                <div key={m.matchId} className="flex-shrink-0 w-64">
                  <MatchCard character={m.theirCharacter} matchedAt={m.matchedAt} />
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/CharacterGallery.tsx apps/web/src/components/MatchGallery.tsx
git commit -m "feat: add CharacterGallery and MatchGallery components"
```

---

## Task 16: CreateCharacterWizard

**Files:**
- Create: `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`
- Create: `apps/web/src/components/character-wizard/IdentityStep.tsx`
- Create: `apps/web/src/components/character-wizard/GameplayStep.tsx`
- Create: `apps/web/src/components/character-wizard/AvailabilityStep.tsx`
- Create: `apps/web/src/components/character-wizard/AboutStep.tsx`

- [ ] **Step 1: Create CreateCharacterWizard.tsx**

The wizard owns all form state and step progression. Each step receives its slice of the form and an `onChange` handler. Back/Next/Submit live in the wizard only.

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCharacter, type CharacterCreate } from '../../api/endpoints/characters'
import { Button } from '../ui'
import { IdentityStep } from './IdentityStep'
import { GameplayStep } from './GameplayStep'
import { AvailabilityStep } from './AvailabilityStep'
import { AboutStep } from './AboutStep'

export type WizardFormData = Omit<CharacterCreate, 'userGameId'>

const emptyForm: WizardFormData = {
  platform: '',
  platformHandle: '',
  name: '',
  imageUrl: '',
  bio: '',
  mainRole: '',
  secondaryRole: '',
  preferredModes: [],
  timeZone: '',
  activeTimes: [],
  usesVoiceChat: false,
  languages: [],
  playstyle: '',
  rank: '',
  region: '',
}

const STEP_LABELS = ['Identity', 'Gameplay', 'Availability', 'About']

interface CreateCharacterWizardProps {
  userGameId: string
  gameId: string
}

export function CreateCharacterWizard({ userGameId, gameId }: CreateCharacterWizardProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WizardFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  function update(patch: Partial<WizardFormData>) {
    setForm(prev => ({ ...prev, ...patch }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await createCharacter({ ...form, userGameId })
      navigate(`/realm/${gameId}`)
    } catch {
      setError('Failed to create character. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-8">
      {/* Progress */}
      <div className="flex gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-border'}`} />
            <p className={`text-xs font-mono mt-1.5 truncate ${i === step ? 'text-text' : 'text-muted'}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div>
        {step === 0 && <IdentityStep form={form} onChange={update} />}
        {step === 1 && <GameplayStep form={form} onChange={update} />}
        {step === 2 && <AvailabilityStep form={form} onChange={update} />}
        {step === 3 && <AboutStep form={form} onChange={update} />}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>
        ) : (
          <div />
        )}
        {step < STEP_LABELS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Character'}
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create IdentityStep.tsx**

```tsx
import { Input, Textarea } from '../ui'
import { type WizardFormData } from './CreateCharacterWizard'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'

const PLATFORM_OPTIONS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile'].map(v => ({ value: v, label: v }))

interface Props {
  form: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function IdentityStep({ form, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Character Name"
        value={form.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder="Your character's name"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-muted uppercase tracking-widest">Platform</label>
        <ToggleButtonGroup
          options={PLATFORM_OPTIONS}
          value={form.platform ? [form.platform] : []}
          onChange={v => onChange({ platform: v[0] ?? '' })}
          multiple={false}
        />
      </div>
      <Input
        label="Platform Handle / Username"
        value={form.platformHandle}
        onChange={e => onChange({ platformHandle: e.target.value })}
        placeholder="Your in-game username"
      />
      <Input
        label="Avatar URL (optional)"
        value={form.imageUrl ?? ''}
        onChange={e => onChange({ imageUrl: e.target.value })}
        placeholder="https://..."
      />
      <Textarea
        label="Bio"
        value={form.bio ?? ''}
        onChange={e => onChange({ bio: e.target.value })}
        placeholder="Tell players about your character"
        rows={3}
        maxLength={300}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create GameplayStep.tsx**

```tsx
import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type WizardFormData } from './CreateCharacterWizard'

const ROLE_OPTIONS = ['Tank', 'DPS', 'Support', 'Healer', 'Flex', 'Carry', 'Jungler', 'Bruiser'].map(v => ({ value: v, label: v }))
const MODE_OPTIONS = ['Casual', 'Ranked', 'Competitive', 'Story', 'Co-op', 'PvP', 'PvE'].map(v => ({ value: v, label: v }))
const PLAYSTYLE_OPTIONS = ['Aggressive', 'Defensive', 'Supportive', 'Strategic', 'Chaotic'].map(v => ({ value: v, label: v }))

interface Props {
  form: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function GameplayStep({ form, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-muted uppercase tracking-widest">Main Role</label>
        <ToggleButtonGroup
          options={ROLE_OPTIONS}
          value={form.mainRole ? [form.mainRole] : []}
          onChange={v => onChange({ mainRole: v[0] ?? '' })}
          multiple={false}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-muted uppercase tracking-widest">Secondary Role (optional)</label>
        <ToggleButtonGroup
          options={ROLE_OPTIONS}
          value={form.secondaryRole ? [form.secondaryRole] : []}
          onChange={v => onChange({ secondaryRole: v[0] ?? '' })}
          multiple={false}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-muted uppercase tracking-widest">Preferred Modes</label>
        <ToggleButtonGroup
          options={MODE_OPTIONS}
          value={form.preferredModes}
          onChange={v => onChange({ preferredModes: v })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-muted uppercase tracking-widest">Playstyle</label>
        <ToggleButtonGroup
          options={PLAYSTYLE_OPTIONS}
          value={form.playstyle ? [form.playstyle] : []}
          onChange={v => onChange({ playstyle: v[0] ?? '' })}
          multiple={false}
        />
      </div>
      <Input
        label="Rank (optional)"
        value={form.rank ?? ''}
        onChange={e => onChange({ rank: e.target.value })}
        placeholder="e.g. Diamond, Platinum, Gold"
      />
      <Input
        label="Region (optional)"
        value={form.region ?? ''}
        onChange={e => onChange({ region: e.target.value })}
        placeholder="e.g. NA, EU, Asia"
      />
    </div>
  )
}
```

- [ ] **Step 4: Create AvailabilityStep.tsx**

```tsx
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type WizardFormData } from './CreateCharacterWizard'

const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Late Night', 'Weekends Only'].map(v => ({ value: v, label: v }))

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'Europe/London', label: 'GMT/BST' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Seoul', label: 'Korea (KST)' },
  { value: 'Australia/Sydney', label: 'AEST' },
]

interface Props {
  form: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function AvailabilityStep({ form, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-muted uppercase tracking-widest">Time Zone</label>
        <select
          value={form.timeZone ?? ''}
          onChange={e => onChange({ timeZone: e.target.value })}
          className="bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
        >
          <option value="">Select timezone...</option>
          {TIMEZONE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-muted uppercase tracking-widest">Active Times</label>
        <ToggleButtonGroup
          options={TIME_OPTIONS}
          value={form.activeTimes ?? []}
          onChange={v => onChange({ activeTimes: v })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-muted uppercase tracking-widest">Voice Chat</label>
        <div className="flex gap-2">
          {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange({ usesVoiceChat: opt.val })}
              className={`px-4 py-2 rounded text-xs font-mono border transition-colors ${
                form.usesVoiceChat === opt.val
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-muted hover:border-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create AboutStep.tsx**

```tsx
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type WizardFormData } from './CreateCharacterWizard'

const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Portuguese',
  'Japanese', 'Korean', 'Chinese', 'Arabic', 'Russian',
].map(v => ({ value: v, label: v }))

interface Props {
  form: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function AboutStep({ form, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-muted uppercase tracking-widest">Languages</label>
        <ToggleButtonGroup
          options={LANGUAGE_OPTIONS}
          value={form.languages ?? []}
          onChange={v => onChange({ languages: v })}
        />
      </div>
      <div className="mt-6 p-4 bg-surface-raised rounded-lg border border-border">
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Review</p>
        <dl className="flex flex-col gap-1 text-xs text-muted">
          {form.name && <div><span className="text-text">{form.name}</span> — {form.platform}</div>}
          {form.mainRole && <div>Role: <span className="text-text">{form.mainRole}</span></div>}
          {form.preferredModes.length > 0 && <div>Modes: <span className="text-text">{form.preferredModes.join(', ')}</span></div>}
          {form.timeZone && <div>Timezone: <span className="text-text">{form.timeZone}</span></div>}
        </dl>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/character-wizard/
git commit -m "feat: add CreateCharacterWizard with 4-step form"
```

---

## Task 17: AuthModal Rewrite

**Files:**
- Modify: `apps/web/src/components/modals/AuthModal.tsx`

- [ ] **Step 1: Rewrite AuthModal.tsx**

Replaces the old AuthModal with one built on the new `Modal` primitive. Handles both sign in and sign up. On success, navigates to `/home`.

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../../api/endpoints/auth'
import { useAuth } from '../../context/AuthContext'
import { Modal, Button, Input } from '../ui'

type Mode = 'signin' | 'signup'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: Mode
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login: authLogin } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        await register(username, password)
      }
      const token = await login(username, password)
      await authLogin(username, token)
      onClose()
      navigate('/home')
    } catch {
      setError(
        mode === 'signup'
          ? 'Registration failed. Try a different username.'
          : 'Invalid username or password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'signin' ? 'Sign In' : 'Create Account'}
    >
      <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
        <Input
          label="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </Button>
        <p className="text-xs text-center text-muted">
          {mode === 'signin' ? (
            <>No account?{' '}
              <button type="button" onClick={() => setMode('signup')} className="text-accent hover:underline">Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button type="button" onClick={() => setMode('signin')} className="text-accent hover:underline">Sign in</button>
            </>
          )}
        </p>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/modals/AuthModal.tsx
git commit -m "feat: rewrite AuthModal using Modal primitive"
```

---

## Task 18: LandingPage Rewrite

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx`

- [ ] **Step 1: Rewrite LandingPage.tsx**

LandingPage owns auth modal visibility state. The hero and "how it works" content is inlined here (both are simple enough not to need separate files). `NavBar variant="landing"` is used. If the user is already authenticated, redirect to `/home`.

```tsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NavBar } from '../components/layout/NavBar'
import { AuthModal } from '../components/modals/AuthModal'

type AuthModalState = { open: boolean; mode: 'signin' | 'signup' }

export default function LandingPage() {
  const { state } = useAuth()
  const [authModal, setAuthModal] = useState<AuthModalState>({ open: false, mode: 'signin' })

  if (state.status === 'authenticated') {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <NavBar
        variant="landing"
        onSignIn={() => setAuthModal({ open: true, mode: 'signin' })}
        onSignUp={() => setAuthModal({ open: true, mode: 'signup' })}
      />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <h1 className="font-display font-black text-text text-4xl md:text-6xl leading-tight max-w-2xl">
          Find Your Party
        </h1>
        <p className="text-muted text-lg max-w-md leading-relaxed">
          Build a character, swipe on players, match with your perfect party.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => setAuthModal({ open: true, mode: 'signup' })}
            className="px-8 py-3 bg-accent text-white font-mono text-sm uppercase tracking-widest rounded hover:bg-accent-dim transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={() => setAuthModal({ open: true, mode: 'signin' })}
            className="px-8 py-3 border border-border text-text font-mono text-sm uppercase tracking-widest rounded hover:border-accent hover:text-accent transition-colors"
          >
            Sign In
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-bold text-text text-2xl text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Build Your Character', desc: 'Create a profile for each game you play. Share your rank, roles, and playstyle.' },
              { step: '02', title: 'Discover Players', desc: 'Swipe on player characters in your realm. Like the ones you want to play with.' },
              { step: '03', title: 'Match & Play', desc: 'Mutual likes create a match. Find your party and get in the game.' },
            ].map(item => (
              <div key={item.step} className="flex flex-col gap-2">
                <span className="font-mono text-accent text-xs uppercase tracking-widest">{item.step}</span>
                <h3 className="font-display font-semibold text-text">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal(m => ({ ...m, open: false }))}
        initialMode={authModal.mode}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify landing page**

Visit http://localhost:5173. Confirm:
- Dark background renders
- NavBar shows "PartyUp" logo with Sign In / Sign Up buttons
- Hero text renders in Cinzel font
- Sign In button opens the AuthModal
- On mobile, the bottom tray should NOT appear on the landing page (it's only in `SignedInLayout`)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/LandingPage.tsx
git commit -m "feat: rewrite LandingPage"
```

---

## Task 19: HomePage Rewrite

**Files:**
- Modify: `apps/web/src/pages/HomePage.tsx`

- [ ] **Step 1: Rewrite HomePage.tsx**

`HomePage` calls `useUserGames()` and passes the result to `UserRealmsSection`. The hook is at `hooks/useUserGame.ts` and the file exports `useUserGames` (note: the hook file is named `useUserGame.ts` but the export is `useUserGames`).

```tsx
import { useUserGames } from '../hooks/useUserGame'
import { PageLayout } from '../components/layout/PageLayout'
import { UserRealmsSection } from '../components/UserRealmsSection'
import { Spinner, EmptyState } from '../components/ui'

export default function HomePage() {
  const { games, status, addUserGame, removeGame } = useUserGames()

  if (status === 'loading') {
    return (
      <PageLayout className="flex items-center justify-center min-h-64">
        <Spinner label="Loading realms..." />
      </PageLayout>
    )
  }

  if (status === 'error') {
    return (
      <PageLayout>
        <EmptyState message="Failed to load your realms" />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <UserRealmsSection games={games} onAdd={addUserGame} onRemove={removeGame} />
    </PageLayout>
  )
}
```

- [ ] **Step 2: Verify homepage**

Log in and visit http://localhost:5173/home. Confirm:
- Realms grid renders
- Search for a game works and shows results
- Adding a game shows the confirmation modal

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/HomePage.tsx
git commit -m "feat: rewrite HomePage"
```

---

## Task 20: RealmPage Rewrite

**Files:**
- Modify: `apps/web/src/pages/RealmPage.tsx`

- [ ] **Step 1: Rewrite RealmPage.tsx**

RealmPage fetches `userGame` and `myCharacter`, passes them to `CharacterPanel` and `DiscoveryPanel`. Match banner is a Modal. The old `useSignedInLayout` / `setNavExtra` is removed — the "← Hub" back link is rendered inside the page header instead.

```tsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { useMatches } from '../hooks/useMatches'
import { PageLayout } from '../components/layout/PageLayout'
import { DiscoveryPanel } from '../components/DiscoveryPanel'
import { CharacterPanel } from '../components/CharacterPanel'
import { MatchGallery } from '../components/MatchGallery'
import { Modal, Spinner } from '../components/ui'

type Tab = 'discover' | 'matches'

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [myCharacter, setMyCharacter] = useState<Character | null | 'loading'>('loading')
  const [tab, setTab] = useState<Tab>('discover')
  const [matchBanner, setMatchBanner] = useState(false)
  const { data: matches, loading: matchesLoading } = useMatches(gameId)

  useEffect(() => {
    if (!gameId) return
    getUserGameByGameId(gameId).then(setUserGame)
  }, [gameId])

  useEffect(() => {
    if (!userGame) return
    getUserGameCharacters(userGame.id)
      .then(chars => {
        setMyCharacter(chars.find(c => c.userGameId === userGame.id) ?? null)
      })
      .catch(() => setMyCharacter(null))
  }, [userGame?.id])

  if (!gameId) return null

  return (
    <>
      {/* Game header */}
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        {userGame?.gameImageUrl && (
          <img
            src={userGame.gameImageUrl}
            alt={userGame.gameName}
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
        <div className="relative flex items-end h-full px-4 md:px-8 pb-4 gap-3">
          <Link to="/home" className="text-xs font-mono text-muted hover:text-text transition-colors">
            ← Hub
          </Link>
          <span className="text-muted text-xs">/</span>
          <h1 className="font-display font-bold text-text text-xl">
            {userGame?.gameName ?? '...'}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-4 md:px-8">
        <div className="flex max-w-7xl mx-auto">
          {(['discover', 'matches'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
                tab === t
                  ? 'text-accent border-b-2 border-accent -mb-px'
                  : 'text-muted hover:text-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <PageLayout>
        {tab === 'discover' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <CharacterPanel gameId={gameId} userGame={userGame} />
            <DiscoveryPanel
              gameId={gameId}
              myCharacter={myCharacter}
              onMatch={() => {
                setMatchBanner(true)
                setTimeout(() => setMatchBanner(false), 2500)
              }}
            />
          </div>
        )}
        {tab === 'matches' && (
          matchesLoading
            ? <div className="flex justify-center py-10"><Spinner label="Loading matches..." /></div>
            : <MatchGallery matches={matches} />
        )}
      </PageLayout>

      <Modal isOpen={matchBanner} onClose={() => setMatchBanner(false)}>
        <div className="px-6 py-8 text-center flex flex-col gap-3">
          <p className="font-display font-bold text-text text-2xl">It's a Match!</p>
          <p className="text-muted text-sm">You and another player liked each other.</p>
        </div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Verify realm page**

Navigate to a realm at http://localhost:5173/realm/:gameId. Confirm:
- Game header renders with blurred background image
- Tabs switch between Discover and Matches
- CharacterPanel shows character or "Create Character" CTA
- DiscoveryPanel shows swipe cards or empty state

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/RealmPage.tsx
git commit -m "feat: rewrite RealmPage"
```

---

## Task 21: CreateCharacterPage Rewrite

**Files:**
- Modify: `apps/web/src/pages/CreateCharacterPage.tsx`

- [ ] **Step 1: Rewrite CreateCharacterPage.tsx**

Thin page: fetches the `userGameId` from `gameId`, then renders the wizard.

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getUserGameByGameId } from '../api/endpoints/userGames'
import { CreateCharacterWizard } from '../components/character-wizard/CreateCharacterWizard'
import { PageLayout } from '../components/layout/PageLayout'
import { Spinner } from '../components/ui'

export default function CreateCharacterPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [userGameId, setUserGameId] = useState<string | null>(null)

  useEffect(() => {
    if (!gameId) return
    getUserGameByGameId(gameId).then(ug => setUserGameId(ug.id))
  }, [gameId])

  if (!gameId || !userGameId) {
    return (
      <PageLayout className="flex items-center justify-center min-h-64">
        <Spinner />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <h1 className="font-display font-bold text-text text-2xl mb-8">Create Character</h1>
      <CreateCharacterWizard userGameId={userGameId} gameId={gameId} />
    </PageLayout>
  )
}
```

- [ ] **Step 2: Verify character creation**

Navigate to http://localhost:5173/realm/:gameId/create-character. Confirm:
- Progress bar shows 4 steps
- Each step renders correct fields
- Next/Back navigation works
- Submit navigates back to the realm page

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/CreateCharacterPage.tsx
git commit -m "feat: rewrite CreateCharacterPage with wizard"
```

---

## Task 22: CharacterPage & MatchesPage Rewrites

**Files:**
- Modify: `apps/web/src/pages/CharacterPage.tsx`
- Modify: `apps/web/src/pages/MatchesPage.tsx`

- [ ] **Step 1: Rewrite CharacterPage.tsx**

Note: the file is `CharacterPage.tsx` but `App.tsx` imports it as `CharactersPage` (the default export). Keep the export name consistent with what `App.tsx` expects — check `App.tsx` line 9: it imports `CharactersPage` from `./pages/CharacterPage`. The default export must remain `CharactersPage`.

```tsx
import { useEffect, useState } from 'react'
import { getCharacters, type Character } from '../api/endpoints/characters'
import { useUserGames } from '../hooks/useUserGame'
import { PageLayout } from '../components/layout/PageLayout'
import { CharacterGallery } from '../components/CharacterGallery'
import { Spinner } from '../components/ui'

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const { games } = useUserGames()

  useEffect(() => {
    getCharacters()
      .then(setCharacters)
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageLayout>
      <h1 className="font-display font-bold text-text text-2xl mb-8">My Characters</h1>
      {loading
        ? <div className="flex justify-center py-10"><Spinner /></div>
        : <CharacterGallery characters={characters} userGames={games} />
      }
    </PageLayout>
  )
}
```

- [ ] **Step 2: Rewrite MatchesPage.tsx**

```tsx
import { useMatches } from '../hooks/useMatches'
import { PageLayout } from '../components/layout/PageLayout'
import { MatchGallery } from '../components/MatchGallery'
import { Spinner } from '../components/ui'

export default function MatchesPage() {
  const { data: matches, loading } = useMatches()

  return (
    <PageLayout>
      <h1 className="font-display font-bold text-text text-2xl mb-8">My Matches</h1>
      {loading
        ? <div className="flex justify-center py-10"><Spinner /></div>
        : <MatchGallery matches={matches} />
      }
    </PageLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/CharacterPage.tsx apps/web/src/pages/MatchesPage.tsx
git commit -m "feat: rewrite CharacterPage and MatchesPage"
```

---

## Task 23: Cleanup Deleted Files

**Files:**
- Delete all old components replaced by the rewrite

- [ ] **Step 1: Delete old layout components**

```bash
Remove-Item apps/web/src/components/layout/SignOutButton.tsx
Remove-Item apps/web/src/components/layout/FullScreenStatus.tsx
Remove-Item apps/web/src/components/layout/Footer.tsx
Remove-Item apps/web/src/components/layout/CornerAccents.tsx
```

- [ ] **Step 2: Delete old ui/ components**

```bash
Remove-Item apps/web/src/components/ui/DiscoveryPanel.tsx
Remove-Item apps/web/src/components/ui/CharacterPanel.tsx
Remove-Item apps/web/src/components/ui/UserRealmsSection.tsx
Remove-Item apps/web/src/components/ui/HeroSection.tsx
Remove-Item apps/web/src/components/ui/GameBanner.tsx
Remove-Item apps/web/src/components/ui/GameGrid.tsx
Remove-Item apps/web/src/components/ui/GameSearchControls.tsx
Remove-Item apps/web/src/components/ui/GameSearchSection.tsx
Remove-Item apps/web/src/components/ui/GameInfoSection.tsx
Remove-Item apps/web/src/components/ui/MatchBanner.tsx
Remove-Item apps/web/src/components/ui/HowItWorksSection.tsx
Remove-Item apps/web/src/components/ui/SectionHeader.tsx
Remove-Item apps/web/src/components/ui/Pagination.tsx
```

- [ ] **Step 3: Delete old modals**

```bash
Remove-Item apps/web/src/components/modals/Modal.tsx
Remove-Item apps/web/src/components/modals/GameSelectModal.tsx
Remove-Item apps/web/src/components/modals/UserGameSelectModal.tsx
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
npm run build --prefix apps/web
```

Expected: build completes with no errors. Fix any import errors (likely broken references to deleted files) before committing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete old components replaced by rewrite"
```

---

## Task 24: Final Verification

- [ ] **Step 1: Full manual test**

With `npm run dev --prefix apps/web` running, test every route:

| Route | Check |
|-------|-------|
| `/` | Landing renders, auth modal opens for both Sign In and Sign Up, redirect to `/home` after auth |
| `/home` | Realms grid shows, add realm flow works (search → confirm → appears in grid), remove realm works |
| `/realm/:gameId` | Game header renders, tabs switch, CharacterPanel shows character or CTA, DiscoveryPanel shows cards or empty state |
| `/realm/:gameId/create-character` | 4-step wizard advances and submits, redirects to realm on success |
| `/characters` | Characters grouped by game |
| `/matches` | Matches grouped by game > character in horizontal scroll rows |

- [ ] **Step 2: Mobile verification**

Resize browser to < 768px width. Confirm:
- Top NavBar shows logo + avatar only (no nav links)
- Bottom tray appears with Home, Characters, Matches tabs
- Bottom tray is hidden on md+ breakpoint

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete frontend rewrite — component architecture, mobile layout, skeleton theme"
```
