import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUserGames, deleteUserGame, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Gallery } from '../components/Gallery'
import { LandCard } from '../components/cards/LandCard'
import { GameDetailCard } from '../components/cards/GameDetailCard'
import { NewMatchBadge } from '../components/ui/NewMatchBadge'
import { TABS } from '../lib/tabs'
import { CubeIcon, PlanetIcon } from '@phosphor-icons/react'
import { GameMiniCard } from '../components/cards/GameMiniCard'

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
    <GameDetailCard
      game={selected}
      detail={selectedDetail}
      loading={detailLoading}
      deleting={deleting}
      onDelete={handleDelete}
    />
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
      activeTab={"Games"}
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
