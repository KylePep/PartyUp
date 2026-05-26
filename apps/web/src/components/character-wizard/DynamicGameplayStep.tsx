import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type GameFieldDefinition } from '../../api/endpoints/games'

interface DynamicGameplayStepProps {
  fields: GameFieldDefinition[]
  values: Record<string, string>
  onChange: (fieldId: string, value: string) => void
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function DynamicGameplayStep({ fields, values, onChange }: DynamicGameplayStepProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm font-mono text-muted text-center py-8">
        No game-specific fields available.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {fields.map(field => {
        const current = values[field.id] ?? ''

        if (field.type === 'Text') {
          return (
            <Input
              key={field.id}
              label={field.label + (field.isRequired ? ' *' : '')}
              value={current}
              onChange={e => onChange(field.id, e.target.value)}
            />
          )
        }

        if (field.type === 'MultiSelect') {
          const selected = current ? current.split('|') : []
          return (
            <div key={field.id}>
              <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
                {field.label}{field.isRequired ? ' *' : ''}
              </p>
              <ToggleButtonGroup
                options={toOptions(field.options)}
                value={selected}
                multiple={true}
                onChange={vals => onChange(field.id, vals.join('|'))}
              />
            </div>
          )
        }

        // Select
        return (
          <div key={field.id}>
            <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
              {field.label}{field.isRequired ? ' *' : ''}
            </p>
            <ToggleButtonGroup
              options={toOptions(field.options)}
              value={current ? [current] : []}
              multiple={false}
              onChange={vals => onChange(field.id, vals[0] ?? '')}
            />
          </div>
        )
      })}
    </div>
  )
}
