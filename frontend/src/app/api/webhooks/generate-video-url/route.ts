import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, image_url, aspect_ratio, resolution } = body

    // Validar datos requeridos
    if (!prompt || !image_url) {
      return NextResponse.json({
        error: 'Prompt e imagen URL son requeridos'
      }, { status: 400 })
    }

    console.log('🎬 Iniciando generación de video desde imagen URL')
    console.log('📝 Prompt:', prompt)
    console.log('🔗 URL imagen:', image_url)
    console.log('📐 Aspecto:', aspect_ratio)
    console.log('🎯 Resolución:', resolution)

    // Preparar URL de imagen
    let finalImageUrl = image_url

    // Si es una ruta relativa, convertirla a URL absoluta del proyecto
    if (image_url.startsWith('/')) {
      // Asumir que las rutas relativas son del proyecto local
      finalImageUrl = `http://localhost:3000${image_url}`
    }

    console.log('🌐 URL final de imagen:', finalImageUrl)

    // Llamar a la API de Google Veo con URL de imagen
    const veoResponse = await fetch('http://api_google:8000/api/v1/generate/image-to-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_url: finalImageUrl,
        aspect_ratio: aspect_ratio || '16:9',
        resolution: resolution || '720p'
      }),
    })

    if (!veoResponse.ok) {
      const errorData = await veoResponse.text()
      console.error('❌ Error de API Veo:', errorData)
      return NextResponse.json({
        success: false,
        error: `Error en la API de Veo: ${veoResponse.status} ${veoResponse.statusText}`,
        details: errorData
      }, { status: veoResponse.status })
    }

    const veoData = await veoResponse.json()
    console.log('✅ Respuesta de API Veo:', veoData)

    return NextResponse.json({
      success: true,
      message: 'Video en cola de generación',
      operation_id: veoData.operation_id,
      status: veoData.status,
      image_url_used: finalImageUrl,
      webhook_executed_at: new Date().toISOString(),
      api_response: veoData
    })

  } catch (error: any) {
    console.error('❌ Error en webhook de generación de video desde URL:', error)
    return NextResponse.json({
      success: false,
      error: `Error interno: ${error.message}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}