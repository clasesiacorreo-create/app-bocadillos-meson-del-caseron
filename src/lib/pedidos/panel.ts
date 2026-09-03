import type { SupabaseClient } from '@supabase/supabase-js'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { BaseDeDatos } from '@/lib/supabase/cliente-servidor'
import type { EstadoPedido, FranjaSolicitada, PedidoConLineas } from './tipos'

const SELECT_CON_LINEAS = '*, pedido_lineas(*, pedido_extras(*))'

/** Ventana móvil de 24 h: no hace falta la matemática de "principio del día" en Europe/Madrid. */
const VENTANA_TABLERO_MS = 24 * 60 * 60 * 1000

/**
 * Pedidos visibles para el tablero. Se ejecuta con el cliente de la sesión
 * de quien llama (no con la clave de servicio): las políticas de RLS ya
 * filtran qué pedidos puede ver según su rol en `perfiles_staff`.
 *
 * Acotada a las últimas 24 h y sin los pedidos aún sin cobrar: el tablero no
 * pinta `pendiente_pago` en ninguna pestaña, así que traerlos solo serviría
 * para cargar en cada visita todo el histórico del restaurante (con sus
 * líneas y extras), incluido cada carrito abandonado en el caso de admin,
 * cuya política de RLS no los filtra.
 */
export async function listarPedidosPanel(supabase: SupabaseClient<BaseDeDatos>): Promise<PedidoConLineas[]> {
  const desde = new Date(Date.now() - VENTANA_TABLERO_MS).toISOString()
  const { data, error } = await supabase
    .from('pedidos')
    .select(SELECT_CON_LINEAS)
    .neq('estado', 'pendiente_pago')
    .gte('creado_en', desde)
    .order('creado_en')
  if (error) throw error
  return data as PedidoConLineas[]
}

export async function obtenerPedidoPanelPorId(
  supabase: SupabaseClient<BaseDeDatos>,
  pedidoId: string,
): Promise<PedidoConLineas | null> {
  const { data, error } = await supabase.from('pedidos').select(SELECT_CON_LINEAS).eq('id', pedidoId).maybeSingle()
  if (error) throw error
  return data as PedidoConLineas | null
}

/**
 * Confirma o ajusta la franja de un pedido. No está condicionada a que no
 * hubiera confirmación previa: "ajustar" una franja ya confirmada es una
 * acción válida, y repetirla no duplica ningún efecto secundario.
 */
export async function confirmarFranjaPedido(pedidoId: string, franja: FranjaSolicitada): Promise<PedidoConLineas> {
  const supabase = crearClienteServicio()
  const { data, error } = await supabase
    .from('pedidos')
    .update({
      franja_confirmada_inicio: franja.inicio,
      franja_confirmada_fin: franja.fin,
      confirmado_en: new Date().toISOString(),
    })
    .eq('id', pedidoId)
    .select(SELECT_CON_LINEAS)
    .single()

  if (error) throw error
  return data as PedidoConLineas
}

/**
 * Avanza el pedido a la siguiente fase, condicionado al estado anterior: si
 * otra persona ya lo movió, devuelve `null` en vez de retroceder el pedido o
 * duplicar la entrega.
 */
export async function avanzarEstadoPedido(
  pedidoId: string,
  estadoActual: EstadoPedido,
  estadoDestino: EstadoPedido,
): Promise<PedidoConLineas | null> {
  const supabase = crearClienteServicio()
  const { data, error } = await supabase
    .from('pedidos')
    .update({
      estado: estadoDestino,
      ...(estadoDestino === 'entregado' ? { entregado_en: new Date().toISOString() } : {}),
    })
    .eq('id', pedidoId)
    .eq('estado', estadoActual)
    .select(SELECT_CON_LINEAS)
    .maybeSingle()

  if (error) throw error
  return data as PedidoConLineas | null
}

export async function marcarLineaPreparada(lineaId: string, preparada: boolean): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('pedido_lineas').update({ preparada }).eq('id', lineaId)
  if (error) throw error
}
