import { useState } from 'react'
import { createCharacter, updateCharacter, uploadCharacterImage } from '../../api/endpoints/characters'
import { useFieldDefinitions } from '../../hooks/useFieldDefinitions'
import { Button } from '../ui'
import { IdentityStep } from './IdentityStep'
import { GameplayStep } from './GameplayStep'
import { DynamicGameplayStep } from './DynamicGameplayStep'
import { AvailabilityStep } from './AvailabilityStep'
import { AboutStep } from './AboutStep'
import { defaultFormData, type CharacterFormData } from './types'

interface CreateCharacterWizardProps {
  userGameId: string
  gameId: string
  platforms?: string[]
  onSuccess: () => void
  mode?: 'create' | 'edit'
  characterId?: string
  initialData?: Partial<CharacterFormData>
}

export function CreateCharacterWizard({ userGameId, gameId, platforms, onSuccess, mode = 'create', characterId, initialData }: CreateCharacterWizardProps) {
  const { data: fieldDefs, loading: loadingFields } = useFieldDefinitions(gameId)
  const hasDynamicFields =
    fieldDefs?.schemaStatus === 'Generated' && fieldDefs.fields.length > 0

  const STEPS = hasDynamicFields
    ? (['Identity', 'Game Fields', 'Availability', 'About'] as const)
    : (['Identity', 'Gameplay', 'Availability', 'About'] as const)

  const [step, setStep] = useState(0)
  const [data, setData] = useState<CharacterFormData>({ ...defaultFormData, ...initialData })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function patch(update: Partial<CharacterFormData>) {
    setData(prev => ({ ...prev, ...update }))
  }

  function setGameField(fieldId: string, value: string) {
    setData(prev => ({
      ...prev,
      gameFields: { ...prev.gameFields, [fieldId]: value },
    }))
  }

  function canAdvance() {
    if (step === 0)
      return data.platform.trim() !== '' && data.platformHandle.trim() !== '' && data.name.trim() !== ''
    return true
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      let imageUrl = data.imageUrl.trim() || undefined

      if (data.imageFile) {
        const uploaded = await uploadCharacterImage(data.imageFile)
        imageUrl = uploaded.url
      }

      const payload = {
        platform: data.platform,
        platformHandle: data.platformHandle.trim(),
        name: data.name.trim(),
        imageUrl,
        bio: data.bio.trim() || undefined,
        mainRole: data.mainRole || undefined,
        secondaryRole: data.secondaryRole || undefined,
        preferredModes: data.preferredModes,
        playstyle: data.playstyle || undefined,
        rank: data.rank || undefined,
        region: data.region || undefined,
        timeZone: data.timeZone.trim() || undefined,
        activeTimes: data.activeTimes.length > 0 ? data.activeTimes : undefined,
        usesVoiceChat: data.usesVoiceChat,
        languages: data.languages.length > 0 ? data.languages : undefined,
      }

      if (mode === 'edit' && characterId) {
        await updateCharacter(userGameId, characterId, payload)
      } else {
        const gameFields = hasDynamicFields
          ? Object.entries(data.gameFields)
              .filter(([, v]) => v !== '')
              .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value }))
          : undefined
        await createCharacter({ userGameId, ...payload, gameFields })
      }
      onSuccess()
    } catch {
      setError(`Failed to ${mode === 'edit' ? 'update' : 'create'} character. Please try again.`)
      setSubmitting(false)
    }
  }

  const isLast = step === STEPS.length - 1

  function renderStep() {
    const label = STEPS[step]
    if (label === 'Identity') return <IdentityStep data={data} onChange={patch} platforms={platforms} />
    if (label === 'Game Fields')
      return (
        <DynamicGameplayStep
          fields={fieldDefs?.fields ?? []}
          values={data.gameFields}
          onChange={setGameField}
        />
      )
    if (label === 'Gameplay') return <GameplayStep data={data} onChange={patch} />
    if (label === 'Availability') return <AvailabilityStep data={data} onChange={patch} />
    if (label === 'About') return <AboutStep data={data} onChange={patch} />
  }

  return (
    <div className="flex flex-col gap-8">
      {loadingFields && (
        <p className="text-xs font-mono text-muted text-center animate-pulse">
          Loading game fields...
        </p>
      )}

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors
                ${i === step ? 'bg-accent text-white' : i < step ? 'bg-accent-dim text-accent' : 'bg-surface-raised text-muted'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-mono uppercase tracking-widest hidden sm:inline transition-colors
                ${i === step ? 'text-text' : 'text-muted'}`}>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px transition-colors ${i < step ? 'bg-accent-dim' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div>{renderStep()}</div>

      {error && (
        <p className="text-xs font-mono text-danger border border-danger/30 bg-danger/10 px-4 py-3">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canAdvance() || submitting}
        >
          {submitting
            ? (mode === 'edit' ? 'Saving...' : 'Creating...')
            : isLast
            ? (mode === 'edit' ? 'Save Changes' : 'Create Character')
            : 'Next'}
        </Button>
      </div>
    </div>
  )
}
