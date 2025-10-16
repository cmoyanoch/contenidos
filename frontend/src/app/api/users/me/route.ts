import { PrismaClient } from '@/generated/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient()

// GET - Obtener información del usuario actual
export async function GET() {
  try {
    const session = await getServerSession()

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener usuario con su rol
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString()
      }
    })

  } catch (error: any) {
    console.error('Error obteniendo usuario actual:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario', details: error.message },
      { status: 500 }
    )
  }
}
