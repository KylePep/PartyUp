import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'
import { FullArtTcgCard } from './FullArtTcgCard'
import { PlanetIcon } from '@phosphor-icons/react'

interface RealmCardProps {
  userGame: UserGame
}

export function RealmCard({ userGame }: RealmCardProps) {
  const hasNewMatches = userGame.newMatchCount > 0

  return (
    <Link
      to={`/realm/${userGame.gameId}`}
      className="block text-center text-xs font-mono uppercase tracking-widest text-muted hover:border-accent hover:text-accent transition-colors rounded md:w-full md:max-w-1/4 relative"
      onClick={e => e.stopPropagation()}
    >
      <FullArtTcgCard
        name={userGame.gameName}
        className='h-full aspect-3/4 md:aspect-auto mx-auto text-xxs'
        imageUrl={userGame.gameImageUrl ?? undefined}
        platform={
          hasNewMatches ? (
            <span className="relative flex">
              <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
              <PlanetIcon className="relative text-success" />
            </span>
          ) : (
            <PlanetIcon />
          )
        }
      />
    </Link>
  )
}
