import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { markMatchViewed } from '../api/endpoints/matchNotifications'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { Gallery } from '../components/Gallery'
import { CollectionCard } from '../components/cards/CollectionCard'
import { TABS } from '../lib/tabs'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
import { PlanetIcon, UserSquareIcon } from '@phosphor-icons/react'
import { PaginationControls } from '../components/ui'

const PAGE_SIZE = 12

export default function MatchesPage() {
  const TAB = TABS.find(t => t.label === 'Collection')!
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected] = useState<CharacterMatchDto | null>(null)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')

  useEffect(() => {
    getMatches(page, PAGE_SIZE)
      .then(result => {
        setMatches(result.items)
        setTotalCount(result.totalCount)
        setStatus(result.totalCount === 0 ? 'empty' : 'ready')
        if (targetId && page === 1) {
          const match = result.items.find(m => m.matchId === targetId) ?? null
          setSelected(match)
          if (match) {
            setActiveSide('left')
            if (match.isNew) {
              markMatchViewed(match.matchId).then(() => {
                setMatches(prev =>
                  prev.map(m => m.matchId === match.matchId ? { ...m, isNew: false } : m)
                )
              })
            }
          }
        }
      })
      .catch(() => setStatus('error'))
  }, [targetId, page])

  function handleSelect(match: CharacterMatchDto) {
    setSelected(match)
    setActiveSide('left')
    if (match.isNew) {
      markMatchViewed(match.matchId).then(() => {
        setMatches(prev =>
          prev.map(m => m.matchId === match.matchId ? { ...m, isNew: false } : m)
        )
      })
    }
  }

  const leftContent = selected ? (
    <div className="flex flex-col md:flex-1 md:min-h-0">
      <div className="px-4 py-3 h-[64px] border-b-4 border-cyan-950/50">
        <div className='flex gap-4'>
          <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Match</p>
          <p className="text-xs text-muted">
            - {new Date(selected.matchedAt).toLocaleDateString()}
          </p>
        </div>
        <p className="font-display font-bold text-text">{selected.gameName}</p>
      </div>
      <div className="p-2 md:px-4 flex flex-col min-h-0 overflow-y-auto">
        <CharacterDetailCard character={selected.theirCharacter} />
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a match</p>
    </div>
  )

  const rightContent = (
    <div className="md:h-full flex flex-col w-full min-h-0">
      <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent flex items-center justify-between'>
        <h2 className="text-xs font-mono uppercase tracking-widest">My Collection</h2>
        {totalCount > 0 && (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>
      <Gallery
        key={page}
        items={matches}
        status={status}
        getKey={m => m.matchId}
        emptyMessage="No matches yet — keep swiping!"
        errorMessage="Could not load matches"
        stickyRows={matches.length > 6}
        renderItem={m => (
          <div className={`flex flex-col ${selected?.matchId === m.matchId ? 'ring-2 ring-green-700 rounded-xl' : m.isNew ? 'ring-2 ring-green-500 rounded-xl' : ''}`}>
            <CollectionCard
              matchId={m.matchId}
              character={m.theirCharacter}
              gameName={m.gameName}
              matchedAt={m.matchedAt}
              onSelect={() => handleSelect(m)}
            />
          </div>
        )}
      />
    </div>
  )

  return (
    <BinderLayout
      barColor={TAB.color}
      barContent={selected ? (
        <>
          <CharacterMiniCard
            character={selected.myCharacter}
            characterId={selected.myCharacter.id}
            platform={<UserSquareIcon />}
          />
          <GameMiniCard
            game={{ name: selected.gameName, imageUrl: selected.gameImageUrl }}
            gameId={selected.gameId}
            platform={<PlanetIcon />}
          />
        </>
      ) : undefined}
      activeTab={"Collection"}
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
