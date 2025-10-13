'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface VideoOperation {
  id: string
  userId: string
  prompt: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl: string | null
  error: string | null
  createdAt: string
  updatedAt: string
  campaignId: string
  user: {
    id: string
    name: string
  }
}

interface Campaign {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  type: string
  targetPlatforms: string[]
  aspectRatio: string
  duration: number
  promptTemplate: string
  characterStyle: string
  brandGuidelines: string
  scheduledStart: string | null
  scheduledEnd: string | null
  frequency: string | null
  totalVideos: number
  tags: string[]
  priority: number
  userId: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
  }
  videoOperations: VideoOperation[]
  stats: {
    totalVideos: number
    completedVideos: number
    processingVideos: number
    failedVideos: number
    pendingVideos: number
    progress: number
  }
}

export default function CampaignDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const campaignId = params.id as string

  useEffect(() => {
    if (session?.user?.email && campaignId) {
      fetchCampaign()
    }
  }, [session, campaignId])

  const fetchCampaign = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}?userId=test-user-001`)
      const data = await response.json()

      if (data.success) {
        setCampaign(data.data)
      } else {
        setError(data.error || 'Campaign not found')
      }
    } catch (err) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const updateCampaignStatus = async (newStatus: string) => {
    if (!campaign) return

    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'test-user-001',
          status: newStatus
        })
      })

      const data = await response.json()

      if (data.success) {
        setCampaign(prev => prev ? { ...prev, status: newStatus as any } : null)
      } else {
        alert('Error updating campaign status')
      }
    } catch (err) {
      alert('Error updating campaign status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const deleteCampaign = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta campaña? Esta acción no se puede deshacer.')) return

    try {
      const response = await fetch(`/api/campaigns/${campaignId}?userId=test-user-001`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/campaigns')
      } else {
        alert('Error deleting campaign')
      }
    } catch (err) {
      alert('Error deleting campaign')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activa'
      case 'draft': return 'Borrador'
      case 'paused': return 'Pausada'
      case 'completed': return 'Completada'
      case 'archived': return 'Archivada'
      default: return status
    }
  }

  const getVideoStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Requerido</h1>
          <p className="text-gray-600 mb-4">Debes iniciar sesión para ver los detalles de la campaña</p>
          <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Campaign not found'}</p>
            <Link
              href="/campaigns"
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Volver a Campañas
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/campaigns"
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
              {getStatusText(campaign.status)}
            </span>
          </div>
          <p className="text-gray-600">{campaign.description}</p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href={`/campaigns/${campaign.id}/edit`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Link>

          {campaign.status === 'draft' && (
            <button
              onClick={() => updateCampaignStatus('active')}
              disabled={updatingStatus}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {updatingStatus ? 'Activando...' : 'Activar'}
            </button>
          )}

          {campaign.status === 'active' && (
            <button
              onClick={() => updateCampaignStatus('paused')}
              disabled={updatingStatus}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {updatingStatus ? 'Pausando...' : 'Pausar'}
            </button>
          )}

          {campaign.status === 'paused' && (
            <button
              onClick={() => updateCampaignStatus('active')}
              disabled={updatingStatus}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {updatingStatus ? 'Reactivando...' : 'Reactivar'}
            </button>
          )}

          <button
            onClick={() => updateCampaignStatus('archived')}
            disabled={updatingStatus}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {updatingStatus ? 'Archivando...' : 'Archivar'}
          </button>

          <button
            onClick={deleteCampaign}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Eliminar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-2xl font-bold text-blue-600">{campaign.stats.totalVideos}</p>
            <p className="text-sm text-gray-600">Videos Creados</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-2xl font-bold text-green-600">{campaign.stats.completedVideos}</p>
            <p className="text-sm text-gray-600">Completados</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-2xl font-bold text-blue-500">{campaign.stats.processingVideos}</p>
            <p className="text-sm text-gray-600">Procesando</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">{campaign.stats.pendingVideos}</p>
            <p className="text-sm text-gray-600">Pendientes</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-2xl font-bold text-purple-600">{campaign.stats.progress}%</p>
            <p className="text-sm text-gray-600">Progreso</p>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Configuration */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Tipo</p>
                  <p className="text-gray-900">
                    {campaign.type === 'ugc_video' ? 'Video UGC' :
                     campaign.type === 'social_media' ? 'Redes Sociales' :
                     'Contenido Continuo'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Aspect Ratio</p>
                  <p className="text-gray-900">{campaign.aspectRatio}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Duración</p>
                  <p className="text-gray-900">{campaign.duration} segundos</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Videos Objetivo</p>
                  <p className="text-gray-900">{campaign.totalVideos}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Prioridad</p>
                  <p className="text-gray-900">{campaign.priority}/10</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Frecuencia</p>
                  <p className="text-gray-900">{campaign.frequency || 'Sin programación'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Plataformas</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {campaign.targetPlatforms.map((platform) => (
                    <span key={platform} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                      {platform}
                    </span>
                  ))}
                </div>
              </div>

              {campaign.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Tags</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {campaign.tags.map((tag) => (
                      <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {campaign.promptTemplate && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Template de Prompt</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">{campaign.promptTemplate}</p>
                </div>
              )}

              {campaign.characterStyle && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Estilo de Personaje</p>
                  <p className="text-gray-900">{campaign.characterStyle}</p>
                </div>
              )}

              {campaign.brandGuidelines && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Guidelines de Marca</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">{campaign.brandGuidelines}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Creada por</p>
                <p className="text-gray-900">{campaign.user.name}</p>
                <p className="text-sm text-gray-500">{campaign.user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Fecha de Creación</p>
                <p className="text-gray-900">{new Date(campaign.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Última Actualización</p>
                <p className="text-gray-900">{new Date(campaign.updatedAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              {campaign.scheduledStart && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Programado desde</p>
                  <p className="text-gray-900">{new Date(campaign.scheduledStart).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              )}
              {campaign.scheduledEnd && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Programado hasta</p>
                  <p className="text-gray-900">{new Date(campaign.scheduledEnd).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Videos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Videos Generados ({campaign.videoOperations.length})</h2>
          </div>

          {campaign.videoOperations.length === 0 ? (
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM3 7h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <p className="text-gray-600">No hay videos generados para esta campaña</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {campaign.videoOperations.map((video) => (
                  <div key={video.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">Video #{video.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{video.prompt}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVideoStatusColor(video.status)}`}>
                        {video.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Creado: {new Date(video.createdAt).toLocaleDateString('es-ES')}</span>
                      {video.videoUrl && (
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Ver Video
                        </a>
                      )}
                    </div>

                    {video.error && (
                      <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-red-600 text-sm">{video.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}