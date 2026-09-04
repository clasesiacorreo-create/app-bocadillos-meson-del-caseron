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
