interface LandCardProps {
  name: string
  imageUrl?: string
  playerCount?: number
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function LandCard({ name, imageUrl, playerCount, className, onClick, children }: LandCardProps) {
  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col${onClick ? ' cursor-pointer' : ''}${className ? ' ' + className : ''}`}
      style={{ border: '4px solid black', backgroundColor: 'var(--color-surface)' }}
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
      {children || playerCount !== undefined && (

        <div
          className="px-3 py-2 flex flex-col gap-2 flex-1"
          style={{ backgroundColor: 'var(--color-surface-raised)', borderTop: '1px solid var(--color-border)' }}
        >
          {children}
          {playerCount !== undefined && (
            <p className="text-xs font-mono text-muted text-right">
              {playerCount > 0 ? `${playerCount} players` : 'Be the first!'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
