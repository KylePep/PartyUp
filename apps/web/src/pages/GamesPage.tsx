import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserGames, deleteUserGame, type UserGame } from '../api/endpoints/userGames'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Button, EmptyState, Spinner } from '../components/ui'

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
    <div className="flex flex-col h-full min-h-0 overflow-y-auto p-6 gap-4">
      <div className="w-full aspect-video rounded-lg overflow-hidden border border-border flex-shrink-0">
        {selected.gameImageUrl ? (
          <img src={selected.gameImageUrl} alt={selected.gameName} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {selected.gameName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div>
        <h1 className="font-display font-bold text-xl text-text mb-1">{selected.gameName}</h1>
        <p className="text-xs font-mono text-muted">
          Added {new Date(selected.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2 mt-auto">
        <Button onClick={() => navigate(`/realm/${selected.gameId}`)}>
          Enter Realm
        </Button>
        <Button
          variant="danger"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? 'Deleting...' : 'Delete Game'}
        </Button>
      </div>
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
            <button
              key={game.id}
              onClick={() => setSelected(game)}
              className="rounded-lg overflow-hidden border-2 transition-all text-left"
              style={{
                borderColor: selected?.id === game.id ? '#1e40af' : 'var(--color-border)',
                boxShadow: selected?.id === game.id ? '0 0 0 2px #1e40af40' : 'none',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <div className="aspect-video overflow-hidden">
                {game.gameImageUrl ? (
                  <img src={game.gameImageUrl} alt={game.gameName} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-muted font-mono text-2xl"
                    style={{ backgroundColor: 'var(--color-surface-raised)' }}
                  >
                    {game.gameName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5">
                <p className="text-xs font-mono text-text truncate">{game.gameName}</p>
              </div>
            </button>
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
