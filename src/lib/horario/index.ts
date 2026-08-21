import type { Franja, HorarioSemanal, ReglasHorario } from './tipos'

export type * from './tipos'

const ZONA = 'Europe/Madrid'

const DIA_SEMANA_POR_NOMBRE: Record<string, keyof HorarioSemanal> = {
  Monday: 'lunes',
  Tuesday: 'martes',
  Wednesday: 'miercoles',
  Thursday: 'jueves',
  Friday: 'viernes',
  Saturday: 'sabado',
  Sunday: 'domingo',
}

/**
 * Madrid siempre está por delante de UTC (+1 en invierno, +2 en verano), así
 * que la medianoche UTC cae siempre en el mismo día natural en Madrid. Esto
 * simplifica calcular a qué día de la semana corresponde una fecha.
 */
function desplazamientoMinutos(fecha: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    timeZoneName: 'shortOffset',
  }).formatToParts(fecha)
  const nombre = partes.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'
  const coincidencia = /GMT([+-]\d+)/.exec(nombre)
  return coincidencia ? Number(coincidencia[1]) * 60 : 0
}

function partesEnZona(fecha: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23', // con hour12:false, Intl pinta la medianoche como "24"
    weekday: 'long',
  }).formatToParts(fecha)
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  return {
    anio: Number(obtener('year')),
    mes: Number(obtener('month')),
    dia: Number(obtener('day')),
    hora: Number(obtener('hour')),
    minuto: Number(obtener('minute')),
    diaSemana: DIA_SEMANA_POR_NOMBRE[obtener('weekday')],
  }
}

function fechaEnZona(
  anio: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  desplazamientoMin: number,
): Date {
  return new Date(Date.UTC(anio, mes - 1, dia, hora, minuto) - desplazamientoMin * 60000)
}

export function restauranteAbierto(reglas: ReglasHorario, ahora: Date): boolean {
  const partes = partesEnZona(ahora)
  const minutosAhora = partes.hora * 60 + partes.minuto
  return reglas.horario[partes.diaSemana].some((tramo) => {
    const [hDesde, mDesde] = tramo.desde.split(':').map(Number)
    const [hHasta, mHasta] = tramo.hasta.split(':').map(Number)
    return minutosAhora >= hDesde * 60 + mDesde && minutosAhora < hHasta * 60 + mHasta
  })
}

/**
 * Franjas de hoy y mañana, en tramos de `duracionFranjaMin`, descartando las
 * que empiecen antes de `ahora + antelacionMinimaMin`. Un día sin tramos no
 * aporta franjas: es un día cerrado. "Lo antes posible" se añade al
 * principio solo si el restaurante está abierto en este instante.
 */
export function generarFranjas(reglas: ReglasHorario, ahora: Date): Franja[] {
  const desplazamiento = desplazamientoMinutos(ahora)
  const limiteInicio = ahora.getTime() + reglas.antelacionMinimaMin * 60000
  const franjas: Franja[] = []

  for (const diasAdelante of [0, 1]) {
    const partesDia = partesEnZona(new Date(ahora.getTime() + diasAdelante * 24 * 60 * 60000))

    for (const tramo of reglas.horario[partesDia.diaSemana]) {
      const [hDesde, mDesde] = tramo.desde.split(':').map(Number)
      const [hHasta, mHasta] = tramo.hasta.split(':').map(Number)
      const inicioTramo = fechaEnZona(partesDia.anio, partesDia.mes, partesDia.dia, hDesde, mDesde, desplazamiento)
      const finTramo = fechaEnZona(partesDia.anio, partesDia.mes, partesDia.dia, hHasta, mHasta, desplazamiento)

      let cursor = inicioTramo.getTime()
      while (cursor + reglas.duracionFranjaMin * 60000 <= finTramo.getTime()) {
        const finFranja = cursor + reglas.duracionFranjaMin * 60000
        if (cursor >= limiteInicio) {
          franjas.push({
            inicio: new Date(cursor).toISOString(),
            fin: new Date(finFranja).toISOString(),
            loAntesPosible: false,
          })
        }
        cursor = finFranja
      }
    }
  }

  if (restauranteAbierto(reglas, ahora)) {
    franjas.unshift({ inicio: ahora.toISOString(), fin: ahora.toISOString(), loAntesPosible: true })
  }

  return franjas
}

export function formatearHoraFranja(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}
