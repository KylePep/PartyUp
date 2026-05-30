import { FullArtTcgCard } from './FullArtTcgCard'

interface CharacterMiniCardProps {
  character: { name: string; imageUrl?: string }
}

export function CharacterMiniCard({ character }: CharacterMiniCardProps) {
  return (
    <FullArtTcgCard
      name={character.name}
      imageUrl={character.imageUrl}
      className="w-40 shrink-0"
      style={{ aspectRatio: '2/3' }}
    />
  )
}
