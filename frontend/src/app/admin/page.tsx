'use client'

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// ✅ Interface para Webhooks
interface Webhook {
  id?: string;
  name: string;
  url: string;
  active?: boolean;
  method?: string;
  description?: string;
  last_executed?: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalContent: 0,
    systemStatus: 'healthy'
  })
  const [showCredentials, setShowCredentials] = useState(false)
  const [credentials, setCredentials] = useState({
    instagram: {
      accessToken: '',
      accountId: ''
    },
    facebook: {
      accessToken: '',
      pageId: ''
    },
    linkedin: {
      accessToken: '',
      personId: ''
    },
    whatsapp: {
      accessToken: '',
      phoneNumberId: '',
      businessAccountId: ''
    }
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showGoogleCredentials, setShowGoogleCredentials] = useState(false)
  const [googleCredentials, setGoogleCredentials] = useState({
    googleApiKey: '',
    googleCloudProject: '',
    googleCloudRegion: 'us-central1',
    googleApplicationCredentials: '',
    gcsBucketName: '',
    gcsProjectId: '',
    gcsCredentialsPath: '',
    secretKey: '',
    algorithm: 'HS256',
    accessTokenExpireMinutes: 30,
    maxFileSize: 10485760,
    uploadDir: 'uploads',
    logLevel: 'INFO',
    logFile: 'logs/app.log'
  })
  const [showWebhooks, setShowWebhooks] = useState(false)
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [newWebhook, setNewWebhook] = useState<Webhook>({
    name: 'Generar Video',
    url: ''
  })
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const handleCredentialChange = (platform: string, field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform as keyof typeof prev],
        [field]: value
      }
    }))
  }

  const saveCredentials = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/social-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (response.ok) {
        setMessage('✅ Credenciales guardadas exitosamente')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('❌ Error al guardar credenciales')
      }
    } catch (error) {
      setMessage('❌ Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/social-credentials')
      if (response.ok) {
        const data = await response.json()
        setCredentials(data)
      }
    } catch (error) {
      console.error('Error loading credentials:', error)
    }
  }

  const loadGoogleCredentials = async () => {
    try {
      const response = await fetch('/api/google-credentials')
      if (response.ok) {
        const data = await response.json()
        setGoogleCredentials(data)
      }
    } catch (error) {
      console.error('Error loading Google credentials:', error)
    }
  }

  const loadWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks')
      if (response.ok) {
        const data = await response.json()
        setWebhooks(data)
      }
    } catch (error) {
      console.error('Error loading webhooks:', error)
    }
  }

  const saveWebhook = async (webhook: Webhook) => {
    setLoading(true)
    try {
      const response = await fetch('/api/webhooks', {
        method: webhook.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhook)
      })

      if (response.ok) {
        setMessage('✅ Webhook guardado exitosamente')
        loadWebhooks()
        setNewWebhook({ name: 'Generar Video', url: '' })
        setEditingWebhook(null)
      } else {
        setMessage('❌ Error al guardar webhook')
      }
    } catch (error) {
      setMessage('❌ Error de conexión')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este webhook?')) return

    try {
      const response = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setMessage('✅ Webhook eliminado')
        loadWebhooks()
      }
    } catch (error) {
      setMessage('❌ Error al eliminar webhook')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const testWebhook = async (webhook: Webhook) => {
    setLoading(true)
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId: webhook.id })
      })

      const result = await response.json()
      setMessage(result.success ? '✅ Webhook probado exitosamente' : `❌ Error: ${result.error}`)
    } catch (error) {
      setMessage('❌ Error al probar webhook')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleGoogleCredentialChange = (field: string, value: string | number) => {
    setGoogleCredentials(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveGoogleCredentials = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/google-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleCredentials),
      })

      if (response.ok) {
        setMessage('✅ Credenciales de Google guardadas exitosamente')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('❌ Error al guardar credenciales de Google')
      }
    } catch (error) {
      setMessage('❌ Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCredentials()
    loadGoogleCredentials()
    loadWebhooks()
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 pt-16">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🔧 ContentFlow Admin
          </h1>
          <p className="text-gray-300">
            Gestiona el sistema ContentFlow
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Usuarios</p>
                <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Contenido Generado</p>
                <p className="text-3xl font-bold text-white">{stats.totalContent}</p>
              </div>
              <div className="text-4xl">🎨</div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Estado del Sistema</p>
                <p className="text-lg font-semibold text-green-400">
                  {stats.systemStatus === 'healthy' ? '✅ Saludable' : '⚠️ Atención'}
                </p>
              </div>
              <div className="text-4xl">🖥️</div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">🗄️ Base de Datos</h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
                Ver Usuarios
              </button>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors">
                Backup DB
              </button>
              <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md transition-colors">
                Limpiar Cache
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">⚙️ Sistema</h2>
            <div className="space-y-3">
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors">
                Logs del Sistema
              </button>
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                🔐 Credenciales RRSS
              </button>
              <button
                onClick={() => setShowGoogleCredentials(!showGoogleCredentials)}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                🔑 Google API
              </button>
              <button
                onClick={() => setShowWebhooks(!showWebhooks)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                🔗 Webhooks
              </button>
            </div>
          </div>
        </div>

        {/* Social Media Credentials Form */}
        {showCredentials && (
          <div className="mb-8 bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">🔐 Credenciales de Redes Sociales</h2>

            {message && (
              <div className="mb-4 p-3 rounded-md bg-blue-600/20 text-white">
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Instagram */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  📸 Instagram
                </h3>
                <input
                  type="text"
                  placeholder="Access Token"
                  value={credentials.instagram.accessToken}
                  onChange={(e) => handleCredentialChange('instagram', 'accessToken', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Account ID"
                  value={credentials.instagram.accountId}
                  onChange={(e) => handleCredentialChange('instagram', 'accountId', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              {/* Facebook */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  📘 Facebook
                </h3>
                <input
                  type="text"
                  placeholder="Access Token"
                  value={credentials.facebook.accessToken}
                  onChange={(e) => handleCredentialChange('facebook', 'accessToken', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Page ID"
                  value={credentials.facebook.pageId}
                  onChange={(e) => handleCredentialChange('facebook', 'pageId', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  💼 LinkedIn
                </h3>
                <input
                  type="text"
                  placeholder="Access Token"
                  value={credentials.linkedin.accessToken}
                  onChange={(e) => handleCredentialChange('linkedin', 'accessToken', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Person ID"
                  value={credentials.linkedin.personId}
                  onChange={(e) => handleCredentialChange('linkedin', 'personId', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  💬 WhatsApp
                </h3>
                <input
                  type="text"
                  placeholder="Access Token"
                  value={credentials.whatsapp.accessToken}
                  onChange={(e) => handleCredentialChange('whatsapp', 'accessToken', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Phone Number ID"
                  value={credentials.whatsapp.phoneNumberId}
                  onChange={(e) => handleCredentialChange('whatsapp', 'phoneNumberId', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Business Account ID"
                  value={credentials.whatsapp.businessAccountId}
                  onChange={(e) => handleCredentialChange('whatsapp', 'businessAccountId', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={saveCredentials}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-md transition-colors font-medium"
              >
                {loading ? 'Guardando...' : '💾 Guardar Credenciales'}
              </button>
              <button
                onClick={() => setShowCredentials(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Webhooks Management */}
        {showWebhooks && (
          <div className="mb-8 bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">🔗 Gestión de Webhooks N8N</h2>

            {message && (
              <div className="mb-4 p-3 rounded-md bg-blue-600/20 text-white">
                {message}
              </div>
            )}

            {/* Crear/Editar Webhook */}
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingWebhook ? '✏️ Editar Webhook N8N' : '➕ Nuevo Webhook N8N'}
              </h3>

                            <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    🎬 Generar Video - URL del Webhook N8N
                  </label>
                  <input
                    type="url"
                    placeholder="http://localhost:5678/webhook/8f3ed26d-69a1-4d67-8baf-a529fd76519f"
                    value={editingWebhook ? editingWebhook.url : newWebhook.url}
                    onChange={(e) => editingWebhook
                      ? setEditingWebhook({...editingWebhook, url: e.target.value})
                      : setNewWebhook({...newWebhook, url: e.target.value})
                    }
                    className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    💡 URL completa del webhook de N8N para el formulario de generación de video
                  </p>
                </div>
              </div><div className="mt-4 flex gap-2">
                <button
                  onClick={() => editingWebhook ? saveWebhook(editingWebhook) : saveWebhook(newWebhook)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
                >
                  {loading ? 'Guardando...' : (editingWebhook ? '💾 Actualizar' : '➕ Crear')}
                </button>
                {editingWebhook && (
                  <button
                    onClick={() => setEditingWebhook(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Webhooks */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">📋 Webhooks Configurados</h3>
              {webhooks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay webhooks configurados</p>
              ) : (
                webhooks.map((webhook) => (
                  <div key={webhook.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-white font-medium">{webhook.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          webhook.active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                        }`}>
                          {webhook.active ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-600/20 text-blue-400">
                          {webhook.method}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => testWebhook(webhook)}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors"
                          title="Probar webhook"
                        >
                          🧪
                        </button>
                        <button
                          onClick={() => setEditingWebhook(webhook)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => webhook.id && deleteWebhook(webhook.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Eliminar"
                          disabled={!webhook.id}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{webhook.url}</p>
                    {webhook.description && (
                      <p className="text-gray-300 text-sm">{webhook.description}</p>
                    )}
                    {webhook.last_executed && (
                      <p className="text-gray-500 text-xs mt-2">
                        Última ejecución: {new Date(webhook.last_executed).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Google Credentials Form */}
        {showGoogleCredentials && (
          <div className="mb-8 bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">🔑 Credenciales de Google API</h2>

            {message && (
              <div className="mb-4 p-3 rounded-md bg-blue-600/20 text-white">
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Google Cloud Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  ☁️ Google Cloud
                </h3>
                <input
                  type="text"
                  placeholder="Google API Key"
                  value={googleCredentials.googleApiKey}
                  onChange={(e) => handleGoogleCredentialChange('googleApiKey', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Google Cloud Project"
                  value={googleCredentials.googleCloudProject}
                  onChange={(e) => handleGoogleCredentialChange('googleCloudProject', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Google Cloud Region"
                  value={googleCredentials.googleCloudRegion}
                  onChange={(e) => handleGoogleCredentialChange('googleCloudRegion', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <textarea
                  placeholder="Google Application Credentials (JSON)"
                  value={googleCredentials.googleApplicationCredentials}
                  onChange={(e) => handleGoogleCredentialChange('googleApplicationCredentials', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400 h-32 resize-none"
                />
              </div>

              {/* Google Cloud Storage */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  🪣 Cloud Storage
                </h3>
                <input
                  type="text"
                  placeholder="GCS Bucket Name"
                  value={googleCredentials.gcsBucketName}
                  onChange={(e) => handleGoogleCredentialChange('gcsBucketName', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="GCS Project ID"
                  value={googleCredentials.gcsProjectId}
                  onChange={(e) => handleGoogleCredentialChange('gcsProjectId', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="GCS Credentials Path"
                  value={googleCredentials.gcsCredentialsPath}
                  onChange={(e) => handleGoogleCredentialChange('gcsCredentialsPath', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              {/* Security */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  🔒 Seguridad
                </h3>
                <input
                  type="text"
                  placeholder="Secret Key"
                  value={googleCredentials.secretKey}
                  onChange={(e) => handleGoogleCredentialChange('secretKey', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Algorithm"
                  value={googleCredentials.algorithm}
                  onChange={(e) => handleGoogleCredentialChange('algorithm', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="number"
                  placeholder="Token Expire Minutes"
                  value={googleCredentials.accessTokenExpireMinutes}
                  onChange={(e) => handleGoogleCredentialChange('accessTokenExpireMinutes', parseInt(e.target.value))}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  ⚙️ Configuración
                </h3>
                <input
                  type="number"
                  placeholder="Max File Size"
                  value={googleCredentials.maxFileSize}
                  onChange={(e) => handleGoogleCredentialChange('maxFileSize', parseInt(e.target.value))}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Upload Directory"
                  value={googleCredentials.uploadDir}
                  onChange={(e) => handleGoogleCredentialChange('uploadDir', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Log Level"
                  value={googleCredentials.logLevel}
                  onChange={(e) => handleGoogleCredentialChange('logLevel', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Log File"
                  value={googleCredentials.logFile}
                  onChange={(e) => handleGoogleCredentialChange('logFile', e.target.value)}
                  className="w-full p-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={saveGoogleCredentials}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-md transition-colors font-medium"
              >
                {loading ? 'Guardando...' : '💾 Guardar Credenciales'}
              </button>
              <button
                onClick={() => setShowGoogleCredentials(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Service Status */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">🚀 Estado de Servicios</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex items-center justify-between p-3 bg-green-600/20 rounded-lg">
              <span className="text-white">Frontend</span>
              <span className="text-green-400">✅ Online</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-600/20 rounded-lg">
              <span className="text-white">API</span>
              <span className="text-green-400">✅ Online</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-600/20 rounded-lg">
              <span className="text-white">Database</span>
              <span className="text-green-400">✅ Online</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-600/20 rounded-lg">
              <span className="text-white">N8N</span>
              <span className="text-green-400">✅ Online</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-600/20 rounded-lg">
              <span className="text-white">API RRSS</span>
              <span className="text-green-400">✅ Online</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">🔗 Enlaces Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <a
              href="http://localhost:8001/docs"
              target="_blank"
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md text-center transition-colors"
            >
              📖 API Docs
            </a>
            <a
              href="http://localhost:8002/docs"
              target="_blank"
              className="bg-cyan-600 hover:bg-cyan-700 text-white py-3 px-4 rounded-md text-center transition-colors"
            >
              🌐 API RRSS
            </a>
            <a
              href="http://localhost:5050"
              target="_blank"
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md text-center transition-colors"
            >
              🐘 pgAdmin
            </a>
            <a
              href="http://localhost:5678"
              target="_blank"
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-md text-center transition-colors"
            >
              🔄 N8N
            </a>
            <a
              href="http://localhost:5556"
              target="_blank"
              className="bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-md text-center transition-colors"
            >
              🌸 Flower
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
