import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

const RIVETS = ['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2']

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  useEscapeKey(onClose, isOpen)

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-md rounded overflow-hidden"
        style={{
          background: 'linear-gradient(158deg, #3f1e0b 0%, #2b1508 30%, #1e0e05 55%, #271408 78%, #321b0b 100%)',
          border: '1px solid #140901',
          borderRight: '2px solid #0d0601',
          borderBottom: '3px solid #090401',
          boxShadow: [
            'inset 0 4px 16px rgba(0,0,0,0.8)',
            'inset 0 -2px 5px rgba(255,155,55,0.04)',
            'inset 2px 0 8px rgba(0,0,0,0.35)',
            'inset -2px 0 8px rgba(0,0,0,0.35)',
            '0 24px 48px rgba(0,0,0,0.7)',
            '0 8px 24px rgba(0,0,0,0.5)',
          ].join(', '),
        }}
      >
        {/* Grain texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
            mixBlendMode: 'soft-light',
            opacity: 0.5,
          }}
        />

        {/* Gold dashed stitching */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: '6px',
            border: '1px dashed rgba(188,138,62,0.3)',
            borderRadius: '3px',
            zIndex: 0,
          }}
        />

        {/* Top specular highlight */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: '1px',
            background: 'linear-gradient(to right, transparent 10%, rgba(255,190,100,0.14) 35%, rgba(255,190,100,0.2) 50%, rgba(255,190,100,0.14) 65%, transparent 90%)',
          }}
        />

        {/* Brass corner rivets */}
        {RIVETS.map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-1.5 h-1.5 rounded-full pointer-events-none`}
            style={{
              background: 'radial-gradient(circle at 36% 32%, rgba(225,185,90,0.7), rgba(150,105,40,0.5) 55%, rgba(60,38,10,0.8))',
              boxShadow: '0 1px 2px rgba(0,0,0,0.65)',
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10">
          {title && (
            <div
              className="flex items-center justify-between px-4 py-4 mx-2"
              style={{ borderBottom: '1px solid rgba(188,138,62,0.2)' }}
            >
              <h2
                className="font-display font-semibold tracking-wide"
                style={{
                  color: 'rgba(215,170,82,0.9)',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="transition-colors hover:brightness-125"
                style={{ color: 'rgba(188,138,62,0.55)' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
