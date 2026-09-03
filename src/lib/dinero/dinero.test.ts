import { describe, expect, it } from 'vitest'
import { formatearPrecio, parsearPrecio } from '.'

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

describe('parsearPrecio', () => {
  it('acepta coma decimal', () => {
    expect(parsearPrecio('2,50')).toBe(250)
  })

  it('acepta punto decimal', () => {
    expect(parsearPrecio('2.50')).toBe(250)
  })

  it('acepta un entero', () => {
    expect(parsearPrecio('5')).toBe(500)
  })

  it('acepta cero', () => {
    expect(parsearPrecio('0')).toBe(0)
  })

  it('rechaza texto vacío', () => {
    expect(parsearPrecio('')).toBeNull()
  })

  it('rechaza texto que no es un número', () => {
    expect(parsearPrecio('abc')).toBeNull()
  })

  it('rechaza negativos', () => {
    expect(parsearPrecio('-1')).toBeNull()
  })
})
