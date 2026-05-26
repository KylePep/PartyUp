import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCharacters, type Character } from '../api/endpoints/characters'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { CreateCharacterWizard } from '../components/character-wizard/CreateCharacterWizard'
import { PageLayout } from '../components/layout/PageLayout'
import { Spinner } from '../components/ui'
import type { CharacterFormData } from '../components/character-wizard/types'

function toFormData(c: Character): Partial<CharacterFormData> {
  return {
    platform: c.platform ?? '',
    platformHandle: c.platformHandle ?? '',
    name: c.name ?? '',
    imageUrl: c.imageUrl ?? '',
    imageFile: null,
    bio: c.bio ?? '',
    mainRole: c.mainRole ?? '',
    secondaryRole: c.secondaryRole ?? '',
    preferredModes: c.preferredModes ?? [],
    playstyle: c.playstyle ?? '',
    rank: c.rank ?? '',
    region: c.region ?? '',
    timeZone: c.timeZone ?? '',
    activeTimes: c.activeTimes ?? [],
    usesVoiceChat: c.usesVoiceChat,
    languages: c.languages ?? [],
    gameFields: Object.fromEntries((c.gameFields ?? []).map(f => [f.fieldDefinitionId, f.value])),
  }
}

export default function EditCharacterPage() {
  const navigate = useNavigate()
  const { gameId, characterId } = useParams<{ gameId: string; characterId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!gameId || !characterId) return
    Promise.all([
      getUserGameByGameId(gameId),
      getCharacters(),
    ])
      .then(([ug, chars]) => {
        setUserGame(ug)
        const found = chars.find(c => c.id === characterId) ?? null
        setCharacter(found)
        if (!found) setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [gameId, characterId])

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  if (error || !userGame || !character) {
    return (
      <PageLayout>
        <p className="text-sm text-muted font-mono">Character not found.</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">{userGame.gameName}</p>
          <h1 className="font-display font-bold text-3xl text-text">Edit Character</h1>
          <p className="text-sm text-muted mt-2">Update your character's profile.</p>
        </div>
        <CreateCharacterWizard
          userGameId={userGame.id}
          gameId={userGame.gameId}
          platforms={userGame.platforms}
          mode="edit"
          characterId={character.id}
          initialData={toFormData(character)}
          onSuccess={() => navigate(`/realm/${gameId}`)}
        />
      </div>
    </PageLayout>
  )
}
