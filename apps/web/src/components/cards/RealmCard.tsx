import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'
import { FullArtTcgCard } from './FullArtTcgCard'
import { NewMatchBadge } from '../ui/NewMatchBadge'
import { PlanetIcon } from '@phosphor-icons/react'

interface RealmCardProps {
  userGame: UserGame
}

export function RealmCard({ userGame }: RealmCardProps) {
  return (
    <Link
      to={`/realm/${userGame.gameId}`}
      className="block text-center text-xs font-mono uppercase tracking-widest text-muted hover:border-accent hover:text-accent transition-colors rounded md:w-full relative"
      onClick={e => e.stopPropagation()}
    >
      <NewMatchBadge count={userGame.newMatchCount} />
      <FullArtTcgCard
        name={userGame.gameName}
        className='h-full aspect-3/4 md:aspect-auto mx-auto'
        platform={<PlanetIcon />}
        imageUrl={userGame.gameImageUrl ?? undefined}
      />
    </Link>
  )
}
