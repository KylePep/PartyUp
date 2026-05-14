import { useEffect, useState } from 'react'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { MatchCard } from './cards/MatchCard'
import { EmptyState, Spinner } from './ui'

interface MatchGalleryProps {
  gameId?: string
}

export function MatchGallery({ gameId }: MatchGalleryProps) {
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

  useEffect(() => {
    setStatus('loading')
    getMatches(gameId)
      .then(m => {
        setMatches(m)
        setStatus(m.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId])

  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  if (status === 'empty') {
    return <EmptyState message="No matches yet — keep swiping!" />
  }

  if (status === 'error') {
    return <EmptyState message="Could not load matches" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map(m => (
        <MatchCard
          key={m.matchId}
          character={m.theirCharacter}
          matchedAt={m.matchedAt}
        />
      ))}
    </div>
  )
}
