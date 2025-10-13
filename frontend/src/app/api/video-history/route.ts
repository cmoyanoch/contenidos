import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'

// Instancia de Prisma para base de datos
const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // pending, processing, completed, failed

    // Validar parámetros
    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 })
    }

    if (limit > 100) {
      return NextResponse.json({
        error: 'Limit cannot exceed 100'
      }, { status: 400 })
    }

    // Construir filtros
    const whereClause: any = {
      userId: userId
    }

    if (status) {
      whereClause.status = status
    }

    // Obtener videos del usuario con paginación
    const [videoOperations, total] = await Promise.all([
      prisma.videoOperation.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.videoOperation.count({
        where: whereClause
      })
    ])

    console.log(`📋 Video history retrieved for user ${userId}:`, {
      total,
      returned: videoOperations.length,
      offset,
      limit
    })

    return NextResponse.json({
      success: true,
      data: videoOperations.map(op => ({
        id: op.id,
        operationId: op.operationId,
        prompt: op.prompt,
        status: op.status,
        progress: op.progress,
        videoUrl: op.videoUrl,
        imageUrl: op.imageUrl,
        errorMessage: op.errorMessage,
        metadata: op.metadata,
        createdAt: op.createdAt,
        updatedAt: op.updatedAt,
        user: op.user
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: (offset + limit) < total,
        nextOffset: (offset + limit) < total ? (offset + limit) : null
      }
    })

  } catch (error) {
    console.error('❌ Error retrieving video history:', error)

    return NextResponse.json({
      error: 'Error retrieving video history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Endpoint para obtener estadísticas del usuario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 })
    }

    // Obtener estadísticas del usuario
    const stats = await prisma.videoOperation.groupBy({
      by: ['status'],
      where: {
        userId: userId
      },
      _count: {
        status: true
      }
    })

    // Total de videos
    const totalVideos = await prisma.videoOperation.count({
      where: {
        userId: userId
      }
    })

    // Video más reciente
    const latestVideo = await prisma.videoOperation.findFirst({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        operationId: true,
        status: true,
        createdAt: true,
        videoUrl: true
      }
    })

    // Organizar estadísticas por status
    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      stats: {
        total: totalVideos,
        byStatus: {
          pending: statusCounts.pending || 0,
          processing: statusCounts.processing || 0,
          completed: statusCounts.completed || 0,
          failed: statusCounts.failed || 0
        },
        latestVideo: latestVideo
      }
    })

  } catch (error) {
    console.error('❌ Error retrieving video stats:', error)

    return NextResponse.json({
      error: 'Error retrieving video statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}