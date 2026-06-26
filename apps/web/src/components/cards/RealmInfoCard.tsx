import { HandshakeIcon, ClockCountdownIcon, CalendarIcon, TimerIcon } from '@phosphor-icons/react'

interface RealmInfoCardProps {
  matchCount: number
  pendingCount: number
  characterCreatedAt: string | null
  lastMatchedAt: string | null
  gameImageUrl?: string
  gameName: string
  className?: string
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  return `${days}d`
}

export function RealmInfoCard({
  matchCount,
  pendingCount,
  characterCreatedAt,
  lastMatchedAt,
  gameImageUrl,
  gameName,
  className,
}: RealmInfoCardProps) {
  return (
    <div
      className={`relative overflow-hidden border-4 border-black rounded-xl shadow aspect-[2/3] md:aspect-[3/2] ${className ?? ''}`}
    >
      {/* Background */}
      {gameImageUrl ? (
        <img src={gameImageUrl} alt={gameName} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
          <span className="font-mono text-muted font-bold text-4xl">{gameName.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/50" />

      {/* Mobile: 2 stats filling the full card face */}
      <div className="absolute inset-0 flex md:hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <HandshakeIcon size={16} className="text-white" />
          <span className="font-mono font-bold text-white text-sm">{matchCount}</span>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <ClockCountdownIcon size={16} className="text-white" />
          <span className="font-mono font-bold text-white text-sm">{pendingCount}</span>
        </div>
      </div>

      {/* Desktop: 4 stats in a 2x2 bottom strip */}
      <div className="absolute bottom-0 left-0 right-0 hidden md:grid grid-cols-2 bg-black/80 p-2 gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <HandshakeIcon size={10} className="text-white shrink-0" />
          <span className="font-mono text-white text-xxs truncate">{matchCount} Matches</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <ClockCountdownIcon size={10} className="text-white shrink-0" />
          <span className="font-mono text-white text-xxs truncate">{pendingCount} Pending</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <CalendarIcon size={10} className="text-white shrink-0" />
          <span className="font-mono text-white text-xxs truncate">{daysAgo(characterCreatedAt)} Realm</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <TimerIcon size={10} className="text-white shrink-0" />
          <span className="font-mono text-white text-xxs truncate">{daysAgo(lastMatchedAt)} Last</span>
        </div>
      </div>
    </div>
  )
}
