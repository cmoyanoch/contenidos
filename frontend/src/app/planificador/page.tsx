'use client'

import {
  AlertCircle,
  Eye
} from 'lucide-react';
import moment from 'moment';
import { useSession } from 'next-auth/react';
import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useHydration } from '../../hooks/use-hydration';
import { ThemePlanning, useThemes } from '../../hooks/use-themes';
import { buildApiUrl, buildN8nWebhookUrl, config } from '../../lib/config';

// Configurar moment en español
moment.locale('es', {
  months: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
})

const localizer = momentLocalizer(moment)

// Tipos para contenido generado
interface ContentGenerated {
  id: number
  theme_id: string
  day_of_week: number
  content_type: string
  scheduled_time: string
  scheduled_date: string
  social_networks: string[]
  file_path: string | null
  file_type: string | null
  directory_type: string | null
  status: 'pending' | 'generating' | 'completed' | 'published' | 'failed'
  n8n_execution_id: string | null
  operation_id: string | null
  format_id: number | null
  preview_generated_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  caption: string | null
  hashtags: string[] | null
}

// Función para ajustar fechas a días hábiles (misma lógica que use-themes.ts)
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

export default function PlanificadorPage() {
  const [showModal, setShowModal] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [showWeeklyStrategy, setShowWeeklyStrategy] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [showContentStatus, setShowContentStatus] = useState(false)
  const [currentDayContent, setCurrentDayContent] = useState<ContentGenerated | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState('month')
  const [themeForm, setThemeForm] = useState({
    themeName: '',
    themeDescription: '',
    startDate: '',
    endDate: ''
  })
  const [showHelpCollapsed, setShowHelpCollapsed] = useState(true) // Inicia colapsado
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [themeToDelete, setThemeToDelete] = useState<ThemePlanning | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [themeToEdit, setThemeToEdit] = useState<ThemePlanning | null>(null)

  // Obtener sesión y role del usuario
  const { data: session } = useSession()
  const userRole = (session?.user as { role?: string })?.role || 'user'
  const [showThemesList, setShowThemesList] = useState(false) // Controla el colapso de la lista de temáticas
  const [isGenerating, setIsGenerating] = useState(false) // Estado de carga para generación de contenido
  const [generatedContents, setGeneratedContents] = useState<ContentGenerated[]>([]) // Lista de todos los contenidos generados

  // ✅ Hook de hidratación robusta
  const isHydrated = useHydration(200)

  const {
    themes,
    loading,
    error,
    isMounted, // ✅ Agregar isMounted
    createTheme,
    deleteTheme,
    validateDateRange,
    detectConflicts,
    generateCalendarEvents
  } = useThemes()

  // Cargar todos los contenidos generados para todas las temáticas
  const loadAllGeneratedContents = async () => {
    if (themes.length === 0) return

    try {
      // Obtener todos los contenidos generados sin filtros
      const url = buildApiUrl('/api/v1/content-generated/')
      const response = await fetch(url)

      if (!response.ok) {
        console.error('❌ Error cargando contenidos generados')
        return
      }

      const data = await response.json()
      setGeneratedContents(data)

    } catch (error) {
      console.error('❌ Error cargando contenidos generados:', error)
    }
  }

  // Cargar contenidos generados cuando cambien los themes
  React.useEffect(() => {
    if (themes.length > 0 && isMounted) {
      loadAllGeneratedContents()
    }
  }, [themes, isMounted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Función auxiliar para detectar si es video
  const isVideoFile = (filePath: string | null, fileType: string | null): boolean => {
    if (!filePath && !fileType) return false

    // Detectar por file_type
    if (fileType) {
      const lowerType = fileType.toLowerCase()
      if (lowerType.startsWith('video/') || lowerType === 'mp4' || lowerType === 'webm' || lowerType === 'avi') {
        return true
      }
    }

    // Detectar por extensión del archivo
    if (filePath) {
      const lowerPath = filePath.toLowerCase()
      if (lowerPath.endsWith('.mp4') || lowerPath.endsWith('.webm') || lowerPath.endsWith('.avi') || lowerPath.endsWith('.mov')) {
        return true
      }
    }

    return false
  }

  // Función auxiliar para verificar si un día tiene contenido generado
  const hasGeneratedContent = (themeId: string, scheduledDate: string, contentType: string) => {
    // Normalizar la fecha a formato YYYY-MM-DD
    const normalizedDate = scheduledDate.split('T')[0]

    return generatedContents.some(
      content =>
        content.theme_id === themeId &&
        content.scheduled_date === normalizedDate &&
        content.content_type === contentType &&
        content.file_path !== null &&
        content.file_path !== '' &&
        content.caption !== null &&
        content.caption !== '' &&
        content.hashtags !== null
    )
  }

  // Cargar contenido específico del día seleccionado
  const loadCurrentDayContent = async (themeId: string, scheduledDate: string, contentType: string) => {

    // ✅ Validar parámetros antes de hacer la llamada
    if (!themeId || !scheduledDate || !contentType) {
      console.warn('⚠️ Parámetros inválidos para loadCurrentDayContent:', { themeId, scheduledDate, contentType })
      setCurrentDayContent(null)
      return null
    }

    setLoadingContent(true)
    try {
      // Normalizar fecha a formato YYYY-MM-DD
      const normalizedDate = scheduledDate.split('T')[0]
      const dbContentType = contentType

      // Usar scheduled_date en lugar de day_of_week
      const url = buildApiUrl(`/api/v1/content-generated/?theme_id=${themeId}&scheduled_date=${normalizedDate}&content_type=${dbContentType}`)


      const response = await fetch(url)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error de respuesta:', response.status, errorText)
        throw new Error(`Error al cargar contenido del día: ${response.status}`)
      }
      const data = await response.json()



      // Obtener solo el primer resultado (debería ser único)
      const dayContent = data.length > 0 ? data[0] : null

      setCurrentDayContent(dayContent)


      return dayContent
    } catch (error) {
      console.error('❌ Error cargando contenido del día:', error)
      setCurrentDayContent(null)
      return null
    } finally {
      setLoadingContent(false)
    }
  }

  // Función para confirmar eliminación de temática
  const handleDeleteTheme = (theme: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setThemeToDelete(theme)
    setShowDeleteConfirm(true)
  }

  // Función para ejecutar la eliminación después de confirmar
  const confirmDeleteTheme = async () => {
    if (!themeToDelete) return

    try {
      await deleteTheme(themeToDelete.id)
      setShowDeleteConfirm(false)
      setThemeToDelete(null)
      alert(`✅ Theme "${themeToDelete.themeName}" deleted successfully`)
    } catch (error) {
      console.error('Error deleting theme:', error)
      alert('❌ Error deleting theme')
    }
  }

  // Función para abrir modal de edición
  const handleEditTheme = (theme: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setThemeToEdit(theme)
    setThemeForm({
      themeName: theme.themeName,
      themeDescription: theme.themeDescription || '',
      startDate: theme.startDate,
      endDate: theme.endDate
    })
    setShowEditModal(true)
  }

  // Función para guardar cambios de edición
  const handleSaveEdit = async () => {
    if (!themeToEdit) return

    // Validar rango de fechas
    const validation = validateDateRange(themeForm.startDate, themeForm.endDate)
    if (!validation.valid) {
      alert(validation.message)
      return
    }

    // Detectar conflictos (excluyendo la temática actual)
    const conflicts = detectConflicts(themeForm.startDate, themeForm.endDate).filter(
      (t: any) => t.id !== themeToEdit.id // eslint-disable-line @typescript-eslint/no-explicit-any
    )
    if (conflicts.length > 0) {
      alert(`Another theme already exists in that date range: "${conflicts[0].themeName}"`)
      return
    }

    try {
      // Aquí deberías llamar a una función de actualización si existe
      // Por ahora, eliminamos y creamos de nuevo
      await deleteTheme(themeToEdit.id)
      await createTheme(themeForm)
      setShowEditModal(false)
      setThemeToEdit(null)
      setThemeForm({ themeName: '', themeDescription: '', startDate: '', endDate: '' })
      alert('✅ Theme updated successfully')
    } catch {
      alert('❌ Error updating theme')
    }
  }

  // Función para generar contenido del día específico
  const handleGenerateContent = async () => {

    if (!selectedTheme || !selectedTheme.dayContent || !selectedTheme.selectedDate) {
      console.error('❌ No hay temática o contenido del día seleccionado')
      return
    }

    const dateString = selectedTheme.selectedDate.toISOString()

    const loadedContent = await loadCurrentDayContent(
      selectedTheme.id,
      dateString,
      selectedTheme.dayContent.type
    )

    setIsGenerating(true)

    try {

      // Convertir hora sugerida a formato TIME (HH:MM:SS)
      const parseTimeTo24Hour = (timeString: string) => {
        if (!timeString) return '10:00:00'

        // Si ya está en formato 24 horas (HH:MM:SS), retornar
        if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
          return timeString
        }

        // Extraer hora y AM/PM
        const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
        if (!match) return '10:00:00'

        let hours = parseInt(match[1])
        const minutes = match[2]
        const period = match[3].toUpperCase()

        // Convertir a formato 24 horas
        if (period === 'PM' && hours !== 12) {
          hours += 12
        } else if (period === 'AM' && hours === 12) {
          hours = 0
        }

        return `${hours.toString().padStart(2, '0')}:${minutes}:00`
      }

      // Extraer AM/PM
      const extractPeriod = (timeString: string) => {
        if (!timeString) return 'AM'
        const match = timeString.match(/(AM|PM)/i)
        return match ? match[1].toUpperCase() : 'AM'
      }

      // Calcular día de la semana desde la fecha seleccionada en el calendario
      const getDayOfWeek = () => {
        if (selectedTheme.dayContent.dayOfWeek) {
          return selectedTheme.dayContent.dayOfWeek
        }
        // Si no existe, calcular desde la fecha seleccionada en el calendario
        const date = selectedTheme.selectedDate ? new Date(selectedTheme.selectedDate) : new Date(selectedTheme.startDate)
        const dayOfWeek = date.getDay() // 0=Domingo, 1=Lunes, ..., 6=Sábado
        // Convertir a formato 1=Lunes, 7=Domingo
        return dayOfWeek === 0 ? 7 : dayOfWeek
      }

      const dayOfWeekNumber = getDayOfWeek()

      // Formatear fecha a YYYY-MM-DD
      const formatDateToYYYYMMDD = (dateString: string | Date) => {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      // Usar la fecha del día seleccionado en el calendario, no la fecha de inicio de la temática
      const selectedDate = selectedTheme.selectedDate || selectedTheme.startDate

      const payload = {
        // ID del registro en content_generated (si existe)
        content_generated_id: loadedContent?.id || currentDayContent?.id || null,

        // Datos de la temática
        theme_id: selectedTheme.id,
        theme_name: selectedTheme.themeName,
        theme_description: selectedTheme.themeDescription || '',

        // Datos del contenido programado
        day_of_week: dayOfWeekNumber,
        content_type: selectedTheme.dayContent.type,
        duration: selectedTheme.dayContent.duration,

        // Datos de programación
        scheduled_date: formatDateToYYYYMMDD(selectedDate), // Fecha del día seleccionado en el calendario
        optimal_time_24h: parseTimeTo24Hour(selectedTheme.dayContent.suggestedTime || '10:00:00'), // Formato HH:MM:SS
        time_period: extractPeriod(selectedTheme.dayContent.suggestedTime || 'AM'), // AM o PM

        // Redes sociales (tomar la primera o todas)
        network_name: selectedTheme.dayContent.socialNetworks?.[0],

        // Secuencia de rotación
        rotation_sequence: 1,

        // Flags
        is_active: true
      }

      const response = await fetch(buildN8nWebhookUrl(config.webhooks.planificador), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()


      // Actualizar el contenido del día después de un breve delay
      setTimeout(async () => {
        if (selectedTheme.selectedDate) {
          const dateString = selectedTheme.selectedDate.toISOString()
          await loadCurrentDayContent(
            selectedTheme.id,
            dateString,
            selectedTheme.dayContent.type
          )
        }
      }, 2000)

      alert('✅ Content generation in progress! N8N workflow has been activated.')

    } catch (error) {
      console.error('❌ Error generando contenido:', error)
      alert(`❌ Error generating content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Manejar selección de evento (contenido diario)
  const handleSelectEvent = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any


    if (!event.resource || !event.resource.theme || !event.resource.dayContent) {
      console.error('❌ Error: Datos del evento incompletos')
      return
    }

    const selectedThemeData = {
      ...event.resource.theme,
      dayContent: event.resource.dayContent,
      dayKey: event.resource.dayKey,
      eventTitle: event.title,
      selectedDate: event.start // ← Fecha del día seleccionado en el calendario
    }


    setSelectedTheme(selectedThemeData)

    // Cargar contenido específico del día seleccionado
    if (selectedThemeData.id && selectedThemeData.dayContent && selectedThemeData.selectedDate) {
      // Convertir la fecha a formato ISO string
      const dateString = selectedThemeData.selectedDate.toISOString()

      loadCurrentDayContent(
        selectedThemeData.id,
        dateString,
        selectedThemeData.dayContent.type
      )
    }

  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar campos requeridos
    if (!themeForm.themeName || !themeForm.startDate || !themeForm.endDate) {
      alert('Please complete all required fields')
      return
    }

    // Validar rango de fechas
    const validation = validateDateRange(themeForm.startDate, themeForm.endDate)
    if (!validation.valid) {
      alert(validation.message)
      return
    }

    // Detectar conflictos
    const conflicts = detectConflicts(themeForm.startDate, themeForm.endDate)
    if (conflicts.length > 0) {
      alert(`A theme already exists in that date range: "${conflicts[0].themeName}"`)
      return
    }

    try {
      await createTheme(themeForm)
      setShowModal(false)
      setThemeForm({ themeName: '', themeDescription: '', startDate: '', endDate: '' })
      alert('Theme created successfully!')
    } catch (error) {
      alert('Error creating theme')
    }
  }

  // Obtener icono según el tipo de contenido
  const getContentIcon = (type: string) => {
    const icons = {
      video_person: '🎬',
      image_stats: '🖼️',
      video_avatar: '🎭',
      cta_post: '📢',
      manual: '✏️'
    }
    return icons[type as keyof typeof icons] || '📝'
  }

  // Función para detectar si un día es fin de semana
  const isWeekend = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6 // Domingo = 0, Sábado = 6
  }

  // Función para generar color consistente basado en el nombre de la temática
  const getThemeColor = (themeName: string) => {
    // Paleta de colores distintivos
    const colorPalette = [
      '#3B82F6', // Azul
      '#8B5CF6', // Morado
      '#F59E0B', // Amarillo
      '#10B981', // Verde
      '#EF4444', // Rojo
      '#06B6D4', // Cian
      '#F97316', // Naranja
      '#84CC16', // Lima
      '#EC4899', // Rosa
      '#6366F1'  // Índigo
    ]

    // Generar hash simple del nombre de la temática
    let hash = 0
    for (let i = 0; i < themeName.length; i++) {
      hash = ((hash << 5) - hash + themeName.charCodeAt(i)) & 0xffffffff
    }

    // Usar el hash para seleccionar un color de la paleta
    const colorIndex = Math.abs(hash) % colorPalette.length
    return colorPalette[colorIndex]
  }

  // Función para generar color más tenue (versión clara)
  const getLightThemeColor = (themeName: string) => {
    const baseColor = getThemeColor(themeName)

    // Mapear colores base a sus versiones claras
    const lightColorMap: { [key: string]: string } = {
      '#3B82F6': '#93C5FD', // Azul → Azul claro
      '#8B5CF6': '#C4B5FD', // Morado → Morado claro
      '#F59E0B': '#FCD34D', // Amarillo → Amarillo claro
      '#10B981': '#6EE7B7', // Verde → Verde claro
      '#EF4444': '#FCA5A5', // Rojo → Rojo claro
      '#06B6D4': '#67E8F9', // Cian → Cian claro
      '#F97316': '#FDBA74', // Naranja → Naranja claro
      '#84CC16': '#BEF264', // Lima → Lima claro
      '#EC4899': '#F9A8D4', // Rosa → Rosa claro
      '#6366F1': '#A5B4FC'  // Índigo → Índigo claro
    }

    return lightColorMap[baseColor] || '#D1D5DB' // Fallback a gris claro
  }

  // Obtener color del evento según la temática y día de la semana
  const getEventStyle = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const dayContent = event.resource?.dayContent
    const theme = event.resource?.theme
    const eventDate = new Date(event.start)
    const isWeekendDay = isWeekend(eventDate)

    if (!dayContent || !theme) {
      return {
        style: {
          backgroundColor: '#3B82F6',
          borderColor: '#3B82F6',
          borderRadius: '6px',
          opacity: isWeekendDay ? 0.6 : 0.9,
          color: isWeekendDay ? '#E5E7EB' : 'white',
          border: 'none',
          display: 'block',
          padding: '8px 12px',
          fontWeight: '600',
          fontSize: '13px',
          boxShadow: isWeekendDay ? '0 1px 2px rgba(0,0,0,0.05)' : '0 2px 4px rgba(0,0,0,0.1)'
        }
      }
    }

    // Obtener color basado en la temática
    const themeColor = isWeekendDay
      ? getLightThemeColor(theme.themeName)
      : getThemeColor(theme.themeName)

    return {
      style: {
        backgroundColor: themeColor,
        borderColor: themeColor,
        borderRadius: '6px',
        opacity: isWeekendDay ? 0.7 : 0.95,
        color: isWeekendDay ? '#F9FAFB' : 'white',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        fontWeight: '600',
        fontSize: '13px',
        boxShadow: isWeekendDay ? '0 1px 3px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.15)',
        minHeight: '36px',
        width: '100%'
      }
    }
  }

  // Componente personalizado para eventos con tooltip
  const EventComponent = ({ event }: { event: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const dayContent = event.resource?.dayContent
    const theme = event.resource?.theme

    if (!dayContent) {
      return (
        <div
          className="flex items-center space-x-1 p-1 text-white font-semibold text-xs cursor-pointer hover:opacity-90 transition-opacity"
          title={`${event.title} - ${theme?.themeName || 'Theme'}`}
        >
          <span>📝</span>
          <span className="truncate">{event.title}</span>
        </div>
      )
    }

    const icon = getContentIcon(dayContent.type)
    const tooltipText = `${dayContent.title}\nTheme: ${theme?.themeName}\nSchedule: ${dayContent.suggestedTime || 'All day'}\nDuration: ${dayContent.duration || 'N/A'}`

    return (
      <div
        className="flex items-center space-x-1 p-1 text-white font-semibold text-xs cursor-pointer hover:opacity-90 transition-opacity group relative"
        title={tooltipText}
      >
        <span className="text-sm">{icon}</span>
         {/* <span className="truncate">{dayContent.title}</span> */}

        {/* Tooltip mejorado */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-max">
          <div className="text-center">
            <div className="font-semibold">{dayContent.title}</div>
            <div className="text-gray-300 text-xs mt-1">{theme?.themeName}</div>
            <div className="text-gray-400 text-xs">{dayContent.suggestedTime || 'All day'}</div>
          </div>
          {/* Flecha del tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    )
  }

  // Componente personalizado para días con color de temática
  const CustomDateCell = ({ children, value, events, handleSelectEvent, ...props }: { children: any, value: Date, events: any[], handleSelectEvent: (event: any) => void, [key: string]: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const isWeekendDay = isWeekend(value)

    // Detectar si el día está fuera del mes actual
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const cellMonth = value.getMonth()
    const cellYear = value.getFullYear()
    const isOffRange = cellMonth !== currentMonth || cellYear !== currentYear

    // Buscar si este día tiene eventos y obtener su temática
    const dateString = value.toISOString().split('T')[0]
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0]
      return eventDate === dateString
    })


    // Determinar si tiene temática asociada
    const hasTheme = dayEvents.length > 0 && dayEvents[0].resource?.theme

    // Prioridad de color de fondo: Temática (siempre) > Otro mes (sin temática) > Fin de semana (sin temática) > Normal
    let finalBackgroundColor = 'transparent'
    let currentThemeColor = '#3B82F6' // Default theme color

    if (hasTheme) {
      const theme = dayEvents[0].resource.theme
      currentThemeColor = getThemeColor(theme.themeName)
    }

    if (hasTheme) {
      finalBackgroundColor = `${currentThemeColor}60` // Color de temática (prioridad máxima - siempre)
    } else if (isOffRange) {
      finalBackgroundColor = '#E5E7EB' // Color para días de otro mes (sin temática)
    } else if (isWeekendDay && !isOffRange) {
      finalBackgroundColor = '#F8FAFC' // Color para días de fin de semana del mes actual
    }

    const borderLeft = '2px solid transparent'
    const borderRight = '1px solid #E5E7EB' // Borde por defecto para días sin temática

    return (
      <div
        {...props}
        className={`rbc-date-cell custom-date-cell ${isWeekendDay && !isOffRange ? 'weekend-cell' : ''} ${hasTheme ? 'rbc-themed-cell' : ''} ${isOffRange ? 'rbc-off-range' : ''}`}
        style={{
          backgroundColor: finalBackgroundColor,
          color: hasTheme ? '#1f2937' : undefined, // Color más oscuro para números de días con temática (sin importar si es off-range)
          transition: 'all 0.2s ease',
          cursor: hasTheme ? 'pointer' : 'default'
        }}

        onClick={(e) => {

          e.stopPropagation() // Evita que el evento se propague a elementos padre del calendario
          if (hasTheme && dayEvents.length > 0) {

            // Abre el popup con la información del primer evento del día
            handleSelectEvent(dayEvents[0])
          }
        }}
      >
        {children}

        {/* Renderizar eventos manualmente en la vista de mes */}
        {dayEvents.length > 0 && (
          <div className="absolute top-1 z-10">
            {dayEvents.map((event, index) => {
              const dayContent = event.resource?.dayContent
              if (!dayContent) return null

              const icon = getContentIcon(dayContent.type)
              const themeColor = hasTheme ? getThemeColor(dayEvents[0].resource.theme.themeName) : '#3B82F6'

              // Verificar si este día tiene contenido generado (usando fecha específica)
              const eventDate = event.start.toISOString().split('T')[0] // Formato YYYY-MM-DD
              const contentGenerated = hasGeneratedContent(
                event.resource.theme.id,
                eventDate,
                dayContent.type
              )

              return (
                <div
                  key={`manual-event-${event.id}`}
                  className="text-xs p-1 rounded text-white font-medium relative"
                  style={{
                    fontSize: '10px',
                    lineHeight: '1.2',
                    minHeight: '16px'
                  }}
                  // onClick eliminado - ahora el click se maneja en la celda completa
                >
                  <span className="text-xl">{icon}</span>
                  {/* Badge verde si tiene contenido generado */}
                  {contentGenerated && (
                    <span
                      className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold"
                      title="Content generated"
                    >
                      ✓
                    </span>
                  )}
                 {/* <span className="truncate">{dayContent.title}</span> */}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Generar eventos para el calendario
  const events = generateCalendarEvents(themes)


  // ✅ Mostrar error si existe
  if (error) {
    console.error('❌ Error en planificador:', error)
  }

  // ✅ Solo renderizar contenido cuando esté completamente hidratado
  if (!isHydrated || !isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Initializing application...</div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading planner...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-row gap-2 mb-4 justify-between">
          {/* TITULOS Y DESCRIPCION*/}
           <div className="gap-2">
             <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📅 Theme Planner
             </h1>
             <p className="block text-sm font-medium text-gray-700">
            Plan your thematic content with automatic weekly distribution
             </p>
          </div>
          {/* Botones de N8N */}
          <div className="flex items-center justify-between">
          {/* Button to create theme */}
           <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Create new theme" >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus w-5 h-5 mr-2"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
              New Theme
           </button>

          </div>
        </div>

        {/* Controles del planificador */}
        <div className="mb-6">
          {/* Quick planner statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Active Themes Card - Collapsible */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg overflow-hidden">
            {/* Header clickeable */}
            <button onClick={() => setShowThemesList(!showThemesList)}
              className="w-full px-3 pt-2 pb-2 flex items-center justify-between gap-2 hover:bg-blue-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-blue-100 text-xs">Active Themes</p>
                  <p className="text-2xl font-bold text-left">{themes.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-blue-200 text-2xl">🎯</div>

                {/* Message when no themes */}
                {themes.length > 0 && (
                <span className="text-blue-200 text-xl transition-transform duration-200" style={{ transform: showThemesList ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
                )}
              </div>
            </button>

            {/* Themes list (expandable) */}
            {showThemesList && themes.length > 0 && (
              <div className="px-2 pb-3 space-y-2 max-h-[500px] overflow-y-auto">
                {themes.map((theme) => {
                  const themeEvents = events.filter((e: any) => e.resource?.theme?.id === theme.id) // eslint-disable-line @typescript-eslint/no-explicit-any

                  return (
                    <div
                      key={theme.id}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20 hover:bg-white/20 transition-colors"
                    >
                      {/* Theme name */}
                      <h3 className="text-white font-semibold text-sm mb-2 line-clamp-1">
                        {theme.themeName}
                      </h3>

                      {/* Dates */}
                      <div className="flex items-center gap-2 text-xs text-blue-100 mb-2">
                        <span>📅</span>
                        <span>
                          {adjustToBusinessDay(new Date(theme.startDate), true).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - {' '}
                          {adjustToBusinessDay(new Date(theme.endDate), false).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2 border-t border-white/20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditTheme(theme)
                          }}
                          className="flex-1 p-1 bg-white/20 text-white rounded hover:bg-white/30 transition-colors text-xs font-medium"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTheme(theme)
                          }}
                          className="flex-1 p-1 bg-red-500/30 text-white rounded hover:bg-red-500/40 transition-colors text-xs font-medium"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg px-3 pt-2 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-purple-100 text-xs">Scheduled Events</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <div className="text-purple-200 text-2xl">📅</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg px-3 pt-2 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-green-100 text-xs">Days with Content</p>
                <p className="text-2xl font-bold">{new Set(events.map(e => e.start.toDateString())).size}</p>
              </div>
              <div className="text-green-200 text-2xl">📊</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg px-3 pt-2 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-orange-100 text-xs">Next Event</p>
                <p className="text-lg font-bold">
                  {events.length > 0 ? new Date(events[0].start).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                </p>
              </div>
              <div className="text-orange-200 text-2xl">⏰</div>
            </div>
          </div>
          </div>
        </div>

        {/* Message when no events */}
        {events.length === 0 && themes.length === 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-3xl">💡</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Welcome to the Planner!
                </h3>
                <p className="text-yellow-800 mb-3">
                  You don&apos;t have themes created yet. To get started:
                </p>
                <ol className="list-decimal list-inside text-yellow-800 space-y-1 mb-3">
                  <li>Click the <strong>&quot;➕ New Theme&quot;</strong> button above</li>
                  <li>Or select a date range directly in the calendar</li>
                  <li>Events will be generated automatically according to the weekly template</li>
                </ol>
                <div className="bg-yellow-100 p-3 rounded border border-yellow-300 mt-3">
                  <p className="text-sm text-yellow-900">
                    <strong>📋 Automatic weekly template:</strong>
                  </p>
                  <ul className="text-xs text-yellow-800 mt-2 space-y-1">
                    <li>🎬 <strong>Monday:</strong> Video with realistic person</li>
                    <li>🖼️ <strong>Tuesday:</strong> Image with statistics</li>
                    <li>🎨 <strong>Wednesday:</strong> Video with animated avatar</li>
                    <li>📢 <strong>Thursday:</strong> Post with CTA</li>
                    <li>✏️ <strong>Friday:</strong> Manual content</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendario */}
        <div className="bg-white rounded-lg shadow-lg p-6">
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Estilos para días fuera del mes actual - más oscuros para diferenciación */
            .rbc-month-view .rbc-date-cell.rbc-off-range-bg {
              background-color: #E5E7EB !important;
              color: #9CA3AF !important;
            }

            .rbc-month-view .rbc-date-cell.rbc-today.rbc-off-range-bg {
              background-color: #D1D5DB !important;
              color: #6B7280 !important;
            }

            /* Estilos adicionales con mayor especificidad */
            .rbc-month-view .rbc-date-cell.rbc-off-range {
              background-color: #E5E7EB !important;
              color: #9CA3AF !important;
            }

            .rbc-month-view .rbc-date-cell.rbc-off-range .rbc-date {
              color: #9CA3AF !important;
            }

            /* Forzar estilos para días fuera de rango */
            .rbc-month-view .rbc-date-cell[class*="rbc-off-range"] {
              background-color: #E5E7EB !important;
              color: #9CA3AF !important;
            }

            /* Estilos más específicos para días fuera de rango */
            .rbc-month-view .rbc-date-cell.rbc-off-range-bg,
            .rbc-month-view .rbc-date-cell.rbc-off-range,
            .rbc-month-view .rbc-date-cell.rbc-off-range-bg .rbc-date,
            .rbc-month-view .rbc-date-cell.rbc-off-range .rbc-date {
              background-color: #E5E7EB !important;
              color: #9CA3AF !important;
            }

            /* Estilos para el contenedor del calendario */
            .rbc-month-view .rbc-date-cell {
              position: relative;
              color: #000000c7;
            }

            /* Forzar estilos con máxima especificidad */
            div.rbc-month-view div.rbc-date-cell.rbc-off-range-bg,
            div.rbc-month-view div.rbc-date-cell.rbc-off-range {
              background-color: #E5E7EB !important;
              color: #9CA3AF !important;
            }

            /* Estilos para títulos del calendario */
            .rbc-toolbar-label {
              color: #373a3c !important;
              font-weight: 600 !important;
            }

            .rbc-header {
              color: #373a3c !important;
              font-weight: 500 !important;
            }

            /* Estilos para el botón del número del día con temática */
            .rbc-themed-cell .rbc-button-link {
              color: #1f2937 !important;
              font-weight: 600 !important;
            }

            /* Mejorar visualización de celdas con temática - SOLO nuestras celdas personalizadas */
            .rbc-month-view .rbc-date-cell.custom-date-cell {
              position: relative;
              min-height: 100px;
              border-left: 1px solid rgba(0, 0, 0, .1);

            }

            /* Día de hoy con borde destacado */
            .rbc-month-view .rbc-today {
              background-color: transparent !important;
            }

            /* OCULTAR EL SEGUNDO rbc-row (eventos automáticos) */
            .rbc-month-view .rbc-row-content > .rbc-row:not(:first-child) {
              display: none !important;
            }

            /* Asegurar que solo se muestren nuestros eventos manuales */
            .rbc-month-view .rbc-event {
              display: none !important;
            }

            /* Estilos específicos para celdas de fin de semana */
            .rbc-month-view .rbc-date-cell.weekend-cell {
              background-color: var(--foreground) !important;
              opacity: 0.7 !important;
            }

            .rbc-month-view .rbc-date-cell.weekend-cell:hover {
              background-color: #F1F5F9 !important;
              opacity: 0.8 !important;
            }

            .rbc-month-view .rbc-date-cell.weekend-cell .rbc-button-link {
              color: #64748B !important;
              font-weight: normal !important;
            }

            /* Estilos para celdas con temática */
            .rbc-month-view .rbc-date-cell.rbc-themed-cell {
              border-radius: 4px !important;
              border-left: none !important;
              border-right: none !important;
              z-index: 48;
              /* El backgroundColor se maneja via style inline */
            }

            .rbc-month-view .rbc-date-cell.rbc-themed-cell:hover {
              opacity: 0.8 !important;
              transform: scale(1.02) !important;
            }

            .rbc-month-view .rbc-date-cell.rbc-themed-cell .rbc-button-link {
              color: #1E40AF !important;
              font-weight: 600 !important;
            }

            .rbc-month-view .rbc-today .rbc-button-link {
              background-color: #3B82F6 !important;
              color: white !important;
              border-radius: 50%;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 600;
            }

            /* Headers de fin de semana en vista de semana */
            .rbc-time-view .rbc-header:nth-child(6),
            .rbc-time-view .rbc-header:nth-child(7) {
              background-color: #F8FAFC !important;
              color: #64748B !important;
              font-weight: 500 !important;
            }

            /* Celdas de fin de semana en vista de semana */
            .rbc-time-view .rbc-timeslot-group:nth-child(6),
            .rbc-time-view .rbc-timeslot-group:nth-child(7) {
              background-color: #F8FAFC !important;
            }

            /* Transiciones suaves para hover - SOLO nuestras celdas personalizadas */
            .rbc-month-view .rbc-date-cell.custom-date-cell:hover {
              opacity: 0.95;
              transform: scale(1.01);
            }

            /* FORZAR VISUALIZACIÓN DE EVENTOS EN VISTA DE MES */
            .rbc-month-view .rbc-event {
              position: relative !important;
              z-index: 10 !important;
              opacity: 1 !important;
              visibility: visible !important;
              display: block !important;
              min-height: 18px !important;
              margin: 1px 0 !important;
              border-radius: 3px !important;
              font-size: 11px !important;
              line-height: 1.1 !important;
              padding: 1px 3px !important;
              background-color: rgba(59, 130, 246, 0.9) !important;
              color: white !important;
              border: none !important;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
            }

            .rbc-month-view .rbc-event:hover {
              opacity: 0.95 !important;
              transform: scale(1.02) !important;
              z-index: 15 !important;
            }

            /* Asegurar que los eventos se muestren en la parte superior - SOLO nuestras celdas */
            .rbc-month-view .rbc-date-cell.custom-date-cell .rbc-event {
              position: absolute !important;
              top: 2px !important;
              left: 2px !important;
              right: 2px !important;
              width: calc(100% - 4px) !important;
            }

          `
        }} />
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          views={['month', 'week', 'day']}
          view={currentView}
          date={currentDate}
          components={{
            toolbar: (props: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              const handleNavigate = (action: string) => {
                if (props.onNavigate) {
                  props.onNavigate(action);
                }
              };

              return (
                <div className="rbc-toolbar">
                  <span className="rbc-btn-group">
                    <button
                      type="button"
                      className="rbc-btn rbc-btn-today"
                      onClick={() => handleNavigate('TODAY')}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="rbc-btn rbc-btn-prev"
                      onClick={() => handleNavigate('PREV')}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="rbc-btn rbc-btn-next"
                      onClick={() => handleNavigate('NEXT')}
                    >
                      Next
                    </button>
                  </span>
                  <span className="rbc-toolbar-label">{props.label}</span>
                </div>
              );
            },
            event: EventComponent,
            dateCellWrapper: (props: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <CustomDateCell
                {...props}
                events={events}
                handleSelectEvent={handleSelectEvent}
              />
            )
          }}
          // onSelectEvent={handleSelectEvent} // Deshabilitado para usar click en celda completa
          selectable={false}
          eventPropGetter={getEventStyle}
          popup
          popupOffset={{ x: 10, y: 10 }}
          showMultiDayTimes={false}
          onNavigate={(newDate: Date) => {

            setCurrentDate(newDate)
          }}
          onView={(newView: string) => {

            setCurrentView(newView)
          }}
          messages={{
            next: 'Next',
            previous: 'Previous',
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            agenda: 'Agenda',
            date: 'Date',
            time: 'Time',
            event: 'Event',
            noEventsInRange: 'No events in this range',
            showMore: (total: any) => `+ See more (${total})`   // eslint-disable-line @typescript-eslint/no-explicit-any
          }}
        />
        </div>

        {/* Modal de creación de temática */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mt-8">
              <div className="border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    🎯 New Theme
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Nombre de la temática */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Name *
                  </label>
                  <input
                    type="text"
                    value={themeForm.themeName}
                    onChange={(e) => setThemeForm({ ...themeForm, themeName: e.target.value })}
                    className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Seguro de Vida"
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={themeForm.themeDescription}
                    onChange={(e) => setThemeForm({ ...themeForm, themeDescription: e.target.value })}
                    rows={3}
                    className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe la temática..."
                  />
                </div>

                {/* Fecha de inicio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={themeForm.startDate}
                    onChange={(e) => setThemeForm({ ...themeForm, startDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Fecha de fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={themeForm.endDate}
                    onChange={(e) => setThemeForm({ ...themeForm, endDate: e.target.value })}
                    min={themeForm.startDate || new Date().toISOString().split('T')[0]}
                    className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Información de la plantilla */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    📋 Automatic Weekly Template
                  </h3>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• <strong>Monday:</strong> 24s video with realistic person</li>
                    <li>• <strong>Tuesday:</strong> Image with statistics</li>
                    <li>• <strong>Wednesday:</strong> 24s video with Pixar avatar</li>
                    <li>• <strong>Thursday:</strong> Post with CTA</li>
                    <li>• <strong>Friday:</strong> Manual content</li>
                    <li>• <strong>Weekend:</strong> Free</li>
                  </ul>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    📅 Create Theme
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de detalles de contenido diario */}
        {selectedTheme && (() => {

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mt-8">
              <div className="border-b border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedTheme.dayContent ? (
                        <>
                          {selectedTheme.dayContent.type === 'video_person' && '🎬'}
                          {selectedTheme.dayContent.type === 'image_stats' && '🖼️'}
                          {selectedTheme.dayContent.type === 'video_avatar' && '🎭'}
                          {selectedTheme.dayContent.type === 'cta_post' && '📢'}
                          {selectedTheme.dayContent.type === 'content_manual' && '✏️'}
                          {' '}{selectedTheme.dayContent.title}
                        </>
                      ) : (
                        `🎯 ${selectedTheme.themeName}`
                      )}
                    </h2>

                  </div>
                  <button
                    onClick={() => setSelectedTheme(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="px-8 pb-8 space-y-4">
                {selectedTheme.dayContent ? (
                  // Mostrar detalles del contenido diario
                  <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 hidden">
                    <div
                      className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowContentStatus(!showContentStatus)}
                    >
                      <div className="flex items-center">
                        <span className="text-blue-900 mr-2">📋</span>
                        <h3 className="text-lg font-semibold text-blue-900">Content Details</h3>
                      </div>
                      <span className="text-blue-900 text-xl transition-transform duration-200" style={{
                        transform: showContentStatus ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}>
                        ▼
                      </span>
                    </div>

                    {/* Contenido colapsable */}
                    <div
                      className={`transition-all duration-300 overflow-hidden ${
                        showContentStatus ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Theme</p>
                          <p className="text-gray-700 font-medium">{selectedTheme.themeName}</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Content Type</p>
                          <p className="text-gray-700 font-medium">{selectedTheme.dayContent.title}</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                          <p className="text-gray-700">{selectedTheme.dayContent.description}</p>
                        </div>

                        {selectedTheme.dayContent.suggestedTime && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Suggested Schedule</p>
                          <p className="text-gray-700">{selectedTheme.dayContent.suggestedTime}</p>
                        </div>
                        )}

                        {selectedTheme.dayContent.duration && (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Duration</p>
                            <p className="text-gray-700">{selectedTheme.dayContent.duration} seconds</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                    {/* 📊 VISTA PREVIA DINÁMICA - UN SOLO DIV */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Eye className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {currentDayContent && currentDayContent.file_path ? 'Preview' : 'Content Status'}
                        </h3>
                        {loadingContent && <span className="ml-2 text-sm text-blue-600">Verifying...</span>}
                      </div>

                      <div className="space-y-4">
                        {loadingContent ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Verifying content...</span>
                          </div>
                        ) : currentDayContent && currentDayContent.file_path ? (
                          // SI HAY ARCHIVO: Mostrar reproductor de video/imagen según file_type
                          <div className="bg-white rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="text-2xl">{getContentIcon(selectedTheme.dayContent.type)}</div>
                              <h3 className="font-semibold text-blue-900">
                                {isVideoFile(currentDayContent.file_path, currentDayContent.file_type) ? 'Video Generated' : 'Image Generated'}
                              </h3>
                              <span className={`text-xs px-2 py-1 rounded ${
                                currentDayContent.status === 'completed' ? 'bg-green-100 text-green-800' :
                                currentDayContent.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                                currentDayContent.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {currentDayContent.status || 'Unknown'}
                              </span>
                            </div>
                            <div className="bg-gray-50 rounded-lg py-6 px-9">
                              {/* Renderizar video o imagen según file_type */}
                              {(() => {
                                const videoUrl = `${config.api.google}/uploads/${currentDayContent.file_path}`
                                const mimeType = currentDayContent.file_type?.startsWith('video/')
                                  ? currentDayContent.file_type
                                  : `video/${currentDayContent.file_type || 'mp4'}`


                                return null
                              })()}
                              {isVideoFile(currentDayContent.file_path, currentDayContent.file_type) ? (
                                <video
                                  controls
                                  className="w-full max-h-96 rounded-lg"
                                  preload="metadata"
                                  onError={(e) => {
                                    console.error('❌ Video Error:', {
                                      error: e,
                                      currentTarget: e.currentTarget,
                                      networkState: e.currentTarget.networkState,
                                      readyState: e.currentTarget.readyState,
                                      src: e.currentTarget.currentSrc
                                    })
                                  }}
                                  onLoadedMetadata={(e) => {

                                  }}
                                >
                                  <source
                                    src={`${config.api.google}/uploads/${currentDayContent.file_path}`}
                                    type={currentDayContent.file_type?.startsWith('video/') ? currentDayContent.file_type : `video/${currentDayContent.file_type || 'mp4'}`}
                                  />
                                  Your browser does not support video playback.
                                </video>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`${config.api.google}/uploads/${currentDayContent.file_path}`}
                                  alt="Generated content"
                                  className="w-full max-h-96 object-contain rounded-lg"
                                />
                              )}
                              <div className="mt-4 text-sm space-y-3">
                                {/* Caption */}
                                {currentDayContent.caption && (
                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="font-semibold text-gray-700 mb-1">Caption:</p>
                                    <p className="text-gray-600 italic">{currentDayContent.caption}</p>
                                  </div>
                                )}

                                {/* Hashtags */}
                                {currentDayContent.hashtags && currentDayContent.hashtags.length > 0 && (
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="font-semibold text-gray-700 mb-2">Hashtags:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {currentDayContent.hashtags.map((tag, index) => (
                                        <span
                                          key={index}
                                          className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {/* <p><strong>File:</strong> {currentDayContent.file_path}</p>
                                <p><strong>Type:</strong> {currentDayContent.file_type || 'Unknown'}</p>
                                <p><strong>Status:</strong> {currentDayContent.status}</p>
                                {currentDayContent.created_at && (
                                  <p><strong>Created:</strong> {new Date(currentDayContent.created_at).toLocaleString()}</p>
                                )}
                                {currentDayContent.published_at && (
                                  <p><strong>Published:</strong> {new Date(currentDayContent.published_at).toLocaleString()}</p>
                                )}
                                  */}
                                <p><button
                                onClick={handleGenerateContent}
                                disabled={isGenerating}
                                className={`px-6 py-2 rounded-lg transition-colors ${
                                  isGenerating
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                } text-white`}
                              >
                                {isGenerating ? (
                                  <>
                                    <span className="inline-block animate-spin mr-2">⏳</span>
                                    Generating...
                                  </>
                                ) : (
                                  <> 🔄 ReGenerate Content</>
                                )}
                              </button></p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // SI NO HAY ARCHIVO O currentDayContent es null: Mostrar solo Vista Previa conceptual + Botón Generar
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                            {selectedTheme.dayContent.type === 'video_person' && (
                              <div className="text-center">
                                <div className="text-4xl mb-2">🎬</div>
                                <h3 className="font-semibold text-blue-900 mb-2">Video with Realistic Person</h3>
                                <p className="text-blue-700 text-sm mb-3">24 seconds duration</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">👤</div>
                                    <span className="text-sm font-medium text-gray-700">Professional person</span>
                                  </div>
                                  <p className="text-xs text-gray-600">Speaking about {selectedTheme.themeName} with credibility and trust</p>
                                </div>
                              </div>
                            )}

                            {selectedTheme.dayContent.type === 'image_stats' && (
                              <div className="text-center">
                                <div className="text-4xl mb-2">📊</div>
                                <h3 className="font-semibold text-green-900 mb-2">Image with Statistics</h3>
                                <p className="text-green-700 text-sm mb-3">Relevant and visual data</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="bg-blue-100 p-2 rounded text-center">
                                      <div className="text-lg font-bold text-blue-700">85%</div>
                                      <div className="text-xs text-blue-600">Satisfaction</div>
                                    </div>
                                    <div className="bg-green-100 p-2 rounded text-center">
                                      <div className="text-lg font-bold text-green-700">+40%</div>
                                      <div className="text-xs text-green-600">Coverage</div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600">Statistics about {selectedTheme.themeName}</p>
                                </div>
                              </div>
                            )}

                            {selectedTheme.dayContent.type === 'video_avatar' && (
                              <div className="text-center">
                                <div className="text-4xl mb-2">🎭</div>
                                <h3 className="font-semibold text-purple-900 mb-2">Animated Avatar Video</h3>
                                <p className="text-purple-700 text-sm mb-3">Pixar style - 24 seconds</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">🤖</div>
                                    <span className="text-sm font-medium">Animated avatar</span>
                                  </div>
                                  <p className="text-xs text-gray-600">Creative explanation about {selectedTheme.themeName}</p>
                                  <div className="mt-2 flex space-x-1">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                    <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedTheme.dayContent.type === 'cta_post' && (
                              <div className="text-center">
                                <div className="text-4xl mb-2">📢</div>
                                <h3 className="font-semibold text-orange-900 mb-2">Post with Call to Action</h3>
                                <p className="text-orange-700 text-sm mb-3">Direct call to action</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <p className="text-sm font-medium mb-2 text-gray-600">Do you need {selectedTheme.themeName}?</p>
                                  <p className="text-xs text-gray-600 mb-3">Protect your future today</p>
                                  <div className="bg-orange-500 text-white px-4 py-2 rounded-lg text-center text-sm font-medium">
                                    📞 Contact Now
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedTheme.dayContent.type === 'content_manual' && (
                              <div className="text-center">
                                <div className="text-4xl mb-2">✏️</div>
                                <h3 className="font-semibold text-gray-900 mb-2">Manual Content</h3>
                                <p className="text-gray-700 text-sm mb-3">Customizable according to need</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                    <div className="text-2xl mb-2">📝</div>
                                    <p className="text-sm text-gray-500">Content to be defined</p>
                                    <p className="text-xs text-gray-400 mt-1">Theme: {selectedTheme.themeName}</p>
                                  </div>
                                </div>
                              </div>
                            )}


                            {/* Botón Generar integrado */}
                            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                <span className="font-medium text-yellow-800">No File</span>
                              </div>
                              <p className="text-sm text-yellow-700 mb-4">
                                This content has not been generated yet. Click the button to start generation.
                              </p>
                              <button
                                onClick={handleGenerateContent}
                                disabled={isGenerating}
                                className={`px-6 py-2 rounded-lg transition-colors ${
                                  isGenerating
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                } text-white`}
                              >
                                {isGenerating ? (
                                  <>
                                    <span className="inline-block animate-spin mr-2">⏳</span>
                                    Generating...
                                  </>
                                ) : (
                                  <>🚀 Generate Content</>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          <p><strong>ℹ️ Information:</strong> {currentDayContent && currentDayContent.file_path ? 'Preview of generated content.' : 'The system automatically validates if generated content exists for the selected day.'}</p>
                        </div>
                      </div>
                    </div>
                     </>
                ) : (
                  // Mostrar detalles de la temática completa
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Período</p>
                      <p className="text-gray-700">
                        📅 {moment(adjustToBusinessDay(new Date(selectedTheme.startDate), true)).format('DD MMMM YYYY')} - {moment(adjustToBusinessDay(new Date(selectedTheme.endDate), false)).format('DD MMMM YYYY')}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Duration</p>
                      <p className="text-gray-700">
                        {Math.ceil((new Date(selectedTheme.endDate).getTime() - new Date(selectedTheme.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        )
        })()}

        {/* Información sobre diferenciación de días y colores por temática */}
        {userRole !== 'user' && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-2">
          <div
            className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowTips(!showTips)}
          >
            <div className="flex items-center">
              <span className="text-blue-900 mr-2">🎨</span>
              <h3 className="text-lg font-semibold text-blue-900">Smart Color System</h3>
            </div>
            <span className="text-blue-900 text-xl transition-transform duration-200" style={{
              transform: showTips ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>

          {/* Contenido colapsable */}
          <div
            className={`transition-all duration-300 overflow-hidden ${
              showTips ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {/* Diferenciación por días */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <div>
                <p className="text-sm font-medium text-gray-700">Business Days (Mon-Fri)</p>
                <p className="text-xs text-gray-600">Intense colors and highlighted events</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-gray-300 rounded opacity-70"></div>
              <div>
                <p className="text-sm font-medium text-gray-700">Weekends (Sat-Sun)</p>
                <p className="text-xs text-gray-600">Soft colors and light gray background</p>
              </div>
            </div>
          </div>

          {/* Colores por temática */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🎯 Colors by Theme</h4>
            <div className="grid grid-cols-5 gap-2">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-blue-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Blue</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-purple-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Purple</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-yellow-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Yellow</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-green-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Green</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-red-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Red</span>
              </div>
            </div>
          </div>

            <div className="mt-3 p-3 bg-white rounded border border-blue-100">
              <p className="text-xs text-gray-600">
                <span className="font-medium">🎨 Smart System:</span> Each theme has a unique and consistent color. Weekends show softer versions of the same colors to facilitate visual identification.
              </p>
            </div>
          </div>
        </div>
        )}

        {/* Tabla de Estrategia de Redes Sociales */}
        {userRole !== 'user' && (
        <div className="mt-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-2">
          <div
            className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowWeeklyStrategy(!showWeeklyStrategy)}
          >
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-1">
                📱 Weekly Strategy: Content × Schedule × Social Media
              </h3>
            </div>
            <span className="text-purple-900 text-xl transition-transform duration-200" style={{
              transform: showWeeklyStrategy ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>

          {/* Contenido colapsable */}
          <div
            className={`max-w-7xl mx-auto transition-all duration-300 overflow-hidden ${
              showWeeklyStrategy ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="overflow-x-auto">
              <p className="text-purple-700 text-sm mb-4">
                Table optimized for the insurance industry based on engagement studies
              </p>
            <table className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Day</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Content Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Schedule</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Recommended Networks</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">🌅 Monday</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>🎬</span>
                      <span>Video with Real Person</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">10:00 AM</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">Facebook</span>
                      <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-medium">Instagram Reels</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">Builds trust. Facebook for mature audience.</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">📊 Tuesday</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>📈</span>
                      <span>Image with Statistics</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">11:00 AM</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-blue-800 text-white px-2 py-1 rounded text-xs font-medium">LinkedIn</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">Facebook</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">Best day for B2B engagement and professional data.</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">🎭 Wednesday</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>🎨</span>
                      <span>Animated Avatar Video</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">1:00 PM</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-medium">Instagram Reels</span>
                      <span className="bg-black text-white px-2 py-1 rounded text-xs font-medium">TikTok</span>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">YouTube Shorts</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">Creative content during lunch hour.</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">💼 Thursday</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>📢</span>
                      <span>Post with CTA</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">11:30 AM</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-blue-800 text-white px-2 py-1 rounded text-xs font-medium">LinkedIn</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">Facebook</span>
                      <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-medium">Instagram</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">Best day for conversions and decisions.</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">🎉 Friday</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>✏️</span>
                      <span>Manual Content</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">10:00 AM</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-medium">Instagram</span>
                      <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded text-xs font-medium">Twitter/X</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">Facebook</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">Casual engagement before the weekend.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-white rounded-lg p-4 border border-purple-100">
            <h4 className="font-semibold text-purple-800 mb-2">🎯 Specific Tips for Insurance:</h4>
            <ul className="text-purple-700 space-y-1 text-sm">
              <li>✅ <strong>Best days:</strong> Tuesday and Thursday (financial decision hours)</li>
              <li>✅ <strong>Ideal schedule:</strong> 10:00 AM - 12:00 PM (when people think about finances)</li>
              <li>✅ <strong>Videos:</strong> Work better in mornings (higher attention)</li>
              <li>✅ <strong>CTAs:</strong> Thursday 11:30 AM has the best conversion rate</li>
              <li>❌ <strong>Avoid:</strong> Weekends (lower engagement for financial services)</li>
            </ul>
          </div>

            <p className="text-purple-600 text-sm mt-3 italic">
              💡 Click on any calendar event to see specific social media recommendations and strategy.
            </p>
          </div>
        </div>
        )}

        {/* Información adicional - Colapsable */}
        {userRole !== 'user' && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowHelpCollapsed(!showHelpCollapsed)}
            className="w-full p-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
          >
            <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              <span>💡</span>
              <span>How to use the Planner</span>
            </h3>
            <span className="text-blue-600 text-xl transition-transform duration-200" style={{ transform: showHelpCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
              ▼
            </span>
          </button>

          {!showHelpCollapsed && (
            <div className="px-3 pb-3">
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Select a date range in the calendar to create a new theme</li>
                <li>Each theme automatically applies a weekly content template</li>
                <li>The minimum range is 1 week and the maximum is 3 months</li>
                <li>Themes cannot overlap on the same dates</li>
                <li>Use the &quot;Edit&quot; and &quot;Delete&quot; buttons on each theme to manage them</li>
              </ul>
            </div>
          )}
        </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🗑️</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Confirm Deletion
                  </h2>
                </div>

                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete the theme <strong>&quot;{themeToDelete?.themeName}&quot;</strong>?
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">
                    ⚠️ This action cannot be undone. All events associated with this theme will be deleted.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setThemeToDelete(null)
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteTheme}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de edición de temática */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
              <div className="border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    ✏️ Edit Theme
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setThemeToEdit(null)
                      setThemeForm({ themeName: '', themeDescription: '', startDate: '', endDate: '' })
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="p-6 space-y-4">
                {/* Nombre de la temática */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Name *
                  </label>
                  <input
                    type="text"
                    value={themeForm.themeName}
                    onChange={(e) => setThemeForm({ ...themeForm, themeName: e.target.value })}
                    className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Seguro de Vida"
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={themeForm.themeDescription}
                    onChange={(e) => setThemeForm({ ...themeForm, themeDescription: e.target.value })}
                    className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe el objetivo de esta temática..."
                  />
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={themeForm.startDate}
                      onChange={(e) => setThemeForm({ ...themeForm, startDate: e.target.value })}
                      className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={themeForm.endDate}
                      onChange={(e) => setThemeForm({ ...themeForm, endDate: e.target.value })}
                      className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setThemeToEdit(null)
                      setThemeForm({ themeName: '', themeDescription: '', startDate: '', endDate: '' })
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
