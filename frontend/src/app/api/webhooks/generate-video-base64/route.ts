import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, image_data, content_type, aspect_ratio, resolution } = body

    // Validar datos requeridos
    if (!prompt || !image_data) {
      return NextResponse.json({
        error: 'Prompt e imagen son requeridos'
      }, { status: 400 })
    }

    console.log('🎬 Iniciando generación de video desde imagen base64')
    console.log('📝 Prompt:', prompt)
    console.log('📐 Aspecto:', aspect_ratio)
    console.log('🎯 Resolución:', resolution)

    // Llamar a la API de Google Veo con imagen base64
    const veoResponse = await fetch('http://api_google:8000/api/v1/generate/image-to-video-base64-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_data,
        content_type,
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
      webhook_executed_at: new Date().toISOString(),
      api_response: veoData
    })

  } catch (error: any) {
    console.error('❌ Error en webhook de generación de video:', error)
    return NextResponse.json({
      success: false,
      error: `Error interno: ${error.message}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}