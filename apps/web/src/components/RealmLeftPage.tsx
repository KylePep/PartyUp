import { useEffect, useState } from 'react'
import type { Character } from '../api/endpoints/characters'
import type { UserGameDetail } from '../api/endpoints/userGames'
import { CreateCharacterWizard } from './character-wizard/CreateCharacterWizard'
import { DiscoveryPanel } from './DiscoveryPanel'
import { DiscoveryFilterMenu } from './DiscoveryFilterMenu'
import { PendingLikesBar } from './PendingLikesBar'
import { useFieldDefinitions } from '../hooks/useFieldDefinitions'
import { Button } from './ui'

type Zone = 'prompt' | 'wizard' | 'discovery'

interface RealmLeftPageProps {
  gameId: string
  userGame: UserGameDetail
  character: Character | null
  onCharacterCreated: () => void
  onMatch: () => void
}

export function RealmLeftPage({ gameId, userGame, character, onCharacterCreated, onMatch }: RealmLeftPageProps) {
  const [zone, setZone] = useState<Zone>(character ? 'discovery' : 'prompt')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [activePlatforms, setActivePlatforms] = useState<string[]>([])

  const { data: fieldDefs } = useFieldDefinitions(gameId)
  const fields = fieldDefs?.schemaStatus === 'Generated' ? fieldDefs.fields : []
  const gamePlatforms = userGame.platforms ?? []

  // Transition to discovery when character arrives after wizard completion
  useEffect(() => {
    if (character && zone === 'wizard') {
      setZone('discovery')
    }
  }, [character, zone])

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (value === '') delete next[key]
      else next[key] = value
      return next
    })
  }

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      {/* Filter bar — only in discovery mode */}
      {zone === 'discovery' && (
        <div className="px-4 py-3 border-b border-border">
          <DiscoveryFilterMenu
            fields={fields}
            gamePlatforms={gamePlatforms}
            filters={filters}
            activePlatforms={activePlatforms}
            onChange={handleFilterChange}
            onPlatformChange={setActivePlatforms}
          />
        </div>
      )}

      {/* Main zone — grows to fill available space */}
      <div className="h-full p-6 overflow-y-auto overflow-hidden">
        {zone === 'prompt' && (
          <div className="flex flex-col items-start gap-3">
            <Button onClick={() => setZone('wizard')}>Create Character</Button>
          </div>
        )}

        {zone === 'wizard' && (
          <CreateCharacterWizard
            userGameId={userGame.id}
            gameId={gameId}
            platforms={gamePlatforms}
            onSuccess={onCharacterCreated}
          />
        )}

        {zone === 'discovery' && character && (
          <DiscoveryPanel
            gameId={gameId}
            myCharacter={character}
            filters={filters}
            activePlatforms={activePlatforms}
            onMatch={onMatch}
          />
        )}
      </div>

      {/* Pending likes tray — pinned to bottom in discovery mode */}
      {zone === 'discovery' && character && (
        <PendingLikesBar character={character} onMatch={onMatch} />
      )}
    </div>
  )
}
