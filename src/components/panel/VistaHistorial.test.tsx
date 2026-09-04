import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VistaHistorial } from './VistaHistorial'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'

function pedido(parcial: Partial<PedidoConLineas> = {}): PedidoConLineas {
  return {
    id: 'p-1',
    codigo_publico: 'abc123',
    estado: 'entregado',
    modo_entrega: 'recogida',
    cliente_nombre: 'Ana',
    cliente_apellidos: 'García',
    cliente_telefono: '600111222',
    direccion_calle: null,
    direccion_numero: null,
    direccion_piso: null,
    direccion_cp: null,
    direccion_ciudad: null,
    direccion_indicaciones: null,
    notas: '',
    franja_solicitada_inicio: '2026-01-15T12:00:00.000Z',
    franja_solicitada_fin: '2026-01-15T12:30:00.000Z',
    franja_solicitada_asap: false,
    franja_confirmada_inicio: '2026-01-15T12:00:00.000Z',
    franja_confirmada_fin: '2026-01-15T12:30:00.000Z',
    confirmado_en: '2026-01-15T11:05:00.000Z',
    subtotal_centimos: 1000,
    envio_centimos: 0,
    total_centimos: 1000,
    stripe_session_id: 'sess_1',
    stripe_payment_intent: 'pi_1',
    repartidor_id: null,
    creado_en: '2026-01-15T11:00:00.000Z',
    pagado_en: '2026-01-15T11:00:05.000Z',
    entregado_en: '2026-01-15T12:20:00.000Z',
    pedido_lineas: [],
    ...parcial,
  } as PedidoConLineas
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }))
})

describe('VistaHistorial', () => {
  it('muestra la caja del día y los pedidos entregados', () => {
    render(<VistaHistorial historialInicial={[pedido()]} totalHoyCentimos={1000} />)
    // El pedido de la fixture también totaliza 1000 céntimos, así que sin
    // acotar por selector "10,00 €" aparecería dos veces (caja del día y
    // línea del pedido) y getByText fallaría por ambigüedad.
    expect(screen.getByText('10,00 €', { selector: '.font-bold' })).toBeInTheDocument()
    expect(screen.getByText('abc123')).toBeInTheDocument()
    expect(screen.getByText(/Ana García/)).toBeInTheDocument()
  })

  it('busca por teléfono contra el servidor', async () => {
    render(<VistaHistorial historialInicial={[pedido()]} totalHoyCentimos={1000} />)
    await userEvent.type(screen.getByPlaceholderText('Buscar por teléfono'), '600111222')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(fetch).toHaveBeenCalledWith('/api/panel/historial?telefono=600111222')
  })

  it('avisa cuando no hay pedidos', () => {
    render(<VistaHistorial historialInicial={[]} totalHoyCentimos={0} />)
    expect(screen.getByText('No hay pedidos entregados aquí.')).toBeInTheDocument()
  })
})
