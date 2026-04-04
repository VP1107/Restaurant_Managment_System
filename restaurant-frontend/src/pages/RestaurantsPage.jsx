import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { restaurants, tables } from '../utils/api'
import { useAuth } from '../context/AuthContext'

function formatTime(t) {
  if (!t) return '—'
  return t.slice(0, 5)
}

export default function RestaurantsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    restaurants.all()
      .then(setList)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading"><div className="spin" /><span>Loading restaurants</span></div>
  )

  return (
    <div className="page fade-in">
      <p className="page-subtitle">Discover</p>
      <h1 className="page-title">Our <em>Restaurants</em></h1>

      {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

      {list.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🍽</div>
          <div className="empty-text">No restaurants available yet</div>
        </div>
      ) : (
        <div className="card-grid">
          {list.map((r, i) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              delay={i * 60}
              onBook={() => navigate(`/book/${r.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RestaurantCard({ restaurant: r, delay, onBook }) {
  const [tableList, setTableList] = useState([])

  useEffect(() => {
    tables.byRestaurant(r.id).then(setTableList).catch(() => {})
  }, [r.id])

  const capacitySummary = tableList.reduce((acc, t) => {
    acc[t.capacity] = (acc[t.capacity] || 0) + 1
    return acc
  }, {})

  return (
    <div className="card slide-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="card-header">
        <div>
          <div className="card-title">{r.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
            📍 {r.location}
          </div>
        </div>
      </div>

      <div className="card-meta">
        <div>
          <span style={{ color: 'var(--gold)' }}>Open</span>{' '}
          {formatTime(r.opening_time)} — {formatTime(r.closing_time)}
        </div>
        {tableList.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {Object.entries(capacitySummary).map(([cap, count]) => (
              <span key={cap} style={{ marginRight: 12 }}>
                {count}× {cap}-seat
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="ornament" style={{ margin: '20px 0' }}>✦</div>

      <button className="btn btn-outline btn-full" onClick={onBook}>
        Reserve a Table
      </button>
    </div>
  )
}
