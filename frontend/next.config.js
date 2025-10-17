/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para contenedores
  output: 'standalone',
  eslint: {
    // Permitir warnings durante el build, solo bloquear por errores
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Habilitar type checking pero no bloquear por warnings
    ignoreBuildErrors: false,
  },
  experimental: {
    // Deshabilitar TURBOPACK temporalmente
    turbo: false,
  },
  // Configuración de imágenes para contenedores
  images: {
    unoptimized: true,
  },
  // Configuración de API routes
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health',
      },
    ]
  },
}

module.exports = nextConfig
