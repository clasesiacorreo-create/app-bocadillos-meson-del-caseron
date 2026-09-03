import { describe, expect, it } from 'vitest'
import {
  actualizarCamposPedido,
  franjaEsInminente,
  fusionarLineaEnLista,
  fusionarPedidoEnLista,
  ordenarPorFranja,
  pestanaDePedido,
} from './tablero'
import type { PedidoConLineas, PedidoLineaFila } from './tipos'

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
    pedido_lineas: [],
    ...parcial,
  } as PedidoConLineas
}

function linea(parcial: Partial<PedidoLineaFila> = {}): PedidoLineaFila {
  return {
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
    ...parcial,
  } as PedidoLineaFila
}

describe('pestanaDePedido', () => {
  it('agrupa cada estado en su pestaña', () => {
    expect(pestanaDePedido('nuevo')).toBe('nuevos')
    expect(pestanaDePedido('en_preparacion')).toBe('en_marcha')
    expect(pestanaDePedido('pendiente_envio')).toBe('pendientes_envio')
    expect(pestanaDePedido('en_reparto')).toBe('pendientes_envio')
    expect(pestanaDePedido('entregado')).toBe('entregados')
  })

  it('no asigna pestaña a un pedido sin cobrar', () => {
    expect(pestanaDePedido('pendiente_pago')).toBeNull()
  })
})

describe('franjaEsInminente', () => {
  it('es inminente 15 minutos o menos antes de empezar', () => {
    const ahora = new Date('2026-01-15T12:00:00.000Z')
    expect(franjaEsInminente('2026-01-15T12:15:00.000Z', ahora)).toBe(true)
    expect(franjaEsInminente('2026-01-15T12:16:00.000Z', ahora)).toBe(false)
  })

  it('una franja ya pasada sigue siendo inminente', () => {
    const ahora = new Date('2026-01-15T12:00:00.000Z')
    expect(franjaEsInminente('2026-01-15T11:00:00.000Z', ahora)).toBe(true)
  })
})

describe('ordenarPorFranja', () => {
  it('ordena por la franja confirmada si existe, si no la solicitada', () => {
    const tarde = pedido({ id: 'p-tarde', franja_solicitada_inicio: '2026-01-15T14:00:00.000Z' })
    const pronto = pedido({
      id: 'p-pronto',
      franja_solicitada_inicio: '2026-01-15T13:00:00.000Z',
      franja_confirmada_inicio: '2026-01-15T12:30:00.000Z',
    })
    expect(ordenarPorFranja([tarde, pronto]).map((p) => p.id)).toEqual(['p-pronto', 'p-tarde'])
  })
})

describe('fusionarPedidoEnLista', () => {
  it('añade un pedido nuevo al principio', () => {
    const existente = pedido({ id: 'p-1' })
    const nuevo = pedido({ id: 'p-2' })
    expect(fusionarPedidoEnLista([existente], nuevo).map((p) => p.id)).toEqual(['p-2', 'p-1'])
  })

  it('sustituye un pedido existente en su sitio', () => {
    const original = pedido({ id: 'p-1', total_centimos: 1000 })
    const actualizado = pedido({ id: 'p-1', total_centimos: 2000 })
    const resultado = fusionarPedidoEnLista([original], actualizado)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].total_centimos).toBe(2000)
  })
})

describe('actualizarCamposPedido', () => {
  it('actualiza los campos de un pedido existente sin tocar sus líneas', () => {
    const original = pedido({ id: 'p-1', estado: 'nuevo', pedido_lineas: [linea()] })
    const resultado = actualizarCamposPedido([original], { ...original, estado: 'en_preparacion' })
    expect(resultado[0].estado).toBe('en_preparacion')
    expect(resultado[0].pedido_lineas).toEqual([linea()])
  })
})

describe('fusionarLineaEnLista', () => {
  it('actualiza una línea concreta sin tocar las demás ni sus extras existentes', () => {
    const l1 = linea({
      id: 'l-1',
      preparada: false,
      pedido_extras: [{ id: 'e-1', linea_id: 'l-1', extra_id: null, nombre_extra: 'Queso', precio_centimos: 100 }],
    })
    const l2 = linea({ id: 'l-2', preparada: false })
    const original = pedido({ pedido_lineas: [l1, l2] })

    const { pedido_extras: _extras, ...filaActualizada } = { ...l1, preparada: true }
    const resultado = fusionarLineaEnLista([original], filaActualizada)

    const lineaActualizada = resultado[0].pedido_lineas.find((l) => l.id === 'l-1')!
    expect(lineaActualizada.preparada).toBe(true)
    expect(lineaActualizada.pedido_extras).toEqual(l1.pedido_extras)
    expect(resultado[0].pedido_lineas.find((l) => l.id === 'l-2')!.preparada).toBe(false)
  })
})
