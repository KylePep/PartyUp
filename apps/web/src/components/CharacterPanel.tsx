import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { type UserGameDetail } from '../api/endpoints/userGames'
import { CharacterCard } from './cards/CharacterCard'
import { Button, EmptyState, Spinner } from './ui'

interface CharacterPanelProps {
  gameId: string
  userGame: UserGameDetail | null
}

export function CharacterPanel({ gameId, userGame }: CharacterPanelProps) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading')

  useEffect(() => {
    if (!userGame) return
    getUserGameCharacters(userGame.id)
      .then(chars => {
        const mine = chars.find(c => c.userGameId === userGame.id) ?? null
        setCharacter(mine)
        setStatus(mine ? 'ready' : 'empty')
      })
      .catch(() => setStatus('empty'))
  }, [userGame?.id])

  if (!userGame || status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-mono text-muted uppercase tracking-widest">My Character</h2>
      {status === 'empty' || !character ? (
        <div className="flex flex-col gap-3">
          <EmptyState message="No character for this realm yet" />
          <Link to={`/realm/${gameId}/create-character`}>
            <Button className="w-full">Create Character</Button>
          </Link>
        </div>
      ) : (
        <CharacterCard character={character} />
      )}
    </section>
  )
}
