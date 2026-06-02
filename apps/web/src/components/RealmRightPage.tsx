import type { UserGameDetail } from '../api/endpoints/userGames'
import { MatchGallery } from './MatchGallery'

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
}

export function RealmRightPage({ userGame: _userGame, gameId }: RealmRightPageProps) {
  return (
    <div className="p-4 overflow-y-auto h-full w-full min-h-0">
      <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4 mt-2">Matches</h2>
      <MatchGallery gameId={gameId} limit={6} />
    </div>
  )
}
