import { useNavigate } from 'react-router-dom'
import type { Character } from '../../api/endpoints/characters'
import { StandardTcgCard } from './StandardTcgCard'

interface CharacterCardProps {
  character: Character
  gameName: string
  matchedAt: string
  matchId: string
  className?: string
  isNew?: boolean
  onSelect?: (character: Character) => void
}

export function CollectionCard({ character, onSelect, className, isNew }: CharacterCardProps) {
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
    <span>{statsContent}</span>
  ) : undefined

  const topBioContent = [roleField?.value, factionField?.value, buildField?.value, serverField?.value, playstyleField?.value].filter(Boolean).join(' · ')

  return (
    <StandardTcgCard
      className={className}
      name={character.name}
      platform={character.platform}
      isNew={isNew}
      imageUrl={character.imageUrl}
      cardBackgroundColor={character.cardBackgroundColor}
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
  )
}
