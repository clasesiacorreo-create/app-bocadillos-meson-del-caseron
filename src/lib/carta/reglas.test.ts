import { describe, expect, it } from 'vitest'
import { articuloDisponible, extrasParaTamano } from './reglas'
import type { ArticuloCarta } from './tipos'

const QUESO = {
  id: 'e-queso',
  nombre: 'Queso',
  descripcion: 'Derretido y sabroso',
  disponible: true,
  precioPorTamanoId: { 'tam-bocadillo': 100, 'tam-montado': 50 },
}

const CEBOLLA = {
  id: 'e-cebolla',
  nombre: 'Cebolla caramelizada',
  descripcion: 'Dulzor equilibrado',
  disponible: false,
  precioPorTamanoId: { 'tam-bocadillo': 100, 'tam-montado': 50 },
}

function articulo(parcial: Partial<ArticuloCarta> = {}): ArticuloCarta {
  return {
    id: 'a-1',
    nombre: 'Lomo',
    descripcion: '',
    imagenUrl: null,
    disponible: true,
    tamanos: [
      { id: 'tam-bocadillo', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
      { id: 'tam-montado', nombre: 'Montado', precioCentimos: 400, disponible: true },
    ],
    extras: [QUESO, CEBOLLA],
    ...parcial,
  }
}

describe('articuloDisponible', () => {
  it('está disponible si el artículo lo está y tiene algún tamaño disponible', () => {
    expect(articuloDisponible(articulo())).toBe(true)
  })

  it('no está disponible si el artículo está desactivado', () => {
    expect(articuloDisponible(articulo({ disponible: false }))).toBe(false)
  })

  it('no está disponible si ningún tamaño lo está', () => {
    const sinTamanos = articulo({
      tamanos: [
        { id: 'tam-bocadillo', nombre: 'Bocadillo', precioCentimos: 500, disponible: false },
        { id: 'tam-montado', nombre: 'Montado', precioCentimos: 400, disponible: false },
      ],
    })
    expect(articuloDisponible(sinTamanos)).toBe(false)
  })

  it('sigue disponible si le queda un solo tamaño', () => {
    const soloMontado = articulo({
      tamanos: [
        { id: 'tam-bocadillo', nombre: 'Bocadillo', precioCentimos: 500, disponible: false },
        { id: 'tam-montado', nombre: 'Montado', precioCentimos: 400, disponible: true },
      ],
    })
    expect(articuloDisponible(soloMontado)).toBe(true)
  })
})

describe('extrasParaTamano', () => {
  it('devuelve los extras con precio para ese tamaño, disponibles o no', () => {
    const resultado = extrasParaTamano(articulo(), 'tam-bocadillo')
    expect(resultado.map((e) => e.id)).toEqual(['e-queso', 'e-cebolla'])
  })

  it('conserva el estado de disponibilidad para poder atenuarlos', () => {
    const resultado = extrasParaTamano(articulo(), 'tam-bocadillo')
    expect(resultado.find((e) => e.id === 'e-cebolla')?.disponible).toBe(false)
  })

  it('no devuelve extras sin precio para ese tamaño', () => {
    const hamburguesa = articulo({
      tamanos: [{ id: 'tam-unico', nombre: 'Único', precioCentimos: 1050, disponible: true }],
    })
    expect(extrasParaTamano(hamburguesa, 'tam-unico')).toEqual([])
  })
})
