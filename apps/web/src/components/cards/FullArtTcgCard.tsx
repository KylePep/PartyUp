import { PlatformIcon } from '../ui'

interface FullArtTcgCardProps {
  name: string
  platform?: string
  imageUrl?: string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

export function FullArtTcgCard({ name, platform, imageUrl, className, style, children }: FullArtTcgCardProps) {
  return (
    <div
      className={`relative overflow-hidden border-4 border-black rounded-xl${className ? ' ' + className : ''}`}
      style={style}
    >
      {/* Background image */}
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
          <span className="font-mono text-muted font-bold text-4xl">{name.charAt(0).toUpperCase()}</span>
        </div>
      )}

      {/* Top header overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-white text-sm font-bold truncate">{name}</span>
          {platform && <PlatformIcon platform={platform} size={22} />}
        </div>
      </div>

      {/* Bottom overlay for children */}
      {children && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
          {children}
        </div>
      )}
    </div>
  )
}
