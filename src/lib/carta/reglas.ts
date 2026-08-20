import type { ArticuloCarta, ExtraDeArticulo } from './tipos'

/**
 * Un artículo se puede pedir si está activo y le queda al menos un tamaño.
 * Sin ningún tamaño disponible no hay nada que añadir al carrito, así que se
 * comporta como si el artículo entero estuviera desactivado.
 */
export function articuloDisponible(articulo: ArticuloCarta): boolean {
  return articulo.disponible && articulo.tamanos.some((tamano) => tamano.disponible)
}

/**
 * Complementos que se ofrecen para un tamaño concreto. Se devuelven también los
 * no disponibles: la interfaz los muestra atenuados en lugar de ocultarlos, para
 * que el cliente vea que hoy no los hay en vez de pensar que la carta cambió.
 */
export function extrasParaTamano(
  articulo: ArticuloCarta,
  tamanoId: string,
): ExtraDeArticulo[] {
  return articulo.extras.filter((extra) => tamanoId in extra.precioPorTamanoId)
}
