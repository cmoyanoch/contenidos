import { PrismaClient } from '@/generated/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient()

// GET - Listar todos los usuarios
export async function GET() {
  try {
    const session = await getServerSession()

    // Verificar que el usuario está autenticado y es admin
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Solo admin puede listar usuarios
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email || '' }
    })

    if (currentUser?.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden ver usuarios.' },
        { status: 403 }
      )
    }

    // Obtener todos los usuarios con estadísticas
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            videoOperations: true,
            campaigns: true,
            themePlanning: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Formatear respuesta
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      totalVideos: user._count.videoOperations,
      totalCampaigns: user._count.campaigns,
      totalThemes: user._count.themePlanning
    }))

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length
    })

  } catch (error: any) {
    console.error('Error listando usuarios:', error)
    return NextResponse.json(
      { error: 'Error al listar usuarios', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo usuario
export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    // Verificar autenticación y permisos
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email || '' }
    })

    if (currentUser?.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden crear usuarios.' },
        { status: 403 }
      )
    }

    // Obtener datos del request
    const body = await request.json()
    const { email, name, password, role } = body

    // Validaciones
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y password son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Role debe ser "admin" o "user"' },
        { status: 400 }
      )
    }

    // Verificar que el email no existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Hashear password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        role: role || 'user'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: newUser
    })

  } catch (error: any) {
    console.error('Error creando usuario:', error)
    return NextResponse.json(
      { error: 'Error al crear usuario', details: error.message },
      { status: 500 }
    )
  }
}
