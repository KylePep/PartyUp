import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import { FlippableCard } from './FlippableCard'
import { StandardTcgCard } from './StandardTcgCard'
import type { Character } from '../../api/endpoints/characters'

interface MatchCardProps {
  character: Character
  gameName: string
  matchedAt: string
  matchId: string
  onSelect?: (character: Character) => void
}


function MatchFront({ character }: MatchCardProps) {

  const classField = character.gameFields.find(gf => gf.commonField === 'class_slot')
  const levelField = character.gameFields.find(gf => gf.commonField === 'level_slot')

  const statsContent = [character.gameName, classField?.value].filter(Boolean).join(' · ')
  const statsLine = statsContent ? (
    <span className="text-xs text-muted font-semibold">{statsContent}</span>
  ) : undefined

  return (
    <StandardTcgCard
      name={character.name}
      platform={character.platform}
      imageUrl={character.imageUrl}
      statsLine={statsLine}
      textBody={character.bio ? <p className="text-xs text-muted line-clamp-3">{character.bio}</p> : undefined}
      bottomStat={levelField?.value}
      className="w-full h-full"
    >
      <p className="text-xs text-muted text-center" style={{ opacity: 0.5 }}>↑ tap for more</p>
    </StandardTcgCard>
  )
}

function MatchBack({ character, gameName, matchedAt, matchId }: MatchCardProps) {
  const navigate = useNavigate()
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
            <div className="grid grid-cols-1 gap-1">
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
      <div className="px-4 pb-2 flex justify-end" style={{ position: 'relative', zIndex: 20 }}>
        <Button size="sm" variant="ghost" onClick={() => navigate(`/matches?id=${matchId}`)}>
          View Match →
        </Button>
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
}

export function MatchCard({ character, gameName, matchedAt, matchId, onSelect }: MatchCardProps) {
  return (
    <div className="min-h-50">
      <FlippableCard
        front={<MatchFront character={character} gameName={gameName} matchedAt={matchedAt} matchId={matchId} />}
        back={<MatchBack character={character} gameName={gameName} matchedAt={matchedAt} matchId={matchId} />}
        onFrontClick={onSelect ? () => onSelect(character) : undefined}
        className="h-full"
      />
    </div>
  )
}
