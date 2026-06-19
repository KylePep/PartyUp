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
      className={`
        pointer-events-none 
        z-40 
        w-full 
        md:w-50
        h-10
        md:h-16 
        md:h-screen 
        md:ms-12
        absolute 
        bottom-0
        md:top-0
        flex 
        flex-row
        md:flex-col 
        justify-between
        gap-y-4 
        px-2
        md:px-5
        md:pe-6  
        md:pt-10
        md:pb-9
        ${variant === 'landing'
          ? ''
          : ''
        }`}
    >
      <Link to="/home" className="pointer-events-auto font-display font-bold text-off-black text-lg tracking-wide">
        <div className='hidden md:flex flex-row gap-3 font-black text-off-black px-3 py-1 rounded-md border-2 border-orange-950 shadow'
          style={{
            background: 'linear-gradient(175deg, #e8b830 0%, #f5d060 18%, #c89018 38%, #eabc2c 55%, #b07808 72%, #d4a020 88%, #a06808 100%)',
          }}>
          <img
            className='w-7 h-7 border-1 bg-slate-900 border-slate-900 rounded-full'
            src="/favicon.png" alt="" />
          PartyUp
        </div>
        <img
          className='w-7 h-7 block md:hidden border-1 bg-slate-900 border-slate-900 rounded-full'
          src="/favicon.png" alt="" />
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
            <div className="absolute left-0 top-0 md:top-auto -translate-y-full md:translate-y-0 -translate-x-full md:translate-x-0 mt-2 md:right-auto md:left-0 md:bottom-full md:top-auto md:mt-0 md:mb-2 w-44 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
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
