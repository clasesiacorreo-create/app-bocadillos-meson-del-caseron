import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarCategorias, listarExtrasBase, listarTamanos } from '@/lib/carta/escritura'
import { FormularioArticulo } from '@/components/panel/FormularioArticulo'

export default async function PaginaNuevoArticulo() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const [categorias, tamanos, extras] = await Promise.all([listarCategorias(), listarTamanos(), listarExtrasBase()])

  return <FormularioArticulo categorias={categorias} tamanos={tamanos} extras={extras} />
}
