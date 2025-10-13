'use client'

import { useEffect, useState } from 'react';

export interface ThemePlanning {
  id: string
  userId: string
  themeName: string
  themeDescription?: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface CreateThemeData {
  themeName: string
  themeDescription?: string
  startDate: string
  endDate: string
}

export interface WeeklySchedule {
  monday: ContentDay
  tuesday: ContentDay
  wednesday: ContentDay
  thursday: ContentDay
  friday: ContentDay
  saturday: ContentDay
  sunday: ContentDay
}

export interface ContentDay {
  type: 'video_person' | 'image_stats' | 'video_avatar' | 'cta_post' | 'manual' | 'free'
  duration?: number
  description: string
  title: string
  suggestedTime?: string
  suggestedTimeReason?: string
  recommendedNetworks?: string[]
  networkStrategy?: string
}

// Plantilla semanal predefinida con horarios óptimos y redes sociales recomendadas
export const WEEKLY_TEMPLATE: WeeklySchedule = {
  monday: {
    type: 'video_person',
    duration: 24,
    description: 'Generar un video de 24 segundos con una persona realista, relacionado con la temática',
    title: 'Video promocional con persona realista (24s)',
    suggestedTime: '10:00 AM',
    suggestedTimeReason: '🌅 Inicio de semana - Alta atención en redes sociales',
    recommendedNetworks: ['Facebook', 'Instagram Reels'],
    networkStrategy: 'Videos de personas reales generan confianza. Facebook ideal para audiencia madura (seguros). Instagram Reels para alcance viral y audiencia más joven.'
  },
  tuesday: {
    type: 'image_stats',
    description: 'Crear una imagen con estadísticas relevantes sobre la temática',
    title: 'Imagen con estadísticas relevantes',
    suggestedTime: '11:00 AM',
    suggestedTimeReason: '📊 Mejor día para engagement - Horario laboral pico',
    recommendedNetworks: ['LinkedIn', 'Facebook'],
    networkStrategy: 'LinkedIn ama contenido con datos profesionales. Mejor día para engagement B2B. Facebook para alcance masivo y audiencia general.'
  },
  wednesday: {
    type: 'video_avatar',
    duration: 24,
    description: 'Producir un video de 24 segundos con un avatar animado (estilo Pixar), enfocado en la temática',
    title: 'Video con avatar animado (24s)',
    suggestedTime: '1:00 PM',
    suggestedTimeReason: '🍽️ Mitad de semana - Hora del almuerzo, mayor engagement',
    recommendedNetworks: ['Instagram Reels', 'TikTok', 'YouTube Shorts'],
    networkStrategy: 'Contenido creativo funciona mejor en horario de almuerzo. TikTok e Instagram para contenido entretenido que educa. YouTube Shorts para alcance adicional.'
  },
  thursday: {
    type: 'cta_post',
    description: 'Diseñar una publicación con un llamado a la acción (CTA) referente a la temática',
    title: 'Publicación con CTA',
    suggestedTime: '11:30 AM',
    suggestedTimeReason: '💼 Pico de conversión - Jueves tiene mejor tasa de acción',
    recommendedNetworks: ['LinkedIn', 'Facebook', 'Instagram'],
    networkStrategy: 'Jueves es el mejor día para conversiones. LinkedIn para leads B2B profesionales. Facebook e Instagram para audiencia que toma decisiones financieras.'
  },
  friday: {
    type: 'manual',
    description: 'Espacio reservado para definir el contenido manualmente',
    title: 'Contenido manual personalizado',
    suggestedTime: '10:00 AM',
    suggestedTimeReason: '🎉 Viernes temprano - Antes del fin de semana',
    recommendedNetworks: ['Instagram', 'Twitter/X', 'Facebook'],
    networkStrategy: 'Viernes temprano antes del fin de semana. Instagram para engagement casual y visual. Twitter/X para conversaciones rápidas y trending topics.'
  },
  saturday: {
    type: 'free',
    description: 'Sin contenido programado',
    title: 'Día Libre'
  },
  sunday: {
    type: 'free',
    description: 'Sin contenido programado',
    title: 'Día Libre'
  }
}

export const useThemes = () => {
  const [themes, setThemes] = useState<ThemePlanning[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar temáticas
  const fetchThemes = async () => {
    console.log('🔄 useThemes: fetchThemes iniciando...')
    setLoading(true)
    try {
      const response = await fetch('/api/planificador/themes')
      console.log('🔄 useThemes: Response status:', response.status)
      if (!response.ok) throw new Error('Error al cargar temáticas')
      const data = await response.json()
      console.log('🔄 useThemes: Datos recibidos:', data)
      setThemes(data)
      console.log('🔄 useThemes: Temáticas establecidas:', data.length)
    } catch (err) {
      console.error('❌ useThemes: Error:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Crear nueva temática
  const createTheme = async (themeData: CreateThemeData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/planificador/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeData)
      })
      if (!response.ok) throw new Error('Error al crear temática')
      const newTheme = await response.json()
      setThemes(prev => [...prev, newTheme])
      return newTheme
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Actualizar temática
  const updateTheme = async (id: string, themeData: Partial<CreateThemeData>) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/planificador/themes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeData)
      })
      if (!response.ok) throw new Error('Error al actualizar temática')
      const updatedTheme = await response.json()
      setThemes(prev => prev.map(theme =>
        theme.id === id ? updatedTheme : theme
      ))
      return updatedTheme
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Eliminar temática
  const deleteTheme = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/planificador/themes?id=${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Error al eliminar temática')
      setThemes(prev => prev.filter(theme => theme.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Validar rango de fechas
  const validateDateRange = (startDate: string, endDate: string): { valid: boolean; message?: string } => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()

    // Validar que las fechas sean válidas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, message: 'Fechas inválidas' }
    }

    // Validar que la fecha de inicio no sea en el pasado
    if (start < today) {
      return { valid: false, message: 'La fecha de inicio no puede ser en el pasado' }
    }

    // Validar que la fecha de fin sea posterior a la de inicio
    if (end <= start) {
      return { valid: false, message: 'La fecha de fin debe ser posterior a la de inicio' }
    }

    // Calcular diferencia en días
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Validar rango mínimo (1 semana) y máximo (3 meses)
    if (diffDays < 7) {
      return { valid: false, message: 'El rango mínimo es de 1 semana' }
    }

    if (diffDays > 90) {
      return { valid: false, message: 'El rango máximo es de 3 meses' }
    }

    return { valid: true }
  }

  // Detectar conflictos con temáticas existentes
  const detectConflicts = (startDate: string, endDate: string, excludeId?: string): ThemePlanning[] => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    return themes.filter(theme => {
      if (excludeId && theme.id === excludeId) return false

      const themeStart = new Date(theme.startDate)
      const themeEnd = new Date(theme.endDate)

      // Verificar solapamiento
      return (start <= themeEnd && end >= themeStart)
    })
  }


  // Generar eventos diarios para React Big Calendar (eventos de todo el día)
  const generateCalendarEvents = (themes: ThemePlanning[]) => {
    const events: any[] = []

    themes.forEach(theme => {
      const startDate = new Date(theme.startDate)
      const endDate = new Date(theme.endDate)

      // Normalizar fechas para comparación (solo fecha, sin hora)
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

      // Generar eventos día por día dentro del rango exacto
      const currentDate = new Date(startDateOnly)

      while (currentDate <= endDateOnly) {
        // Obtener el día de la semana (0 = Domingo, 1 = Lunes, etc.)
        const dayOfWeek = currentDate.getDay()

        // Mapear día de la semana a clave de plantilla
        const dayMapping = {
          1: 'monday',    // Lunes
          2: 'tuesday',   // Martes
          3: 'wednesday', // Miércoles
          4: 'thursday',  // Jueves
          5: 'friday',    // Viernes
          6: 'saturday',  // Sábado
          0: 'sunday'     // Domingo
        }

        const dayKey = dayMapping[dayOfWeek as keyof typeof dayMapping]

        if (dayKey && WEEKLY_TEMPLATE[dayKey as keyof WeeklySchedule]) {
          const dayContent = WEEKLY_TEMPLATE[dayKey as keyof WeeklySchedule]

          // Solo mostrar eventos para días laborales (no sábados ni domingos)
          if (dayContent.type !== 'free') {
            // Crear título más corto para mejor visualización
            const eventTitle = dayContent.title

            // Crear evento de todo el día
            const eventDate = new Date(currentDate)
            eventDate.setHours(0, 0, 0, 0) // Normalizar a medianoche

            events.push({
              id: `${theme.id}-${dayKey}-${currentDate.toISOString().split('T')[0]}`,
              title: eventTitle,
              start: eventDate,
              end: eventDate,
              allDay: true, // true para eventos de todo el día
              resource: {
                theme: theme,
                dayContent: dayContent,
                dayKey: dayKey
              }
            })
          }
        }

        // Avanzar al siguiente día
        currentDate.setDate(currentDate.getDate() + 1)
      }
    })

    return events
  }

  // Generar distribución semanal para una temática
  const generateWeeklyDistribution = (themeName: string, startDate: string) => {
    const start = new Date(startDate)
    const weekStart = new Date(start)
    weekStart.setDate(start.getDate() - start.getDay() + 1) // Lunes

    const distribution = []

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart)
      currentDate.setDate(weekStart.getDate() + i)

      const dayKey = Object.keys(WEEKLY_TEMPLATE)[i] as keyof WeeklySchedule
      const dayContent = WEEKLY_TEMPLATE[dayKey]

      distribution.push({
        date: currentDate.toISOString().split('T')[0],
        day: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i],
        ...dayContent,
        themeName
      })
    }

    return distribution
  }

  useEffect(() => {
    console.log('🔄 useThemes: useEffect ejecutándose...')
    fetchThemes()
  }, [])

  return {
    themes,
    loading,
    error,
    fetchThemes,
    createTheme,
    updateTheme,
    deleteTheme,
    validateDateRange,
    detectConflicts,
    generateCalendarEvents,
    generateWeeklyDistribution
  }
}
