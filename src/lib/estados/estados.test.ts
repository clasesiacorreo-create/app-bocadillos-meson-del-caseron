import { describe, expect, it } from 'vitest'
import { puedeConfirmarFranja, puedeVerPedido, transicionPermitida } from '.'

describe('transicionPermitida', () => {
  it.each([
    ['admin', 'nuevo', 'en_preparacion', 'domicilio', true],
    ['admin', 'nuevo', 'en_preparacion', 'recogida', true],
    ['admin', 'en_preparacion', 'pendiente_envio', 'domicilio', true],
    ['admin', 'pendiente_envio', 'en_reparto', 'domicilio', true],
    ['admin', 'pendiente_envio', 'en_reparto', 'recogida', false],
    ['admin', 'en_reparto', 'entregado', 'domicilio', true],
    ['admin', 'pendiente_envio', 'entregado', 'recogida', true],
    ['admin', 'pendiente_envio', 'entregado', 'domicilio', false],

    ['cocina', 'nuevo', 'en_preparacion', 'domicilio', true],
    ['cocina', 'en_preparacion', 'pendiente_envio', 'domicilio', true],
    ['cocina', 'pendiente_envio', 'en_reparto', 'domicilio', false],
    ['cocina', 'en_reparto', 'entregado', 'domicilio', false],
    ['cocina', 'pendiente_envio', 'entregado', 'recogida', true],
    ['cocina', 'pendiente_envio', 'entregado', 'domicilio', false],

    ['repartidor', 'pendiente_envio', 'en_reparto', 'domicilio', true],
    ['repartidor', 'en_reparto', 'entregado', 'domicilio', true],
    ['repartidor', 'nuevo', 'en_preparacion', 'domicilio', false],
    ['repartidor', 'en_preparacion', 'pendiente_envio', 'domicilio', false],
    ['repartidor', 'pendiente_envio', 'entregado', 'recogida', false],
  ] as const)('rol %s: %s -> %s (%s) = %s', (rol, de, a, modo, esperado) => {
    expect(transicionPermitida(rol, de, a, modo)).toBe(esperado)
  })

  it('nunca permite retroceder un estado', () => {
    expect(transicionPermitida('admin', 'en_preparacion', 'nuevo', 'domicilio')).toBe(false)
  })

  it('nunca permite saltarse una fase', () => {
    expect(transicionPermitida('admin', 'nuevo', 'pendiente_envio', 'domicilio')).toBe(false)
  })
})

describe('puedeConfirmarFranja', () => {
  it('admin y cocina pueden confirmar la franja', () => {
    expect(puedeConfirmarFranja('admin')).toBe(true)
    expect(puedeConfirmarFranja('cocina')).toBe(true)
  })

  it('el repartidor no puede confirmar la franja', () => {
    expect(puedeConfirmarFranja('repartidor')).toBe(false)
  })
})

describe('puedeVerPedido', () => {
  it('admin ve cualquier pedido, incluso uno sin cobrar', () => {
    expect(puedeVerPedido('admin', 'pendiente_pago')).toBe(true)
    expect(puedeVerPedido('admin', 'nuevo')).toBe(true)
    expect(puedeVerPedido('admin', 'entregado')).toBe(true)
  })

  it('cocina no ve un pedido que aún no se ha cobrado', () => {
    expect(puedeVerPedido('cocina', 'pendiente_pago')).toBe(false)
    expect(puedeVerPedido('cocina', 'nuevo')).toBe(true)
    expect(puedeVerPedido('cocina', 'entregado')).toBe(true)
  })

  it('el repartidor todavía no tiene política de lectura', () => {
    expect(puedeVerPedido('repartidor', 'pendiente_envio')).toBe(false)
  })
})
