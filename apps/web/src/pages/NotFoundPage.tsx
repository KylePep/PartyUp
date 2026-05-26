import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center text-center px-6">
      <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">404</p>
      <h1 className="font-display font-bold text-4xl md:text-6xl text-text leading-tight mb-6">
        Page not found
      </h1>
      <p className="text-muted text-base md:text-lg max-w-md mb-10 leading-relaxed">
        This page doesn't exist or was moved. Head back and find your party.
      </p>
      <Button size="lg" onClick={() => navigate('/')}>
        Back to Home
      </Button>
    </div>
  )
}
