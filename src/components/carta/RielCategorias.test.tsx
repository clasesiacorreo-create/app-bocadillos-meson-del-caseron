import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RielCategorias } from './RielCategorias'
import type { ArticuloCarta, CategoriaCarta } from '@/lib/carta/tipos'

function articulo(id: string, nombre: string): ArticuloCarta {
  return {
    id,
    nombre,
    descripcion: 'Descripción de prueba',
    imagenUrl: null,
    disponible: true,
    tamanos: [{ id: `${id}-t`, nombre: 'Bocadillo', precioCentimos: 500, disponible: true }],
    extras: [],
  }
}

function categorias(): CategoriaCarta[] {
  return [
    { id: 'c-1', nombre: 'Clásicos a la plancha', articulos: [articulo('a-1', 'Lomo')] },
    { id: 'c-2', nombre: 'Del mar', articulos: [articulo('a-2', 'Rejos fritos')] },
  ]
}

describe('RielCategorias', () => {
  it('muestra los artículos de la primera categoría por defecto', () => {
    render(<RielCategorias categorias={categorias()} onAbrirArticulo={vi.fn()} />)
    expect(screen.getByText('Lomo')).toBeInTheDocument()
    expect(screen.queryByText('Rejos fritos')).not.toBeInTheDocument()
  })

  it('cambia de categoría al pulsar otra del riel', async () => {
    render(<RielCategorias categorias={categorias()} onAbrirArticulo={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Del mar/ }))
    expect(screen.getByText('Rejos fritos')).toBeInTheDocument()
    expect(screen.queryByText('Lomo')).not.toBeInTheDocument()
  })

  it('marca con aria-current la categoría activa, y solo esa', async () => {
    render(<RielCategorias categorias={categorias()} onAbrirArticulo={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Clásicos a la plancha/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: /Del mar/ }))
    expect(screen.getByRole('button', { name: /Del mar/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: /Clásicos a la plancha/ })).toHaveAttribute(
      'aria-current',
      'false',
    )
  })

  it('abre la ficha del artículo pulsado', async () => {
    const onAbrirArticulo = vi.fn()
    render(<RielCategorias categorias={categorias()} onAbrirArticulo={onAbrirArticulo} />)
    await userEvent.click(screen.getByRole('button', { name: 'Lomo' }))
    expect(onAbrirArticulo).toHaveBeenCalledWith(expect.objectContaining({ id: 'a-1' }))
  })
})
