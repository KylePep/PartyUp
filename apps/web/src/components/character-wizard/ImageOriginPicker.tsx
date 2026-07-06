const POINTS = [0, 50, 100] as const

const Y_LABELS: Record<number, string> = { 0: 'top', 50: 'middle', 100: 'bottom' }
const X_LABELS: Record<number, string> = { 0: 'left', 50: 'center', 100: 'right' }

interface ImageOriginPickerProps {
  imageUrl?: string
  focalX: number
  focalY: number
  onChange: (focalX: number, focalY: number) => void
}

export function ImageOriginPicker({ imageUrl, focalX, focalY, onChange }: ImageOriginPickerProps) {
  return (
    <div className="flex gap-4 items-start flex-wrap">
      <div className="relative aspect-4/2 w-48 flex-shrink-0 overflow-hidden rounded-sm border-off-black border-2 bg-off-black">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Character preview"
            className="w-full h-full object-cover"
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted font-mono text-xs"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            No image yet
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Image Focus</p>
        <div className="grid grid-cols-3 gap-1.5">
          {POINTS.flatMap(y =>
            POINTS.map(x => {
              const active = focalX === x && focalY === y
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  onClick={() => onChange(x, y)}
                  aria-label={`Focus image on ${Y_LABELS[y]} ${X_LABELS[x]}`}
                  aria-pressed={active}
                  className={`w-8 h-8 rounded border flex items-center justify-center transition-all ${active
                    ? 'bg-accent border-accent ring-2 ring-white ring-offset-2 ring-offset-surface'
                    : 'bg-surface border-border hover:border-accent'
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-muted'}`} />
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
