import { useCallback, useEffect, useRef, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { useDebounce } from '../hooks/useDebounce'
import { SwipeCard } from './cards/SwipeCard'
import { Spinner, EmptyState } from './ui'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character
  onMatch: () => void
  filters: Record<string, string>
  activePlatforms: string[]
}

const PAGE_SIZE = 20
const REFETCH_THRESHOLD = 2

export function DiscoveryPanel({
  gameId,
  myCharacter,
  onMatch,
  filters,
  activePlatforms,
}: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const loadingMore = useRef(false)

  const debouncedFilters = useDebounce(filters, 400)
  const debouncedPlatforms = useDebounce(activePlatforms, 400)

  const loadPage = useCallback(async (pageNum: number, replace: boolean) => {
    if (loadingMore.current) return
    loadingMore.current = true

    const activeFilters = Object.fromEntries(
      Object.entries(debouncedFilters).filter(([, v]) => v !== '')
    )

    try {
      const result = await discoverCharacters(
        gameId,
        activeFilters,
        debouncedPlatforms.length > 0 ? debouncedPlatforms : undefined,
        pageNum,
        PAGE_SIZE
      )
      setHasMore(result.hasMore)
      setPage(pageNum)
      if (replace) {
        setQueue(result.items)
        setStatus(result.items.length === 0 ? 'empty' : 'ready')
      } else {
        setQueue(prev => {
          const next = [...prev, ...result.items]
          if (next.length === 0) setStatus('empty')
          return next
        })
      }
    } catch {
      if (replace) setStatus('error')
    } finally {
      loadingMore.current = false
    }
  }, [gameId, debouncedFilters, debouncedPlatforms])

  // Reset and load page 1 when filters or game change
  useEffect(() => {
    setStatus('loading')
    setQueue([])
    setPage(1)
    setHasMore(false)
    loadingMore.current = false
    loadPage(1, true)
  }, [loadPage])

  // Prefetch next page when queue runs low
  useEffect(() => {
    if (queue.length <= REFETCH_THRESHOLD && hasMore && status === 'ready') {
      loadPage(page + 1, false)
    }
  }, [queue.length, hasMore, status, page, loadPage])

  async function handleInteract(type: 'Like' | 'Dislike') {
    const current = queue[0]
    if (!current) return
    try {
      const res = await interactWithCharacter(myCharacter.id, current.id, type)
      if (res.isMatch) onMatch()
    } catch (err) {
      console.error(`Failed to ${type.toLowerCase()} character:`, err)
    }
    setQueue(q => {
      const next = q.slice(1)
      if (next.length === 0 && !hasMore) setStatus('empty')
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full gap-4">
      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner label="Scanning the realm..." /></div>
      )}

      {(status === 'empty' || status === 'error') && (
        <EmptyState
          message={status === 'empty' ? 'All caught up — check back later.' : 'Could not load players.'}
        />
      )}

      {status === 'ready' && (
        <div className="relative mx-auto w-full h-full min-h-0">
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
