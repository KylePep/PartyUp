import { type CSSProperties, useId } from 'react'

export interface GamePlanetProps {
  name: string
  imageUrl?: string | null
  index: number
  imgSize: number
  onSelect: () => void
  count?: number
}

export function GamePlanet({ name, imageUrl, index, imgSize, onSelect, count }: GamePlanetProps) {
  const uid = useId()
  const svgSize = imgSize + 24
  const bobDur = 3 + (index % 3) * 0.7
  const bobDelay = Math.min(index * 0.3, 2.1)
  const appearDelay = index * 0.05

  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center gap-0 bg-transparent border-0 cursor-pointer p-0"
      aria-label={`Select ${name}`}
      style={{
        animation: `planet-appear 0.4s ${appearDelay}s ease both, planet-bob ${bobDur}s ${bobDelay}s ease-in-out infinite`,
      } as CSSProperties}
    >
      <div style={{ position: 'relative', width: svgSize, height: svgSize + 18 }}>
        <img
          src={imageUrl ?? '/placeholder-game.png'}
          alt={name}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: imgSize,
            height: imgSize,
            borderRadius: '50%',
            objectFit: 'cover',
            boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
          }}
        />
        {count !== undefined && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 4,
              background: '#00d2ff',
              color: '#010608',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'monospace',
              zIndex: 1,
            }}
          >
            {count}
          </div>
        )}
        <svg
          width={svgSize}
          height={svgSize + 18}
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
          aria-hidden
        >
          <defs>
            <path
              id={`arc-${uid}`}
              d={`M 4,${svgSize / 2} a ${imgSize / 2 + 8},${imgSize / 2 + 8} 0 0,1 ${imgSize + 16},0`}
            />
          </defs>
          <text
            fontSize="11"
            fill="#e8e8f0"
            textAnchor="middle"
            letterSpacing="0.8"
            stroke="rgba(0,0,0,0.75)"
            strokeWidth="2.5"
            paintOrder="stroke fill"
          >
            <textPath href={`#arc-${uid}`} startOffset="50%">
              {name}
            </textPath>
          </text>
        </svg>
      </div>
    </button>
  )
}
