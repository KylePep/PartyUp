interface FullArtTcgCardProps {
  name: string
  platform?: React.ReactNode
  imageUrl?: string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  onClick?: () => void
}

export function FullArtTcgCard({ name, platform, imageUrl, className, style, children, onClick }: FullArtTcgCardProps) {
  return (
    <div
      className={`relative overflow-hidden border-4 border-black rounded-xl shadow  ${onClick ? ' cursor-pointer' : ''}${className ? ' ' + className : ''}`}
      style={style}
      onClick={onClick}
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
      <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-black to-transparent px-1 py-2 pe-4 md:pe-16">
        <div className="flex items-center justify-between">
          <span className="font-display text-white text-xs md:text-sm font-bold truncate pointer-event-none"
            style={{ writingMode: 'vertical-lr' }}
          >{name}</span>
        </div>
      </div>
      {platform && (
        <div className="absolute top-1 right-1 bg-black p-1 rounded-full">
          {platform}
        </div>
      )}

      {/* Bottom overlay for children */}
      {children && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
          {children}
        </div>
      )}
    </div>
  )
}
