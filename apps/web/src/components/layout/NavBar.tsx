import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import { Avatar } from '../ui'

type Variant = 'landing' | 'app'

interface NavBarProps {
  variant: Variant
  onSignIn?: () => void
  onSignUp?: () => void
}

export function NavBar({ variant }: NavBarProps) {
  const { state, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const closeDropdown = useCallback(() => setDropdownOpen(false), [])
  useClickOutside(dropdownRef, closeDropdown)

  const username = state.status === 'authenticated' ? state.user.email : ''

  return (
    <nav
      className={`pointer-events-none z-40 w-full h-16 absolute flex md:w-52 md:h-screen md:flex-col justify-between pe-11 md:pe-6  ps-8 md:ps-8 pt-6 md:py-8 top-0
 ${variant === 'landing'
          ? ''
          : ''
        }`}
    >
      <Link to="/home" className="pointer-events-auto font-display font-bold text-text text-lg tracking-wide">
        PartyUp
      </Link>

      {variant === 'app' && username && (
        <div className="pointer-events-auto relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            <Avatar fallback={username} size="sm" />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 md:right-auto md:left-0 md:bottom-full md:top-auto md:mt-0 md:mb-2 w-44 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
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
