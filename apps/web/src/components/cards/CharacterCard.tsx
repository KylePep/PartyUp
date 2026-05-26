import { Badge, Button, Card } from '../ui'
import type { Character } from '../../api/endpoints/characters'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (character: Character) => void
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-raised flex-shrink-0 overflow-hidden">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-sm font-mono">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-text text-sm truncate">{character.name}</p>
          {character.platformHandle && (
            <p className="text-xs text-muted font-mono truncate">{character.platformHandle}</p>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 flex-shrink-0">
            {onEdit && (
              <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => onEdit(character)}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="secondary" className="text-xs px-2 py-1 text-danger border-danger/50 hover:bg-danger hover:text-white" onClick={() => onDelete(character)}>
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
        {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
        {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        {character.region && <Badge variant="region">{character.region}</Badge>}
        {character.playstyle && <Badge>{character.playstyle}</Badge>}
        {character.gameFields?.map(f => <Badge key={f.key}>{f.label}: {f.value}</Badge>)}
      </div>
      {character.bio && (
        <p className="text-xs text-muted line-clamp-2">{character.bio}</p>
      )}
    </Card>
  )
}
