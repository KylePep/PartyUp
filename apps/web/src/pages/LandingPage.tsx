import { useState } from 'react'
import { NavBar } from '../components/layout/NavBar'
import AuthModal from '../components/modals/AuthModal'
import { Button } from '../components/ui'

type ModalMode = 'sign-in' | 'sign-up'

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode | null>(null)

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <NavBar variant="landing" onSignIn={() => setModal('sign-in')} onSignUp={() => setModal('sign-up')} />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Find your party</p>
        <h1 className="font-display font-bold text-4xl md:text-6xl text-text leading-tight mb-6">
          Match with gamers<br />who play your way
        </h1>
        <p className="text-muted text-base md:text-lg max-w-md mb-10 leading-relaxed">
          Build your character, discover players across your favorite games, and forge your party through swipes.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button size="lg" onClick={() => setModal('sign-up')}>
            Get Started
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setModal('sign-in')}>
            Sign In
          </Button>
        </div>
      </main>

      <section className="bg-surface border-t border-border py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            { title: 'Build your character', body: 'Create a profile for each game — your role, rank, playstyle, and availability.' },
            { title: 'Swipe on players', body: 'Discover other characters in your game and swipe right to connect.' },
            { title: 'Form your party', body: "Mutual likes create a match. Your next teammate is one swipe away." },
          ].map(item => (
            <div key={item.title} className="flex flex-col gap-3">
              <h3 className="font-display font-semibold text-text">{item.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 px-6 text-center">
        <p className="text-xs font-mono text-muted">&copy; {new Date().getFullYear()} PartyUp</p>
      </footer>

      {modal && <AuthModal initialMode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
