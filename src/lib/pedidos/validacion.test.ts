import { describe, expect, it } from 'vitest'
import { validarLineas } from './validacion'
import type { Carta } from '@/lib/carta/tipos'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'

function carta(parcial: Partial<Carta['categorias'][number]['articulos'][number]> = {}): Carta {
  return {
    categorias: [
      {
        id: 'cat-1',
        nombre: 'Clásicos',
        articulos: [
          {
            id: 'a-lomo',
            nombre: 'Lomo',
            descripcion: '',
            imagenUrl: null,
            disponible: true,
            tamanos: [
              { id: 'tam-bocadillo', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
              { id: 'tam-montado', nombre: 'Montado', precioCentimos: 400, disponible: false },
            ],
            extras: [
              {
                id: 'e-queso',
                nombre: 'Queso',
                descripcion: '',
                disponible: false,
                precioPorTamanoId: { 'tam-bocadillo': 100, 'tam-montado': 50 },
              },
            ],
            ...parcial,
          },
        ],
      },
    ],
  }
}

function linea(parcial: Partial<LineaParaCarrito> = {}): LineaParaCarrito {
  return {
    articuloId: 'a-lomo',
    nombreArticulo: 'Lomo',
    imagenUrl: null,
    tamanoId: 'tam-bocadillo',
    nombreTamano: 'Bocadillo',
    precioUnitarioCentimos: 500,
    extras: [],
    cantidad: 1,
    notasLinea: '',
    ...parcial,
  }
}

describe('validarLineas', () => {
  it('no encuentra ningún error si todo sigue disponible', () => {
    expect(validarLineas(carta(), [linea()])).toBeNull()
  })

  it('rechaza un artículo desactivado', () => {
    const c = carta({ disponible: false })
    expect(validarLineas(c, [linea()])).toEqual({
      tipo: 'articulo_no_disponible',
      articuloId: 'a-lomo',
      nombreArticulo: 'Lomo',
    })
  })

  it('rechaza un tamaño caído', () => {
    const resultado = validarLineas(carta(), [linea({ tamanoId: 'tam-montado', nombreTamano: 'Montado' })])
    expect(resultado).toEqual({
      tipo: 'articulo_no_disponible',
      articuloId: 'a-lomo',
      nombreArticulo: 'Lomo',
    })
  })

  it('rechaza un complemento caído, identificando cuál', () => {
    const resultado = validarLineas(
      carta(),
      [linea({ extras: [{ extraId: 'e-queso', nombre: 'Queso', precioCentimos: 100 }] })],
    )
    expect(resultado).toEqual({
      tipo: 'extra_no_disponible',
      articuloId: 'a-lomo',
      tamanoId: 'tam-bocadillo',
      extraId: 'e-queso',
      nombreExtra: 'Queso',
    })
  })

  it('rechaza un complemento que ya no existe en la carta', () => {
    const resultado = validarLineas(
      carta(),
      [linea({ extras: [{ extraId: 'e-fantasma', nombre: 'Fantasma', precioCentimos: 100 }] })],
    )
    expect(resultado?.tipo).toBe('extra_no_disponible')
  })

  it('rechaza un artículo que ya no existe en la carta', () => {
    const resultado = validarLineas(carta(), [linea({ articuloId: 'a-fantasma' })])
    expect(resultado).toEqual({
      tipo: 'articulo_no_disponible',
      articuloId: 'a-fantasma',
      nombreArticulo: 'Lomo',
    })
  })

  it('para en la primera línea con problema', () => {
    const resultado = validarLineas(carta({ disponible: false }), [
      linea(),
      linea({ tamanoId: 'tam-montado', nombreTamano: 'Montado' }),
    ])
    expect(resultado?.tipo).toBe('articulo_no_disponible')
  })
})
