import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteCharacter, getCharacters, getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { type UserGameDetail } from '../api/endpoints/userGames'
import { CharacterCard } from './cards/CharacterCard'
import { Button, EmptyState, Spinner } from './ui'
import { CHARACTER_LIMIT } from '../utils/limits'

interface CharacterPanelProps {
  gameId: string
  userGame: UserGameDetail | null
}

export function CharacterPanel({ gameId, userGame }: CharacterPanelProps) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading')
  const [totalCharacterCount, setTotalCharacterCount] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!userGame) return
    getUserGameCharacters(userGame.id)
      .then(chars => {
        const mine = chars.find(c => c.userGameId === userGame.id) ?? null
        setCharacter(mine)
        setStatus(mine ? 'ready' : 'empty')
        if (!mine) {
          getCharacters().then(all => setTotalCharacterCount(all.length))
        }
      })
      .catch(() => setStatus('empty'))
  }, [userGame?.id])

  async function handleDelete(c: Character) {
    if (!c.userGameId) return
    await deleteCharacter(c.userGameId, c.id)
    setCharacter(null)
    setStatus('empty')
    getCharacters().then(all => setTotalCharacterCount(all.length))
  }

  function handleEdit(c: Character) {
    navigate(`/realm/${gameId}/edit-character/${c.id}`)
  }

  if (!userGame || status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-mono text-muted uppercase tracking-widest">My Character</h2>
      {status === 'empty' || !character ? (
        <div className="flex flex-col gap-3">
          <EmptyState message="No character for this realm yet" />
          {totalCharacterCount !== null && totalCharacterCount >= CHARACTER_LIMIT ? (
            <p className="text-xs font-mono text-muted text-center">
              {CHARACTER_LIMIT} / {CHARACTER_LIMIT} characters — delete one to create a new one
            </p>
          ) : (
            <Link to={`/realm/${gameId}/create-character`}>
              <Button className="w-full">Create Character</Button>
            </Link>
          )}
        </div>
      ) : (
        <CharacterCard character={character} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </section>
  )
}
