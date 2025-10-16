import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../../generated/prisma';

const prisma = new PrismaClient()

// GET - Obtener temática activa para una fecha específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    // Si no se proporciona fecha, usar la fecha actual
    const targetDate = dateParam ? new Date(dateParam) : new Date()

    // TODO: Obtener userId del session/token cuando implementes autenticación
    const userId = 'cmg1t7jry0004qd01fb6eu3bo' // Usuario cristian moyano

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
