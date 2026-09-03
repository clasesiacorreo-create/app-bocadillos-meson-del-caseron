import { describe, expect, it } from 'vitest'
import { agruparFranjasPorDia, formatearHoraFranja, generarFranjas, restauranteAbierto } from '.'
import type { Franja, HorarioSemanal, ReglasHorario } from './tipos'

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

  it('maneja correctamente el cambio de hora de primavera (spring forward)', () => {
    // 2026-03-29 es el último domingo de marzo: cambio de hora (UTC+1 -> UTC+2)
    // Hoy: 2026-03-28 (sábado), UTC+1
    // Mañana: 2026-03-29 (domingo), UTC+2
    const r = reglas({
      horario: {
        ...SIN_TRAMOS,
        sabado: [{ desde: '13:00', hasta: '13:30' }],
        domingo: [{ desde: '13:00', hasta: '13:30' }],
      },
    })
    const ahora = new Date('2026-03-28T00:00:00Z')
    const franjas = generarFranjas(r, ahora).filter((f) => !f.loAntesPosible)

    // Sábado 28: 13:00 Madrid = 12:00 UTC (UTC+1)
    expect(franjas[0]).toMatchObject({
      inicio: '2026-03-28T12:00:00.000Z',
      loAntesPosible: false,
    })

    // Domingo 29: 13:00 Madrid = 11:00 UTC (UTC+2)
    expect(franjas[1]).toMatchObject({
      inicio: '2026-03-29T11:00:00.000Z',
      loAntesPosible: false,
    })
  })

  it('maneja correctamente el cambio de hora de otoño (fall back)', () => {
    // 2026-10-25 es el último domingo de octubre: cambio de hora (UTC+2 -> UTC+1)
    // Hoy: 2026-10-24 (sábado), UTC+2
    // Mañana: 2026-10-25 (domingo), UTC+1
    const r = reglas({
      horario: {
        ...SIN_TRAMOS,
        sabado: [{ desde: '13:00', hasta: '13:30' }],
        domingo: [{ desde: '13:00', hasta: '13:30' }],
      },
    })
    const ahora = new Date('2026-10-24T00:00:00Z')
    const franjas = generarFranjas(r, ahora).filter((f) => !f.loAntesPosible)

    // Sábado 24: 13:00 Madrid = 11:00 UTC (UTC+2)
    expect(franjas[0]).toMatchObject({
      inicio: '2026-10-24T11:00:00.000Z',
      loAntesPosible: false,
    })

    // Domingo 25: 13:00 Madrid = 12:00 UTC (UTC+1)
    expect(franjas[1]).toMatchObject({
      inicio: '2026-10-25T12:00:00.000Z',
      loAntesPosible: false,
    })
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

describe('agruparFranjasPorDia', () => {
  // 2026-01-15 es jueves. Tramo 13:00-14:00 Madrid (invierno, UTC+1) = 12:00-13:00 UTC.
  const r = reglas({
    horario: {
      ...SIN_TRAMOS,
      jueves: [{ desde: '13:00', hasta: '16:00' }],
      viernes: [{ desde: '13:00', hasta: '14:00' }],
    },
  })

  it('agrupa las franjas de hoy y mañana en ese orden, con esas etiquetas', () => {
    const ahora = new Date('2026-01-15T13:00:00Z') // 14:00 Madrid, dentro del tramo de hoy
    const franjas = generarFranjas(r, ahora)
    const grupos = agruparFranjasPorDia(franjas, ahora)

    expect(grupos.map((g) => g.etiqueta)).toEqual(['Hoy', 'Mañana'])
    expect(grupos[0].franjas).toEqual([
      { inicio: '2026-01-15T13:00:00.000Z', fin: '2026-01-15T13:30:00.000Z', loAntesPosible: false },
      { inicio: '2026-01-15T13:30:00.000Z', fin: '2026-01-15T14:00:00.000Z', loAntesPosible: false },
      { inicio: '2026-01-15T14:00:00.000Z', fin: '2026-01-15T14:30:00.000Z', loAntesPosible: false },
      { inicio: '2026-01-15T14:30:00.000Z', fin: '2026-01-15T15:00:00.000Z', loAntesPosible: false },
    ])
    expect(grupos[1].franjas).toEqual([
      { inicio: '2026-01-16T12:00:00.000Z', fin: '2026-01-16T12:30:00.000Z', loAntesPosible: false },
      { inicio: '2026-01-16T12:30:00.000Z', fin: '2026-01-16T13:00:00.000Z', loAntesPosible: false },
    ])
  })

  it('no incluye "lo antes posible" en ningún grupo', () => {
    const ahora = new Date('2026-01-15T13:00:00Z')
    const franjas = generarFranjas(r, ahora)
    expect(franjas.some((f) => f.loAntesPosible)).toBe(true) // precondición: el restaurante está abierto

    const grupos = agruparFranjasPorDia(franjas, ahora)
    const totalAgrupado = grupos.reduce((total, g) => total + g.franjas.length, 0)
    expect(totalAgrupado).toBe(franjas.filter((f) => !f.loAntesPosible).length)
    for (const grupo of grupos) {
      expect(grupo.franjas.every((f) => !f.loAntesPosible)).toBe(true)
    }
  })

  it('solo genera el grupo de "Hoy" si mañana no tiene franjas', () => {
    const soloHoy = reglas({ horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '14:00' }] } })
    const ahora = new Date('2026-01-15T08:00:00Z')
    const grupos = agruparFranjasPorDia(generarFranjas(soloHoy, ahora), ahora)
    expect(grupos.map((g) => g.etiqueta)).toEqual(['Hoy'])
  })

  it('usa el nombre del día para una franja más allá de mañana', () => {
    // No ocurre con generarFranjas hoy (solo mira hoy y mañana), pero la
    // función se prueba también con datos sintéticos por si esa ventana
    // cambia en el futuro.
    const ahora = new Date('2026-01-15T08:00:00Z')
    const franjaLejana: Franja = {
      inicio: '2026-01-18T12:00:00.000Z', // domingo 18
      fin: '2026-01-18T12:30:00.000Z',
      loAntesPosible: false,
    }
    const grupos = agruparFranjasPorDia([franjaLejana], ahora)
    expect(grupos).toHaveLength(1)
    expect(grupos[0].etiqueta).toBe('domingo, 18 de enero')
  })
})
