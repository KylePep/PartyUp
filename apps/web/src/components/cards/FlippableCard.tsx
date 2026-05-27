import { useState } from 'react'

interface FlippableCardProps {
  front: React.ReactNode
  back: React.ReactNode
  className?: string
}

export function FlippableCard({ front, back, className = '' }: FlippableCardProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className={className} style={{ perspective: '1000px' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
          {front}
          {/* Flip trigger — covers bottom 35% of the card (the bottom info panel) */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '35%',
              cursor: 'pointer',
              zIndex: 10,
            }}
            onClick={() => setFlipped(true)}
          />
        </div>
        {/* Back face — pre-rotated so it reads correctly when the container flips */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            cursor: 'pointer',
          }}
          onClick={() => setFlipped(false)}
        >
          {back}
        </div>
      </div>
    </div>
  )
}
