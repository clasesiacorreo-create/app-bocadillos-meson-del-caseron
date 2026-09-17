import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HojaCarrito } from './HojaCarrito'
import { useCarrito } from '@/lib/carrito/store'
import type { ReglasPedido } from '@/lib/precios/tipos'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const REGLAS: ReglasPedido = {
  envioCentimos: 200,
  pedidoMinimoCentimos: 1000,
  envioGratisDesdeCentimos: 2000,
}

function anadir(precioCentimos: number, cantidad = 1) {
  useCarrito.getState().anadir({
    articuloId: `a-${precioCentimos}`,
    nombreArticulo: 'Lomo',
    imagenUrl: null,
    tamanoId: 't-b',
    nombreTamano: 'Bocadillo',
    precioUnitarioCentimos: precioCentimos,
    extras: [],
    cantidad,
    notasLinea: '',
  })
}

beforeEach(() => {
  useCarrito.getState().vaciar()
})

describe('HojaCarrito', () => {
  it('avisa de cuánto falta para el pedido mínimo, pero deja continuar para recogida', () => {
    anadir(750)
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByText(/Te faltan 2,50/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar para recogida en local' })).toBeEnabled()
  })

  it('avisa de cuánto falta para el envío gratuito una vez superado el mínimo', () => {
    anadir(1500)
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByText(/5,00.*envío gratis/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeEnabled()
  })

  it('anuncia el envío gratuito al alcanzar el umbral', () => {
    anadir(2000)
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByText(/Envío gratis/)).toBeInTheDocument()
  })

  it('muestra el desglose de subtotal, envío y total', () => {
    anadir(1200)
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByTestId('subtotal')).toHaveTextContent('12,00')
    expect(screen.getByTestId('envio')).toHaveTextContent('2,00')
    expect(screen.getByTestId('total')).toHaveTextContent('14,00')
  })

  it('muestra el precio de cada línea', () => {
    anadir(500, 2)
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByTestId('precio-linea')).toHaveTextContent('10,00')
  })

  it('avisa cuando el carrito está vacío', () => {
    render(<HojaCarrito reglas={REGLAS} onCerrar={vi.fn()} />)
    expect(screen.getByText(/carrito está vacío/i)).toBeInTheDocument()
  })
})
