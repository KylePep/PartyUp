interface SpinnerProps {
  label?: string
  size?: 'sm' | 'md'
}

export function Spinner({ label, size = 'md' }: SpinnerProps) {
  const dim = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-2'
  return (
    <div className="flex items-center gap-2">
      <div className={`${dim} border-border border-t-accent rounded-full animate-spin`} />
      {label && <span className="text-xs font-mono text-muted uppercase tracking-widest">{label}</span>}
    </div>
  )
}
