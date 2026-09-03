import type { Tables } from '@/lib/supabase/tipos-bd'
import type { EstadoPedido, PedidoConLineas } from './tipos'

export type Pestana = 'nuevos' | 'en_marcha' | 'pendientes_envio' | 'entregados'

/** `pendiente_pago` no aparece en ninguna pestaña: cocina nunca ve pedidos sin cobrar. */
export function pestanaDePedido(estado: EstadoPedido): Pestana | null {
  switch (estado) {
    case 'pendiente_pago':
      return null
    case 'nuevo':
      return 'nuevos'
    case 'en_preparacion':
      return 'en_marcha'
    case 'pendiente_envio':
    case 'en_reparto':
      return 'pendientes_envio'
    case 'entregado':
      return 'entregados'
  }
}

const UMBRAL_INMINENTE_MIN = 15

/** Una franja es "inminente" 15 minutos o menos antes de empezar (incluida una ya pasada). */
export function franjaEsInminente(inicioFranjaIso: string, ahora: Date): boolean {
  const minutosHastaInicio = (new Date(inicioFranjaIso).getTime() - ahora.getTime()) / 60000
  return minutosHastaInicio <= UMBRAL_INMINENTE_MIN
}

function inicioParaOrdenar(pedido: PedidoConLineas): string {
  return pedido.franja_confirmada_inicio ?? pedido.franja_solicitada_inicio
}

/** Ordena por franja (la confirmada si existe, si no la solicitada), la más próxima primero. */
export function ordenarPorFranja(pedidos: PedidoConLineas[]): PedidoConLineas[] {
  return [...pedidos].sort((a, b) => inicioParaOrdenar(a).localeCompare(inicioParaOrdenar(b)))
}

/** Sustituye el pedido por id, o lo añade al principio si es nuevo (tras un INSERT de Realtime). */
export function fusionarPedidoEnLista(pedidos: PedidoConLineas[], pedido: PedidoConLineas): PedidoConLineas[] {
  const indice = pedidos.findIndex((p) => p.id === pedido.id)
  if (indice === -1) return [pedido, ...pedidos]
  return pedidos.map((p) => (p.id === pedido.id ? pedido : p))
}

/** Actualiza los campos de un pedido ya presente en la lista sin tocar sus líneas (tras un UPDATE de Realtime). */
export function actualizarCamposPedido(pedidos: PedidoConLineas[], cambios: Tables<'pedidos'>): PedidoConLineas[] {
  return pedidos.map((pedido) => (pedido.id === cambios.id ? { ...pedido, ...cambios } : pedido))
}

/** Sustituye una línea por su id dentro de su pedido, conservando los extras que ya estaban en memoria. */
export function fusionarLineaEnLista(pedidos: PedidoConLineas[], linea: Tables<'pedido_lineas'>): PedidoConLineas[] {
  return pedidos.map((pedido) => {
    if (!pedido.pedido_lineas.some((l) => l.id === linea.id)) return pedido
    return {
      ...pedido,
      pedido_lineas: pedido.pedido_lineas.map((l) => (l.id === linea.id ? { ...l, ...linea } : l)),
    }
  })
}
