import { useState } from 'react'
import { Badge, Button } from '../ui'
import { type DiscoverCharacter } from '../../api/endpoints/characters'
import { FlippableCard } from './FlippableCard'
import { FullArtTcgCard } from './FullArtTcgCard'

type ExitDirection = 'left' | 'right' | null

interface SwipeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
  isTop: boolean
}

function SwipeFront({ character }: { character: DiscoverCharacter }) {
  return (
    <FullArtTcgCard
      name={character.name}
      platform={character.platform}
      imageUrl={character.imageUrl}
      className="w-full h-full"
    >
      <div className="flex flex-wrap gap-1 mb-1">
        {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
        {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
        {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        {character.region && <Badge variant="region">{character.region}</Badge>}
        {character.playstyle && <Badge>{character.playstyle}</Badge>}
      </div>
      {character.bio && (
        <p className="text-xs text-white/80 line-clamp-2 mb-1">{character.bio}</p>
      )}
      <p className="text-xs text-white/50 text-center">↑ tap for more</p>
    </FullArtTcgCard>
  )
}

function SwipeBack({ character }: { character: DiscoverCharacter }) {
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: '#000', border: '4px solid black' }}
    >
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <p className="font-display font-bold text-text text-lg mb-3">{character.name}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
          {character.mainRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Role</span>
              <Badge variant="role">{character.mainRole}</Badge>
            </div>
          )}
          {character.secondaryRole && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Alt Role</span>
              <Badge variant="role">{character.secondaryRole}</Badge>
            </div>
          )}
          {character.rank && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Rank</span>
              <Badge variant="rank">{character.rank}</Badge>
            </div>
          )}
          {character.region && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Region</span>
              <Badge variant="region">{character.region}</Badge>
            </div>
          )}
          {character.playstyle && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Playstyle</span>
              <Badge>{character.playstyle}</Badge>
            </div>
          )}
          {character.usesVoiceChat != null && (
            <div>
              <span className="text-xs text-muted block mb-0.5">Voice</span>
              <Badge>{character.usesVoiceChat ? 'Yes' : 'No'}</Badge>
            </div>
          )}
        </div>
        {character.preferredModes.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Modes</span>
            <div className="flex flex-wrap gap-1">
              {character.preferredModes.map(m => <Badge key={m}>{m}</Badge>)}
            </div>
          </div>
        )}
        {character.languages && character.languages.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Languages</span>
            <div className="flex flex-wrap gap-1">
              {character.languages.map(l => <Badge key={l}>{l}</Badge>)}
            </div>
          </div>
        )}
        {character.gameFields.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Game Fields</span>
            <div className="grid grid-cols-2 gap-1">
              {character.gameFields.map(f => (
                <div key={f.key} className="text-xs">
                  <span className="text-muted">{f.label}: </span>
                  <span className="text-text">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {character.bio && (
          <div>
            <span className="text-xs text-muted block mb-1">Bio</span>
            <p className="text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
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
      className={`absolute inset-0 flex flex-col ${animClass}`}
      style={{
        zIndex: isTop ? 2 : 1,
        transform: isTop ? undefined : 'scale(0.97) translateY(8px)',
      }}
    >
      <FlippableCard
        front={<SwipeFront character={character} />}
        back={<SwipeBack character={character} />}
        className="flex-1 min-h-0"
      />
      {isTop && (
        <div className="flex gap-3 flex-shrink-0 mt-2">
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
    </div>
  )
}
