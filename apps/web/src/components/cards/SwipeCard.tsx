import { useState } from 'react'
import { Badge, Button } from '../ui'
import { type DiscoverCharacter } from '../../api/endpoints/characters'
import { FlippableCard } from './FlippableCard'
import { StandardTcgCard } from './StandardTcgCard'

type ExitDirection = 'left' | 'right' | null

interface SwipeCardProps {
  character: DiscoverCharacter
  onLike: () => void
  onDislike: () => void
  isTop: boolean
}

function SwipeFront({ character }: { character: DiscoverCharacter }) {
  const classField = character.gameFields.find(gf => gf.commonField === 'class_slot')
  const levelField = character.gameFields.find(gf => gf.commonField === 'level_slot')
  const roleField = character.gameFields.find(gf => gf.commonField === 'role_slot')
  const factionField = character.gameFields.find(gf => gf.commonField === 'faction_slot')
  const buildField = character.gameFields.find(gf => gf.commonField === 'build_slot')
  const serverField = character.gameFields.find(gf => gf.commonField === 'server_slot')
  const playstyleField = character.gameFields.find(gf => gf.commonField === 'playstyle_slot')


  const statsContent = [character.gameName, classField?.value].filter(Boolean).join(' · ')
  const statsLine = statsContent ? (
    <span className="text-xs text-muted font-semibold">{statsContent}</span>
  ) : undefined

  const topBioContent = [roleField?.value, factionField?.value, buildField?.value, serverField?.value, playstyleField?.value].filter(Boolean).join(' · ')

  return (
    <StandardTcgCard
      name={character.name}
      platform={character.platform}
      imageUrl={character.imageUrl}
      statsLine={statsLine}
      textBody={
        <>
          <p className="text-xs text-muted mb-2">{topBioContent}</p>
          {character.bio ? <p className="text-xs text-muted line-clamp-3">{character.bio}</p> : undefined}
        </>
      }
      bottomStat={
        <div className="flex w-full justify-between">
          <span>
            ↑ Tap for more
          </span>
          {levelField?.value}
        </div>
      }
      className="w-full h-full"
    >

    </StandardTcgCard>
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
        {character.usesVoiceChat != null && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-0.5">Voice</span>
            <Badge>{character.usesVoiceChat ? 'Yes' : 'No'}</Badge>
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
            <div className="grid grid-cols-1 gap-1">
              {character.gameFields.map(f => (
                <div key={f.key} className="text-xs">
                  <span className="text-muted">{f.label}: </span>
                  <span className="text-text break-all">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {character.bio && (
          <div className="mb-3">
            <span className="text-xs text-muted block mb-1">Bio</span>
            <p className="text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}
        {character.additionalNotes && (
          <div>
            <span className="text-xs text-muted block mb-1">Notes</span>
            <p className="text-sm text-text leading-relaxed">{character.additionalNotes}</p>
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
      <div className="flex flex-1 items-center justify-center">
        <div className="h-full aspect-3/4">
          <FlippableCard
            front={<SwipeFront character={character} />}
            back={<SwipeBack character={character} />}
            className="h-full w-full"
          />
        </div>
      </div>
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
            className="flex-1 bg-success hover:bg-green-800"
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
