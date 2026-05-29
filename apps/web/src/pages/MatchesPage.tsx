import { useEffect, useState } from 'react'
import { getMatches, type CharacterMatchDto, type CharacterSummary } from '../api/endpoints/matches'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Badge, EmptyState, Spinner } from '../components/ui'

function MatchCharacterDetail({ character }: { character: CharacterSummary }) {
  return (
    <div className="flex gap-3">
      <div
        className="w-20 h-24 rounded-lg overflow-hidden flex-shrink-0"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-2xl"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-text text-sm">{character.platformHandle}</p>
        <p className="text-xs text-muted mb-2">{character.name}</p>
        <div className="flex flex-wrap gap-1 mb-2">
          {character.mainRole && <Badge variant="role">{character.mainRole}</Badge>}
          {character.secondaryRole && <Badge variant="role">{character.secondaryRole}</Badge>}
          {character.rank && <Badge variant="rank">{character.rank}</Badge>}
          {character.region && <Badge variant="region">{character.region}</Badge>}
          {character.playstyle && <Badge>{character.playstyle}</Badge>}
        </div>
        {character.bio && (
          <p className="text-xs text-muted line-clamp-3 leading-relaxed">{character.bio}</p>
        )}
        {character.gameFields.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {character.gameFields.map(f => (
              <p key={f.key} className="text-xs">
                <span className="text-muted">{f.label}: </span>
                <span className="text-text">{f.value}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<CharacterMatchDto | null>(null)

  useEffect(() => {
    getMatches()
      .then(m => {
        setMatches(m)
        setStatus(m.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  const leftContent = selected ? (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Match header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-xs text-muted uppercase tracking-widest mb-0.5">Match</p>
        <p className="font-display font-bold text-text">{selected.gameName}</p>
        <p className="text-xs text-muted">
          Matched {new Date(selected.matchedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Their character */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-xs text-muted uppercase tracking-widest mb-3">Their Character</p>
        <MatchCharacterDetail character={selected.theirCharacter} />
      </div>

      {/* My character */}
      <div className="px-4 py-4">
        <p className="text-xs text-muted uppercase tracking-widest mb-3">Your Character</p>
        <MatchCharacterDetail character={selected.myCharacter} />
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a match</p>
    </div>
  )

  const rightContent = (
    <div className="p-4 overflow-y-auto h-full">
      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner /></div>
      )}
      {status === 'error' && <EmptyState message="Could not load matches" />}
      {status === 'empty' && <EmptyState message="No matches yet — keep swiping!" />}
      {status === 'ready' && (
        <div className="grid grid-cols-3 gap-3">
          {matches.map(m => {
            const c = m.theirCharacter
            const isSelected = selected?.matchId === m.matchId
            return (
              <button
                key={m.matchId}
                onClick={() => setSelected(m)}
                className="rounded-xl overflow-hidden border-2 transition-all text-left flex flex-col"
                style={{
                  borderColor: isSelected ? '#166534' : 'var(--color-border)',
                  boxShadow: isSelected ? '0 0 0 2px #16663440' : 'none',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <div className="h-32 overflow-hidden flex-shrink-0">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-muted font-mono text-3xl"
                      style={{ backgroundColor: 'var(--color-surface-raised)' }}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-mono font-bold text-text truncate">{c.platformHandle}</p>
                  <p className="text-xs text-muted truncate">{m.gameName}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <BinderLayout
      barColor='#166534'
      tabs={[
        { label: 'My Cards', color: '#991b1b', to: "/characters" },
        { label: 'Games', color: '#1e40af', to: "/games" },
        { label: 'Collection', color: '#166534', to: "/matches" },
      ]}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
