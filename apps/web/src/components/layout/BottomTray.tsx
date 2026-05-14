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
