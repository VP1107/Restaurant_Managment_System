import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { restaurants, tables, bookings } from '../utils/api'

const TABLE_TYPES = [
  { value: 2, label: '2 — Intimate Table' },
  { value: 4, label: '4 — Standard Table' },
  { value: 6, label: '6 — Large Table' },
]

function toISOWithOffset(localDatetime) {
  // localDatetime is "YYYY-MM-DDTHH:mm" from the input
  // We append the browser's current UTC offset so the API gets a timezone-aware string
  const d = new Date(localDatetime)
  const offsetMin = -d.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0')
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, '0')
  return `${localDatetime}:00${sign}${hh}:${mm}`
}

function formatTime(t) {
  if (!t) return '—'
  return t.slice(0, 5)
}

export default function BookingPage() {
  const { restaurantId } = useParams()
  const navigate = useNavigate()

  const [restaurant, setRestaurant] = useState(null)
  const [tableList, setTableList] = useState([])
  const [loading, setLoading] = useState(true)

  // form state
  const [startTime, setStartTime] = useState('')
  const [tableType, setTableType] = useState(2)
  const [capacity, setCapacity] = useState(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      restaurants.getById(restaurantId),
      tables.byRestaurant(restaurantId),
    ])
      .then(([r, t]) => { setRestaurant(r); setTableList(t) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [restaurantId])

  // Check capacity whenever startTime or tableType changes
  useEffect(() => {
    if (!startTime) { setCapacity(null); return }
    const timer = setTimeout(async () => {
      setChecking(true)
      try {
        const res = await bookings.checkCapacity({
          start_time: toISOWithOffset(startTime),
          table_type: tableType,
          restaurant_id: parseInt(restaurantId),
        })
        setCapacity(res)
      } catch {
        setCapacity(null)
      } finally {
        setChecking(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [startTime, tableType, restaurantId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await bookings.create({
        start_time: toISOWithOffset(startTime),
        table_type: tableType,
        restaurant_id: parseInt(restaurantId),
      })
      setSuccess('Your reservation has been created. We look forward to welcoming you.')
      setTimeout(() => navigate('/my-booking'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Min datetime: now + 5 min, formatted for input[datetime-local]
  const minDatetime = new Date(Date.now() + 5 * 60000)
    .toISOString().slice(0, 16)

  if (loading) return (
    <div className="loading"><div className="spin" /><span>Loading</span></div>
  )

  if (!restaurant) return (
    <div className="page">
      <div className="alert alert-error">{error || 'Restaurant not found'}</div>
    </div>
  )

  const availableTypes = tableList.reduce((acc, t) => {
    if (!acc.includes(t.capacity)) acc.push(t.capacity)
    return acc
  }, [])

  return (
    <div className="page fade-in">
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/restaurants')}
        style={{ marginBottom: 32 }}
      >
        ← Back
      </button>

      <p className="page-subtitle">Reservation</p>
      <h1 className="page-title"><em>{restaurant.name}</em></h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 48, flexWrap: 'wrap' }}>
        <span className="card-meta">📍 {restaurant.location}</span>
        <span className="card-meta" style={{ color: 'var(--gold)' }}>
          ◷ {formatTime(restaurant.opening_time)} — {formatTime(restaurant.closing_time)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,0.8fr)', gap: 32, alignItems: 'start' }}>

        {/* ── Form ── */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 24 }}>Make a Reservation</h2>

          {success ? (
            <div className="alert alert-success" style={{ padding: '24px' }}>
              <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                Reservation Confirmed
              </div>
              {success}
            </div>
          ) : (
            <form className="form" onSubmit={handleSubmit}>
              <div className="field">
                <label className="label">Date & Time</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={startTime}
                  min={minDatetime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                />
                <div className="time-hint">
                  Duration: 1 hour · Times in your local timezone
                </div>
              </div>

              <div className="field">
                <label className="label">Table Size</label>
                <select
                  className="select"
                  value={tableType}
                  onChange={e => setTableType(Number(e.target.value))}
                >
                  {TABLE_TYPES.filter(t =>
                    availableTypes.length === 0 || availableTypes.includes(t.value)
                  ).map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Capacity indicator */}
              {startTime && (
                <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  {checking ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      <div className="spin" style={{ width: 12, height: 12 }} />
                      Checking availability…
                    </div>
                  ) : capacity ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                          Availability
                        </span>
                        <span style={{ fontSize: '0.75rem', color: capacity.available ? 'var(--gold)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                          {capacity.available
                            ? `${capacity.remaining_tables} table${capacity.remaining_tables !== 1 ? 's' : ''} available`
                            : 'Fully booked'
                          }
                        </span>
                      </div>
                      {capacity.available && (
                        <div className="capacity-bar">
                          <div
                            className="capacity-fill"
                            style={{
                              width: `${Math.max(10, (capacity.remaining_tables / (capacity.remaining_tables + 2)) * 100)}%`,
                              background: capacity.remaining_tables <= 1 ? '#c8a040' : 'var(--gold)'
                            }}
                          />
                        </div>
                      )}
                      {!capacity.available && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>
                          {capacity.reason}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}

              {error && <div className="alert alert-error">{error}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitting || (capacity && !capacity.available)}
              >
                {submitting
                  ? <><div className="spin" style={{ width: 14, height: 14 }} /> Reserving…</>
                  : 'Confirm Reservation'
                }
              </button>
            </form>
          )}
        </div>

        {/* ── Info panel ── */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="label">Available Tables</div>
            {tableList.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No tables configured</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {TABLE_TYPES.filter(t => availableTypes.includes(t.value)).map(t => {
                  const count = tableList.filter(tb => tb.capacity === t.value).length
                  return (
                    <div key={t.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--cream)' }}>{t.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--gold)' }}>
                        {count} total
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="label">Booking Policy</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.8, marginTop: 8 }}>
              <div>· Reservations are 1 hour in duration</div>
              <div>· One active booking per guest</div>
              <div>· Cancel any time before your visit</div>
              <div>· Times shown in your local timezone</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
