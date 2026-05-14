import { Badge, Card } from '../ui'

interface CharacterDisplayProps {
  id: string
  name: string
  bio?: string
  playstyle?: string
  rank?: string
  region?: string
  mainRole?: string
  secondaryRole?: string
  imageUrl?: string
  platformHandle?: string
}

interface CharacterCardProps {
  character: CharacterDisplayProps
  gameId?: string
}

export function CharacterCard({ character }: CharacterCardProps) {
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
        <div className="min-w-0">
          <p className="font-display font-semibold text-text text-sm truncate">{character.name}</p>
          {character.platformHandle && (
            <p className="text-xs text-muted font-mono truncate">{character.platformHandle}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
        {character.rank && <Badge variant="rank">{character.rank}</Badge>}
        {character.region && <Badge variant="region">{character.region}</Badge>}
      </div>
      {character.bio && (
        <p className="text-xs text-muted line-clamp-2">{character.bio}</p>
      )}
    </Card>
  )
}
