import type { Character } from '../../api/endpoints/characters'
import { FullArtTcgCard } from './FullArtTcgCard'

interface CharacterMiniCardProps {
  character: Character
}

export function CharacterMiniCard({ character }: CharacterMiniCardProps) {
  return (
    <FullArtTcgCard
      name={character.name}
      imageUrl={character.imageUrl}
      className="w-36 shrink-0"
      style={{ aspectRatio: '2/3' }}
    />
  )
}
