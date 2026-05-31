import type { UserGameDetail } from '../api/endpoints/userGames'
import { MatchGallery } from './MatchGallery'

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
}

export function RealmRightPage({ userGame: _userGame, gameId }: RealmRightPageProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-[5] px-6 overflow-hidden">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4 mt-2">Matches</h2>
        <MatchGallery gameId={gameId} limit={6} />
      </div>
    </div>
  )
}
