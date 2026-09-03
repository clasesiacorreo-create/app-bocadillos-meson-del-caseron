import { NextResponse } from 'next/server'
import { puedeConfirmarFranja } from '@/lib/estados'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { confirmarFranjaPedido } from '@/lib/pedidos/panel'
import type { FranjaSolicitada } from '@/lib/pedidos/tipos'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!puedeConfirmarFranja(perfil.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const franja = (await req.json()) as FranjaSolicitada
  const pedido = await confirmarFranjaPedido(id, franja)
  return NextResponse.json(pedido)
}
