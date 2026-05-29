import type { DiscoverCharacter } from '../../api/endpoints/characters'

interface PendingLikeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
}

export function PendingLikeCard({ character, onLike, onDislike }: PendingLikeCardProps) {
  return (
    <div
      className="relative rounded overflow-hidden border border-border shrink-0"
      style={{ width: '80px', aspectRatio: '2/3' }}
    >
      {character.imageUrl ? (
        <img
          src={character.imageUrl}
          alt={character.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-raised flex items-center justify-center">
          <span className="text-xl font-mono text-muted font-bold">
            {character.name[0].toUpperCase()}
          </span>
        </div>
      )}

      {/* Name overlay — top */}
      <div className="absolute top-0 left-0 right-0 px-1.5 pt-1.5 pb-3 bg-gradient-to-b from-black/80 to-transparent">
        <span className="text-[10px] font-mono text-white font-bold leading-tight block truncate">
          {character.name}
        </span>
      </div>

      {/* Action buttons — bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-1 pb-1.5 pt-4 bg-gradient-to-t from-black/80 to-transparent flex justify-around">
        <button
          onClick={onLike}
          className="text-success text-sm leading-none hover:scale-125 transition-transform"
          aria-label={`Like ${character.name}`}
        >
          ♥
        </button>
        <button
          onClick={onDislike}
          className="text-danger text-sm leading-none hover:scale-125 transition-transform"
          aria-label={`Pass on ${character.name}`}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
