interface StandardTcgCardProps {
  name: string
  platform?: string
  subtitle?: string
  imageUrl?: string
  statsLine?: React.ReactNode
  textBody?: React.ReactNode
  bottomStat?: string
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function StandardTcgCard({
  name,
  platform,
  subtitle,
  imageUrl,
  statsLine,
  textBody,
  bottomStat,
  className,
  onClick,
  children,
}: StandardTcgCardProps) {
  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col${onClick ? ' cursor-pointer hover:brightness-110 transition-all' : ''}${className ? ' ' + className : ''}`}
      style={{ border: '4px solid black', backgroundColor: 'var(--color-surface)' }}
      onClick={onClick}
    >
      {/* Header: name (left) + platform (right) */}
      <div
        className="h-[52px] flex items-center justify-between px-3 flex-shrink-0"
        style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="font-display font-semibold text-text text-sm truncate">{name}</span>
        {platform && (
          <span className="text-xs font-mono text-muted ml-2 flex-shrink-0 truncate max-w-[45%]">{platform}</span>
        )}
      </div>

      {/* Subtitle: region · language */}
      {subtitle && (
        <div className="px-3 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <span className="text-xs text-muted italic">{subtitle}</span>
        </div>
      )}

      {/* Image */}
      <div className="h-[220px] flex-shrink-0 overflow-hidden" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Stats line: badges, key attributes */}
      {statsLine && (
        <div
          className="px-3 py-2 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
        >
          {statsLine}
        </div>
      )}

      {/* Text body: bio (flex-1 so it fills remaining space) */}
      {textBody && (
        <div className="px-3 py-2 flex-1 overflow-hidden">
          {textBody}
        </div>
      )}

      {/* Bottom stat: rank/level — right-aligned */}
      {bottomStat && (
        <div
          className="px-3 py-1.5 flex justify-end flex-shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
        >
          <span className="font-mono text-xs text-muted">{bottomStat}</span>
        </div>
      )}

      {/* Children: action buttons, extra content */}
      {children && (
        <div className="px-3 pb-2 pt-1 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
