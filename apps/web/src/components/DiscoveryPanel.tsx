import { useEffect, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { useFieldDefinitions } from '../hooks/useFieldDefinitions'
import { SwipeCard } from './cards/SwipeCard'
import { DiscoveryFilters } from './DiscoveryFilters'
import { Spinner, EmptyState } from './ui'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character | null | 'loading'
  onMatch: () => void
  gamePlatforms?: string[]
}

export function DiscoveryPanel({ gameId, myCharacter, onMatch, gamePlatforms = [] }: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [activePlatforms, setActivePlatforms] = useState<string[]>(gamePlatforms)
  const { data: fieldDefs } = useFieldDefinitions(gameId)

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (value === '') {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

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

  const filterableFields = fieldDefs?.schemaStatus === 'Generated'
    ? fieldDefs.fields.filter(f => f.isFilterable && f.type === 'Select')
    : []

  const showFilters = filterableFields.length > 0 || gamePlatforms.length > 0

  return (
    <div className="flex flex-col gap-4">
      {showFilters && (
        <DiscoveryFilters
          fields={filterableFields}
          activeFilters={filters}
          onChange={handleFilterChange}
          gamePlatforms={gamePlatforms}
          activePlatforms={activePlatforms}
          onPlatformChange={setActivePlatforms}
        />
      )}

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
