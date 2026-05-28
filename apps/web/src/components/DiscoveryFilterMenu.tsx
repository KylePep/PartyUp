import { useState, useRef, useEffect } from 'react'
import { DiscoveryFilters } from './DiscoveryFilters'
import { Modal } from './ui'
import type { GameFieldDefinition } from '../api/endpoints/games'

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

  const hasFilterableFields = fields.some(f => f.isFilterable && f.type === 'Select')
  const showMenu = hasFilterableFields || gamePlatforms.length > 0
  const activeCount = Object.keys(filters).length + (activePlatforms.length > 0 ? 1 : 0)

  // Close desktop dropdown on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  if (!showMenu) return null

  const triggerButton = (
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
        activeCount > 0
          ? 'border-accent text-accent bg-accent/10'
          : 'border-border text-muted hover:border-accent hover:text-text'
      }`}
    >
      {activeCount > 0 ? `Filters · ${activeCount}` : 'Filters'}
    </button>
  )

  const filterContent = (
    <DiscoveryFilters
      fields={fields}
      activeFilters={filters}
      onChange={onChange}
      gamePlatforms={gamePlatforms}
      activePlatforms={activePlatforms}
      onPlatformChange={onPlatformChange}
    />
  )

  return (
    <div className={className}>
      {/* Desktop: dropdown */}
      <div className="hidden lg:block relative" ref={dropdownRef}>
        {triggerButton}
        {open && (
          <div
            className="absolute top-full left-0 mt-1 z-50 rounded-lg p-4 shadow-xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              minWidth: '280px',
            }}
          >
            {filterContent}
          </div>
        )}
      </div>

      {/* Mobile: modal */}
      <div className="lg:hidden">
        {triggerButton}
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Filters">
          <div className="p-4">{filterContent}</div>
        </Modal>
      </div>
    </div>
  )
}
