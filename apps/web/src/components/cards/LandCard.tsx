interface LandCardProps {
  name: string
  imageUrl?: string
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function LandCard({ name, imageUrl, className, onClick, children }: LandCardProps) {
  return (
    <div
      className={`h-full rounded-xl overflow-hidden flex flex-col p-2 gap-2 ${onClick ? ' cursor-pointer' : ''}${className ? ' ' + className : ''}`}
      style={{ border: '8px solid black', backgroundColor: 'var(--color-surface)' }}
      onClick={onClick}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex-shrink-0"
        style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="font-display font-semibold text-text text-sm truncate block">{name}</span>
      </div>

      {/* Image */}
      <div className="aspect-video w-full overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
            <span className="text-muted text-xs font-mono uppercase">No image</span>
          </div>
        )}
      </div>
      {/* Footer: children (Enter button etc.) + player count */}
      {(children != null) && (
        <div
          className=" py-2 flex flex-col gap-2 flex-1 min-h-0 justify-between"
        >
          {children}

        </div>
      )}
    </div>
  )
}
