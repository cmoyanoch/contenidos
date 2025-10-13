"use client"
import { useState } from 'react'

interface SocialPublisherProps {
  videoUrl: string
  selectedPlatforms: string[]
  onClose: () => void
}

export default function SocialPublisher({ videoUrl, selectedPlatforms, onClose }: SocialPublisherProps) {
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState<'feed' | 'reel' | 'story'>('feed')
  const [imageUrl, setImageUrl] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(selectedPlatforms)
  const [isPublishing, setIsPublishing] = useState(false)

  const togglePlatform = (platformId: string) => {
    setPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handlePublish = async () => {
    if (!content || platforms.length === 0) return

    setIsPublishing(true)
    try {
      const response = await fetch('/api/social-publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          contentType,
          imageUrl: imageUrl || null,
          videoUrl,
          platforms
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        alert('✅ Contenido publicado exitosamente')
        onClose()
      } else {
        alert(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error publicando:', error)
      alert('❌ Error al publicar contenido')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg p-6 w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🚀</span>
            <h2 className="text-xl font-bold text-white">Publicar en Redes Sociales</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Video Preview */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-2">Video Generado:</h3>
          <video 
            controls 
            className="w-full max-w-md mx-auto rounded-lg"
            src={videoUrl}
          >
            Tu navegador no soporta el elemento video.
          </video>
        </div>

        {/* Content */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Contenido</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe tu contenido aquí..."
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 h-24 resize-none"
          />
        </div>

        {/* Content Type */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Tipo de Contenido</label>
          <div className="flex space-x-2">
            {[
              { id: 'feed', label: 'Feed Post' },
              { id: 'reel', label: 'Reel/Video' },
              { id: 'story', label: 'Story' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setContentType(type.id as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  contentType === type.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image URL */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">
            URL de Imagen/Video (opcional)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
          />
        </div>

        {/* Platforms */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-2">Plataformas</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'instagram', name: 'Instagram', icon: '📷' },
              { id: 'facebook', name: 'Facebook', icon: '📘' },
              { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
              { id: 'whatsapp', name: 'WhatsApp', icon: '💬' }
            ].map((platform) => (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  platforms.includes(platform.id)
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <span className="text-white font-medium">{platform.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handlePublish}
            disabled={!content || platforms.length === 0 || isPublishing}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <span>🚀</span>
            <span>{isPublishing ? 'Publicando...' : 'Publicar'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
