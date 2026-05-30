import { useNavigate } from 'react-router-dom'
import { FullArtTcgCard } from './FullArtTcgCard'

interface GameMiniCardProps {
  game: { name: string; imageUrl?: string | null }
  gameId?: string
  userGameId?: string
}

export function GameMiniCard({ game, gameId, userGameId }: GameMiniCardProps) {
  const navigate = useNavigate()

  const handleClick = gameId
    ? () => navigate(`/realm/${gameId}`)
    : userGameId
      ? () => navigate(`/games?id=${userGameId}`)
      : undefined

  return (
    <FullArtTcgCard
      name={game.name}
      imageUrl={game.imageUrl ?? undefined}
      className="w-40 shrink-0"
      style={{ aspectRatio: '2/3' }}
      onClick={handleClick}
    />
  )
}
