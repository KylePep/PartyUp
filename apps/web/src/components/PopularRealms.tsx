import { GamePlanet } from './orb/GamePlanet'
import { type PopularGame } from '../api/endpoints/games'

interface PopularRealmsProps {
  games: PopularGame[]
  onSelect: (game: PopularGame) => void
}

export function PopularRealms({ games, onSelect }: PopularRealmsProps) {
  if (games.length === 0) return null

  return (
    <div className="hidden md:flex flex-col absolute right-0 top-0 bottom-0 w-1/5 items-center justify-center gap-4 py-8">
      <p className="text-xs font-mono text-muted uppercase tracking-widest">Popular Realms</p>
      <div className="flex flex-wrap gap-2 justify-center px-2">
        {games.map((game, i) => (
          <GamePlanet
            key={game.id}
            name={game.name}
            imageUrl={game.imageUrl}
            index={i}
            imgSize={70}
            onSelect={() => onSelect(game)}
            count={game.userGameCount}
          />
        ))}
      </div>
    </div>
  )
}
