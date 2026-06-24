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
    const mobileRows: T[][] = []
    for (let i = 0; i < items.length; i += 2) {
      mobileRows.push(items.slice(i, i + 2))
    }

    const colsClass: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3' }

    const renderRows = (chunkedRows: T[][], cols: number) =>
      chunkedRows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="lg:sticky lg:top-0 bg-background"
          style={{ zIndex: rowIndex + 1 }}
        >
          <div className={`grid ${colsClass[cols]} gap-2 md:gap-4 px-2 md:px-4 py-1 md:py-2`}>
            {row.map(item => (
              <React.Fragment key={getKey(item)}>
                {renderItem(item)}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))

    return (
      <>
        <div className="hidden md:block flex-1 min-h-0 overflow-y-auto">
          {renderRows(rows, 3)}
        </div>
        <div className="block md:hidden flex-1 min-h-0 overflow-y-auto">
          {renderRows(mobileRows, 2)}
        </div>
      </>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 grid-rows-3 lg:grid-rows-2 gap-2 md:gap-4 flex-1 min-h-0  p-1 md:p-4 overflow-hidden overflow-y-auto">
      {items.map(item => (
        <React.Fragment key={getKey(item)}>
          {renderItem(item)}
        </React.Fragment>
      ))}
    </div>
  )
}
