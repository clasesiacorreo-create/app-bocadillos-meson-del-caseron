import { randomBytes } from 'node:crypto'
import { obtenerAjustesHorario, obtenerCarta, obtenerReglas } from '@/lib/carta/consultas'
import type { Carta } from '@/lib/carta/tipos'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'
import { calcularResumen } from '@/lib/precios'
import type { LineaCarrito } from '@/lib/precios/tipos'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { ErrorValidacionPedido, PedidoCreado, SolicitudPedido } from './tipos'
import { validarDatosContacto, validarFranja, validarLineas } from './validacion'

function generarCodigoPublico(): string {
  // Aleatorio, no correlativo: un correlativo permitiría leer los pedidos de
  // los demás sumando uno al propio.
  return randomBytes(6).toString('base64url')
}

/**
 * Los totales se calculan siempre en el servidor, releyendo precios de la
 * base de datos; los importes que llegan del navegador se ignoran. Esta
 * función sustituye el precio de la línea y de cada extra —tal y como los
 * envía el cliente— por el precio real de la carta recién leída, buscando
 * por articuloId + tamanoId (y extraId + tamanoId para los extras).
 * `validarLineas` ya ha confirmado que estas combinaciones existen y están
 * disponibles, así que aquí se puede asumir que la búsqueda no falla salvo
 * error de programación.
 */
function conPreciosVerificados(carta: Carta, linea: LineaParaCarrito): LineaParaCarrito {
  const articulo = carta.categorias.flatMap((categoria) => categoria.articulos).find((a) => a.id === linea.articuloId)
  if (!articulo) {
    throw new Error(`Artículo ${linea.articuloId} no encontrado en la carta tras pasar validarLineas.`)
  }

  const tamano = articulo.tamanos.find((t) => t.id === linea.tamanoId)
  if (!tamano) {
    throw new Error(`Tamaño ${linea.tamanoId} no encontrado en el artículo ${linea.articuloId} tras pasar validarLineas.`)
  }

  const extras = linea.extras.map((extra) => {
    const extraDeCarta = articulo.extras.find((e) => e.id === extra.extraId)
    const precioCentimos = extraDeCarta?.precioPorTamanoId[linea.tamanoId]
    if (extraDeCarta === undefined || precioCentimos === undefined) {
      throw new Error(`Extra ${extra.extraId} no encontrado para el tamaño ${linea.tamanoId} tras pasar validarLineas.`)
    }
    return { ...extra, precioCentimos }
  })

  return { ...linea, precioUnitarioCentimos: tamano.precioCentimos, extras }
}

export async function crearPedidoPendiente(
  solicitud: SolicitudPedido,
): Promise<{ ok: true; pedido: PedidoCreado } | { ok: false; error: ErrorValidacionPedido }> {
  const errorDatosContacto = validarDatosContacto(solicitud.modoEntrega, solicitud.contacto, solicitud.direccion)
  if (errorDatosContacto) return { ok: false, error: errorDatosContacto }

  const carta = await obtenerCarta()
  const errorDisponibilidad = validarLineas(carta, solicitud.lineas)
  if (errorDisponibilidad) return { ok: false, error: errorDisponibilidad }

  const reglas = await obtenerReglas()
  // Las líneas con precios verificados contra la carta son la única fuente
  // usada de aquí en adelante, tanto para calcular el resumen como para las
  // filas que se insertan más abajo: nunca los precios que llegaron en `solicitud`.
  const lineasVerificadas = solicitud.lineas.map((linea) => conPreciosVerificados(carta, linea))
  const lineasParaResumen: LineaCarrito[] = lineasVerificadas.map((linea) => ({
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

  const ajustesHorario = await obtenerAjustesHorario()
  const errorFranja = validarFranja(ajustesHorario, solicitud.franjaSolicitada, new Date())
  if (errorFranja) return { ok: false, error: errorFranja }

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

    for (const linea of lineasVerificadas) {
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
      // Nota: si esta inserción o la de pedido_extras falla habiendo ya
      // creado la fila en `pedidos` (y, en líneas posteriores del bucle,
      // filas de pedido_lineas previas), esas filas quedan huérfanas como
      // un pedido "pendiente_pago" incompleto. No hay pago de por medio
      // todavía, así que no hay perjuicio económico, pero sí un pedido
      // fantasma que limpiar más adelante; ese mecanismo de limpieza queda
      // fuera del alcance de esta tarea.
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
        lineasVerificadas,
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
