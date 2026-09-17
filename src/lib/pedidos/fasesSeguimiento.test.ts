import { describe, expect, it } from 'vitest'
import { fasesSeguimiento } from './fasesSeguimiento'
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

describe('fasesSeguimiento', () => {
  it('sin línea de tiempo mientras se confirma el pago', () => {
    expect(fasesSeguimiento(pedido({ estado: 'pendiente_pago' }))).toBeNull()
  })

  it('a domicilio recorre las 5 fases, con reparto', () => {
    const fases = fasesSeguimiento(pedido({ estado: 'en_reparto', modoEntrega: 'domicilio' }))
    expect(fases?.map((f) => f.id)).toEqual(['recibido', 'preparacion', 'listo', 'reparto', 'entregado'])
  })

  it('en recogida no incluye la fase de reparto', () => {
    const fases = fasesSeguimiento(pedido({ estado: 'pendiente_envio', modoEntrega: 'recogida' }))
    expect(fases?.map((f) => f.id)).toEqual(['recibido', 'preparacion', 'listo', 'entregado'])
  })

  it('marca completadas las fases anteriores a la actual, y futuras las siguientes', () => {
    const fases = fasesSeguimiento(pedido({ estado: 'en_preparacion' }))
    expect(fases?.find((f) => f.id === 'recibido')?.estado).toBe('completada')
    expect(fases?.find((f) => f.id === 'preparacion')?.estado).toBe('actual')
    expect(fases?.find((f) => f.id === 'listo')?.estado).toBe('futura')
    expect(fases?.find((f) => f.id === 'reparto')?.estado).toBe('futura')
    expect(fases?.find((f) => f.id === 'entregado')?.estado).toBe('futura')
  })

  it('recibido muestra la franja confirmada si existe', () => {
    const fases = fasesSeguimiento(
      pedido({ franjaConfirmada: { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z' } }),
    )
    expect(fases?.find((f) => f.id === 'recibido')?.detalle).toBe('Confirmado para las 13:00–13:30')
  })

  it('recibido sin confirmar aún', () => {
    const fases = fasesSeguimiento(pedido())
    expect(fases?.find((f) => f.id === 'recibido')?.detalle).toBe('Pendiente de confirmar')
  })

  it('listo cambia de texto según el modo de entrega', () => {
    const domicilio = fasesSeguimiento(pedido({ estado: 'pendiente_envio', modoEntrega: 'domicilio' }))
    const recogida = fasesSeguimiento(pedido({ estado: 'pendiente_envio', modoEntrega: 'recogida' }))
    expect(domicilio?.find((f) => f.id === 'listo')?.detalle).toBe('Sale en breve')
    expect(recogida?.find((f) => f.id === 'listo')?.detalle).toBe('Puedes pasar a recogerlo')
  })

  it('entregado no lleva detalle', () => {
    const fases = fasesSeguimiento(pedido({ estado: 'entregado' }))
    expect(fases?.find((f) => f.id === 'entregado')?.detalle).toBeNull()
  })
})
