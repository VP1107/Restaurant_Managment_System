const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) {
    const message =
      data?.detail?.map?.((d) => d.msg).join(', ') ||
      data?.detail ||
      'Something went wrong'
    throw new Error(message)
  }
  return data
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  register: (email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: async (email, password) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const res = await fetch(`${BASE}/auth/jwt/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.detail || 'Login failed')
    return data
  },

  logout: () =>
    request('/auth/jwt/logout', { method: 'POST' }),
}

// ── Users ────────────────────────────────────────────────────────────────────
export const users = {
  me: () => request('/users/me'),
  all: () => request('/users/all'),
  getById: (id) => request(`/users/${id}`),
  changeRole: (id, role) =>
    request(`/users/change-role/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
}

// ── Restaurants ──────────────────────────────────────────────────────────────
export const restaurants = {
  all: () => request('/restaurants/'),
  getById: (id) => request(`/restaurants/${id}`),
  create: (body) =>
    request('/restaurants/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/restaurants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => request(`/restaurants/${id}`, { method: 'DELETE' }),
}

// ── Tables ───────────────────────────────────────────────────────────────────
export const tables = {
  byRestaurant: (restaurantId) =>
    request(`/tables/?restaurant_id=${restaurantId}`),
  create: (body) =>
    request('/tables/', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id) => request(`/tables/${id}`, { method: 'DELETE' }),
}

// ── Bookings ─────────────────────────────────────────────────────────────────
export const bookings = {
  all: () => request('/bookings/all'),
  mine: () => request('/bookings/my-booking'),
  create: (body) =>
    request('/bookings/create', { method: 'POST', body: JSON.stringify(body) }),
  checkCapacity: (body) =>
    request('/bookings/check-capacity', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  cancel: () => request('/bookings/cancel', { method: 'PATCH' }),
  updateStatus: (id, status) =>
    request('/bookings/', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    }),
}
