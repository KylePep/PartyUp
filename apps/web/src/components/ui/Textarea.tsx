import { type TextareaHTMLAttributes, useId } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function Textarea({ label, error, maxLength, className = '', value = '', ...props }: TextareaProps) {
  const id = useId()
  const charCount = typeof value === 'string' ? value.length : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs font-mono text-muted uppercase tracking-widest">
          {label}
        </label>
        {maxLength && (
          <span className="text-xs font-mono text-muted">{charCount}/{maxLength}</span>
        )}
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        className={`bg-surface border ${error ? 'border-danger' : 'border-border'} rounded px-3 py-2
          text-sm text-text placeholder:text-muted resize-none
          focus:outline-none focus:border-accent transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
