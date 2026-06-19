import { type ButtonHTMLAttributes, type CSSProperties } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary: 'border-2 border-orange-950 text-off-black font-bold shadow hover:brightness-105 active:brightness-95',
  secondary: 'border-2 border-orange-950/50 text-orange-100 font-medium shadow-sm hover:brightness-110 active:brightness-90',
  ghost: 'border border-orange-200/30 text-orange-200 hover:bg-orange-200/10',
  danger: 'border-2 border-red-950 text-off-white font-bold shadow hover:brightness-110 active:brightness-90',
  success: 'border-2 border-green-950 text-off-white font-bold shadow hover:brightness-110 active:brightness-90',
}

const variantStyles: Record<Variant, CSSProperties> = {
  primary: {
    background: 'linear-gradient(175deg, #e8b830 0%, #f5d060 18%, #c89018 38%, #eabc2c 55%, #b07808 72%, #d4a020 88%, #a06808 100%)',
  },
  secondary: {
    background: 'linear-gradient(175deg, #9a7030 0%, #b08040 18%, #7a5820 38%, #906820 55%, #6a4810 72%, #805820 88%, #5a3808 100%)',
  },
  ghost: {},
  danger: {
    background: 'linear-gradient(175deg, #c82828 0%, #e04040 18%, #a01818 38%, #c02020 55%, #901010 72%, #b01818 88%, #800808 100%)',
  },
  success: {
    background: 'linear-gradient(175deg, #286028 0%, #3a7c3a 18%, #1c501c 38%, #2e6e2e 55%, #144814 72%, #245c24 88%, #0e3e0e 100%)',
  },
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

export function Button({ variant = 'primary', size = 'md', className = '', style, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-mono font-medium
        transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    />
  )
}
