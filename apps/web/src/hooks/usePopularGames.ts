import { useEffect, useState } from 'react'
import { getPopularGames, type PopularGame } from '../api/endpoints/games'

export function usePopularGames() {
  const [games, setGames] = useState<PopularGame[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    getPopularGames()
      .then((result) => {
        setGames(result)
        setStatus('success')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  return { games, status }
}
