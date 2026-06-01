import { type Game } from '../../api/endpoints/games'
import { LandCard } from './LandCard'

interface GameCardProps {
  game: Game
  onSelect: (game: Game) => void
}

export function GameCard({ game, onSelect }: GameCardProps) {
  return (
    <LandCard
      name={game.name}
      imageUrl={game.imageUrl}
      onClick={() => onSelect(game)}
      className="w-full text-left hover:brightness-110 transition-all"
    />
  )
}
