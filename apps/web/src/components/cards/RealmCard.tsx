import { Link } from 'react-router-dom'
import { type UserGame } from '../../api/endpoints/userGames'

interface RealmCardProps {
  userGame: UserGame
}

export function RealmCard({ userGame }: RealmCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors flex flex-col">
      {userGame.gameImageUrl ? (
        <div className="aspect-video w-full overflow-hidden">
          <img src={userGame.gameImageUrl} alt={userGame.gameName} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video w-full bg-surface-raised" />
      )}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-mono text-text truncate">{userGame.gameName}</p>
        <Link
          to={`/realm/${userGame.gameId}`}
          className="mt-auto block text-center text-xs font-mono uppercase tracking-widest py-2 border border-border text-muted hover:border-accent hover:text-accent transition-colors rounded"
        >
          Enter
        </Link>
      </div>
    </div>
  )
}
