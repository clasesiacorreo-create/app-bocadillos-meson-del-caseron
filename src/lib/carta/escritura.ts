import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'

export async function actualizarDisponibilidadArticulo(id: string, disponible: boolean): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('articulos').update({ disponible }).eq('id', id)
  if (error) throw error
}

/**
 * `articulo_tamanos` no expone su propio id a la capa de lectura pública
 * (`obtenerCarta` solo trae el id del tamaño, compartido entre artículos), así
 * que se actualiza por la pareja (articulo_id, tamano_id), que es única por la
 * restricción de la migración 0001.
 */
export async function actualizarDisponibilidadTamano(
  articuloId: string,
  tamanoId: string,
  disponible: boolean,
): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase
    .from('articulo_tamanos')
    .update({ disponible })
    .eq('articulo_id', articuloId)
    .eq('tamano_id', tamanoId)
  if (error) throw error
}

export async function actualizarDisponibilidadExtra(id: string, disponible: boolean): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('extras').update({ disponible }).eq('id', id)
  if (error) throw error
}

export async function actualizarImagenArticulo(id: string, imagenUrl: string): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('articulos').update({ imagen_url: imagenUrl }).eq('id', id)
  if (error) throw error
}
