import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'

// Instancia de Prisma para base de datos
const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operationId, status, videoUrl, message, prompt, userId } = body

    console.log(`📹 Video webhook received:`, {
      operationId,
      status,
      hasVideoUrl: !!videoUrl,
      userId: userId || 'unknown'
    })

    // Validar datos requeridos
    if (!operationId) {
      return NextResponse.json({
        error: 'Operation ID is required'
      }, { status: 400 })
    }

    // Actualizar o crear registro en video_operations
    const videoOperation = await prisma.videoOperation.upsert({
      where: {
        operationId: operationId
      },
      update: {
        status: status || 'completed',
        videoUrl: videoUrl,
        error: status === 'failed' ? message : null,
        updatedAt: new Date()
      },
      create: {
        operationId: operationId,
        userId: userId || null, // ✅ Permitir null si no hay userId
        prompt: prompt || 'Generated via N8N webhook',
        status: status || 'completed',
        videoUrl: videoUrl,
        error: status === 'failed' ? message : null
      }
    })

    console.log(`✅ Video operation updated in database:`, {
      id: videoOperation.id,
      status: videoOperation.status,
      userId: videoOperation.userId
    })

    return NextResponse.json({
      success: true,
      message: 'Video completion recorded in database',
      operationId: videoOperation.id,
      status: videoOperation.status
    })

  } catch (error) {
    console.error('❌ Error recording video completion:', error)

    // Log detallado del error
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }

    return NextResponse.json({
      error: 'Error recording completion in database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')
    const userId = searchParams.get('userId')

    if (!operationId) {
      return NextResponse.json({
        error: 'Operation ID required'
      }, { status: 400 })
    }

    // Buscar video operation en base de datos
    const videoOperation = await prisma.videoOperation.findUnique({
      where: {
        operationId: operationId
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

    if (!videoOperation) {
      // Si no existe en DB, puede estar aún procesando
      return NextResponse.json({
        operationId,
        status: 'processing',
        message: 'Video still processing or not found'
      })
    }

    // Verificar si el usuario tiene acceso (si se proporciona userId)
    if (userId && videoOperation.userId !== userId && videoOperation.userId !== 'system') {
      return NextResponse.json({
        error: 'Access denied'
      }, { status: 403 })
    }

    return NextResponse.json({
      operationId: videoOperation.id,
      status: videoOperation.status,
      videoUrl: videoOperation.videoUrl,
      prompt: videoOperation.prompt,
      errorMessage: videoOperation.errorMessage,
      createdAt: videoOperation.createdAt,
      completedAt: videoOperation.updatedAt,
      user: videoOperation.user ? {
        id: videoOperation.user.id,
        name: videoOperation.user.name,
        email: videoOperation.user.email
      } : null
    })

  } catch (error) {
    console.error('❌ Error checking video status:', error)

    return NextResponse.json({
      error: 'Error checking status in database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
