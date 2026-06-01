import { useState } from 'react'

interface FlippableCardProps {
  front: React.ReactNode
  back: React.ReactNode
  className?: string
  onFrontClick?: () => void
}

export function FlippableCard({ front, back, className = '', onFrontClick }: FlippableCardProps) {
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
        {/* Front face — click anywhere to flip */}
        <div
          style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', cursor: 'pointer' }}
          onClick={() => onFrontClick ? onFrontClick() : setFlipped(true)}
        >
          {front}
        </div>

        {/* Back face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
          {/* Flip-back trigger pinned to bottom — outside the scroll container */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '32px',
              cursor: 'pointer',
              zIndex: 10,
            }}
            onClick={() => setFlipped(false)}
          />
        </div>
      </div>
    </div>
  )
}
