import { describe, expect, it } from 'vitest'
import { formatearPrecio } from '.'

// Ojo: Intl en es-ES separa el importe del símbolo con un espacio duro (U+00A0),
// no con un espacio normal. Si el test se escribe con espacio normal, falla y
// el mensaje de error resulta indistinguible a simple vista.
const ESPACIO_DURO = ' '

describe('formatearPrecio', () => {
  it('formatea céntimos como euros en formato español', () => {
    expect(formatearPrecio(500)).toBe(`5,00${ESPACIO_DURO}€`)
  })

  it('formatea importes con céntimos no redondos', () => {
    expect(formatearPrecio(1150)).toBe(`11,50${ESPACIO_DURO}€`)
  })

  it('formatea el cero', () => {
    expect(formatearPrecio(0)).toBe(`0,00${ESPACIO_DURO}€`)
  })

  it('formatea importes de cuatro cifras', () => {
    expect(formatearPrecio(123456)).toBe(`1234,56${ESPACIO_DURO}€`)
  })
})
