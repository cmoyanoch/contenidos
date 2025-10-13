'use client'

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // No mostrar navbar en páginas de auth
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return null
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-blue-700 hover:text-white'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-900 to-purple-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-white">
                🎨 ContentFlow
              </span>
            </Link>

            {/* Navigation Links - Desktop */}
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/dashboard')}`}
              >
                Dashboard
              </Link>
              <Link
                href="/generar-video"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/generar-video')}`}
              >
                🎬 Generar Video
              </Link>

        <Link
          href="/planificador"
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/planificador')}`}
        >
          🎯 Planificador
        </Link>
        <Link
          href="/formatos"
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/formatos')}`}
        >
          📹 Formatos
        </Link>
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin')}`}
              >
                🔧 Admin
              </Link>
            </div>
          </div>

          {/* User Menu - Desktop */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {status === 'loading' ? (
              <div className="text-gray-300">Cargando...</div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                <span className="text-gray-300 text-sm">
                  Hola, {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white hover:bg-blue-700 p-2 rounded-md"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-gradient-to-r from-blue-900 to-purple-900 shadow-lg z-40">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-blue-700">
              <Link
                href="/dashboard"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive('/dashboard')}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/generar-video"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive('/generar-video')}`}
                onClick={() => setIsMenuOpen(false)}
              >
                🎬 Generar Video
              </Link>

            <Link
              href="/planificador"
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive('/planificador')}`}
              onClick={() => setIsMenuOpen(false)}
            >
              🎯 Planificador
            </Link>
            <Link
              href="/formatos"
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive('/formatos')}`}
              onClick={() => setIsMenuOpen(false)}
            >
              📹 Formatos
            </Link>
              <Link
                href="/admin"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive('/admin')}`}
                onClick={() => setIsMenuOpen(false)}
              >
                🔧 Admin
              </Link>

              {/* User section - Mobile */}
              <div className="pt-4 pb-3 border-t border-blue-700">
                {session ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-base font-medium text-gray-300">
                      {session.user?.name || session.user?.email}
                    </div>
                    <button
                      onClick={() => {
                        handleSignOut()
                        setIsMenuOpen(false)
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-300 hover:text-red-200 hover:bg-red-600"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-blue-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Iniciar Sesión
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
