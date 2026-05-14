import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type CharacterFormData, ACTIVE_TIMES, LANGUAGES } from './types'

interface AvailabilityStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function AvailabilityStep({ data, onChange }: AvailabilityStepProps) {
  const voiceChatValue = data.usesVoiceChat === true ? ['Yes'] : data.usesVoiceChat === false ? ['No'] : []

  return (
    <div className="flex flex-col gap-6">
      <Input
        label="Time Zone"
        placeholder="e.g. EST, UTC+9, PST..."
        value={data.timeZone}
        onChange={e => onChange({ timeZone: e.target.value })}
      />

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Active Times</p>
        <ToggleButtonGroup
          options={toOptions(ACTIVE_TIMES)}
          value={data.activeTimes}
          multiple={true}
          onChange={vals => onChange({ activeTimes: vals })}
        />
      </div>

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Voice Chat</p>
        <ToggleButtonGroup
          options={toOptions(['Yes', 'No'])}
          value={voiceChatValue}
          multiple={false}
          onChange={vals => {
            const v = vals[0]
            onChange({ usesVoiceChat: v === 'Yes' ? true : v === 'No' ? false : undefined })
          }}
        />
      </div>

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Languages</p>
        <ToggleButtonGroup
          options={toOptions(LANGUAGES)}
          value={data.languages}
          multiple={true}
          onChange={vals => onChange({ languages: vals })}
        />
      </div>
    </div>
  )
}
