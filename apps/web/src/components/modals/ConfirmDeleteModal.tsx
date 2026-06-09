import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  loading?: boolean
}

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemName, loading }: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Delete ${itemName}?`}>
      <div className="px-6 py-4">
        <p className="text-sm text-muted font-mono">This action cannot be undone.</p>
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
