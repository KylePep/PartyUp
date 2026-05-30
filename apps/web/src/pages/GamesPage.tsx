import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserGames, deleteUserGame, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Button, EmptyState, Spinner } from '../components/ui'
import { LandCard } from '../components/cards/LandCard'
import DOMPurify from 'dompurify'

export default function GamesPage() {
  const [games, setGames] = useState<UserGame[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<UserGame | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<UserGameDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getUserGames()
      .then(gs => {
        setGames(gs)
        setStatus(gs.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  function handleSelect(game: UserGame) {
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
    <div className="overflow-y-auto mx-auto" style={{ height: 'calc(100vh - 6rem)', width: "500px" }}>
      <LandCard
        name={selected.gameName}
        imageUrl={selected.gameImageUrl ?? undefined}
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
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a game</p>
    </div>
  )

  const rightContent = (
    <div className="p-4 overflow-y-auto h-full min-h-0">
      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner /></div>
      )}
      {status === 'error' && <EmptyState message="Could not load games" />}
      {status === 'empty' && <EmptyState message="You haven't added any games yet" />}
      {status === 'ready' && (
        <div className="grid grid-cols-3 grid-rows-2 h-full gap-3">
          {games.map(game => (
            <div
              key={game.id}
              className={selected?.id === game.id ? 'ring-2 ring-blue-700 ring-offset-2 ring-offset-[--color-bg] rounded-xl' : ''}
            >
              <LandCard
                name={game.gameName}
                imageUrl={game.gameImageUrl ?? undefined}
                onClick={() => handleSelect(game)}
                className="w-full h-full hover:brightness-110 transition-all"
              >
                <div className='flex flex-1 items-center justify-center text-7xl'>❖</div>
              </LandCard>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <BinderLayout
      barColor="#1e40af"
      activeTab={"Games"}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
