'use client'

import { useEffect, useState } from 'react';

// Lazy loading de componentes pesados
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CalendarView: any = null
let fullCalendarLoaded = false

interface ScheduledContent {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'video' | 'image' | 'post'
  platform: string[]
  status: 'pending' | 'scheduled' | 'published' | 'failed'
}

export default function AgendadorClientPage() {
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedTime, setSelectedTime] = useState<string>('12:00')
  const [contentTitle, setContentTitle] = useState<string>('')
  const [contentDescription, setContentDescription] = useState<string>('')
  const [contentType, setContentType] = useState<'video' | 'image' | 'post'>('post')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])
  const [showModal, setShowModal] = useState<boolean>(false)
  const [selectedEvent, setSelectedEvent] = useState<ScheduledContent | null>(null)
  const [calendarReady, setCalendarReady] = useState(false)

  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([
    {
      id: '1',
      title: 'Video promocional del producto',
      description: 'Video corto mostrando las características principales',
      date: '2025-10-15',
      time: '10:00',
      type: 'video',
      platform: ['instagram', 'facebook'],
      status: 'scheduled'
    },
    {
      id: '2',
      title: 'Imagen de oferta especial',
      description: 'Diseño con descuento del 30%',
      date: '2025-10-16',
      time: '14:30',
      type: 'image',
      platform: ['instagram'],
      status: 'pending'
    },
    {
      id: '3',
      title: 'Post de tips de seguros',
      description: 'Consejos útiles para clientes',
      date: '2025-10-17',
      time: '09:00',
      type: 'post',
      platform: ['facebook', 'instagram'],
      status: 'scheduled'
    }
  ])

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-pink-500' },
    { id: 'facebook', name: 'Facebook', icon: '👥', color: 'bg-blue-600' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-black' },
    { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'bg-red-600' }
  ]

  // Cargar calendario solo en el cliente
  useEffect(() => {
    setMounted(true)

    if (view === 'calendar' && !fullCalendarLoaded) {
      import('@/components/agendador/basic-calendar').then((module) => {
        CalendarView = module.default as React.ComponentType<unknown>
        fullCalendarLoaded = true
        setCalendarReady(true)
      })
    }
  }, [view])

  // Prevenir renderizado en servidor
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Cargando agendador...</p>
          </div>
        </div>
      </div>
    )
  }

  // Convertir contenido agendado a eventos de FullCalendar
  const calendarEvents = scheduledContent.map((content) => {
    const getEventColor = () => {
      if (content.status === 'failed') return '#ef4444'
      switch (content.type) {
        case 'video': return '#3b82f6'
        case 'image': return '#8b5cf6'
        default: return '#10b981'
      }
    }

    return {
      id: content.id,
      title: `${getTypeIcon(content.type)} ${content.title}`,
      start: `${content.date}T${content.time}`,
      backgroundColor: getEventColor(),
      borderColor: getEventColor(),
      extendedProps: {
        description: content.description,
        type: content.type,
        platform: content.platform,
        status: content.status
      },
      classNames: [
        `fc-event-${content.type}`,
        `fc-event-${content.status}`
      ]
    }
  })

  const handleTogglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId))
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId])
    }
  }

  const handleScheduleContent = (e: React.FormEvent) => {
    e.preventDefault()

    if (!contentTitle || !contentDescription || selectedPlatforms.length === 0) {
      alert('Por favor completa todos los campos y selecciona al menos una plataforma')
      return
    }

    const newContent: ScheduledContent = {
      id: Date.now().toString(),
      title: contentTitle,
      description: contentDescription,
      date: selectedDate,
      time: selectedTime,
      type: contentType,
      platform: selectedPlatforms,
      status: 'scheduled'
    }

    setScheduledContent([...scheduledContent, newContent])

    // Reset form
    setContentTitle('')
    setContentDescription('')
    setContentType('post')
    setSelectedPlatforms(['instagram'])
    setShowModal(false)

    alert('¡Contenido agendado exitosamente!')
  }

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr)
    setSelectedTime('12:00')
    setShowModal(true)
  }

  const handleEventClick = (event: { id: string }) => {
    const content = scheduledContent.find(c => c.id === event.id)
    if (content) {
      setSelectedEvent(content)
    }
  }

  const handleDeleteScheduled = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este contenido agendado?')) {
      setScheduledContent(scheduledContent.filter(item => item.id !== id))
      setSelectedEvent(null)
    }
  }

  const handleEventDrop = (info: { event: { id: string; startStr: string; start: Date } }) => {
    const updatedContent = scheduledContent.map(content => {
      if (content.id === info.event.id) {
        const newDate = info.event.start.toISOString().split('T')[0]
        const newTime = info.event.start.toISOString().split('T')[1].substring(0, 5)
        return { ...content, date: newDate, time: newTime }
      }
      return content
    })
    setScheduledContent(updatedContent)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programado'
      case 'published':
        return 'Publicado'
      case 'failed':
        return 'Fallido'
      default:
        return 'Pendiente'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '🎬'
      case 'image':
        return '🖼️'
      default:
        return '📝'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📅 Agendador de Contenido
          </h1>
          <p className="text-gray-600">
            Programa tu contenido para publicar en el momento perfecto
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Agendado</p>
                <p className="text-3xl font-bold text-gray-900">{scheduledContent.length}</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Programados</p>
                <p className="text-3xl font-bold text-blue-600">
                  {scheduledContent.filter(c => c.status === 'scheduled').length}
                </p>
              </div>
              <div className="text-4xl">⏰</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Publicados</p>
                <p className="text-3xl font-bold text-green-600">
                  {scheduledContent.filter(c => c.status === 'published').length}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                <p className="text-3xl font-bold text-orange-600">
                  {scheduledContent.filter(c => c.status === 'pending').length}
                </p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>
        </div>

        {/* View Toggle & New Content Button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                view === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📅 Vista Calendario
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                view === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📋 Vista Lista
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
          >
            ➕ Nuevo Contenido
          </button>
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="mb-8">
            {calendarReady && CalendarView ? (
              <CalendarView
                events={calendarEvents}
                onDateSelect={handleDateSelect}
                onEventClick={handleEventClick}
                onEventDrop={handleEventDrop}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando calendario...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Contenido Agendado
            </h2>

            {scheduledContent.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-gray-500 text-lg">
                  No hay contenido agendado
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Comienza agregando tu primer contenido
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledContent
                  .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime())
                  .map((content) => (
                    <div
                      key={content.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedEvent(content)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{getTypeIcon(content.type)}</span>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {content.title}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(content.status)}`}>
                              {getStatusText(content.status)}
                            </span>
                          </div>

                          <p className="text-gray-600 text-sm mb-3">
                            {content.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center text-gray-500">
                              <span className="mr-1">📅</span>
                              {new Date(content.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <span className="mr-1">⏰</span>
                              {content.time}
                            </div>
                            <div className="flex items-center gap-1">
                              {content.platform.map((p) => {
                                const platform = platforms.find(pl => pl.id === p)
                                return (
                                  <span key={p} className="text-lg" title={platform?.name}>
                                    {platform?.icon}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Modal de Nuevo/Editar Contenido */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Nuevo Contenido
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={handleScheduleContent} className="p-6 space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={contentTitle}
                    onChange={(e) => setContentTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Video promocional de verano"
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción *
                  </label>
                  <textarea
                    value={contentDescription}
                    onChange={(e) => setContentDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe el contenido..."
                    required
                  />
                </div>

                {/* Tipo de Contenido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Contenido *
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as 'video' | 'image' | 'post')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="post">📝 Publicación</option>
                    <option value="video">🎬 Video</option>
                    <option value="image">🖼️ Imagen</option>
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Publicación *
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Hora */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Publicación *
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Plataformas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plataformas *
                  </label>
                  <div className="space-y-2">
                    {platforms.map((platform) => (
                      <label key={platform.id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform.id)}
                          onChange={() => handleTogglePlatform(platform.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {platform.icon} {platform.name}
                        </span>
                      </label>
                    ))}
                  </div>
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
                    📅 Agendar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Detalles del Evento */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="border-b border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{getTypeIcon(selectedEvent.type)}</span>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedEvent.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Estado</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedEvent.status)}`}>
                    {getStatusText(selectedEvent.status)}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Descripción</p>
                  <p className="text-gray-700">{selectedEvent.description}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Fecha y Hora</p>
                  <p className="text-gray-700">
                    📅 {new Date(selectedEvent.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} a las {selectedEvent.time}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Plataformas</p>
                  <div className="flex gap-2">
                    {selectedEvent.platform.map((p) => {
                      const platform = platforms.find(pl => pl.id === p)
                      return (
                        <span
                          key={p}
                          className={`${platform?.color} text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1`}
                        >
                          {platform?.icon} {platform?.name}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      alert('Función de editar en desarrollo')
                      setSelectedEvent(null)
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDeleteScheduled(selectedEvent.id)}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Información Adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 Consejos para Agendar Contenido
          </h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>Los mejores horarios para publicar son entre 10am-12pm y 7pm-9pm</li>
            <li>Mantén un calendario consistente para mejor engagement</li>
            <li>Diversifica el tipo de contenido entre videos, imágenes y publicaciones</li>
            <li>Planifica tu contenido con al menos una semana de anticipación</li>
            <li>Haz clic en cualquier fecha del calendario para agendar rápidamente</li>
            <li>Arrastra y suelta eventos para reagendar fácilmente</li>
          </ul>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📌 Leyenda de Colores
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm text-gray-700">🎬 Video</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500"></div>
              <span className="text-sm text-gray-700">🖼️ Imagen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-gray-700">📝 Post</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm text-gray-700">❌ Fallido</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
