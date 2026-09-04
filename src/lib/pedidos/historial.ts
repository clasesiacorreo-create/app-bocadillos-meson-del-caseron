import type { SupabaseClient } from '@supabase/supabase-js'
import type { BaseDeDatos } from '@/lib/supabase/cliente-servidor'
import type { PedidoConLineas } from './tipos'

const SELECT_CON_LINEAS = '*, pedido_lineas(*, pedido_extras(*))'
const LIMITE_HISTORIAL = 200

/**
 * Pedidos entregados, más recientes primero. Usa el cliente de sesión de
 * quien llama (no la clave de servicio): las políticas de RLS ya limitan qué
 * pedidos puede ver según su rol, igual que en el tablero.
 */
export async function listarHistorial(
  supabase: SupabaseClient<BaseDeDatos>,
  telefono?: string,
): Promise<PedidoConLineas[]> {
  let consulta = supabase
    .from('pedidos')
    .select(SELECT_CON_LINEAS)
    .eq('estado', 'entregado')
    .order('entregado_en', { ascending: false })
    .limit(LIMITE_HISTORIAL)

  if (telefono && telefono.trim() !== '') {
    consulta = consulta.ilike('cliente_telefono', `%${telefono.trim()}%`)
  }

  const { data, error } = await consulta
  if (error) throw error
  return data as PedidoConLineas[]
}

/**
 * Suma de los pedidos entregados en el rango dado. No es una consulta
 * agregada: el volumen diario de un asador de bocadillos es pequeño, así que
 * traer las filas y sumar en memoria es más simple que mantener una función
 * de Postgres solo para esto.
 */
export async function totalFacturadoHoy(
  supabase: SupabaseClient<BaseDeDatos>,
  rango: { desde: string; hasta: string },
): Promise<number> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('total_centimos')
    .eq('estado', 'entregado')
    .gte('entregado_en', rango.desde)
    .lt('entregado_en', rango.hasta)
  if (error) throw error
  return data.reduce((total, pedido) => total + pedido.total_centimos, 0)
}
