'use client'

import { useCallback, useEffect, useState } from 'react';

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
    description: 'Generate a 24-second video with a realistic person, related to the theme',
    title: 'Promotional video with realistic person (24s)',
    suggestedTime: '10:00 AM',
    suggestedTimeReason: '🌅 Start of week - High attention on social networks',
    recommendedNetworks: ['Facebook', 'Instagram Reels'],
    networkStrategy: 'Real person videos generate trust. Facebook ideal for mature audience (insurance). Instagram Reels for viral reach and younger audience.'
  },
  tuesday: {
    type: 'image_stats',
    description: 'Create an image with relevant statistics about the theme',
    title: 'Image with relevant statistics',
    suggestedTime: '11:00 AM',
    suggestedTimeReason: '📊 Best day for engagement - Peak work hours',
    recommendedNetworks: ['LinkedIn', 'Facebook'],
    networkStrategy: 'LinkedIn loves professional data content. Best day for B2B engagement. Facebook for massive reach and general audience.'
  },
  wednesday: {
    type: 'video_avatar',
    duration: 24,
    description: 'Produce a 24-second video with an animated avatar (Pixar style), focused on the theme',
    title: 'Video with animated avatar (24s)',
    suggestedTime: '1:00 PM',
    suggestedTimeReason: '🍽️ Mid-week - Lunch time, higher engagement',
    recommendedNetworks: ['Instagram Reels', 'TikTok', 'YouTube Shorts'],
    networkStrategy: 'Creative content works better at lunch time. TikTok and Instagram for entertaining content that educates. YouTube Shorts for additional reach.'
  },
  thursday: {
    type: 'cta_post',
    description: 'Design a post with a call to action (CTA) related to the theme',
    title: 'Post with CTA',
    suggestedTime: '11:30 AM',
    suggestedTimeReason: '💼 Conversion peak - Thursday has better action rate',
    recommendedNetworks: ['LinkedIn', 'Facebook', 'Instagram'],
    networkStrategy: 'Thursday is the best day for conversions. LinkedIn for professional B2B leads. Facebook and Instagram for audience making financial decisions.'
  },
  friday: {
    type: 'manual',
    description: 'Reserved space to define content manually',
    title: 'Custom manual content',
    suggestedTime: '10:00 AM',
    suggestedTimeReason: '🎉 Early Friday - Before the weekend',
    recommendedNetworks: ['Instagram', 'Twitter/X', 'Facebook'],
    networkStrategy: 'Early Friday before the weekend. Instagram for casual and visual engagement. Twitter/X for quick conversations and trending topics.'
  },
  saturday: {
    type: 'free',
    description: 'No scheduled content',
    title: 'Free Day'
  },
  sunday: {
    type: 'free',
    description: 'No scheduled content',
    title: 'Free Day'
  }
}

export const useThemes = () => {
  const [themes, setThemes] = useState<ThemePlanning[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Cargar temáticas
  const fetchThemes = useCallback(async () => {
    if (!isMounted || hasInitialized) return // ✅ Doble protección contra hidratación

    console.log('🔄 useThemes: fetchThemes iniciando...')
    setLoading(true)
    setHasInitialized(true) // ✅ Marcar como inicializado

    try {
      const response = await fetch('/api/planificador/themes')
      console.log('🔄 useThemes: Response status:', response.status)
      if (!response.ok) throw new Error('Error loading themes')
      const data = await response.json()
      console.log('🔄 useThemes: Datos recibidos:', data)
      setThemes(data)
      console.log('🔄 useThemes: Temáticas establecidas:', data.length)
    } catch (err) {
      console.error('❌ useThemes: Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [isMounted, hasInitialized])

  // Crear nueva temática
  const createTheme = async (themeData: CreateThemeData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/planificador/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeData)
      })
      if (!response.ok) throw new Error('Error creating theme')
      const newTheme = await response.json()
      setThemes(prev => [...prev, newTheme])
      return newTheme
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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
      if (!response.ok) throw new Error('Error updating theme')
      const updatedTheme = await response.json()
      setThemes(prev => prev.map(theme =>
        theme.id === id ? updatedTheme : theme
      ))
      return updatedTheme
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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
      if (!response.ok) throw new Error('Error deleting theme')
      setThemes(prev => prev.filter(theme => theme.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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
      return { valid: false, message: 'Invalid dates' }
    }

    // Validar que la fecha de inicio no sea en el pasado
    if (start < today) {
      return { valid: false, message: 'Start date cannot be in the past' }
    }

    // Validar que la fecha de fin sea posterior a la de inicio
    if (end <= start) {
      return { valid: false, message: 'End date must be after start date' }
    }

    // Calcular diferencia en días
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Validar rango mínimo (1 semana) y máximo (3 meses)
    if (diffDays < 7) {
      return { valid: false, message: 'Minimum range is 1 week' }
    }

    if (diffDays > 90) {
      return { valid: false, message: 'Maximum range is 3 months' }
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


  // Función para ajustar fechas a días hábiles
  const adjustToBusinessDay = (date: Date, isStartDate: boolean): Date => {
    // ✅ CORREGIR PROBLEMA DE TIMEZONE: Crear fecha local sin conversión UTC
    const dateString = date.toISOString().split('T')[0] // Obtener YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number)
    const adjustedDate = new Date(year, month - 1, day) // Crear fecha local
    const dayOfWeek = adjustedDate.getDay() // 0=Domingo, 6=Sábado

    if (dayOfWeek === 0) { // Domingo
      if (isStartDate) {
        // Fecha inicio en domingo → siguiente lunes
        adjustedDate.setDate(adjustedDate.getDate() + 1)
      } else {
        // Fecha final en domingo → viernes anterior
        adjustedDate.setDate(adjustedDate.getDate() - 2)
      }
    } else if (dayOfWeek === 6) { // Sábado
      if (isStartDate) {
        // Fecha inicio en sábado → siguiente lunes
        adjustedDate.setDate(adjustedDate.getDate() + 2)
      } else {
        // Fecha final en sábado → viernes anterior
        adjustedDate.setDate(adjustedDate.getDate() - 1)
      }
    }

    return adjustedDate
  }

  // Generar eventos diarios para React Big Calendar (eventos de todo el día)
  const generateCalendarEvents = (themes: ThemePlanning[]) => {
    const events: Array<{
      id: string;
      title: string;
      start: Date;
      end: Date;
      allDay: boolean;
      resource: {
        theme: ThemePlanning;
        dayContent: ContentDay;
        dayKey: string;
      };
    }> = []

    themes.forEach(theme => {
      const startDate = new Date(theme.startDate)
      const endDate = new Date(theme.endDate)

      // ✅ AJUSTAR FECHAS A DÍAS HÁBILES
      const adjustedStartDate = adjustToBusinessDay(startDate, true)  // true = fecha inicio
      const adjustedEndDate = adjustToBusinessDay(endDate, false)     // false = fecha final

      // Normalizar fechas para comparación (solo fecha, sin hora)
      const startDateOnly = new Date(adjustedStartDate.getFullYear(), adjustedStartDate.getMonth(), adjustedStartDate.getDate())
      const endDateOnly = new Date(adjustedEndDate.getFullYear(), adjustedEndDate.getMonth(), adjustedEndDate.getDate())

      // Generar eventos día por día dentro del rango ajustado
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
        day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
        ...dayContent,
        themeName
      })
    }

    return distribution
  }

  // Efecto para manejar el montaje del componente
  useEffect(() => {
    // ✅ Delay mínimo para asegurar hidratación completa
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 150) // ✅ Aumentado a 150ms para mayor estabilidad

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isMounted && !hasInitialized) {
      console.log('🔄 useThemes: useEffect ejecutándose...')
      fetchThemes()
    }
  }, [fetchThemes, isMounted, hasInitialized])

  return {
    themes,
    loading,
    error,
    isMounted,
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
