'use client'

import { AlertCircle, CheckCircle2, FileText, Image as ImageIcon, Play, RefreshCw, Video } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VideoFormat {
  id: number
  format_name: string
  category: string
  aspect_ratio: string
  visual_style: string
  recommended_veo_model: string
  usage_count: number
}

interface ImageFormat {
  id: number
  format_name: string
  category: string
  aspect_ratio: string
  visual_style: string
  recommended_ai_model: string
  usage_count: number
}

export default function GenerarContenidoPage() {
  // Estados principales
  const [contentType, setContentType] = useState<'video' | 'image' | 'post'>('video')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // Formatos
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([])
  const [imageFormats, setImageFormats] = useState<ImageFormat[]>([])
  const [selectedFormat, setSelectedFormat] = useState<number | null>(null)

  // Estados de carga
  const [loading, setLoading] = useState(false)
  const [loadingFormats, setLoadingFormats] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Cargar formatos según el tipo de contenido
  const loadFormats = async (type: 'video' | 'image') => {
    setLoadingFormats(true)
    try {
      if (type === 'video') {
        const response = await fetch('http://localhost:8001/api/v1/formats/')
        const data = await response.json()
        if (data.success) {
          setVideoFormats(data.formats)
        }
      } else if (type === 'image') {
        const response = await fetch('http://localhost:8001/api/v1/image-formats/')
        const data = await response.json()
        if (data.success) {
          setImageFormats(data.formats)
        }
      }
    } catch (err) {
      console.error('Error cargando formatos:', err)
    } finally {
      setLoadingFormats(false)
    }
  }

  // Cargar formatos cuando cambia el tipo de contenido
  useEffect(() => {
    if (contentType === 'video' || contentType === 'image') {
      loadFormats(contentType)
      setSelectedFormat(null)
    }
  }, [contentType])

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFormat) {
      setError('Por favor, selecciona un formato')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Crear el contenido
      const contentData = {
        content_type: contentType,
        title: title,
        description: description,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        format_type: contentType === 'video' || contentType === 'image' ? contentType : null,
        format_id: contentType === 'video' ? selectedFormat : null,
        image_format_id: contentType === 'image' ? selectedFormat : null,
        is_primary: true,
        usage_context: 'main_content',
        generation_params: {
          title: title,
          description: description
        },
        social_networks: []
      }

      // Llamar al endpoint de creación de contenido
      const response = await fetch('http://localhost:8001/api/v1/content/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contentData)
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`✅ ${result.message}`)
        setTitle('')
        setDescription('')
        setScheduledDate('')
        setScheduledTime('')
        setSelectedFormat(null)
      } else {
        setError(result.detail || 'Error al crear el contenido')
      }
    } catch (err) {
      setError('Error al conectar con el servidor')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 mt-8">
      <div className="max-w-5xl mx-auto mt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎨 Generar Nuevo Contenido
          </h1>
          <p className="text-gray-600">
            Crea contenido usando formatos predefinidos para videos o imágenes
          </p>
        </div>

        {/* Tipo de Contenido */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            1️⃣ Selecciona el Tipo de Contenido
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setContentType('video')}
              className={`p-6 rounded-lg border-2 transition-all ${
                contentType === 'video'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Video className={`w-12 h-12 mx-auto mb-3 ${
                contentType === 'video' ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <h3 className="font-semibold text-gray-900">Video</h3>
              <p className="text-sm text-gray-600 mt-1">Genera videos con IA</p>
            </button>

            <button
              onClick={() => setContentType('image')}
              className={`p-6 rounded-lg border-2 transition-all ${
                contentType === 'image'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ImageIcon className={`w-12 h-12 mx-auto mb-3 ${
                contentType === 'image' ? 'text-purple-600' : 'text-gray-400'
              }`} />
              <h3 className="font-semibold text-gray-900">Imagen</h3>
              <p className="text-sm text-gray-600 mt-1">Genera imágenes con IA</p>
            </button>

            <button
              onClick={() => setContentType('post')}
              className={`p-6 rounded-lg border-2 transition-all ${
                contentType === 'post'
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className={`w-12 h-12 mx-auto mb-3 ${
                contentType === 'post' ? 'text-green-600' : 'text-gray-400'
              }`} />
              <h3 className="font-semibold text-gray-900">Post</h3>
              <p className="text-sm text-gray-600 mt-1">Crea posts de texto</p>
            </button>
          </div>
        </div>

        {/* Formulario de Contenido */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              2️⃣ Información del Contenido
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Promoción Seguros Navidad"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el contenido que quieres generar..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Programada
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora Programada
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Selección de Formato */}
          {(contentType === 'video' || contentType === 'image') && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                3️⃣ Selecciona un Formato
              </h2>

              {loadingFormats ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(contentType === 'video' ? videoFormats : imageFormats).map((format) => (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => setSelectedFormat(format.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedFormat === format.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {format.format_name}
                        </h3>
                        {selectedFormat === format.id && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="bg-gray-200 px-2 py-1 rounded">{format.category}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Aspecto:</span> {format.aspect_ratio}
                        </div>
                        {contentType === 'video' && 'recommended_veo_model' in format && (
                          <div>
                            <span className="text-gray-500">Modelo:</span> {format.recommended_veo_model}
                          </div>
                        )}
                        {contentType === 'image' && 'recommended_ai_model' in format && (
                          <div>
                            <span className="text-gray-500">Modelo:</span> {format.recommended_ai_model}
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Uso:</span> {format.usage_count} veces
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loadingFormats && (contentType === 'video' ? videoFormats : imageFormats).length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    No hay formatos de {contentType === 'video' ? 'video' : 'imagen'} disponibles
                  </p>
                  <a
                    href={`/formatos${contentType === 'image' ? '-imagenes' : ''}`}
                    className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
                  >
                    Ir a capturar formatos →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Alertas */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-green-800">{success}</span>
            </div>
          )}

          {/* Botón de Envío */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !selectedFormat}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generar Contenido
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
