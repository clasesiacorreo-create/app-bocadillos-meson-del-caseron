import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FormularioCheckout } from './FormularioCheckout'
import { useCarrito } from '@/lib/carrito/store'
import type { ReglasPedido } from '@/lib/precios/tipos'
import type { Franja } from '@/lib/horario/tipos'

const REGLAS: ReglasPedido = {
  envioCentimos: 200,
  pedidoMinimoCentimos: 1000,
  envioGratisDesdeCentimos: 2000,
}

const FRANJAS: Franja[] = [
  { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z', loAntesPosible: false },
]

function anadirLineaValida() {
  useCarrito.getState().anadir({
    articuloId: 'a-1',
    nombreArticulo: 'Lomo',
    imagenUrl: null,
    tamanoId: 't-b',
    nombreTamano: 'Bocadillo',
    precioUnitarioCentimos: 1200,
    extras: [],
    cantidad: 1,
    notasLinea: '',
  })
}

beforeEach(() => {
  useCarrito.getState().vaciar()
  vi.restoreAllMocks()
})

describe('FormularioCheckout', () => {
  it('oculta los campos de dirección en recogida', async () => {
    anadirLineaValida()
    render(<FormularioCheckout reglas={REGLAS} franjas={FRANJAS} />)

    await userEvent.click(screen.getByRole('button', { name: 'Recogida en el local' }))
    expect(screen.queryByLabelText('Calle')).not.toBeInTheDocument()
  })

  it('avisa de un artículo agotado y ofrece quitarlo del pedido', async () => {
    anadirLineaValida()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            ok: false,
            error: { tipo: 'articulo_no_disponible', articuloId: 'a-1', nombreArticulo: 'Lomo' },
          }),
      }),
    )

    render(<FormularioCheckout reglas={REGLAS} franjas={FRANJAS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Recogida en el local' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.type(screen.getByLabelText('Apellidos'), 'García')
    await userEvent.type(screen.getByLabelText('Teléfono'), '600111222')
    await userEvent.click(screen.getByRole('button', { name: /Pagar/ }))

    expect(await screen.findByText(/Lomo.*ya no está disponible/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar del pedido' })).toBeInTheDocument()
  })

  it('reactiva el botón de pagar y avisa si el envío falla por un error de red', async () => {
    anadirLineaValida()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    render(<FormularioCheckout reglas={REGLAS} franjas={FRANJAS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Recogida en el local' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.type(screen.getByLabelText('Apellidos'), 'García')
    await userEvent.type(screen.getByLabelText('Teléfono'), '600111222')
    await userEvent.click(screen.getByRole('button', { name: /Pagar/ }))

    expect(await screen.findByText(/No se ha podido conectar/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pagar/ })).toBeEnabled()
  })

  it('al quitar un extra no disponible, solo afecta a la línea del artículo indicado, no a otras con el mismo tamaño', async () => {
    useCarrito.getState().anadir({
      articuloId: 'a-1',
      nombreArticulo: 'Lomo',
      imagenUrl: null,
      tamanoId: 't-b',
      nombreTamano: 'Bocadillo',
      precioUnitarioCentimos: 1200,
      extras: [{ extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 }],
      cantidad: 1,
      notasLinea: '',
    })
    useCarrito.getState().anadir({
      articuloId: 'a-2',
      nombreArticulo: 'Chorizo',
      imagenUrl: null,
      tamanoId: 't-b',
      nombreTamano: 'Bocadillo',
      precioUnitarioCentimos: 1100,
      extras: [{ extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 }],
      cantidad: 1,
      notasLinea: '',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            ok: false,
            error: {
              tipo: 'extra_no_disponible',
              articuloId: 'a-1',
              tamanoId: 't-b',
              extraId: 'e-1',
              nombreExtra: 'Queso',
            },
          }),
      }),
    )

    render(<FormularioCheckout reglas={REGLAS} franjas={FRANJAS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Recogida en el local' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.type(screen.getByLabelText('Apellidos'), 'García')
    await userEvent.type(screen.getByLabelText('Teléfono'), '600111222')
    await userEvent.click(screen.getByRole('button', { name: /Pagar/ }))

    await userEvent.click(await screen.findByRole('button', { name: /Quitar «Queso»/ }))

    const lineas = useCarrito.getState().lineas
    const lineaLomo = lineas.find((l) => l.articuloId === 'a-1')!
    const lineaChorizo = lineas.find((l) => l.articuloId === 'a-2')!
    expect(lineaLomo.extras).toEqual([])
    expect(lineaChorizo.extras).toEqual([{ extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 }])
  })
})
