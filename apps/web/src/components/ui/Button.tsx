import { type ButtonHTMLAttributes, type CSSProperties } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const variantRingClasses: Record<Variant, string> = {
  primary: 'ring-3 ring-amber-800/50',
  secondary: 'ring-3 ring-stone-600',
  ghost: 'ring-3 ring-white/0',
  danger: 'ring-3 ring-red-600',
  success: 'ring-3 ring-emerald-600',
}

const variantInnerStyles: Record<Variant, CSSProperties> = {
  primary: {},
  secondary: {},
  ghost: {},
  danger: {},
  success: {},
}

const variantTextClasses: Record<Variant, string> = {
  primary: 'text-amber-900',
  secondary: 'text-stone-700',
  ghost: 'text-stone-800',
  danger: 'text-red-900',
  success: 'text-emerald-900',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-1 md:px-3 py-0 text-xs',
  md: 'px-2 md:px-4 py-0 text-sm',
  lg: 'px-4 py-1 text-lg',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className = '', style, children, ...props }: ButtonProps) {
  return (
    <button
      className={`group inline-flex items-center justify-center gap-2 rounded-full border-2 border-black
        transition-all disabled:opacity-50 disabled:cursor-not-allowed px-1.5 py-1.5
        font-bold shadow focus:outline-none ${className}`}
      style={{
        background: 'linear-gradient(175deg, #e8b830 0%, #f5d060 18%, #c89018 38%, #eabc2c 55%, #b07808 72%, #d4a020 88%, #a06808 100%)',
        ...style,
      }}
      {...props}
    >
      <div
        className={`border-1 border-black rounded-full font-orbitron font-black tracking-widest
          outline-1 outline-black outline-offset-3 btn-etched btn-inner-darken transition-[filter] duration-150 uppercase
          w-full
          ${variant === 'ghost' ? 'btn-etched-ghost' : ''}
          ${variantRingClasses[variant]} ${variantTextClasses[variant]} ${sizeClasses[size]}`}
        style={{ ...variantInnerStyles[variant] }}
      >
        {children}
      </div>
    </button>
  )
}
