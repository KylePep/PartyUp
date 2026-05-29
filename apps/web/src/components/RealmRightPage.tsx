import DOMPurify from 'dompurify'
import type { UserGameDetail } from '../api/endpoints/userGames'
import { MatchGallery } from './MatchGallery'

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
}

export function RealmRightPage({ userGame, gameId }: RealmRightPageProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Game details — top 1/3 */}
      <div className="flex-[1] p-6 border-b border-border flex gap-4 items-start overflow-hidden">
        {userGame.gameImageUrl && (
          <img
            src={userGame.gameImageUrl}
            alt={userGame.gameName}
            className="w-16 h-16 object-cover rounded shrink-0"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-display font-bold text-2xl text-text">{userGame.gameName}</h1>
          {userGame.description && (
            <div
              className="mt-2 text-sm text-muted line-clamp-4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userGame.description) }}
            />
          )}
        </div>
      </div>

      {/* Matches grid — bottom 2/3 */}
      <div className="flex-[5] px-6 overflow-hidden">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4 mt-2">Matches</h2>
        <MatchGallery gameId={gameId} limit={6} />
      </div>
    </div>
  )
}
