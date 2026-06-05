import React from 'react'
import { EmptyState, Spinner } from './ui'

interface GalleryProps<T> {
  items: T[]
  status: 'loading' | 'ready' | 'empty' | 'error'
  getKey: (item: T) => string
  renderItem: (item: T) => React.ReactNode
  emptyMessage?: string
  errorMessage?: string
}

export function Gallery<T>({
  items,
  status,
  getKey,
  renderItem,
  emptyMessage = 'Nothing here yet',
  errorMessage = 'Could not load items',
}: GalleryProps<T>) {
  if (status === 'loading') return <div className="flex justify-center py-10"><Spinner /></div>
  if (status === 'empty') return <EmptyState message={emptyMessage} />
  if (status === 'error') return <EmptyState message={errorMessage} />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 grid-rows-auto md:grid-rows-2 gap-4 flex-1 min-h-0 p-4 overflow-hidden overflow-y-auto">
      {items.map(item => (
        <React.Fragment key={getKey(item)}>
          {renderItem(item)}
        </React.Fragment>
      ))}
    </div>
  )
}
