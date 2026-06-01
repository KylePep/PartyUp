import { CharacterCard } from './cards/CharacterCard'
import { EmptyState, Spinner } from './ui'
import type { Character } from '../api/endpoints/characters'

interface CharacterGalleryProps {
  characters: Character[]
  status: 'loading' | 'ready' | 'empty' | 'error'
  selectedId: string | null
  onSelect: (character: Character) => void
}

export function CharacterGallery({ characters, status, selectedId, onSelect }: CharacterGalleryProps) {
  if (status === 'loading') {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }
  if (status === 'error') {
    return <EmptyState message="Could not load characters" />
  }
  return (
    <>
      {status === 'empty' ? (
        <EmptyState message="You haven't created any characters yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-rows-2 gap-4 h-full">
          {characters.map(c => (
            <div
              key={c.id}
              className="rounded-xl transition-all"
              style={{
                outline: selectedId === c.id ? '2px solid #991b1b' : '2px solid transparent',
                outlineOffset: '2px',
              }}
            >
              <CharacterCard character={c} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
