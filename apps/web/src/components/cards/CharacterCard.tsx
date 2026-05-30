import { useNavigate } from 'react-router-dom'
import { Badge } from '../ui'
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

  const subtitle = [character.gameName,].filter(Boolean).join(' · ') || undefined

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
      subtitle={subtitle}
      imageUrl={character.imageUrl}
      statsLine={statsLine}
      textBody={character.bio ? <p className="text-xs text-muted line-clamp-3">{character.bio}</p> : undefined}
      onClick={handleClick}
    />
  )
}
