import { crearClienteServidor } from '@/lib/supabase/cliente-servidor'
import type { ReglasPedido } from '@/lib/precios/tipos'
import type { Carta, ExtraDeArticulo } from './tipos'

export async function obtenerCarta(): Promise<Carta> {
  const supabase = crearClienteServidor()

  const [categorias, extras] = await Promise.all([
    supabase
      .from('categorias')
      .select(
        `id, nombre, orden,
         articulos ( id, nombre, descripcion, imagen_url, disponible, orden,
           articulo_tamanos ( precio_centimos, disponible,
             tamanos ( id, nombre, orden ) ),
           articulo_extras ( extra_id ) )`,
      )
      .eq('activa', true)
      .order('orden'),
    supabase
      .from('extras')
      .select('id, nombre, descripcion, disponible, orden, extra_precios ( tamano_id, precio_centimos )')
      .order('orden'),
  ])

  if (categorias.error) throw categorias.error
  if (extras.error) throw extras.error

  const extrasPorId = new Map<string, ExtraDeArticulo>(
    extras.data.map((extra) => [
      extra.id,
      {
        id: extra.id,
        nombre: extra.nombre,
        descripcion: extra.descripcion,
        disponible: extra.disponible,
        precioPorTamanoId: Object.fromEntries(
          extra.extra_precios.map((precio) => [precio.tamano_id, precio.precio_centimos]),
        ),
      },
    ]),
  )

  return {
    categorias: categorias.data.map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      articulos: [...categoria.articulos]
        .sort((a, b) => a.orden - b.orden)
        .map((articulo) => ({
          id: articulo.id,
          nombre: articulo.nombre,
          descripcion: articulo.descripcion,
          imagenUrl: articulo.imagen_url,
          disponible: articulo.disponible,
          tamanos: [...articulo.articulo_tamanos]
            .sort((a, b) => a.tamanos.orden - b.tamanos.orden)
            .map((asignado) => ({
              id: asignado.tamanos.id,
              nombre: asignado.tamanos.nombre,
              precioCentimos: asignado.precio_centimos,
              disponible: asignado.disponible,
            })),
          // Se filtra iterando `extrasPorId` (ya ordenado por `orden`, porque
          // `extras.data` se pidió con `.order('orden')`) en vez de mapear
          // `articulo.articulo_extras`: las filas de la tabla puente no vienen
          // en ningún orden garantizado desde PostgREST.
          extras: (() => {
            const extraIdsDelArticulo = new Set(
              articulo.articulo_extras.map((enlace) => enlace.extra_id),
            )
            return [...extrasPorId.values()].filter((extra) => extraIdsDelArticulo.has(extra.id))
          })(),
        })),
    })),
  }
}

export async function obtenerReglas(): Promise<ReglasPedido> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase
    .from('ajustes')
    .select('envio_centimos, pedido_minimo_centimos, envio_gratis_desde_centimos')
    .single()

  if (error) throw error

  return {
    envioCentimos: data.envio_centimos,
    pedidoMinimoCentimos: data.pedido_minimo_centimos,
    envioGratisDesdeCentimos: data.envio_gratis_desde_centimos,
  }
}
