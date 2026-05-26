import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type CharacterFormData, TIME_ZONES, ACTIVE_TIMES, LANGUAGES } from './types'

interface AvailabilityStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function AvailabilityStep({ data, onChange }: AvailabilityStepProps) {
  const voiceChatValue = data.usesVoiceChat === true ? ['Yes'] : data.usesVoiceChat === false ? ['No'] : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Time Zone</p>
        <ToggleButtonGroup
          options={toOptions(TIME_ZONES)}
          value={data.timeZone ? [data.timeZone] : []}
          multiple={false}
          onChange={vals => onChange({ timeZone: vals[0] ?? '' })}
        />
      </div>

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
