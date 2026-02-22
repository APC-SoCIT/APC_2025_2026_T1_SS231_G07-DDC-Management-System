"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { api, setAuthInterceptor, clearAuthInterceptor } from "./api"

interface User {
  id: number
  username: string
  email: string
  user_type: "patient" | "staff" | "owner"
  first_name: string
  last_name: string
  phone?: string
  birthday?: string
  role?: string  // For staff: 'receptionist' or 'dentist'
}

interface AuthContextType {
  user: User | null
  /** The in-memory JWT access token (never stored in localStorage). */
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  isLoading: boolean
  /** Manually trigger a silent refresh of the access token. */
  refreshAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ---------------------------------------------------------------------------
// Cookie helpers (non-HttpOnly session indicator for Edge Middleware)
// ---------------------------------------------------------------------------
function setAuthStatusCookie(userType: string) {
  document.cookie = `auth_status=${userType}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

function clearAuthStatusCookie() {
  document.cookie = 'auth_status=; path=/; max-age=0; SameSite=Lax'
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  // Access token lives in memory only — NEVER in localStorage
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Wrapper for setUser that also updates localStorage (non-sensitive hydration data)
  const setUser = (newUser: User | null) => {
    setUserState(newUser)
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser))
    } else {
      localStorage.removeItem("user")
    }
  }

  // ------ Logout (stable ref via useCallback) ------
  const logout = useCallback(() => {
    api.jwtLogout().catch(console.error)
    setAccessToken(null)
    setUser(null)
    clearAuthStatusCookie()
    localStorage.removeItem("token") // clean up legacy key if present
    localStorage.removeItem("user")
    window.location.href = '/login'
  }, [])

  // ------ Refresh helper ------
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const result = await api.jwtRefresh()
      if (result?.access) {
        setAccessToken(result.access)
        return result.access
      }
    } catch {
      // refresh failed
    }
    return null
  }, [])

  // ------ Wire up the auth interceptor whenever the token changes ------
  useEffect(() => {
    if (accessToken) {
      setAuthInterceptor(
        accessToken,
        (newToken: string) => setAccessToken(newToken),
        () => logout(),
      )
    } else {
      clearAuthInterceptor()
    }
    return () => clearAuthInterceptor()
  }, [accessToken, logout])

  // ------ Silent refresh on mount ------
  useEffect(() => {
    const tryRestore = async () => {
      const storedUser = localStorage.getItem("user")
      if (!storedUser) {
        setIsLoading(false)
        return
      }

      // We have a stored user — try to refresh the access token via HttpOnly cookie
      try {
        const result = await api.jwtRefresh()
        if (result?.access) {
          setAccessToken(result.access)
          setUserState(JSON.parse(storedUser))
          const parsed = JSON.parse(storedUser)
          setAuthStatusCookie(parsed.user_type)
        } else {
          // Refresh failed — clear everything
          localStorage.removeItem("user")
          localStorage.removeItem("token")
          clearAuthStatusCookie()
        }
      } catch {
        localStorage.removeItem("user")
        localStorage.removeItem("token")
        clearAuthStatusCookie()
      }
      setIsLoading(false)
    }
    tryRestore()
  }, [])

  // ------ Login ------
  const login = async (username: string, password: string) => {
    const response = await api.jwtLogin(username, password)

    // Store access token in memory only
    setAccessToken(response.access)
    setUser(response.user)
    setAuthStatusCookie(response.user.user_type)

    // Also keep legacy token in localStorage so old pages still work during migration
    if (response.legacy_token) {
      localStorage.setItem("token", response.legacy_token)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token: accessToken,
        login,
        logout,
        setUser,
        isLoading,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
