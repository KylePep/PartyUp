import { useRef } from 'react'
import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type CharacterFormData, PLATFORMS } from './types'

interface IdentityStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function IdentityStep({ data, onChange }: IdentityStepProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onChange({ imageFile: file, imageUrl: '' })
  }

  const previewUrl = data.imageFile
    ? URL.createObjectURL(data.imageFile)
    : data.imageUrl || undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Platform *</p>
        <ToggleButtonGroup
          options={toOptions(PLATFORMS)}
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
        <div className="flex gap-3 items-center">
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
