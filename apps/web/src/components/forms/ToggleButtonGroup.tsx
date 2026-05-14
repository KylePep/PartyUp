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
