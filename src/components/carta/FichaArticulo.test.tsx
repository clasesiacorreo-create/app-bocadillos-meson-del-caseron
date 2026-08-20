import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FichaArticulo } from './FichaArticulo'
import type { ArticuloCarta } from '@/lib/carta/tipos'

const ARTICULO: ArticuloCarta = {
  id: 'a-1',
  nombre: 'Lomo',
  descripcion: 'Lomo jugoso',
  imagenUrl: null,
  disponible: true,
  tamanos: [
    { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
    { id: 't-m', nombre: 'Montado', precioCentimos: 400, disponible: true },
  ],
  extras: [
    {
      id: 'e-queso',
      nombre: 'Queso',
      descripcion: '',
      disponible: true,
      precioPorTamanoId: { 't-b': 100, 't-m': 50 },
    },
    {
      id: 'e-cebolla',
      nombre: 'Cebolla caramelizada',
      descripcion: '',
      disponible: false,
      precioPorTamanoId: { 't-b': 100, 't-m': 50 },
    },
  ],
}

describe('FichaArticulo', () => {
  it('parte del primer tamaño disponible', () => {
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={vi.fn()} />)
    expect(screen.getByRole('radio', { name: /Bocadillo/ })).toBeChecked()
  })

  it('recalcula el total al cambiar de tamaño', async () => {
    const usuario = userEvent.setup()
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={vi.fn()} />)
    await usuario.click(screen.getByRole('radio', { name: /Montado/ }))
    expect(screen.getByRole('button', { name: /Añadir/ })).toHaveTextContent('4,00')
  })

  it('suma los extras marcados al total', async () => {
    const usuario = userEvent.setup()
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={vi.fn()} />)
    await usuario.click(screen.getByRole('checkbox', { name: /Queso/ }))
    expect(screen.getByRole('button', { name: /Añadir/ })).toHaveTextContent('6,00')
  })

  it('muestra los extras no disponibles atenuados y sin poder marcarlos', () => {
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={vi.fn()} />)
    expect(screen.getByRole('checkbox', { name: /Cebolla caramelizada/ })).toBeDisabled()
    expect(screen.getByText('Hoy no disponible')).toBeInTheDocument()
  })

  it('entrega la línea completa al añadir', async () => {
    const usuario = userEvent.setup()
    const onAnadir = vi.fn()
    render(<FichaArticulo articulo={ARTICULO} onCerrar={vi.fn()} onAnadir={onAnadir} />)

    await usuario.click(screen.getByRole('checkbox', { name: /Queso/ }))
    await usuario.click(screen.getByRole('button', { name: 'Aumentar cantidad' }))
    await usuario.type(screen.getByLabelText(/Nota/), 'sin tomate')
    await usuario.click(screen.getByRole('button', { name: /Añadir/ }))

    expect(onAnadir).toHaveBeenCalledWith({
      articuloId: 'a-1',
      nombreArticulo: 'Lomo',
      imagenUrl: null,
      tamanoId: 't-b',
      nombreTamano: 'Bocadillo',
      precioUnitarioCentimos: 500,
      extras: [{ extraId: 'e-queso', nombre: 'Queso', precioCentimos: 100 }],
      cantidad: 2,
      notasLinea: 'sin tomate',
    })
  })

  it('descarta los extras al cambiar a un tamaño sin ese precio', async () => {
    const usuario = userEvent.setup()
    const onAnadir = vi.fn()
    const conTamanoUnico: ArticuloCarta = {
      ...ARTICULO,
      tamanos: [
        { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
        { id: 't-u', nombre: 'Único', precioCentimos: 900, disponible: true },
      ],
    }
    render(<FichaArticulo articulo={conTamanoUnico} onCerrar={vi.fn()} onAnadir={onAnadir} />)

    await usuario.click(screen.getByRole('checkbox', { name: /Queso/ }))
    await usuario.click(screen.getByRole('radio', { name: /Único/ }))
    await usuario.click(screen.getByRole('button', { name: /Añadir/ }))

    expect(onAnadir.mock.calls[0][0].extras).toEqual([])
  })
})
