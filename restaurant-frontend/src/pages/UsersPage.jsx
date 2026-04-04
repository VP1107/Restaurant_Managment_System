import { useState, useEffect } from 'react'
import { users } from '../utils/api'
import { useAuth } from '../context/AuthContext'

const ROLES = ['user', 'admin', 'owner']

export default function UsersPage() {
  const { user: me } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    users.all()
      .then(setList)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const changeRole = async (id, role) => {
    setUpdating(id)
    setMsg('')
    try {
      const updated = await users.changeRole(id, role)
      setList(prev => prev.map(u => u.id === id ? updated : u))
      setMsg('Role updated.')
    } catch (e) {
      setMsg(e.message)
    } finally {
      setUpdating(null)
    }
  }

  const deleteUser = async (id) => {
    if (!confirm('Delete this user permanently?')) return
    setDeleting(id)
    try {
      await users.delete(id)
      setList(prev => prev.filter(u => u.id !== id))
    } catch (e) {
      setMsg(e.message)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return (
    <div className="loading"><div className="spin" /><span>Loading users</span></div>
  )

  return (
    <div className="page fade-in">
      <p className="page-subtitle">Owner Panel</p>
      <h1 className="page-title">User <em>Management</em></h1>

      {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}
      {msg && (
        <div
          className={`alert ${msg.includes('updated') || msg.includes('deleted') ? 'alert-success' : 'alert-error'}`}
          style={{ marginBottom: 24 }}
        >
          {msg}
        </div>
      )}

      <div style={{ marginBottom: 16, fontSize: '0.78rem', color: 'var(--muted)' }}>
        {list.length} registered user{list.length !== 1 ? 's' : ''}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Active</th>
              <th>Change Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(u => {
              const isMe = u.id === me?.id
              const isOwner = u.role === 'owner'
              return (
                <tr key={u.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {u.email}
                    </span>
                    {isMe && (
                      <span style={{ marginLeft: 8, fontSize: '0.62rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>
                        you
                      </span>
                    )}
                  </td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td style={{ color: u.is_verified ? 'var(--success)' : 'var(--muted)', fontSize: '0.78rem' }}>
                    {u.is_verified ? '✓' : '—'}
                  </td>
                  <td style={{ color: u.is_active ? 'var(--success)' : 'var(--muted)', fontSize: '0.78rem' }}>
                    {u.is_active ? '✓' : '—'}
                  </td>
                  <td>
                    {!isOwner && !isMe ? (
                      <select
                        className="select"
                        style={{ padding: '5px 10px', fontSize: '0.75rem', width: 'auto' }}
                        value={u.role}
                        disabled={updating === u.id}
                        onChange={e => changeRole(u.id, e.target.value)}
                      >
                        {ROLES.filter(r => r !== 'owner').map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    {!isOwner && !isMe ? (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteUser(u.id)}
                        disabled={deleting === u.id}
                      >
                        {deleting === u.id ? '…' : 'Delete'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
