import { useState, useEffect } from 'react'
import { bookings, restaurants, tables } from '../utils/api'
import { useAuth } from '../context/AuthContext'

const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

function formatDt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [tab, setTab] = useState('bookings')
  const [allBookings, setAllBookings] = useState([])
  const [allRestaurants, setAllRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)

  // Restaurant/table management
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [restaurantTables, setRestaurantTables] = useState([])
  const [newTableCapacity, setNewTableCapacity] = useState(2)
  const [addingTable, setAddingTable] = useState(false)
  const [tableMsg, setTableMsg] = useState('')

  // New restaurant form
  const [showRestaurantForm, setShowRestaurantForm] = useState(false)
  const [restForm, setRestForm] = useState({ name: '', location: '', opening_time: '09:00', closing_time: '23:00', admin_id: '' })
  const [savingRest, setSavingRest] = useState(false)
  const [restMsg, setRestMsg] = useState('')

  useEffect(() => {
    Promise.all([bookings.all(), restaurants.all()])
      .then(([b, r]) => { setAllBookings(b); setAllRestaurants(r) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedRestaurant) { setRestaurantTables([]); return }
    tables.byRestaurant(selectedRestaurant).then(setRestaurantTables).catch(() => {})
  }, [selectedRestaurant])

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      const updated = await bookings.updateStatus(id, status)
      setAllBookings(prev => prev.map(b => b.id === id ? updated : b))
    } catch (e) {
      setError(e.message)
    } finally {
      setUpdating(null)
    }
  }

  const addTable = async () => {
    setAddingTable(true)
    setTableMsg('')
    try {
      const t = await tables.create({ restaurant_id: parseInt(selectedRestaurant), capacity: newTableCapacity })
      setRestaurantTables(prev => [...prev, t])
      setTableMsg(`Added ${newTableCapacity}-seater table.`)
    } catch (e) {
      setTableMsg(e.message)
    } finally {
      setAddingTable(false)
    }
  }

  const deleteTable = async (id) => {
    if (!confirm('Remove this table?')) return
    try {
      await tables.delete(id)
      setRestaurantTables(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      setTableMsg(e.message)
    }
  }

  const saveRestaurant = async (e) => {
    e.preventDefault()
    setSavingRest(true)
    setRestMsg('')
    try {
      const body = {
        name: restForm.name,
        location: restForm.location,
        opening_time: restForm.opening_time + ':00',
        closing_time: restForm.closing_time + ':00',
        ...(restForm.admin_id ? { admin_id: restForm.admin_id } : {}),
      }
      const r = await restaurants.create(body)
      setAllRestaurants(prev => [...prev, r])
      setRestMsg('Restaurant created.')
      setShowRestaurantForm(false)
      setRestForm({ name: '', location: '', opening_time: '09:00', closing_time: '23:00', admin_id: '' })
    } catch (e) {
      setRestMsg(e.message)
    } finally {
      setSavingRest(false)
    }
  }

  const deleteRestaurant = async (id) => {
    if (!confirm('Delete this restaurant and all its data?')) return
    try {
      await restaurants.delete(id)
      setAllRestaurants(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) return (
    <div className="loading"><div className="spin" /><span>Loading</span></div>
  )

  return (
    <div className="page fade-in">
      <p className="page-subtitle">{isOwner ? 'Owner Panel' : 'Admin Panel'}</p>
      <h1 className="page-title">Manage <em>Operations</em></h1>

      {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['bookings', 'tables', ...(isOwner ? ['restaurants'] : [])].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 24px',
              fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
              color: tab === t ? 'var(--gold)' : 'var(--muted)',
              borderBottom: tab === t ? '1px solid var(--gold)' : '1px solid transparent',
              marginBottom: -1,
              transition: 'color 0.2s',
              fontFamily: 'var(--font-body)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Bookings Tab ── */}
      {tab === 'bookings' && (
        <div>
          <div style={{ marginBottom: 16, fontSize: '0.78rem', color: 'var(--muted)' }}>
            {allBookings.length} total booking{allBookings.length !== 1 ? 's' : ''}
          </div>
          {allBookings.length === 0 ? (
            <div className="empty"><div className="empty-text">No bookings yet</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Restaurant</th>
                    <th>Table</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allBookings.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{b.id}</td>
                      <td>#{b.restaurant_id}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{b.table_type}-seat</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{formatDt(b.start_time)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{formatDt(b.end_time)}</td>
                      <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {STATUS_TRANSITIONS[b.status]?.map(next => (
                            <button
                              key={next}
                              className={`btn btn-sm ${next === 'cancelled' ? 'btn-danger' : 'btn-outline'}`}
                              onClick={() => updateStatus(b.id, next)}
                              disabled={updating === b.id}
                            >
                              {next}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tables Tab ── */}
      {tab === 'tables' && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 32, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '1 1 200px' }}>
              <label className="label">Select Restaurant</label>
              <select
                className="select"
                value={selectedRestaurant}
                onChange={e => setSelectedRestaurant(e.target.value)}
              >
                <option value="">Choose a restaurant…</option>
                {allRestaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {selectedRestaurant && (
              <>
                <div className="field" style={{ flex: '1 1 160px' }}>
                  <label className="label">Add Table Size</label>
                  <select
                    className="select"
                    value={newTableCapacity}
                    onChange={e => setNewTableCapacity(Number(e.target.value))}
                  >
                    <option value={2}>2-seater</option>
                    <option value={4}>4-seater</option>
                    <option value={6}>6-seater</option>
                  </select>
                </div>
                <button className="btn btn-outline" onClick={addTable} disabled={addingTable}>
                  {addingTable ? '…' : '+ Add Table'}
                </button>
              </>
            )}
          </div>

          {tableMsg && (
            <div className={`alert ${tableMsg.includes('Added') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
              {tableMsg}
            </div>
          )}

          {selectedRestaurant && (
            restaurantTables.length === 0 ? (
              <div className="empty"><div className="empty-text">No tables configured</div></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Table #</th>
                      <th>Capacity</th>
                      <th>Same-type Count</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurantTables.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{t.id}</td>
                        <td>{t.capacity}-seater</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{t.same_type_tables}</td>
                        <td>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteTable(t.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* ── Restaurants Tab (owner only) ── */}
      {tab === 'restaurants' && isOwner && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {allRestaurants.length} restaurant{allRestaurants.length !== 1 ? 's' : ''}
            </span>
            <button className="btn btn-outline" onClick={() => setShowRestaurantForm(v => !v)}>
              {showRestaurantForm ? 'Cancel' : '+ New Restaurant'}
            </button>
          </div>

          {restMsg && (
            <div className={`alert ${restMsg.includes('created') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 20 }}>
              {restMsg}
            </div>
          )}

          {showRestaurantForm && (
            <div className="card" style={{ marginBottom: 32 }}>
              <h2 className="section-title" style={{ marginBottom: 20 }}>New Restaurant</h2>
              <form className="form" onSubmit={saveRestaurant}>
                <div className="input-row">
                  <div className="field">
                    <label className="label">Name</label>
                    <input className="input" value={restForm.name}
                      onChange={e => setRestForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="field">
                    <label className="label">Location</label>
                    <input className="input" value={restForm.location}
                      onChange={e => setRestForm(f => ({ ...f, location: e.target.value }))} required />
                  </div>
                </div>
                <div className="input-row">
                  <div className="field">
                    <label className="label">Opening Time</label>
                    <input className="input" type="time" value={restForm.opening_time}
                      onChange={e => setRestForm(f => ({ ...f, opening_time: e.target.value }))} required />
                  </div>
                  <div className="field">
                    <label className="label">Closing Time</label>
                    <input className="input" type="time" value={restForm.closing_time}
                      onChange={e => setRestForm(f => ({ ...f, closing_time: e.target.value }))} required />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Admin User ID (optional)</label>
                  <input className="input" placeholder="UUID of admin user"
                    value={restForm.admin_id}
                    onChange={e => setRestForm(f => ({ ...f, admin_id: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" className="btn btn-primary" disabled={savingRest}>
                    {savingRest ? 'Saving…' : 'Create Restaurant'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card-grid">
            {allRestaurants.map(r => (
              <div key={r.id} className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>📍 {r.location}</div>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteRestaurant(r.id)}>
                    Delete
                  </button>
                </div>
                <div className="card-meta">
                  <div>Hours: {r.opening_time?.slice(0,5)} — {r.closing_time?.slice(0,5)}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', marginTop: 4, color: 'var(--border-hi)' }}>
                    ID: {r.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
