import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VistaDisponibilidad } from './VistaDisponibilidad'
import type { Carta } from '@/lib/carta/tipos'

const CARTA: Carta = {
  categorias: [
    {
      id: 'c-1',
      nombre: 'Clásicos a la plancha',
      articulos: [
        {
          id: 'a-1',
          nombre: 'Lomo',
          descripcion: '',
          imagenUrl: null,
          disponible: true,
          tamanos: [
            { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
            { id: 't-m', nombre: 'Montado', precioCentimos: 400, disponible: true },
          ],
          extras: [
            { id: 'e-1', nombre: 'Queso', descripcion: '', disponible: true, precioPorTamanoId: { 't-b': 100 } },
          ],
        },
      ],
    },
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ disponible: false }) }))
})

describe('VistaDisponibilidad', () => {
  it('muestra el artículo, sus tamaños y sus complementos', () => {
    render(<VistaDisponibilidad carta={CARTA} />)
    expect(screen.getByText('Lomo')).toBeInTheDocument()
    expect(screen.getByText('Bocadillo')).toBeInTheDocument()
    expect(screen.getByText('Montado')).toBeInTheDocument()
    expect(screen.getByText('Queso')).toBeInTheDocument()
  })

  it('desactiva el artículo al pulsar su interruptor', async () => {
    render(<VistaDisponibilidad carta={CARTA} />)
    const interruptor = screen.getByRole('switch', { name: 'Lomo' })
    expect(interruptor).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(interruptor)

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/carta/articulos/a-1/disponibilidad',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ disponible: false }) }),
    )
    expect(interruptor).toHaveAttribute('aria-checked', 'false')
  })

  it('pide la disponibilidad de un tamaño por la pareja artículo + tamaño', async () => {
    render(<VistaDisponibilidad carta={CARTA} />)
    await userEvent.click(screen.getByRole('switch', { name: 'Bocadillo' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/carta/articulos/a-1/tamanos/t-b/disponibilidad',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('muestra el interruptor del tamaño aunque el artículo solo tenga uno', () => {
    const cartaTamanoUnico: Carta = {
      categorias: [
        {
          id: 'c-2',
          nombre: 'Especiales',
          articulos: [
            {
              id: 'a-2',
              nombre: 'La Caserona',
              descripcion: '',
              imagenUrl: null,
              disponible: true,
              tamanos: [{ id: 't-u', nombre: 'Único', precioCentimos: 600, disponible: true }],
              extras: [],
            },
          ],
        },
      ],
    }
    render(<VistaDisponibilidad carta={cartaTamanoUnico} />)

    expect(screen.getByRole('switch', { name: 'La Caserona' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Único' })).toBeInTheDocument()
  })

  it('revierte el cambio si el servidor falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'No se pudo guardar' }) }),
    )
    render(<VistaDisponibilidad carta={CARTA} />)
    const interruptor = screen.getByRole('switch', { name: 'Lomo' })

    await userEvent.click(interruptor)

    expect(interruptor).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('No se pudo guardar')).toBeInTheDocument()
  })
})
