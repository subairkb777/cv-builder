import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LoginModal } from './LoginModal'
import { api } from '../api/client'

export function Navbar() {
  const { isAuthenticated, logout } = useAuthStore()
  const [showLogin, setShowLogin] = useState(false)
  const location = useLocation()

  const handleLogout = async () => {
    try { await api.logout() } catch { /* ignore */ }
    logout()
  }

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`relative px-4 py-2 text-sm font-medium transition-colors ${
        location.pathname === to
          ? 'text-white'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
      {location.pathname === to && (
        <span className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-blue-500 to-purple-500" />
      )}
    </Link>
  )

  return (
    <>
      <nav className="no-print sticky top-0 z-40 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition group-hover:shadow-blue-500/40">
                S
              </div>
              <span className="text-sm font-semibold text-white">Subair KB</span>
            </Link>

            <div className="flex items-center gap-1">
              {navLink('/', 'Home')}
              {navLink('/resume', 'Resume')}
              {isAuthenticated && navLink('/editor', 'Editor')}
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/editor"
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20 hover:border-blue-500/50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Portfolio
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-white"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="rounded-lg border border-gray-700/60 bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-gray-600 hover:bg-gray-700/50 hover:text-white"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
