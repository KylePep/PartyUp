import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMatches, getMatchById, type CharacterMatchDto } from '../api/endpoints/matches'
import { markMatchViewed } from '../api/endpoints/matchNotifications'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { Gallery } from '../components/Gallery'
import { CollectionCard } from '../components/cards/CollectionCard'
import { TABS } from '../lib/tabs'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
import { PlanetIcon, UserSquareIcon, ChatCircleIcon } from '@phosphor-icons/react'
import { StickerChatView } from '../components/stickers/StickerChatView'
import { PaginationControls } from '../components/ui'
import { useUserGames } from '../hooks/useUserGames'
import { BinderHeader } from '../components/layout/BinderHeader'

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
  const [view, setView] = useState<'detail' | 'chat'>('detail')
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const { games } = useUserGames()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setStatus('loading')
    getMatches(page, PAGE_SIZE, selectedGameId ?? undefined, debouncedSearch || undefined)
      .then(result => {
        setMatches(result.items)
        setTotalCount(result.totalCount)
        setStatus(result.totalCount === 0 ? 'empty' : 'ready')
        if (targetId && page === 1) {
          const match = result.items.find(m => m.matchId === targetId) ?? null
          if (match) {
            setSelected(match)
            setActiveSide('left')
            if (match.isNew) {
              markMatchViewed(match.matchId).then(() => {
                setMatches(prev =>
                  prev.map(m => m.matchId === match.matchId ? { ...m, isNew: false } : m)
                )
              })
            }
          } else {
            getMatchById(targetId)
              .then(fetched => {
                setSelected(fetched)
                setActiveSide('left')
                if (fetched.isNew) {
                  markMatchViewed(fetched.matchId)
                }
              })
              .catch(() => { })
          }
        }
      })
      .catch(() => setStatus('error'))
  }, [targetId, page, selectedGameId, debouncedSearch])

  function handleSelect(match: CharacterMatchDto) {
    setView('detail')
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

  function handleGameChange(gameId: string | null) {
    setSelectedGameId(gameId)
    setPage(1)
  }

  function handleSearchChange(value: string) {
    setSearchInput(value)
    setPage(1)
  }

  const leftContent = selected ? (
    <div className="flex flex-col md:flex-1 md:min-h-0">
      <BinderHeader title='' heightClassName='md:min-h-[76px] md:h-[76px] md:max-h-[76px]' className=''>
        <div className='flex items-center justify-between'>
          <div className='flex gap-4'>
            <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Match</p>
            <p className="text-xs text-muted">
              - {new Date(selected.matchedAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => setView(v => v === 'detail' ? 'chat' : 'detail')}
            className="p-1 rounded hover:bg-white/10 transition-colors text-muted hover:text-text"
            aria-label={view === 'detail' ? 'Open sticker chat' : 'Back to character'}
            title={view === 'detail' ? 'Sticker Chat' : 'Character Detail'}
          >
            <ChatCircleIcon size={18} weight={view === 'chat' ? 'fill' : 'regular'} />
          </button>
        </div>
        <p className="font-display font-bold text-text">{selected.gameName}</p>
      </BinderHeader>
      {view === 'detail' ? (
        <div className="p-2 md:px-4 flex flex-col min-h-0 overflow-y-auto">
          <CharacterDetailCard character={selected.theirCharacter} />
        </div>
      ) : (
        <StickerChatView
          matchId={selected.matchId}
          myCharacterId={selected.myCharacter.id}
        />
      )}
    </div>
  ) : (
    <div className="flex flex-col md:flex-1 md:min-h-0">
      <BinderHeader title='Select A Match' heightClassName='md:min-h-[76px] md:h-[76px] md:max-h-[76px] ' className='flex flex-col justify-center'></BinderHeader>
    </div>
  )

  const rightContent = (
    <div className="md:h-full flex flex-col w-full min-h-0">

      <BinderHeader title='' heightClassName='md:min-h-[76px] md:h-[76px] md:max-h-[76px]' className='text-[0.625rem]'>
        <div className="flex items-center justify-between ">
          <h2 className="font-mono uppercase tracking-widest mb-0">My Collection</h2>
          {totalCount > 0 && (
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 md:gap-2 mt-2">
          <select
            value={selectedGameId ?? ''}
            onChange={e => handleGameChange(e.target.value || null)}
            className="sm:w-60  font-mono bg-black/40 border border-orange-950/50 rounded px-2"
          >
            <option className="bg-black" value="" >All Games</option>
            {games.map(g => (
              <option className="bg-black" key={g.id} value={g.gameId}>{g.gameName}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            className="flex-1 text-xs font-mono bg-black/40 border border-orange-950/50 rounded px-2 py-1 text-text placeholder:text-muted"
          />
        </div>
      </BinderHeader>
      <Gallery
        key={page}
        items={matches}
        status={status}
        getKey={m => m.matchId}
        emptyMessage="No matches yet — keep swiping!"
        errorMessage="Could not load matches"
        stickyRows={true}
        renderItem={m => (
          <div className={`flex flex-col ${selected?.matchId === m.matchId ? 'ring-2 ring-green-700 rounded-xl' : ''}`}>
            <CollectionCard
              matchId={m.matchId}
              character={m.theirCharacter}
              gameName={m.gameName}
              matchedAt={m.matchedAt}
              isNew={m.isNew}
              onSelect={() => handleSelect(m)}
              className="h-min aspect-3/4 md:aspect-4/5 md:h-full"
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
      hasSelection={!!selected}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
