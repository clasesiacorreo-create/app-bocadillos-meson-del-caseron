import { formatearHoraFranja } from '@/lib/horario'
import { formatearPrecio } from '@/lib/dinero'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'

function construirMensaje(pedido: PedidoConLineas): string {
  const lineas = pedido.pedido_lineas
    .map((linea) => `${linea.cantidad}× ${linea.nombre_articulo} (${linea.nombre_tamano})`)
    .join('\n')

  const franja = pedido.franja_solicitada_asap
    ? 'lo antes posible'
    : `${formatearHoraFranja(pedido.franja_solicitada_inicio)}–${formatearHoraFranja(pedido.franja_solicitada_fin)}`

  return [
    `Pedido ${pedido.codigo_publico}`,
    `${pedido.modo_entrega === 'domicilio' ? 'Domicilio' : 'Recogida'} · franja ${franja}`,
    `${pedido.cliente_nombre} ${pedido.cliente_apellidos} · ${pedido.cliente_telefono}`,
    lineas,
    `Total: ${formatearPrecio(pedido.total_centimos)}`,
  ].join('\n')
}

async function llamarCallMeBot(mensaje: string): Promise<void> {
  const telefono = process.env.CALLMEBOT_TELEFONO
  const clave = process.env.CALLMEBOT_CLAVE
  if (!telefono || !clave) throw new Error('Faltan CALLMEBOT_TELEFONO o CALLMEBOT_CLAVE.')

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono)}` +
    `&text=${encodeURIComponent(mensaje)}&apikey=${encodeURIComponent(clave)}`
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`CallMeBot respondió ${respuesta.status}`)
}

/**
 * Nunca lanza: un fallo de CallMeBot no puede tumbar un pedido ya cobrado.
 * Se reintenta una vez y el resultado, éxito o fracaso, queda en
 * `avisos_log` para que el panel pueda mostrarlo más adelante.
 */
export async function avisarNuevoPedido(pedido: PedidoConLineas): Promise<void> {
  const mensaje = construirMensaje(pedido)
  const supabase = crearClienteServicio()

  for (let intento = 0; intento < 2; intento++) {
    try {
      await llamarCallMeBot(mensaje)
      await supabase.from('avisos_log').insert({ pedido_id: pedido.id, canal: 'whatsapp', resultado: 'enviado' })
      return
    } catch (error) {
      if (intento === 1) {
        await supabase.from('avisos_log').insert({
          pedido_id: pedido.id,
          canal: 'whatsapp',
          resultado: 'fallido',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
}
