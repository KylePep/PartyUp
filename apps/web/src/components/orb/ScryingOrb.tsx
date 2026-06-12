import { useRef, useState, useEffect, type CSSProperties } from 'react'
import { getGames, type Game } from '../../api/endpoints/games'
import { addUserGame as apiAddUserGame, type UserGame } from '../../api/endpoints/userGames'
import { MagicOrb } from './MagicOrb'
import { Modal, Button } from '../ui'
import { GamePlanet } from './GamePlanet'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [orbSize, setOrbSize] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setOrbSize(Math.floor(Math.min(width, height)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  const imgSize = Math.max(60, Math.floor(orbSize * 0.4))

  return (
    <div ref={containerRef} className="flex-1 min-h-0 w-full flex items-center justify-center py-2">
      {orbSize > 0 && <MagicOrb
        style={{ width: orbSize, height: orbSize }}
        focused={searchState === 'results'}
      >
        {/* IDLE STATE */}
        {searchState === 'idle' && (
          <div className="w-full h-full flex flex-col items-center justify-between py-8 px-6">
            <div className="flex-1 flex items-center justify-center w-full">
              <div className="flex gap-2 items-center w-full">
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

        {/* EMPTY STATE */}
        {searchState === 'empty' && (
          <div className="w-full h-full flex flex-col items-center justify-between py-8 px-6">
            <div className="flex items-start justify-end w-full px-2 pt-2">
              <button
                onClick={handleClear}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors"
                aria-label="Clear search"
              >
                ×
              </button>
            </div>
            <div
              className="flex-1 flex items-center justify-center"
              style={{ animation: 'vision-appear 0.8s ease forwards' } as CSSProperties}
            >
              <p className="text-sm font-mono text-muted text-center">Nothing found.</p>
            </div>
            <div className="h-6" />
          </div>
        )}

        {/* RESULTS STATE */}
        {searchState === 'results' && (
          <div className="w-full h-full flex flex-col">
            {/* Query bar — fixed at top */}
            <div className="flex-shrink-0 flex items-center justify-center gap-2 pt-4 px-4">
              <button
                onClick={handleClear}
                className="flex items-center justify-between text-2xl font-mono text-cyan-400 hover:text-cyan-200 transition-colors gap-2"
                aria-label="Clear search"
              >
                <span className="text-xs font-mono text-muted truncate max-w-full">{query}</span>
                ×
              </button>
            </div>

            {/* Scroll area — flex-1 with relative wrapper so gradient can overlay */}
            <div className="flex-1 min-h-0 relative">
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 pt-2 pb-10"
                style={{ scrollbarWidth: 'none' }}
              >
                <div className="grid grid-cols-1 gap-4 justify-items-center">
                  {results.map((game, i) => (
                    <GamePlanet
                      key={game.externalId}
                      name={game.name}
                      imageUrl={game.imageUrl}
                      index={i}
                      imgSize={imgSize}
                      onSelect={() => setPendingGame(game)}
                    />
                  ))}
                </div>
              </div>
              {/* Gradient overlay — always at visible bottom, independent of scroll position */}
              <div
                className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(1,6,8,0.92))' }}
              />
            </div>

            {/* List view button — fixed at bottom, mirrors query bar at top */}
            <div className="flex-shrink-0 flex items-center justify-center py-3">
              <button
                onClick={() => setListOpen(true)}
                className="text-xs font-mono text-muted hover:text-off-white transition-colors"
              >
                List view
              </button>
            </div>
          </div>
        )}
      </MagicOrb>}

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

      {/* List view modal — plain accessible game list */}
      <Modal isOpen={listOpen} onClose={() => setListOpen(false)} title="Search Results">
        <div className="px-4 py-2 flex flex-col gap-2 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">No results.</p>
          ) : (
            results.map(game => (
              <div key={game.externalId} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <img
                  src={game.imageUrl ?? '/placeholder-game.png'}
                  alt={game.name}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
                <span className="flex-1 text-sm text-text truncate">{game.name}</span>
                <Button
                  size="sm"
                  onClick={() => { setListOpen(false); setPendingGame(game) }}
                >
                  Add
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
