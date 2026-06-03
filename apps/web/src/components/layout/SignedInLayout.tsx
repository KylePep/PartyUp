import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { NavBar } from './NavBar'
// import { BottomTray } from './BottomTray'
import { Spinner } from '../ui'
import { MatchNotificationToast } from '../notifications/MatchNotificationToast'

export default function SignedInLayout() {
  const { state } = useAuth()

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-orange-300 flex items-center justify-center">
        <Spinner label="Loading..." />
      </div>
    )
  }

  if (state.status === 'unauthenticated' || state.status === 'unreachable') {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <MatchNotificationToast />
      <div className="min-h-screen max-h-screen bg-orange-300 flex flex-col md:flex-row relative overflow-hidden">
        <NavBar variant="app" />
        <Outlet />
        {/* <BottomTray /> */}
      </div>
    </>
  )
}
