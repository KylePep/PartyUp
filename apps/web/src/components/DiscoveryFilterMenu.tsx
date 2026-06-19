import { useState, useRef, useCallback } from 'react'
import { DiscoveryFilters } from './DiscoveryFilters'
import { useClickOutside } from '../hooks/useClickOutside'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { GameFieldDefinition } from '../api/endpoints/games'
import { Button } from './ui'

interface DiscoveryFilterMenuProps {
  fields: GameFieldDefinition[]
  gamePlatforms: string[]
  filters: Record<string, string>
  activePlatforms: string[]
  onChange: (key: string, value: string) => void
  onPlatformChange: (platforms: string[]) => void
  className?: string
}

export function DiscoveryFilterMenu({
  fields,
  gamePlatforms,
  filters,
  activePlatforms,
  onChange,
  onPlatformChange,
  className = '',
}: DiscoveryFilterMenuProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setOpen(false), [])
  useClickOutside(dropdownRef, closeMenu, open)
  useEscapeKey(closeMenu, open)

  const hasFilterableFields = fields.some(f => f.isFilterable && f.type === 'Select')
  const showMenu = hasFilterableFields || gamePlatforms.length > 0
  const activeCount = Object.keys(filters).length + (activePlatforms.length > 0 ? 1 : 0)

  if (!showMenu) return null

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        onClick={() => setOpen(o => !o)}
        size='sm'
      >
        {activeCount > 0 ? `Filters · ${activeCount}` : 'Filters'}
      </Button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-lg p-4 shadow-xl"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            minWidth: '280px',
          }}
        >
          <DiscoveryFilters
            fields={fields}
            activeFilters={filters}
            onChange={onChange}
            gamePlatforms={gamePlatforms}
            activePlatforms={activePlatforms}
            onPlatformChange={onPlatformChange}
          />
        </div>
      )}
    </div>
  )
}
