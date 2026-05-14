import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { CreateCharacterWizard } from '../components/character-wizard/CreateCharacterWizard'
import { PageLayout } from '../components/layout/PageLayout'
import { Spinner } from '../components/ui'

export default function CreateCharacterPage() {
  const navigate = useNavigate()
  const { gameId } = useParams<{ gameId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!gameId) return
    getUserGameByGameId(gameId)
      .then(ug => setUserGame(ug))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [gameId])

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  if (error || !userGame) {
    return (
      <PageLayout>
        <p className="text-sm text-muted font-mono">Realm not found.</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">{userGame.gameName}</p>
          <h1 className="font-display font-bold text-3xl text-text">Create Your Character</h1>
          <p className="text-sm text-muted mt-2">This is how other players will see you. Make it count.</p>
        </div>
        <CreateCharacterWizard
          userGameId={userGame.id}
          onSuccess={() => navigate(`/realm/${gameId}`)}
        />
      </div>
    </PageLayout>
  )
}
