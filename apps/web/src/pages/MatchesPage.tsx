import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMatches, type CharacterMatchDto } from '../api/endpoints/matches'
import { markMatchViewed } from '../api/endpoints/matchNotifications'
import { BinderLayout } from '../components/layout/BinderLayout'
import { EmptyState, Spinner } from '../components/ui'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { MatchCharacterDetail } from '../components/cards/MatchCharacterDetail'
import { CollectionGallery } from '../components/CollectionGallery'
import { TABS } from '../lib/tabs'


export default function MatchesPage() {
  const TAB = TABS.find(t => t.label === 'Collection')!
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<CharacterMatchDto | null>(null)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')

  useEffect(() => {
    getMatches()
      .then(m => {
        setMatches(m)
        setStatus(m.length === 0 ? 'empty' : 'ready')
        if (targetId) {
          const match = m.find(match => match.matchId === targetId) ?? null
          setSelected(match)
          if (match) setActiveSide('left')
        }
      })
      .catch(() => setStatus('error'))
  }, [targetId])

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
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      {/* Match header */}
      <div
        className="px-4 py-3 h-[64px] border-b-4 border-cyan-950/50"
      >
        <div className='flex gap-4'>
          <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Match</p>
          <p className="text-xs text-muted">
            - {new Date(selected.matchedAt).toLocaleDateString()}
          </p>
        </div>
        <p className="font-display font-bold text-text">{selected.gameName}</p>
      </div>

      {/* Their character */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-xs text-muted uppercase tracking-widest mb-3">Their Character</p>
        <MatchCharacterDetail character={selected.theirCharacter} />
      </div>

    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a match</p>
    </div>
  )

  const rightContent = (
    <>
      <div className=" h-full w-full min-h-0">
        {status === 'loading' && (
          <div className="flex justify-center py-10"><Spinner /></div>
        )}
        {status === 'error' && <EmptyState message="Could not load matches" />}
        {status === 'empty' && <EmptyState message="No matches yet — keep swiping!" />}
        {status === 'ready' && (
          <div className="relative flex flex-col">
            <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
              <h2 className="text-xs font-mono uppercase tracking-widest">My Collection</h2>
            </div>
            <CollectionGallery
              matches={matches}
              selectedId={selected?.matchId ?? null}
              onSelect={handleSelect}
              limit={6}
            />
          </div>
        )}
      </div>
    </>
  )

  return (
    <BinderLayout
      barColor={TAB.color}
      barContent={selected ? (
        <>
          <CharacterMiniCard character={selected.myCharacter} characterId={selected.myCharacter.id} />
          <GameMiniCard game={{ name: selected.gameName, imageUrl: selected.gameImageUrl }} gameId={selected.gameId} />
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
