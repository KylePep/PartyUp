import { useEffect, useState, startTransition } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUserGames, deleteUserGame, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Gallery } from '../components/Gallery'
import { GameDetailCard } from '../components/cards/GameDetailCard'
import { PaginationControls } from '../components/ui'
import { TABS } from '../lib/tabs'
import { CubeIcon, PlanetIcon } from '@phosphor-icons/react'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal'
import { BinderHeader } from '../components/layout/BinderHeader'
import { FullArtTcgCard } from '../components/cards/FullArtTcgCard'

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
      setActiveSide('right')
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
    <div className="flex flex-col md:flex-1 md:min-h-0">
      <BinderHeader title='Select A Game' className='flex flex-col justify-center'></BinderHeader>
    </div>
  )

  const rightContent = (
    <div className="flex flex-col h-full min-h-0">
      <BinderHeader title='My Game Cards' className='flex items-center justify-between'>
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
        items={games}
        status={status}
        getKey={(g: UserGame) => g.id}
        emptyMessage="You haven't added any games yet"
        errorMessage="Could not load games"
        stickyRows={true}
        renderItem={(g: UserGame) => (
          <div className={`relative h-fit md:h-full ${selected?.id === g.id ? 'ring-2 ring-blue-700 rounded-xl' : ''}`}>
            <FullArtTcgCard
              name={g.gameName}
              imageUrl={g.gameImageUrl ?? undefined}
              onClick={() => handleSelect(g)}
              className="h-min aspect-4/5 md:aspect-aut md:h-full hover:brightness-110 transition-all"
              platform={
                g.newMatchCount > 0 ? (
                  <span className="relative flex">
                    <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
                    <CubeIcon className="relative text-success" />
                  </span>
                ) : (
                  <CubeIcon />
                )
              }
            />
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
      hasSelection={!!selected}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
