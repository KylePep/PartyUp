import { useNavigate } from 'react-router-dom'
import { FullArtTcgCard } from './FullArtTcgCard'

interface CharacterMiniCardProps {
  character: { name: string; imageUrl?: string }
  characterId?: string
}

export function CharacterMiniCard({ character, characterId }: CharacterMiniCardProps) {
  const navigate = useNavigate()

  return (
    <FullArtTcgCard
      name={character.name}
      imageUrl={character.imageUrl}
      className="w-40 shrink-0"
      style={{ aspectRatio: '2/3' }}
      onClick={characterId ? () => navigate(`/characters?id=${characterId}`) : undefined}
    />
  )
}
