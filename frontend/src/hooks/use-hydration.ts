'use client'

import { useEffect, useState } from 'react';

/**
 * Hook personalizado para manejar la hidratación de manera robusta
 * Previene errores de hidratación en aplicaciones Next.js
 */
export const useHydration = (delay: number = 100) => {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // ✅ Delay para asegurar que la hidratación esté completa
    const timer = setTimeout(() => {
      setIsHydrated(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  return isHydrated
}

/**
 * Hook para prevenir renderizado del lado del servidor
 * Útil para componentes que solo deben renderizarse en el cliente
 */
export const useClientOnly = () => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

/**
 * Hook para manejar fetch seguro durante hidratación
 * Previene llamadas API durante la hidratación inicial
 */
export const useSafeFetch = () => {
  const isHydrated = useHydration(150)
  const [hasInitialized, setHasInitialized] = useState(false)

  const safeFetch = async (url: string, options?: RequestInit) => {
    if (!isHydrated || hasInitialized) {
      return null
    }

    setHasInitialized(true)

    try {
      const response = await fetch(url, options)
      return response
    } catch (error) {
      console.error('Error en safeFetch:', error)
      return null
    }
  }

  return { safeFetch, isHydrated, hasInitialized }
}
