import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FormularioAjustes } from './FormularioAjustes'
import type { Ajustes } from '@/lib/ajustes'

const SIN_TRAMOS = { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [] }

const AJUSTES: Ajustes = {
  nombreRestaurante: 'El Horno del Caserón',
  telefono: '916780435',
  direccion: 'C. Hierro, 73, Torrejón de Ardoz',
  horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '16:00' }] },
  envioCentimos: 200,
  pedidoMinimoCentimos: 1000,
  envioGratisDesdeCentimos: 2000,
  antelacionMinimaMin: 30,
  duracionFranjaMin: 30,
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }))
})

describe('FormularioAjustes', () => {
  it('precarga los importes en euros', () => {
    render(<FormularioAjustes ajustesIniciales={AJUSTES} />)
    expect(screen.getByLabelText('Coste de envío (€)')).toHaveValue('2')
    expect(screen.getByLabelText('Pedido mínimo a domicilio (€)')).toHaveValue('10')
  })

  it('avisa si el envío gratis no supera el pedido mínimo', async () => {
    render(<FormularioAjustes ajustesIniciales={AJUSTES} />)
    const campoEnvioGratis = screen.getByLabelText('Envío gratis desde (€)')
    await userEvent.clear(campoEnvioGratis)
    await userEvent.type(campoEnvioGratis, '5')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ajustes' }))

    expect(
      screen.getByText('El envío gratis debe activarse a partir de un importe mayor que el pedido mínimo.'),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('guarda los ajustes válidos', async () => {
    render(<FormularioAjustes ajustesIniciales={AJUSTES} />)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ajustes' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/ajustes',
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(await screen.findByText('Ajustes guardados.')).toBeInTheDocument()
  })

  it('añade y quita tramos de un día', async () => {
    render(<FormularioAjustes ajustesIniciales={AJUSTES} />)
    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(1)

    await userEvent.click(screen.getAllByRole('button', { name: 'Añadir tramo' })[3]) // jueves es el 4º día
    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(2)

    await userEvent.click(screen.getAllByRole('button', { name: 'Quitar' })[0])
    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(1)
  })
})
