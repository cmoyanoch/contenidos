'use client'

import { useCallback, useEffect, useState } from 'react';

export interface ContentGenerated {
  id: string
  content_type: string
  scheduled_date: string
  day_of_week: number
  format_id: number | null
  image_format_id: number | null
  format_type: string
  is_primary: boolean
}

export interface ThemePlanning {
  id: string
  userId: string
  themeName: string
  themeDescription?: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
  content_generated?: ContentGenerated[] // 🆕 Array de contenido generado de la DB
}

export interface CreateThemeData {
  themeName: string
  themeDescription?: string
  startDate: string
  endDate: string
  // 🆕 Para temáticas de un solo día
  singleDayContentType?: 'video_person' | 'image_stats' | 'video_avatar' | 'cta_post' | 'content_manual'
  singleDayFormatId?: number
  singleDayImageFormatId?: number
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
  type: 'video_person' | 'image_stats' | 'video_avatar' | 'cta_post' | 'content_manual' | 'free'
  duration?: number
  description: string
  title: string
  suggestedTime?: string
  suggestedTimeReason?: string
  recommendedNetworks?: string[]
  networkStrategy?: string
  dayOfWeek?: number // ✅ Agregar dayOfWeek (1=Lunes, 7=Domingo)
}

// 🆕 Tipos de contenido disponibles para temáticas de un solo día
export const SINGLE_DAY_CONTENT_TYPES = [
  {
    value: 'video_person' as const,
    label: 'Video with realistic person (24s)',
    description: 'Generate a 24-second video with a realistic person',
    formatId: 9,
    formatType: 'video' as const,
    icon: '👤'
  },
  {
    value: 'video_avatar' as const,
    label: 'Video with animated avatar (24s)',
    description: 'Produce a 24-second video with an animated avatar (Pixar style)',
    formatId: 10,
    formatType: 'video' as const,
    icon: '🎭'
  },
  {
    value: 'image_stats' as const,
    label: 'Image with statistics',
    description: 'Create an image with relevant statistics',
    imageFormatId: 12,
    formatType: 'image' as const,
    icon: '📊'
  },
  {
    value: 'cta_post' as const,
    label: 'Post with CTA',
    description: 'Design a post with a call to action',
    formatId: 11,
    formatType: 'image' as const,
    icon: '📢'
  },
  {
    value: 'content_manual' as const,
    label: 'Manual content',
    description: 'Reserved space to define content manually',
    imageFormatId: 13,
    formatType: 'manual' as const,
    icon: '✍️'
  }
]

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
    type: 'content_manual',
    description: 'Reserved space to define content manually',
    title: 'Manual content',
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

  // 🆕 Función interna para recargar temáticas (sin protección hasInitialized)
  const reloadThemes = useCallback(async () => {
    try {
      const response = await fetch('/api/planificador/themes')
      if (!response.ok) throw new Error('Error loading themes')
      const data = await response.json()
      setThemes(data)
      console.log('✅ Temáticas recargadas con contenido actualizado')
    } catch (err) {
      console.error('❌ useThemes: Error reloading:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  // Cargar temáticas (solo primera vez)
  const fetchThemes = useCallback(async () => {
    if (!isMounted || hasInitialized) return // ✅ Doble protección contra hidratación

    setLoading(true)
    setHasInitialized(true) // ✅ Marcar como inicializado

    try {
      const response = await fetch('/api/planificador/themes')

      if (!response.ok) throw new Error('Error loading themes')
      const data = await response.json()

      setThemes(data)

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

      // 🆕 Recargar todas las temáticas para obtener content_generated actualizado
      await reloadThemes()

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
    // Parsear fechas en zona horaria local (no UTC)
    // Agregar 'T00:00:00' para forzar interpretación local
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')

    // Normalizar 'today' a medianoche en zona horaria local
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Validar que las fechas sean válidas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, message: 'Invalid dates' }
    }

    // Validar que la fecha de inicio no sea en el pasado
    if (start < today) {
      return { valid: false, message: 'Start date cannot be in the past' }
    }

    // Validar que la fecha de fin no sea anterior a la fecha de inicio (permite mismo día)
    if (end < start) {
      return { valid: false, message: 'End date cannot be before start date' }
    }

    // Calcular diferencia en díasexit

    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Validar rango máximo (3 meses) - Permite 0 días (mismo día)
    if (diffDays < 0) {
      return { valid: false, message: 'Invalid date range' }
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

        // Normalizar fecha actual para comparación (YYYY-MM-DD)
        const currentDateString = currentDate.toISOString().split('T')[0]

        // 🆕 Buscar contenido REAL de la base de datos para esta fecha
        let dayContent: ContentDay | null = null
        let eventTitle = ''

        if (theme.content_generated && theme.content_generated.length > 0) {
          const contentForDate = theme.content_generated.find(content => {
            const scheduledDate = new Date(content.scheduled_date).toISOString().split('T')[0]
            return scheduledDate === currentDateString
          })

          if (contentForDate) {
            // ✅ Usar contenido REAL de la base de datos
            const contentTypeMapping: Record<string, { title: string, description: string, duration?: number }> = {
              'video_person': { title: '🎥 Video with realistic person', description: 'Generate a 24-second video with a realistic person', duration: 24 },
              'video_avatar': { title: '🎭 Video with animated avatar', description: 'Produce a 24-second video with an animated avatar (Pixar style)', duration: 24 },
              'image_stats': { title: '📊 Image with statistics', description: 'Create a content image with statistics and facts', duration: undefined },
              'cta_post': { title: '📢 Post with CTA', description: 'Publication with call to action', duration: undefined },
              'content_manual': { title: '✍️ Manual content', description: 'Content to be created manually', duration: undefined }
            }

            const mapping = contentTypeMapping[contentForDate.content_type] || {
              title: contentForDate.content_type,
              description: contentForDate.content_type
            }

            dayContent = {
              type: contentForDate.content_type as 'video_person' | 'image_stats' | 'video_avatar' | 'cta_post' | 'content_manual' | 'free',
              duration: mapping.duration,
              description: mapping.description,
              title: mapping.title,
              dayOfWeek: dayOfWeek === 0 ? 7 : dayOfWeek
            }
            eventTitle = mapping.title
          }
        }

        // Si no hay contenido de DB, usar WEEKLY_TEMPLATE como fallback
        if (!dayContent) {
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
            dayContent = WEEKLY_TEMPLATE[dayKey as keyof WeeklySchedule]
            eventTitle = dayContent.title
          }
        }

        // Solo crear evento si hay contenido y no es 'free'
        if (dayContent && dayContent.type !== 'free') {
          // Crear evento de todo el día
          const eventDate = new Date(currentDate)
          eventDate.setHours(0, 0, 0, 0) // Normalizar a medianoche

          // ✅ Agregar dayOfWeek al dayContent si no lo tiene
          const dayContentWithWeek = {
            ...dayContent,
            dayOfWeek: dayContent.dayOfWeek || (dayOfWeek === 0 ? 7 : dayOfWeek)
          }

          const dayMapping = {
            1: 'monday', 2: 'tuesday', 3: 'wednesday',
            4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
          }
          const dayKey = dayMapping[dayOfWeek as keyof typeof dayMapping] || 'unknown'

          events.push({
            id: `${theme.id}-${dayKey}-${currentDateString}`,
            title: eventTitle,
            start: eventDate,
            end: eventDate,
            allDay: true,
            resource: {
              theme: theme,
              dayContent: dayContentWithWeek,
              dayKey: dayKey
            }
          })
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

  // 🆕 Verificar si un rango de fechas es de un solo día
  const isSingleDayTheme = (startDate: string, endDate: string): boolean => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return start.getTime() === end.getTime()
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
    generateWeeklyDistribution,
    isSingleDayTheme
  }
}
