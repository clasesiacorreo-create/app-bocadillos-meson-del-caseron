import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TarjetaReparto } from './TarjetaReparto'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'

function pedido(parcial: Partial<PedidoConLineas> = {}): PedidoConLineas {
  return {
    id: 'p-1',
    codigo_publico: 'abc123',
    estado: 'pendiente_envio',
    modo_entrega: 'domicilio',
    cliente_nombre: 'Ana',
    cliente_apellidos: 'García',
    cliente_telefono: '600111222',
    direccion_calle: 'C. Hierro',
    direccion_numero: '73',
    direccion_piso: '2ºA',
    direccion_cp: '28850',
    direccion_ciudad: 'Torrejón de Ardoz',
    direccion_indicaciones: 'Portero automático',
    notas: '',
    franja_solicitada_inicio: '2026-01-15T12:00:00.000Z',
    franja_solicitada_fin: '2026-01-15T12:30:00.000Z',
    franja_solicitada_asap: false,
    franja_confirmada_inicio: '2026-01-15T12:00:00.000Z',
    franja_confirmada_fin: '2026-01-15T12:30:00.000Z',
    confirmado_en: '2026-01-15T11:05:00.000Z',
    subtotal_centimos: 1000,
    envio_centimos: 200,
    total_centimos: 1200,
    stripe_session_id: 'sess_1',
    stripe_payment_intent: 'pi_1',
    repartidor_id: null,
    creado_en: '2026-01-15T11:00:00.000Z',
    pagado_en: '2026-01-15T11:00:05.000Z',
    entregado_en: null,
    pedido_lineas: [
      {
        id: 'l-1',
        pedido_id: 'p-1',
        articulo_id: 'a-1',
        tamano_id: 't-1',
        nombre_articulo: 'Lomo',
        nombre_tamano: 'Bocadillo',
        precio_unitario_centimos: 500,
        cantidad: 1,
        notas_linea: '',
        preparada: false,
        pedido_extras: [],
      },
    ],
    ...parcial,
  } as PedidoConLineas
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(pedido({ estado: 'en_reparto' })) }),
  )
})

describe('TarjetaReparto', () => {
  it('no muestra ningún precio ni total, solo el distintivo de pago', () => {
    render(<TarjetaReparto pedido={pedido()} onActualizado={() => {}} />)
    expect(screen.getByText('Pagado online — no cobrar')).toBeInTheDocument()
    expect(screen.queryByText(/12,00 €/)).not.toBeInTheDocument()
    expect(screen.queryByText(/10,00 €/)).not.toBeInTheDocument()
    expect(screen.queryByText(/2,00 €/)).not.toBeInTheDocument()
  })

  it('muestra la dirección, las indicaciones y un enlace al mapa', () => {
    render(<TarjetaReparto pedido={pedido()} onActualizado={() => {}} />)
    expect(screen.getByText(/C\. Hierro 73, 2ºA/)).toBeInTheDocument()
    expect(screen.getByText('Portero automático')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir en el mapa' })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps'),
    )
  })

  it('"Recojo este" pasa el pedido a en_reparto', async () => {
    const onActualizado = vi.fn()
    render(<TarjetaReparto pedido={pedido()} onActualizado={onActualizado} />)

    await userEvent.click(screen.getByRole('button', { name: 'Recojo este' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/pedidos/p-1/avanzar',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ aFase: 'en_reparto' }) }),
    )
    expect(onActualizado).toHaveBeenCalled()
  })

  it('"Entregado" es la única acción de un pedido en reparto', async () => {
    const onActualizado = vi.fn()
    render(<TarjetaReparto pedido={pedido({ estado: 'en_reparto' })} onActualizado={onActualizado} />)

    expect(screen.queryByRole('button', { name: 'Recojo este' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Entregado' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/pedidos/p-1/avanzar',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ aFase: 'entregado' }) }),
    )
    expect(onActualizado).toHaveBeenCalled()
  })

  it('enseña el error del servidor si la acción falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Otra persona ya movió este pedido' }) }),
    )
    render(<TarjetaReparto pedido={pedido()} onActualizado={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Recojo este' }))

    expect(screen.getByText('Otra persona ya movió este pedido')).toBeInTheDocument()
  })
})
