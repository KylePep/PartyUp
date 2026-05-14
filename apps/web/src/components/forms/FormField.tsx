import { type ReactNode, useId } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  children: (id: string) => ReactNode
}

export function FormField({ label, error, children }: FormFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-mono text-muted uppercase tracking-widest">
        {label}
      </label>
      {children(id)}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
