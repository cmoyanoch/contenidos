'use client'

import { CheckCircle2, Image as ImageIcon, RefreshCw, Search, Trash2, Upload, Video } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  // Estados principales
  const [formatType, setFormatType] = useState<'video' | 'image'>('video')
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([])
  const [imageFormats, setImageFormats] = useState<ImageFormat[]>([])
  const [loading, setLoading] = useState(true)
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | ImageFormat | null>(null)
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
  })
  const [capturing, setCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState(0)

  // Load formats on mount and when type changes
  useEffect(() => {
    loadFormats()
  }, [formatType, categoryFilter])

  const loadFormats = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }

      // Usar variable de entorno para la URL del backend
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

      if (formatType === 'video') {
        const response = await fetch(`${API_BASE_URL}/api/v1/formats/list?${params}`)
        const data = await response.json()
        setVideoFormats(data.formats || [])
      } else {
        const response = await fetch(`${API_BASE_URL}/api/v1/image-formats/?${params}`)
        const data = await response.json()
        setImageFormats(data.formats || [])
      }
    } catch (error) {
      console.error('Error loading formats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captureForm.file) {
      alert('Por favor selecciona un archivo')
      return
    }

    try {
      setCapturing(true)
      setCaptureProgress(0)

      const formData = new FormData()
      formData.append('data', captureForm.file)
      formData.append('format_name', captureForm.format_name)
      formData.append('category', captureForm.category)

      if (formatType === 'video') {
        formData.append('description', captureForm.description)
        formData.append('tags', captureForm.tags)
        formData.append('use_case', captureForm.use_case)
        formData.append('is_template', 'true')
      }

      setCaptureProgress(30)

      // Call N8N webhook
      const response = await fetch('http://localhost:5679/webhook/format-capture', {
        method: 'POST',
        body: formData,
      })

      setCaptureProgress(80)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error capturando formato')
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
        })
        loadFormats()
      } else {
        throw new Error(result.message || 'Error capturando formato')
      }
    } catch (error) {
      console.error('Error capturando formato:', error)
      alert('❌ Error capturando formato: ' + (error as Error).message)
    } finally {
      setCapturing(false)
      setCaptureProgress(0)
    }
  }

  const handleDelete = async (formatId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este formato?')) {
      return
    }

    try {
      const endpoint = formatType === 'video'
        ? `http://localhost:8001/api/v1/formats/${formatId}`
        : `http://localhost:8001/api/v1/image-formats/${formatId}`

      const response = await fetch(endpoint, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        alert('✅ Formato eliminado exitosamente')
        loadFormats()
      } else {
        alert('❌ Error eliminando formato')
      }
    } catch (err) {
      alert('❌ Error eliminando formato')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 mt-8">
      <div className="max-w-7xl mx-auto mt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📹 Biblioteca de Formatos
          </h1>
          <p className="text-gray-600">
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
            <div className="text-sm text-gray-600">Categorías</div>
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
                  placeholder="Buscar formatos..."
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas las categorías</option>
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
              Capturar Nuevo Formato
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
                      title="Eliminar"
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
                      <span className="ml-1 font-semibold">{format.aspect_ratio || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Uso:</span>
                      <span className="ml-1 font-semibold">{format.usage_count}</span>
                    </div>
                    {formatType === 'video' && (
                      <div>
                        <span className="text-gray-500">Modelo:</span>
                        <span className="ml-1 font-semibold text-xs">{format.recommended_veo_model || 'N/A'}</span>
                      </div>
                    )}
                    {formatType === 'image' && (
                      <div>
                        <span className="text-gray-500">Modelo:</span>
                        <span className="ml-1 font-semibold text-xs">{format.recommended_ai_model || 'N/A'}</span>
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

                <form onSubmit={handleCaptureSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formatType === 'video' ? 'Video' : 'Imagen'} *
                    </label>
                    <input
                      type="file"
                      accept={formatType === 'video' ? 'video/*' : 'image/*'}
                      onChange={(e) => setCaptureForm({ ...captureForm, file: e.target.files?.[0] || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Formato *
                    </label>
                    <input
                      type="text"
                      value={captureForm.format_name}
                      onChange={(e) => setCaptureForm({ ...captureForm, format_name: e.target.value })}
                      placeholder="Ej: Modern Minimalist"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría *
                    </label>
                    <select
                      value={captureForm.category}
                      onChange={(e) => setCaptureForm({ ...captureForm, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {formatType === 'video' ? (
                        <>
                          <option value="promotional">Promocional</option>
                          <option value="educational">Educativo</option>
                          <option value="social">Social</option>
                          <option value="product">Producto</option>
                        </>
                      ) : (
                        <>
                          <option value="social-media">Social Media</option>
                          <option value="marketing">Marketing</option>
                          <option value="product">Producto</option>
                          <option value="infographic">Infografía</option>
                          <option value="banner">Banner</option>
                        </>
                      )}
                    </select>
                  </div>

                  {formatType === 'video' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Descripción
                        </label>
                        <textarea
                          value={captureForm.description}
                          onChange={(e) => setCaptureForm({ ...captureForm, description: e.target.value })}
                          placeholder="Describe el formato..."
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tags (separados por comas)
                        </label>
                        <input
                          type="text"
                          value={captureForm.tags}
                          onChange={(e) => setCaptureForm({ ...captureForm, tags: e.target.value })}
                          placeholder="modern, minimalist, professional"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Caso de Uso
                        </label>
                        <input
                          type="text"
                          value={captureForm.use_case}
                          onChange={(e) => setCaptureForm({ ...captureForm, use_case: e.target.value })}
                          placeholder="Ej: Videos promocionales de seguros"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}

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
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
