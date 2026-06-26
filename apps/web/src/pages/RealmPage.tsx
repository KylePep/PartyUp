import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { BinderLayout } from '../components/layout/BinderLayout'
import { CharacterMiniCard } from '../components/cards/CharacterMiniCard'
import { GameMiniCard } from '../components/cards/GameMiniCard'
import { RealmLeftPage } from '../components/RealmLeftPage'
import { RealmRightPage } from '../components/RealmRightPage'
import { RealmInfoCard } from '../components/cards/RealmInfoCard'
import { Spinner } from '../components/ui'
import { CubeIcon, UserSquareIcon } from '@phosphor-icons/react'

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [matchBanner, setMatchBanner] = useState(false)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left')
  const [matchCount, setMatchCount] = useState(0)
  const [lastMatchedAt, setLastMatchedAt] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

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

  useEffect(() => {
    setMatchCount(0)
    setLastMatchedAt(null)
    setPendingCount(0)
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

  function handleStatsLoad(count: number, lastDate: string | null) {
    setMatchCount(count)
    setLastMatchedAt(lastDate)
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
            {userGame && (
              <GameMiniCard
                game={{ name: userGame.gameName, imageUrl: userGame.gameImageUrl }}
                userGameId={userGame.id}
                platform={<CubeIcon />}
              />
            )}
            <RealmInfoCard
              matchCount={matchCount}
              pendingCount={pendingCount}
              characterCreatedAt={character?.createdAt ?? null}
              lastMatchedAt={lastMatchedAt}
              gameName={userGame.gameName}
              className="h-full md:hidden md:h-40 shrink-0 text-xxs md:text-xs"
            />
            {character && (
              <CharacterMiniCard
                character={character}
                characterId={character.id}
                platform={<UserSquareIcon />}
              />
            )}
            <RealmInfoCard
              matchCount={matchCount}
              pendingCount={pendingCount}
              characterCreatedAt={character?.createdAt ?? null}
              lastMatchedAt={lastMatchedAt}
              gameName={userGame.gameName}
              className="h-full hidden md:block md:h-40 shrink-0 text-xxs md:text-xs"
            />
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
            onPendingCountChange={setPendingCount}
          />
        }
        rightContent={
          <RealmRightPage
            userGame={userGame}
            gameId={gameId!}
            onStatsLoad={handleStatsLoad}
          />
        }
      />
    </>
  )
}
