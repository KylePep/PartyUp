import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { NavBar } from './NavBar'
import { BottomTray } from './BottomTray'
import { Spinner } from '../ui'

export default function SignedInLayout() {
  const { state } = useAuth()

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-bg flex items-center justify-center">
        <Spinner label="Loading..." />
      </div>
    )
  }

  if (state.status === 'unauthenticated' || state.status === 'unreachable') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row pb-16 md:pb-0">
      <NavBar variant="app" />
      <Outlet />
      <BottomTray />
    </div>
  )
}
