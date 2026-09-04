import { describe, expect, it } from 'vitest'
import { enlaceMapa, pestanaDeReparto } from './reparto'

describe('pestanaDeReparto', () => {
  it('un pedido pendiente de envío va a "para repartir", sea de quien sea', () => {
    expect(pestanaDeReparto({ estado: 'pendiente_envio', repartidor_id: null }, 'u-1')).toBe('para_repartir')
    expect(pestanaDeReparto({ estado: 'pendiente_envio', repartidor_id: 'u-2' }, 'u-1')).toBe('para_repartir')
  })

  it('un pedido en reparto solo aparece en "mis entregas" para quien lo lleva', () => {
    expect(pestanaDeReparto({ estado: 'en_reparto', repartidor_id: 'u-1' }, 'u-1')).toBe('mis_entregas')
    expect(pestanaDeReparto({ estado: 'en_reparto', repartidor_id: 'u-2' }, 'u-1')).toBe(null)
  })

  it('ninguna otra fase aparece en el reparto', () => {
    expect(pestanaDeReparto({ estado: 'nuevo', repartidor_id: null }, 'u-1')).toBe(null)
    expect(pestanaDeReparto({ estado: 'entregado', repartidor_id: 'u-1' }, 'u-1')).toBe(null)
  })
})

describe('enlaceMapa', () => {
  it('construye una búsqueda de Google Maps con la dirección completa', () => {
    const url = enlaceMapa({
      direccion_calle: 'C. Hierro',
      direccion_numero: '73',
      direccion_cp: '28850',
      direccion_ciudad: 'Torrejón de Ardoz',
    })
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent('C. Hierro, 73, 28850, Torrejón de Ardoz'),
    )
  })

  it('omite los campos vacíos sin dejar comas sueltas', () => {
    const url = enlaceMapa({
      direccion_calle: 'C. Hierro',
      direccion_numero: null,
      direccion_cp: null,
      direccion_ciudad: 'Torrejón de Ardoz',
    })
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('C. Hierro, Torrejón de Ardoz'),
    )
  })
})
