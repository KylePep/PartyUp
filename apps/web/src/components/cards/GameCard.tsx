import { type Game } from '../../api/endpoints/games'

interface GameCardProps {
  game: Game
  onSelect: (game: Game) => void
}

export function GameCard({ game, onSelect }: GameCardProps) {
  return (
    <button
      onClick={() => onSelect(game)}
      className="group w-full text-left bg-surface border border-border rounded-lg overflow-hidden hover:border-accent transition-colors"
    >
      {game.imageUrl ? (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={game.imageUrl}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-surface-raised flex items-center justify-center">
          <span className="text-muted text-xs font-mono uppercase">No image</span>
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-mono text-text truncate">{game.name}</p>
      </div>
    </button>
  )
}
