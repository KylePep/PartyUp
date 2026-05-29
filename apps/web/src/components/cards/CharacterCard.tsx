import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import type { Character } from '../../api/endpoints/characters'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
  onSelect?: (character: Character) => void
}

export function CharacterCard({ character, onEdit, onDelete, onSelect }: CharacterCardProps) {
  const navigate = useNavigate()

  function handleBodyClick() {
    if (onSelect) {
      onSelect(character)
    } else {
      navigate(`/characters/${character.id}`)
    }
  }

  return (
    <div
      className="h-[472px] rounded-xl flex flex-col overflow-hidden cursor-pointer transition-all hover:brightness-110"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
      }}
      onClick={handleBodyClick}
    >
      {/* Nameplate top bar — fixed height */}
      <div
        className="h-[52px] flex items-center justify-between px-3 flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span className="font-display font-semibold text-text text-sm truncate">{character.name}</span>
        {character.platformHandle && (
          <span className="text-xs font-mono text-muted ml-2 flex-shrink-0 truncate max-w-[50%]">
            {character.platformHandle}
          </span>
        )}
      </div>
      {/* Art box — fixed height, full card width */}
      <div
        className="h-[300px] flex-shrink-0 overflow-hidden"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-2xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* Bottom panel — takes remaining space (~120px) */}
      <div className="flex-1 px-3 py-2 flex flex-col overflow-hidden">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        </div>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-2 flex-1">{character.bio}</p>
        )}
        {(onEdit || onDelete) && (
          <div
            className="flex gap-1 mt-auto flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            {onEdit && (
              <Button
                variant="secondary"
                className="text-xs px-2 py-1"
                onClick={() => onEdit(character)}
              >
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
      </div>
    </div>
  )
}
