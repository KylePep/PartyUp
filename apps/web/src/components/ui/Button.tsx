import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-orange-800 border-2 border-orange-600 text-off-white hover:bg-orange-900',
  secondary: 'border border-border text-text hover:border-accent hover:text-accent',
  ghost: 'text-muted hover:text-text',
  danger: 'bg-danger text-off-white hover:opacity-90',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-1 md:px-3 py-0.5 md:py-1.5 text-xs',
  md: 'px-2 md:px-4 py-1 md:py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded font-mono font-medium
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
}
