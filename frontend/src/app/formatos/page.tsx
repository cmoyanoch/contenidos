'use client'

import { CheckCircle2, Image as ImageIcon, RefreshCw, Search, Trash2, Upload, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHydration } from '../../hooks/use-hydration';
import { buildApiUrl, buildN8nWebhookUrl } from '../../lib/config';

interface VideoFormat {
  id: number
  format_name: string
  description: string
  category: string
  tags: string[]
  aspect_ratio: string
  recommended_duration: number
  visual_style: string
  mood_and_tone: string
  usage_count: number
  success_rate: number
  is_template: boolean
  created_at: string
  replication_prompt: string
  recommended_veo_model: string
}

interface ImageFormat {
  id: number
  format_name: string
  description: string
  category: string
  aspect_ratio: string
  visual_style: string
  recommended_ai_model: string
  usage_count: number
  success_rate: number
  is_template: boolean
  created_at: string
}

export default function FormatsPage() {
  // ✅ Hook de hidratación para prevenir errores de hidratación
  const isHydrated = useHydration()

  // Estados principales
  const [formatType, setFormatType] = useState<'video' | 'image'>('video')
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([])
  const [imageFormats, setImageFormats] = useState<ImageFormat[]>([])
  const [loading, setLoading] = useState(true)
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Form state for capturing new format
  const [captureForm, setCaptureForm] = useState({
    format_name: '',
    description: '',
    category: 'promotional',
    tags: '',
    use_case: '',
    file: null as File | null,
    content_type: 'video_person' as 'video_person' | 'image_stats' | 'video_avatar' | 'cta_post' | '',
  })

  // Mapeo de content_type a categoría y tags
  const contentTypeMapping = {
    'video_person': {
      category: 'promotional',
      tags: 'real-person, ugc, authentic',
      example: 'Persona hablando a cámara, estilo UGC casual',
      media_type: 'video'
    },
    'image_stats': {
      category: 'educational',
      tags: 'statistics, infographic, data-visualization',
      example: 'Infografía con datos y gráficos',
      media_type: 'image'
    },
    'video_avatar': {
      category: 'educational',
      tags: 'animation, avatar, pixar-style',
      example: 'Avatar 3D estilo Pixar, colores vibrantes',
      media_type: 'video'
    },
    'cta_post': {
      category: 'promotional',
      tags: 'cta, call-to-action, conversion',
      example: 'Post vertical con llamada a la acción',
      media_type: 'video'
    }
  }

  // Función para actualizar categoría y tags según content_type
  const handleContentTypeChange = (contentType: string) => {
    const mapping = contentTypeMapping[contentType as keyof typeof contentTypeMapping]
    if (mapping) {
      setCaptureForm({
        ...captureForm,
        content_type: contentType as 'video_person' | 'image_stats' | 'video_avatar' | 'cta_post',
        category: mapping.category,
        tags: mapping.tags
      })
    }
  }
  const [capturing, setCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState(0)

  // Load formats on mount and when type changes
  useEffect(() => {
    // ✅ Solo cargar formatos después de la hidratación
    if (isHydrated) {
      loadFormats()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatType, categoryFilter, isHydrated])

  const loadFormats = async () => {
    // ✅ Validar que estamos hidratados antes de hacer fetch
    if (!isHydrated) {
      console.log('⏳ Esperando hidratación antes de cargar formatos...')
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }

      const url = formatType === 'video'
        ? buildApiUrl(`/api/v1/formats/list?${params}`)
        : buildApiUrl(`/api/v1/image-formats/?${params}`)

      console.log('🔗 Cargando formatos:', {
        formatType,
        categoryFilter,
        url,
        isHydrated,
        env: {
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          NODE_ENV: process.env.NODE_ENV
        }
      })

      // ✅ Agregar timeout y mejor manejo de errores
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          // ✅ Asegurar que no use caché en desarrollo
          cache: 'no-store'
        })

        clearTimeout(timeoutId)

        console.log('📡 Respuesta recibida:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Error de respuesta:', errorText)
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        if (formatType === 'video') {
          setVideoFormats(data.formats || [])
          console.log('✅ Formatos de video cargados:', data.formats?.length || 0)
        } else {
          setImageFormats(data.formats || [])
          console.log('✅ Formatos de imagen cargados:', data.formats?.length || 0)
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        throw fetchError
      }
    } catch (error) {
      console.error('❌ Error loading formats:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      })

      // ✅ Mostrar mensaje de error al usuario
      alert(`Error loading formats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captureForm.file) {
      alert('Please select a file')
      return
    }

    if (!captureForm.content_type) {
      alert('Please select the content type')
      return
    }

    try {
      setCapturing(true)
      setCaptureProgress(0)

      const formData = new FormData()
      formData.append('data', captureForm.file)
      formData.append('format_name', captureForm.format_name)
      formData.append('content_type', captureForm.content_type)
      formData.append('category', captureForm.category)
      formData.append('tags', captureForm.tags)
      formData.append('is_template', 'true')

      // Nota: description y use_case se generarán del análisis del archivo

      setCaptureProgress(30)

      // Determinar el webhook correcto basado en el tipo de contenido
      const contentType = captureForm.content_type
      const isVideo = contentType === 'video_person' || contentType === 'video_avatar' || contentType === 'cta_post'
      const webhookUrl = isVideo
        ? buildN8nWebhookUrl('2993b51b-bc56-4068-ac50-710be6239549')  // Webhook para videos
        : buildN8nWebhookUrl('format-capture')  // Webhook para imágenes

      // Call N8N webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      })

      setCaptureProgress(80)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error capturing format')
      }

      const result = await response.json()

      setCaptureProgress(100)

      if (result.success) {
        alert('✅ Formato capturado exitosamente')
        setShowCaptureModal(false)
        setCaptureForm({
          format_name: '',
          description: '',
          category: 'promotional',
          tags: '',
          use_case: '',
          file: null,
          content_type: 'video_person',
        })
        loadFormats()
      } else {
        throw new Error(result.message || 'Error capturing format')
      }
    } catch (error) {
      console.error('Error capturing format:', error)
      alert('❌ Error capturing format: ' + (error as Error).message)
    } finally {
      setCapturing(false)
      setCaptureProgress(0)
    }
  }

  const handleDelete = async (formatId: number) => {
    if (!confirm('Are you sure you want to delete this format?')) {
      return
    }

    try {
      const endpoint = formatType === 'video'
        ? buildApiUrl(`/api/v1/formats/${formatId}`)
        : buildApiUrl(`/api/v1/image-formats/${formatId}`)

      const response = await fetch(endpoint, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        alert('✅ Format deleted successfully')
        loadFormats()
      } else {
        alert('❌ Error deleting format')
      }
    } catch (err) {
      alert('❌ Error deleting format')
      console.error(err)
    }
  }

  // Get current formats based on type
  const currentFormats = formatType === 'video' ? videoFormats : imageFormats

  // Filter formats by search term
  const filteredFormats = currentFormats.filter(format =>
    format.format_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (format.description && format.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // ✅ Mostrar loading mientras se hidrata
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading formats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="gap-2 mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📹 Biblioteca de Formatos
          </h1>
          <p className="block text-sm font-medium text-gray-700">
            Gestiona formatos de videos e imágenes para replicación con IA
          </p>
        </div>

        {/* Tipo de Formato Selector */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Tipo de Formato
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setFormatType('video')}
              className={`p-6 rounded-lg border-2 transition-all ${
                formatType === 'video'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Video className={`w-12 h-12 mx-auto mb-3 ${
                formatType === 'video' ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <h3 className="font-semibold text-gray-900">Videos</h3>
              <p className="text-sm text-gray-600 mt-1">
                {videoFormats.length} formatos disponibles
              </p>
            </button>

            <button
              onClick={() => setFormatType('image')}
              className={`p-6 rounded-lg border-2 transition-all ${
                formatType === 'image'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ImageIcon className={`w-12 h-12 mx-auto mb-3 ${
                formatType === 'image' ? 'text-purple-600' : 'text-gray-400'
              }`} />
              <h3 className="font-semibold text-gray-900">Imágenes</h3>
              <p className="text-sm text-gray-600 mt-1">
                {imageFormats.length} formatos disponibles
              </p>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Formatos</div>
            <div className="text-2xl font-bold text-gray-900">{currentFormats.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Activos</div>
            <div className="text-2xl font-bold text-green-600">
              {currentFormats.filter(f => f.is_template).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Categories</div>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(currentFormats.map(f => f.category)).size}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Uso Total</div>
            <div className="text-2xl font-bold text-purple-600">
              {currentFormats.reduce((sum, f) => sum + f.usage_count, 0)}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search formats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
              >
                <option value="all">All categories</option>
                {Array.from(new Set(currentFormats.map(f => f.category))).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowCaptureModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Capture New Format
            </button>
          </div>
        </div>

        {/* Formats List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFormats.map((format) => (
              <div
                key={format.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Header */}
                <div className={`p-4 text-white ${
                  formatType === 'video' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-purple-600 to-pink-600'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{format.format_name}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="bg-white/20 px-2 py-1 rounded">{format.category}</span>
                        {format.is_template && (
                          <span className="bg-white/20 px-2 py-1 rounded">Template</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(format.id)}
                      className="text-white hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {format.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{format.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Aspecto:</span>
                      <span className="ml-1 font-semibold text-gray-600">{format.aspect_ratio || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Uso:</span>
                      <span className="ml-1 font-semibold text-gray-600">{format.usage_count}</span>
                    </div>
                    {formatType === 'video' && 'recommended_veo_model' in format && (
                      <div>
                        <span className="text-gray-500">Modelo:</span>
                        <span className="ml-1 font-semibold text-xs text-gray-600">{format.recommended_veo_model || 'N/A'}</span>
                      </div>
                    )}
                    {formatType === 'image' && 'recommended_ai_model' in format && (
                      <div>
                        <span className="text-gray-500">Modelo:</span>
                        <span className="ml-1 font-semibold text-xs text-gray-600">{format.recommended_ai_model || 'N/A'}</span>
                      </div>
                    )}
                  </div>

                  {format.visual_style && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 line-clamp-2">{format.visual_style}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">Activo</span>
                    </div>
                    {format.success_rate > 0 && (
                      <span className="text-xs font-semibold text-purple-600">
                        {format.success_rate.toFixed(1)}% éxito
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredFormats.length === 0 && (
          <div className="text-center py-12">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay formatos de {formatType === 'video' ? 'video' : 'imagen'}
            </h3>
            <p className="text-gray-600 mb-4">
              Comienza capturando tu primer formato
            </p>
            <button
              onClick={() => setShowCaptureModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Capturar Formato
            </button>
          </div>
        )}

        {/* Capture Modal */}
        {showCaptureModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    📸 Capturar Formato de {formatType === 'video' ? 'Video' : 'Imagen'}
                  </h2>
                  <button
                    onClick={() => setShowCaptureModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* 🆕 Selector de Content Type */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Tipo de Contenido
                  </h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecciona el tipo de contenido *
                    </label>
                    <select
                      value={captureForm.content_type}
                      onChange={(e) => handleContentTypeChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base text-sm font-medium text-gray-700"
                      required
                    >
                      <option value="">-- Selecciona el tipo de contenido --</option>
                      <option value="video_person">📹 Video con Persona Real</option>
                      <option value="image_stats">🖼️ Imagen con Estadísticas</option>
                      <option value="video_avatar">🤖 Video con Avatar Animado</option>
                      <option value="cta_post">📢 Post con Call to Action</option>
                    </select>
                  </div>

                </div>

                <form onSubmit={handleCaptureSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Archivo ({contentTypeMapping[captureForm.content_type as keyof typeof contentTypeMapping]?.media_type || 'video/imagen'}) *
                    </label>
                    <input
                      type="file"
                      accept={
                        captureForm.content_type && contentTypeMapping[captureForm.content_type as keyof typeof contentTypeMapping]?.media_type === 'image'
                          ? 'image/*'
                          : 'video/*'
                      }
                      onChange={(e) => setCaptureForm({ ...captureForm, file: e.target.files?.[0] || null })}
                      className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    {captureForm.content_type && (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 El sistema analizará el archivo automáticamente para generar la descripción y caso de uso
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Formato *
                    </label>
                    <input
                      type="text"
                      value={captureForm.format_name}
                      onChange={(e) => setCaptureForm({ ...captureForm, format_name: e.target.value })}
                      placeholder="Ej: Promotional Video - Real Person v1"
                      className="text-sm font-medium text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Nota informativa */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>ℹ️ Nota:</strong> La descripción, caso de uso, categoría y tags se generarán automáticamente
                      del análisis del archivo. No necesitas completarlos manualmente.
                    </p>
                  </div>

                  {capturing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-blue-800 font-semibold">Analizando formato...</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${captureProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCaptureModal(false)}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                      disabled={capturing}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={capturing}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {capturing ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Capturando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Capturar Formato
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
