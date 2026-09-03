import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TableroPedidos } from './TableroPedidos'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'

const PERFIL_COCINA: PerfilStaff = { userId: 'u-1', nombre: 'Cocina', rol: 'cocina' }

vi.mock('@/lib/supabase/cliente-navegador', () => ({
  crearClienteNavegador: () => ({
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }),
}))

function pedido(parcial: Partial<PedidoConLineas> = {}): PedidoConLineas {
  return {
    id: 'p-1',
    codigo_publico: 'abc123',
    estado: 'nuevo',
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
    franja_confirmada_inicio: null,
    franja_confirmada_fin: null,
    confirmado_en: null,
    subtotal_centimos: 1000,
    envio_centimos: 0,
    total_centimos: 1000,
    stripe_session_id: 'sess_1',
    stripe_payment_intent: 'pi_1',
    repartidor_id: null,
    creado_en: '2026-01-15T11:00:00.000Z',
    pagado_en: '2026-01-15T11:00:05.000Z',
    entregado_en: null,
    pedido_lineas: [],
    ...parcial,
  } as PedidoConLineas
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('TableroPedidos', () => {
  it('cuenta cada pedido en su pestaña y filtra la lista visible', async () => {
    const pedidos = [pedido({ id: 'p-1', estado: 'nuevo' }), pedido({ id: 'p-2', estado: 'entregado' })]
    render(<TableroPedidos perfil={PERFIL_COCINA} pedidosIniciales={pedidos} franjas={[]} />)

    expect(screen.getByRole('button', { name: /Nuevos \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Entregados \(1\)/ })).toBeInTheDocument()
    expect(screen.getByText(/abc123/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Entregados/ }))
    expect(screen.queryByText('No hay pedidos aquí.')).not.toBeInTheDocument()
  })

  it('avisa cuando la pestaña activa no tiene pedidos', () => {
    render(
      <TableroPedidos
        perfil={PERFIL_COCINA}
        pedidosIniciales={[pedido({ estado: 'entregado' })]}
        franjas={[]}
      />,
    )
    expect(screen.getByText('No hay pedidos aquí.')).toBeInTheDocument()
  })
})
