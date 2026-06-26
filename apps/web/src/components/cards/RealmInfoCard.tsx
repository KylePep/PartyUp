import { HandshakeIcon, ClockCountdownIcon, CalendarIcon, TimerIcon } from '@phosphor-icons/react'

interface RealmInfoCardProps {
  matchCount: number
  pendingCount: number
  characterCreatedAt: string | null
  lastMatchedAt: string | null
  gameName: string
  className?: string
}

function mobileCount(n: number): string {
  return n > 9 ? '+' : String(n)
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
  className,
}: RealmInfoCardProps) {
  return (
    <div
      className={`relative overflow-hidden border-4 border-black rounded-xl shadow aspect-[2/3] md:aspect-[3/2] ${className ?? ''}`}
    >

      <div className="absolute inset-0 bg-black" />

      {/* Mobile: 2 stats filling the full card face */}
      <div className="absolute inset-0 flex flex-col md:hidden">
        <div className="flex-1 flex items-center justify-center gap-2">
          <HandshakeIcon size={16} className="text-white" />
          <span className="font-mono font-bold text-white text-sm">{mobileCount(matchCount)}</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-2">
          <ClockCountdownIcon size={16} className="text-white" />
          <span className="font-mono font-bold text-white text-sm">{mobileCount(pendingCount)}</span>
        </div>
      </div>

      {/* Desktop: 4 stats in a 2x2 bottom strip */}
      <div className="absolute top-0 bottom-0 left-0 right-0 hidden md:grid grid-cols-2 grid-rows-4 bg-black/80 p-2 gap-1">
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
