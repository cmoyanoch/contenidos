'use client'

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Campaign {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  type: string
  targetPlatforms: string[]
  aspectRatio: string
  duration: number
  totalVideos: number
  tags: string[]
  priority: number
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
  }
  stats: {
    totalVideos: number
    recentVideos: any[]
  }
}

interface CampaignsResponse {
  success: boolean
  data: Campaign[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
    nextOffset: number | null
  }
}

export default function CampaignsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  useEffect(() => {
    if (session?.user?.email) {
      fetchCampaigns()
    }
  }, [session, statusFilter, typeFilter])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        userId: 'test-user-001' // TODO: Usar session?.user?.id cuando esté disponible
      })

      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('type', typeFilter)

      const response = await fetch(`/api/campaigns?${params}`)
      const data: CampaignsResponse = await response.json()

      if (data.success) {
        setCampaigns(data.data)
      } else {
        setError('Error loading campaigns')
      }
    } catch (err) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta campaña?')) return

    try {
      const response = await fetch(`/api/campaigns/${campaignId}?userId=test-user-001`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCampaigns(campaigns.filter(c => c.id !== campaignId))
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

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Requerido</h1>
          <p className="text-gray-600 mb-4">Debes iniciar sesión para ver las campañas</p>
          <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📋 Campañas de Contenido</h1>
              <p className="text-gray-600 mt-2">Gestiona tus campañas de generación automatizada de contenido</p>
            </div>
            <Link
              href="/campaigns/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nueva Campaña
            </Link>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
            >
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="active">Activa</option>
              <option value="paused">Pausada</option>
              <option value="completed">Completada</option>
              <option value="archived">Archivada</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
            >
              <option value="">Todos los tipos</option>
              <option value="ugc_video">Video UGC</option>
              <option value="social_media">Redes Sociales</option>
              <option value="continuous_content">Contenido Continuo</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchCampaigns}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 7a2 2 0 012-2h10a2 2 0 012 2v2M5 11h14" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay campañas</h3>
            <p className="text-gray-600 mb-6">Crea tu primera campaña para automatizar la generación de contenido</p>
            <Link
              href="/campaigns/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Crear Primera Campaña
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2">{campaign.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {getStatusText(campaign.status)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">Tipo:</span>
                      <span className="text-gray-900 text-sm font-medium">
                        {campaign.type === 'ugc_video' ? 'Video UGC' :
                         campaign.type === 'social_media' ? 'Redes Sociales' :
                         'Contenido Continuo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">Videos objetivo:</span>
                      <span className="text-gray-900 text-sm font-medium">{campaign.totalVideos}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">Videos creados:</span>
                      <span className="text-gray-900 text-sm font-medium">{campaign.stats.totalVideos}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">Plataformas:</span>
                      <div className="flex flex-wrap gap-1">
                        {campaign.targetPlatforms.map((platform) => (
                          <span key={platform} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                    {campaign.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Tags:</span>
                        <div className="flex flex-wrap gap-1">
                          {campaign.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                          {campaign.tags.length > 3 && (
                            <span className="text-gray-500 text-xs">+{campaign.tags.length - 3}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors"
                    >
                      Ver Detalles
                    </Link>
                    <Link
                      href={`/campaigns/${campaign.id}/edit`}
                      className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
