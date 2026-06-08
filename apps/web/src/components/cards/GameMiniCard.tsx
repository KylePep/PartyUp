import { useNavigate } from 'react-router-dom'
import { FullArtTcgCard } from './FullArtTcgCard'

interface GameMiniCardProps {
  game: { name: string; imageUrl?: string | null }
  gameId?: string
  userGameId?: string
  platform?: React.ReactNode
}

export function GameMiniCard({ game, gameId, userGameId, platform }: GameMiniCardProps) {
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
      className="w-20 md:w-40 shrink-0"
      style={{ aspectRatio: '2/3' }}
      onClick={handleClick}
      platform={platform}
    />
  )
}
