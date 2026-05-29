import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserGames, deleteUserGame, type UserGame } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Button, EmptyState, Spinner } from '../components/ui'
import { LandCard } from '../components/cards/LandCard'

export default function GamesPage() {
  const [games, setGames] = useState<UserGame[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<UserGame | null>(null)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getUserGames()
      .then(gs => {
        setGames(gs)
        setStatus(gs.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

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
    <div className="overflow-y-auto p-4" style={{ height: 'calc(100vh - 6rem)' }}>
      <LandCard
        name={selected.gameName}
        imageUrl={selected.gameImageUrl}
      >
        <p className="text-xs font-mono text-muted">
          Added {new Date(selected.createdAt).toLocaleDateString()}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/realm/${selected.gameId}`)}>
            Enter Realm
          </Button>
          <Button variant="danger" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Deleting...' : 'Delete Game'}
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
        <div className="grid grid-cols-2 gap-3">
          {games.map(game => (
            <div
              key={game.id}
              className={selected?.id === game.id ? 'ring-2 ring-blue-700 ring-offset-2 ring-offset-[--color-bg] rounded-xl' : ''}
            >
              <LandCard
                name={game.gameName}
                imageUrl={game.gameImageUrl}
                onClick={() => setSelected(game)}
                className="w-full hover:brightness-110 transition-all"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <BinderLayout
      barColor="#1e40af"
      tabs={[
        { label: 'My Cards', color: '#991b1b', to: '/characters' },
        { label: 'Games', color: '#1e40af', to: '/games' },
        { label: 'Collection', color: '#166534', to: '/matches' },
      ]}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
