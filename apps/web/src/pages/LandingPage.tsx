import { useState } from 'react'
import { NavBar } from '../components/layout/NavBar'
import { BinderShell } from '../components/layout/BinderShell'
import AuthModal from '../components/modals/AuthModal'
import { Button } from '../components/ui'
import { CrystalOrb } from '../components/orb/CrystalOrb'
import { PopularRealms } from '../components/PopularRealms'
import { usePopularGames } from '../hooks/usePopularGames'

type ModalMode = 'sign-in' | 'sign-up'

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode | null>(null)
  const { games: popularGames } = usePopularGames()

  return (
    <div className="h-dvh text-text flex relative md:py-4">
      <NavBar variant="landing" onSignIn={() => setModal('sign-in')} onSignUp={() => setModal('sign-up')} />

      <main className="flex-1 flex flex-col items-center justify-center text-center py-4 pb-14 md:pb-0">
        <BinderShell
          title="Guildoire"
          className="h-full w-[91%] md:w-1/2 py-4"
          clasp={<>
            <div className="md:hidden flex flex-1 flex-col w-full justify-around ">
              <Button size="sm" onClick={() => setModal('sign-up')}>Get Started</Button>
              <Button size="sm" variant="secondary" onClick={() => setModal('sign-in')}>Sign In</Button>
            </div>
            <div className="hidden md:flex flex-col gap-4">
              <Button size="lg" onClick={() => setModal('sign-up')}>Get Started</Button>
              <Button size="lg" variant="secondary" onClick={() => setModal('sign-in')}>Sign In</Button>
            </div>
          </>}
          claspClassName="flex flex-1 flex-col items-center justify-center p-2 md:p-8"
          footer={<>
            <p>Find your people. <br /> PartyUp matches multiplayer gamers by the games they play, the characters they build, and the vibe they bring.</p>
          </>}
          footerClassName="flex flex-col items-center justify-center mb-20 md:mb-0 h-1/4 md:h-[30%]"
        >
          <CrystalOrb />
        </BinderShell>
      </main>

      <PopularRealms games={popularGames} onSelect={() => setModal('sign-in')} />

      {modal && <AuthModal initialMode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
