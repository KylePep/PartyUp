import type { DiscoverCharacter } from '../../api/endpoints/characters'
import { FullArtTcgCard } from './FullArtTcgCard'

interface PendingLikeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
}

export function PendingLikeCard({ character, onLike, onDislike }: PendingLikeCardProps) {
  return (
    <div className='flex flex-col gap-y-2'>
      <button
        onClick={onDislike}
        className="text-danger text-sm font-bold leading-none hover:scale-125 transition-transform border-2 border-danger rounded-lg py-1 w-full"
        aria-label={`Pass on ${character.name}`}
      >
        ✕
      </button>
      <FullArtTcgCard
        name={character.name}
        imageUrl={character.imageUrl}
        style={{ width: '80px', aspectRatio: '2/3' }}
        className="shrink-0"
      >
      </FullArtTcgCard>
      <div className="flex justify-around gap-2">
        <button
          onClick={onLike}
          className="text-success text-sm leading-none hover:scale-125 transition-transform border-2 border-success rounded-lg py-1 w-full"
          aria-label={`Like ${character.name}`}
        >
          ♥
        </button>
      </div>
    </div>
  )
}
