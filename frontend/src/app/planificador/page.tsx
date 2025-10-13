'use client'

import {
  AlertCircle,
  Eye
} from 'lucide-react';
import moment from 'moment';
import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useThemes } from '../../hooks/use-themes';

// Configurar moment en español
moment.locale('es', {
  months: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  weekdays: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  weekdaysShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
})

const localizer = momentLocalizer(moment)

export default function PlanificadorPage() {
  const [showModal, setShowModal] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<any>(null)
  const [showN8nLogs, setShowN8nLogs] = useState(false)
  const [n8nLogs, setN8nLogs] = useState<any[]>([])
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [showWeeklyStrategy, setShowWeeklyStrategy] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [showContentStatus, setShowContentStatus] = useState(false)
  const [currentDayContent, setCurrentDayContent] = useState<any>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [themeForm, setThemeForm] = useState({
    themeName: '',
    themeDescription: '',
    startDate: '',
    endDate: ''
  })

  const {
    themes,
    loading,
    error,
    createTheme,
    deleteTheme,
    validateDateRange,
    detectConflicts,
    generateCalendarEvents
  } = useThemes()

  // Manejar selección de slot (rango de fechas)
  const handleSelectSlot = ({ start, end }: any) => {
    setThemeForm({
      themeName: '',
      themeDescription: '',
      startDate: moment(start).format('YYYY-MM-DD'),
      endDate: moment(end).format('YYYY-MM-DD')
    })
    setShowModal(true)
  }

  // Cargar contenido específico del día seleccionado
  const loadCurrentDayContent = async (themeId: string, dayOfWeek: number, contentType: string) => {
    setLoadingContent(true)
    try {
      const response = await fetch(`http://localhost:8001/api/v1/content-generated/?theme_id=${themeId}&day_of_week=${dayOfWeek}&content_type=${contentType}`)
      if (!response.ok) {
        throw new Error('Error al cargar contenido del día')
      }
      const data = await response.json()
      // Obtener solo el primer resultado (debería ser único)
      const dayContent = data.length > 0 ? data[0] : null
      setCurrentDayContent(dayContent)
      console.log('📊 Contenido del día cargado:', dayContent)
    } catch (error) {
      console.error('❌ Error cargando contenido del día:', error)
      setCurrentDayContent(null)
    } finally {
      setLoadingContent(false)
    }
  }

  // Función para generar contenido del día específico
  const handleGenerateContent = async () => {
    if (!selectedTheme || !selectedTheme.dayContent) {
      console.error('❌ No hay temática o contenido del día seleccionado')
      return
    }

    try {
      console.log('🚀 Iniciando generación de contenido para:', {
        theme_id: selectedTheme.id,
        day_of_week: selectedTheme.dayContent.dayOfWeek,
        content_type: selectedTheme.dayContent.type
      })

      // Llamar DIRECTAMENTE al webhook de N8N para generar contenido
      const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'

      const response = await fetch(`${N8N_WEBHOOK_URL}/content-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_content',
          theme_id: selectedTheme.id,
          theme_name: selectedTheme.themeName,
          theme_description: selectedTheme.themeDescription,
          day_of_week: selectedTheme.dayContent.dayOfWeek,
          content_type: selectedTheme.dayContent.type,
          content_title: selectedTheme.dayContent.title,
          content_description: selectedTheme.dayContent.description,
          suggested_time: selectedTheme.dayContent.suggestedTime,
          duration: selectedTheme.dayContent.duration,
          scheduled_date: selectedTheme.startDate,
          social_networks: selectedTheme.dayContent.socialNetworks || []
        })
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Contenido generado exitosamente:', result)

      // Actualizar el contenido del día después de un breve delay
      setTimeout(async () => {
        await loadCurrentDayContent(
          selectedTheme.id,
          selectedTheme.dayContent.dayOfWeek,
          selectedTheme.dayContent.type
        )
      }, 2000)

      alert('✅ ¡Contenido en proceso de generación! El workflow N8N ha sido activado.')

    } catch (error) {
      console.error('❌ Error generando contenido:', error)
      alert(`❌ Error al generar contenido: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  // Manejar selección de evento (contenido diario)
  const handleSelectEvent = (event: any) => {
    console.log('🎯 handleSelectEvent ejecutándose con:', event)
    console.log('🎯 event.resource:', event.resource)
    console.log('🎯 event.resource.theme:', event.resource?.theme)
    console.log('🎯 event.resource.dayContent:', event.resource?.dayContent)
    console.log('🎯 ANTES de setSelectedTheme - selectedTheme actual:', selectedTheme)

    if (!event.resource || !event.resource.theme || !event.resource.dayContent) {
      console.error('❌ Error: Datos del evento incompletos')
      return
    }

    const selectedThemeData = {
      ...event.resource.theme,
      dayContent: event.resource.dayContent,
      dayKey: event.resource.dayKey,
      eventTitle: event.title
    }

    console.log('🎯 selectedThemeData:', selectedThemeData)
    console.log('🎯 dayContent.type:', selectedThemeData.dayContent?.type)
    console.log('🎯 dayContent.title:', selectedThemeData.dayContent?.title)
    setSelectedTheme(selectedThemeData)

    // Cargar contenido específico del día seleccionado
    if (selectedThemeData.id && selectedThemeData.dayContent) {
      loadCurrentDayContent(
        selectedThemeData.id,
        selectedThemeData.dayContent.dayOfWeek,
        selectedThemeData.dayContent.type
      )
    }

    console.log('🎯 selectedTheme actualizado, modal debería aparecer')

    // Verificar si el estado se actualizó
    setTimeout(() => {
      console.log('🎯 selectedTheme después de setState:', selectedTheme)
      console.log('🎯 selectedTheme.dayContent?.type:', selectedTheme?.dayContent?.type)
    }, 100)
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar campos requeridos
    if (!themeForm.themeName || !themeForm.startDate || !themeForm.endDate) {
      alert('Por favor completa todos los campos requeridos')
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
      alert(`Ya existe una temática en ese rango de fechas: "${conflicts[0].themeName}"`)
      return
    }

    try {
      await createTheme(themeForm)
      setShowModal(false)
      setThemeForm({ themeName: '', themeDescription: '', startDate: '', endDate: '' })
      alert('¡Temática creada exitosamente!')
    } catch (error) {
      alert('Error al crear la temática')
    }
  }

  // Función para sincronizar con N8N
  const syncWithN8N = async () => {
    if (themes.length === 0) {
      alert('No hay temáticas para sincronizar')
      return
    }

    setSyncStatus('🔄 Sincronizando con N8N...')

    try {
      // Preparar datos completos de temáticas para N8N
      const themesData = themes.map(theme => ({
        id: theme.id,
        name: theme.themeName,
        description: theme.themeDescription,
        start_date: theme.startDate,
        end_date: theme.endDate,
        created_at: theme.createdAt,
        // Información de días de la semana
        weekly_schedule: {
          monday: { type: 'video_person', title: 'Video con Persona Realista', time: '10:00' },
          tuesday: { type: 'image_stats', title: 'Imagen con Estadísticas', time: '11:00' },
          wednesday: { type: 'video_avatar', title: 'Video Avatar Animado', time: '13:00' },
          thursday: { type: 'cta_post', title: 'Post con CTA', time: '14:00' },
          friday: { type: 'manual', title: 'Contenido Manual', time: '15:00' }
        }
      }))

      console.log('📤 Enviando temáticas a N8N webhook:', themesData)

      // Llamar DIRECTAMENTE al webhook de N8N para sincronizar
      const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'

      const response = await fetch(`${N8N_WEBHOOK_URL}/content-scheduler-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_all_themes',
          themes: themesData,
          timestamp: new Date().toISOString(),
          workflow_type: 'content_scheduler'
        })
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Sincronización exitosa:', result)

      setSyncStatus('✅ Sincronización completada')
      setTimeout(() => setSyncStatus(''), 3000)

      // Mostrar resumen de sincronización
      alert(`✅ Sincronización completada:\n- ${themesData.length} temáticas sincronizadas\n- Workflow N8N activado exitosamente`)

    } catch (error) {
      console.error('Error sincronizando con N8N:', error)
      setSyncStatus('❌ Error en sincronización')
      setTimeout(() => setSyncStatus(''), 3000)
      alert(`❌ Error en sincronización: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  // Función para abrir logs de N8N en nueva pestaña
  const loadN8nLogs = async () => {
    try {
      // Abrir la interfaz de N8N en una nueva pestaña
      const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || 'http://localhost:5679'
      window.open(`${N8N_URL}/workflow`, '_blank')

      alert('ℹ️ Se abrirá la interfaz de N8N donde puedes ver todos los workflows y sus ejecuciones')

    } catch (error) {
      console.error('Error abriendo N8N:', error)
      alert(`❌ Error abriendo N8N: ${error instanceof Error ? error.message : 'Error desconocido'}`)
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
  const getEventStyle = (event: any) => {
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
  const EventComponent = ({ event }: { event: any }) => {
    const dayContent = event.resource?.dayContent
    const theme = event.resource?.theme

    if (!dayContent) {
      return (
        <div
          className="flex items-center space-x-1 p-1 text-white font-semibold text-xs cursor-pointer hover:opacity-90 transition-opacity"
          title={`${event.title} - ${theme?.themeName || 'Temática'}`}
        >
          <span>📝</span>
          <span className="truncate">{event.title}</span>
        </div>
      )
    }

    const icon = getContentIcon(dayContent.type)
    const tooltipText = `${dayContent.title}\nTemática: ${theme?.themeName}\nHorario: ${dayContent.suggestedTime || 'Todo el día'}\nDuración: ${dayContent.duration || 'N/A'}`

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
            <div className="text-gray-400 text-xs">{dayContent.suggestedTime || 'Todo el día'}</div>
          </div>
          {/* Flecha del tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    )
  }

  // Componente personalizado para días con color de temática
  const CustomDateCell = ({ children, value, events, handleSelectEvent, ...props }: { children: any, value: Date, events: any[], handleSelectEvent: (event: any) => void, [key: string]: any }) => {
    const isWeekendDay = isWeekend(value)

    // Buscar si este día tiene eventos y obtener su temática
    const dateString = value.toISOString().split('T')[0]
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0]
      return eventDate === dateString
    })

    // Debug: Verificar eventos del día
    console.log(`🔍 CustomDateCell para ${dateString}:`, {
      totalEvents: events.length,
      dayEvents: dayEvents.length,
      dayEventsData: dayEvents
    })

    // Determinar si tiene temática asociada
    const hasTheme = dayEvents.length > 0 && dayEvents[0].resource?.theme

    console.log(`🎯 CustomDateCell ${dateString} - hasTheme:`, hasTheme)

    // Si hay eventos, obtener el color de la temática
    const backgroundColor = isWeekendDay ? '#F8FAFC' : 'transparent'
    const borderLeft = '2px solid transparent'
    const borderRight = '1px solid #E5E7EB' // Borde por defecto para días sin temática
    let themeColor = '#3B82F6' // Color por defecto

    if (hasTheme) {
      const theme = dayEvents[0].resource.theme
      themeColor = getThemeColor(theme.themeName)

    }

    return (
      <div
        {...props}
        className={`rbc-date-cell custom-date-cell ${isWeekendDay ? 'weekend-cell' : ''} ${hasTheme ? 'rbc-themed-cell' : ''}`}
        style={{
          backgroundColor: hasTheme ? `${themeColor}15` : backgroundColor,
          transition: 'all 0.2s ease',
          cursor: hasTheme ? 'pointer' : 'default'
        }}

        onClick={(e) => {
          console.log(`🖱️ Click en CustomDateCell ${dateString}`, {
            hasTheme,
            dayEventsLength: dayEvents.length,
            eventsLength: events.length
          })

          e.stopPropagation() // Evita que el evento se propague a elementos padre del calendario
          if (hasTheme && dayEvents.length > 0) {
            console.log('🎯 Click en celda con temática:', value, dayEvents[0])
            // Abre el popup con la información del primer evento del día
            handleSelectEvent(dayEvents[0])
          } else {
            console.log('🎯 Click en celda sin temática o sin eventos:', value)
            // No hace nada si no hay temática
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

              return (
                <div
                  key={`manual-event-${event.id}`}
                  className="text-xs p-1 rounded text-white font-medium"
                  style={{
                    fontSize: '10px',
                    lineHeight: '1.2',
                    minHeight: '16px'
                  }}
                  // onClick eliminado - ahora el click se maneja en la celda completa
                >
                  <span className="text-xl">{icon}</span>
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

  // Debug: Verificar eventos generados
  console.log('📅 Planificador - Temáticas cargadas:', themes.length)
  console.log('📅 Planificador - Eventos generados:', events.length)
  if (events.length > 0) {
    console.log('📅 Planificador - Primer evento:', events[0])
    console.log('📅 Planificador - Todos los eventos:', events)
  } else {
    console.log('📅 Planificador - No hay eventos generados')
    console.log('📅 Planificador - Temáticas disponibles:', themes)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Cargando planificador...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📅 Planificador de Temáticas
          </h1>
          <p className="text-gray-600">
            Planifica tus contenidos temáticos con distribución semanal automática
          </p>
        </div>

        {/* Controles del planificador */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          {/* Botón para crear temática */}
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-md bg-blue-600 text-white px-6 py-3 rounded-md transition-all duration-200 font-medium shadow-lg h-full"
          >
            ➕ Nueva Temática
          </button>

          {/* Botones de N8N */}
          <div className="flex gap-2">
            <button
              onClick={syncWithN8N}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium shadow-lg"
              title="Sincronizar temáticas con N8N"
            >
              🔄 Sync N8N
            </button>
            <button
              onClick={loadN8nLogs}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium shadow-lg"
              title="Abrir interfaz de N8N"
            >
              🔗 Abrir N8N
            </button>
          </div>
        </div>

      {/* Estadísticas rápidas del planificador */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Temáticas Activas</p>
                <p className="text-2xl font-bold">{themes.length}</p>
              </div>
              <div className="text-blue-200 text-2xl">🎯</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Eventos Programados</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <div className="text-purple-200 text-2xl">📅</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Días con Contenido</p>
                <p className="text-2xl font-bold">{new Set(events.map(e => e.start.toDateString())).size}</p>
              </div>
              <div className="text-green-200 text-2xl">📊</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Próximo Evento</p>
                <p className="text-lg font-bold">
                  {events.length > 0 ? new Date(events[0].start).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                </p>
              </div>
              <div className="text-orange-200 text-2xl">⏰</div>
            </div>
          </div>
        </div>


        </div>

        {/* Estado de sincronización N8N */}
        {syncStatus && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-blue-600 mr-2">🔄</span>
              <span className="text-blue-800 font-medium">{syncStatus}</span>
            </div>
          </div>
        )}





        {/* Mensaje cuando no hay eventos */}
        {events.length === 0 && themes.length === 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-3xl">💡</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  ¡Bienvenido al Planificador!
                </h3>
                <p className="text-yellow-800 mb-3">
                  No tienes temáticas creadas aún. Para empezar:
                </p>
                <ol className="list-decimal list-inside text-yellow-800 space-y-1 mb-3">
                  <li>Haz clic en el botón <strong>&quot;➕ Nueva Temática&quot;</strong> arriba</li>
                  <li>O selecciona un rango de fechas directamente en el calendario</li>
                  <li>Los eventos se generarán automáticamente según la plantilla semanal</li>
                </ol>
                <div className="bg-yellow-100 p-3 rounded border border-yellow-300 mt-3">
                  <p className="text-sm text-yellow-900">
                    <strong>📋 Plantilla semanal automática:</strong>
                  </p>
                  <ul className="text-xs text-yellow-800 mt-2 space-y-1">
                    <li>🎬 <strong>Lunes:</strong> Video con persona realista</li>
                    <li>🖼️ <strong>Martes:</strong> Imagen con estadísticas</li>
                    <li>🎨 <strong>Miércoles:</strong> Video con avatar animado</li>
                    <li>📢 <strong>Jueves:</strong> Post con CTA</li>
                    <li>✏️ <strong>Viernes:</strong> Contenido manual</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendario */}
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Estilos para días de fin de semana en React Big Calendar */
            .rbc-month-view .rbc-date-cell.rbc-off-range-bg {
              background-color: #F8FAFC !important;
            }

            .rbc-month-view .rbc-date-cell.rbc-today.rbc-off-range-bg {
              background-color: #E2E8F0 !important;
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
              z-index: 50;
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
          defaultView="month"
          components={{
            event: EventComponent,
            dateCellWrapper: (props: any) => (
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
          messages={{
            next: 'Siguiente',
            previous: 'Anterior',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay eventos en este rango',
            showMore: (total: any) => `+ Ver más (${total})`
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
                    🎯 Nueva Temática
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
                    Nombre de la Temática *
                  </label>
                  <input
                    type="text"
                    value={themeForm.themeName}
                    onChange={(e) => setThemeForm({ ...themeForm, themeName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                    placeholder="Ej: Seguro de Vida"
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    value={themeForm.themeDescription}
                    onChange={(e) => setThemeForm({ ...themeForm, themeDescription: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                    placeholder="Describe la temática..."
                  />
                </div>

                {/* Fecha de inicio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    value={themeForm.startDate}
                    onChange={(e) => setThemeForm({ ...themeForm, startDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                    required
                  />
                </div>

                {/* Fecha de fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Fin *
                  </label>
                  <input
                    type="date"
                    value={themeForm.endDate}
                    onChange={(e) => setThemeForm({ ...themeForm, endDate: e.target.value })}
                    min={themeForm.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                    required
                  />
                </div>

                {/* Información de la plantilla */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    📋 Plantilla Semanal Automática
                  </h3>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• <strong>Lunes:</strong> Video 24s con persona realista</li>
                    <li>• <strong>Martes:</strong> Imagen con estadísticas</li>
                    <li>• <strong>Miércoles:</strong> Video 24s con avatar Pixar</li>
                    <li>• <strong>Jueves:</strong> Post con CTA</li>
                    <li>• <strong>Viernes:</strong> Contenido manual</li>
                    <li>• <strong>Fin de semana:</strong> Libre</li>
                  </ul>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    📅 Crear Temática
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de detalles de contenido diario */}
        {selectedTheme && (() => {
          console.log('🎯 RENDERIZANDO MODAL - selectedTheme:', selectedTheme)
          console.log('🎯 MODAL - dayContent.type:', selectedTheme.dayContent?.type)
          console.log('🎯 MODAL - Renderizando overlay del modal')
          console.log('🎯 MODAL - Renderizando contenido del modal')

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
              <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mt-8">
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
                          {selectedTheme.dayContent.type === 'manual' && '✏️'}
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

              <div className="p-6 space-y-4">
                {selectedTheme.dayContent ? (
                  // Mostrar detalles del contenido diario
                  <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <div
                      className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowContentStatus(!showContentStatus)}
                    >
                      <div className="flex items-center">
                        <span className="text-blue-900 mr-2">📋</span>
                        <h3 className="text-lg font-semibold text-blue-900">Detalles del Contenido</h3>
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
                          <p className="text-sm font-medium text-gray-500 mb-1">Temática</p>
                          <p className="text-gray-700 font-medium">{selectedTheme.themeName}</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Tipo de Contenido</p>
                          <p className="text-gray-700 font-medium">{selectedTheme.dayContent.title}</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Descripción</p>
                          <p className="text-gray-700">{selectedTheme.dayContent.description}</p>
                        </div>

                        {selectedTheme.dayContent.suggestedTime && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Horario Sugerido</p>
                          <p className="text-gray-700">{selectedTheme.dayContent.suggestedTime}</p>
                        </div>
                        )}

                        {selectedTheme.dayContent.duration && (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Duración</p>
                            <p className="text-gray-700">{selectedTheme.dayContent.duration} segundos</p>
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
                          {currentDayContent && currentDayContent.file_path ? 'Vista Previa' : 'Estado del Contenido'}
                        </h3>
                        {loadingContent && <span className="ml-2 text-sm text-blue-600">Verificando...</span>}
                      </div>

                      <div className="space-y-4">
                        {loadingContent ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Verificando contenido...</span>
                          </div>
                        ) : (
                          // SI NO HAY ARCHIVO O currentDayContent es null: Mostrar solo Vista Previa conceptual + Botón Generar
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                            {selectedTheme.dayContent.type === 'video_person' && (
                              <div className="text-center">
                                <div className="text-4xl mb-2">🎬</div>
                                <h3 className="font-semibold text-blue-900 mb-2">Video con Persona Realista</h3>
                                <p className="text-blue-700 text-sm mb-3">24 segundos de duración</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">👤</div>
                                    <span className="text-sm font-medium">Persona profesional</span>
                                  </div>
                                  <p className="text-xs text-gray-600">Hablando sobre {selectedTheme.themeName} con credibilidad y confianza</p>
                                </div>
                              </div>
                            )}

                            {selectedTheme.dayContent.type === 'image_stats' && (
                              <div className="text-center">
                                <div className="text-4xl mb-2">📊</div>
                                <h3 className="font-semibold text-green-900 mb-2">Imagen con Estadísticas</h3>
                                <p className="text-green-700 text-sm mb-3">Datos relevantes y visuales</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="bg-blue-100 p-2 rounded text-center">
                                      <div className="text-lg font-bold text-blue-700">85%</div>
                                      <div className="text-xs text-blue-600">Satisfacción</div>
                                    </div>
                                    <div className="bg-green-100 p-2 rounded text-center">
                                      <div className="text-lg font-bold text-green-700">+40%</div>
                                      <div className="text-xs text-green-600">Cobertura</div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600">Estadísticas sobre {selectedTheme.themeName}</p>
                                </div>
                              </div>
                            )}

                            {selectedTheme.dayContent.type === 'video_avatar' && (
                              <div className="text-center">
                                <div className="text-4xl mb-2">🎭</div>
                                <h3 className="font-semibold text-purple-900 mb-2">Video Avatar Animado</h3>
                                <p className="text-purple-700 text-sm mb-3">Estilo Pixar - 24 segundos</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">🤖</div>
                                    <span className="text-sm font-medium">Avatar animado</span>
                                  </div>
                                  <p className="text-xs text-gray-600">Explicación creativa sobre {selectedTheme.themeName}</p>
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
                                <h3 className="font-semibold text-orange-900 mb-2">Post con Call to Action</h3>
                                <p className="text-orange-700 text-sm mb-3">Llamada a la acción directa</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <p className="text-sm font-medium mb-2 text-gray-600">¿Necesitas {selectedTheme.themeName}?</p>
                                  <p className="text-xs text-gray-600 mb-3">Protege tu futuro hoy mismo</p>
                                  <div className="bg-orange-500 text-white px-4 py-2 rounded-lg text-center text-sm font-medium">
                                    📞 Contactar Ahora
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedTheme.dayContent.type === 'manual' && (
                              <div className="text-center">
                                <div className="text-4xl mb-2">✏️</div>
                                <h3 className="font-semibold text-gray-900 mb-2">Contenido Manual</h3>
                                <p className="text-gray-700 text-sm mb-3">Personalizable según necesidad</p>
                                <div className="bg-white rounded-lg p-3 text-left">
                                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                    <div className="text-2xl mb-2">📝</div>
                                    <p className="text-sm text-gray-500">Contenido a definir</p>
                                    <p className="text-xs text-gray-400 mt-1">Temática: {selectedTheme.themeName}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Botón Generar integrado */}
                            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                <span className="font-medium text-yellow-800">Sin Archivo</span>
                              </div>
                              <p className="text-sm text-yellow-700 mb-4">
                                Este contenido aún no ha sido generado. Haz clic en el botón para iniciar la generación.
                              </p>
                              <button
                                onClick={handleGenerateContent}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                🚀 Generar Contenido
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          <p><strong>ℹ️ Información:</strong> {currentDayContent && currentDayContent.file_path ? 'Vista previa del contenido generado.' : 'El sistema valida automáticamente si existe contenido generado para el día seleccionado.'}</p>
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
                        📅 {moment(selectedTheme.startDate).format('DD MMMM YYYY')} - {moment(selectedTheme.endDate).format('DD MMMM YYYY')}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Duración</p>
                      <p className="text-gray-700">
                        {Math.ceil((new Date(selectedTheme.endDate).getTime() - new Date(selectedTheme.startDate).getTime()) / (1000 * 60 * 60 * 24))} días
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
        <div className="max-w-7xl mx-auto mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-2">
          <div
            className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowTips(!showTips)}
          >
            <div className="flex items-center">
              <span className="text-blue-900 mr-2">🎨</span>
              <h3 className="text-lg font-semibold text-blue-900">Sistema de Colores Inteligente</h3>
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
                <p className="text-sm font-medium text-gray-700">Días Hábiles (Lun-Vie)</p>
                <p className="text-xs text-gray-600">Colores intensos y eventos destacados</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-gray-300 rounded opacity-70"></div>
              <div>
                <p className="text-sm font-medium text-gray-700">Fines de Semana (Sáb-Dom)</p>
                <p className="text-xs text-gray-600">Colores tenues y fondo gris claro</p>
              </div>
            </div>
          </div>

          {/* Colores por temática */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🎯 Colores por Temática</h4>
            <div className="grid grid-cols-5 gap-2">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-blue-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Azul</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-purple-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Morado</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-yellow-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Amarillo</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-green-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Verde</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-red-500 rounded mb-1"></div>
                <span className="text-xs text-gray-600">Rojo</span>
              </div>
            </div>
          </div>

            <div className="mt-3 p-3 bg-white rounded border border-blue-100">
              <p className="text-xs text-gray-600">
                <span className="font-medium">🎨 Sistema Inteligente:</span> Cada temática tiene un color único y consistente. Los fines de semana muestran versiones más suaves de los mismos colores para facilitar la identificación visual.
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de Estrategia de Redes Sociales */}
        <div className="max-w-7xl mx-auto mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-2">
          <div
            className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowWeeklyStrategy(!showWeeklyStrategy)}
          >
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-1">
                📱 Estrategia Semanal: Contenido × Horario × Redes Sociales
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
                Tabla optimizada para la industria de seguros basada en estudios de engagement
              </p>
            <table className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Día</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Tipo de Contenido</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Horario</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Redes Recomendadas</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Estrategia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">🌅 Lunes</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>🎬</span>
                      <span>Video con Persona Real</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">10:00 AM</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">Facebook</span>
                      <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-medium">Instagram Reels</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">Genera confianza. Facebook para audiencia madura.</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">📊 Martes</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>📈</span>
                      <span>Imagen con Estadísticas</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">11:00 AM</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-blue-800 text-white px-2 py-1 rounded text-xs font-medium">LinkedIn</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">Facebook</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">Mejor día para engagement B2B y datos profesionales.</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">🎭 Miércoles</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>🎨</span>
                      <span>Video Avatar Animado</span>
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
                  <td className="px-4 py-3 text-gray-600 text-sm">Contenido creativo en hora de almuerzo.</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">💼 Jueves</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>📢</span>
                      <span>Post con CTA</span>
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
                  <td className="px-4 py-3 text-gray-600 text-sm">Mejor día para conversiones y decisiones.</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-900">🎉 Viernes</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span>✏️</span>
                      <span>Contenido Manual</span>
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
                  <td className="px-4 py-3 text-gray-600 text-sm">Engagement casual antes del fin de semana.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-white rounded-lg p-4 border border-purple-100">
            <h4 className="font-semibold text-purple-800 mb-2">🎯 Consejos Específicos para Seguros:</h4>
            <ul className="text-purple-700 space-y-1 text-sm">
              <li>✅ <strong>Mejores días:</strong> Martes y Jueves (horario de decisiones financieras)</li>
              <li>✅ <strong>Horario ideal:</strong> 10:00 AM - 12:00 PM (cuando la gente piensa en finanzas)</li>
              <li>✅ <strong>Videos:</strong> Funcionan mejor en mañanas (mayor atención)</li>
              <li>✅ <strong>CTAs:</strong> Jueves 11:30 AM tiene la mejor tasa de conversión</li>
              <li>❌ <strong>Evitar:</strong> Fines de semana (menor engagement para servicios financieros)</li>
            </ul>
          </div>

            <p className="text-purple-600 text-sm mt-3 italic">
              💡 Haz clic en cualquier evento del calendario para ver las recomendaciones específicas de redes sociales y estrategia.
            </p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="max-w-7xl mx-auto mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 Cómo usar el Planificador
          </h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>Selecciona un rango de fechas en el calendario para crear una nueva temática</li>
            <li>Cada temática aplica automáticamente una plantilla semanal de contenidos</li>
            <li>El rango mínimo es de 1 semana y el máximo de 3 meses</li>
            <li>No se pueden solapar temáticas en las mismas fechas</li>
            <li>Haz clic en una temática existente para ver detalles o eliminarla</li>
          </ul>
        </div>
      </div>

  )
}
