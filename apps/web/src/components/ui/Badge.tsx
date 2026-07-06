import { type ReactNode } from 'react'

type Variant = 'default' | 'role' | 'rank' | 'region' | 'success' | 'danger'

const variantClasses: Record<Variant, string> = {
  default: 'bg-surface-raised text-muted border-border',
  role: 'bg-accent/10 text-accent border-accent/30',
  rank: 'bg-amber-900/20 text-amber-400 border-amber-700/30',
  region: 'bg-purple-900/20 text-purple-400 border-purple-700/30',
  success: 'bg-success/10 text-success border-success/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
}

interface BadgeProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border text-nowrap ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
