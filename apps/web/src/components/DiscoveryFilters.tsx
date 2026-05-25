import { type GameFieldDefinition } from '../api/endpoints/games'

interface DiscoveryFiltersProps {
  fields: GameFieldDefinition[]
  activeFilters: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function DiscoveryFilters({ fields, activeFilters, onChange }: DiscoveryFiltersProps) {
  const filterableFields = fields.filter(f => f.isFilterable && f.type === 'Select')

  if (filterableFields.length === 0) return null

  return (
    <div className="flex flex-col gap-3 mb-4">
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
