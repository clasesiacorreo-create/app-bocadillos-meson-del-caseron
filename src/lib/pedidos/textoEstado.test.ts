import { describe, expect, it } from 'vitest'
import { textoEstadoCliente } from './textoEstado'
import type { EstadoSeguimiento } from './seguimiento'

function pedido(parcial: Partial<EstadoSeguimiento> = {}): EstadoSeguimiento {
  return {
    codigoPublico: 'abc123',
    estado: 'nuevo',
    modoEntrega: 'domicilio',
    franjaSolicitada: { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z', asap: false },
    franjaConfirmada: null,
    lineas: [],
    totalCentimos: 0,
    telefonoRestaurante: '916780435',
    ...parcial,
  }
}

describe('textoEstadoCliente', () => {
  it('recién pagado y sin confirmar: pide franja pendiente de confirmar', () => {
    expect(textoEstadoCliente(pedido())).toBe(
      'Recibido — has pedido las 13:00–13:30, pendiente de confirmar',
    )
  })

  it('recién pagado con "lo antes posible" y sin confirmar', () => {
    expect(
      textoEstadoCliente(pedido({ franjaSolicitada: { ...pedido().franjaSolicitada, asap: true } })),
    ).toBe('Recibido — pediste lo antes posible, pendiente de confirmar')
  })

  it('confirmado, muestra la franja confirmada', () => {
    expect(
      textoEstadoCliente(
        pedido({
          franjaConfirmada: { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z' },
        }),
      ),
    ).toBe('Confirmado para las 13:00–13:30')
  })

  it('en preparación', () => {
    expect(textoEstadoCliente(pedido({ estado: 'en_preparacion' }))).toBe('En preparación')
  })

  it('listo, a domicilio', () => {
    expect(textoEstadoCliente(pedido({ estado: 'pendiente_envio', modoEntrega: 'domicilio' }))).toBe(
      'Listo — sale en breve',
    )
  })

  it('listo, en recogida', () => {
    expect(textoEstadoCliente(pedido({ estado: 'pendiente_envio', modoEntrega: 'recogida' }))).toBe(
      'Listo para recoger',
    )
  })

  it('en reparto', () => {
    expect(textoEstadoCliente(pedido({ estado: 'en_reparto' }))).toBe('En reparto — tu pedido va de camino')
  })

  it('entregado', () => {
    expect(textoEstadoCliente(pedido({ estado: 'entregado' }))).toBe('Entregado')
  })

  it('pendiente de pago: mensaje de espera, nunca visible en un flujo normal', () => {
    expect(textoEstadoCliente(pedido({ estado: 'pendiente_pago' }))).toBe('Confirmando tu pago…')
  })
})
