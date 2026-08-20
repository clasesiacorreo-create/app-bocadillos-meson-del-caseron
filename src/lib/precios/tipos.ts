export type ModoEntrega = 'domicilio' | 'recogida'

export type ExtraEnLinea = {
  extraId: string
  nombre: string
  precioCentimos: number
}

export type LineaCarrito = {
  articuloId: string
  tamanoId: string
  precioUnitarioCentimos: number
  extras: ExtraEnLinea[]
  cantidad: number
}

export type ReglasPedido = {
  envioCentimos: number
  pedidoMinimoCentimos: number
  /** null desactiva el envío gratuito por importe: el envío se cobra siempre. */
  envioGratisDesdeCentimos: number | null
}

export type ResumenPedido = {
  subtotalCentimos: number
  envioCentimos: number
  totalCentimos: number
  alcanzaMinimo: boolean
  faltaParaMinimoCentimos: number
  envioEsGratis: boolean
  /** null cuando no procede mostrar el aviso: recogida, umbral desactivado o ya alcanzado. */
  faltaParaEnvioGratisCentimos: number | null
}
