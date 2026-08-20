export type ExtraElegido = {
  extraId: string
  nombre: string
  precioCentimos: number
}

/** Lo que la ficha de artículo entrega al carrito al pulsar «Añadir». */
export type LineaParaCarrito = {
  articuloId: string
  nombreArticulo: string
  imagenUrl: string | null
  tamanoId: string
  nombreTamano: string
  precioUnitarioCentimos: number
  extras: ExtraElegido[]
  cantidad: number
  notasLinea: string
}
