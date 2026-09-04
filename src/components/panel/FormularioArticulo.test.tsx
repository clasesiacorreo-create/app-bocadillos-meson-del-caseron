import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FormularioArticulo } from './FormularioArticulo'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

const CATEGORIAS = [{ id: 'c-1', nombre: 'Clásicos a la plancha' }]
const TAMANOS = [
  { id: 't-b', nombre: 'Bocadillo' },
  { id: 't-m', nombre: 'Montado' },
]
const EXTRAS = [{ id: 'e-1', nombre: 'Queso' }]

beforeEach(() => {
  vi.restoreAllMocks()
  push.mockReset()
  refresh.mockReset()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'a-nuevo' }) }))
})

describe('FormularioArticulo — alta', () => {
  it('no deja guardar sin ofrecer al menos un tamaño', async () => {
    render(<FormularioArticulo categorias={CATEGORIAS} tamanos={TAMANOS} extras={EXTRAS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Lomo')
    await userEvent.click(screen.getByRole('button', { name: 'Crear artículo' }))

    expect(screen.getByText('Ofrece el artículo en al menos un tamaño.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('crea el artículo con los tamaños marcados y redirige a su edición', async () => {
    render(<FormularioArticulo categorias={CATEGORIAS} tamanos={TAMANOS} extras={EXTRAS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Lomo')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Bocadillo' }))
    await userEvent.type(screen.getByPlaceholderText('Precio (€)'), '5')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Queso' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear artículo' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/carta/articulos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Lomo',
          descripcion: '',
          categoriaId: 'c-1',
          tamanos: [{ tamanoId: 't-b', precioCentimos: 500, disponible: true }],
          extraIds: ['e-1'],
        }),
      }),
    )
    expect(push).toHaveBeenCalledWith('/panel/carta/articulos/a-nuevo')
  })
})

describe('FormularioArticulo — edición', () => {
  const ARTICULO_INICIAL = {
    id: 'a-1',
    nombre: 'Lomo',
    descripcion: 'Lomo jugoso',
    categoriaId: 'c-1',
    imagenUrl: null,
    tamanos: [{ tamanoId: 't-b', precioCentimos: 500, disponible: true }],
    extraIds: ['e-1'],
  }

  it('precarga los datos existentes y permite dar de baja', async () => {
    render(
      <FormularioArticulo categorias={CATEGORIAS} tamanos={TAMANOS} extras={EXTRAS} articuloInicial={ARTICULO_INICIAL} />,
    )
    expect(screen.getByLabelText('Nombre')).toHaveValue('Lomo')
    expect(screen.getByRole('checkbox', { name: 'Bocadillo' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Montado' })).not.toBeChecked()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Dar de baja' }))

    expect(fetch).toHaveBeenCalledWith('/api/panel/carta/articulos/a-1', expect.objectContaining({ method: 'DELETE' }))
    expect(push).toHaveBeenCalledWith('/panel/carta/articulos')
  })
})
