import type { ReactNode } from 'react'

interface BinderShellProps {
  title: ReactNode
  children: ReactNode
  clasp?: ReactNode
  claspClassName?: string
  footer: ReactNode
  footerClassName?: string
  className?: string
}

export function BinderShell({ title, children, clasp, claspClassName = '', footer, footerClassName = '', className = '' }: BinderShellProps) {
  return (
    <div className={`relative binder-frame border-cyan-950/20 border-10 md:border-16 rounded py-8 md:py-4 px-6 flex flex-col md:gap-4 items-center justify-between ${className}`}>
      <h1 className="font-display font-bold text-xl md:text-4xl text-off-black bg-off-white px-4 py-1 rounded mt-8 md:mt-4">
        {title}
      </h1>
      <div className=" absolute top-0 md:center translate-y-1/2 md:translate-y-1/3 w-full h-2/5 md:h-1/2 flex" >
        {children}
      </div>
      <div className={`border-cyan-950/50 border-8 md:border-10 rounded w-full md:w-3/4 px-3 ${footerClassName}`}>
        {footer}
      </div>

      {/* Corner caps */}
      <span className="absolute rounded -top-3 md:-top-5 -left-3 md:-left-5 w-10 md:w-20 h-10 md:h-20 border-t-10 md:border-t-20 border-l-10 md:border-l-20 border-cyan-400 pointer-events-none" />
      <span className="absolute rounded -top-3 md:-top-5 -right-3 md:-right-5 w-10 md:w-20 h-10 md:h-20 border-t-10 md:border-t-20 border-r-10 md:border-r-20 border-cyan-400 pointer-events-none" />
      <span className="absolute rounded -bottom-3 md:-bottom-5 -left-3 md:-left-5 w-10 md:w-20 h-10 md:h-20 border-b-10 md:border-b-20 border-l-10 md:border-l-20 border-cyan-400 pointer-events-none" />
      <span className="absolute rounded -bottom-3 md:-bottom-5 -right-3 md:-right-5 w-10 md:w-20 h-10 md:h-20 border-b-10 md:border-b-20 border-r-10 md:border-r-20 border-cyan-400 pointer-events-none" />


      {clasp && (
        <div className={`absolute -bottom-10 center md:top-1/2 md:-right-10 md:-translate-y-1/2 w-48 md:w-48 h-32 md:h-48 rounded bg-cyan-900 border-cyan-950 border-8 md:border-16 ${claspClassName}`} >
          {clasp}
        </div>
      )}
    </div>
  )
}
