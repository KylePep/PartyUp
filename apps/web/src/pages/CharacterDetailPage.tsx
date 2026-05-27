import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getCharacterById, type Character } from '../api/endpoints/characters'
import { CharacterDetailCard } from '../components/cards/CharacterDetailCard'
import { PageLayout } from '../components/layout/PageLayout'
import { EmptyState, Spinner } from '../components/ui'

export default function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>()
  const [character, setCharacter] = useState<Character | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!characterId) return
    getCharacterById(characterId)
      .then(c => {
        setCharacter(c)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [characterId])

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        {status === 'loading' && (
          <div className="flex justify-center py-10"><Spinner /></div>
        )}
        {status === 'error' && (
          <EmptyState message="Character not found" />
        )}
        {status === 'ready' && character && (
          <CharacterDetailCard character={character} />
        )}
      </div>
    </PageLayout>
  )
}
