import type { LineaParaCarrito } from '@/lib/carrito/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import type { Tables } from '@/lib/supabase/tipos-bd'

export type DatosContacto = {
  nombre: string
  apellidos: string
  telefono: string
}

export type DireccionEntrega = {
  calle: string
  numero: string
  piso: string
  cp: string
  ciudad: string
  indicaciones: string
}

export type FranjaSolicitada = {
  inicio: string // ISO 8601
  fin: string
  loAntesPosible: boolean
}

export type SolicitudPedido = {
  lineas: LineaParaCarrito[]
  modoEntrega: ModoEntrega
  contacto: DatosContacto
  direccion: DireccionEntrega | null // null en recogida
  franjaSolicitada: FranjaSolicitada
  notas: string
}

export type ErrorValidacionPedido =
  | { tipo: 'articulo_no_disponible'; articuloId: string; nombreArticulo: string }
  | {
      tipo: 'extra_no_disponible'
      articuloId: string
      tamanoId: string
      extraId: string
      nombreExtra: string
    }
  | { tipo: 'bajo_minimo'; faltaCentimos: number }

/**
 * Los tipos generados por Supabase no conocen la restricción `check` de
 * Postgres sobre `pedidos.estado`: lo tipan como `string` a secas. Este tipo
 * explícito es el que usa la capa de cliente (seguimiento, texto de estado)
 * para poder hacer un `switch` exhaustivo.
 */
export type EstadoPedido =
  | 'pendiente_pago'
  | 'nuevo'
  | 'en_preparacion'
  | 'pendiente_envio'
  | 'en_reparto'
  | 'entregado'

export type PedidoCreado = {
  id: string
  codigoPublico: string
  subtotalCentimos: number
  envioCentimos: number
  totalCentimos: number
  lineasVerificadas: LineaParaCarrito[]
}

export type PedidoExtraFila = Tables<'pedido_extras'>
export type PedidoLineaFila = Tables<'pedido_lineas'> & { pedido_extras: PedidoExtraFila[] }
export type PedidoConLineas = Tables<'pedidos'> & { pedido_lineas: PedidoLineaFila[] }
