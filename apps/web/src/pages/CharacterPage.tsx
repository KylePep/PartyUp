import { useEffect, useState } from 'react'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { getUserGames, getUserGameByGameId, type UserGame, type UserGameDetail } from '../api/endpoints/userGames'
import { CharacterGallery } from '../components/CharacterGallery'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
import { CreateCharacterWizard } from '../components/character-wizard/CreateCharacterWizard'
import type { CharacterFormData } from '../components/character-wizard/types'

function toFormData(c: Character): Partial<CharacterFormData> {
  return {
    platform: c.platform ?? '',
    platformHandle: c.platformHandle ?? '',
    name: c.name ?? '',
    imageUrl: c.imageUrl ?? '',
    imageFile: null,
    bio: c.bio ?? '',
    mainRole: c.mainRole ?? '',
    secondaryRole: c.secondaryRole ?? '',
    preferredModes: c.preferredModes ?? [],
    playstyle: c.playstyle ?? '',
    rank: c.rank ?? '',
    region: c.region ?? '',
    timeZone: c.timeZone ?? '',
    activeTimes: c.activeTimes ?? [],
    usesVoiceChat: c.usesVoiceChat,
    languages: c.languages ?? [],
    gameFields: Object.fromEntries((c.gameFields ?? []).map(f => [f.fieldDefinitionId, f.value])),
  }
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<Character | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [userGames, setUserGames] = useState<UserGame[]>([])
  const [editingUserGame, setEditingUserGame] = useState<UserGameDetail | null>(null)

  useEffect(() => {
    Promise.all([getCharacters(), getUserGames()])
      .then(([chars, ug]) => {
        setCharacters(chars)
        setUserGames(ug)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  async function handleDelete() {
    if (!selected?.userGameId) return
    setDeleting(true)
    try {
      await deleteCharacter(selected.userGameId, selected.id)
      setCharacters(prev => {
        const next = prev.filter(c => c.id !== selected.id)
        if (next.length === 0) setStatus('empty')
        return next
      })
      setSelected(null)
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
    const updatedChars = await getCharacters()
    const updated = updatedChars.find(c => c.id === selected?.id) ?? null
    setCharacters(updatedChars)
    setStatus(updatedChars.length === 0 ? 'empty' : 'ready')
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
            initialData={toFormData(selected)}
            onSuccess={handleEditSuccess}
          />
        </div>
      )
    }
    if (selected) {
      return (
        <div className="flex flex-col flex-1 min-h-0 p-4">
          <CharacterDetailCard
            character={selected}
            onDelete={selected.userGameId ? handleDelete : undefined}
            onEdit={selected.userGameId ? handleEdit : undefined}
            deleting={deleting}
          />
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted font-mono text-sm">Select a character</p>
      </div>
    )
  })()

  const rightContent = (
    <div className="p-4 overflow-y-auto h-full min-h-0">
      <CharacterGallery
        characters={characters}
        status={status}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />
    </div>
  )

  return (
    <BinderLayout
      barColor='#991b1b'
      tabs={[
        { label: 'My Cards', textColor: "#ffd900", color: '#000000', to: "/characters" },
        { label: 'Games', textColor: "#ffffff", color: '#1e40af', to: "/games" },
        { label: 'Collection', textColor: "#ffffff", color: '#166534', to: "/matches" },
      ]}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
