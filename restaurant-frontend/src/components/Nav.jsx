import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Nav() {
  const { user, logout } = useAuth()
  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner'
  const isOwner = user?.role === 'owner'

  return (
    <nav className="nav">
      <NavLink to="/restaurants" className="nav-brand">
        <span>Réserve</span>
      </NavLink>

      <div className="nav-links">
        <NavLink
          to="/restaurants"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          Restaurants
        </NavLink>

        <NavLink
          to="/my-booking"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          My Booking
        </NavLink>

        {isAdminOrOwner && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {isOwner ? 'Manage' : 'Admin'}
          </NavLink>
        )}

        {isOwner && (
          <NavLink
            to="/users"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Users
          </NavLink>
        )}
      </div>

      <div className="nav-spacer" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="nav-user">
          {user?.email}
          <span className={`badge badge-${user?.role} nav-role`}>{user?.role}</span>
        </span>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          Sign out
        </button>
      </div>
    </nav>
  )
}
