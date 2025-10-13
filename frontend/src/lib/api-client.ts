// Cliente para interactuar con la API de Veo 3.0
const API_BASE_URL = process.env.API_BASE_URL || 'http://api:8000'

export interface VideoGenerationRequest {
  prompt: string
  duration?: number
  style?: string
  resolution?: string
}

export interface VideoGenerationResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  error?: string
  created_at: string
}

export interface VideoOperation {
  id: string
  user_id: string
  prompt: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  error?: string
  created_at: string
  updated_at: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  // Generar video desde texto
  async generateVideoFromText(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    const response = await fetch(`${this.baseUrl}/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Error generando video: ${response.statusText}`)
    }

    return response.json()
  }

  // Obtener estado de una tarea
  async getTaskStatus(taskId: string): Promise<VideoGenerationResponse> {
    const response = await fetch(`${this.baseUrl}/task/${taskId}`)

    if (!response.ok) {
      throw new Error(`Error obteniendo estado: ${response.statusText}`)
    }

    return response.json()
  }

  // Obtener historial de videos del usuario
  async getUserVideos(userId: string): Promise<VideoOperation[]> {
    const response = await fetch(`${this.baseUrl}/user/${userId}/videos`)

    if (!response.ok) {
      throw new Error(`Error obteniendo videos: ${response.statusText}`)
    }

    return response.json()
  }

  // Enviar webhook a N8N
  async sendWebhookToN8N(data: any): Promise<void> {
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678'
    
    const response = await fetch(`${webhookUrl}/webhook/video-completed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Error enviando webhook: ${response.statusText}`)
    }
  }
}

export const apiClient = new ApiClient()
