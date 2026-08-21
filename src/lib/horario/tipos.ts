export type TramoHorario = { desde: string; hasta: string } // 'HH:MM'

export type HorarioSemanal = {
  lunes: TramoHorario[]
  martes: TramoHorario[]
  miercoles: TramoHorario[]
  jueves: TramoHorario[]
  viernes: TramoHorario[]
  sabado: TramoHorario[]
  domingo: TramoHorario[]
}

export type ReglasHorario = {
  horario: HorarioSemanal
  antelacionMinimaMin: number
  duracionFranjaMin: number
}

/** `loAntesPosible` marca la franja especial que no tiene inicio ni fin reales. */
export type Franja = {
  inicio: string // ISO 8601
  fin: string
  loAntesPosible: boolean
}
