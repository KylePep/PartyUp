import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'
import { LandCard } from './LandCard'

interface RealmCardProps {
  userGame: UserGame
}

export function RealmCard({ userGame }: RealmCardProps) {
  return (
    <Link
      to={`/realm/${userGame.gameId}`}
      className="block text-center text-xs font-mono uppercase tracking-widest text-muted hover:border-accent hover:text-accent transition-colors rounded w-3/4 md:w-full"
      onClick={e => e.stopPropagation()}
    >
      <LandCard
        name={userGame.gameName}
        imageUrl={userGame.gameImageUrl ?? undefined}
        className="hover:brightness-110 transition-all"
      />
    </Link>
  )
}
