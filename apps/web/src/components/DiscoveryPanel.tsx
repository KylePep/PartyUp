import { useEffect, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { SwipeCard } from './cards/SwipeCard'
import { DiscoveryFilterMenu } from './DiscoveryFilterMenu'
import { Spinner, EmptyState } from './ui'
import type { GameFieldDefinition } from '../api/endpoints/games'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character | null | 'loading'
  onMatch: () => void
  gamePlatforms?: string[]
  filters: Record<string, string>
  activePlatforms: string[]
  onFiltersChange: (key: string, value: string) => void
  onPlatformChange: (platforms: string[]) => void
  fields: GameFieldDefinition[]
}

export function DiscoveryPanel({
  gameId,
  myCharacter,
  onMatch,
  gamePlatforms = [],
  filters,
  activePlatforms,
  onFiltersChange,
  onPlatformChange,
  fields,
}: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')

  useEffect(() => {
    setStatus('loading')
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '')
    )
    discoverCharacters(
      gameId,
      activeFilters,
      activePlatforms.length > 0 ? activePlatforms : undefined
    )
      .then(chars => {
        setQueue(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId, filters, activePlatforms])

  async function handleInteract(type: 'Like' | 'Dislike') {
    const current = queue[0]
    if (!current || !myCharacter || myCharacter === 'loading') return
    try {
      const res = await interactWithCharacter(myCharacter.id, current.id, type)
      if (res.isMatch) onMatch()
    } catch { /* fail silently */ }
    setQueue(q => {
      const next = q.slice(1)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }

  if (!myCharacter || myCharacter === 'loading') {
    return <EmptyState message="Create a character to start matching" />
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop filter menu — hidden on mobile (mobile version rendered by RealmPage above CharacterPanel) */}
      <div className="hidden lg:block">
        <DiscoveryFilterMenu
          fields={fields}
          gamePlatforms={gamePlatforms}
          filters={filters}
          activePlatforms={activePlatforms}
          onChange={onFiltersChange}
          onPlatformChange={onPlatformChange}
        />
      </div>

      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner label="Scanning the realm..." /></div>
      )}

      {(status === 'empty' || status === 'error') && (
        <EmptyState
          message={status === 'empty' ? 'All caught up — check back later.' : 'Could not load players.'}
        />
      )}

      {status === 'ready' && (
        <div className="relative" style={{ height: '520px' }}>
          {queue.slice(0, 2).map((char, i) => (
            <SwipeCard
              key={char.id}
              character={char}
              onLike={() => handleInteract('Like')}
              onDislike={() => handleInteract('Dislike')}
              isTop={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
