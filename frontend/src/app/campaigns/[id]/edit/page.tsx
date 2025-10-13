'use client'

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CampaignForm {
  name: string
  description: string
  type: string
  targetPlatforms: string[]
  aspectRatio: string
  duration: number
  promptTemplate: string
  characterStyle: string
  brandGuidelines: string
  totalVideos: number
  tags: string[]
  priority: number
  frequency: string
  scheduledStart: string
  scheduledEnd: string
  status: string
}

interface Campaign {
  id: string
  name: string
  description: string
  status: string
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
}

export default function EditCampaignPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const campaignId = params.id as string

  const [form, setForm] = useState<CampaignForm>({
    name: '',
    description: '',
    type: 'ugc_video',
    targetPlatforms: ['instagram'],
    aspectRatio: '9:16',
    duration: 8,
    promptTemplate: '',
    characterStyle: '',
    brandGuidelines: '',
    totalVideos: 1,
    tags: [],
    priority: 5,
    frequency: '',
    scheduledStart: '',
    scheduledEnd: '',
    status: 'draft'
  })

  const [tagInput, setTagInput] = useState('')

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
        const campaign: Campaign = data.data
        setForm({
          name: campaign.name,
          description: campaign.description || '',
          type: campaign.type,
          targetPlatforms: campaign.targetPlatforms,
          aspectRatio: campaign.aspectRatio,
          duration: campaign.duration,
          promptTemplate: campaign.promptTemplate || '',
          characterStyle: campaign.characterStyle || '',
          brandGuidelines: campaign.brandGuidelines || '',
          totalVideos: campaign.totalVideos,
          tags: campaign.tags,
          priority: campaign.priority,
          frequency: campaign.frequency || '',
          scheduledStart: campaign.scheduledStart ?
            new Date(campaign.scheduledStart).toISOString().slice(0, 16) : '',
          scheduledEnd: campaign.scheduledEnd ?
            new Date(campaign.scheduledEnd).toISOString().slice(0, 16) : '',
          status: campaign.status
        })
      } else {
        setError(data.error || 'Campaign not found')
      }
    } catch (err) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'totalVideos' || name === 'priority' ? parseInt(value) || 0 : value
    }))
  }

  const handlePlatformChange = (platform: string) => {
    setForm(prev => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platform)
        ? prev.targetPlatforms.filter(p => p !== platform)
        : [...prev.targetPlatforms, platform]
    }))
  }

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          userId: 'test-user-001',
          scheduledStart: form.scheduledStart ? new Date(form.scheduledStart).toISOString() : null,
          scheduledEnd: form.scheduledEnd ? new Date(form.scheduledEnd).toISOString() : null
        })
      })

      const data = await response.json()

      if (data.success) {
        router.push(`/campaigns/${campaignId}`)
      } else {
        setError(data.error || 'Error updating campaign')
      }
    } catch (err) {
      setError('Error connecting to server')
    } finally {
      setSaving(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Requerido</h1>
          <p className="text-gray-600 mb-4">Debes iniciar sesión para editar campañas</p>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !form.name) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/campaigns/${campaignId}`}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Editar Campaña</h1>
          </div>
          <p className="text-gray-600">Modifica la configuración de tu campaña de contenido</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Información Básica</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Campaña *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Campaña *
                  </label>
                  <select
                    id="type"
                    name="type"
                    required
                    value={form.type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  >
                    <option value="ugc_video">Video UGC</option>
                    <option value="social_media">Redes Sociales</option>
                    <option value="continuous_content">Contenido Continuo</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  >
                    <option value="draft">Borrador</option>
                    <option value="active">Activa</option>
                    <option value="paused">Pausada</option>
                    <option value="completed">Completada</option>
                    <option value="archived">Archivada</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={form.description}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Content Configuration */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Configuración de Contenido</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataformas Objetivo *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'twitter'].map((platform) => (
                    <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.targetPlatforms.includes(platform)}
                        onChange={() => handlePlatformChange(platform)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-700 mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    id="aspectRatio"
                    name="aspectRatio"
                    value={form.aspectRatio}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  >
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="16:9">16:9 (Horizontal)</option>
                    <option value="1:1">1:1 (Cuadrado)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                    Duración (segundos)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    min="1"
                    max="60"
                    value={form.duration}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  />
                </div>

                <div>
                  <label htmlFor="totalVideos" className="block text-sm font-medium text-gray-700 mb-1">
                    Videos Objetivo
                  </label>
                  <input
                    type="number"
                    id="totalVideos"
                    name="totalVideos"
                    min="1"
                    value={form.totalVideos}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  />
                </div>
              </div>
            </div>

            {/* Generation Settings */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Configuración de Generación</h2>

              <div>
                <label htmlFor="promptTemplate" className="block text-sm font-medium text-gray-700 mb-1">
                  Template de Prompt
                </label>
                <textarea
                  id="promptTemplate"
                  name="promptTemplate"
                  rows={3}
                  value={form.promptTemplate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="characterStyle" className="block text-sm font-medium text-gray-700 mb-1">
                    Estilo de Personaje
                  </label>
                  <input
                    type="text"
                    id="characterStyle"
                    name="characterStyle"
                    value={form.characterStyle}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  />
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad (1-10)
                  </label>
                  <input
                    type="number"
                    id="priority"
                    name="priority"
                    min="1"
                    max="10"
                    value={form.priority}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="brandGuidelines" className="block text-sm font-medium text-gray-700 mb-1">
                  Guidelines de Marca
                </label>
                <textarea
                  id="brandGuidelines"
                  name="brandGuidelines"
                  rows={3}
                  value={form.brandGuidelines}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Scheduling */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Programación (Opcional)</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                    Frecuencia
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={form.frequency}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  >
                    <option value="">Sin programación</option>
                    <option value="hourly">Cada hora</option>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="scheduledStart" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduledStart"
                    name="scheduledStart"
                    value={form.scheduledStart}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  />
                </div>

                <div>
                  <label htmlFor="scheduledEnd" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Fin
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduledEnd"
                    name="scheduledEnd"
                    value={form.scheduledEnd}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Tags</h2>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-700"
                  placeholder="Agregar tag..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Agregar
                </button>
              </div>

              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Link
                href={`/campaigns/${campaignId}`}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-center transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving || !form.name || form.targetPlatforms.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
