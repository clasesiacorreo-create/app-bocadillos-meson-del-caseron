import type { PedidoConLineas } from './tipos'

export type PestanaReparto = 'para_repartir' | 'mis_entregas'

/**
 * A qué pestaña de `/reparto` pertenece un pedido, o `null` si no es de las
 * dos que el repartidor puede ver: "para repartir" es cualquiera listo para
 * recoger, "mis entregas" son solo los que él mismo recogió — nunca los que
 * lleva otro repartidor, aunque `puedeVerPedido`/RLS ya se lo oculten antes
 * de llegar aquí.
 */
export function pestanaDeReparto(
  pedido: Pick<PedidoConLineas, 'estado' | 'repartidor_id' | 'modo_entrega'>,
  usuarioId: string,
): PestanaReparto | null {
  if (pedido.modo_entrega !== 'domicilio') return null
  if (pedido.estado === 'pendiente_envio') return 'para_repartir'
  if (pedido.estado === 'en_reparto' && pedido.repartidor_id === usuarioId) return 'mis_entregas'
  return null
}

/**
 * Enlace que abre la dirección de entrega en el mapa del móvil. El piso no
 * forma parte de la búsqueda: es una indicación para el timbre, no algo que
 * un mapa pueda localizar.
 */
export function enlaceMapa(
  pedido: Pick<PedidoConLineas, 'direccion_calle' | 'direccion_numero' | 'direccion_cp' | 'direccion_ciudad'>,
): string {
  const partes = [pedido.direccion_calle, pedido.direccion_numero, pedido.direccion_cp, pedido.direccion_ciudad].filter(
    (parte): parte is string => Boolean(parte),
  )
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(', '))}`
}
