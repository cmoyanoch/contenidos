import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'

// Instancia de Prisma para base de datos
const prisma = new PrismaClient()

// GET - Obtener campaña específica con detalles completos
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Validar parámetros
    if (!campaignId) {
      return NextResponse.json({
        error: 'Campaign ID is required'
      }, { status: 400 })
    }

    // Buscar campaña con todos los detalles
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        videoOperations: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json({
        error: 'Campaign not found'
      }, { status: 404 })
    }

    // Verificar acceso del usuario (si se proporciona userId)
    if (userId && campaign.userId !== userId) {
      return NextResponse.json({
        error: 'Access denied'
      }, { status: 403 })
    }

    // Calcular estadísticas de la campaña
    const stats = {
      totalVideos: campaign.videoOperations.length,
      completedVideos: campaign.videoOperations.filter(v => v.status === 'completed').length,
      processingVideos: campaign.videoOperations.filter(v => v.status === 'processing').length,
      failedVideos: campaign.videoOperations.filter(v => v.status === 'failed').length,
      pendingVideos: campaign.videoOperations.filter(v => v.status === 'pending').length,
      progress: campaign.totalVideos > 0 ?
        Math.round((campaign.videoOperations.filter(v => v.status === 'completed').length / campaign.totalVideos) * 100) : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        stats
      }
    })

  } catch (error) {
    console.error('❌ Error retrieving campaign:', error)
    return NextResponse.json({
      error: 'Error retrieving campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Actualizar campaña
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const body = await request.json()
    const {
      name,
      description,
      status,
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
      priority,
      userId
    } = body

    // Verificar que la campaña existe
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!existingCampaign) {
      return NextResponse.json({
        error: 'Campaign not found'
      }, { status: 404 })
    }

    // Verificar acceso del usuario
    if (userId && existingCampaign.userId !== userId) {
      return NextResponse.json({
        error: 'Access denied'
      }, { status: 403 })
    }

    // Validar status si se proporciona
    if (status) {
      const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        }, { status: 400 })
      }
    }

    // Validar plataformas si se proporcionan
    if (targetPlatforms) {
      const validPlatforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'twitter']
      const invalidPlatforms = targetPlatforms.filter((p: string) => !validPlatforms.includes(p))
      if (invalidPlatforms.length > 0) {
        return NextResponse.json({
          error: `Invalid platforms: ${invalidPlatforms.join(', ')}`
        }, { status: 400 })
      }
    }

    // Preparar datos para actualización
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (targetPlatforms !== undefined) updateData.targetPlatforms = targetPlatforms
    if (aspectRatio !== undefined) updateData.aspectRatio = aspectRatio
    if (duration !== undefined) updateData.duration = duration
    if (promptTemplate !== undefined) updateData.promptTemplate = promptTemplate
    if (characterStyle !== undefined) updateData.characterStyle = characterStyle
    if (brandGuidelines !== undefined) updateData.brandGuidelines = brandGuidelines
    if (scheduledStart !== undefined) updateData.scheduledStart = scheduledStart ? new Date(scheduledStart) : null
    if (scheduledEnd !== undefined) updateData.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : null
    if (frequency !== undefined) updateData.frequency = frequency
    if (totalVideos !== undefined) updateData.totalVideos = totalVideos
    if (tags !== undefined) updateData.tags = tags
    if (priority !== undefined) updateData.priority = priority

    // Actualizar campaña
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            videoOperations: true
          }
        }
      }
    })

    console.log(`✅ Campaign updated:`, {
      id: updatedCampaign.id,
      name: updatedCampaign.name,
      status: updatedCampaign.status
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign updated successfully',
      data: updatedCampaign
    })

  } catch (error) {
    console.error('❌ Error updating campaign:', error)
    return NextResponse.json({
      error: 'Error updating campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Eliminar campaña
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Verificar que la campaña existe
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: {
          select: {
            videoOperations: true
          }
        }
      }
    })

    if (!existingCampaign) {
      return NextResponse.json({
        error: 'Campaign not found'
      }, { status: 404 })
    }

    // Verificar acceso del usuario
    if (userId && existingCampaign.userId !== userId) {
      return NextResponse.json({
        error: 'Access denied'
      }, { status: 403 })
    }

    // Eliminar campaña (esto pondrá campaignId a null en video_operations debido a onDelete: SetNull)
    await prisma.campaign.delete({
      where: { id: campaignId }
    })

    console.log(`🗑️ Campaign deleted:`, {
      id: campaignId,
      name: existingCampaign.name,
      videosAffected: existingCampaign._count.videoOperations
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
      videosAffected: existingCampaign._count.videoOperations
    })

  } catch (error) {
    console.error('❌ Error deleting campaign:', error)
    return NextResponse.json({
      error: 'Error deleting campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
