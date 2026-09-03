import { describe, expect, it } from 'vitest'
import { calcularResumen, precioLinea, umbralesValidos } from '.'
import type { LineaCarrito, ReglasPedido } from './tipos'

const REGLAS: ReglasPedido = {
  envioCentimos: 200,
  pedidoMinimoCentimos: 1000,
  envioGratisDesdeCentimos: 2000,
}

function linea(parcial: Partial<LineaCarrito> = {}): LineaCarrito {
  return {
    articuloId: 'art-1',
    tamanoId: 'tam-1',
    precioUnitarioCentimos: 500,
    extras: [],
    cantidad: 1,
    ...parcial,
  }
}

describe('precioLinea', () => {
  it('cobra el precio del tamaño cuando no hay extras', () => {
    expect(precioLinea(linea())).toBe(500)
  })

  it('suma los extras antes de multiplicar por la cantidad', () => {
    const resultado = precioLinea(
      linea({
        extras: [
          { extraId: 'e1', nombre: 'Queso', precioCentimos: 100 },
          { extraId: 'e2', nombre: 'Rodaja de tomate', precioCentimos: 100 },
        ],
        cantidad: 3,
      }),
    )
    // (500 + 100 + 100) * 3
    expect(resultado).toBe(2100)
  })

  it('devuelve cero si la cantidad es cero', () => {
    expect(precioLinea(linea({ cantidad: 0 }))).toBe(0)
  })
})

describe('calcularResumen a domicilio', () => {
  it('suma las líneas y cobra el envío por debajo del umbral', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 1200 })], 'domicilio', REGLAS)
    expect(r.subtotalCentimos).toBe(1200)
    expect(r.envioCentimos).toBe(200)
    expect(r.totalCentimos).toBe(1400)
    expect(r.envioEsGratis).toBe(false)
  })

  it('no alcanza el mínimo y dice cuánto falta', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 750 })], 'domicilio', REGLAS)
    expect(r.alcanzaMinimo).toBe(false)
    expect(r.faltaParaMinimoCentimos).toBe(250)
  })

  it('alcanza el mínimo justo en el umbral', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 1000 })], 'domicilio', REGLAS)
    expect(r.alcanzaMinimo).toBe(true)
    expect(r.faltaParaMinimoCentimos).toBe(0)
  })

  it('dice cuánto falta para el envío gratuito', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 1750 })], 'domicilio', REGLAS)
    expect(r.envioEsGratis).toBe(false)
    expect(r.faltaParaEnvioGratisCentimos).toBe(250)
  })

  it('regala el envío justo en el umbral', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 2000 })], 'domicilio', REGLAS)
    expect(r.envioEsGratis).toBe(true)
    expect(r.envioCentimos).toBe(0)
    expect(r.totalCentimos).toBe(2000)
    expect(r.faltaParaEnvioGratisCentimos).toBeNull()
  })

  it('cobra siempre el envío si el umbral está desactivado', () => {
    const r = calcularResumen(
      [linea({ precioUnitarioCentimos: 9000 })],
      'domicilio',
      { ...REGLAS, envioGratisDesdeCentimos: null },
    )
    expect(r.envioEsGratis).toBe(false)
    expect(r.envioCentimos).toBe(200)
    expect(r.faltaParaEnvioGratisCentimos).toBeNull()
  })

  it('mide los dos umbrales contra el subtotal, no contra el total', () => {
    // Subtotal 900: con envío el total sería 1100 y superaría el mínimo de 1000.
    // El mínimo debe seguir sin alcanzarse.
    const r = calcularResumen([linea({ precioUnitarioCentimos: 900 })], 'domicilio', REGLAS)
    expect(r.alcanzaMinimo).toBe(false)
  })

  it('devuelve un resumen vacío coherente sin líneas', () => {
    const r = calcularResumen([], 'domicilio', REGLAS)
    expect(r.subtotalCentimos).toBe(0)
    expect(r.alcanzaMinimo).toBe(false)
    expect(r.faltaParaMinimoCentimos).toBe(1000)
  })
})

describe('calcularResumen en recogida', () => {
  it('no cobra envío ni exige mínimo', () => {
    const r = calcularResumen([linea({ precioUnitarioCentimos: 300 })], 'recogida', REGLAS)
    expect(r.envioCentimos).toBe(0)
    expect(r.totalCentimos).toBe(300)
    expect(r.alcanzaMinimo).toBe(true)
    expect(r.faltaParaMinimoCentimos).toBe(0)
    expect(r.faltaParaEnvioGratisCentimos).toBeNull()
  })
})

describe('umbralesValidos', () => {
  it('es válido cuando el envío gratis está desactivado', () => {
    expect(umbralesValidos(1000, null)).toBe(true)
  })

  it('es válido cuando el envío gratis supera el mínimo', () => {
    expect(umbralesValidos(1000, 2000)).toBe(true)
  })

  it('no es válido cuando el envío gratis es igual al mínimo', () => {
    expect(umbralesValidos(1000, 1000)).toBe(false)
  })

  it('no es válido cuando el envío gratis es menor que el mínimo', () => {
    expect(umbralesValidos(1000, 500)).toBe(false)
  })
})
