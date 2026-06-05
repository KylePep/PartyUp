import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getUserGames, deleteUserGame, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Button } from '../components/ui'
import { Gallery } from '../components/Gallery'
import { LandCard } from '../components/cards/LandCard'
import { NewMatchBadge } from '../components/ui/NewMatchBadge'
import { TABS } from '../lib/tabs'
import DOMPurify from 'dompurify'
import { PlanetIcon } from '@phosphor-icons/react'

export default function GamesPage() {
  const TAB = TABS.find(t => t.label === 'Games')!
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
        <h2 className="text-xs font-mono uppercase tracking-widest">Game Card Details</h2>
      </div>
      <div className="overflow-y-auto overflow-hidden flex flex-col flex-1 mx-auto p-2 md:p-4" >
        <LandCard
          name={selected.gameName}
          imageUrl={selected.gameImageUrl ?? undefined}
          className='h-full w-full'
        >
          <div className='flex justify-between border-1 border-[--color-off-black] px-2 py-1'>
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
              className="text-xs font-mono text-muted flex-1 min-h-0 overflow-y-auto border-1 border-[--color-off-black] px-2 py-1"
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
    <div className="flex flex-col h-full min-h-0">
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
        <h2 className="text-xs font-mono uppercase tracking-widest">My Game Cards</h2>
      </div>
      <Gallery
        items={games}
        status={status}
        getKey={(g: UserGame) => g.id}
        emptyMessage="You haven't added any games yet"
        errorMessage="Could not load games"
        renderItem={(g: UserGame) => (
          <div className={`relative h-fit md:h-full ${selected?.id === g.id ? 'ring-2 ring-blue-700 rounded-xl' : ''}`}>
            <NewMatchBadge count={g.newMatchCount} />
            <LandCard
              name={g.gameName}
              imageUrl={g.gameImageUrl ?? undefined}
              onClick={() => handleSelect(g)}
              className="h-min aspect-3/4 md:aspect-auto md:h-full hover:brightness-110 transition-all"
            >
              <div className='flex flex-1 items-center justify-center text-7xl'><PlanetIcon /></div>
            </LandCard>
          </div>
        )}
      />
    </div>
  )

  return (
    <BinderLayout
      barColor={TAB.color}
      activeTab={"Games"}
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
