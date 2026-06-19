import type { ReactNode } from "react"

interface BinderHeaderProps {
  title: string
  heightClassName?: string
  className?: string
  children?: ReactNode
}

export function BinderHeader({ title, children, className, heightClassName }: BinderHeaderProps) {
  return (
    <div className={`sticky top-0 z-10 w-full border-b-2 border-black/50 bg-orange-950/50 p-1 ${heightClassName ?? 'min-h-[64px]'}`}
      style={{ background: 'linear-gradient(158deg, #3f1e0b 0%, #2b1508 30%, #1e0e05 55%, #271408 78%, #321b0b 100%)' }}
    >
      <div
        className={`w-full h-full px-4 py-3 ${className}`} //flex items-center justify-between
        style={{
          inset: '6px',
          border: '1px dashed rgba(188, 138, 62, 0.40)',
          borderRadius: '2px',
        }}>
        {title && (
          <h2 className="text-xs font-mono uppercase tracking-widest">{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}