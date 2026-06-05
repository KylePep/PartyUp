import { useRef, useState, type CSSProperties } from 'react'
import { getGames, type Game } from '../../api/endpoints/games'
import { addUserGame as apiAddUserGame, type UserGame } from '../../api/endpoints/userGames'
import { MagicOrb } from './MagicOrb'
import { Modal, Button } from '../ui'

const IMG_SIZE = 80
const SVG_SIZE = 104 // IMG_SIZE + 24px padding for arc text

interface GamePlanetProps {
  game: Game
  index: number
  onSelect: (game: Game) => void
}

function GamePlanet({ game, index, onSelect }: GamePlanetProps) {
  const bobDur = 3 + (index % 3) * 0.7
  const bobDelay = Math.min(index * 0.3, 2.1)
  const appearDelay = index * 0.05

  return (
    <button
      onClick={() => onSelect(game)}
      className="flex flex-col items-center gap-0 bg-transparent border-0 cursor-pointer p-0"
      aria-label={`Add ${game.name}`}
      style={{
        animation: `planet-appear 0.4s ${appearDelay}s ease both, planet-bob ${bobDur}s ${bobDelay}s ease-in-out infinite`,
      } as CSSProperties}
    >
      {/* Circle image + SVG arc label */}
      <div style={{ position: 'relative', width: SVG_SIZE, height: SVG_SIZE }}>
        <img
          src={game.imageUrl ?? '/placeholder-game.png'}
          alt={game.name}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: IMG_SIZE,
            height: IMG_SIZE,
            borderRadius: '50%',
            objectFit: 'cover',
            boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
          }}
        />
        {/* Arc label — game name curves around the bottom of the circle */}
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
          aria-hidden
        >
          <defs>
            {/* Bottom arc: starts at left edge of circle, curves through bottom to right edge */}
            <path
              id={`arc-${index}`}
              d={`M 12,${SVG_SIZE / 2} a ${IMG_SIZE / 2},${IMG_SIZE / 2} 0 0,0 ${IMG_SIZE},0`}
            />
          </defs>
          <text fontSize="9" fill="#e8e8f0" textAnchor="middle" letterSpacing="0.5">
            <textPath href={`#arc-${index}`} startOffset="50%">
              {game.name}
            </textPath>
          </text>
        </svg>
      </div>
    </button>
  )
}

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
  const [_listOpen, setListOpen] = useState(false)
  const searchGen = useRef(0)

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

        {/* RESULTS STATE */}
        {searchState === 'results' && (
          <div className="w-full h-full flex flex-col">
            {/* Query bar */}
            <div className="flex-shrink-0 flex items-center justify-center gap-2 pt-4 px-4">
              <span className="text-xs font-mono text-muted truncate max-w-[60%]">{query}</span>
              <button
                onClick={handleClear}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors"
                aria-label="Clear search"
              >
                ×
              </button>
            </div>

            {/* Scrollable planets grid */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-2 pb-8"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="grid grid-cols-2 gap-4 justify-items-center">
                {results.map((game, i) => (
                  <GamePlanet key={game.externalId} game={game} index={i} onSelect={setPendingGame} />
                ))}
              </div>

              {/* List view button — bottom of scroll content */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setListOpen(true)}
                  className="text-xs font-mono text-muted hover:text-off-white transition-colors"
                >
                  List view
                </button>
              </div>
            </div>

            {/* Fade-out gradient at bottom edge */}
            <div
              className="flex-shrink-0 h-8 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(1,6,8,0.95))' }}
            />
          </div>
        )}
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
