import { crearClienteServidor } from '@/lib/supabase/cliente-servidor'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { HorarioSemanal } from '@/lib/horario/tipos'
import type { TablesUpdate } from '@/lib/supabase/tipos-bd'

export type Ajustes = {
  nombreRestaurante: string
  telefono: string
  direccion: string
  horario: HorarioSemanal
  envioCentimos: number
  pedidoMinimoCentimos: number
  envioGratisDesdeCentimos: number | null
  antelacionMinimaMin: number
  duracionFranjaMin: number
}

export async function obtenerAjustes(): Promise<Ajustes> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase.from('ajustes').select('*').single()
  if (error) throw error

  return {
    nombreRestaurante: data.nombre_restaurante,
    telefono: data.telefono,
    direccion: data.direccion,
    horario: data.horario as unknown as HorarioSemanal,
    envioCentimos: data.envio_centimos,
    pedidoMinimoCentimos: data.pedido_minimo_centimos,
    envioGratisDesdeCentimos: data.envio_gratis_desde_centimos,
    antelacionMinimaMin: data.antelacion_minima_min,
    duracionFranjaMin: data.duracion_franja_min,
  }
}

const DIAS_HORARIO: (keyof HorarioSemanal)[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
]

function esImporteValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0
}

/**
 * Valida el cuerpo recibido en `PATCH /api/panel/ajustes` antes de
 * escribirlo: un valor mal formado (p. ej. una "duración de franja" vacía
 * que el cliente parsea como `Number('') === 0`) no debe llegar tal cual a
 * la restricción de la base de datos, que respondería con un 500 sin cuerpo
 * `{error}` en vez de un 400 claro. `horario` alimenta sin más comprobación
 * `generarFranjas`/`restauranteAbierto` del sitio público, así que también
 * se valida aquí con la misma comparación de cadenas "HH:MM" que ya usa
 * `FormularioAjustes.tsx` en el cliente.
 */
export function errorDeAjustes(datos: Ajustes): string | null {
  if (!esImporteValido(datos.envioCentimos)) return 'El coste de envío no es un importe válido.'
  if (!esImporteValido(datos.pedidoMinimoCentimos)) return 'El pedido mínimo no es un importe válido.'
  if (datos.envioGratisDesdeCentimos !== null && !esImporteValido(datos.envioGratisDesdeCentimos)) {
    return 'El importe de envío gratis no es un importe válido.'
  }
  if (!esImporteValido(datos.antelacionMinimaMin)) return 'La antelación mínima no es un número de minutos válido.'
  if (!Number.isInteger(datos.duracionFranjaMin) || datos.duracionFranjaMin <= 0) {
    return 'La duración de cada franja debe ser un número de minutos mayor que cero.'
  }

  if (!datos.horario || typeof datos.horario !== 'object') {
    return 'El horario recibido no tiene el formato esperado.'
  }
  for (const dia of DIAS_HORARIO) {
    const tramos = datos.horario[dia]
    if (!Array.isArray(tramos)) return 'El horario recibido no tiene el formato esperado.'
    for (const tramo of tramos) {
      if (typeof tramo?.desde !== 'string' || typeof tramo?.hasta !== 'string' || tramo.desde >= tramo.hasta) {
        return 'Cada tramo del horario debe terminar después de empezar.'
      }
    }
  }

  return null
}

export async function actualizarAjustes(datos: Ajustes): Promise<void> {
  const cambios: TablesUpdate<'ajustes'> = {
    nombre_restaurante: datos.nombreRestaurante,
    telefono: datos.telefono,
    direccion: datos.direccion,
    horario: datos.horario,
    envio_centimos: datos.envioCentimos,
    pedido_minimo_centimos: datos.pedidoMinimoCentimos,
    envio_gratis_desde_centimos: datos.envioGratisDesdeCentimos,
    antelacion_minima_min: datos.antelacionMinimaMin,
    duracion_franja_min: datos.duracionFranjaMin,
  }
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('ajustes').update(cambios).eq('id', true)
  if (error) throw error
}
