import { useState, useEffect } from 'react'
import { NavBar } from '../components/layout/NavBar'
import AuthModal from '../components/modals/AuthModal'
import { Button } from '../components/ui'

type ModalMode = 'sign-in' | 'sign-up'

const steps = [
  { n: 1, title: 'Find your game', body: 'Search from thousands of titles and add it to your account.' },
  { n: 2, title: 'Build your character', body: 'Fill out game-specific fields, set your availability, and write your bio.' },
  { n: 3, title: 'Set your handle', body: 'Your platform handle stays private — only revealed after a match.' },
  { n: 4, title: 'Swipe on players', body: 'Discover characters in your game and like the ones you want to party with.' },
  { n: 5, title: 'Match and connect', body: 'A mutual like reveals both handles so you can link up directly.' },
]

const CIRCUMFERENCE = Math.round(2 * Math.PI * 172) // 1081

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode | null>(null)
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setTimeout(() => setStep(s => (s + 1) % steps.length), 5000)
    return () => clearTimeout(id)
  }, [step, paused])

  function goNext() {
    setStep(s => (s + 1) % steps.length)
    setPaused(false)
  }

  function goPrev() {
    setStep(s => (s + steps.length - 1) % steps.length)
    setPaused(false)
  }

  return (
    <div className="min-h-screen bg-bg text-text flex relative">
      <NavBar variant="landing" onSignIn={() => setModal('sign-in')} onSignUp={() => setModal('sign-up')} />

      <main className="flex-1 flex flex-col items-center justify-center text-center py-2 md:py-4">
        <section className='h-full bg-surface border-white border-2 pb-4 pt-16 md:pt-4 py-4 px-6 w-[91%] md:w-1/2 flex flex-col items-center justify-between'>

          <h1 className="font-display font-bold text-xl md:text-4xl text-text">
            Magic Binder
          </h1>

          <div className="group relative h-[16rem] md:h-[20rem] w-[16rem] md:w-[20rem] bg-white border-black border-4 rounded-full flex items-center justify-center">

            {/* SVG progress ring — key={step} re-mounts on step change, restarting the animation */}
            <svg
              key={step}
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 352 352"
            >
              <circle
                cx="176"
                cy="176"
                r="172"
                fill="none"
                stroke="#7c6fcd"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                transform="rotate(-90 176 176)"
                className="animate-[ring_5s_linear_forwards]"
                style={{ animationPlayState: paused ? 'paused' : 'running' }}
              />
            </svg>

            {/* Step content — key causes fade-in on step change */}
            <div key={`content-${step}`} className="absolute text-center w-3/4 animate-[fadeIn_0.4s_ease]">
              <p className="font-mono text-xs text-muted mb-1">{steps[step].n} / {steps.length}</p>
              <h3 className="font-display font-semibold text-black text-sm">
                {steps[step].title}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {steps[step].body}
              </p>
            </div>

            {/* Hover controls — revealed via group-hover */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={goPrev} aria-label="Previous step" className="text-muted hover:text-black transition-colors text-lg leading-none">
                &#8592;
              </button>
              <button onClick={() => setPaused(p => !p)} aria-label={paused ? 'Resume' : 'Pause'} className="text-muted hover:text-black transition-colors text-lg leading-none">
                {paused ? '▶' : '⏸'}
              </button>
              <button onClick={goNext} aria-label="Next step" className="text-muted hover:text-black transition-colors text-lg leading-none">
                &#8594;
              </button>
            </div>
          </div>

          <div className="flex justify-around items-center border-white border-2 w-full md:w-3/4 md:h-1/3 p-8 ">
            <Button size="lg" onClick={() => setModal('sign-up')}>
              Get Started
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setModal('sign-in')}>
              Sign In
            </Button>
          </div>
        </section>
      </main>

      {modal && <AuthModal initialMode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
