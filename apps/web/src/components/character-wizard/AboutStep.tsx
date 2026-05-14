import { Textarea } from '../ui'
import { type CharacterFormData } from './types'

interface AboutStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
}

export function AboutStep({ data, onChange }: AboutStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <Textarea
        label="Bio"
        placeholder="What kind of player are you? What are you looking for in a teammate?"
        value={data.bio}
        onChange={e => onChange({ bio: e.target.value })}
        maxLength={1000}
        rows={6}
      />
    </div>
  )
}
