import { useEffect, useState } from 'react'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { CharacterGallery } from '../components/CharacterGallery'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<Character | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getCharacters()
      .then(chars => {
        setCharacters(chars)
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

  const leftContent = selected ? (
    <div className="flex flex-col flex-1 min-h-0 p-4">
      <CharacterDetailCard
        character={selected}
        onDelete={selected.userGameId ? handleDelete : undefined}
        deleting={deleting}
      />
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a character</p>
    </div>
  )

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
