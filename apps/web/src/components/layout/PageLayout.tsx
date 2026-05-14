import { type ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  className?: string
}

export function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <main className={`flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 ${className}`}>
      {children}
    </main>
  )
}
