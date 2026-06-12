import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'

interface PaginationControlsProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function PaginationControls({ page, pageSize, totalCount, onPageChange }: PaginationControlsProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-muted tabular-nums">
        {totalCount === 0 ? '0 of 0' : `${start}–${end} of ${totalCount}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <CaretLeftIcon size={14} />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <CaretRightIcon size={14} />
        </button>
      </div>
    </div>
  )
}
