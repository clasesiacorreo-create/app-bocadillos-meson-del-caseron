import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { PedidoConLineas } from './tipos'

const SELECT_CON_LINEAS = '*, pedido_lineas(*, pedido_extras(*))'

/**
 * Pasa el pedido de `pendiente_pago` a `nuevo`, condicionado al estado
 * anterior. Devuelve `null` si el pedido ya estaba confirmado: así el
 * webhook (que Stripe puede reenviar) y la red de seguridad del seguimiento
 * pueden llamar a esta misma función sin arriesgarse a duplicar el aviso.
 */
export async function confirmarPagoDePedido(
  stripeSessionId: string,
  paymentIntent: string,
): Promise<PedidoConLineas | null> {
  const supabase = crearClienteServicio()
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: 'nuevo', pagado_en: new Date().toISOString(), stripe_payment_intent: paymentIntent })
    .eq('stripe_session_id', stripeSessionId)
    .eq('estado', 'pendiente_pago')
    .select(SELECT_CON_LINEAS)
    .maybeSingle()

  if (error) throw error
  return data as PedidoConLineas | null
}
