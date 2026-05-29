import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'
import { LandCard } from './LandCard'

interface RealmCardProps {
  userGame: UserGame
}

export function RealmCard({ userGame }: RealmCardProps) {
  return (
    <LandCard
      name={userGame.gameName}
      imageUrl={userGame.gameImageUrl}
      className="hover:brightness-110 transition-all"
    >
      <Link
        to={`/realm/${userGame.gameId}`}
        className="block text-center text-xs font-mono uppercase tracking-widest py-2 border border-border text-muted hover:border-accent hover:text-accent transition-colors rounded"
        onClick={e => e.stopPropagation()}
      >
        Enter
      </Link>
    </LandCard>
  )
}
