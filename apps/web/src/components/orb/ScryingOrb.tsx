import { useRef, useState, useEffect, type CSSProperties } from 'react'
import { getGames, type Game, type PopularGame } from '../../api/endpoints/games'
import { addUserGame as apiAddUserGame, type UserGame } from '../../api/endpoints/userGames'
import { MagicOrb } from './MagicOrb'
import { Modal, Button } from '../ui'
import { GamePlanet } from './GamePlanet'

type PendingGame = { externalId: number; name: string; imageUrl: string | null }

interface ScryingOrbProps {
  onAdd: (game: UserGame) => void
  disabled?: boolean
  popularGames?: PopularGame[]
}

type SearchState = 'idle' | 'loading' | 'results' | 'empty' | 'popular'

export function ScryingOrb({ onAdd, disabled = false, popularGames = [] }: ScryingOrbProps) {
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [pendingGame, setPendingGame] = useState<PendingGame | null>(null)
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
        focused={searchState === 'results' || searchState === 'popular'}
      >
        {/* IDLE STATE */}
        {searchState === 'idle' && (
          <div className="relative w-full h-full flex flex-col items-center justify-between py-8 px-4">
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
            {popularGames.length > 0 && (
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 w-full h-full pointer-events-none md:hidden"
                aria-hidden
              >
                <defs>
                  {/* Arc centered at orb center (100,100), radius 78, spanning ±65° from bottom */}
                  <path
                    id="orb-popular-arc"
                    d="M 29,133 A 78,78 0 0 1 171,133"
                  />
                </defs>
                <text
                  fontSize="13"
                  fill={disabled ? 'rgba(0,210,255,0.3)' : '#00d2ff'}
                  textAnchor="middle"
                  letterSpacing="2"
                  fontFamily="monospace"
                  stroke="rgba(0,0,0,0.8)"
                  strokeWidth="3"
                  paintOrder="stroke fill"
                  style={{
                    pointerEvents: disabled ? 'none' : 'all',
                    cursor: disabled ? 'default' : 'pointer',
                    textTransform: 'uppercase',
                  } as CSSProperties}
                  onClick={disabled ? undefined : () => setSearchState('popular')}
                >
                  <textPath href="#orb-popular-arc" startOffset="50%">
                    Popular Realms
                  </textPath>
                </text>
              </svg>
            )}
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
              <div
                className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(1,6,8,0.92))' }}
              />
            </div>

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

        {/* POPULAR STATE */}
        {searchState === 'popular' && (
          <div className="w-full h-full flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-center gap-2 pt-4 px-4">
              <button
                onClick={() => setSearchState('idle')}
                className="flex items-center justify-between text-2xl font-mono text-cyan-400 hover:text-cyan-200 transition-colors gap-2"
                aria-label="Back to search"
              >
                <span className="text-xs font-mono text-muted truncate max-w-full">Popular Realms</span>
                ×
              </button>
            </div>

            <div className="flex-1 min-h-0 relative">
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 pt-2 pb-10"
                style={{ scrollbarWidth: 'none' }}
              >
                <div className="grid grid-cols-1 gap-4 justify-items-center">
                  {popularGames.map((game, i) => (
                    <GamePlanet
                      key={game.id}
                      name={game.name}
                      imageUrl={game.imageUrl}
                      index={i}
                      imgSize={imgSize}
                      onSelect={() => setPendingGame(game)}
                      count={game.userGameCount}
                    />
                  ))}
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(1,6,8,0.92))' }}
              />
            </div>

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

      {/* List view modal — shows search results or popular realms depending on state */}
      <Modal
        isOpen={listOpen}
        onClose={() => setListOpen(false)}
        title={searchState === 'popular' ? 'Popular Realms' : 'Search Results'}
      >
        <div className="px-4 py-2 flex flex-col gap-2 max-h-96 overflow-y-auto">
          {searchState === 'popular' ? (
            popularGames.map(game => (
              <div key={game.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <img
                  src={game.imageUrl ?? '/placeholder-game.png'}
                  alt={game.name}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
                <span className="flex-1 text-sm text-text truncate">{game.name}</span>
                <Button size="sm" onClick={() => { setListOpen(false); setPendingGame(game) }}>
                  Add
                </Button>
              </div>
            ))
          ) : results.length === 0 ? (
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
