'use client'

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useHydration } from '../hooks/use-hydration';
import ClientOnly from './client-only';

interface MenuItem {
  href: string
  label: string
  icon: string
  roles: string[]  // Roles permitidos para ver este menú
}

function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>('user')
  const [isMounted, setIsMounted] = useState(false) // ✅ Control de montaje

  // ✅ Hook de hidratación robusta
  const isHydrated = useHydration(150)

  // Efecto para manejar el montaje del componente
  useEffect(() => {
    // ✅ Delay mínimo para asegurar hidratación completa
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 100) // ✅ Delay para estabilidad

    return () => clearTimeout(timer)
  }, [])

  // No mostrar navbar en páginas de auth
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return null
  }

  // Obtener rol del usuario solo cuando esté completamente hidratado
  useEffect(() => { // eslint-disable-line react-hooks/rules-of-hooks
    const fetchUserRole = async () => {
      if (isHydrated && isMounted && session?.user?.email) { // ✅ Doble verificación
        try {
          const response = await fetch(`/api/users/me`)
          if (response.ok) {
            const data = await response.json()
            setUserRole(data.user?.role || 'user')
          }
        } catch (error) {
          console.error('Error obteniendo rol:', error)
          setUserRole('user')
        }
      }
    }
    fetchUserRole()
  }, [session, isMounted, isHydrated]) // ✅ Agregar isHydrated a dependencias

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-blue-700 hover:text-white'
  }

  // Definir menús con control de acceso por rol
  const menuItems: MenuItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin'] },
    { href: '/generar-video', label: 'Generar Video', icon: '🎬', roles: ['admin'] },
    { href: '/generar-contenido', label: 'Generar Contenido', icon: '📝', roles: ['admin'] },
    { href: '/planificador', label: 'Planificador', icon: '🎯', roles: ['admin', 'user'] },
    { href: '/formatos', label: 'Formatos', icon: '📹', roles: ['admin', 'user'] },
    { href: '/company', label: 'Company', icon: '🏢', roles: ['admin', 'user'] },
    { href: '/admin', label: 'Admin', icon: '🔧', roles: ['admin'] },
    { href: '/admin/users', label: 'Users', icon: '👥', roles: ['admin'] },
    { href: '/agendador', label: 'Agendador', icon: '📅', roles: ['admin'] },
    { href: '/campaigns', label: 'Campaigns', icon: '🎯', roles: ['admin'] }
  ]

  // Filtrar menús según rol del usuario
  const visibleMenus = menuItems.filter(item => item.roles.includes(userRole))

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

            {/* Navigation Links - Desktop (Filtrados por rol) */}
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              {visibleMenus.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.href)}`}
                >
                  {item.icon} {item.label}
                </Link>
              ))}
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

        {/* Mobile menu (Filtrado por rol) */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-gradient-to-r from-blue-900 to-purple-900 shadow-lg z-40">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-blue-700">
              {visibleMenus.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive(item.href)}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.icon} {item.label}
                </Link>
              ))}

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

// ✅ Wrapper con ClientOnly para prevenir errores de hidratación
export default function NavbarWrapper() {
  return (
    <ClientOnly
      delay={100}
      fallback={<div className="h-16 bg-gray-800"></div>}
    >
      <Navbar />
    </ClientOnly>
  )
}
