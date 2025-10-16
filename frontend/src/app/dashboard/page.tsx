import VideoHistory from '@/components/video-history';
import { PrismaClient } from '@/generated/prisma';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient()

export default async function DashboardPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/')
  }

  // Verificar el rol del usuario
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
    select: { role: true }
  })

  // Si el usuario no es admin, redirigir a planificador
  if (user?.role !== 'admin') {
    redirect('/planificador')
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Gestiona tu contenido generado con IA</p>
        </div>
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel de Generación */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Crear Nuevo Contenido
                </h2>
                <p className="text-gray-600 mb-4">
                  Genera videos, modifica imágenes y automatiza workflows con inteligencia artificial
                </p>
                <Link
                  href="/generate"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Crear Contenido
                </Link>
              </div>
            </div>

            {/* Historial de Contenido */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Mi Contenido
                </h2>
                <VideoHistory />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
