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
