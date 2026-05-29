import { Badge } from '../ui'
import type { CharacterSummary } from '../../api/endpoints/matches'
import { FlippableCard } from './FlippableCard'
import { StandardTcgCard } from './StandardTcgCard'

interface MatchCardProps {
  character: CharacterSummary
  gameName: string
  matchedAt: string
}

function MatchFront({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()

  const statsLine = (character.mainRole || character.rank || character.region || character.playstyle) ? (
    <div className="flex flex-wrap gap-1.5">
      {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
      {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
      {character.rank && <Badge variant="rank">{character.rank}</Badge>}
      {character.region && <Badge variant="region">{character.region}</Badge>}
      {character.playstyle && <Badge>{character.playstyle}</Badge>}
    </div>
  ) : undefined

  return (
    <StandardTcgCard
      name={character.platformHandle}
      platform={character.name}
      imageUrl={character.imageUrl}
      statsLine={statsLine}
      textBody={character.bio ? <p className="text-xs text-muted line-clamp-2">{character.bio}</p> : undefined}
      bottomStat={`${gameName} · ${date}`}
      className="w-full h-full"
    />
  )
}

function MatchBack({ character, gameName, matchedAt }: MatchCardProps) {
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden border-black border-[6px]"
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
