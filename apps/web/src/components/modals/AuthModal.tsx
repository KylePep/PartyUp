import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../../api/endpoints/auth'
import { useAuth } from '../../context/AuthContext'
import { Modal, Input, Button } from '../ui'

type Mode = 'sign-in' | 'sign-up'

interface AuthModalProps {
  initialMode: Mode
  onClose: () => void
}

export default function AuthModal({ initialMode, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const navigate = useNavigate()
  const { login: loginToContext } = useAuth()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'sign-up') {
        await register(username, password)
      }
      const token = await login(username, password)
      await loginToContext(username, token)
      setSuccess(true)
      setTimeout(() => navigate('/home'), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  return (
    <Modal isOpen onClose={onClose} title={mode === 'sign-in' ? 'Welcome Back' : 'Join the Realm'}>
      <div className="px-6 py-4">
        {success ? (
          <div className="text-center py-6">
            <p className="font-display text-accent text-xl tracking-wide mb-2">Welcome, {username}</p>
            <p className="text-muted text-sm font-mono">Entering the realm...</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-6">
              {mode === 'sign-in' ? 'Sign in to continue your adventure.' : 'Create your account and begin your quest.'}
            </p>

            <div className="flex border-b border-border mb-6">
              {(['sign-in', 'sign-up'] as Mode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 pb-3 text-sm font-mono transition-colors ${
                    mode === m
                      ? 'border-b-2 border-accent text-accent -mb-px'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {m === 'sign-in' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Your username"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                placeholder="Your password"
              />

              {error && (
                <p role="alert" className="text-danger text-xs font-mono border border-danger/30 bg-danger/10 px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? '...' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </>
        )}
      </div>
    </Modal>
  )
}
