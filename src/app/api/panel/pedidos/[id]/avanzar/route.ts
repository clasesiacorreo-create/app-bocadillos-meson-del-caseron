import { NextResponse } from 'next/server'
import { transicionPermitida } from '@/lib/estados'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { avanzarEstadoPedido, obtenerPedidoPanelPorId } from '@/lib/pedidos/panel'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { EstadoPedido } from '@/lib/pedidos/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { aFase } = (await req.json()) as { aFase: EstadoPedido }

  const pedidoActual = await obtenerPedidoPanelPorId(crearClienteServicio(), id)
  if (!pedidoActual) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const estadoActual = pedidoActual.estado as EstadoPedido
  const modoEntrega = pedidoActual.modo_entrega as ModoEntrega
  if (!transicionPermitida(perfil.rol, estadoActual, aFase, modoEntrega)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const pedido = await avanzarEstadoPedido(id, estadoActual, aFase)
  if (!pedido) return NextResponse.json({ error: 'Otra persona ya movió este pedido' }, { status: 409 })
  return NextResponse.json(pedido)
}
