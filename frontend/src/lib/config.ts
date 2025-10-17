// Configuración centralizada para el frontend
// Todas las URLs y configuraciones en un solo lugar

export const config = {
  // URLs de APIs
  api: {
    google: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001',
    rrss: process.env.NEXT_PUBLIC_API_RRSS_URL || 'http://localhost:8002',
  },

  // URLs de servicios
  services: {
    n8n: process.env.NEXT_PUBLIC_N8N_URL || 'http://localhost:5678',
    pgadmin: process.env.NEXT_PUBLIC_PGADMIN_URL || 'http://localhost:5050',
    flower: process.env.NEXT_PUBLIC_FLOWER_URL || 'http://localhost:5556',
  },

  // URLs de webhooks
  webhooks: {
    n8n: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook',
    planificador: '243dbf2d-f504-43b6-86b6-5fb736cc86fc', // ID del webhook del workflow "Planificador de Contenidos"
    staff: 'a40ee3f0-432a-42b1-ba82-196cfc842883', // ID del webhook del workflow "Staff"
  },

  // URLs de archivos
  uploads: {
    base: process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:8001/uploads',
    icons: process.env.NEXT_PUBLIC_ICONS_URL || 'http://localhost:8001/uploads/icons',
  },

  // Configuración de la aplicación
  app: {
    name: 'ContentFlow',
    version: '2.0.0',
    timeout: 3000, // 3 segundos para mensajes de éxito/error
  },

  // Configuración de desarrollo
  development: {
    isDev: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  }
} as const

// Funciones helper para construir URLs
export const buildApiUrl = (endpoint: string) => `${config.api.google}${endpoint}`
export const buildRrssUrl = (endpoint: string) => `${config.api.rrss}${endpoint}`
export const buildN8nWebhookUrl = (webhookId: string) => `${config.webhooks.n8n}/${webhookId}`
export const buildUploadUrl = (path: string) => `${config.uploads.base}/${path}`
export const buildIconUrl = (iconPath: string) => `${config.uploads.icons}/${iconPath}`

// Exportar tipos para TypeScript
export type Config = typeof config
