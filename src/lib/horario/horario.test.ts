import { describe, expect, it } from 'vitest'
import { formatearHoraFranja, generarFranjas, restauranteAbierto } from '.'
import type { HorarioSemanal, ReglasHorario } from './tipos'

const SIN_TRAMOS: HorarioSemanal = {
  lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [],
}

function reglas(parcial: Partial<ReglasHorario> = {}): ReglasHorario {
  return {
    horario: SIN_TRAMOS,
    antelacionMinimaMin: 0,
    duracionFranjaMin: 30,
    ...parcial,
  }
}

describe('generarFranjas', () => {
  it('genera franjas de la duración configurada dentro de un tramo', () => {
    // 2026-01-15 es jueves. Tramo 13:00-14:00 en Madrid (invierno, UTC+1) = 12:00-13:00 UTC.
    const r = reglas({ horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '14:00' }] } })
    const ahora = new Date('2026-01-15T08:00:00Z')
    const franjas = generarFranjas(r, ahora).filter((f) => !f.loAntesPosible)
    expect(franjas).toEqual([
      { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z', loAntesPosible: false },
      { inicio: '2026-01-15T12:30:00.000Z', fin: '2026-01-15T13:00:00.000Z', loAntesPosible: false },
    ])
  })

  it('descarta franjas anteriores a ahora + antelación mínima', () => {
    const r = reglas({
      horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '15:00' }] },
      antelacionMinimaMin: 90,
    })
    // 11:00 UTC = 12:00 Madrid. +90 min = 13:30 Madrid = 12:30 UTC.
    const ahora = new Date('2026-01-15T11:00:00Z')
    const franjas = generarFranjas(r, ahora).filter((f) => !f.loAntesPosible)
    expect(franjas[0]).toEqual({
      inicio: '2026-01-15T12:30:00.000Z',
      fin: '2026-01-15T13:00:00.000Z',
      loAntesPosible: false,
    })
  })

  it('ofrece franjas de mañana si hoy ya no quedan', () => {
    // 2026-01-16 es viernes.
    const r = reglas({
      horario: {
        ...SIN_TRAMOS,
        jueves: [{ desde: '13:00', hasta: '14:00' }],
        viernes: [{ desde: '13:00', hasta: '14:00' }],
      },
    })
    const ahora = new Date('2026-01-15T20:00:00Z') // 21:00 Madrid, el tramo de hoy ya pasó
    const franjas = generarFranjas(r, ahora).filter((f) => !f.loAntesPosible)
    expect(franjas).toEqual([
      { inicio: '2026-01-16T12:00:00.000Z', fin: '2026-01-16T12:30:00.000Z', loAntesPosible: false },
      { inicio: '2026-01-16T12:30:00.000Z', fin: '2026-01-16T13:00:00.000Z', loAntesPosible: false },
    ])
  })

  it('un día sin tramos no ofrece franjas: es un día cerrado', () => {
    const ahora = new Date('2026-01-15T08:00:00Z')
    expect(generarFranjas(reglas(), ahora)).toEqual([])
  })

  it('"lo antes posible" solo aparece si el restaurante está abierto ahora', () => {
    const r = reglas({ horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '16:00' }] } })

    const abierto = generarFranjas(r, new Date('2026-01-15T13:00:00Z')) // 14:00 Madrid
    expect(abierto[0]).toMatchObject({ loAntesPosible: true })

    const cerrado = generarFranjas(r, new Date('2026-01-15T08:00:00Z')) // 09:00 Madrid
    expect(cerrado.some((f) => f.loAntesPosible)).toBe(false)
  })

  it('convierte la hora local de Madrid a UTC según la época del año', () => {
    const r = reglas({
      horario: {
        ...SIN_TRAMOS,
        jueves: [{ desde: '13:00', hasta: '13:30' }], // 2026-01-15
        miercoles: [{ desde: '13:00', hasta: '13:30' }], // 2026-07-15
      },
    })

    const invierno = generarFranjas(r, new Date('2026-01-15T00:00:00Z')).filter((f) => !f.loAntesPosible)
    expect(invierno[0].inicio).toBe('2026-01-15T12:00:00.000Z') // CET = UTC+1

    const verano = generarFranjas(r, new Date('2026-07-15T00:00:00Z')).filter((f) => !f.loAntesPosible)
    expect(verano[0].inicio).toBe('2026-07-15T11:00:00.000Z') // CEST = UTC+2
  })
})

describe('restauranteAbierto', () => {
  const r = reglas({ horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '16:00' }] } })

  it('está abierto dentro de un tramo', () => {
    expect(restauranteAbierto(r, new Date('2026-01-15T13:00:00Z'))).toBe(true) // 14:00 Madrid
  })

  it('está cerrado fuera de los tramos', () => {
    expect(restauranteAbierto(r, new Date('2026-01-15T08:00:00Z'))).toBe(false) // 09:00 Madrid
  })
})

describe('formatearHoraFranja', () => {
  it('pinta la hora en Europe/Madrid con dos dígitos, según la época del año', () => {
    expect(formatearHoraFranja('2026-01-15T12:30:00.000Z')).toBe('13:30')
    expect(formatearHoraFranja('2026-07-15T11:00:00.000Z')).toBe('13:00')
  })
})
