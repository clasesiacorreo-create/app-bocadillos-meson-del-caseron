import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TableroPedidos } from './TableroPedidos'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'

const PERFIL_COCINA: PerfilStaff = { userId: 'u-1', nombre: 'Cocina', rol: 'cocina' }

type FilaPedido = Record<string, unknown>

/**
 * El mock del cliente guarda los callbacks que el componente registra en el
 * canal de Realtime (`.on(...)`) para poder dispararlos desde los tests, y
 * devuelve por `from(...)` el pedido que cada test coloque en `pedidoRemoto`.
 * Sin esto los manejadores de tiempo real no tendrían ninguna cobertura.
 */
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

/** jsdom no trae Web Audio: sin este doble el aviso se cortaría antes de vibrar. */
class ContextoAudioFalso {
  state = 'running'
  currentTime = 0
  destination = {}
  resume() {
    return Promise.resolve()
  }
  createOscillator() {
    return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }
  }
}

const vibrar = vi.fn()

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

/** Dispara el manejador que el componente registró para ese evento y tabla. */
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
  vibrar.mockClear()
  vi.stubGlobal('AudioContext', ContextoAudioFalso)
  Object.defineProperty(navigator, 'vibrate', { value: vibrar, configurable: true, writable: true })
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

  // A cocina el pedido recién pagado le llega como UPDATE (pendiente_pago →
  // nuevo), nunca como INSERT: RLS le oculta la fila mientras está sin cobrar.
  // Si el tablero solo añadiera pedidos en el INSERT, la cocina no vería nunca
  // aparecer un pedido nuevo hasta recargar la página.
  it('trae y avisa un pedido que aparece por primera vez con un UPDATE', async () => {
    pedidoRemoto.actual = pedido({ id: 'p-nuevo', codigo_publico: 'zzz999', estado: 'nuevo' })
    render(<TableroPedidos perfil={PERFIL_COCINA} pedidosIniciales={[]} franjas={[]} />)

    await emitir('UPDATE:pedidos', { id: 'p-nuevo', estado: 'nuevo' })

    expect(await screen.findByText(/zzz999/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nuevos \(1\)/ })).toBeInTheDocument()
    expect(vibrar).toHaveBeenCalled()
  })

  it('ignora un pedido pendiente de pago que no está en el tablero, sin avisar', async () => {
    pedidoRemoto.actual = pedido({ id: 'p-oculto', codigo_publico: 'oculto1', estado: 'nuevo' })
    render(<TableroPedidos perfil={PERFIL_COCINA} pedidosIniciales={[]} franjas={[]} />)

    await emitir('INSERT:pedidos', { id: 'p-oculto', estado: 'pendiente_pago' })

    expect(screen.queryByText(/oculto1/)).not.toBeInTheDocument()
    expect(screen.getByText('No hay pedidos aquí.')).toBeInTheDocument()
    expect(vibrar).not.toHaveBeenCalled()
  })

  it('actualiza en su sitio un pedido que ya estaba en el tablero, sin repetir el aviso', async () => {
    render(
      <TableroPedidos
        perfil={PERFIL_COCINA}
        pedidosIniciales={[pedido({ id: 'p-1', estado: 'nuevo' })]}
        franjas={[]}
      />,
    )
    expect(screen.getByRole('button', { name: /Nuevos \(1\)/ })).toBeInTheDocument()

    await emitir('UPDATE:pedidos', { id: 'p-1', estado: 'en_preparacion' })

    expect(screen.getByRole('button', { name: /Nuevos \(0\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /En marcha \(1\)/ })).toBeInTheDocument()
    expect(vibrar).not.toHaveBeenCalled()
  })
})
