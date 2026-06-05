import type { UserGameDetail } from '../api/endpoints/userGames'
import { MatchGallery } from './MatchGallery'

interface RealmRightPageProps {
  userGame: UserGameDetail
  gameId: string
}

export function RealmRightPage({ gameId }: RealmRightPageProps) {
  return (
    <div className='flex flex-col h-full overflow-x-hidden'>
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50'>
        <h2 className="text-xs font-mono uppercase tracking-widest">Matches</h2>
      </div>
      <div className="overflow-y-auto h-full w-full min-h-0 p-4">
        <MatchGallery gameId={gameId} limit={6} />
      </div>
    </div>
  )
}
