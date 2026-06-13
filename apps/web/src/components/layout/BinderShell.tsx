import type { CSSProperties, ReactNode } from 'react'

interface BinderShellProps {
  title: ReactNode
  children: ReactNode
  clasp?: ReactNode
  claspClassName?: string
  claspStyle?: CSSProperties
  footer: ReactNode
  footerClassName?: string
  className?: string
}

export function BinderShell({ title, children, clasp, claspClassName = '', claspStyle, footer, footerClassName = '', className = '' }: BinderShellProps) {
  return (
    <div className={`relative binder-frame border-[#1a0c04] border-10 md:border-16 rounded py-8 md:py-4 px-6 flex flex-col md:gap-4 items-center justify-between ${className}`}>

      {/* Gold nameplate */}
      <div className="relative mt-8 md:mt-2 px-7 py-2 md:px-10 md:py-3 w-3/4 md:w-1/2 max-w-3/4" style={{
        background: 'linear-gradient(175deg, #e8b830 0%, #f5d060 18%, #c89018 38%, #eabc2c 55%, #b07808 72%, #d4a020 88%, #a06808 100%)',
        boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.55), inset 0 -1px 3px rgba(255,220,100,0.15), 0 4px 12px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.4)',
        borderTop: '1px solid #c89018',
        borderLeft: '1px solid #c89018',
        borderBottom: '2px solid #6a4404',
        borderRight: '2px solid #6a4404',
        borderRadius: '3px',
      }}>
        {/* Stitching */}
        <div className="absolute pointer-events-none" style={{ inset: '4px', border: '1px dashed rgba(80,40,0,0.3)', borderRadius: '2px' }} />
        {/* Brass corner rivets */}
        {['top-1.5 left-1.5', 'top-1.5 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'].map((pos, i) => (
          <span key={i} className={`absolute ${pos} w-1.5 h-1.5 rounded-full pointer-events-none`} style={{
            background: 'radial-gradient(circle at 36% 32%, rgba(255,235,130,0.9), rgba(185,135,40,0.7) 55%, rgba(80,50,0,0.9))',
            boxShadow: '0 1px 2px rgba(0,0,0,0.7)',
          }} />
        ))}
        <h1 className="font-display font-black text-xl md:text-4xl" style={{
          color: 'rgba(45,20,0,0.88)',
          textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,225,90,0.35)',
          letterSpacing: '0.25em',
        }}>
          {title}
        </h1>
      </div>

      <div className="absolute top-0 md:center translate-y-1/2 md:translate-y-1/3 w-full h-2/5 md:h-1/2 flex">
        {children}
      </div>

      {/* Leather footer display section */}
      <div className="w-full h-full flex flex-col items-center justify-end">
        {/* Leather label tab */}
        {!clasp && (
          <div
            className="flex items-center gap-2 w-full md:w-3/4 px-4 py-1.5"
            style={{
              background: 'linear-gradient(160deg, #3e1f0c 0%, #2b1508 45%, #231108 100%)',
              borderRadius: '3px 3px 0 0',
              borderTop: '1px solid #1c0e05',
              borderLeft: '1px solid #1c0e05',
              borderRight: '1px solid #120802',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(190,140,60,0.45))' }} />
            <span
              className="font-display font-semibold uppercase"
              style={{
                fontSize: '0.62rem',
                color: 'rgba(215,170,82,0.78)',
                letterSpacing: '0.24em',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}
            >
              Recent Realms
            </span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(190,140,60,0.45))' }} />
          </div>
        )}

        {/* Leather display panel */}
        <div
          className={`relative w-full md:w-3/4 px-3 ${footerClassName}`}
          style={{
            background: 'linear-gradient(158deg, #3f1e0b 0%, #2b1508 30%, #1e0e05 55%, #271408 78%, #321b0b 100%)',
            boxShadow: [
              'inset 0 4px 16px rgba(0,0,0,0.8)',
              'inset 0 -2px 5px rgba(255,155,55,0.04)',
              'inset 2px 0 8px rgba(0,0,0,0.35)',
              'inset -2px 0 8px rgba(0,0,0,0.35)',
              '0 8px 20px rgba(0,0,0,0.5)',
              '0 2px 4px rgba(0,0,0,0.4)',
            ].join(', '),
            border: '1px solid #140901',
            borderRight: '2px solid #0d0601',
            borderBottom: '3px solid #090401',
            borderRadius: !clasp ? '0 0 3px 3px' : '3px',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
            mixBlendMode: 'soft-light',
            opacity: 0.5,
          }} />
          <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
            height: '1px',
            background: 'linear-gradient(to right, transparent 10%, rgba(255,190,100,0.14) 35%, rgba(255,190,100,0.2) 50%, rgba(255,190,100,0.14) 65%, transparent 90%)',
          }} />
          <div className="absolute pointer-events-none" style={{
            inset: '6px',
            border: '1px dashed rgba(188,138,62,0.32)',
            borderRadius: '2px',
          }} />
          {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-1.5 h-1.5 rounded-full pointer-events-none`} style={{
              background: 'radial-gradient(circle at 36% 32%, rgba(225,185,90,0.7), rgba(150,105,40,0.5) 55%, rgba(60,38,10,0.8))',
              boxShadow: '0 1px 2px rgba(0,0,0,0.65)',
            }} />
          ))}
          <div className="relative z-10">{footer}</div>
        </div>
      </div>

      {/* Corner caps — leather L-brackets */}
      <span className="absolute rounded -top-3 md:-top-5 -left-3 md:-left-5 w-10 md:w-20 h-10 md:h-20 pointer-events-none" style={{
        clipPath: 'polygon(0 0, 100% 0, 100% 25%, 25% 25%, 25% 100%, 0 100%)',
        background: 'linear-gradient(135deg, #6c3418 0%, #4a2010 35%, #5c2c14 60%, #3a1a08 100%)',
        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.6))',
      }} />
      <span className="absolute rounded -top-3 md:-top-5 -right-3 md:-right-5 w-10 md:w-20 h-10 md:h-20 pointer-events-none" style={{
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 75% 100%, 75% 25%, 0 25%)',
        background: 'linear-gradient(225deg, #6c3418 0%, #4a2010 35%, #5c2c14 60%, #3a1a08 100%)',
        filter: 'drop-shadow(-2px 2px 4px rgba(0,0,0,0.6))',
      }} />
      <span className="absolute rounded -bottom-3 md:-bottom-5 -left-3 md:-left-5 w-10 md:w-20 h-10 md:h-20 pointer-events-none" style={{
        clipPath: 'polygon(0 0, 25% 0, 25% 75%, 100% 75%, 100% 100%, 0 100%)',
        background: 'linear-gradient(45deg, #6c3418 0%, #4a2010 35%, #5c2c14 60%, #3a1a08 100%)',
        filter: 'drop-shadow(2px -2px 4px rgba(0,0,0,0.6))',
      }} />
      <span className="absolute rounded -bottom-3 md:-bottom-5 -right-3 md:-right-5 w-10 md:w-20 h-10 md:h-20 pointer-events-none" style={{
        clipPath: 'polygon(75% 0, 100% 0, 100% 100%, 0 100%, 0 75%, 75% 75%)',
        background: 'linear-gradient(315deg, #6c3418 0%, #4a2010 35%, #5c2c14 60%, #3a1a08 100%)',
        filter: 'drop-shadow(-2px -2px 4px rgba(0,0,0,0.6))',
      }} />

      {clasp && (
        <div
          className={`absolute -bottom-10 center md:top-1/2 md:-right-10 md:-translate-y-1/2 w-40 md:w-56 h-38 md:h-48 overflow-hidden rounded-t-full md:rounded-r-none md:rounded-l-full flex flex-1 flex-col items-center justify-center p-4 ${claspClassName}`}
          style={{
            background: 'linear-gradient(158deg, #3f1e0b 0%, #2b1508 30%, #1e0e05 55%, #271408 78%, #321b0b 100%)',
            boxShadow: [
              'inset 0 4px 20px rgba(0,0,0,0.85)',
              'inset 0 -2px 6px rgba(255,155,55,0.04)',
              'inset 2px 0 8px rgba(0,0,0,0.4)',
              '0 8px 24px rgba(0,0,0,0.6)',
              '0 2px 6px rgba(0,0,0,0.5)',
            ].join(', '),
            borderTop: '2px solid #1c0e05',
            borderLeft: '2px solid #1c0e05',
            borderRight: '1px solid #0e0602',
            borderBottom: '1px solid #0e0602',
            ...claspStyle,
          }}
        >
          {/* Grain texture */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
            mixBlendMode: 'soft-light',
            opacity: 0.5,
          }} />
          {/* Top specular highlight */}
          <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
            height: '1px',
            background: 'linear-gradient(to right, transparent 15%, rgba(255,190,100,0.12) 40%, rgba(255,190,100,0.18) 50%, rgba(255,190,100,0.12) 60%, transparent 85%)',
          }} />
          {/* Stitching */}
          <div
            className="absolute pointer-events-none rounded-t-full md:rounded-r-none md:rounded-l-full"
            style={{ inset: '8px', border: '1px dashed rgba(188,138,62,0.22)' }}
          />
          <div className="relative z-10 w-full flex items-center justify-center">{clasp}</div>
        </div>
      )}
    </div>
  )
}
