import type { Character } from '../../api/endpoints/characters'

interface CharacterMiniCardProps {
  character: Character
}

export function CharacterMiniCard({ character }: CharacterMiniCardProps) {
  return (
    <div
      className="relative w-36 rounded overflow-hidden border border-white/20 shrink-0"
      style={{ aspectRatio: '2/3' }}
    >
      {character.imageUrl ? (
        <img
          src={character.imageUrl}
          alt={character.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span className="text-3xl font-mono text-white font-bold">
            {character.name[0].toUpperCase()}
          </span>
        </div>
      )}

      {/* Name overlay — top left, inside the card */}
      <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/80 to-transparent">
        <span className="text-xs font-mono text-white font-bold leading-tight block">
          {character.name}
        </span>
      </div>
    </div>
  )
}
