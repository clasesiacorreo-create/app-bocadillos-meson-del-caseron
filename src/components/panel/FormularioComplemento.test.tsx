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

beforeEach(() => {
  vi.restoreAllMocks()
  push.mockReset()
  refresh.mockReset()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'e-nuevo' }) }))
})

describe('FormularioComplemento', () => {
  it('no deja guardar sin precio en ningún tamaño', async () => {
    render(<FormularioComplemento tamanos={TAMANOS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Queso')
    await userEvent.click(screen.getByRole('button', { name: 'Crear complemento' }))

    expect(screen.getByText('Pon precio para al menos un tamaño.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('crea el complemento solo con los tamaños que tienen precio', async () => {
    render(<FormularioComplemento tamanos={TAMANOS} />)
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
        }),
      }),
    )
    expect(push).toHaveBeenCalledWith('/panel/carta/complementos')
  })

  it('en edición, precarga los precios existentes', () => {
    render(
      <FormularioComplemento
        tamanos={TAMANOS}
        complementoInicial={{ id: 'e-1', nombre: 'Queso', descripcion: '', preciosPorTamanoId: { 't-b': 100 } }}
      />,
    )
    expect(screen.getByLabelText('Bocadillo')).toHaveValue('1')
    expect(screen.getByLabelText('Montado')).toHaveValue('')
  })
})
