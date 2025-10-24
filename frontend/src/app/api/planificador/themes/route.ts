import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';
import { authOptions } from '../../../../lib/auth-config';

const prisma = new PrismaClient()

// GET - Obtener todas las temáticas del usuario
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
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const userId = user.id

    // Si es admin, mostrar todas las temáticas. Si es user, solo las propias
    const themes = await prisma.themePlanning.findMany({
      where: user.role === 'admin' ? {} : { userId },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json(themes)
  } catch (error) {
    console.error('Error fetching themes:', error)
    return NextResponse.json(
      { error: 'Error al obtener temáticas' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva temática
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { themeName, themeDescription, startDate, endDate } = body

    // Validaciones básicas
    if (!themeName || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Validar rango de fechas
    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()

    if (start < today) {
      return NextResponse.json(
        { error: 'La fecha de inicio no puede ser en el pasado' },
        { status: 400 }
      )
    }

    if (end <= start) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la de inicio' },
        { status: 400 }
      )
    }

    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 7) {
      return NextResponse.json(
        { error: 'El rango mínimo es de 1 semana' },
        { status: 400 }
      )
    }

    if (diffDays > 90) {
      return NextResponse.json(
        { error: 'El rango máximo es de 3 meses' },
        { status: 400 }
      )
    }

    // Verificar conflictos con temáticas existentes
    const existingThemes = await prisma.themePlanning.findMany({
      where: {
        userId,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } }
            ]
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } }
            ]
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } }
            ]
          }
        ]
      }
    })

    if (existingThemes.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una temática en ese rango de fechas' },
        { status: 400 }
      )
    }

    // Crear la temática
    const newTheme = await prisma.themePlanning.create({
      data: {
        userId,
        themeName,
        themeDescription,
        startDate: start,
        endDate: end
      }
    })

    // 🎯 NUEVO: Crear contenido automáticamente (sin webhook)
    try {
      console.log('🎯 Creando contenido automático para temática:', newTheme.id)

      const contentRecords = []
      const startDate = new Date(newTheme.startDate)
      const endDate = new Date(newTheme.endDate)

      // Configuración de contenido por día de la semana
      const weeklyContentSchedule = {
        1: { // Lunes
          contentType: 'video_person',
          scheduledTime: '10:00:00',
          socialNetworks: ['instagram', 'facebook'],
          formatId: 9
        },
        2: { // Martes
          contentType: 'image_stats',
          scheduledTime: '11:00:00',
          socialNetworks: ['instagram', 'facebook'],
          imageFormatId: 12
        },
        3: { // Miércoles
          contentType: 'video_avatar',
          scheduledTime: '13:00:00',
          socialNetworks: ['instagram', 'facebook'],
          formatId: 10
        },
        4: { // Jueves
          contentType: 'cta_post',
          scheduledTime: '11:30:00',
          socialNetworks: ['instagram', 'facebook'],
          formatId: 11
        },
        5: { // Viernes
          contentType: 'content_manual',
          scheduledTime: '10:00:00',
          socialNetworks: ['instagram', 'facebook'],
          imageFormatId: 13
        }
      }

      // Crear contenido para cada día hábil
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeekJS = d.getDay() // 0=Sunday, 1=Monday, etc.

        // Solo días hábiles (1-5) - convertir de JS (0-6) a formato (1-5)
        if (dayOfWeekJS >= 1 && dayOfWeekJS <= 5) {
          const dayConfig = weeklyContentSchedule[dayOfWeekJS as keyof typeof weeklyContentSchedule]

          if (dayConfig) {
            const contentRecord = await prisma.content_generated.create({
              data: {
                theme_id: newTheme.id,
                day_of_week: dayOfWeekJS,
                content_type: dayConfig.contentType,
                scheduled_time: new Date(`2000-01-01T${dayConfig.scheduledTime}`),
                scheduled_date: new Date(d),
                social_networks: dayConfig.socialNetworks,
                status: 'pending',
                format_id: 'formatId' in dayConfig ? dayConfig.formatId : null,
                image_format_id: 'imageFormatId' in dayConfig ? dayConfig.imageFormatId : null,
                format_type: 'formatId' in dayConfig ? 'video' : ('imageFormatId' in dayConfig ? 'image' : 'manual'),
                is_primary: true,
                usage_context: 'main_content',
                generation_params: {}
              }
            })

            contentRecords.push(contentRecord)
            console.log(`✅ Contenido creado para día ${dayOfWeekJS}:`, dayConfig.contentType)
          }
        }
      }

      console.log(`✅ ${contentRecords.length} registros de contenido creados para la temática ${newTheme.themeName}`)

    } catch (contentError) {
      console.error('❌ Error creando contenido automático:', contentError)
      // No fallar la creación de temática si el contenido falla
    }

    return NextResponse.json(newTheme, { status: 201 })
  } catch (error) {
    console.error('Error creating theme:', error)
    return NextResponse.json(
      { error: 'Error al crear temática' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar temática
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de temática requerido' },
        { status: 400 }
      )
    }

    // Verificar que la temática existe y pertenece al usuario
    const existingTheme = await prisma.themePlanning.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!existingTheme) {
      return NextResponse.json(
        { error: 'Temática no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la temática
    await prisma.themePlanning.delete({
      where: {
        id
      }
    })

    return NextResponse.json(
      { message: 'Temática eliminada exitosamente' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error al eliminar temática:', error)
    return NextResponse.json(
      { error: 'Error al eliminar temática' },
      { status: 500 }
    )
  }
}
