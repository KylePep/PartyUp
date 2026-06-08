import { useNavigate } from 'react-router-dom'
import { FullArtTcgCard } from './FullArtTcgCard'

interface CharacterMiniCardProps {
  character: { name: string; imageUrl?: string }
  characterId?: string
  platform?: React.ReactNode
}

export function CharacterMiniCard({ character, characterId, platform }: CharacterMiniCardProps) {
  const navigate = useNavigate()

  return (
    <FullArtTcgCard
      name={character.name}
      imageUrl={character.imageUrl}
      platform={platform}
      className="w-20 md:w-40 shrink-0"
      style={{ aspectRatio: '2/3' }}
      onClick={characterId ? () => navigate(`/characters?id=${characterId}`) : undefined}
    />
  )
}
