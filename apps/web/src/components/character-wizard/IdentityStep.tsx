import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type CharacterFormData, PLATFORMS } from './types'

interface IdentityStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function IdentityStep({ data, onChange }: IdentityStepProps) {
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

      <Input
        label="Image URL"
        placeholder="https://..."
        value={data.imageUrl}
        onChange={e => onChange({ imageUrl: e.target.value })}
        maxLength={500}
      />
    </div>
  )
}
