import { useNavigate } from 'react-router-dom'
import { Button } from '../ui'
import { FlippableCard } from './FlippableCard'
import { StandardTcgCard } from './StandardTcgCard'
import type { Character } from '../../api/endpoints/characters'

interface MatchCardProps {
  character: Character
  gameName: string
  matchedAt: string
  matchId: string
  isNew?: boolean
  className?: string
  onSelect?: (character: Character) => void
}


function MatchFront({ character }: MatchCardProps) {

  const classField = character.gameFields.find(gf => gf.commonField === 'class_slot')
  const levelField = character.gameFields.find(gf => gf.commonField === 'level_slot')
  const roleField = character.gameFields.find(gf => gf.commonField === 'role_slot')
  const factionField = character.gameFields.find(gf => gf.commonField === 'faction_slot')
  const buildField = character.gameFields.find(gf => gf.commonField === 'build_slot')
  const serverField = character.gameFields.find(gf => gf.commonField === 'server_slot')
  const playstyleField = character.gameFields.find(gf => gf.commonField === 'playstyle_slot')

  const statsContent = [character.gameName, classField?.value].filter(Boolean).join(' · ')
  const statsLine = statsContent ? (
    <span className="text-[0.625rem] text-muted font-semibold">{statsContent}</span>
  ) : undefined

  const topBioContent = [roleField?.value, factionField?.value, buildField?.value, serverField?.value, playstyleField?.value].filter(Boolean).join(' · ')

  return (
    <StandardTcgCard
      name={character.name}
      platform={character.platform}
      imageUrl={character.imageUrl}
      cardBackgroundColor={character.cardBackgroundColor}
      statsLine={statsLine}
      textBody={
        <>
          <p className="text-[0.625rem] text-muted mb-2">{topBioContent}</p>
          {character.bio ? <p className="text-[0.625rem] text-muted line-clamp-3">{character.bio}</p> : undefined}
        </>
      }
      bottomStat={
        <div className="flex w-full justify-end text-[0.625rem]">
          {/* <span>
            ↑ Tap for more
          </span> */}
          {levelField?.value}
        </div>
      }
      className="h-full w-full"
    >
    </StandardTcgCard>
  )
}

function MatchBack({ character, gameName, matchedAt, matchId }: MatchCardProps) {
  const navigate = useNavigate()
  const date = new Date(matchedAt).toLocaleDateString()
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden border-black bg-black/80 border-[6px]"
    >
      <div className="h-full px-4 py-3 mb-1 md:mb-2 overflow-y-auto overflow-x-hidden">
        <p className="font-display font-bold text-text text-sm md:text-lg">{character.name}</p>
        <p className="text-xxs md:text-sm text-muted mb-1">{character.platformHandle}</p>
        <p className="text-xxs md:text-sm text-muted mb-1">{gameName}</p>
        <p className="text-xxs md:text-sm text-muted mb-1">{character.platform}</p>

        {character.bio && (
          <div className="mb-3">
            <span className="text-xxs md:text-xs mb-1">Bio</span>
            <p className="text-xs md:text-sm text-muted leading-relaxed">{character.bio}</p>
          </div>
        )}

        {character.additionalNotes && (
          <div className="mb-3">
            <span className="text-xxs md:text-xs mb-1">Notes</span>
            <p className="text-xs md:text-sm text-muted leading-relaxed">{character.additionalNotes}</p>
          </div>
        )}
        <p className="text-xs text-muted mt-3">Matched {date}</p>
      </div>
      <div className="px-4 pb-2 flex justify-center" style={{ position: 'relative', zIndex: 20 }}>
        <Button size="sm" variant="primary" onClick={() => navigate(`/matches?id=${matchId}`)}>
          View Match →
        </Button>
      </div>
      <p className="text-xs text-muted text-center py-2" style={{ opacity: 0.5 }}>tap to flip back</p>
    </div>
  )
}

export function MatchCard({ character, gameName, matchedAt, matchId, isNew, onSelect, className }: MatchCardProps) {
  return (
    <div className={`${className} ${isNew ? 'ring-2 ring-green-500 rounded-xl' : ''}`}>
      <FlippableCard
        className="h-min aspect-3/4 md:aspect-4/5 md:h-full"
        front={<MatchFront character={character} gameName={gameName} matchedAt={matchedAt} matchId={matchId} />}
        back={<MatchBack character={character} gameName={gameName} matchedAt={matchedAt} matchId={matchId} />}
        onFrontClick={onSelect ? () => onSelect(character) : undefined}
      />
    </div>
  )
}
