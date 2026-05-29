import { Badge } from '../ui'
import type { CharacterSummary } from '../../api/endpoints/matches'
import { FlippableCard } from './FlippableCard'

interface MatchCardProps {
  character: CharacterSummary
  gameName: string
  matchedAt: string
}

function MatchFront({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden border-black border-6 bg-black"
    >
      {/* Nameplate top bar — fixed height, platform handle primary */}
      <div
        className="h-[52px] flex flex-col justify-center px-3 flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <p className="font-display font-bold text-text text-sm truncate leading-tight">{character.platformHandle}</p>
        <p className="text-xs text-muted truncate leading-tight">{character.name}</p>
      </div>
      {/* Art box — fixed height, full card width */}
      <div
        className=" flex-shrink-0 overflow-hidden"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-4xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* Bottom panel — takes remaining space */}
      <div className="flex-1 px-3 pt-2 pb-2 flex flex-col overflow-hidden">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
        </div>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-2 flex-1">{character.bio}</p>
        )}
        <p className="text-xs text-muted mt-auto" style={{ opacity: 0.5 }}>
          {gameName} · Matched {date}
        </p>
        <p className="text-xs text-muted text-center" style={{ opacity: 0.5 }}>↑ tap for more</p>
      </div>
    </div>
  )
}

function MatchBack({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden border-black border-6"
    >
      <div className="px-4 py-3 flex-1 overflow-y-auto overflow-x-hidden">
        <p className="font-display font-bold text-text text-lg">{character.platformHandle}</p>
        <p className="text-sm text-muted mb-3">{character.name} · {gameName}</p>
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
        </div>
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
        <p className="text-xs text-muted mt-3">Matched {date}</p>
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
}

export function MatchCard({ character, gameName, matchedAt }: MatchCardProps) {
  return (
    <div className="min-h-50">
      <FlippableCard
        front={<MatchFront character={character} gameName={gameName} matchedAt={matchedAt} />}
        back={<MatchBack character={character} gameName={gameName} matchedAt={matchedAt} />}
        className="h-full"
      />
    </div>
  )
}
