import type { ReactNode } from 'react'

interface BinderShellProps {
  title: ReactNode
  children: ReactNode
  footer: ReactNode
  footerClassName?: string
  className?: string
}

export function BinderShell({ title, children, footer, footerClassName = '', className = '' }: BinderShellProps) {
  return (
    <div className={`binder-frame border-cyan-950/20 border-10 md:border-16 rounded-l-lg rounded-r-4xl pb-4 pt-16 md:pt-4 px-6 flex flex-col items-center justify-between ${className}`}>
      <h1 className="font-display font-bold text-xl md:text-4xl text-off-black bg-off-white px-4 py-1 rounded-md">
        {title}
      </h1>
      {children}
      <div className={`border-cyan-950/50 border-8 md:border-10 rounded-4xl w-full md:w-3/4 h-1/3 ${footerClassName}`}>
        {footer}
      </div>
    </div>
  )
}
