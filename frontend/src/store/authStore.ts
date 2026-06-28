import { create } from 'zustand'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
  hydrate: () => void
}

const SESSION_KEY = 'portfolio_token'

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,

  login: (token: string) => {
    sessionStorage.setItem(SESSION_KEY, token)
    set({ token, isAuthenticated: true })
  },

  logout: () => {
    sessionStorage.removeItem(SESSION_KEY)
    set({ token: null, isAuthenticated: false })
  },

  hydrate: () => {
    const token = sessionStorage.getItem(SESSION_KEY)
    if (token) {
      set({ token, isAuthenticated: true })
    }
  },
}))
