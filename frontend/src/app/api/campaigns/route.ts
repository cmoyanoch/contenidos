import { PrismaClient } from '@/generated/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Instancia de Prisma para base de datos
const prisma = new PrismaClient()

// GET - Listar campañas del usuario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') // draft, active, paused, completed, archived
    const type = searchParams.get('type') // ugc_video, social_media, continuous_content
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validar parámetros
    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 })
    }

    if (limit > 50) {
      return NextResponse.json({
        error: 'Limit cannot exceed 50'
      }, { status: 400 })
    }

    // Construir filtros
    const whereClause: Record<string, unknown> = {
      userId: userId
    }

    if (status) {
      whereClause.status = status
    }

    if (type) {
      whereClause.type = type
    }

    // Obtener campañas con estadísticas
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
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
          },
          videoOperations: {
            select: {
              id: true,
              status: true,
              videoUrl: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5 // Solo últimos 5 videos por campaña
          },
          _count: {
            select: {
              videoOperations: true
            }
          }
        }
      }),
      prisma.campaign.count({
        where: whereClause
      })
    ])

    console.log(`📋 Campaigns retrieved for user ${userId}:`, {
      total,
      returned: campaigns.length,
      filters: { status, type }
    })

    return NextResponse.json({
      success: true,
      data: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        type: campaign.type,
        targetPlatforms: campaign.targetPlatforms,
        aspectRatio: campaign.aspectRatio,
        duration: campaign.duration,
        promptTemplate: campaign.promptTemplate,
        characterStyle: campaign.characterStyle,
        brandGuidelines: campaign.brandGuidelines,
        scheduledStart: campaign.scheduledStart,
        scheduledEnd: campaign.scheduledEnd,
        frequency: campaign.frequency,
        totalVideos: campaign.totalVideos,
        tags: campaign.tags,
        priority: campaign.priority,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        user: campaign.user,
        stats: {
          totalVideos: campaign._count.videoOperations,
          recentVideos: campaign.videoOperations
        }
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
    console.error('❌ Error retrieving campaigns:', error)
    return NextResponse.json({
      error: 'Error retrieving campaigns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Crear nueva campaña
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      name,
      description,
      type,
      targetPlatforms,
      aspectRatio,
      duration,
      promptTemplate,
      characterStyle,
      brandGuidelines,
      scheduledStart,
      scheduledEnd,
      frequency,
      totalVideos,
      tags,
      priority
    } = body

    // Validaciones básicas
    if (!userId || !name || !type) {
      return NextResponse.json({
        error: 'userId, name, and type are required'
      }, { status: 400 })
    }

    // Validar tipo de campaña
    const validTypes = ['ugc_video', 'social_media', 'continuous_content']
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        error: `Invalid campaign type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    // Validar plataformas
    const validPlatforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'twitter']
    if (targetPlatforms && !Array.isArray(targetPlatforms)) {
      return NextResponse.json({
        error: 'targetPlatforms must be an array'
      }, { status: 400 })
    }

    if (targetPlatforms) {
      const invalidPlatforms = targetPlatforms.filter((p: string) => !validPlatforms.includes(p))
      if (invalidPlatforms.length > 0) {
        return NextResponse.json({
          error: `Invalid platforms: ${invalidPlatforms.join(', ')}. Valid platforms: ${validPlatforms.join(', ')}`
        }, { status: 400 })
      }
    }

    // Crear campaña
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name,
        description,
        type,
        targetPlatforms: targetPlatforms || ['instagram'],
        aspectRatio: aspectRatio || '9:16',
        duration: duration || 8,
        promptTemplate,
        characterStyle,
        brandGuidelines,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        frequency,
        totalVideos: totalVideos || 1,
        tags: tags || [],
        priority: priority || 5,
        status: 'draft' // Siempre inicia como draft
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log(`✅ Campaign created:`, {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      userId: campaign.userId
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating campaign:', error)
    return NextResponse.json({
      error: 'Error creating campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
