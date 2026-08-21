import { NextResponse } from 'next/server'
import { obtenerEstadoPedido } from '@/lib/pedidos/seguimiento'

export async function GET(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const estado = await obtenerEstadoPedido(codigo)
  if (!estado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(estado)
}
