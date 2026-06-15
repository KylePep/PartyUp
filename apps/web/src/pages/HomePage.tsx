import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { type UserGame } from '../api/endpoints/userGames'
import { type PopularGame } from '../api/endpoints/games'
import { addUserGame as apiAddUserGame } from '../api/endpoints/userGames'
import { useUserGames } from '../hooks/useUserGames'
import { usePopularGames } from '../hooks/usePopularGames'
import { ScryingOrb } from '../components/orb/ScryingOrb'
import { RealmCard } from '../components/cards/RealmCard'
import { PopularRealms } from '../components/PopularRealms'
import { Spinner, Modal, Button } from '../components/ui'
import { USER_GAME_LIMIT } from '../utils/limits'
import { BinderTabs } from '../components/layout/BinderTabs'
import { BinderShell } from '../components/layout/BinderShell'

export default function HomePage() {
  const { state: auth } = useAuth()
  const userGames = useUserGames()
  const { games: popularGames } = usePopularGames()
  const [pendingRealm, setPendingRealm] = useState<PopularGame | null>(null)
  const [addingRealm, setAddingRealm] = useState(false)

  if (auth.status !== 'authenticated') return null

  // const { email } = auth.user
  // const displayName = auth.user.profile?.displayName
  // const name = displayName ?? email.split('@')[0]
  const visibleRealms = userGames.games.slice(0, 4)
  const atLimit = userGames.games.length >= USER_GAME_LIMIT

  async function confirmAddRealm() {
    if (!pendingRealm) return
    setAddingRealm(true)
    try {
      const result = await apiAddUserGame({
        externalId: pendingRealm.externalId,
        name: pendingRealm.name,
        imageUrl: pendingRealm.imageUrl,
      })
      userGames.addUserGame(result.userGame)
      setPendingRealm(null)
    } finally {
      setAddingRealm(false)
    }
  }

  return (
    <main className="flex flex-1 md:items-center md:justify-center md:py-4 overflow-hidden relative">
      <section className="md:h-full w-full mx-4 md:w-1/2 relative py-4 mx-4 pb-14 md:pb-0">
        <BinderShell
          // title={`${name}'s Guildoire`}
          title="PartyUp"
          className="relative h-full w-full z-20"
          footer={visibleRealms.length === 0 ? (
            <p className="col-span-3 text-xs font-mono text-muted text-center">
              Search above to add your first realm
            </p>
          ) : (
            visibleRealms.map(g => <RealmCard key={g.id} userGame={g} />)
          )}
          footerClassName="flex overflow-x-auto overflow-y-visible gap-x-2 p-2 h-1/3"
        >
          {userGames.status === 'loading' ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <ScryingOrb
              onAdd={(game: UserGame) => userGames.addUserGame(game)}
              disabled={atLimit}
              popularGames={popularGames}
            />
          )}
        </BinderShell>
        <BinderTabs activeTab='' />
      </section>

      <PopularRealms games={popularGames} onSelect={setPendingRealm} />

      <Modal isOpen={!!pendingRealm} onClose={() => setPendingRealm(null)} title="Add Realm">
        <div className="px-6 py-4 flex flex-col gap-4">
          <p className="text-sm text-text">
            Add <strong>{pendingRealm?.name}</strong> to your realms?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPendingRealm(null)}>Cancel</Button>
            <Button onClick={confirmAddRealm} disabled={addingRealm}>
              {addingRealm ? 'Adding…' : 'Add Realm'}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  )
}
