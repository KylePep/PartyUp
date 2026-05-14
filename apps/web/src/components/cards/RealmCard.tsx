import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'
import { Button } from '../ui'

interface RealmCardProps {
  userGame: UserGame
  onRemove: (userGame: UserGame) => void
}

export function RealmCard({ userGame, onRemove }: RealmCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors">
      {userGame.gameImageUrl ? (
        <div className="aspect-video w-full overflow-hidden">
          <img src={userGame.gameImageUrl} alt={userGame.gameName} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video w-full bg-surface-raised" />
      )}
      <div className="p-3 flex flex-col gap-3">
        <p className="text-sm font-mono text-text truncate">{userGame.gameName}</p>
        <div className="flex gap-2">
          <Link
            to={`/realm/${userGame.gameId}`}
            className="flex-1 text-center text-xs font-mono uppercase tracking-widest py-2 border border-border text-muted hover:border-accent hover:text-accent transition-colors rounded"
          >
            Enter
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(userGame)}
            className="text-danger hover:opacity-70"
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  )
}
