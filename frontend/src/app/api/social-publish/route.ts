import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { content, contentType, imageUrl, videoUrl, platforms } = body

    console.log('🚀 Publicando en RRSS:', { contentType, platforms })

    // Llamar a la API de RRSS
    const response = await fetch('http://api_rrss:8002/api/v1/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        contentType,
        imageUrl,
        videoUrl,
        platforms,
        userEmail: session.user?.email
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error en API RRSS:', errorText)
      return NextResponse.json({
        success: false,
        error: `Error en publicación: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: 500 })
    }

    const result = await response.json()
    console.log('✅ Publicación exitosa:', result)

    return NextResponse.json({
      success: true,
      message: 'Contenido publicado exitosamente',
      result,
      publishedAt: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error publicando en RRSS:', error)
    return NextResponse.json({
      success: false,
      error: `Error interno: ${error.message}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
