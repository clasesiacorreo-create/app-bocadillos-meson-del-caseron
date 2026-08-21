import { formatearHoraFranja } from '@/lib/horario'
import type { EstadoSeguimiento } from './seguimiento'

function rangoFranja(inicio: string, fin: string): string {
  return `${formatearHoraFranja(inicio)}–${formatearHoraFranja(fin)}`
}

/** Copia el texto del estado tal como se especifica que lo lea el cliente. */
export function textoEstadoCliente(pedido: EstadoSeguimiento): string {
  switch (pedido.estado) {
    case 'pendiente_pago':
      return 'Confirmando tu pago…'

    case 'nuevo':
      if (pedido.franjaConfirmada) {
        return `Confirmado para las ${rangoFranja(pedido.franjaConfirmada.inicio, pedido.franjaConfirmada.fin)}`
      }
      return pedido.franjaSolicitada.asap
        ? 'Recibido — pediste lo antes posible, pendiente de confirmar'
        : `Recibido — has pedido las ${rangoFranja(pedido.franjaSolicitada.inicio, pedido.franjaSolicitada.fin)}, pendiente de confirmar`

    case 'en_preparacion':
      return 'En preparación'

    case 'pendiente_envio':
      return pedido.modoEntrega === 'recogida' ? 'Listo para recoger' : 'Listo — sale en breve'

    case 'en_reparto':
      return 'En reparto — tu pedido va de camino'

    case 'entregado':
      return 'Entregado'
  }
}
