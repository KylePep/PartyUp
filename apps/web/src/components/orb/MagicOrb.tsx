import { type ReactNode, type CSSProperties } from 'react'
import {
  GameController,
  Shield,
  CrosshairSimple,
  Star,
  Lightning,
  Crown,
  Sword,
  type Icon,
} from '@phosphor-icons/react'

interface MagicOrbProps {
  className?: string
  focused?: boolean
  children?: ReactNode
}

const STAR_PARTICLES: { top: string; left: string; size: number; color: string; dur: number; delay: number }[] = [
  { top: '18%', left: '55%', size: 2, color: '#7ee8fa', dur: 1.8, delay: 0.0 },
  { top: '30%', left: '72%', size: 3, color: '#fff',    dur: 2.4, delay: 0.4 },
  { top: '42%', left: '80%', size: 2, color: '#7ee8fa', dur: 1.6, delay: 0.9 },
  { top: '60%', left: '75%', size: 2, color: '#fb923c', dur: 2.1, delay: 0.2 },
  { top: '72%', left: '58%', size: 3, color: '#fff',    dur: 1.9, delay: 1.3 },
  { top: '65%', left: '35%', size: 2, color: '#7ee8fa', dur: 2.7, delay: 0.6 },
  { top: '50%', left: '22%', size: 2, color: '#fff',    dur: 2.0, delay: 1.8 },
  { top: '35%', left: '18%', size: 3, color: '#fb923c', dur: 3.2, delay: 0.3 },
  { top: '22%', left: '35%', size: 2, color: '#7ee8fa', dur: 1.7, delay: 2.1 },
  { top: '78%', left: '42%', size: 2, color: '#fff',    dur: 2.3, delay: 0.7 },
  { top: '55%', left: '50%', size: 1, color: '#fff',    dur: 1.5, delay: 1.1 },
  { top: '48%', left: '63%', size: 2, color: '#fb923c', dur: 2.6, delay: 0.5 },
]

interface AtmoIcon {
  Icon: Icon
  color: string
  left: string
  top: string
  dur: number
  delay: number
  op: number
  tx: string
  ty: string
  tx2: string
  ty2: string
}

const ATMO_ICONS: AtmoIcon[] = [
  { Icon: GameController, color: 'rgba(0,210,255,0.9)', left: '15%', top: '40%', dur: 11, delay: 0,   op: 0.72, tx:  '6px', ty:  '-9px', tx2: '12px',  ty2: '-18px' },
  { Icon: Shield,         color: 'rgba(0,210,255,0.9)', left: '68%', top: '22%', dur:  9, delay: 2,   op: 0.68, tx: '-5px', ty:   '8px', tx2: '-10px', ty2:  '15px' },
  { Icon: CrosshairSimple,color: 'rgba(0,210,255,0.85)',left: '62%', top: '60%', dur: 13, delay: 4,   op: 0.65, tx: '-7px', ty:  '-6px', tx2: '-14px', ty2: '-12px' },
  { Icon: Star,           color: 'rgba(251,146,60,0.95)',left:'44%', top: '65%', dur: 10, delay: 1.5, op: 0.78, tx:  '4px', ty: '-10px', tx2:  '8px',  ty2: '-18px' },
  { Icon: Lightning,      color: 'rgba(251,146,60,0.9)', left: '26%', top: '24%', dur: 12, delay: 5,  op: 0.70, tx:  '8px', ty:   '7px', tx2: '14px',  ty2:  '14px' },
  { Icon: Crown,          color: 'rgba(251,146,60,0.88)',left: '52%', top: '30%', dur: 14, delay: 3,  op: 0.65, tx: '-6px', ty:   '6px', tx2: '-11px', ty2:  '12px' },
  { Icon: Sword,          color: 'rgba(100,220,255,0.85)',left:'76%', top: '48%', dur: 10, delay: 6.5,op: 0.60, tx: '-5px', ty:  '-8px', tx2: '-10px', ty2: '-15px' },
]

export function MagicOrb({ className = '', focused = false, children }: MagicOrbProps) {
  return (
    <div
      className={`rounded-full overflow-hidden relative ${className}`}
      style={{ animation: 'orb-breathe 5s ease-in-out infinite' }}
    >
      {/* Layer 1: deep teal background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle at 48% 52%, #091c2a 0%, #040e18 50%, #010608 100%)' }}
      />

      {/* Layer 2: cyan cloud — upper left */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 28%, rgba(0,200,255,0.22) 0%, transparent 45%), radial-gradient(circle at 65% 20%, rgba(0,160,220,0.12) 0%, transparent 35%)',
          animation: 'orb-cloud-drift 7s ease-in-out infinite alternate',
        }}
      />

      {/* Layer 3: orange cloud — lower right */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 58% 72%, rgba(249,115,22,0.22) 0%, rgba(251,146,60,0.1) 35%, transparent 60%), radial-gradient(circle at 28% 68%, rgba(249,115,22,0.08) 0%, transparent 30%)',
          animation: 'orb-cloud-drift-rev 8s ease-in-out infinite alternate-reverse',
        }}
      />

      {/* Layer 4: star particles */}
      {STAR_PARTICLES.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            background: s.color,
            transition: 'opacity 600ms ease',
            opacity: focused ? 0 : 1,
            animation: `orb-star-twinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
          } as CSSProperties}
        />
      ))}

      {/* Layer 5: atmospheric Phosphor icons */}
      {ATMO_ICONS.map(({ Icon, color, left, top, dur, delay, op, tx, ty, tx2, ty2 }, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left,
            top,
            transition: 'opacity 600ms ease',
            opacity: focused ? 0 : 1,
            '--icon-op': op,
            '--icon-tx': tx,
            '--icon-ty': ty,
            '--icon-tx2': tx2,
            '--icon-ty2': ty2,
            animation: `orb-icon-drift ${dur}s ${delay}s ease-in-out infinite`,
          } as CSSProperties}
        >
          <Icon size={16} color={color} />
        </div>
      ))}

      {/* Layer 6: glass highlight — top left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '7%', left: '14%',
          width: '42%', height: '30%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.65) 0%, rgba(200,240,255,0.25) 55%, transparent 100%)',
          borderRadius: '50%',
          transform: 'rotate(-28deg)',
          filter: 'blur(3px)',
        }}
      />

      {/* Layer 7: glass glint */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '13%', left: '27%',
          width: '11%', height: '8%',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '50%',
          filter: 'blur(1.5px)',
        }}
      />

      {/* Children — rendered above all layers */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
