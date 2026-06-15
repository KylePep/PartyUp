import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { LandCard } from './LandCard'
import { Button } from '../ui'
import type { UserGame, UserGameDetail } from '../../api/endpoints/userGames'

interface GameDetailCardProps {
  game: UserGame
  detail: UserGameDetail | null
  loading: boolean
  deleting: boolean
  onDelete: () => void
}

export function GameDetailCard({ game, detail, loading, deleting, onDelete }: GameDetailCardProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="px-4 py-3 min-h-[64px] border-b-4 border-orange-950/50 bg-gradient-to-r from-orange-950/25 via-transparent to-transparent">
        <h2 className="text-xs font-mono uppercase tracking-widest">Game Card Details</h2>
      </div>
      <div className="overflow-y-auto overflow-x-hidden flex flex-col flex-1 min-h-0 w-full p-2 md:p-4">
        <LandCard
          name={game.gameName}
          imageUrl={game.gameImageUrl ?? undefined}
          className="w-full md:h-full"
        >
          <div className="flex justify-between border-1 border-off-black px-2 py-1 rounded-sm">
            {detail && detail.platforms.length > 0 && (
              <p className="text-xs font-mono text-muted">{detail.platforms.join(' • ')}</p>
            )}
            {detail && detail.rating > 0 && (
              <p className="text-xs font-mono text-muted">★ {detail.rating.toFixed(1)}</p>
            )}
          </div>

          {loading && !detail ? (
            <div className="flex flex-col gap-2">
              <div className="animate-pulse bg-muted/30 rounded h-3 w-full" />
              <div className="animate-pulse bg-muted/30 rounded h-3 w-3/4" />
            </div>
          ) : detail?.description ? (
            <div
              className="text-xs font-mono text-muted flex-1 min-h-0 overflow-y-auto border-1 border-off-black px-2 py-1 rounded-sm"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(detail.description) }}
            />
          ) : null}

          <div className="flex justify-between gap-4">
            {detail?.website && (
              <a
                href={detail.website}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-blue-400 hover:underline truncate block"
              >
                {detail.website}
              </a>
            )}
            <p className="text-xs font-mono text-muted text-nowrap">
              Added {new Date(game.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button onClick={() => navigate(`/realm/${game.gameId}`)}>Enter</Button>
            <Button variant="danger" disabled={deleting} onClick={onDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </LandCard>
      </div>
    </div>
  )
}
