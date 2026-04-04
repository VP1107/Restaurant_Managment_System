import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, users } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const me = await users.me()
      setUser(me)
    } catch {
      setUser(null)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchMe()
    } else {
      setLoading(false)
    }
  }, [fetchMe])

  const login = async (email, password) => {
    const data = await auth.login(email, password)
    localStorage.setItem('token', data.access_token)
    await fetchMe()
  }

  const register = async (email, password) => {
    await auth.register(email, password)
    await login(email, password)
  }

  const logout = async () => {
    try { await auth.logout() } catch {}
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
