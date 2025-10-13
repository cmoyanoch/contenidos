import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// Función auxiliar para convertir archivo a base64
async function convertFileToBase64(file: any): Promise<string> {
  try {
    // En Node.js, el archivo de FormData ya tiene un método arrayBuffer()
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:${file.type};base64,${base64}`
  } catch (error) {
    console.error('Error converting file to base64:', error)
    throw new Error('Error al convertir archivo a base64')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Temporalmente deshabilitado para pruebas
    // const session = await getServerSession()
    // if (!session) {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // }

    // Verificar si es FormData o JSON
    const contentType = request.headers.get('content-type') || ''
    let body: any = {}
    let imageFile: any = null

    if (contentType.includes('multipart/form-data')) {
      // Es FormData - manejar archivo
      const formData = await request.formData()
      body = {
        workflowName: formData.get('workflowName') as string,
        contentInputType: formData.get('contentInputType') as string,
        inputMethod: formData.get('inputMethod') as string,
        prompt: formData.get('prompt') as string,
        imageUrl: formData.get('imageUrl') as string,
        aspectRatio: formData.get('aspectRatio') as string,
        resolution: formData.get('resolution') as string,
      }
      imageFile = formData.get('imageFile')
      console.log('🔍 Debug imageFile from FormData:', {
        exists: !!imageFile,
        type: typeof imageFile,
        constructor: imageFile?.constructor?.name,
        hasArrayBuffer: typeof imageFile?.arrayBuffer === 'function'
      })
    } else {
      // Es JSON - solo datos de texto/URL
      body = await request.json()
    }

    const {
      workflowName,
      contentInputType,
      inputMethod,
      prompt,
      imageUrl,
      aspectRatio,
      resolution
    } = body

    console.log('🚀 Ejecutando webhook N8N:', {
      workflowName,
      contentInputType,
      inputMethod,
      aspectRatio,
      resolution,
      hasImageFile: !!imageFile,
      imageFileType: imageFile ? typeof imageFile : 'undefined',
      contentTypeHeader: contentType
    })

    // Mapear workflowName a URL de webhook específica
    const webhookUrls: Record<string, string> = {
      'IMAGEN_A_VIDEO_SIMPLE': 'http://n8n:5678/webhook/8f3ed26d-69a1-4d67-8baf-a529fd76519f',
      'TEXTO_A_VIDEO_SIMPLE': 'http://n8n:5678/webhook/texto-a-video',
      // Agregar más workflows en el futuro
    }

    const n8nWebhookUrl = webhookUrls[workflowName]
    if (!n8nWebhookUrl) {
      return NextResponse.json({
        success: false,
        error: `Workflow '${workflowName}' no encontrado`
      }, { status: 400 })
    }

    // Preparar payload según el tipo de contenido
    let payload
    if (contentInputType === 'text') {
      payload = {
        prompt,
        aspectRatio,
        resolution,
        contentType: 'text-to-video'
      }
    } else {
      // Para imagen
      if (inputMethod === 'file' && imageFile) {
        // Validar que imageFile existe y tiene las propiedades necesarias
        if (!imageFile || typeof imageFile !== 'object') {
          return NextResponse.json({
            success: false,
            error: 'Archivo de imagen inválido - no es un objeto válido'
          }, { status: 400 })
        }

        // Validar propiedades del archivo (FormData File object)
        if (!imageFile.name || !imageFile.type) {
          return NextResponse.json({
            success: false,
            error: 'Archivo de imagen inválido - falta name o type'
          }, { status: 400 })
        }

        // Convertir archivo a base64
        const base64 = await convertFileToBase64(imageFile)
        payload = {
          prompt,
          imageData: base64,
          aspectRatio,
          resolution,
          contentType: 'image-to-video'
        }
      } else if (inputMethod === 'url' && imageUrl) {
        payload = {
          prompt,
          imageUrl,
          aspectRatio,
          resolution,
          contentType: 'image-to-video'
        }
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Datos de imagen requeridos' 
        }, { status: 400 })
      }
    }

    // CAMBIO: Llamar directamente al backend API en lugar de N8N
    console.log('🔄 Llamando directamente al backend API...')

    let apiPayload
    const apiEndpoint = 'http://api_google:8000/api/v1/generate/image-to-video-base64-json'

    if (contentInputType === 'text') {
      // Texto a video - endpoint directo (cuando esté disponible)
      return NextResponse.json({
        success: false,
        error: 'Text-to-video no implementado aún en llamada directa'
      }, { status: 501 })
    } else {
      // Imagen a video - usar endpoint directo
      apiPayload = {
        prompt: payload.prompt,
        image_base64: payload.imageData, // Base64 data ya procesado
        aspect_ratio: payload.aspectRatio,
        resolution: payload.resolution
      }
    }

    console.log('📡 Enviando al backend API:', {
      endpoint: apiEndpoint,
      prompt: apiPayload.prompt?.substring(0, 100) + '...',
      aspectRatio: apiPayload.aspect_ratio,
      resolution: apiPayload.resolution,
      hasImageData: !!apiPayload.image_base64
    })

    // Llamar directamente al backend API
    const apiResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error('❌ Error en backend API:', errorText)
      return NextResponse.json({
        success: false,
        error: `Error en backend API: ${apiResponse.status} ${apiResponse.statusText}`,
        details: errorText
      }, { status: 500 })
    }

    const apiResult = await apiResponse.json()
    console.log('✅ Respuesta del backend API:', apiResult)

    return NextResponse.json({
      success: true,
      message: 'Video generación iniciada exitosamente',
      operationId: apiResult.operation_id,  // ✅ UUID real del backend
      result: apiResult
    })

  } catch (error: any) {
    console.error('❌ Error ejecutando webhook N8N:', error)
    return NextResponse.json({
      success: false,
      error: `Error interno: ${error.message}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
