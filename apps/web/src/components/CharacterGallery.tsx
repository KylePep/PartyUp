import { useEffect, useState } from 'react'
import { deleteCharacter, getCharacters, type Character } from '../api/endpoints/characters'
import { CharacterCard } from './cards/CharacterCard'
import { EmptyState, Spinner } from './ui'

export function CharacterGallery() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

  useEffect(() => {
    getCharacters()
      .then(chars => {
        setCharacters(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  async function handleDelete(character: Character) {
    if (!character.userGameId) return
    await deleteCharacter(character.userGameId, character.id)
    setCharacters(prev => {
      const next = prev.filter(c => c.id !== character.id)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }

  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  if (status === 'empty') {
    return <EmptyState message="You haven't created any characters yet" />
  }

  if (status === 'error') {
    return <EmptyState message="Could not load characters" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {characters.map(c => (
        <CharacterCard key={c.id} character={c} onDelete={handleDelete} />
      ))}
    </div>
  )
}
