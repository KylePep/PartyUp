interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  mmoOnly: boolean;
  excludeAdditions: boolean;
  onMmoToggle: () => void;
  onExcludeAdditionsToggle: () => void;
}

export function GameSearchControls({
  query,
  onQueryChange,
  mmoOnly,
  excludeAdditions,
  onMmoToggle,
  onExcludeAdditionsToggle,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search input */}
      <div className="relative flex-1">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search for a game..."
          aria-label="Search games"
          className="w-full bg-brand-surface border border-brand-border text-brand-text pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-gold transition-colors placeholder:text-brand-muted/50"
        />
      </div>

      {/* MMO toggle */}
      <button
        onClick={onMmoToggle}
        aria-pressed={mmoOnly}
        className={`flex items-center gap-2.5 px-5 py-3 border text-sm font-display tracking-wider transition-colors duration-200 whitespace-nowrap ${mmoOnly
          ? "bg-brand-gold/10 border-brand-gold text-brand-gold"
          : "bg-transparent border-brand-border text-brand-muted hover:border-brand-gold/60 hover:text-brand-gold"
          }`}
      >
        <span
          className={`w-2 h-2 rotate-45 inline-block transition-colors duration-200 ${mmoOnly ? "bg-brand-gold" : "bg-brand-border"
            }`}
        />
        MMO Only
      </button>

      {/* Exclude Additions toggle */}
      <button
        onClick={onExcludeAdditionsToggle}
        aria-pressed={excludeAdditions}
        className={`flex items-center gap-2.5 px-5 py-3 border text-sm font-display tracking-wider transition-colors duration-200 whitespace-nowrap ${excludeAdditions
          ? "bg-brand-gold/10 border-brand-gold text-brand-gold"
          : "bg-transparent border-brand-border text-brand-muted hover:border-brand-gold/60 hover:text-brand-gold"
          }`}
      >
        <span
          className={`w-2 h-2 rotate-45 inline-block transition-colors duration-200 ${excludeAdditions ? "bg-brand-gold" : "bg-brand-border"
            }`}
        />
        Exclude Additions
      </button>
    </div>
  );
}
