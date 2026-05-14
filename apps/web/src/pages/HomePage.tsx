import { useAuth } from '../context/AuthContext'
import { type UserGame } from '../api/endpoints/userGames'
import { useUserGames } from '../hooks/useUserGame'
import { UserRealmsSection } from '../components/UserRealmsSection'
import { PageLayout } from '../components/layout/PageLayout'
import { Spinner } from '../components/ui'

export default function HomePage() {
  const { state: auth } = useAuth()
  const userGames = useUserGames()

  if (auth.status !== 'authenticated') return null

  const { username } = auth.user

  return (
    <PageLayout>
      <div className="mb-10">
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">Welcome back</p>
        <h1 className="font-display font-bold text-3xl md:text-4xl text-text">{username}</h1>
      </div>

      {userGames.status === 'loading' ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <UserRealmsSection
          games={userGames.games}
          onAdd={(game: UserGame) => userGames.addUserGame(game)}
          onRemove={(game: UserGame) => userGames.removeGame(game)}
        />
      )}
    </PageLayout>
  )
}
