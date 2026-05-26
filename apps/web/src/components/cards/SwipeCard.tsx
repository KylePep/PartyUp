import { useState } from 'react'
import { Badge, Button, Card } from '../ui'
import { type DiscoverCharacter } from '../../api/endpoints/characters'

type ExitDirection = 'left' | 'right' | null

interface SwipeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
  isTop: boolean
}

export function SwipeCard({ character, onLike, onDislike, isTop }: SwipeCardProps) {
  const [exiting, setExiting] = useState<ExitDirection>(null)

  function handle(dir: ExitDirection, action: () => void) {
    setExiting(dir)
    setTimeout(action, 380)
  }

  const animClass = isTop
    ? exiting === 'right'
      ? '[animation:slide-out-right_0.38s_ease_forwards]'
      : exiting === 'left'
      ? '[animation:slide-out-left_0.38s_ease_forwards]'
      : '[animation:slide-in-left_0.35s_ease_forwards]'
    : '[animation:card-enter_0.35s_ease_forwards]'

  return (
    <div
      className={`absolute inset-0 ${animClass}`}
      style={{
        zIndex: isTop ? 2 : 1,
        transform: isTop ? undefined : 'scale(0.97) translateY(8px)',
      }}
    >
      <Card padding="lg" className="h-full flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-raised flex-shrink-0 overflow-hidden">
            {character.imageUrl ? (
              <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted font-mono text-lg">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-text text-lg">{character.name}</p>
            {character.gameName && <p className="text-xs text-muted mt-0.5">{character.gameName}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
          {character.usesVoiceChat === true && <Badge>Voice Chat</Badge>}
          {character.preferredModes.map(mode => <Badge key={mode}>{mode}</Badge>)}
          {character.languages?.map(lang => <Badge key={lang}>{lang}</Badge>)}
          {character.gameFields.map(f => <Badge key={f.key}>{f.label}: {f.value}</Badge>)}
        </div>

        {character.bio && (
          <p className="text-sm text-muted flex-1 overflow-y-auto">{character.bio}</p>
        )}

        {isTop && (
          <div className="flex gap-3 mt-auto">
            <Button
              variant="secondary"
              className="flex-1 border-danger/50 text-danger hover:bg-danger hover:text-white hover:border-danger"
              onClick={() => handle('left', onDislike)}
              disabled={!!exiting}
            >
              Pass
            </Button>
            <Button
              className="flex-1"
              onClick={() => handle('right', onLike)}
              disabled={!!exiting}
            >
              Like
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
