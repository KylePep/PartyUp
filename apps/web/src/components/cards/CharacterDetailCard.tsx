import { Badge, Button, PlatformIcon } from '../ui'
import type { Character } from '../../api/endpoints/characters'

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-4 py-2"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <span className="text-xs text-muted uppercase tracking-widest w-28 flex-shrink-0 pt-0.5">
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
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '2px solid var(--color-accent)',
        boxShadow: '0 0 24px rgba(124, 111, 205, 0.25)',
      }}
    >

      {/* Hero — pinned */}
      <div
        className="flex flex-col md:flex-row gap-6 p-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-full md:w-40 h-52 rounded-lg overflow-hidden flex-shrink-0"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {character.imageUrl ? (
            <img
              src={character.imageUrl}
              alt={character.name}
              className="w-full h-full object-cover"
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
          <h1 className="font-display font-bold text-2xl text-text mb-1">{character.name}</h1>
          {character.platformHandle && (
            <p className="font-mono text-muted text-sm mb-1">{character.platformHandle}</p>
          )}
          {character.gameName && (
            <p className="text-xs text-accent font-display mb-0.5">{character.gameName}</p>
          )}
          <div className="flex items-center gap-2 mb-3">
            <PlatformIcon platform={character.platform} size={22} />
            <span className="text-xs text-muted">{character.platform}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto">

        {/* Game Fields section */}
        {character.gameFields.length > 0 && (
          <div
            className="px-4 pt-3 pb-1 grid-cols-1 md:grid grid-cols-2"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-xs text-muted uppercase tracking-widest mb-1 col-span-2">Game Fields</h2>
            {character.gameFields.map(f => (
              <StatRow key={f.key} label={f.label}>
                <span className="text-sm text-text break-all">{f.value}</span>
              </StatRow>
            ))}
          </div>
        )}

        {/* Bio section */}
        {character.bio && (
          <div className="px-4 py-3">
            <h2 className="text-xs text-muted uppercase tracking-widest mb-2">Bio</h2>
            <p className="text-sm text-text leading-relaxed">{character.bio}</p>
          </div>
        )}

      </div>

      {/* Action bar — pinned */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit Character
            </Button>
          )}
        </div>
        <div>
          {onDelete && (
            <Button variant="danger" size="sm" disabled={deleting} onClick={onDelete}>
              {deleting ? 'Deleting...' : 'Delete Character'}
            </Button>
          )}
        </div>
      </div>

    </div>
  )
}
