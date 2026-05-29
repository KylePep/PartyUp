import type { Character } from '../../api/endpoints/characters'

interface CharacterMiniCardProps {
  character: Character
}

export function CharacterMiniCard({ character }: CharacterMiniCardProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-2 w-full">
      {character.imageUrl ? (
        <img
          src={character.imageUrl}
          alt={character.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-black/20 border-2 border-white/20 flex items-center justify-center">
          <span className="text-sm font-mono text-white font-bold">
            {character.name[0].toUpperCase()}
          </span>
        </div>
      )}
      <span className="text-xs font-mono text-white text-center leading-tight break-all px-1">
        {character.name}
      </span>
    </div>
  )
}
