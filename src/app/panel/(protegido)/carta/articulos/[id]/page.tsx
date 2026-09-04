import { notFound, redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarCategorias, listarExtrasBase, listarTamanos } from '@/lib/carta/escritura'
import { obtenerCarta } from '@/lib/carta/consultas'
import { FormularioArticulo } from '@/components/panel/FormularioArticulo'

export default async function PaginaEditarArticulo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const [categorias, tamanos, extras, carta] = await Promise.all([
    listarCategorias(),
    listarTamanos(),
    listarExtrasBase(),
    obtenerCarta(),
  ])
  const articulo = carta.categorias.flatMap((c) => c.articulos).find((a) => a.id === id)
  if (!articulo) notFound()
  const categoria = carta.categorias.find((c) => c.articulos.some((a) => a.id === id))!

  return (
    <FormularioArticulo
      categorias={categorias}
      tamanos={tamanos}
      extras={extras}
      articuloInicial={{
        id: articulo.id,
        nombre: articulo.nombre,
        descripcion: articulo.descripcion,
        categoriaId: categoria.id,
        imagenUrl: articulo.imagenUrl,
        tamanos: articulo.tamanos.map((t) => ({
          tamanoId: t.id,
          precioCentimos: t.precioCentimos,
          disponible: t.disponible,
        })),
        extraIds: articulo.extras.map((e) => e.id),
      }}
    />
  )
}
