import { useRef, useState } from 'react'
import { getGames, type Game } from '../api/endpoints/games'
import { addUserGame as apiAddUserGame, type UserGame } from '../api/endpoints/userGames'
import { GameCard } from './cards/GameCard'
import { Modal, Button, Spinner } from './ui'

interface OrbSearchProps {
  onAdd: (game: UserGame) => void
  disabled?: boolean
}

export function OrbSearch({ onAdd, disabled = false }: OrbSearchProps) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [pendingGame, setPendingGame] = useState<Game | null>(null)
  const [adding, setAdding] = useState(false)
  const searchGen = useRef(0)

  async function handleSearch() {
    if (!query.trim() || disabled) return
    setExpanded(true)
    setSearchStatus('loading')
    const gen = ++searchGen.current
    try {
      const data = await getGames({ q: query })
      if (gen !== searchGen.current) return
      setResults(data.games)
      setSearchStatus('done')
    } catch {
      if (gen === searchGen.current) setSearchStatus('done')
    }
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
      setPendingGame(null)
      setQuery('')
      setResults([])
      setSearchStatus('idle')
      setExpanded(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-82 md:min-h-96">
      <div
        className={`
          group relative bg-white border-black border-4 overflow-hidden
          transition-all duration-500 ease-in-out
          ${expanded ? 'w-full h-82 md:h-96 rounded-xl' : 'w-64 md:w-80 h-64 md:h-80 rounded-full'}
        `}
      >
        {/* Search bar — absolutely positioned; centered in circle, locked to top in rectangle */}
        <div
          className={`absolute flex gap-2 items-center transition-all duration-500 ease-in-out ${expanded
            ? 'top-4 left-4 right-4 opacity-100'
            : 'top-1/2 -translate-y-1/2 left-8 right-8 opacity-0 group-hover:opacity-100 focus-within:opacity-100'
            }`}
        >
          <input
            className="flex-1 w-32 md:width-auto bg-transparent border-b-2 border-black text-black text-sm font-mono placeholder:text-gray-400 outline-none pb-1"
            placeholder="Search games..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            disabled={disabled}
          />
          <button
            onClick={handleSearch}
            disabled={disabled || searchStatus === 'loading'}
            className="text-xs font-mono uppercase tracking-widest text-black hover:opacity-60 transition-opacity disabled:opacity-30"
          >
            Search
          </button>
        </div>

        {/* Results — only mounted when expanded */}
        {expanded && (
          <div className="absolute top-16 left-4 right-4 bottom-4 overflow-y-auto">
            {searchStatus === 'loading' && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
            {searchStatus === 'done' && results.length === 0 && (
              <p className="text-xs text-gray-400 font-mono text-center py-4">
                No results found.
              </p>
            )}
            {results.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {results.map(g => (
                  <GameCard key={g.externalId} game={g} onSelect={setPendingGame} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={!!pendingGame} onClose={() => setPendingGame(null)} title="Add Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Add <strong>{pendingGame?.name}</strong> to your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPendingGame(null)}>
              Cancel
            </Button>
            <Button onClick={confirmAdd} disabled={adding}>
              {adding ? 'Adding...' : 'Add Realm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
