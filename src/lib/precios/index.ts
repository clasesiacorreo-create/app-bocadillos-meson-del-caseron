import type { LineaCarrito, ModoEntrega, ReglasPedido, ResumenPedido } from './tipos'

export type * from './tipos'

export function precioLinea(linea: LineaCarrito): number {
  const extras = linea.extras.reduce((total, extra) => total + extra.precioCentimos, 0)
  return (linea.precioUnitarioCentimos + extras) * linea.cantidad
}

export function calcularResumen(
  lineas: LineaCarrito[],
  modoEntrega: ModoEntrega,
  reglas: ReglasPedido,
): ResumenPedido {
  const subtotalCentimos = lineas.reduce((total, linea) => total + precioLinea(linea), 0)
  const esRecogida = modoEntrega === 'recogida'
  const umbralEnvioGratis = reglas.envioGratisDesdeCentimos

  // Los dos umbrales se miden contra el subtotal: el cliente no debe alcanzar
  // un umbral pagando gastos de envío, y el de envío gratis no puede depender
  // de un envío que él mismo anula.
  const alcanzaMinimo = esRecogida || subtotalCentimos >= reglas.pedidoMinimoCentimos
  const faltaParaMinimoCentimos = alcanzaMinimo
    ? 0
    : reglas.pedidoMinimoCentimos - subtotalCentimos

  const superaUmbralEnvio = umbralEnvioGratis !== null && subtotalCentimos >= umbralEnvioGratis
  const envioEsGratis = esRecogida || superaUmbralEnvio
  const envioCentimos = envioEsGratis ? 0 : reglas.envioCentimos
  const faltaParaEnvioGratisCentimos =
    esRecogida || umbralEnvioGratis === null || superaUmbralEnvio
      ? null
      : umbralEnvioGratis - subtotalCentimos

  return {
    subtotalCentimos,
    envioCentimos,
    totalCentimos: subtotalCentimos + envioCentimos,
    alcanzaMinimo,
    faltaParaMinimoCentimos,
    envioEsGratis,
    faltaParaEnvioGratisCentimos,
  }
}

/**
 * Los dos umbrales miden el mismo subtotal pero significan cosas opuestas:
 * uno bloquea el pedido por debajo, el otro libera el envío por encima. Si
 * el segundo no fuera estrictamente mayor que el primero, el envío saldría
 * gratis en todo pedido que se pudiera hacer, y el ajuste dejaría de tener
 * efecto real.
 */
export function umbralesValidos(pedidoMinimoCentimos: number, envioGratisDesdeCentimos: number | null): boolean {
  return envioGratisDesdeCentimos === null || envioGratisDesdeCentimos > pedidoMinimoCentimos
}
