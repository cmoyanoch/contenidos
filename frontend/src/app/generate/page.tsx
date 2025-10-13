'use client'

import { apiClient, VideoGenerationRequest } from '@/lib/api-client';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';

export default function GenerateVideoPage() {
  const { data: session, status } = useSession()
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(10)
  const [style, setStyle] = useState('realistic')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>
  }

  if (!session) {
    redirect('/')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const request: VideoGenerationRequest = {
        prompt,
        duration,
        style,
        resolution: '1080p'
      }

      const response = await apiClient.generateVideoFromText(request)
      setResult(response)

      // Enviar webhook a N8N
      await apiClient.sendWebhookToN8N({
        user_id: session.user?.id,
        task_id: response.task_id,
        prompt,
        status: response.status
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🎨 ContentFlow
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Contenido
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe el contenido que quieres generar... Ej: 'Un video de un gato jugando' o 'Modifica esta imagen para que tenga estilo vintage'"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duración (segundos)
                </label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5 segundos</option>
                  <option value={10}>10 segundos</option>
                  <option value={15}>15 segundos</option>
                  <option value={30}>30 segundos</option>
                </select>
              </div>

              <div>
                <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
                  Estilo
                </label>
                <select
                  id="style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="realistic">Realista</option>
                  <option value="cartoon">Dibujo animado</option>
                  <option value="cinematic">Cinematográfico</option>
                  <option value="artistic">Artístico</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generando Contenido...' : 'Generar Contenido'}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-lg font-medium text-green-800 mb-2">
                ¡Contenido en Proceso!
              </h3>
              <p className="text-green-700">
                ID de tarea: {result.task_id}
              </p>
              <p className="text-green-700">
                Estado: {result.status}
              </p>
              {result.video_url && (
                <div className="mt-4">
                  <video controls className="w-full max-w-md">
                    <source src={result.video_url} type="video/mp4" />
                    Tu navegador no soporta el elemento video.
                  </video>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
