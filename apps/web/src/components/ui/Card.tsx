import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
}

const paddingClasses = { sm: 'p-3', md: 'p-4', lg: 'p-6' }

export function Card({ padding = 'md', className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-lg ${paddingClasses[padding]} ${className}`}
      {...props}
    />
  )
}
