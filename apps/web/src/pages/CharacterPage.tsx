import { useEffect, useState } from 'react'
import { getCharacters, deleteCharacter, type Character } from '../api/endpoints/characters'
import { CharacterGallery } from '../components/CharacterGallery'
import { BinderLayout } from '../components/layout/BinderLayout'
import { Badge, Button } from '../components/ui'

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted uppercase tracking-widest w-24 flex-shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-text min-w-0">{children}</div>
    </div>
  )
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [selected, setSelected] = useState<Character | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getCharacters()
      .then(chars => {
        setCharacters(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  async function handleDelete() {
    if (!selected?.userGameId) return
    setDeleting(true)
    try {
      await deleteCharacter(selected.userGameId, selected.id)
      setCharacters(prev => {
        const next = prev.filter(c => c.id !== selected.id)
        if (next.length === 0) setStatus('empty')
        return next
      })
      setSelected(null)
    } finally {
      setDeleting(false)
    }
  }

  const leftContent = selected ? (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero */}
      <div
        className="flex gap-4 p-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-32 h-40 rounded-lg overflow-hidden flex-shrink-0"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {selected.imageUrl ? (
            <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-muted font-mono text-3xl"
              style={{ backgroundColor: 'var(--color-surface-raised)' }}
            >
              {selected.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-lg text-text mb-0.5">{selected.name}</h1>
          {selected.platformHandle && (
            <p className="font-mono text-muted text-sm mb-0.5">{selected.platformHandle}</p>
          )}
          {selected.platform && (
            <p className="text-xs text-muted mb-2">{selected.platform}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {selected.mainRole && <Badge variant="role">{selected.mainRole}</Badge>}
            {selected.secondaryRole && <Badge variant="role">{selected.secondaryRole}</Badge>}
            {selected.rank && <Badge variant="rank">{selected.rank}</Badge>}
            {selected.region && <Badge variant="region">{selected.region}</Badge>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-xs text-muted uppercase tracking-widest mb-2">Stats</p>
        {selected.playstyle && (
          <StatRow label="Playstyle">{selected.playstyle}</StatRow>
        )}
        {selected.usesVoiceChat != null && (
          <StatRow label="Voice Chat">{selected.usesVoiceChat ? 'Yes' : 'No'}</StatRow>
        )}
        {selected.preferredModes.length > 0 && (
          <StatRow label="Modes">
            <div className="flex flex-wrap gap-1">
              {selected.preferredModes.map(m => <Badge key={m}>{m}</Badge>)}
            </div>
          </StatRow>
        )}
        {selected.languages && selected.languages.length > 0 && (
          <StatRow label="Languages">
            <div className="flex flex-wrap gap-1">
              {selected.languages.map(l => <Badge key={l}>{l}</Badge>)}
            </div>
          </StatRow>
        )}
        {selected.timeZone && (
          <StatRow label="Time Zone">{selected.timeZone}</StatRow>
        )}
        {selected.activeTimes && selected.activeTimes.length > 0 && (
          <StatRow label="Active">
            <div className="flex flex-wrap gap-1">
              {selected.activeTimes.map(t => <Badge key={t}>{t}</Badge>)}
            </div>
          </StatRow>
        )}
      </div>

      {/* Game fields */}
      {selected.gameFields.length > 0 && (
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Game Fields</p>
          {selected.gameFields.map(f => (
            <StatRow key={f.key} label={f.label}>{f.value}</StatRow>
          ))}
        </div>
      )}

      {/* Bio */}
      {selected.bio && (
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Bio</p>
          <p className="text-sm text-text leading-relaxed">{selected.bio}</p>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 mt-auto">
        <Button
          variant="danger"
          size="sm"
          disabled={deleting || !selected.userGameId}
          onClick={handleDelete}
        >
          {deleting ? 'Deleting...' : 'Delete Character'}
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted font-mono text-sm">Select a character</p>
    </div>
  )

  const rightContent = (
    <div className="p-4 overflow-y-auto h-full">
      <CharacterGallery
        characters={characters}
        status={status}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />
    </div>
  )

  return (
    <BinderLayout
      barColor='#991b1b'
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
