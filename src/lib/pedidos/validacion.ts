import { articuloDisponible, extrasParaTamano } from '@/lib/carta/reglas'
import type { Carta } from '@/lib/carta/tipos'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import type { DatosContacto, DireccionEntrega, ErrorValidacionPedido } from './tipos'

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

const ETIQUETA_CAMPO_CONTACTO: Record<keyof DatosContacto, string> = {
  nombre: 'Nombre',
  apellidos: 'Apellidos',
  telefono: 'Teléfono',
}

const ETIQUETA_CAMPO_DIRECCION: Record<'calle' | 'numero' | 'cp' | 'ciudad', string> = {
  calle: 'Calle',
  numero: 'Número',
  cp: 'Código postal',
  ciudad: 'Ciudad',
}

function telefonoConFormatoValido(telefono: string): boolean {
  // Basta con exigir al menos 9 dígitos: cubre fijos y móviles españoles con
  // o sin prefijo internacional, espacios o guiones, sin ser tan estricto
  // como para rechazar números reales por un formato inesperado.
  return telefono.replace(/\D/g, '').length >= 9
}

/**
 * Un pedido pagado sin forma de contactar o entregar es el peor fallo
 * posible: se revalida en el servidor —nunca basta con la validación del
 * formulario— que el contacto y, en domicilio, la dirección, no lleguen
 * vacíos ni sean solo espacios.
 */
export function validarDatosContacto(
  modoEntrega: ModoEntrega,
  contacto: DatosContacto,
  direccion: DireccionEntrega | null,
): ErrorValidacionPedido | null {
  const campos: string[] = []

  for (const campo of Object.keys(ETIQUETA_CAMPO_CONTACTO) as (keyof DatosContacto)[]) {
    if (contacto[campo].trim() === '') campos.push(ETIQUETA_CAMPO_CONTACTO[campo])
  }
  if (contacto.telefono.trim() !== '' && !telefonoConFormatoValido(contacto.telefono)) {
    campos.push('Teléfono (formato no válido)')
  }

  if (modoEntrega === 'domicilio') {
    if (!direccion) {
      campos.push('Dirección')
    } else {
      for (const campo of Object.keys(ETIQUETA_CAMPO_DIRECCION) as (keyof typeof ETIQUETA_CAMPO_DIRECCION)[]) {
        if (direccion[campo].trim() === '') campos.push(ETIQUETA_CAMPO_DIRECCION[campo])
      }
    }
  }

  return campos.length > 0 ? { tipo: 'datos_contacto_invalidos', campos } : null
}
