import { FullArtTcgCard } from './FullArtTcgCard'

interface GameMiniCardProps {
  game: { name: string; imageUrl?: string | null }
}

export function GameMiniCard({ game }: GameMiniCardProps) {
  return (
    <FullArtTcgCard
      name={game.name}
      imageUrl={game.imageUrl ?? undefined}
      className="w-40 shrink-0"
      style={{ aspectRatio: '2/3' }}
    />
  )
}
