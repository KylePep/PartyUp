import { useEffect, useState } from 'react'
import type { UserGameDetail } from '../api/endpoints/userGames'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { Gallery } from './Gallery'
import { MatchCard } from './cards/MatchCard'
import { PaginationControls } from './ui'
import { BinderHeader } from './layout/BinderHeader'

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
}

const PAGE_SIZE = 12

export function RealmRightPage({ gameId }: RealmRightPageProps) {
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    setPage(1)
  }, [gameId])

  useEffect(() => {
    setStatus('loading')
    getMatches(page, PAGE_SIZE, gameId)
      .then(result => {
        setMatches(result.items)
        setTotalCount(result.totalCount)
        setStatus(result.totalCount === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId, page])

  return (
    <div className='flex flex-col h-full overflow-x-hidden'>
      <BinderHeader title='Matches' className='flex items-center justify-between'>
        {totalCount > 0 && (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        )}
      </BinderHeader>
      <Gallery
        key={page}
        items={matches}
        status={status}
        getKey={m => m.matchId}
        emptyMessage="No matches yet — keep swiping!"
        errorMessage="Could not load matches"
        stickyRows={true}
        renderItem={m => (
          <div className="relative h-fit md:h-full">
            <MatchCard
              matchId={m.matchId}
              character={m.theirCharacter}
              gameName={m.gameName}
              matchedAt={m.matchedAt}
              isNew={m.isNew}
              className=""
            />
          </div>
        )}
      />
    </div>
  )
}
