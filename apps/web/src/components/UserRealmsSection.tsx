import { useState } from 'react'
import { type UserGame, addUserGame as apiAddUserGame, deleteUserGame } from '../api/endpoints/userGames'
import { getGames, type Game } from '../api/endpoints/games'
import { RealmCard } from './cards/RealmCard'
import { GameCard } from './cards/GameCard'
import { Modal, Button, Input, EmptyState, Spinner } from './ui'
import { USER_GAME_LIMIT } from '../utils/limits'

interface UserRealmsSectionProps {
  games: UserGame[]
  onAdd: (game: UserGame) => void
  onRemove: (game: UserGame) => void
}

export function UserRealmsSection({ games, onAdd, onRemove }: UserRealmsSectionProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [pendingGame, setPendingGame] = useState<Game | null>(null)
  const [adding, setAdding] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<UserGame | null>(null)
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null)

  async function handleSearch() {
    if (!query.trim()) return
    setSearchStatus('loading')
    const result = await getGames({ q: query })
    setResults(result.games)
    setSearchStatus('done')
  }

  async function confirmAdd() {
    if (!pendingGame) return
    setAdding(true)
    try {
      const result = await apiAddUserGame({
        externalId: pendingGame.externalId,
        name: pendingGame.name,
        imageUrl: pendingGame.imageUrl,
      })
      onAdd(result.userGame)
      if (result.redirected && result.message) {
        setRedirectMessage(result.message)
      }
      setPendingGame(null)
      setQuery('')
      setResults([])
      setSearchStatus('idle')
    } finally {
      setAdding(false)
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    await deleteUserGame(removeTarget.id)
    onRemove(removeTarget)
    setRemoveTarget(null)
  }

  return (
    <div className="flex flex-col gap-10">
      {redirectMessage && (
        <div className="flex items-start justify-between gap-3 bg-surface border border-accent rounded-lg px-4 py-3">
          <p className="text-sm text-text font-mono">{redirectMessage}</p>
          <button
            onClick={() => setRedirectMessage(null)}
            className="text-muted hover:text-text text-xs font-mono shrink-0"
          >
            dismiss
          </button>
        </div>
      )}

      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">My Realms</h2>
        {games.length === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="bg-surface border border-border rounded-lg px-5 py-4 flex flex-col gap-4">
              <p className="text-xs font-mono text-muted uppercase tracking-widest">How PartyUp works</p>
              <ol className="flex flex-col gap-3">
                {[
                  { n: 1, title: 'Find your game', body: 'Search for a title and add it to your account.' },
                  { n: 2, title: 'Build your character', body: 'Set your role, rank, playstyle, and availability.' },
                  { n: 3, title: 'Set your platform handle', body: 'Stays private until a match — only revealed to your new teammate.' },
                  { n: 4, title: 'Swipe on players', body: 'Like the characters you want to party with.' },
                  { n: 5, title: 'Match and connect', body: 'A mutual like reveals both handles so you can link up directly.' },
                ].map(step => (
                  <li key={step.n} className="flex items-start gap-3">
                    <span className="font-mono font-bold text-accent text-sm shrink-0">{step.n}.</span>
                    <p className="text-sm text-text leading-relaxed">
                      <span className="font-semibold">{step.title}</span>
                      {' — '}
                      <span className="text-muted">{step.body}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </div>
            <EmptyState message="No realms yet — search for a game below" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {games.map(g => (
              <RealmCard key={g.id} userGame={g} onRemove={setRemoveTarget} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Add a Realm</h2>
        {games.length >= USER_GAME_LIMIT ? (
          <p className="text-xs font-mono text-muted">
            {USER_GAME_LIMIT} / {USER_GAME_LIMIT} realms — remove one to add a new game
          </p>
        ) : (
          <>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label=""
                  placeholder="Search games..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button variant="secondary" onClick={handleSearch} disabled={searchStatus === 'loading'}>
                Search
              </Button>
            </div>
            {searchStatus === 'loading' && <div className="mt-4"><Spinner /></div>}
            {searchStatus === 'done' && results.length === 0 && (
              <p className="mt-4 text-xs text-muted font-mono">No results found.</p>
            )}
            {results.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map(g => (
                  <GameCard key={g.externalId} game={g} onSelect={setPendingGame} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <Modal isOpen={!!pendingGame} onClose={() => setPendingGame(null)} title="Add Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Add <strong>{pendingGame?.name}</strong> to your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPendingGame(null)}>Cancel</Button>
            <Button onClick={confirmAdd} disabled={adding}>
              {adding ? 'Adding...' : 'Add Realm'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Remove <strong>{removeTarget?.gameName}</strong> from your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmRemove}>Remove</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
