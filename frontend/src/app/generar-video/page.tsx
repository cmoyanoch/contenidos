"use client"

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import SocialPublisher from '../../components/social-publisher';

export default function GenerarVideoPage() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [operationId, setOperationId] = useState<string | null>(null)
  const [contentInputType, setContentInputType] = useState<'text' | 'image'>('image')
  const [contentType, setContentType] = useState<'feed' | 'reel' | 'story'>('feed')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [showSocialPublisher, setShowSocialPublisher] = useState(false)
  const [inputMethod, setInputMethod] = useState<'file' | 'url'>('file')
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [resolution, setResolution] = useState('720p')
  const [result, setResult] = useState<any>(null)

  const handleInputTypeChange = (type: 'text' | 'image') => {
    setContentInputType(type)
    if (type === 'text') {
      setSelectedFile(null)
      setImageUrl('')
    } else {
      setPrompt('')
    }
  }

  const getAutoConfig = (contentType: string) => {
    if (contentType === 'story') {
      return { aspectRatio: '9:16', resolution: '1080p' }
    } else if (contentType === 'reel') {
      return { aspectRatio: '9:16', resolution: '1080p' }
    } else if (contentType === 'feed') {
      return { aspectRatio: '16:9', resolution: '1080p' }  // Cambiado de 1:1 a 16:9
    }
    return { aspectRatio: '16:9', resolution: '720p' }
  }

  const handleContentTypeChange = (type: 'feed' | 'reel' | 'story') => {
    setContentType(type)
    const config = getAutoConfig(type)
    setAspectRatio(config.aspectRatio)
    setResolution(config.resolution)
  }

  const handlePlatformChange = (platformId: string) => {
    const newPlatforms = selectedPlatforms.includes(platformId)
      ? selectedPlatforms.filter(p => p !== platformId)
      : [...selectedPlatforms, platformId]

    setSelectedPlatforms(newPlatforms)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const pollVideoStatus = async (operationId: string) => {
    const maxAttempts = 120  // 120 × 5 segundos = 10 minutos (para Veo 3.0)
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/video-status?operationId=${operationId}`)
        const data = await response.json()

        if (data.status === 'completed' && data.videoUrl) {
          setResult({
            success: true,
            operationId,
            message: 'Video generado exitosamente',
            status: 'completed',
            videoUrl: data.videoUrl
          })
          setIsProcessing(false)
          setProgressMessage('')
        } else if (data.status === 'failed') {
          setResult({ error: data.message || 'Error generando video' })
          setIsProcessing(false)
          setProgressMessage('')
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 5000)
        } else {
          setResult({ error: 'Timeout: El video tardó demasiado en generarse' })
          setIsProcessing(false)
          setProgressMessage('')
        }
      } catch (error) {
        console.error('Error polling video status:', error)
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 5000)
        } else {
          setResult({ error: 'Error verificando estado del video' })
          setIsProcessing(false)
          setProgressMessage('')
        }
      }
    }

    poll()
  }

  const executeWebhook = async () => {
    if (contentInputType === 'image') {
      if (!prompt || (inputMethod === 'file' && !selectedFile) || (inputMethod === 'url' && !imageUrl)) {
        alert('Por favor completa todos los campos requeridos')
        return
      }
    } else if (contentInputType === 'text') {
      if (!prompt) {
        alert('Por favor ingresa una descripción del video')
        return
      }
    }

    setIsLoading(true)
    setIsProcessing(true)
    setProgressMessage('Iniciando generación de video...')

    try {
      let response: Response

      if (contentInputType === 'image' && inputMethod === 'file' && selectedFile) {
        // Enviar como FormData cuando hay archivo
        const formData = new FormData()
        formData.append('workflowName', 'IMAGEN_A_VIDEO_SIMPLE')
        formData.append('contentInputType', contentInputType)
        formData.append('inputMethod', inputMethod)
        formData.append('prompt', prompt)
        formData.append('imageFile', selectedFile)
        formData.append('aspectRatio', aspectRatio)
        formData.append('resolution', resolution)

        response = await fetch('/api/webhooks/execute-n8n', {
          method: 'POST',
          body: formData,
        })
      } else {
        // Enviar como JSON para texto o URL
        response = await fetch('/api/webhooks/execute-n8n', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflowName: contentInputType === 'text' ? 'TEXTO_A_VIDEO_SIMPLE' : 'IMAGEN_A_VIDEO_SIMPLE',
            contentInputType,
            inputMethod: contentInputType === 'image' ? inputMethod : null,
            prompt,
            imageUrl: contentInputType === 'image' && inputMethod === 'url' ? imageUrl : null,
            aspectRatio,
            resolution
          }),
        })
      }

      const data = await response.json()

      if (data.success && data.operationId) {
        setOperationId(data.operationId)
        setProgressMessage('Video en procesamiento...')
        setResult({
          success: true,
          operationId: data.operationId,
          message: 'Video generation started successfully',
          status: 'processing'
        })

        pollVideoStatus(data.operationId)
      } else {
        setResult({ error: data.message || 'Error al iniciar la generación' })
        setIsProcessing(false)
        setProgressMessage('')
      }
    } catch (error) {
      console.error('Error ejecutando webhook N8N:', error)
      setResult({ error: 'Error al procesar la solicitud' })
      setIsProcessing(false)
      setProgressMessage('')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>
  }

  // Temporalmente deshabilitado para pruebas
  // if (!session) {
  //   redirect('/login')
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 pt-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🎬 Generador de Videos con IA
        </h1>


        {/* Selector de Tipo de Entrada */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            🎯 Tipo de Contenido a Generar
          </label>
          <div className="flex space-x-4">
            <button
              onClick={() => handleInputTypeChange('image')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                contentInputType === 'image'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">🖼️</span>
                <div className="text-left">
                  <div className="font-semibold">Imagen a Video</div>
                  <div className="text-sm opacity-75">Generar video desde una imagen</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => handleInputTypeChange('text')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                contentInputType === 'text'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">📝</span>
                <div className="text-left">
                  <div className="font-semibold">Texto a Video</div>
                  <div className="text-sm opacity-75">Generar video desde descripción</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Entrada de Imagen - Solo si contentInputType === 'image' */}
          {contentInputType === 'image' && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de entrada de imagen
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setInputMethod('file')}
                    className={`px-4 py-2 rounded-md ${
                      inputMethod === 'file'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    📁 Subir archivo
                  </button>
                  <button
                    onClick={() => setInputMethod('url')}
                    className={`px-4 py-2 rounded-md ${
                      inputMethod === 'url'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    🔗 URL de imagen
                  </button>
                </div>
              </div>

              {inputMethod === 'file' ? (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar imagen
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 border border-gray-300 rounded-md text-blue-700"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-green-600">
                      ✅ Archivo seleccionado: {selectedFile.name}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de la imagen
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="w-full p-3 border border-gray-300 rounded-md text-blue-700"
                  />
                </div>
              )}
            </>
          )}

          {/* Entrada de Texto - Solo si contentInputType === 'text' */}
          {contentInputType === 'text' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del video
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe el video que quieres generar... Ej: 'Un gato jugando en un jardín soleado'"
                className="w-full p-3 border border-gray-300 rounded-md h-24 resize-none text-blue-700"
              />
              <p className="text-sm text-gray-500 mt-1">
                💡 Sé específico: incluye detalles sobre personajes, escenario, acciones, estilo visual, etc.
              </p>
            </div>
          )}

          {/* Prompt común para ambos tipos */}
          {contentInputType === 'image' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del video
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe cómo quieres que se anime la imagen..."
                className="w-full p-3 border border-gray-300 rounded-md h-24 resize-none text-blue-700"
              />
            </div>
          )}

          {/* Configuración automática basada en tipo de contenido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Contenido
            </label>
            <div className="flex space-x-2 mb-4">
              {[
                { id: 'feed', label: 'Feed Post', icon: '📝' },
                { id: 'reel', label: 'Reel/Video', icon: '🎬' },
                { id: 'story', label: 'Story', icon: '📱' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleContentTypeChange(type.id as any)}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    contentType === type.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Configuración automática mostrada */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">⚙️ Configuración Automática</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Aspecto:</span>
                <span className="ml-2 text-blue-800">{aspectRatio}</span>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Resolución:</span>
                <span className="ml-2 text-blue-800">{resolution}</span>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              💡 Configuración optimizada para {contentType}
            </p>
          </div>

          {/* Botón de generación */}
          <div className="mt-6">
            <button
              onClick={executeWebhook}
              disabled={isLoading || isProcessing}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading || isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{progressMessage || 'Procesando...'}</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Generar Video</span>
                </>
              )}
            </button>
          </div>

          {/* Resultado */}
          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              {result.success ? (
                <div>
                  <h3 className="text-lg font-semibold text-green-600 mb-2">
                    ✅ {result.message}
                  </h3>
                  {result.operationId && (
                    <p className="text-sm text-gray-600 mb-2">
                      ID de operación: {result.operationId}
                    </p>
                  )}
                  {result.status === 'processing' && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-blue-600">Procesando video...</span>
                    </div>
                  )}
                  {result.videoUrl && (
                    <div className="mt-4">
                      <video controls className="w-full max-w-md mx-auto">
                        <source src={result.videoUrl} type="video/mp4" />
                        Tu navegador no soporta el elemento video.
                      </video>

                      {/* Plataformas de Destino - Solo cuando el video esté listo */}
                      <div className="mt-6 p-4 bg-white rounded-lg border">
                        <h4 className="text-lg font-semibold text-gray-800 mb-3">
                          🎯 Plataformas de Destino
                        </h4>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {[
                            { id: 'instagram', name: 'Instagram', icon: '📷' },
                            { id: 'facebook', name: 'Facebook', icon: '📘' },
                            { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
                            { id: 'whatsapp', name: 'WhatsApp', icon: '💬' }
                          ].map((platform) => (
                            <button
                              key={platform.id}
                              onClick={() => handlePlatformChange(platform.id)}
                              className={`p-3 rounded-lg border-2 transition-colors ${
                                selectedPlatforms.includes(platform.id)
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{platform.icon}</span>
                                <span className="font-medium">{platform.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Mostrar configuración optimizada para plataformas seleccionadas */}
                        {selectedPlatforms.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <h5 className="text-sm font-medium text-green-800 mb-2">
                              📐 Configuración Optimizada
                            </h5>
                            <div className="text-sm text-green-700">
                              <p>Video optimizado para: <strong>{selectedPlatforms.join(', ')}</strong></p>
                              <p>Aspecto: <strong>{aspectRatio}</strong> | Resolución: <strong>{resolution}</strong></p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex space-x-3 justify-center">
                        <a
                          href={result.videoUrl}
                          download
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                          📥 Descargar Video
                        </a>
                        <button
                          onClick={() => setShowSocialPublisher(true)}
                          disabled={selectedPlatforms.length === 0}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          🚀 Publicar en RRSS {selectedPlatforms.length > 0 && `(${selectedPlatforms.length})`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-red-600 mb-2">
                    ❌ Error
                  </h3>
                  <p className="text-gray-700">{result.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Modal de publicación en RRSS */}
          {showSocialPublisher && result?.videoUrl && (
            <SocialPublisher
              videoUrl={result.videoUrl}
              selectedPlatforms={selectedPlatforms}
              onClose={() => setShowSocialPublisher(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
