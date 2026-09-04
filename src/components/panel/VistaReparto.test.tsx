import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VistaReparto } from './VistaReparto'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'

const PERFIL_REPARTIDOR: PerfilStaff = { userId: 'u-1', nombre: 'Repartidor', rol: 'repartidor' }

type FilaPedido = Record<string, unknown>

/** Mismo doble de Realtime que usa TableroPedidos.test.tsx: guarda los
 * callbacks registrados para poder dispararlos desde los tests. */
const { manejadores, pedidoRemoto } = vi.hoisted(() => ({
  manejadores: new Map<string, (payload: { new: Record<string, unknown> }) => void>(),
  pedidoRemoto: { actual: null as unknown },
}))

vi.mock('@/lib/supabase/cliente-navegador', () => {
  function canalEncadenable() {
    const canal = {
      on: (
        _tipo: string,
        filtro: { event: string; table: string },
        callback: (payload: { new: Record<string, unknown> }) => void,
      ) => {
        manejadores.set(`${filtro.event}:${filtro.table}`, callback)
        return canal
      },
      subscribe: () => canal,
    }
    return canal
  }

  return {
    crearClienteNavegador: () => ({
      channel: () => canalEncadenable(),
      removeChannel: vi.fn(),
      from: () => ({
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: pedidoRemoto.actual }) }),
        }),
      }),
    }),
  }
})

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
    direccion_piso: null,
    direccion_cp: '28850',
    direccion_ciudad: 'Torrejón de Ardoz',
    direccion_indicaciones: null,
    notas: '',
    franja_solicitada_inicio: '2026-01-15T12:00:00.000Z',
    franja_solicitada_fin: '2026-01-15T12:30:00.000Z',
    franja_solicitada_asap: false,
    franja_confirmada_inicio: null,
    franja_confirmada_fin: null,
    confirmado_en: null,
    subtotal_centimos: 1000,
    envio_centimos: 200,
    total_centimos: 1200,
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

async function emitir(clave: string, fila: FilaPedido) {
  const manejador = manejadores.get(clave)
  if (!manejador) throw new Error(`El componente no registró ningún manejador para ${clave}`)
  await act(async () => {
    manejador({ new: fila })
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  manejadores.clear()
  pedidoRemoto.actual = null
})

describe('VistaReparto', () => {
  it('separa "para repartir" de "mis entregas"', () => {
    const pedidos = [
      pedido({ id: 'p-1', estado: 'pendiente_envio' }),
      pedido({ id: 'p-2', estado: 'en_reparto', repartidor_id: 'u-1' }),
    ]
    render(<VistaReparto perfil={PERFIL_REPARTIDOR} pedidosIniciales={pedidos} />)

    expect(screen.getByRole('button', { name: /Para repartir \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mis entregas \(1\)/ })).toBeInTheDocument()
  })

  it('no cuenta en "mis entregas" el pedido que lleva otro repartidor', () => {
    render(
      <VistaReparto
        perfil={PERFIL_REPARTIDOR}
        pedidosIniciales={[pedido({ id: 'p-2', estado: 'en_reparto', repartidor_id: 'otro' })]}
      />,
    )
    expect(screen.getByRole('button', { name: /Mis entregas \(0\)/ })).toBeInTheDocument()
  })

  it('trae y añade por tiempo real un pedido nuevo listo para repartir', async () => {
    pedidoRemoto.actual = pedido({ id: 'p-nuevo', codigo_publico: 'zzz999', estado: 'pendiente_envio' })
    render(<VistaReparto perfil={PERFIL_REPARTIDOR} pedidosIniciales={[]} />)

    await emitir('UPDATE:pedidos', { id: 'p-nuevo', estado: 'pendiente_envio' })

    expect(await screen.findByText(/zzz999/)).toBeInTheDocument()
  })

  it('mueve un pedido de "para repartir" a "mis entregas" en cuanto lo recoge', async () => {
    render(
      <VistaReparto perfil={PERFIL_REPARTIDOR} pedidosIniciales={[pedido({ id: 'p-1', estado: 'pendiente_envio' })]} />,
    )
    expect(screen.getByRole('button', { name: /Para repartir \(1\)/ })).toBeInTheDocument()

    await emitir('UPDATE:pedidos', { id: 'p-1', estado: 'en_reparto', repartidor_id: 'u-1' })

    expect(screen.getByRole('button', { name: /Para repartir \(0\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mis entregas \(1\)/ })).toBeInTheDocument()
  })
})
