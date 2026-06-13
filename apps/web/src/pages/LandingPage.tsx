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
            <div className="flex flex-col items-center justify-center flex-1 w-full">
              {/* Top half — Sign Up */}
              <button
                className="cursor-pointer w-32 md:w-36 h-16 md:h-[4.5rem] flex items-end justify-center pb-2 md:pb-3 font-mono text-xs tracking-widest uppercase transition-all active:brightness-75 hover:brightness-110"
                onClick={() => setModal('sign-up')}
                style={{
                  background: 'radial-gradient(ellipse at 50% 85%, #f5d060 0%, #d4980c 35%, #b07808 65%, #885a04 100%)',
                  borderRadius: '9999px 9999px 0 0',
                  boxShadow: 'inset 0 6px 14px rgba(255,230,100,0.28), inset 0 -1px 3px rgba(0,0,0,0.25), 0 -2px 8px rgba(0,0,0,0.4)',
                  borderTop: '1px solid rgba(255,225,110,0.5)',
                  borderLeft: '1px solid rgba(255,210,80,0.35)',
                  borderRight: '1px solid rgba(180,120,20,0.45)',
                  borderBottom: '1.5px solid rgba(50,25,0,0.85)',
                  color: 'rgba(40,18,0,0.88)',
                  textShadow: '0 1px 0 rgba(255,220,80,0.5)',
                  letterSpacing: '0.12em',
                }}
              >
                <span className="flex items-center gap-1">
                  <SparkleIcon size={10} weight="fill" />
                  Sign Up
                </span>
              </button>

              {/* Bottom half — Sign In */}
              <button
                className="cursor-pointer w-32 md:w-36 h-16 md:h-[4.5rem] flex items-start justify-center pt-2 md:pt-3 font-mono text-xs tracking-widest uppercase transition-all active:brightness-75 hover:brightness-110"
                onClick={() => setModal('sign-in')}
                style={{
                  background: 'radial-gradient(ellipse at 50% 15%, #d4980c 0%, #b07808 30%, #885a04 58%, #6a4402 80%, #4c3002 100%)',
                  borderRadius: '0 0 9999px 9999px',
                  boxShadow: 'inset 0 -6px 14px rgba(0,0,0,0.35), inset 0 1px 3px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.55)',
                  borderTop: '1.5px solid rgba(255,200,60,0.18)',
                  borderLeft: '1px solid rgba(220,160,40,0.25)',
                  borderRight: '1px solid rgba(140,88,10,0.45)',
                  borderBottom: '1px solid rgba(255,210,70,0.3)',
                  color: 'rgba(40,18,0,0.82)',
                  textShadow: '0 1px 0 rgba(255,200,60,0.35)',
                  letterSpacing: '0.12em',
                }}
              >
                <span className="flex items-center gap-1">
                  Sign In
                  <KeyIcon size={10} weight="fill" />
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
