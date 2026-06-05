import { useAuth } from '../context/AuthContext'
import { type UserGame } from '../api/endpoints/userGames'
import { useUserGames } from '../hooks/useUserGames'
import { ScryingOrb } from '../components/orb/ScryingOrb'
import { RealmCard } from '../components/cards/RealmCard'
import { Spinner } from '../components/ui'
import { USER_GAME_LIMIT } from '../utils/limits'
import { BinderTabs } from '../components/layout/BinderTabs'
import { BinderShell } from '../components/layout/BinderShell'

export default function HomePage() {
  const { state: auth } = useAuth()
  const userGames = useUserGames()

  if (auth.status !== 'authenticated') return null

  const { email } = auth.user
  const displayName = auth.user.profile?.displayName
  const name = displayName ?? email.split('@')[0]
  const visibleRealms = userGames.games.slice(0, 4)
  const atLimit = userGames.games.length >= USER_GAME_LIMIT

  return (
    <main className="flex flex-1 md:items-center md:justify-center md:py-4 overflow-hidden">
      <section className="md:h-full w-full mx-4 md:w-1/2 relative py-2 pb-10 md:pb-0">
        <BinderShell
          title={`${name}'s Binder`}
          className="relative h-full w-full z-20"
          footer={visibleRealms.length === 0 ? (
            <p className="col-span-3 text-xs font-mono text-muted text-center">
              Search above to add your first realm
            </p>
          ) : (
            visibleRealms.map(g => <RealmCard key={g.id} userGame={g} />)
          )}
          footerClassName="flex overflow-x-auto gap-x-2 p-2"
        >
          {userGames.status === 'loading' ? (
            <Spinner />
          ) : (
            <ScryingOrb
              onAdd={(game: UserGame) => userGames.addUserGame(game)}
              disabled={atLimit}
            />
          )}
          {/* <h2 className='font-display font-bold text-center'>Recent Realms</h2> */}
        </BinderShell>
        <BinderTabs activeTab='' />
      </section>
    </main>
  )
}
