import { useRef, useState, type CSSProperties } from 'react'
import { getGames, type Game } from '../../api/endpoints/games'
import { addUserGame as apiAddUserGame, type UserGame } from '../../api/endpoints/userGames'
import { MagicOrb } from './MagicOrb'
import { Modal, Button } from '../ui'

interface ScryingOrbProps {
  onAdd: (game: UserGame) => void
  disabled?: boolean
}

type SearchState = 'idle' | 'loading' | 'results' | 'empty'

export function ScryingOrb({ onAdd, disabled = false }: ScryingOrbProps) {
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [pendingGame, setPendingGame] = useState<Game | null>(null)
  const [adding, setAdding] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const searchGen = useRef(0)
  // results and listOpen are consumed in Tasks 7–8
  void results
  void listOpen

  async function handleSearch() {
    if (!query.trim() || disabled) return
    setSearchState('loading')
    const gen = ++searchGen.current
    try {
      const data = await getGames({ q: query })
      if (gen !== searchGen.current) return
      if (data.games.length === 0) {
        setResults([])
        setSearchState('empty')
      } else {
        setResults(data.games)
        setSearchState('results')
      }
    } catch {
      if (gen === searchGen.current) setSearchState('empty')
    }
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setSearchState('idle')
    searchGen.current++
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
      handleClear()
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 w-full flex items-center justify-center py-2">
      <MagicOrb
        className="h-full aspect-square max-w-full"
        focused={searchState === 'results'}
      >
        {/* IDLE STATE */}
        {searchState === 'idle' && (
          <div className="w-full h-full flex flex-col items-center justify-between py-8 px-6">
            <div className="flex-1 flex items-center justify-center w-full">
              <div className="flex gap-2 items-center w-full max-w-[70%]">
                <input
                  className="flex-1 bg-transparent border-b border-cyan-400/50 text-off-white text-sm font-mono placeholder:text-muted/50 outline-none pb-1 caret-cyan-400"
                  placeholder="Search realms…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  disabled={disabled}
                />
                <button
                  onClick={handleSearch}
                  disabled={disabled}
                  className="text-xs font-mono uppercase tracking-widest text-cyan-400 hover:text-cyan-200 transition-colors disabled:opacity-30"
                >
                  Scry
                </button>
              </div>
            </div>
            <button
              onClick={() => setListOpen(true)}
              className="text-xs font-mono text-muted hover:text-off-white transition-colors"
              style={{ visibility: 'hidden' }}
              aria-hidden
            >
              List view
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {searchState === 'loading' && (
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border border-cyan-400/60"
              style={{ animation: 'orb-pulse-ring 1.5s ease-out infinite' } as CSSProperties}
            />
            <div
              className="absolute inset-0 rounded-full border border-cyan-400/40"
              style={{ animation: 'orb-pulse-ring 1.5s 0.5s ease-out infinite' } as CSSProperties}
            />
          </div>
        )}

        {/* Results and empty states added in Tasks 7–8 */}
      </MagicOrb>

      {/* Add-game confirmation modal — unchanged from OrbSearch */}
      <Modal isOpen={!!pendingGame} onClose={() => setPendingGame(null)} title="Add Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Add <strong>{pendingGame?.name}</strong> to your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPendingGame(null)}>Cancel</Button>
            <Button onClick={confirmAdd} disabled={adding}>
              {adding ? 'Adding…' : 'Add Realm'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* List view modal — added in Task 8 */}
    </div>
  )
}
