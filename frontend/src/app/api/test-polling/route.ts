import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')

    if (!operationId) {
      return NextResponse.json({ error: 'Operation ID required' }, { status: 400 })
    }

    console.log(`🔍 Test polling para operación: ${operationId}`)

    // Simular exactamente lo que hace el frontend
    const response = await fetch(`http://api_google:8000/api/v1/status/${operationId}`)
    const apiData = await response.json()

    console.log(`📊 Datos de la API:`, apiData)

    // Transformar la estructura para que coincida con lo que espera el frontend
    const data = {
      operationId: apiData.operation_id,
      status: apiData.status,
      videoUrl: apiData.video_url,
      message: apiData.error_message || (apiData.status === 'completed' ? 'Video generation completed successfully' : 'Video still processing'),
      completedAt: apiData.completed_at ? new Date(apiData.completed_at * 1000).toISOString() : null
    }

    console.log(`✅ Datos transformados:`, data)

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('❌ Error en test polling:', error)
    return NextResponse.json({
      error: 'Error checking status from API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
