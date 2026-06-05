import { useState } from 'react'
import { NavBar } from '../components/layout/NavBar'
import { BinderShell } from '../components/layout/BinderShell'
import AuthModal from '../components/modals/AuthModal'
import { Button } from '../components/ui'
import { CrystalOrb } from '../components/orb/CrystalOrb'

type ModalMode = 'sign-in' | 'sign-up'

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode | null>(null)

  return (
    <div className="h-dvh text-text flex relative md:py-4">
      <NavBar variant="landing" onSignIn={() => setModal('sign-in')} onSignUp={() => setModal('sign-up')} />

      <main className="flex-1 flex flex-col items-center justify-center text-center py-2 mx-4 pb-10 md:pb-0">
        <BinderShell
          title="PartyUp"
          className="h-full w-[91%] md:w-1/2 py-4"
          footer={<>
            <Button size="lg" onClick={() => setModal('sign-up')}>Get Started</Button>
            <Button size="lg" variant="secondary" onClick={() => setModal('sign-in')}>Sign In</Button>
          </>}
          footerClassName="flex flex-col md:flex-row gap-4 justify-around items-center p-4 md:p-8"
        >
          <CrystalOrb />
        </BinderShell>
      </main>

      {modal && <AuthModal initialMode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
