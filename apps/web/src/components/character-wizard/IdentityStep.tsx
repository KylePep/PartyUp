import { useRef, useState } from 'react'
import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type CharacterFormData, PLATFORMS, ALL_PLATFORMS } from './types'
import { compressImageIfNeeded } from '../../utils/imageCompression'

const CARD_COLORS = [
  '#1a1a2e', // deep navy
  '#0f3460', // sapphire
  '#1b4332', // forest green
  '#3d0a14', // crimson
  '#2d1b69', // deep violet
  '#0d2b2b', // teal
  '#3d2800', // bronze
  '#2b0d2b', // dark magenta
  '#1a1a1a', // near black
  '#0a2a1a', // emerald
  '#3a1a00', // dark rust
  '#1a2a3a', // slate blue
]

interface IdentityStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
  platforms?: string[]
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function IdentityStep({ data, onChange, platforms }: IdentityStepProps) {
  const platformOptions = platforms && platforms.length > 0 ? platforms : PLATFORMS
  const [showAllPlatforms, setShowAllPlatforms] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [compressedNotice, setCompressedNotice] = useState(false)
  const [imageError, setImageError] = useState('')

  // An override is a platform the user chose that isn't in the game's RAWG list
  const isOverride = Boolean(data.platform && !platformOptions.includes(data.platform))

  // Expanded section: exclude platforms already shown in primary list (exact match)
  const primarySet = new Set(platformOptions)
  const expandedGroups = ALL_PLATFORMS.map(group => ({
    ...group,
    platforms: group.platforms.filter(p => !primarySet.has(p)),
  })).filter(g => g.platforms.length > 0)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0] ?? null
    if (!raw) return
    setCompressedNotice(false)
    setImageError('')
    try {
      const { file, wasCompressed } = await compressImageIfNeeded(raw)
      onChange({ imageFile: file, imageUrl: '' })
      setCompressedNotice(wasCompressed)
    } catch {
      setImageError('Could not process this image. Please try a different file.')
    }
  }

  const previewUrl = data.imageFile
    ? URL.createObjectURL(data.imageFile)
    : data.imageUrl || undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Platform *</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <ToggleButtonGroup
            options={toOptions(platformOptions)}
            value={data.platform && !isOverride ? [data.platform] : []}
            multiple={false}
            onChange={vals => onChange({ platform: vals[0] ?? '' })}
          />
          {isOverride && (
            <button
              type="button"
              onClick={() => onChange({ platform: '' })}
              className="px-3 py-1.5 rounded text-xs font-mono border bg-accent text-white border-accent"
              title="Click to clear"
            >
              {data.platform} ×
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAllPlatforms(s => !s)}
          className="text-xs font-mono text-muted hover:text-accent transition-colors mt-1"
        >
          {showAllPlatforms ? '− Hide platforms' : '+ Add platform'}
        </button>
        {showAllPlatforms && (
          <div className="mt-3 flex flex-col gap-4 border border-border rounded p-3 bg-surface-raised">
            {expandedGroups.map(group => (
              <div key={group.group}>
                <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">
                  {group.group}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.platforms.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        onChange({ platform: p })
                        setShowAllPlatforms(false)
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                        data.platform === p
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Input
        label="Platform Handle *"
        placeholder="e.g. KylePep#1234, PSN_Username..."
        value={data.platformHandle}
        onChange={e => onChange({ platformHandle: e.target.value })}
        maxLength={100}
      />

      <Input
        label="Character Name *"
        placeholder="e.g. NightShade, IronFang..."
        value={data.name}
        onChange={e => onChange({ name: e.target.value })}
        maxLength={50}
      />

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Character Image</p>
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Character preview"
            className="w-24 h-24 object-cover rounded mb-3 border border-border"
          />
        )}
        <div className="flex gap-3 items-center flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded text-xs font-mono border border-border text-muted hover:border-accent hover:text-text transition-colors"
          >
            {data.imageFile ? 'Change Image' : 'Upload Image'}
          </button>
          {data.imageFile && (
            <span className="text-xs font-mono text-muted truncate max-w-[180px]">
              {data.imageFile.name}
            </span>
          )}
          {!data.imageFile && (
            <Input
              label=""
              placeholder="or paste image URL"
              value={data.imageUrl}
              onChange={e => onChange({ imageUrl: e.target.value, imageFile: null })}
              maxLength={500}
            />
          )}
        </div>
        {compressedNotice && (
          <p className="text-xs font-mono text-muted mt-2">
            Image was resized to fit the 5 MB limit.
          </p>
        )}
        {imageError && (
          <p className="text-xs font-mono text-danger mt-2">{imageError}</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Card Color</p>
        <div className="flex flex-wrap gap-2">
          {CARD_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ cardBackgroundColor: data.cardBackgroundColor === color ? '' : color })}
              className={`w-8 h-8 rounded transition-all ${
                data.cardBackgroundColor === color
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
