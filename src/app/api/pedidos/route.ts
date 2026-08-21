import { NextRequest, NextResponse } from 'next/server'
import { asociarSesionPago, crearPedidoPendiente } from '@/lib/pedidos/crear'
import type { SolicitudPedido } from '@/lib/pedidos/tipos'
import { crearSesionCheckout } from '@/lib/pagos'

export async function POST(req: NextRequest) {
  const solicitud = (await req.json()) as SolicitudPedido

  const resultado = await crearPedidoPendiente(solicitud)
  if (!resultado.ok) {
    return NextResponse.json({ ok: false, error: resultado.error }, { status: 422 })
  }

  const sesion = await crearSesionCheckout({
    codigoPublico: resultado.pedido.codigoPublico,
    lineas: resultado.pedido.lineasVerificadas,
    envioCentimos: resultado.pedido.envioCentimos,
    origen: req.nextUrl.origin,
  })
  await asociarSesionPago(resultado.pedido.id, sesion.id)

  return NextResponse.json({ ok: true, urlPago: sesion.url })
}
