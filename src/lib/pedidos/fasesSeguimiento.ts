import { formatearHoraFranja } from '@/lib/horario'
import type { EstadoSeguimiento } from './seguimiento'

export type FaseSeguimientoId = 'recibido' | 'preparacion' | 'listo' | 'reparto' | 'entregado'

export type FaseSeguimiento = {
  id: FaseSeguimientoId
  etiqueta: string
  detalle: string | null
  estado: 'completada' | 'actual' | 'futura'
}

const ORDEN_DOMICILIO: FaseSeguimientoId[] = ['recibido', 'preparacion', 'listo', 'reparto', 'entregado']
const ORDEN_RECOGIDA: FaseSeguimientoId[] = ['recibido', 'preparacion', 'listo', 'entregado']

const ETIQUETAS: Record<FaseSeguimientoId, string> = {
  recibido: 'Recibido',
  preparacion: 'En preparación',
  listo: 'Listo',
  reparto: 'En reparto',
  entregado: 'Entregado',
}

function faseDelEstado(pedido: EstadoSeguimiento): FaseSeguimientoId | null {
  switch (pedido.estado) {
    case 'pendiente_pago':
      return null
    case 'nuevo':
      return 'recibido'
    case 'en_preparacion':
      return 'preparacion'
    case 'pendiente_envio':
      return 'listo'
    case 'en_reparto':
      return 'reparto'
    case 'entregado':
      return 'entregado'
  }
}

function detalleDeFase(id: FaseSeguimientoId, pedido: EstadoSeguimiento): string | null {
  switch (id) {
    case 'recibido':
      return pedido.franjaConfirmada
        ? `Confirmado para las ${formatearHoraFranja(pedido.franjaConfirmada.inicio)}–${formatearHoraFranja(pedido.franjaConfirmada.fin)}`
        : 'Pendiente de confirmar'
    case 'preparacion':
      return 'La cocina está con tu pedido'
    case 'listo':
      return pedido.modoEntrega === 'recogida' ? 'Puedes pasar a recogerlo' : 'Sale en breve'
    case 'reparto':
      return 'Tu pedido va de camino'
    case 'entregado':
      return null
  }
}

/**
 * Traduce el estado real del pedido a la línea de tiempo que ve el cliente.
 * La recogida en local no pasa por reparto: su orden de fases es más corto.
 * `pendiente_pago` no tiene línea de tiempo — es un estado transitorio que en
 * un flujo normal el cliente nunca llega a ver (ver `obtenerEstadoPedido`).
 */
export function fasesSeguimiento(pedido: EstadoSeguimiento): FaseSeguimiento[] | null {
  const faseActual = faseDelEstado(pedido)
  if (!faseActual) return null

  const orden = pedido.modoEntrega === 'recogida' ? ORDEN_RECOGIDA : ORDEN_DOMICILIO
  const indiceActual = orden.indexOf(faseActual)

  return orden.map((id, indice) => ({
    id,
    etiqueta: ETIQUETAS[id],
    detalle: detalleDeFase(id, pedido),
    estado:
      indiceActual < 0
        ? 'futura'
        : indice < indiceActual
          ? 'completada'
          : indice === indiceActual
            ? 'actual'
            : 'futura',
  }))
}
