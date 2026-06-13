import { useState } from 'react'
import { KeyIcon, SparkleIcon } from '@phosphor-icons/react'
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
            <div className="flex flex-col flex-1 w-full items-center md:items-start md:justify-center">
              <button
                className="group cursor-pointer w-28 md:w-36 h-14 md:h-18 rounded-t-full flex flex-col items-center justify-end pb-2 font-mono text-sm tracking-wide transition-[filter] gap-2 text-off-white hover:text-white"
                onClick={() => setModal('sign-up')}
                style={{
                  background: 'linear-gradient(150deg, rgba(255,255,255,0.95) 0%, #a5f3fc 5%, #22d3ee 14%, #06b6d4 30%, #0891b2 52%, #0e7490 72%, #155e75 88%, #0c4a6e 100%)',
                  borderTop: '2px solid rgba(255,255,255,.5)',
                  borderLeft: '2px solid rgba(255,255,255,.5)',
                  borderRight: '2px solid rgba(255,255,255,.5)',
                  borderBottom: '1px solid rgba(12,74,110,.75)',
                  boxShadow: 'inset 0 3px 12px rgba(255,255,255,0.35), 0 0 12px rgba(34,211,238,0.25)',
                  textShadow: '0 1px 4px rgba(0,0,0,1)',
                }}
              >
                <span className="hidden md:block md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <SparkleIcon size={18} weight="fill" />
                </span>
                Sign Up
              </button>
              <button
                className="group cursor-pointer w-28 md:w-36 h-14 md:h-18 rounded-b-full flex flex-col items-center justify-start pt-2 font-mono text-sm tracking-wide transition-[filter] gap-2 text-off-white hover:text-white"
                onClick={() => setModal('sign-in')}
                style={{
                  background: 'radial-gradient(ellipse at 50% 22%, #0ea5e9 0%, #0891b2 22%, #0e7490 46%, #0c4a6e 70%, #072a40 100%)',
                  borderTop: '1px solid rgba(34,211,238,.75)',
                  borderLeft: '2px solid rgba(255,255,255,.5)',
                  borderRight: '2px solid rgba(255,255,255,.5)',
                  borderBottom: '2px solid rgba(255,255,255,.5)',
                  boxShadow: 'inset 0 -3px 10px rgba(255,255,255,0.12), 0 0 12px rgba(34,211,238,0.25)',
                  textShadow: '0 1px 3px rgba(0,0,0,1)',
                }}
              >
                Sign In
                <span className="hidden md:block md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <KeyIcon size={18} weight="fill" />
                </span>
              </button>
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
