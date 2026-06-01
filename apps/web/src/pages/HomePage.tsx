import { useAuth } from '../context/AuthContext'
import { type UserGame } from '../api/endpoints/userGames'
import { useUserGames } from '../hooks/useUserGames'
import { OrbSearch } from '../components/OrbSearch'
import { RealmCard } from '../components/cards/RealmCard'
import { Spinner } from '../components/ui'
import { USER_GAME_LIMIT } from '../utils/limits'
import { BinderTabs } from '../components/layout/BinderTabs'

export default function HomePage() {
  const { state: auth } = useAuth()
  const userGames = useUserGames()

  if (auth.status !== 'authenticated') return null

  const { email } = auth.user
  const displayName = auth.user.profile?.displayName
  const name = displayName ?? email.split('@')[0]
  const visibleRealms = userGames.games.slice(0, 3)
  const atLimit = userGames.games.length >= USER_GAME_LIMIT

  return (
    <main className="flex flex-1 md:items-center ms-8 md:justify-center py-4 md:py-4 overflow-hidden">
      <section className="md:h-full bg-surface border-white border-2 pb-4 pt-16 md:pt-4 px-6 w-[91%] md:w-1/2 flex flex-col items-center justify-between relative">

        <h1 className="text-center font-display font-bold text-xl md:text-4xl text-text">
          {name}'s Binder
        </h1>

        {userGames.status === 'loading' ? (
          <Spinner />
        ) : (
          <OrbSearch
            onAdd={(game: UserGame) => userGames.addUserGame(game)}
            disabled={atLimit}
          />
        )}

        <h2 className='col-span-3 font-display font-bold text-center'>Recent Realms</h2>
        <div className="flex md:grid md:grid-cols-3 grid-rows-1 gap-x-4 w-full md:w-3/4 border-white border-2 overflow-x-auto md:h-1/3 p-2 md:p-8">
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
        <BinderTabs activeTab='' />
      </section>
    </main>
  )
}
