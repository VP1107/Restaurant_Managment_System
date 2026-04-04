import { Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { useAuth } from './context/AuthContext'
import Nav from './components/Nav'
import AuthPage from './pages/AuthPage'
import RestaurantsPage from './pages/RestaurantsPage'
import BookingPage from './pages/BookingPage'
import MyBookingPage from './pages/MyBookingPage'
import AdminPage from './pages/AdminPage'
import UsersPage from './pages/UsersPage'

function Protected({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spin" /><span>Loading</span></div>
  if (!user) return <Navigate to="/auth" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="loading" style={{ minHeight: '100vh' }}>
      <div className="spin" />
      <span>Réserve</span>
    </div>
  )

  if (!user) return <AuthPage />

  return (
    <div className="app-shell">
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to="/restaurants" replace />} />
        <Route path="/auth" element={<Navigate to="/restaurants" replace />} />
        <Route path="/restaurants" element={
          <Protected><RestaurantsPage /></Protected>
        } />
        <Route path="/book/:restaurantId" element={
          <Protected><BookingPage /></Protected>
        } />
        <Route path="/my-booking" element={
          <Protected><MyBookingPage /></Protected>
        } />
        <Route path="/admin" element={
          <Protected roles={['admin', 'owner']}><AdminPage /></Protected>
        } />
        <Route path="/users" element={
          <Protected roles={['owner']}><UsersPage /></Protected>
        } />
        <Route path="*" element={<Navigate to="/restaurants" replace />} />
      </Routes>
    </div>
  )
}
