import { useEffect, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { SwipeCard } from './cards/SwipeCard'
import { Spinner, EmptyState } from './ui'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character | null | 'loading'
  onMatch: () => void
}

export function DiscoveryPanel({ gameId, myCharacter, onMatch }: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')

  useEffect(() => {
    setStatus('loading')
    discoverCharacters(gameId)
      .then(chars => {
        setQueue(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId])

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

  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner label="Scanning the realm..." /></div>
  }

  if (status === 'empty' || status === 'error') {
    return (
      <EmptyState
        message={status === 'empty' ? 'All caught up — check back later.' : 'Could not load players.'}
      />
    )
  }

  return (
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
  )
}
