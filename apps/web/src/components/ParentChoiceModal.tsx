import { FullArtTcgCard } from './cards/FullArtTcgCard'
import { Modal, Button } from './ui'
import type { GamePreviewDto } from '../api/endpoints/games'

interface ParentChoiceModalProps {
  selectedGame: GamePreviewDto
  parentGame: GamePreviewDto
  onChoose: (choice: GamePreviewDto) => void
  onDismiss: () => void
  adding?: boolean
}

export function ParentChoiceModal({ selectedGame, parentGame, onChoose, onDismiss, adding }: ParentChoiceModalProps) {
  function realmLabel(count: number) {
    return count === 0 ? 'No realm yet' : `${count} players`
  }

  return (
    <Modal isOpen onClose={onDismiss} title="Choose Your Realm">
      <div className="px-6 py-4 flex flex-col gap-6">
        <p className="text-sm text-text text-center">
          We noticed <strong>{selectedGame.name}</strong> is related to <strong>{parentGame.name}</strong>.{' '}
          Grouping players under the same realm helps everyone connect.
          Which realm would you like to join?
        </p>
        <div className="flex gap-4">
          <div className="flex flex-col gap-3 flex-1">
            <FullArtTcgCard
              name={selectedGame.name}
              imageUrl={selectedGame.imageUrl ?? undefined}
              platform={
                <span className="font-mono text-xs text-white">
                  {realmLabel(selectedGame.realmCount)}
                </span>
              }
              className="h-64"
            />
            <Button onClick={() => onChoose(selectedGame)} disabled={adding}>
              Join this realm
            </Button>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            <FullArtTcgCard
              name={parentGame.name}
              imageUrl={parentGame.imageUrl ?? undefined}
              platform={
                <span className="font-mono text-xs text-white">
                  {realmLabel(parentGame.realmCount)}
                </span>
              }
              className="h-64"
            />
            <Button onClick={() => onChoose(parentGame)} disabled={adding}>
              Join this realm
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
