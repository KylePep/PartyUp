import { useEffect, useState } from 'react'
import {
  getPendingLikes,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
} from '../api/endpoints/characters'

interface PendingLikesBarProps {
  character: Character
  onMatch: () => void
}

export function PendingLikesBar({ character, onMatch }: PendingLikesBarProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<DiscoverCharacter[]>([])

  useEffect(() => {
    getPendingLikes(character.id).then(setPending).catch(() => {})
  }, [character.id])

  async function handleInteract(toCharacterId: string, type: 'Like' | 'Dislike') {
    try {
      const res = await interactWithCharacter(character.id, toCharacterId, type)
      if (res.isMatch) onMatch()
    } catch { /* fail silently */ }
    setPending(p => p.filter(c => c.id !== toCharacterId))
  }

  if (pending.length === 0) return null

  return (
    <div className="relative border-t border-border">
      {open && (
        <div className="absolute bottom-full left-0 right-0 z-50 bg-surface border-t border-border p-4 shadow-lg">
          <div className="flex gap-6">
            {pending.slice(0, 3).map(c => (
              <div key={c.id} className="flex flex-col items-center gap-1.5">
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center">
                    <span className="text-xs font-mono text-muted font-bold">
                      {c.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xs font-mono text-text text-center max-w-16 truncate">
                  {c.name}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInteract(c.id, 'Like')}
                    className="text-success text-base leading-none hover:scale-125 transition-transform"
                    aria-label={`Like ${c.name}`}
                  >
                    ♥
                  </button>
                  <button
                    onClick={() => handleInteract(c.id, 'Dislike')}
                    className="text-danger text-base leading-none hover:scale-125 transition-transform"
                    aria-label={`Pass on ${c.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-2.5 text-xs font-mono text-muted uppercase tracking-widest hover:text-text transition-colors flex items-center justify-between"
      >
        <span>{pending.length} pending {pending.length === 1 ? 'like' : 'likes'}</span>
        <span className="text-muted">{open ? '▼' : '▲'}</span>
      </button>
    </div>
  )
}
