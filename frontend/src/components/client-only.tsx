'use client'

import { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  delay?: number
}

/**
 * Componente que solo renderiza en el cliente
 * Previene completamente los errores de hidratación
 */
export default function ClientOnly({
  children,
  fallback = <div className="flex justify-center items-center h-64"><div className="text-gray-500">Cargando...</div></div>,
  delay = 200
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    // ✅ Delay más largo para asegurar hidratación completa
    const timer = setTimeout(() => {
      setHasMounted(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  // ✅ No renderizar nada hasta que esté completamente montado
  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
