import { useNavigate } from 'react-router-dom'
import type { Character } from '../../api/endpoints/characters'
import { StandardTcgCard } from './StandardTcgCard'
import { NewMatchDot } from '../ui/NewMatchDot'

interface CharacterCardProps {
  character: Character
  className: string
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
  onSelect?: (character: Character) => void
}

export function CharacterCard({ character, onSelect, className }: CharacterCardProps) {
  const navigate = useNavigate()

  function handleClick() {
    if (onSelect) onSelect(character)
    else navigate(`/characters/${character.id}`)
  }

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
    <div className="relative flex flex-col flex-1 min-h-0">
      {character.hasNewMatch && <NewMatchDot />}
      <StandardTcgCard
        className={className}
        name={character.name}
        cardBackgroundColor={character.cardBackgroundColor}
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
          <div className="flex w-full justify-end">
            {levelField?.value}
          </div>
        }
        onClick={handleClick}
      />
    </div>
  )
}
