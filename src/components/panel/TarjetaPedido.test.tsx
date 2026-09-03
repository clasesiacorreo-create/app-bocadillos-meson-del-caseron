import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TarjetaPedido } from './TarjetaPedido'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'

const PERFIL_COCINA: PerfilStaff = { userId: 'u-1', nombre: 'Cocina', rol: 'cocina' }

function pedido(parcial: Partial<PedidoConLineas> = {}): PedidoConLineas {
  return {
    id: 'p-1',
    codigo_publico: 'abc123',
    estado: 'nuevo',
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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(pedido()) }))
})

describe('TarjetaPedido', () => {
  it('ofrece confirmar la franja pedida cuando aún no está confirmada', () => {
    render(<TarjetaPedido pedido={pedido()} perfil={PERFIL_COCINA} franjas={[]} onActualizado={() => {}} />)
    expect(screen.getByRole('button', { name: /Confirmar 13:00–13:30/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Proponer otra hora' })).toBeInTheDocument()
  })

  it('fusiona "aceptar" y "empezar" en un único botón para lo antes posible', () => {
    render(
      <TarjetaPedido
        pedido={pedido({ franja_solicitada_asap: true })}
        perfil={PERFIL_COCINA}
        franjas={[]}
        onActualizado={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Aceptar y empezar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument()
  })

  it('confirmar la franja llama al endpoint con la franja pedida', async () => {
    const onActualizado = vi.fn()
    render(<TarjetaPedido pedido={pedido()} perfil={PERFIL_COCINA} franjas={[]} onActualizado={onActualizado} />)

    await userEvent.click(screen.getByRole('button', { name: /Confirmar 13:00–13:30/ }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/pedidos/p-1/confirmar-franja',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          inicio: '2026-01-15T12:00:00.000Z',
          fin: '2026-01-15T12:30:00.000Z',
          loAntesPosible: false,
        }),
      }),
    )
    expect(onActualizado).toHaveBeenCalled()
  })

  it('desactiva el checklist una vez el pedido ha salido de preparación', () => {
    render(
      <TarjetaPedido
        pedido={pedido({ estado: 'pendiente_envio' })}
        perfil={PERFIL_COCINA}
        franjas={[]}
        onActualizado={() => {}}
      />,
    )
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
})
