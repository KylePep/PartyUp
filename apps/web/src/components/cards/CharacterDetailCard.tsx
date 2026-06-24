import { Badge, Button, PlatformIcon } from '../ui'
import type { Character } from '../../api/endpoints/characters'

function stableCardShine(seed: string): string {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  }
  const shineAngle = ((h & 0xFF) % 120) + 90
  const shinePos = (((h >> 8) & 0xFF) % 50) + 20
  const baseAngle = (((h >> 16) & 0xFF) % 80) + 110
  return [
    `linear-gradient(${shineAngle}deg, transparent ${shinePos - 25}%, rgba(255,255,255,0.42) ${shinePos}%, rgba(255,255,255,0.18) ${shinePos + 8}%, transparent ${shinePos + 20}%)`,
    `linear-gradient(${baseAngle}deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.28) 100%)`,
  ].join(', ')
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col md:flex-row justify-between gap-1 md:gap-2 py-2"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <span className="text-xxs md:text-xs text-muted uppercase tracking-widest flex-shrink-0 md:pt-0.5">
        {label}
      </span>
      <div className="flex flex-wrap text-wrap gap-1 min-w-0">{children}</div>
    </div>
  )
}

interface CharacterDetailCardProps {
  character: Character
  onDelete?: () => void
  onEdit?: () => void
  deleting?: boolean
}

export function CharacterDetailCard({ character, onDelete, onEdit, deleting }: CharacterDetailCardProps) {

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden p-2 md:p-4 gap-1 md:gap-2 border-4 md:border-8 border-off-black"
      style={{
        backgroundColor: character.cardBackgroundColor || 'var(--color-surface)',
        backgroundImage: character.cardBackgroundColor ? stableCardShine(character.name) : undefined,
        backgroundBlendMode: character.cardBackgroundColor ? 'soft-light, overlay' : undefined,
      }}
    >

      {/* Hero — pinned */}
      <div
        className="flex flex-col gap-1 md:gap-2 flex-shrink-0"
      >
        <div className='flex flex-col gap-1'>
          <div className="flex justify-between md:items-center bg-off-black rounded-sm px-2 py-1">
            <h1 className="font-display font-bold text-normal md:text-2xl text-text">{character.name}</h1>
            <span className="w-6 h-6 [&_svg]:w-6 [&_svg]:h-6 md:[&_svg]:w-[22px] md:[&_svg]:h-[22px]">
              {character.platform && <PlatformIcon platform={character.platform} />}
            </span>
          </div>
          <div className="flex justify-between md:items-center gap-6 bg-off-black/90 rounded-sm px-2 py-1">
            {character.platformHandle && (
              <p className="font-mono text-text text-xxs md:text-xs">{character.platformHandle}</p>
            )}
          </div>
        </div>
        <div
          className="w-full h-32 md:h-48 rounded-lg overflow-hidden flex-shrink-0"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {character.imageUrl ? (
            <img
              src={character.imageUrl}
              alt={character.name}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
              style={{ backgroundColor: 'var(--color-surface-raised)' }}
            >
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className='flex flex-col md:flex-row justify-start md:justify-between bg-off-black rounded-sm px-2 py-1 mb-1 md:mb-2'>
            {character.gameName && (
              <p className="text-xs text-off-white font-display">{character.gameName}</p>
            )}
            <div className="flex items-center">
              <span className="text-xs text-muted">{character.platform}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-off-black rounded-sm px-2 py-1">
            {character.usesVoiceChat && <Badge variant="role">{character.usesVoiceChat ? 'Voice Chat' : 'No Voice Chat'}</Badge>}
            {character.languages && character.languages.length > 0 && (
              <>
                {character.languages.map(l => <Badge key={l}>{l + " "}</Badge>)}
              </>
            )}
            {character.timeZone && <Badge variant="region">{character.timeZone}</Badge>}
            {character.activeTimes && character.activeTimes.length > 0 && (
              <>
                {character.activeTimes.map(l => <Badge variant='rank' key={l}>{l + " "}</Badge>)}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable details */}
      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto bg-off-black rounded-sm rounded-sm">
        {/* Bio section */}
        {character.bio && (
          <div
            className="px-2 md:px-4 pt-3 pb-1"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-xxs md:text-xs text-muted uppercase tracking-widest">Bio</h2>
            <p className="text-xs md:text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}

        {/* Game Fields section */}
        {character.gameFields.length > 0 && (
          <div
            className="px-2 md:px-4 pb-1"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            {character.gameFields.map(f => (
              <StatRow key={f.key} label={f.label}>
                <span className="text-xs md:text-sm text-text break-all">{f.value}</span>
              </StatRow>
            ))}
          </div>
        )}



      </div>

      {/* Action bar — pinned */}
      {onEdit || onDelete ? (
        <div
          className="flex items-center justify-end  flex-shrink-0"
        >
          <div className='flex gap-3 md:gap-4  rounded-sm '>
            {onEdit && (
              <Button variant="primary" size="sm" onClick={onEdit}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="danger" size="sm" disabled={deleting} onClick={onDelete}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      ) : null}

    </div>
  )
}
