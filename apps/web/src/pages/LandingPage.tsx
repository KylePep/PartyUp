import { useState } from 'react'
import { NavBar } from '../components/layout/NavBar'
import { BinderShell } from '../components/layout/BinderShell'
import AuthModal from '../components/modals/AuthModal'
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
          title="PartyUp"
          className="h-full w-[91%] md:w-1/2 py-4"
          clasp={<>
            <div className="flex flex-col flex-1 w-full justify-center">
              <button className="cursor-pointer bg-cyan-400 border-2 border-b-1 border-b-cyan-900/50 w-36 h-18 rounded-t-full flex flex-col justify-end pb-2" onClick={() => setModal('sign-up')}>Get Started</button>
              <button className="cursor-pointer bg-cyan-400 border-2 border-t-1 border-t-cyan-900/50 w-36 h-18 rounded-b-full shadow-xl flex flex-col justify-start pt-2" onClick={() => setModal('sign-in')}>Sign In</button>
            </div>
          </>
          }
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
