import { useEffect, useState, startTransition } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUserGames, deleteUserGame, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Gallery } from '../components/Gallery'
import { LandCard } from '../components/cards/LandCard'
import { GameDetailCard } from '../components/cards/GameDetailCard'
import { NewMatchBadge } from '../components/ui/NewMatchBadge'
import { PaginationControls } from '../components/ui'
import { TABS } from '../lib/tabs'
import { CubeIcon, PlanetIcon } from '@phosphor-icons/react'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal'

const PAGE_SIZE = 12

export default function GamesPage() {
  const TAB = TABS.find(t => t.label === 'Realms')!
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')
  const [games, setGames] = useState<UserGame[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected] = useState<UserGame | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<UserGameDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')

  useEffect(() => {
    startTransition(() => setStatus('loading'))
    getUserGames(page, PAGE_SIZE)
      .then(result => {
        setGames(result.items)
        setTotalCount(result.totalCount)
        setStatus(result.totalCount === 0 ? 'empty' : 'ready')
        if (targetId && page === 1) {
          const match = result.items.find(g => g.id === targetId)
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
  }, [targetId, page])

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
      const newTotal = totalCount - 1
      setTotalCount(newTotal)
      setSelected(null)
      setConfirmOpen(false)
      const totalPages = Math.ceil(newTotal / PAGE_SIZE)
      if (page > totalPages && page > 1) {
        setPage(p => p - 1)
      } else {
        setGames(prev => {
          const next = prev.filter(g => g.id !== selected.id)
          if (newTotal === 0) setStatus('empty')
          return next
        })
      }
    } finally {
      setDeleting(false)
    }
  }

  const leftContent = selected ? (
    <>
      <GameDetailCard
        game={selected}
        detail={selectedDetail}
        loading={detailLoading}
        deleting={deleting}
        onDelete={() => setConfirmOpen(true)}
      />
      <ConfirmDeleteModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        itemName={selected.gameName}
        loading={deleting}
      />
    </>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a game</p>
    </div>
  )

  const rightContent = (
    <div className="flex flex-col h-full min-h-0">
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-orange-950/50 bg-gradient-to-r from-orange-950/25 via-transparent to-transparent flex items-center justify-between'>
        <h2 className="text-xs font-mono uppercase tracking-widest">My Game Cards</h2>
        {totalCount > 0 && (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>
      <Gallery
        key={page}
        items={games}
        status={status}
        getKey={(g: UserGame) => g.id}
        emptyMessage="You haven't added any games yet"
        errorMessage="Could not load games"
        stickyRows={games.length > 6}
        renderItem={(g: UserGame) => (
          <div className={`relative h-fit md:h-full ${selected?.id === g.id ? 'ring-2 ring-blue-700 rounded-xl' : ''}`}>
            <NewMatchBadge count={g.newMatchCount} />
            <LandCard
              name={g.gameName}
              imageUrl={g.gameImageUrl ?? undefined}
              onClick={() => handleSelect(g)}
              className="h-min aspect-3/4 md:aspect-auto md:h-full hover:brightness-110 transition-all"
            >
              <div className='flex flex-1 items-center justify-center text-7xl'><CubeIcon /></div>
            </LandCard>
          </div>
        )}
      />
    </div>
  )

  return (
    <BinderLayout
      barColor={TAB.color}
      barContent={selected ? (
        <>
          <GameMiniCard game={{ name: selected.gameName, imageUrl: selected.gameImageUrl ?? undefined }} platform={<PlanetIcon />}
            gameId={selected.gameId}
          />
        </>
      ) : undefined}
      activeTab={"Realms"}
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
