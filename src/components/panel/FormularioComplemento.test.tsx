import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FormularioComplemento } from './FormularioComplemento'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

const TAMANOS = [
  { id: 't-b', nombre: 'Bocadillo' },
  { id: 't-m', nombre: 'Montado' },
  { id: 't-u', nombre: 'Único' },
]

const CATEGORIAS = [
  {
    id: 'c-1',
    nombre: 'Clásicos a la plancha',
    articulos: [
      { id: 'a-1', nombre: 'Lomo' },
      { id: 'a-2', nombre: 'Panceta' },
    ],
  },
  {
    id: 'c-2',
    nombre: 'Hamburguesas',
    articulos: [{ id: 'a-3', nombre: 'La Caserona' }],
  },
]

beforeEach(() => {
  vi.restoreAllMocks()
  push.mockReset()
  refresh.mockReset()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'e-nuevo' }) }))
})

describe('FormularioComplemento', () => {
  it('no deja guardar sin precio en ningún tamaño', async () => {
    render(<FormularioComplemento tamanos={TAMANOS} categorias={CATEGORIAS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Queso')
    await userEvent.click(screen.getByRole('button', { name: 'Crear complemento' }))

    expect(screen.getByText('Pon precio para al menos un tamaño.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('crea el complemento solo con los tamaños que tienen precio, sin productos si no se marca ninguno', async () => {
    render(<FormularioComplemento tamanos={TAMANOS} categorias={CATEGORIAS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Queso')
    await userEvent.type(screen.getByLabelText('Bocadillo'), '1')
    await userEvent.type(screen.getByLabelText('Montado'), '0,50')
    await userEvent.click(screen.getByRole('button', { name: 'Crear complemento' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/carta/complementos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Queso',
          descripcion: '',
          preciosPorTamanoId: { 't-b': 100, 't-m': 50 },
          articuloIds: [],
        }),
      }),
    )
    expect(push).toHaveBeenCalledWith('/panel/carta/complementos')
  })

  it('en edición, precarga los precios existentes', () => {
    render(
      <FormularioComplemento
        tamanos={TAMANOS}
        categorias={CATEGORIAS}
        complementoInicial={{
          id: 'e-1',
          nombre: 'Queso',
          descripcion: '',
          preciosPorTamanoId: { 't-b': 100 },
          articuloIds: [],
        }}
      />,
    )
    expect(screen.getByLabelText('Bocadillo')).toHaveValue('1')
    expect(screen.getByLabelText('Montado')).toHaveValue('')
  })

  it('muestra los artículos agrupados por categoría', () => {
    render(<FormularioComplemento tamanos={TAMANOS} categorias={CATEGORIAS} />)
    expect(screen.getByText('Clásicos a la plancha')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Lomo' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Panceta' })).toBeInTheDocument()
    expect(screen.getByText('Hamburguesas')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'La Caserona' })).toBeInTheDocument()
  })

  it('«Seleccionar todos» marca todos los artículos, y «Ninguno» los desmarca', async () => {
    render(<FormularioComplemento tamanos={TAMANOS} categorias={CATEGORIAS} />)

    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar todos' }))
    expect(screen.getByRole('checkbox', { name: 'Lomo' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Panceta' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'La Caserona' })).toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: 'Ninguno' }))
    expect(screen.getByRole('checkbox', { name: 'Lomo' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Panceta' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'La Caserona' })).not.toBeChecked()
  })

  it('envía los artículos marcados al guardar', async () => {
    render(<FormularioComplemento tamanos={TAMANOS} categorias={CATEGORIAS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Queso')
    await userEvent.type(screen.getByLabelText('Bocadillo'), '1')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lomo' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'La Caserona' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear complemento' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/carta/complementos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Queso',
          descripcion: '',
          preciosPorTamanoId: { 't-b': 100 },
          articuloIds: ['a-1', 'a-3'],
        }),
      }),
    )
  })

  it('en edición, precarga los artículos ya asociados', () => {
    render(
      <FormularioComplemento
        tamanos={TAMANOS}
        categorias={CATEGORIAS}
        complementoInicial={{
          id: 'e-1',
          nombre: 'Queso',
          descripcion: '',
          preciosPorTamanoId: { 't-b': 100 },
          articuloIds: ['a-2'],
        }}
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'Panceta' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Lomo' })).not.toBeChecked()
  })
})
