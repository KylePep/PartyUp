import { useNavigate } from 'react-router-dom'
import { FullArtTcgCard } from './FullArtTcgCard'

interface CharacterMiniCardProps {
  character: { name: string; imageUrl?: string; imageFocalX?: number; imageFocalY?: number }
  characterId?: string
  platform?: React.ReactNode
}

export function CharacterMiniCard({ character, characterId, platform }: CharacterMiniCardProps) {
  const navigate = useNavigate()

  return (
    <FullArtTcgCard
      name={character.name}
      imageUrl={character.imageUrl}
      imageFocalX={character.imageFocalX}
      imageFocalY={character.imageFocalY}
      platform={platform}
      className="h-full md:h-40 shrink-0 text-xxs md:text-xs"
      style={{ aspectRatio: '3/2' }}
      location='bar'
      onClick={characterId ? () => navigate(`/characters?id=${characterId}`) : undefined}
    />
  )
}
