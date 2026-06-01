import type { DiscoverCharacter } from '../../api/endpoints/characters'
import { FullArtTcgCard } from './FullArtTcgCard'

interface PendingLikeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
}

export function PendingLikeCard({ character, onLike, onDislike }: PendingLikeCardProps) {
  return (
    <FullArtTcgCard
      name={character.name}
      imageUrl={character.imageUrl}
      style={{ width: '80px', aspectRatio: '2/3' }}
      className="shrink-0"
    >
      <div className="flex justify-around">
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
    </FullArtTcgCard>
  )
}
