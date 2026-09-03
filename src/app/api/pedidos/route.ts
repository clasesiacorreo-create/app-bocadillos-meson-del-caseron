import { NextRequest, NextResponse } from 'next/server'
import { asociarSesionPago, crearPedidoPendiente } from '@/lib/pedidos/crear'
import type { SolicitudPedido } from '@/lib/pedidos/tipos'
import { crearSesionCheckout } from '@/lib/pagos'

export async function POST(req: NextRequest) {
  try {
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
  } catch (error) {
    // Un fallo de Supabase, de Stripe o un cuerpo malformado no debe tumbar
    // el proceso ni devolver el HTML de error por defecto de Next: el
    // cliente espera siempre JSON con { ok: false, error }.
    console.error('Error creando el pedido:', error)
    return NextResponse.json({ ok: false, error: { tipo: 'error_servidor' } }, { status: 500 })
  }
}
