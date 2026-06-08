import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { RealmLeftPage } from '../components/RealmLeftPage'
import { RealmRightPage } from '../components/RealmRightPage'
import { Spinner } from '../components/ui'
import { CubeIcon, UserSquareIcon } from '@phosphor-icons/react'

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [matchBanner, setMatchBanner] = useState(false)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left')

  useEffect(() => {
    if (!gameId) return
    getUserGameByGameId(gameId)
      .then(ug => {
        setUserGame(ug)
        return getUserGameCharacters(ug.id)
      })
      .then(chars => {
        setCharacter(chars.find(c => c.userGameId) ?? null)
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [gameId])

  async function handleCharacterCreated() {
    if (!userGame) return
    const chars = await getUserGameCharacters(userGame.id)
    setCharacter(chars.find(c => c.userGameId) ?? null)
  }

  function handleMatch() {
    setMatchBanner(true)
    setTimeout(() => setMatchBanner(false), 2500)
  }

  if (loading) {
    return <div className="flex w-screen justify-center py-24"><Spinner /></div>
  }

  if (!userGame) return null

  return (
    <>
      {matchBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-off-white px-6 py-3 rounded-lg font-mono text-sm shadow-lg">
          It's a match!
        </div>
      )}
      <BinderLayout
        barColor="#ea6a01"
        barContent={
          <>
            {character ? (
              <>
                <CharacterMiniCard
                  character={character}
                  characterId={character.id}
                  platform={<UserSquareIcon />}
                />
              </>
            ) : undefined}
            {userGame ? (
              <>
                <GameMiniCard
                  game={{ name: userGame.gameName, imageUrl: userGame.gameImageUrl }}
                  userGameId={userGame.id}
                  platform={<CubeIcon />} />
              </>
            ) : undefined}
          </>
        }
        activeTab=""
        activeSide={activeSide}
        onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
        leftContent={
          <RealmLeftPage
            gameId={gameId!}
            userGame={userGame}
            character={character}
            onCharacterCreated={handleCharacterCreated}
            onMatch={handleMatch}
          />
        }
        rightContent={
          <>
            <RealmRightPage
              userGame={userGame}
              gameId={gameId!}
            />
          </>
        }
      />
    </>
  )
}
