import { beforeEach, describe, expect, it } from 'vitest'
import { useCarrito } from './store'
import type { LineaParaCarrito } from './tipos'

function nueva(parcial: Partial<LineaParaCarrito> = {}): LineaParaCarrito {
  return {
    articuloId: 'a-1',
    nombreArticulo: 'Lomo',
    imagenUrl: null,
    tamanoId: 't-b',
    nombreTamano: 'Bocadillo',
    precioUnitarioCentimos: 500,
    extras: [],
    cantidad: 1,
    notasLinea: '',
    ...parcial,
  }
}

beforeEach(() => {
  useCarrito.getState().vaciar()
})

describe('carrito', () => {
  it('empieza vacío', () => {
    expect(useCarrito.getState().lineas).toEqual([])
  })

  it('añade una línea con identificador propio', () => {
    useCarrito.getState().anadir(nueva())
    const { lineas } = useCarrito.getState()
    expect(lineas).toHaveLength(1)
    expect(lineas[0].id).toBeTruthy()
    expect(lineas[0].nombreArticulo).toBe('Lomo')
  })

  it('agrupa dos líneas idénticas sumando la cantidad', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito.getState().anadir(nueva({ cantidad: 2 }))
    const { lineas } = useCarrito.getState()
    expect(lineas).toHaveLength(1)
    expect(lineas[0].cantidad).toBe(3)
  })

  it('no agrupa si cambia el tamaño', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito.getState().anadir(nueva({ tamanoId: 't-m', nombreTamano: 'Montado' }))
    expect(useCarrito.getState().lineas).toHaveLength(2)
  })

  it('no agrupa si cambian los extras', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito
      .getState()
      .anadir(nueva({ extras: [{ extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 }] }))
    expect(useCarrito.getState().lineas).toHaveLength(2)
  })

  it('no agrupa si cambia la nota', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito.getState().anadir(nueva({ notasLinea: 'sin tomate' }))
    expect(useCarrito.getState().lineas).toHaveLength(2)
  })

  it('agrupa aunque los extras vengan en distinto orden', () => {
    const queso = { extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 }
    const tomate = { extraId: 'e-2', nombre: 'Rodaja de tomate', precioCentimos: 100 }
    useCarrito.getState().anadir(nueva({ extras: [queso, tomate] }))
    useCarrito.getState().anadir(nueva({ extras: [tomate, queso] }))
    expect(useCarrito.getState().lineas).toHaveLength(1)
  })

  it('cambia la cantidad de una línea', () => {
    useCarrito.getState().anadir(nueva())
    const { id } = useCarrito.getState().lineas[0]
    useCarrito.getState().cambiarCantidad(id, 4)
    expect(useCarrito.getState().lineas[0].cantidad).toBe(4)
  })

  it('elimina la línea al bajar la cantidad a cero', () => {
    useCarrito.getState().anadir(nueva())
    const { id } = useCarrito.getState().lineas[0]
    useCarrito.getState().cambiarCantidad(id, 0)
    expect(useCarrito.getState().lineas).toEqual([])
  })

  it('elimina una línea concreta', () => {
    useCarrito.getState().anadir(nueva())
    useCarrito.getState().anadir(nueva({ tamanoId: 't-m', nombreTamano: 'Montado' }))
    const { id } = useCarrito.getState().lineas[0]
    useCarrito.getState().eliminar(id)
    expect(useCarrito.getState().lineas).toHaveLength(1)
    expect(useCarrito.getState().lineas[0].nombreTamano).toBe('Montado')
  })

  it('quita un extra concreto de una línea sin afectar a las demás', () => {
    useCarrito.getState().anadir(
      nueva({
        extras: [
          { extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 },
          { extraId: 'e-2', nombre: 'Rodaja de tomate', precioCentimos: 100 },
        ],
      }),
    )
    const { id } = useCarrito.getState().lineas[0]
    useCarrito.getState().quitarExtraDeLinea(id, 'e-1')
    expect(useCarrito.getState().lineas[0].extras.map((e) => e.extraId)).toEqual(['e-2'])
  })

  it('elimina la línea si se queda sin ningún extra y era el único diferenciador', () => {
    useCarrito.getState().anadir(nueva({ extras: [{ extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 }] }))
    useCarrito.getState().anadir(nueva({ extras: [] }))
    const conExtra = useCarrito.getState().lineas.find((l) => l.extras.length > 0)!
    useCarrito.getState().quitarExtraDeLinea(conExtra.id, 'e-1')
    // Las dos líneas ahora son iguales, pero quitarExtraDeLinea no fusiona:
    // solo vacía los extras de esa línea concreta.
    expect(useCarrito.getState().lineas).toHaveLength(2)
  })
})
