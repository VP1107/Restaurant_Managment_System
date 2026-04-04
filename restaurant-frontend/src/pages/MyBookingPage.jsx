import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookings } from '../utils/api'

function formatDatetime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatShortTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLORS = {
  pending: 'var(--gold-dim)',
  confirmed: 'var(--gold)',
  completed: 'var(--success)',
  cancelled: 'var(--muted)',
}

export default function MyBookingPage() {
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    bookings.mine()
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return
    setCancelling(true)
    try {
      await bookings.cancel()
      setBooking(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return (
    <div className="loading"><div className="spin" /><span>Loading</span></div>
  )

  return (
    <div className="page fade-in">
      <p className="page-subtitle">Your Reservation</p>
      <h1 className="page-title">My <em>Booking</em></h1>

      {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

      {!booking ? (
        <div>
          <div className="empty" style={{ padding: '60px 0' }}>
            <div className="empty-icon">🍽</div>
            <div className="empty-text">No active reservation</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 8 }}>
              You don't have any upcoming bookings.
            </p>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn btn-outline" onClick={() => navigate('/restaurants')}>
              Browse Restaurants
            </button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 560 }}>
          <div className="booking-active">
            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Reservation #{booking.id}
              </span>
              <span className={`badge badge-${booking.status}`}>{booking.status}</span>
            </div>

            {/* Date */}
            <div style={{ marginBottom: 24 }}>
              <div className="label">Date & Time</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 300, color: 'var(--cream)', lineHeight: 1.2 }}>
                {formatDatetime(booking.start_time)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                {formatShortTime(booking.start_time)} — {formatShortTime(booking.end_time)} · 1 hour
              </div>
            </div>

            <hr className="divider" style={{ margin: '20px 0' }} />

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div className="label">Restaurant ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  #{booking.restaurant_id}
                </div>
              </div>
              <div>
                <div className="label">Table Size</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {booking.table_type}-seater
                </div>
              </div>
            </div>

            {/* Actions */}
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <>
                <hr className="divider" style={{ margin: '24px 0' }} />
                <button
                  className="btn btn-danger"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling
                    ? <><div className="spin" style={{ width: 14, height: 14 }} /> Cancelling…</>
                    : 'Cancel Reservation'
                  }
                </button>
              </>
            )}
          </div>

          {booking.status === 'cancelled' && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => navigate('/restaurants')}>
                Make a New Reservation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
