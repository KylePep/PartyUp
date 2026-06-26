import { useEffect, useState } from 'react'
import {
  getPendingLikes,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
} from '../api/endpoints/characters'
import { PendingLikeCard } from './cards/PendingLikeCard'

interface PendingLikesBarProps {
  character: Character
  onMatch: () => void
  onCountChange?: (count: number) => void
}

export function PendingLikesBar({ character, onMatch, onCountChange }: PendingLikesBarProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<DiscoverCharacter[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    getPendingLikes(character.id).then(setPending).catch(() => { })
  }, [character.id])

  useEffect(() => {
    onCountChange?.(pending.length)
  }, [pending.length, onCountChange])

  async function handleInteract(toCharacterId: string, type: 'Like' | 'Dislike') {
    if (processing === toCharacterId) return
    setProcessing(toCharacterId)
    try {
      const res = await interactWithCharacter(character.id, toCharacterId, type)
      if (res.isMatch) onMatch()
    } catch (err) {
      console.error(`Failed to ${type.toLowerCase()} pending character:`, err)
    }
    setPending(p => p.filter(c => c.id !== toCharacterId))
    setProcessing(null)
  }

  if (pending.length === 0) return null

  return (
    <div className="relative border-t border-border h-16">
      {open && (
        <div className="absolute bottom-full overflow-x-auto  left-0 right-0 z-50 bg-surface border-t border-border px-4 pt-4 pb-2 shadow-lg">
          <div className="flex gap-4">
            {pending.slice(0, 5).map(c => (
              <PendingLikeCard
                key={c.id}
                character={c}
                onLike={() => handleInteract(c.id, 'Like')}
                onDislike={() => handleInteract(c.id, 'Dislike')}
              />
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-2.5 text-xs font-mono text-muted uppercase tracking-widest hover:text-text transition-colors flex items-center justify-between"
      >
        <span>{pending.length} pending {pending.length === 1 ? 'like' : 'likes'}</span>
        <span>{open ? '▼' : '▲'}</span>
      </button>
    </div>
  )
}
