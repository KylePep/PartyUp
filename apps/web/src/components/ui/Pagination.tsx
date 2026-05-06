interface Props {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ page, totalPages, onPrev, onNext }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-6 mt-12">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Previous page"
        className="flex items-center gap-2 px-5 py-2.5 border border-brand-border text-brand-muted text-sm font-display tracking-wider hover:border-brand-gold/60 hover:text-brand-gold transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-brand-border disabled:hover:text-brand-muted"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Prev
      </button>

      <span className="font-display text-brand-muted text-sm tracking-widest">
        <span className="text-brand-gold">{page}</span>
        {" / "}
        {totalPages.toLocaleString()}
      </span>

      <button
        onClick={onNext}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="flex items-center gap-2 px-5 py-2.5 border border-brand-border text-brand-muted text-sm font-display tracking-wider hover:border-brand-gold/60 hover:text-brand-gold transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-brand-border disabled:hover:text-brand-muted"
      >
        Next
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
