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
    <div className={`relative binder-frame border-cyan-950/20 border-10 md:border-16 rounded py-8 md:py-4 px-6 flex flex-col md:gap-4 items-center justify-between ${className}`}>
      <div className="relative mt-8 md:mt-2 px-7 py-2 md:px-10 md:py-3 w-3/4 md:w-1/2 max-w-3/4" style={{
        background: 'linear-gradient(175deg, #d8e4e8 0%, #b4c8cc 30%, #cad8de 54%, #a4bcc4 80%, #bcccd4 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.1), 0 6px 8px rgba(0,0,0,0.05), 0 2px 5px rgba(0,0,0,0.3)',
        borderTop: '1px solid #c0d0d4',
        borderLeft: '1px solid #b0c4c8',
        borderBottom: '2px solid #4a6870',
        borderRight: '2px solid #5a7880',
        borderRadius: '3px',
      }}>
        {['top-1.5 left-1.5', 'top-1.5 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'].map((pos, i) => (
          <span key={i} className={`absolute ${pos} w-1.5 h-1.5 rounded-full pointer-events-none`} style={{
            background: 'radial-gradient(circle at 36% 30%, #dce8ec, #78909a 56%, #364850)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }} />
        ))}
        <h1 className="font-display font-black text-xl md:text-4xl text-cyan-800/90" style={{
          textShadow: '-1px -1px 0px rgba(7, 7, 7, 0.65)',
          letterSpacing: '0.25em',
        }}>
          {title}
        </h1>
      </div>
      <div className=" absolute top-0 md:center translate-y-1/2 md:translate-y-1/3 w-full h-2/5 md:h-1/2 flex" >
        {children}
      </div>


      <div className="w-full h-full flex flex-col items-center justify-end gap-2">
        {!clasp && (
          <span className="w-full md:w-3/4 font-display font-semibold">Recent Realms</span>
        )}
        <div className={`relative border-cyan-950/50 border-8 md:border-10 rounded w-full md:w-3/4 px-3 ${footerClassName}`}>
          {footer}
        </div>
      </div>

      {/* Corner caps — metallic L-brackets */}
      <span className="absolute rounded -top-3 md:-top-5 -left-3 md:-left-5 w-10 md:w-20 h-10 md:h-20 pointer-events-none" style={{
        clipPath: 'polygon(0 0, 100% 0, 100% 25%, 25% 25%, 25% 100%, 0 100%)',
        background: 'linear-gradient(135deg, #e4eef2 0%, #b8cccc 35%, #c8d8de 60%, #90aab4 100%)',
        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.45))',
      }} />
      <span className="absolute rounded -top-3 md:-top-5 -right-3 md:-right-5 w-10 md:w-20 h-10 md:h-20 pointer-events-none" style={{
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 75% 100%, 75% 25%, 0 25%)',
        background: 'linear-gradient(225deg, #e4eef2 0%, #b8cccc 35%, #c8d8de 60%, #90aab4 100%)',
        filter: 'drop-shadow(-2px 2px 4px rgba(0,0,0,0.45))',
      }} />
      <span className="absolute rounded -bottom-3 md:-bottom-5 -left-3 md:-left-5 w-10 md:w-20 h-10 md:h-20 pointer-events-none" style={{
        clipPath: 'polygon(0 0, 25% 0, 25% 75%, 100% 75%, 100% 100%, 0 100%)',
        background: 'linear-gradient(45deg, #e4eef2 0%, #b8cccc 35%, #c8d8de 60%, #90aab4 100%)',
        filter: 'drop-shadow(2px -2px 4px rgba(0,0,0,0.45))',
      }} />
      <span className="absolute rounded -bottom-3 md:-bottom-5 -right-3 md:-right-5 w-10 md:w-20 h-10 md:h-20 pointer-events-none" style={{
        clipPath: 'polygon(75% 0, 100% 0, 100% 100%, 0 100%, 0 75%, 75% 75%)',
        background: 'linear-gradient(315deg, #e4eef2 0%, #b8cccc 35%, #c8d8de 60%, #90aab4 100%)',
        filter: 'drop-shadow(-2px -2px 4px rgba(0,0,0,0.45))',
      }} />


      {clasp && (
        <div className={`absolute -bottom-10 center md:top-1/2 md:-right-10 md:-translate-y-1/2 w-48 md:w-56 h-32 md:h-48 rounded bg-cyan-900 border-cyan-800 border-t-2 border-l-2 shadow-xl rounded-l-full flex flex-1 flex-col items-center justify-center p-2 md:p-6 ${claspClassName}`} >
          {clasp}
        </div>
      )}
    </div>
  )
}
