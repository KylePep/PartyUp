import { useState } from 'react'
import { createCharacter } from '../../api/endpoints/characters'
import { Button } from '../ui'
import { IdentityStep } from './IdentityStep'
import { GameplayStep } from './GameplayStep'
import { AvailabilityStep } from './AvailabilityStep'
import { AboutStep } from './AboutStep'
import { defaultFormData, type CharacterFormData } from './types'

const STEPS = ['Identity', 'Gameplay', 'Availability', 'About'] as const

interface CreateCharacterWizardProps {
  userGameId: string
  onSuccess: () => void
}

export function CreateCharacterWizard({ userGameId, onSuccess }: CreateCharacterWizardProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<CharacterFormData>(defaultFormData)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function patch(update: Partial<CharacterFormData>) {
    setData(prev => ({ ...prev, ...update }))
  }

  function canAdvance() {
    if (step === 0) return data.platform.trim() !== '' && data.platformHandle.trim() !== '' && data.name.trim() !== ''
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
      await createCharacter({
        userGameId,
        platform: data.platform,
        platformHandle: data.platformHandle.trim(),
        name: data.name.trim(),
        imageUrl: data.imageUrl.trim() || undefined,
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
      })
      onSuccess()
    } catch {
      setError('Failed to create character. Please try again.')
      setSubmitting(false)
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="flex flex-col gap-8">
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
      <div>
        {step === 0 && <IdentityStep data={data} onChange={patch} />}
        {step === 1 && <GameplayStep data={data} onChange={patch} />}
        {step === 2 && <AvailabilityStep data={data} onChange={patch} />}
        {step === 3 && <AboutStep data={data} onChange={patch} />}
      </div>

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
          {submitting ? 'Creating...' : isLast ? 'Create Character' : 'Next'}
        </Button>
      </div>
    </div>
  )
}
