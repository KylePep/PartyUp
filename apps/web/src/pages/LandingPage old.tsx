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
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-muted uppercase tracking-widest text-center mb-10">
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 text-center">
            {[
              {
                n: 1,
                title: 'Find your game',
                body: 'Search from thousands of titles and add it to your account.',
              },
              {
                n: 2,
                title: 'Build your character',
                body: 'Set your role, rank, playstyle, and availability.',
              },
              {
                n: 3,
                title: 'Set your handle',
                body: 'Your platform handle stays private — only revealed after a match.',
              },
              {
                n: 4,
                title: 'Swipe on players',
                body: 'Discover characters in your game and like the ones you want to party with.',
              },
              {
                n: 5,
                title: 'Match and connect',
                body: 'A mutual like reveals both handles so you can link up directly.',
              },
            ].map(step => (
              <div key={step.n} className="flex flex-col items-center gap-3">
                <span className="font-mono font-bold text-3xl text-accent">{step.n}</span>
                <h3 className="font-display font-semibold text-text text-sm">{step.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 px-6 text-center">
        <p className="text-xs font-mono text-muted">&copy; {new Date().getFullYear()} PartyUp</p>
      </footer>

      {modal && <AuthModal initialMode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
