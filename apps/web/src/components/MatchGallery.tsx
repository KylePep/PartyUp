import { useEffect, useState } from 'react'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { MatchCard } from './cards/MatchCard'
import { EmptyState, Spinner } from './ui'

interface MatchGalleryProps {
  matches?: CharacterMatchDto[]
  selectedId?: string | null
  onSelect?: (match: CharacterMatchDto) => void
  gameId?: string | null
  limit?: number
}

export function MatchGallery({ matches: providedMatches, gameId, limit, onSelect }: MatchGalleryProps) {
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

  useEffect(() => {
    if (providedMatches) {
      setMatches(providedMatches)
      setStatus(providedMatches.length ? 'ready' : 'empty')
      return
    }

    setStatus('loading')
    if (gameId != null)
      getMatches(gameId)
        .then(m => {
          setMatches(m)
          setStatus(m.length ? 'ready' : 'empty')
        })
        .catch(() => setStatus('error'))
  }, [providedMatches, gameId])

  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  if (status === 'empty') {
    return <EmptyState message="No matches yet — keep swiping!" />
  }

  if (status === 'error') {
    return <EmptyState message="Could not load matches" />
  }

  const displayed = limit !== undefined ? matches.slice(0, limit) : matches

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 h-full">
      {displayed.map(m => (
        <MatchCard
          key={m.matchId}
          matchId={m.matchId}
          character={m.theirCharacter}
          gameName={m.gameName}
          matchedAt={m.matchedAt}
          onSelect={onSelect ? () => onSelect(m) : undefined}
        />
      ))}
    </div>
  )
}
