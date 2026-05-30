import { Badge } from '../ui'
import { FlippableCard } from './FlippableCard'
import { StandardTcgCard } from './StandardTcgCard'
import type { Character } from '../../api/endpoints/characters'

interface MatchCardProps {
  character: Character
  gameName: string
  matchedAt: string
  onSelect?: (character: Character) => void
}


function MatchFront({ character }: MatchCardProps) {

  const hasStats = character.mainRole || character.rank || character.usesVoiceChat != null || character.region || character.languages?.length
  const statsLine = hasStats ? (
    <div className="flex flex-wrap gap-1.5">
      {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
      {character.rank && <Badge variant="rank">{character.rank}</Badge>}
      {character.usesVoiceChat != null && (
        <Badge>{character.usesVoiceChat ? 'Voice ✓' : 'Voice ✗'}</Badge>
      )}
      {character.region && <Badge variant="region">{character.region}</Badge>}
      {character.languages?.[0] && <Badge>{character.languages[0]}</Badge>}
    </div>
  ) : undefined

  return (
    <StandardTcgCard
      name={character.name}
      platform={character.platform}
      subtitle={character.gameName}
      imageUrl={character.imageUrl}
      statsLine={statsLine}
      textBody={character.bio ? <p className="text-xs text-muted line-clamp-3">{character.bio}</p> : undefined}
      className="w-full h-full"
    >
      <p className="text-xs text-muted text-center" style={{ opacity: 0.5 }}>↑ tap for more</p>
    </StandardTcgCard>
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
        <p className="text-sm text-muted mb-1">{character.name}</p>
        <p className="text-sm text-muted mb-1">{gameName}</p>
        <p className="text-sm text-muted mb-1">{character.platform}</p>
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

export function MatchCard({ character, gameName, matchedAt, onSelect }: MatchCardProps) {
  return (
    <div className="min-h-50">
      <FlippableCard
        front={<MatchFront character={character} gameName={gameName} matchedAt={matchedAt} />}
        back={<MatchBack character={character} gameName={gameName} matchedAt={matchedAt} />}
        onFrontClick={onSelect ? () => onSelect(character) : undefined}
        className="h-full"
      />
    </div>
  )
}
