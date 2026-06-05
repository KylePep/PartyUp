import { useEffect, useState } from 'react'
import type { UserGameDetail } from '../api/endpoints/userGames'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { Gallery } from './Gallery'
import { MatchCard } from './cards/MatchCard'

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
}

export function RealmRightPage({ gameId }: RealmRightPageProps) {
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

  useEffect(() => {
    getMatches(gameId)
      .then(m => {
        setMatches(m)
        setStatus(m.length ? 'ready' : 'empty')
      })
      .catch(() => setStatus('error'))
  }, [gameId])

  return (
    <div className='flex flex-col h-full overflow-x-hidden'>
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50'>
        <h2 className="text-xs font-mono uppercase tracking-widest">Matches</h2>
      </div>
      <Gallery
        items={matches.slice(0, 6)}
        status={status}
        getKey={m => m.matchId}
        emptyMessage="No matches yet — keep swiping!"
        errorMessage="Could not load matches"
        renderItem={m => (
          <div className="flex flex-col flex-1">
            <MatchCard
              matchId={m.matchId}
              character={m.theirCharacter}
              gameName={m.gameName}
              matchedAt={m.matchedAt}
              isNew={m.isNew}
            />
          </div>
        )}
      />
    </div>
  )
}
