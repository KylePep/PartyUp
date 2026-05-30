import { useNavigate } from 'react-router-dom'
import type { Character } from '../../api/endpoints/characters'
import { StandardTcgCard } from './StandardTcgCard'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
  onSelect?: (character: Character) => void
}

export function CharacterCard({ character, onSelect }: CharacterCardProps) {
  const navigate = useNavigate()

  function handleClick() {
    if (onSelect) onSelect(character)
    else navigate(`/characters/${character.id}`)
  }

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
      onClick={handleClick}
    />
  )
}
