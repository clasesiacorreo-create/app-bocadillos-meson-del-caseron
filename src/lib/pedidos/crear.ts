import { randomBytes } from 'node:crypto'
import { obtenerCarta, obtenerReglas } from '@/lib/carta/consultas'
import { calcularResumen } from '@/lib/precios'
import type { LineaCarrito } from '@/lib/precios/tipos'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { ErrorValidacionPedido, PedidoCreado, SolicitudPedido } from './tipos'
import { validarLineas } from './validacion'

function generarCodigoPublico(): string {
  // Aleatorio, no correlativo: un correlativo permitiría leer los pedidos de
  // los demás sumando uno al propio.
  return randomBytes(6).toString('base64url')
}

export async function crearPedidoPendiente(
  solicitud: SolicitudPedido,
): Promise<{ ok: true; pedido: PedidoCreado } | { ok: false; error: ErrorValidacionPedido }> {
  const carta = await obtenerCarta()
  const errorDisponibilidad = validarLineas(carta, solicitud.lineas)
  if (errorDisponibilidad) return { ok: false, error: errorDisponibilidad }

  const reglas = await obtenerReglas()
  const lineasParaResumen: LineaCarrito[] = solicitud.lineas.map((linea) => ({
    articuloId: linea.articuloId,
    tamanoId: linea.tamanoId,
    precioUnitarioCentimos: linea.precioUnitarioCentimos,
    extras: linea.extras,
    cantidad: linea.cantidad,
  }))
  const resumen = calcularResumen(lineasParaResumen, solicitud.modoEntrega, reglas)

  if (!resumen.alcanzaMinimo) {
    return { ok: false, error: { tipo: 'bajo_minimo', faltaCentimos: resumen.faltaParaMinimoCentimos } }
  }

  const supabase = crearClienteServicio()

  // El código público es único; en la práctica nunca colisiona, pero se
  // reintenta un par de veces por si acaso en lugar de dejar caer el pedido.
  for (let intento = 0; intento < 3; intento++) {
    const codigoPublico = generarCodigoPublico()
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({
        codigo_publico: codigoPublico,
        estado: 'pendiente_pago',
        modo_entrega: solicitud.modoEntrega,
        cliente_nombre: solicitud.contacto.nombre,
        cliente_apellidos: solicitud.contacto.apellidos,
        cliente_telefono: solicitud.contacto.telefono,
        direccion_calle: solicitud.direccion?.calle ?? null,
        direccion_numero: solicitud.direccion?.numero ?? null,
        direccion_piso: solicitud.direccion?.piso ?? null,
        direccion_cp: solicitud.direccion?.cp ?? null,
        direccion_ciudad: solicitud.direccion?.ciudad ?? null,
        direccion_indicaciones: solicitud.direccion?.indicaciones ?? null,
        notas: solicitud.notas,
        franja_solicitada_inicio: solicitud.franjaSolicitada.inicio,
        franja_solicitada_fin: solicitud.franjaSolicitada.fin,
        franja_solicitada_asap: solicitud.franjaSolicitada.loAntesPosible,
        subtotal_centimos: resumen.subtotalCentimos,
        envio_centimos: resumen.envioCentimos,
        total_centimos: resumen.totalCentimos,
      })
      .select('id')
      .single()

    if (error?.code === '23505') continue // codigo_publico colisionó, reintenta
    if (error) throw error

    for (const linea of solicitud.lineas) {
      const { data: lineaFila, error: errorLinea } = await supabase
        .from('pedido_lineas')
        .insert({
          pedido_id: pedido.id,
          articulo_id: linea.articuloId,
          tamano_id: linea.tamanoId,
          nombre_articulo: linea.nombreArticulo,
          nombre_tamano: linea.nombreTamano,
          precio_unitario_centimos: linea.precioUnitarioCentimos,
          cantidad: linea.cantidad,
          notas_linea: linea.notasLinea,
        })
        .select('id')
        .single()
      if (errorLinea) throw errorLinea

      if (linea.extras.length > 0) {
        const { error: errorExtras } = await supabase.from('pedido_extras').insert(
          linea.extras.map((extra) => ({
            linea_id: lineaFila.id,
            extra_id: extra.extraId,
            nombre_extra: extra.nombre,
            precio_centimos: extra.precioCentimos,
          })),
        )
        if (errorExtras) throw errorExtras
      }
    }

    return {
      ok: true,
      pedido: {
        id: pedido.id,
        codigoPublico,
        subtotalCentimos: resumen.subtotalCentimos,
        envioCentimos: resumen.envioCentimos,
        totalCentimos: resumen.totalCentimos,
      },
    }
  }

  throw new Error('No se pudo generar un código de pedido único tras varios intentos.')
}

export async function asociarSesionPago(pedidoId: string, stripeSessionId: string): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase
    .from('pedidos')
    .update({ stripe_session_id: stripeSessionId })
    .eq('id', pedidoId)
  if (error) throw error
}
