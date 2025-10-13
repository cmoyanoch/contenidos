'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { apiClient, VideoOperation } from '@/lib/api-client'

export default function VideoHistory() {
  const { data: session } = useSession()
  const [videos, setVideos] = useState<VideoOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      loadVideos()
    }
  }, [session])

  const loadVideos = async () => {
    try {
      setLoading(true)
      const userVideos = await apiClient.getUserVideos(session?.user?.id!)
      setVideos(userVideos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando videos')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado'
      case 'processing': return 'Procesando'
      case 'failed': return 'Fallido'
      default: return 'Pendiente'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tienes videos generados aún.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <div key={video.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {video.prompt}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(video.status)}`}>
              {getStatusText(video.status)}
            </span>
          </div>
          
          <p className="text-sm text-gray-500 mb-3">
            Creado: {new Date(video.created_at).toLocaleString()}
          </p>

          {video.video_url && video.status === 'completed' && (
            <div className="mt-4">
              <video controls className="w-full max-w-md rounded-lg">
                <source src={video.video_url} type="video/mp4" />
                Tu navegador no soporta el elemento video.
              </video>
            </div>
          )}

          {video.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              Error: {video.error}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
