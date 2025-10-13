import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// Simulación de base de datos en memoria (en producción usar una DB real)
const webhooks: any[] = []

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = params
    const index = webhooks.findIndex(w => w.id === id)

    if (index === -1) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 })
    }

    webhooks.splice(index, 1)
    return NextResponse.json({ message: 'Webhook eliminado exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar webhook' }, { status: 500 })
  }
}