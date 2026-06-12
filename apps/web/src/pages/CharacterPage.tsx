import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { getUserGames, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { Gallery } from '../components/Gallery'
import { CharacterCard } from '../components/cards/CharacterCard'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
import { CreateCharacterWizard } from '../components/character-wizard/CreateCharacterWizard'
import { characterToFormData } from '../components/character-wizard/types'
import { TABS } from '../lib/tabs'
import { PlanetIcon, UserSquareIcon } from '@phosphor-icons/react'
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal'
import { PaginationControls } from '../components/ui'

const PAGE_SIZE = 12

export default function CharactersPage() {
  const TAB = TABS.find(t => t.label === 'My Cards')!
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')
  const [characters, setCharacters] = useState<Character[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected] = useState<Character | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [userGames, setUserGames] = useState<UserGame[]>([])
  const [editingUserGame, setEditingUserGame] = useState<UserGameDetail | null>(null)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')

  useEffect(() => {
    Promise.all([getCharacters(page, PAGE_SIZE), getUserGames(1, 12)])
      .then(([charsResult, ugResult]) => {
        setCharacters(charsResult.items)
        setTotalCount(charsResult.totalCount)
        setUserGames(ugResult.items)
        setStatus(charsResult.totalCount === 0 ? 'empty' : 'ready')
        if (targetId && page === 1) {
          const match = charsResult.items.find(c => c.id === targetId) ?? null
          setSelected(match)
          if (match) setActiveSide('left')
        }
      })
      .catch(() => setStatus('error'))
  }, [targetId, page])

  function handleSelect(character: Character) {
    setSelected(character)
    setActiveSide('left')
  }

  async function handleDelete() {
    if (!selected?.userGameId) return
    setDeleting(true)
    try {
      await deleteCharacter(selected.userGameId, selected.id)
      const newTotal = totalCount - 1
      setTotalCount(newTotal)
      setSelected(null)
      setConfirmOpen(false)
      const totalPages = Math.ceil(newTotal / PAGE_SIZE)
      if (page > totalPages && page > 1) {
        setPage(p => p - 1)
      } else {
        setCharacters(prev => {
          const next = prev.filter(c => c.id !== selected.id)
          if (newTotal === 0) setStatus('empty')
          return next
        })
      }
    } finally {
      setDeleting(false)
    }
  }

  async function handleEdit() {
    if (!selected?.userGameId) return
    const userGame = userGames.find(ug => ug.id === selected.userGameId)
    if (!userGame) return
    const detail = await getUserGameByGameId(userGame.gameId)
    setEditingUserGame(detail)
  }

  function handleEditCancel() {
    setEditingUserGame(null)
  }

  async function handleEditSuccess() {
    const result = await getCharacters(page, PAGE_SIZE)
    const updated = result.items.find(c => c.id === selected?.id) ?? null
    setCharacters(result.items)
    setTotalCount(result.totalCount)
    setStatus(result.totalCount === 0 ? 'empty' : 'ready')
    setSelected(updated)
    setEditingUserGame(null)
  }

  const leftContent = (() => {
    if (editingUserGame && selected) {
      return (
        <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
          <button
            type="button"
            onClick={handleEditCancel}
            className="text-xs font-mono text-muted hover:text-text mb-4 self-start"
          >
            ← Cancel
          </button>
          <CreateCharacterWizard
            userGameId={editingUserGame.id}
            gameId={editingUserGame.gameId}
            platforms={editingUserGame.platforms}
            mode="edit"
            characterId={selected.id}
            initialData={characterToFormData(selected)}
            onSuccess={handleEditSuccess}
          />
        </div>
      )
    }
    if (selected) {
      return (
        <div className="flex flex-col md:min-h-0">
          <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
            <h2 className="text-xs font-mono uppercase tracking-widest">Character Card Details</h2>
          </div>
          <div className='p-2 md:px-4 flex flex-col min-h-0 overflow-y-auto'>
            <CharacterDetailCard
              character={selected}
              onDelete={selected.userGameId ? () => setConfirmOpen(true) : undefined}
              onEdit={selected.userGameId ? handleEdit : undefined}
              deleting={deleting}
            />
          </div>
          <ConfirmDeleteModal
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleDelete}
            itemName={selected.name}
            loading={deleting}
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col md:min-h-0">
        <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent'>
          <h2 className="text-xs font-mono uppercase tracking-widest">Select A Character</h2>
        </div>
      </div>
    )
  })()

  const rightContent = (
    <>
      <div className="relative flex flex-col flex-1 min-h-0">
        <div className='px-4 py-3 min-h-[64px] border-b-4 border-cyan-950/50 bg-gradient-to-r from-cyan-950/25 via-transparent to-transparent flex items-center justify-between'>
          <h2 className="text-xs font-mono uppercase tracking-widest">My Character Cards</h2>
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
          items={characters}
          status={status}
          getKey={c => c.id}
          emptyMessage="You haven't created any characters yet"
          errorMessage="Could not load characters"
          stickyRows
          renderItem={c => (
            <div
              className="flex flex-col rounded-xl"
              style={{
                outline: selected?.id === c.id ? '2px solid #991b1b' : '2px solid transparent',
                outlineOffset: '2px',
              }}
            >
              <CharacterCard character={c} onSelect={handleSelect} className="" />
            </div>
          )}
        />
      </div>
    </>
  )

  return (
    <BinderLayout
      barColor={TAB.color}
      barContent={selected ? (
        <>
          <CharacterMiniCard character={selected} platform={<UserSquareIcon />} />
          {selected.gameName &&
            <GameMiniCard
              game={{ name: selected.gameName, imageUrl: selected.gameImageUrl }}
              gameId={selected.gameId}
              platform={<PlanetIcon />} />
          }
        </>
      ) : undefined}
      activeTab={"My Cards"}
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
