import { useState, useEffect, useRef, type CSSProperties } from 'react'
import {
  MagnifyingGlass,
  UserCircle,
  At,
  ArrowsLeftRight,
  HandWaving,
} from '@phosphor-icons/react'
import { MagicOrb } from './MagicOrb'

const STEPS = [
  { Icon: MagnifyingGlass, title: 'Find your game',      body: 'Search from thousands of titles and add it to your account.' },
  { Icon: UserCircle,      title: 'Build your character', body: 'Fill out game-specific fields, set your availability, and write your bio.' },
  { Icon: At,              title: 'Set your handle',      body: 'Your platform handle stays private — only revealed after a match.' },
  { Icon: ArrowsLeftRight, title: 'Swipe on characters',  body: 'Discover characters in your game and like the ones you want to party with.' },
  { Icon: HandWaving,      title: 'Match and connect',    body: 'A mutual like reveals both handles so you can link up directly.' },
]

const CIRCUMFERENCE = Math.round(2 * Math.PI * 172) // 1081

export function CrystalOrb() {
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [orbSize, setOrbSize] = useState(0)

  // Measure the container's actual rendered dimensions — bypasses CSS height chain issues
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setOrbSize(Math.floor(Math.min(width, height)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setTimeout(() => setStep(s => (s + 1) % STEPS.length), 5000)
    return () => clearTimeout(id)
  }, [step, paused])

  function goNext() { setStep(s => (s + 1) % STEPS.length); setPaused(false) }
  function goPrev() { setStep(s => (s + STEPS.length - 1) % STEPS.length); setPaused(false) }

  const { Icon } = STEPS[step]

  return (
    <div ref={containerRef} className="flex-1 min-h-0 w-full flex items-center justify-center py-2">
      {orbSize > 0 && (
        <div className="group relative" style={{ width: orbSize, height: orbSize }}>

          {/* MagicOrb fills the container — explicit px dimensions, not absolute inset-0
              (Tailwind outputs `relative` after `absolute` so `relative` would win and collapse the orb) */}
          <MagicOrb style={{ width: orbSize, height: orbSize }} focused={false}>
            {/* Step content — key causes re-mount and vision-appear animation on change */}
            <div
              key={`step-${step}`}
              className="text-center w-3/4 px-2"
              style={{ animation: 'vision-appear 0.8s ease forwards' } as CSSProperties}
            >
              <Icon size={24} color="#00c8f0" weight="duotone" style={{ margin: '0 auto 0.5rem' }} />
              <h3 className="font-display font-semibold text-off-white text-sm leading-snug mb-1">
                {STEPS[step].title}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {STEPS[step].body}
              </p>
            </div>
          </MagicOrb>

          {/* Progress ring — outside MagicOrb so overflow:hidden doesn't clip it */}
          <svg
            key={step}
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 352 352"
          >
            <circle
              cx="176" cy="176" r="172"
              fill="none"
              stroke="#00c8f0"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              transform="rotate(-90 176 176)"
              className="animate-[ring_5s_linear_forwards]"
              style={{
                animationPlayState: paused ? 'paused' : 'running',
                filter: 'drop-shadow(0 0 4px #00c8f0)',
              }}
            />
          </svg>

          {/* Hover controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={goPrev} aria-label="Previous step" className="text-muted hover:text-off-white transition-colors text-lg leading-none">
              &#8592;
            </button>
            <button
              onClick={() => setPaused(p => !p)}
              aria-label={paused ? 'Resume' : 'Pause'}
              className="text-muted hover:text-off-white transition-colors text-lg leading-none"
            >
              {paused ? '▶' : '⏸'}
            </button>
            <button onClick={goNext} aria-label="Next step" className="text-muted hover:text-off-white transition-colors text-lg leading-none">
              &#8594;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
