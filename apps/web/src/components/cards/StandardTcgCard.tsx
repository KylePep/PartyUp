import { PlatformIcon } from '../ui'

interface StandardTcgCardProps {
  name: string
  platform?: string
  subtitle?: string
  imageUrl?: string
  statsLine?: React.ReactNode
  textBody?: React.ReactNode
  bottomStat?: React.ReactNode
  className?: string
  onClick?: () => void
  cardBackgroundColor?: string
  children?: React.ReactNode
  isNew?: boolean
  stickerEmoji?: string
  stickerSeed?: string
}

function stableRotation(seed: string): number {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  }
  return (h % 29) - 14
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
  cardBackgroundColor,
  children,
  isNew,
  stickerEmoji,
  stickerSeed = '',
}: StandardTcgCardProps) {
  return (
    <div
      className={`aspect-3/4 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0 p-1 md:p-2 gap-0.5 md:gap-1 ${onClick ? ' cursor-pointer hover:brightness-110 transition-all' : ''}${className ? ' ' + className : ''}`}
      style={{ border: '8px solid black', backgroundColor: cardBackgroundColor || 'var(--color-surface)' }}
      onClick={onClick}
    >
      <div>
        {/* Header: name (left) + platform (right) */}
        <div
          className="flex items-center justify-between px-1.5 py-1 flex-shrink-0 rounded-sm"
          style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
        >
          <span className="font-display font-semibold text-text text-xxs md:text-xs truncate">{name}</span>
          <span className="w-4 md:w-6 h-4 md:h-6 [&_svg]:w-6 [&_svg]:h-6 md:[&_svg]:w-[22px] md:[&_svg]:h-[22px]">
            {platform && (
              isNew ? (
                <span className="relative flex w-full h-full">
                  <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
                  <span className="relative w-full h-full">
                    <PlatformIcon platform={platform} />
                  </span>
                </span>
              ) : (
                <PlatformIcon platform={platform} />
              )
            )}
          </span>
        </div>

        {/* Subtitle: region · language */}
        {subtitle && (
          <div className="px-1 flex-shrink-0 flex justify-between">
            <span className="text-xxs md:text-xs text-muted italic">{subtitle}  </span>
          </div>
        )}
      </div>


      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden rounded-sm border-off-black border-2 bg-off-black">
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
        {stickerEmoji && (
          <span
            className="absolute top-1 left-1 text-2xl leading-none pointer-events-none select-none drop-shadow-md"
            style={{ transform: `rotate(${stableRotation(stickerSeed || stickerEmoji)}deg)` }}
          >
            {stickerEmoji}
          </span>
        )}
      </div>

      {/* Stats line: badges, key attributes */}
      {statsLine && (
        <div
          className="px-2 flex-shrink-0 truncate rounded-sm text-xxs md:text-xs"
          style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
        >
          {statsLine}
        </div>
      )}

      {/* Text body: bio (flex-1 so it fills remaining space) */}
      {textBody && (
        <div className="p-1 md:p-2 flex flex-col flex-1 overflow-y-auto overflow-x-hidden rounded-sm text-xxs md:text-xs"
          style={{ backgroundColor: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
        >
          {textBody}
        </div>
      )}

      {/* Bottom stat: rank/level — right-aligned */}
      {bottomStat && (
        <div
          className="px-2 py-1 rounded-sm"
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
