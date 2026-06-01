import { useState } from 'react'
import { type GameFieldDefinition } from '../api/endpoints/games'
import { ALL_PLATFORMS } from './character-wizard/types'

interface DiscoveryFiltersProps {
  fields: GameFieldDefinition[]
  activeFilters: Record<string, string>
  onChange: (key: string, value: string) => void
  gamePlatforms: string[]
  activePlatforms: string[]
  onPlatformChange: (platforms: string[]) => void
}

export function DiscoveryFilters({
  fields,
  activeFilters,
  onChange,
  gamePlatforms,
  activePlatforms,
  onPlatformChange,
}: DiscoveryFiltersProps) {
  const [showAllPlatforms, setShowAllPlatforms] = useState(false)
  const filterableFields = fields.filter(f => f.isFilterable && f.type === 'Select')

  function togglePlatform(p: string) {
    if (activePlatforms.includes(p)) {
      onPlatformChange(activePlatforms.filter(x => x !== p))
    } else {
      onPlatformChange([...activePlatforms, p])
    }
  }

  // Platforms active but not in the game's RAWG list — show as extra badges in the primary row
  const overridePlatforms = activePlatforms.filter(p => !gamePlatforms.includes(p))

  // Expanded section: exclude platforms already shown in the primary row
  const primarySet = new Set(gamePlatforms)
  const expandedGroups = ALL_PLATFORMS.map(group => ({
    ...group,
    platforms: group.platforms.filter(p => !primarySet.has(p)),
  })).filter(g => g.platforms.length > 0)

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Platform filter */}
      {gamePlatforms.length > 0 && (
        <div>
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Platform</p>
          <div className="flex flex-wrap gap-2">
            {gamePlatforms.map(p => {
              const isActive = activePlatforms.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                    isActive
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            {overridePlatforms.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className="px-3 py-1.5 rounded text-xs font-mono border bg-accent text-white border-accent transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setShowAllPlatforms(s => !s)}
              className="text-xs font-mono text-muted hover:text-accent transition-colors"
            >
              {showAllPlatforms ? '− Show less' : '+ More platforms'}
            </button>
            {showAllPlatforms && (
              <div
                className="absolute top-full left-0 z-50 mt-1 flex flex-col gap-4 rounded p-3 shadow-xl"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  minWidth: '280px',
                }}
              >
                {expandedGroups.map(group => (
                  <div key={group.group}>
                    <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">
                      {group.group}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.platforms.map(p => {
                        const isActive = activePlatforms.includes(p)
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePlatform(p)}
                            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                              isActive
                                ? 'bg-accent text-white border-accent'
                                : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI field filters */}
      {filterableFields.map(field => (
        <div key={field.key}>
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">
            {field.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {field.options.map(opt => {
              const isActive = activeFilters[field.key] === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(field.key, isActive ? '' : opt)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                    isActive
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
