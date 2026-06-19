interface LandCardProps {
  name: string
  icon?: React.ReactNode
  imageUrl?: string
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function LandCard({ name, imageUrl, icon, className, onClick, children }: LandCardProps) {
  return (
    <div
      className={`h-full md:aspect-3/4 rounded-xl overflow-hidden flex flex-col p-2 gap-2 ${onClick ? ' cursor-pointer' : ''}${className ? ' ' + className : ''}`}
      style={{ border: '8px solid black', backgroundColor: 'var(--color-surface)' }}
      onClick={onClick}
    >
      {/* Header */}
      <div
        className="relative px-3 py-2 flex-shrink-0 rounded-sm"
        style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="font-display font-semibold text-text text-xs md:text-sm truncate block">{name}</span>
        {icon && (
          <div className="absolute top-1 right-1 bg-black p-1 rounded-full">
            {icon}
          </div>
        )}
      </div>

      {/* Image */}
      <div className="aspect-video w-full overflow-hidden flex-shrink-0 rounded-sm border-off-black border-2" >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover bg-center" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
            <span className="text-muted text-xs font-mono uppercase">No image</span>
          </div>
        )}
      </div>
      {/* Footer: children (Enter button etc.) + player count */}
      {(children != null) && (
        <div
          className="flex flex-col gap-2 flex-1 min-h-0 justify-between"
        >
          {children}

        </div>
      )}
    </div>
  )
}
