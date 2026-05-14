import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getUserGameByGameId, type UserGameDetail } from '../api/endpoints/userGames'
import { getUserGameCharacters, type Character } from '../api/endpoints/characters'
import { CharacterPanel } from '../components/CharacterPanel'
import { DiscoveryPanel } from '../components/DiscoveryPanel'
import { MatchGallery } from '../components/MatchGallery'
import { Spinner } from '../components/ui'
import { PageLayout } from '../components/layout/PageLayout'

type Tab = 'discover' | 'matches'

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [userGame, setUserGame] = useState<UserGameDetail | null>(null)
  const [myCharacter, setMyCharacter] = useState<Character | null | 'loading'>('loading')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('discover')
  const [matchBanner, setMatchBanner] = useState(false)

  useEffect(() => {
    if (!gameId) return
    setLoading(true)
    getUserGameByGameId(gameId)
      .then(ug => {
        setUserGame(ug)
        return getUserGameCharacters(ug.id)
      })
      .then(chars => {
        const mine = chars.find(c => c.userGameId) ?? null
        setMyCharacter(mine)
      })
      .catch(() => setMyCharacter(null))
      .finally(() => setLoading(false))
  }, [gameId])

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  return (
    <>
      {matchBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-white px-6 py-3 rounded-lg font-mono text-sm shadow-lg">
          It's a match!
        </div>
      )}

      <div className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between gap-4">
          <div>
            <Link to="/home" className="text-xs font-mono text-muted uppercase tracking-widest hover:text-text transition-colors">
              ← Hub
            </Link>
            <h1 className="font-display font-bold text-2xl text-text mt-1">
              {userGame?.gameName ?? 'Realm'}
            </h1>
          </div>
          {userGame?.gameImageUrl && (
            <img
              src={userGame.gameImageUrl}
              alt={userGame.gameName}
              className="w-16 h-16 object-cover rounded"
            />
          )}

        </div>

        <div className='px-4 md:px-8 pb-6' dangerouslySetInnerHTML={{ __html: userGame?.description }} />

        <div className="max-w-7xl mx-auto px-4 md:px-8 flex gap-0">
          {(['discover', 'matches'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono text-xs uppercase tracking-widest px-6 py-3 border-b-2 transition-colors ${tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-text'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <PageLayout>
        {tab === 'discover' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <CharacterPanel gameId={gameId!} userGame={userGame} />
            <DiscoveryPanel
              gameId={gameId!}
              myCharacter={myCharacter}
              onMatch={() => {
                setMatchBanner(true)
                setTimeout(() => setMatchBanner(false), 2500)
              }}
            />
          </div>
        )}

        {tab === 'matches' && (
          <MatchGallery gameId={gameId} />
        )}
      </PageLayout>
    </>
  )
}
