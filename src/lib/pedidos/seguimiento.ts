import { obtenerEstadoSesion } from '@/lib/pagos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import { confirmarPagoDePedido } from './confirmar'
import type { EstadoPedido, PedidoConLineas } from './tipos'

export type EstadoSeguimiento = {
  codigoPublico: string
  estado: EstadoPedido
  modoEntrega: ModoEntrega
  franjaSolicitada: { inicio: string; fin: string; asap: boolean }
  franjaConfirmada: { inicio: string; fin: string } | null
  lineas: { nombreArticulo: string; nombreTamano: string; cantidad: number; extras: string[] }[]
  totalCentimos: number
  telefonoRestaurante: string
}

const SELECT_CON_LINEAS = '*, pedido_lineas(*, pedido_extras(*))'

function mapearParaCliente(pedido: PedidoConLineas, telefonoRestaurante: string): EstadoSeguimiento {
  return {
    codigoPublico: pedido.codigo_publico,
    estado: pedido.estado as EstadoPedido,
    modoEntrega: pedido.modo_entrega as ModoEntrega,
    franjaSolicitada: {
      inicio: pedido.franja_solicitada_inicio,
      fin: pedido.franja_solicitada_fin,
      asap: pedido.franja_solicitada_asap,
    },
    franjaConfirmada:
      pedido.franja_confirmada_inicio && pedido.franja_confirmada_fin
        ? { inicio: pedido.franja_confirmada_inicio, fin: pedido.franja_confirmada_fin }
        : null,
    lineas: pedido.pedido_lineas.map((linea) => ({
      nombreArticulo: linea.nombre_articulo,
      nombreTamano: linea.nombre_tamano,
      cantidad: linea.cantidad,
      extras: linea.pedido_extras.map((extra) => extra.nombre_extra),
    })),
    totalCentimos: pedido.total_centimos,
    telefonoRestaurante,
  }
}

/**
 * Lee el pedido por su código público. Si sigue en `pendiente_pago`, es la
 * red de seguridad: consulta a Stripe directamente por si el webhook no ha
 * llegado todavía. Un cliente que ha pagado y un pedido que nadie prepara es
 * el peor fallo posible, así que la confirmación tiene dos caminos.
 */
export async function obtenerEstadoPedido(codigo: string): Promise<EstadoSeguimiento | null> {
  const supabase = crearClienteServicio()

  const [{ data: pedido, error }, { data: ajustes, error: errorAjustes }] = await Promise.all([
    supabase.from('pedidos').select(SELECT_CON_LINEAS).eq('codigo_publico', codigo).maybeSingle(),
    supabase.from('ajustes').select('telefono').single(),
  ])

  if (error) throw error
  if (errorAjustes) throw errorAjustes
  if (!pedido) return null

  let pedidoActual = pedido as PedidoConLineas

  if (pedidoActual.estado === 'pendiente_pago' && pedidoActual.stripe_session_id) {
    const estadoSesion = await obtenerEstadoSesion(pedidoActual.stripe_session_id)
    if (estadoSesion.pagada && estadoSesion.paymentIntent) {
      const confirmado = await confirmarPagoDePedido(pedidoActual.stripe_session_id, estadoSesion.paymentIntent)
      if (confirmado) pedidoActual = confirmado
    }
  }

  return mapearParaCliente(pedidoActual, ajustes.telefono)
}
