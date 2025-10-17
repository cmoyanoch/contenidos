import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../../generated/prisma';
import { authOptions } from '../../../../../lib/auth-config';

const prisma = new PrismaClient()

// GET - Obtener temática activa para una fecha específica
export async function GET(request: NextRequest) {
  try {
    // Obtener sesión del usuario autenticado
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener el usuario de la base de datos
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const userId = user.id

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    // Si no se proporciona fecha, usar la fecha actual
    const targetDate = dateParam ? new Date(dateParam) : new Date()

    // Buscar temática que esté activa en la fecha especificada
    const activeTheme = await prisma.themePlanning.findFirst({
      where: {
        userId,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      },
      orderBy: { startDate: 'desc' } // Si hay múltiples, tomar la más reciente
    })

    if (!activeTheme) {
      return NextResponse.json(
        {
          message: 'No hay temática activa para la fecha especificada',
          date: targetDate.toISOString(),
          theme: null
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Temática activa encontrada',
      date: targetDate.toISOString(),
      theme: activeTheme
    })

  } catch (error) {
    console.error('Error fetching theme by date:', error)
    return NextResponse.json(
      { error: 'Error al obtener temática por fecha' },
      { status: 500 }
    )
  }
}
