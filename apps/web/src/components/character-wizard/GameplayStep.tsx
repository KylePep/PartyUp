import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type CharacterFormData, ROLES, PREFERRED_MODES, PLAYSTYLES, RANKS, REGIONS } from './types'

interface GameplayStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function GameplayStep({ data, onChange }: GameplayStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Main Role</p>
        <ToggleButtonGroup
          options={toOptions(ROLES)}
          value={data.mainRole ? [data.mainRole] : []}
          multiple={false}
          onChange={vals => onChange({ mainRole: vals[0] ?? '' })}
        />
      </div>

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Secondary Role</p>
        <ToggleButtonGroup
          options={toOptions(ROLES)}
          value={data.secondaryRole ? [data.secondaryRole] : []}
          multiple={false}
          onChange={vals => onChange({ secondaryRole: vals[0] ?? '' })}
        />
      </div>

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Preferred Modes</p>
        <ToggleButtonGroup
          options={toOptions(PREFERRED_MODES)}
          value={data.preferredModes}
          multiple={true}
          onChange={vals => onChange({ preferredModes: vals })}
        />
      </div>

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Playstyle</p>
        <ToggleButtonGroup
          options={toOptions(PLAYSTYLES)}
          value={data.playstyle ? [data.playstyle] : []}
          multiple={false}
          onChange={vals => onChange({ playstyle: vals[0] ?? '' })}
        />
      </div>

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Rank</p>
        <ToggleButtonGroup
          options={toOptions(RANKS)}
          value={data.rank ? [data.rank] : []}
          multiple={false}
          onChange={vals => onChange({ rank: vals[0] ?? '' })}
        />
      </div>

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Region</p>
        <ToggleButtonGroup
          options={toOptions(REGIONS)}
          value={data.region ? [data.region] : []}
          multiple={false}
          onChange={vals => onChange({ region: vals[0] ?? '' })}
        />
      </div>
    </div>
  )
}
