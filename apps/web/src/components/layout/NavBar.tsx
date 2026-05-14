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
      className={`z-40 w-full flex items-center justify-between px-6 h-14 ${variant === 'landing'
          ? 'absolute top-0 left-0 bg-transparent'
          : 'sticky top-0 bg-surface/80 backdrop-blur-sm border-b border-border'
        }`}
    >
      <Link to="/home" className="font-display font-bold text-text text-lg tracking-wide">
        PartyUp
      </Link>

      {variant === 'app' && (
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-xs font-mono uppercase tracking-widest transition-colors ${isActive ? 'text-accent' : 'text-muted hover:text-text'
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
