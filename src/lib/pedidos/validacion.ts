import { articuloDisponible, extrasParaTamano } from '@/lib/carta/reglas'
import type { Carta } from '@/lib/carta/tipos'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'
import type { ErrorValidacionPedido } from './tipos'

/**
 * Revalida cada línea contra la carta recién leída de la base de datos. Se
 * comprueba justo antes de crear la sesión de pago porque la disponibilidad
 * puede haber cambiado mientras el cliente rellenaba el formulario.
 */
export function validarLineas(carta: Carta, lineas: LineaParaCarrito[]): ErrorValidacionPedido | null {
  const articulos = new Map(
    carta.categorias.flatMap((categoria) => categoria.articulos.map((articulo) => [articulo.id, articulo])),
  )

  for (const linea of lineas) {
    const articulo = articulos.get(linea.articuloId)

    if (!articulo || !articuloDisponible(articulo)) {
      return {
        tipo: 'articulo_no_disponible',
        articuloId: linea.articuloId,
        nombreArticulo: linea.nombreArticulo,
      }
    }

    const tamano = articulo.tamanos.find((t) => t.id === linea.tamanoId)
    if (!tamano || !tamano.disponible) {
      return {
        tipo: 'articulo_no_disponible',
        articuloId: linea.articuloId,
        nombreArticulo: linea.nombreArticulo,
      }
    }

    const extrasDelTamano = extrasParaTamano(articulo, linea.tamanoId)
    for (const extra of linea.extras) {
      const extraDeCarta = extrasDelTamano.find((e) => e.id === extra.extraId)
      if (!extraDeCarta || !extraDeCarta.disponible) {
        return {
          tipo: 'extra_no_disponible',
          articuloId: linea.articuloId,
          tamanoId: linea.tamanoId,
          extraId: extra.extraId,
          nombreExtra: extra.nombre,
        }
      }
    }
  }

  return null
}
