type Size = 'sm' | 'md' | 'lg'

const sizeClasses: Record<Size, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

interface AvatarProps {
  src?: string
  fallback: string
  size?: Size
  className?: string
}

export function Avatar({ src, fallback, size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={fallback}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    )
  }
  return (
    <div
      className={`rounded-full bg-accent-dim flex items-center justify-center font-mono font-bold text-text uppercase shadow-xl ${sizeClasses[size]} ${className}`}
      aria-label={fallback}
    >
      {fallback.charAt(0)}
    </div>
  )
}
