import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import type { Character } from '../../api/endpoints/characters'
import { StandardTcgCard } from './StandardTcgCard'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
  onSelect?: (character: Character) => void
}

export function CharacterCard({ character, onEdit, onDelete, onSelect }: CharacterCardProps) {
  const navigate = useNavigate()

  function handleClick() {
    if (onSelect) onSelect(character)
    else navigate(`/characters/${character.id}`)
  }

  const subtitle = [character.region, character.languages?.[0]].filter(Boolean).join(' · ') || undefined

  const statsLine = (character.mainRole || character.rank || character.usesVoiceChat != null) ? (
    <div className="flex flex-wrap gap-1.5">
      {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
      {character.rank && <Badge variant="rank">{character.rank}</Badge>}
      {character.usesVoiceChat != null && (
        <Badge>{character.usesVoiceChat ? 'Voice ✓' : 'Voice ✗'}</Badge>
      )}
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
    >
      {(onEdit || onDelete) && (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {onEdit && (
            <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => onEdit(character)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="secondary"
              className="text-xs px-2 py-1 text-danger border-danger/50 hover:bg-danger hover:text-white"
              onClick={() => onDelete(character)}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </StandardTcgCard>
  )
}
