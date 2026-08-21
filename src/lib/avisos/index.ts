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
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!respuesta.ok) throw new Error(`CallMeBot respondió ${respuesta.status}`)
}

/**
 * Registra el resultado del envío en `avisos_log`. Se llama siempre después
 * de que el envío haya terminado (con éxito o sin él) y nunca debe poder
 * tumbar la función que la invoca: cualquier fallo aquí (cliente de
 * Supabase que no se puede crear, insert que falla) se traga en silencio.
 * En el peor caso se pierde la entrada del log, nunca el pedido.
 */
async function registrarResultado(
  pedidoId: string,
  enviado: boolean,
  error: unknown,
): Promise<void> {
  try {
    const supabase = crearClienteServicio()
    if (enviado) {
      await supabase.from('avisos_log').insert({ pedido_id: pedidoId, canal: 'whatsapp', resultado: 'enviado' })
    } else {
      await supabase.from('avisos_log').insert({
        pedido_id: pedidoId,
        canal: 'whatsapp',
        resultado: 'fallido',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  } catch {
    // Un fallo al registrar el aviso no puede tumbar un pedido ya cobrado.
  }
}

/**
 * Nunca lanza: un fallo de CallMeBot no puede tumbar un pedido ya cobrado.
 * Se reintenta el envío una vez; el resultado, éxito o fracaso, se registra
 * en `avisos_log` (best-effort) para que el panel pueda mostrarlo más
 * adelante. El reintento cubre solo el envío en sí — una vez que el envío
 * ha tenido éxito no se vuelve a intentar, aunque falle el registro.
 */
export async function avisarNuevoPedido(pedido: PedidoConLineas): Promise<void> {
  const mensaje = construirMensaje(pedido)

  let enviado = false
  let ultimoError: unknown = null

  for (let intento = 0; intento < 2 && !enviado; intento++) {
    try {
      await llamarCallMeBot(mensaje)
      enviado = true
    } catch (error) {
      ultimoError = error
    }
  }

  await registrarResultado(pedido.id, enviado, ultimoError)
}
