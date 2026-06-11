import React from 'react'
import { EmptyState, Spinner } from './ui'

interface GalleryProps<T> {
  items: T[]
  status: 'loading' | 'ready' | 'empty' | 'error'
  getKey: (item: T) => string
  renderItem: (item: T) => React.ReactNode
  emptyMessage?: string
  errorMessage?: string
  stickyRows?: boolean
}

export function Gallery<T>({
  items,
  status,
  getKey,
  renderItem,
  emptyMessage = 'Nothing here yet',
  errorMessage = 'Could not load items',
  stickyRows = false,
}: GalleryProps<T>) {
  if (status === 'loading') return <div className="flex justify-center py-10"><Spinner /></div>
  if (status === 'empty') return <EmptyState message={emptyMessage} />
  if (status === 'error') return <EmptyState message={errorMessage} />

  if (stickyRows) {
    const rows: T[][] = []
    for (let i = 0; i < items.length; i += 3) {
      rows.push(items.slice(i, i + 3))
    }
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="lg:sticky lg:top-0 bg-background"
            style={{ zIndex: rowIndex + 1 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 py-2">
              {row.map(item => (
                <React.Fragment key={getKey(item)}>
                  {renderItem(item)}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 grid-rows-auto lg:grid-rows-2 gap-4 flex-1 min-h-0 p-4 overflow-hidden overflow-y-auto">
      {items.map(item => (
        <React.Fragment key={getKey(item)}>
          {renderItem(item)}
        </React.Fragment>
      ))}
    </div>
  )
}
