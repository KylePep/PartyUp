interface FullArtTcgCardProps {
  name?: string
  platform?: React.ReactNode
  imageUrl?: string
  imageFocalX?: number
  imageFocalY?: number
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  location?: string
  onClick?: () => void
}

export function FullArtTcgCard({ name, platform, imageUrl, imageFocalX = 50, imageFocalY = 50, className, style, location, children, onClick }: FullArtTcgCardProps) {
  return (
    <div
      className={`relative overflow-hidden border-4 border-black rounded-xl shadow ${className} ${onClick ? ' cursor-pointer' : ''}`}
      style={style}
      onClick={onClick}
    >

      {/* Top header overlay */}
      {name && (
        <div className={`absolute top-0 left-0 bottom-0 bg-surface/90 border-1 border-off-black px-1 py-2 z-10 rounded m-1 overflow-hidden ${location == 'bar' ? 'hidden md:block' : 'block'}`}>
          <span className="font-display text-white font-bold truncate pointer-event-none"
            style={{ writingMode: 'vertical-lr' }}
          >{name}</span>
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-surface from-30% to-transparent"></div>
        </div>
      )}

      {/* Background image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: `${imageFocalX}% ${imageFocalY}%` }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
          <span className="font-mono text-muted font-bold text-4xl">{name ? name.charAt(0).toUpperCase() : ''}</span>
        </div>
      )}


      {platform && (
        <div className="absolute top-1 right-1 bg-black p-1 rounded-full">
          {platform}
        </div>
      )}

      {/* Bottom overlay for children */}
      {children && (
        <div className="absolute bottom-0 left-0 right-0 md:px-3 m:pb-3 md:pt-8 text-center md:text-start bg-black h-full md:h-auto p-2">
          {children}
        </div>
      )}
    </div>
  )
}
