import { useRef, useState } from 'react'
import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type CharacterFormData, PLATFORMS } from './types'
import { compressImageIfNeeded } from '../../utils/imageCompression'

interface IdentityStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
  platforms?: string[]
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function IdentityStep({ data, onChange, platforms }: IdentityStepProps) {
  const platformOptions = platforms && platforms.length > 0 ? platforms : PLATFORMS
  const fileRef = useRef<HTMLInputElement>(null)
  const [compressedNotice, setCompressedNotice] = useState(false)
  const [imageError, setImageError] = useState('')

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
        <ToggleButtonGroup
          options={toOptions(platformOptions)}
          value={data.platform ? [data.platform] : []}
          multiple={false}
          onChange={vals => onChange({ platform: vals[0] ?? '' })}
        />
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
    </div>
  )
}
