import { type InputHTMLAttributes, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-mono text-muted uppercase tracking-widest">
        {label}
      </label>
      <input
        id={id}
        className={`bg-surface border ${error ? 'border-danger' : 'border-border'} rounded px-3 py-2
          text-sm text-text placeholder:text-muted
          focus:outline-none focus:border-accent transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
