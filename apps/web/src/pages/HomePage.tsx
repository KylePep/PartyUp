import { useAuth } from '../context/AuthContext'
import { type UserGame } from '../api/endpoints/userGames'
import { useUserGames } from '../hooks/useUserGame'
import { OrbSearch } from '../components/OrbSearch'
import { RealmCard } from '../components/cards/RealmCard'
import { Spinner } from '../components/ui'
import { USER_GAME_LIMIT } from '../utils/limits'

export default function HomePage() {
  const { state: auth } = useAuth()
  const userGames = useUserGames()

  if (auth.status !== 'authenticated') return null

  const { username } = auth.user
  const displayName = username.split('@')[0]
  const visibleRealms = userGames.games.slice(0, 3)
  const atLimit = userGames.games.length >= USER_GAME_LIMIT

  return (
    <main className="flex-1 flex items-center justify-center py-4 overflow-hidden">
      <section className="h-full bg-surface border-white border-2 py-4 px-6 w-1/2 flex flex-col items-center justify-between overflow-hidden">

        <h1 className="font-display font-bold text-4xl text-text">
          {displayName}'s Binder
        </h1>

        {userGames.status === 'loading' ? (
          <Spinner />
        ) : (
          <OrbSearch
            onAdd={(game: UserGame) => userGames.addUserGame(game)}
            disabled={atLimit}
          />
        )}

        <div className="grid grid-cols-3 gap-4 w-3/4">
          {visibleRealms.length === 0 ? (
            <p className="col-span-3 text-xs font-mono text-muted text-center">
              Search above to add your first realm
            </p>
          ) : (
            visibleRealms.map(g => (
              <RealmCard key={g.id} userGame={g} />
            ))
          )}
        </div>

      </section>
    </main>
  )
}
