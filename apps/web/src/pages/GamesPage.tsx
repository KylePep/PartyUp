import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getUserGames, deleteUserGame, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Button, EmptyState, Spinner } from '../components/ui'
import { LandCard } from '../components/cards/LandCard'
import { NewMatchBadge } from '../components/ui/NewMatchBadge'
import DOMPurify from 'dompurify'

export default function GamesPage() {
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')
  const [games, setGames] = useState<UserGame[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<UserGame | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<UserGameDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')
  const navigate = useNavigate()

  useEffect(() => {
    getUserGames()
      .then(gs => {
        setGames(gs)
        setStatus(gs.length === 0 ? 'empty' : 'ready')
        if (targetId) {
          const match = gs.find(g => g.id === targetId)
          if (match) {
            setSelected(match)
            setActiveSide('left')
            setDetailLoading(true)
            getUserGameByGameId(match.gameId)
              .then(detail => setSelectedDetail(detail))
              .finally(() => setDetailLoading(false))
          }
        }
      })
      .catch(() => setStatus('error'))
  }, [targetId])

  function handleSelect(game: UserGame) {
    setActiveSide('left')
    setSelected(game)
    setSelectedDetail(null)
    setDetailLoading(true)
    getUserGameByGameId(game.gameId)
      .then(detail => setSelectedDetail(detail))
      .finally(() => setDetailLoading(false))
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteUserGame(selected.id)
      setGames(prev => {
        const next = prev.filter(g => g.id !== selected.id)
        if (next.length === 0) setStatus('empty')
        return next
      })
      setSelected(null)
    } finally {
      setDeleting(false)
    }
  }

  const leftContent = selected ? (
    <div className="flex flex-col md:min-h-0">
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50'>
        <h2 className="text-xs font-mono uppercase tracking-widest">Game Card Details</h2>
      </div>
      <div className="overflow-y-auto mx-auto w-full p-2 md:p-4" >
        <LandCard
          name={selected.gameName}
          imageUrl={selected.gameImageUrl ?? undefined}
          className='md:aspect-3/4 mx-auto'
        >
          <div className='flex justify-between border-1 border-black px-2 py-1'>
            {selectedDetail && selectedDetail.platforms.length > 0 && (
              <p className="text-xs font-mono text-muted">{selectedDetail.platforms.join(' • ')}</p>
            )}
            {selectedDetail && selectedDetail.rating > 0 && (
              <p className="text-xs font-mono text-muted">★ {selectedDetail.rating.toFixed(1)}</p>
            )}
          </div>
          {detailLoading && !selectedDetail ? (
            <div className="flex flex-col gap-2">
              <div className="animate-pulse bg-muted/30 rounded h-3 w-full" />
              <div className="animate-pulse bg-muted/30 rounded h-3 w-3/4" />
            </div>
          ) : selectedDetail?.description ? (
            <div
              className="text-xs font-mono text-muted flex-1 min-h-0 overflow-y-auto border-1 border-black px-2 py-1"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedDetail.description) }}
            />
          ) : null}


          <div className='flex justify-between gap-4'>
            {selectedDetail?.website && (
              <a
                href={selectedDetail.website}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-blue-400 hover:underline truncate block"
              >
                {selectedDetail.website}
              </a>
            )}
            <p className="text-xs font-mono text-muted text-nowrap">
              Added {new Date(selected.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button onClick={() => navigate(`/realm/${selected.gameId}`)}>
              Enter
            </Button>
            <Button variant="danger" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </LandCard>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a game</p>
    </div>
  )

  const rightContent = (
    <>
      <div className="overflow-y-auto h-full min-h-0">
        {status === 'loading' && (
          <div className="flex justify-center py-10"><Spinner /></div>
        )}
        {status === 'error' && <EmptyState message="Could not load games" />}
        {status === 'empty' && <EmptyState message="You haven't added any games yet" />}
        {status === 'ready' && (
          <div className="flex flex-col md:min-h-0">
            <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50'>
              <h2 className="text-xs font-mono uppercase tracking-widest">My Game Cards</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 h-full gap-3 p-4">
              {games.map(game => (
                <div
                  key={game.id}
                  className={`relative h-fit md:h-full ${selected?.id === game.id
                    ? 'ring-2 ring-blue-700 rounded-xl'
                    : ''
                    }`}
                >
                  <NewMatchBadge count={game.newMatchCount} />
                  <LandCard
                    name={game.gameName}
                    imageUrl={game.gameImageUrl ?? undefined}
                    onClick={() => handleSelect(game)}
                    className="h-min aspect-3/4 md:aspect-auto md:h-full hover:brightness-110 transition-all"
                  >
                    <div className='flex flex-1 items-center justify-center text-7xl'>❖</div>
                  </LandCard>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <BinderLayout
      barColor="#409cda"
      activeTab={"Games"}
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
