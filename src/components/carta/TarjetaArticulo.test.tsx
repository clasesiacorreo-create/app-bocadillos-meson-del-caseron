import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TarjetaArticulo } from './TarjetaArticulo'
import type { ArticuloCarta } from '@/lib/carta/tipos'

function articulo(parcial: Partial<ArticuloCarta> = {}): ArticuloCarta {
  return {
    id: 'a-1',
    nombre: 'Lomo',
    descripcion: 'Lomo jugoso marcado al punto con pan crujiente',
    imagenUrl: null,
    disponible: true,
    tamanos: [
      { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
      { id: 't-m', nombre: 'Montado', precioCentimos: 400, disponible: true },
    ],
    extras: [],
    ...parcial,
  }
}

describe('TarjetaArticulo', () => {
  it('muestra el nombre, la descripción y el precio más bajo', () => {
    render(<TarjetaArticulo articulo={articulo()} onAbrir={vi.fn()} />)
    expect(screen.getByText('Lomo')).toBeInTheDocument()
    expect(screen.getByText(/Lomo jugoso/)).toBeInTheDocument()
    expect(screen.getByText(/desde 4,00/)).toBeInTheDocument()
  })

  it('marca los artículos no disponibles y no deja abrirlos', () => {
    render(<TarjetaArticulo articulo={articulo({ disponible: false })} onAbrir={vi.fn()} />)
    expect(screen.getByText('Hoy no disponible')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lomo/ })).toBeDisabled()
  })

  it('no se puede abrir si ningún tamaño está disponible', () => {
    const sinTamanos = articulo({
      tamanos: [
        { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: false },
        { id: 't-m', nombre: 'Montado', precioCentimos: 400, disponible: false },
      ],
    })
    render(<TarjetaArticulo articulo={sinTamanos} onAbrir={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Lomo/ })).toBeDisabled()
  })

  it('ignora el tamaño más barato si no está disponible al calcular el "desde"', () => {
    const tamanoBaratoAgotado = articulo({
      tamanos: [
        { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
        { id: 't-m', nombre: 'Montado', precioCentimos: 400, disponible: false },
      ],
    })
    render(<TarjetaArticulo articulo={tamanoBaratoAgotado} onAbrir={vi.fn()} />)
    expect(screen.getByText(/desde 5,00/)).toBeInTheDocument()
    expect(screen.queryByText(/desde 4,00/)).not.toBeInTheDocument()
  })
})
