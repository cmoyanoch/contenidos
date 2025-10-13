import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// Simulación de base de datos en memoria (en producción usar una DB real)
const webhooks: any[] = []

export async function GET() {
  try {
    return NextResponse.json(webhooks)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener webhooks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const newWebhook = {
      id: Date.now().toString(),
      ...body,
      created_at: new Date().toISOString(),
      last_executed: null
    }

    webhooks.push(newWebhook)
    return NextResponse.json(newWebhook, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear webhook' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const index = webhooks.findIndex(w => w.id === body.id)

    if (index === -1) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 })
    }

    webhooks[index] = { ...webhooks[index], ...body, updated_at: new Date().toISOString() }
    return NextResponse.json(webhooks[index])
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar webhook' }, { status: 500 })
  }
}