import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import { crearClienteServidor } from '@/lib/supabase/cliente-servidor'

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

export type DatosArticulo = {
  nombre: string
  descripcion: string
  categoriaId: string
  tamanos: { tamanoId: string; precioCentimos: number; disponible: boolean }[]
  extraIds: string[]
}

export async function crearArticulo(datos: DatosArticulo): Promise<{ id: string }> {
  const supabase = crearClienteServicio()
  const { data: articulo, error } = await supabase
    .from('articulos')
    .insert({ nombre: datos.nombre, descripcion: datos.descripcion, categoria_id: datos.categoriaId })
    .select('id')
    .single()
  if (error) throw error

  if (datos.tamanos.length > 0) {
    const { error: errorTamanos } = await supabase.from('articulo_tamanos').insert(
      datos.tamanos.map((t) => ({
        articulo_id: articulo.id,
        tamano_id: t.tamanoId,
        precio_centimos: t.precioCentimos,
        disponible: t.disponible,
      })),
    )
    if (errorTamanos) throw errorTamanos
  }

  if (datos.extraIds.length > 0) {
    const { error: errorExtras } = await supabase
      .from('articulo_extras')
      .insert(datos.extraIds.map((extraId) => ({ articulo_id: articulo.id, extra_id: extraId })))
    if (errorExtras) throw errorExtras
  }

  return { id: articulo.id }
}

/**
 * Reconcilia tamaños y complementos borrando todas las filas del artículo y
 * reinsertando el conjunto nuevo, en vez de calcular un diff: el volumen por
 * artículo (como mucho unos pocos tamaños y complementos) hace que el coste
 * sea irrelevante, y es mucho más simple de razonar. Si el borrado o una
 * inserción posterior fallara a mitad, el artículo quedaría con menos
 * tamaños o complementos de los debidos hasta el siguiente guardado; no hay
 * pedidos de por medio en esta operación, así que el riesgo es solo de
 * carta, no económico.
 */
export async function actualizarArticulo(id: string, datos: DatosArticulo): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase
    .from('articulos')
    .update({ nombre: datos.nombre, descripcion: datos.descripcion, categoria_id: datos.categoriaId })
    .eq('id', id)
  if (error) throw error

  const { error: errorBorrarTamanos } = await supabase.from('articulo_tamanos').delete().eq('articulo_id', id)
  if (errorBorrarTamanos) throw errorBorrarTamanos
  if (datos.tamanos.length > 0) {
    const { error: errorTamanos } = await supabase.from('articulo_tamanos').insert(
      datos.tamanos.map((t) => ({
        articulo_id: id,
        tamano_id: t.tamanoId,
        precio_centimos: t.precioCentimos,
        disponible: t.disponible,
      })),
    )
    if (errorTamanos) throw errorTamanos
  }

  const { error: errorBorrarExtras } = await supabase.from('articulo_extras').delete().eq('articulo_id', id)
  if (errorBorrarExtras) throw errorBorrarExtras
  if (datos.extraIds.length > 0) {
    const { error: errorExtras } = await supabase
      .from('articulo_extras')
      .insert(datos.extraIds.map((extraId) => ({ articulo_id: id, extra_id: extraId })))
    if (errorExtras) throw errorExtras
  }
}

/**
 * Baja real, no un interruptor: `pedido_lineas.articulo_id` apunta con `on
 * delete set null` (migración 0003), así que los pedidos ya hechos conservan
 * su copia de nombre y precio aunque el artículo desaparezca de la carta.
 */
export async function eliminarArticulo(id: string): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('articulos').delete().eq('id', id)
  if (error) throw error
}

export async function listarCategorias(): Promise<{ id: string; nombre: string }[]> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase.from('categorias').select('id, nombre').eq('activa', true).order('orden')
  if (error) throw error
  return data
}

export async function listarTamanos(): Promise<{ id: string; nombre: string }[]> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase.from('tamanos').select('id, nombre').order('orden')
  if (error) throw error
  return data
}

export async function listarExtrasBase(): Promise<{ id: string; nombre: string }[]> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase.from('extras').select('id, nombre').order('orden')
  if (error) throw error
  return data
}
