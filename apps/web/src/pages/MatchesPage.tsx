import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMatches, type CharacterMatchDto, type CharacterSummary } from '../api/endpoints/matches'
import { BinderLayout } from '../components/layout/BinderLayout'
import { EmptyState, Spinner } from '../components/ui'
import { MatchGallery } from '../components/MatchGallery'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'

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
        {character.bio && (
          <p className="text-xs text-muted line-clamp-3 leading-relaxed mb-2">{character.bio}</p>
        )}
        {character.additionalNotes && (
          <p className="text-xs text-muted line-clamp-2 leading-relaxed">{character.additionalNotes}</p>
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
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')
  const [matches, setMatches] = useState<CharacterMatchDto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<CharacterMatchDto | null>(null)

  useEffect(() => {
    getMatches()
      .then(m => {
        setMatches(m)
        setStatus(m.length === 0 ? 'empty' : 'ready')
        if (targetId) {
          setSelected(m.find(match => match.matchId === targetId) ?? null)
        }
      })
      .catch(() => setStatus('error'))
  }, [targetId])

  const leftContent = selected ? (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
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

    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a match</p>
    </div>
  )

  const rightContent = (
    <div className="p-4 overflow-y-auto h-full w-full min-h-0">
      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner /></div>
      )}
      {status === 'error' && <EmptyState message="Could not load matches" />}
      {status === 'empty' && <EmptyState message="No matches yet — keep swiping!" />}
      {status === 'ready' && (
        <MatchGallery
          matches={matches}
          selectedId={selected?.matchId ?? null}
          onSelect={setSelected}
          limit={6}
        />
      )}
    </div>
  )

  return (
    <BinderLayout
      barColor='#166534'
      barContent={selected ? (
        <>
          <CharacterMiniCard character={selected.myCharacter} characterId={selected.myCharacter.id} />
          <GameMiniCard game={{ name: selected.gameName, imageUrl: selected.gameImageUrl }} gameId={selected.gameId} />
        </>
      ) : undefined}
      activeTab={"Collection"}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  )
}
