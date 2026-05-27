import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../ui'
import type { Character } from '../../api/endpoints/characters'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden cursor-pointer transition-all hover:brightness-110"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      onClick={() => navigate(`/characters/${character.id}`)}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <span className="font-display font-semibold text-text text-sm truncate">{character.name}</span>
        {character.platformHandle && (
          <span className="text-xs font-mono text-muted ml-2 flex-shrink-0 truncate max-w-[50%]">
            {character.platformHandle}
          </span>
        )}
      </div>
      {/* Art box */}
      <div
        className="mx-3 h-28 overflow-hidden rounded-md"
        style={{ border: '1px solid var(--color-border)' }}
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
      {/* Bottom panel */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        </div>
        {(onEdit || onDelete) && (
          <div
            className="flex gap-1 flex-shrink-0"
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
